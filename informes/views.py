from pathlib import Path
from typing import Any

from django.http import FileResponse
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError as DRFValidationError
from rest_framework.pagination import PageNumberPagination
from rest_framework.request import Request
from rest_framework.response import Response

from core.exceptions import (
    CierreCajaNoEncontradoError,
    InformeError,
    InformeNoEncontradoError,
)
from usuario.utils import RolePermissionMixin

from .models import Informe
from .serializers import (
    CierreCajaCreateSerializer,
    CierreCajaDetailSerializer,
    CierreCajaFilterSerializer,
    CierreCajaGenerateSerializer,
    CierreCajaListSerializer,
    CierreCajaUpdateSerializer,
    EstadisticasPeriodoSerializer,
    InformeDetailSerializer,
    InformeFilterSerializer,
    InformeGenerateSerializer,
    InformeListSerializer,
)
from .services import CierreCajaService, InformeService, ReporteEstadisticasService


class InformesPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100

    def get_paginated_response(self, data):
        return Response({
            'count': self.page.paginator.count,
            'next': self.get_next_link(),
            'previous': self.get_previous_link(),
            'results': data,
            'page_size': self.page_size,
            'current_page': self.page.number,
            'total_pages': self.page.paginator.num_pages,
        })


class AdminRolePermission(permissions.BasePermission):
    """
    Permiso explicito de solo administradores para el modulo informes.
    """

    def has_permission(self, request: Request, view) -> bool:
        usuario = getattr(request, 'user', None)
        return bool(
            usuario
            and usuario.is_authenticated
            and getattr(usuario, 'is_admin', False)
        )


def _error_message(exc: Exception) -> str:
    return getattr(exc, 'message', str(exc))


def _validation_error_response(exc: DRFValidationError) -> Response:
    return Response(
        {'errors': exc.detail},
        status=status.HTTP_400_BAD_REQUEST,
    )


def _compact_query_data(data: dict[str, Any]) -> dict[str, Any]:
    return {
        key: value
        for key, value in data.items()
        if value not in (None, '')
    }


class BaseInformesViewSet(RolePermissionMixin, viewsets.ViewSet):
    """
    Base comun para los endpoints del modulo informes.
    """

    required_roles = ['ADMIN']
    permission_classes = [AdminRolePermission]
    pagination_class = InformesPagination

    @property
    def paginator(self):
        if not hasattr(self, '_paginator'):
            self._paginator = self.pagination_class()
        return self._paginator

    def paginate_queryset(self, queryset):
        if self.request and self.paginator:
            return self.paginator.paginate_queryset(
                queryset,
                self.request,
                view=self,
            )
        return None

    def get_paginated_response(self, data):
        return self.paginator.get_paginated_response(data)


class EstadisticasViewSet(BaseInformesViewSet):
    """
    Endpoints agrupados de estadisticas y dashboard.
    """

    def _validated_params(self, request: Request) -> dict[str, Any]:
        serializer = EstadisticasPeriodoSerializer(
            data=_compact_query_data({
                'fecha_inicio': request.query_params.get('fecha_inicio'),
                'fecha_fin': request.query_params.get('fecha_fin'),
                'anio': request.query_params.get('anio'),
                'limite': request.query_params.get('limite'),
                'dias': request.query_params.get('dias'),
                'dias_proyeccion': request.query_params.get(
                    'dias_proyeccion',
                ),
            }),
        )
        serializer.is_valid(raise_exception=True)
        return serializer.validated_data

    def _resolve_period(
        self,
        validated_data: dict[str, Any],
    ) -> tuple[Any, Any]:
        fecha_inicio = validated_data.get('fecha_inicio')
        fecha_fin = validated_data.get('fecha_fin')

        if fecha_inicio and fecha_fin:
            return fecha_inicio, fecha_fin

        return InformeService._default_period()

    @action(detail=False, methods=['get'], url_path='dashboard')
    def dashboard(self, request: Request) -> Response:
        try:
            params = self._validated_params(request)
            fecha_inicio, fecha_fin = self._resolve_period(params)
            limite = params.get('limite', 5)
            dias_proyeccion = params.get('dias_proyeccion', 30)
            cierres_recientes = CierreCajaService.obtener_cierres({
                'fecha_desde': fecha_inicio,
                'fecha_hasta': fecha_fin,
                'ordering': '-fecha_cierre',
            })[:5]

            data = {
                'periodo': {
                    'fecha_inicio': fecha_inicio.isoformat(),
                    'fecha_fin': fecha_fin.isoformat(),
                },
                'ventas': (
                    ReporteEstadisticasService.estadisticas_ventas_periodo(
                        fecha_inicio,
                        fecha_fin,
                    )
                ),
                'inventario': {
                    'valor_total': (
                        ReporteEstadisticasService.valor_total_inventario()
                    ),
                    'rotacion': (
                        ReporteEstadisticasService.rotacion_inventario(
                            fecha_inicio,
                            fecha_fin,
                        )
                    ),
                },
                'productos_destacados': (
                    ReporteEstadisticasService.productos_mas_vendidos(
                        fecha_inicio,
                        fecha_fin,
                        limite,
                    )
                ),
                'clientes_destacados': (
                    ReporteEstadisticasService.mejores_clientes(
                        fecha_inicio,
                        fecha_fin,
                        limite,
                    )
                ),
                'financiero': {
                    'cuentas_por_cobrar': (
                        ReporteEstadisticasService.total_cuentas_por_cobrar()
                    ),
                    'proyeccion_ingresos': (
                        ReporteEstadisticasService.proyeccion_ingresos(
                            dias_proyeccion,
                        )
                    ),
                },
                'cierres_recientes': CierreCajaListSerializer(
                    cierres_recientes,
                    many=True,
                    context={'request': request},
                ).data,
            }
            return Response(data)
        except DRFValidationError as exc:
            return _validation_error_response(exc)
        except InformeError as exc:
            return Response(
                {'error': _error_message(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )

    @action(detail=False, methods=['get'], url_path='ventas')
    def ventas(self, request: Request) -> Response:
        try:
            params = self._validated_params(request)
            fecha_inicio, fecha_fin = self._resolve_period(params)
            anio = params.get('anio', fecha_inicio.year)
            data = {
                'estadisticas_generales': (
                    ReporteEstadisticasService.estadisticas_ventas_periodo(
                        fecha_inicio,
                        fecha_fin,
                    )
                ),
                'serie_diaria': (
                    ReporteEstadisticasService.ventas_por_dia(
                        fecha_inicio,
                        fecha_fin,
                    )
                ),
                'serie_mensual': (
                    ReporteEstadisticasService.ventas_por_mes(anio)
                ),
                'ventas_por_categoria': (
                    ReporteEstadisticasService.ventas_por_categoria(
                        fecha_inicio,
                        fecha_fin,
                    )
                ),
                'ventas_por_metodo_pago': (
                    ReporteEstadisticasService.ventas_por_metodo_pago(
                        fecha_inicio,
                        fecha_fin,
                    )
                ),
            }
            return Response(data)
        except DRFValidationError as exc:
            return _validation_error_response(exc)
        except InformeError as exc:
            return Response(
                {'error': _error_message(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )

    @action(detail=False, methods=['get'], url_path='productos')
    def productos(self, request: Request) -> Response:
        try:
            params = self._validated_params(request)
            fecha_inicio, fecha_fin = self._resolve_period(params)
            limite = params.get('limite', 10)
            dias = params.get('dias', 30)
            data = {
                'productos_mas_vendidos': (
                    ReporteEstadisticasService.productos_mas_vendidos(
                        fecha_inicio,
                        fecha_fin,
                        limite,
                    )
                ),
                'productos_menos_vendidos': (
                    ReporteEstadisticasService.productos_menos_vendidos(
                        limite,
                    )
                ),
                'productos_sin_movimiento': (
                    ReporteEstadisticasService.productos_sin_movimiento(dias)
                ),
                'inventario': {
                    'valor_total': (
                        ReporteEstadisticasService.valor_total_inventario()
                    ),
                    'rotacion': (
                        ReporteEstadisticasService.rotacion_inventario(
                            fecha_inicio,
                            fecha_fin,
                        )
                    ),
                },
            }
            return Response(data)
        except DRFValidationError as exc:
            return _validation_error_response(exc)
        except InformeError as exc:
            return Response(
                {'error': _error_message(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )

    @action(detail=False, methods=['get'], url_path='clientes')
    def clientes(self, request: Request) -> Response:
        try:
            params = self._validated_params(request)
            fecha_inicio, fecha_fin = self._resolve_period(params)
            limite = params.get('limite', 10)
            data = {
                'mejores_clientes': (
                    ReporteEstadisticasService.mejores_clientes(
                        fecha_inicio,
                        fecha_fin,
                        limite,
                    )
                ),
                'analisis_recurrencia': (
                    ReporteEstadisticasService.analisis_recurrencia_clientes()
                ),
            }
            return Response(data)
        except DRFValidationError as exc:
            return _validation_error_response(exc)
        except InformeError as exc:
            return Response(
                {'error': _error_message(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )

    @action(detail=False, methods=['get'], url_path='financiero')
    def financiero(self, request: Request) -> Response:
        try:
            params = self._validated_params(request)
            dias_proyeccion = params.get('dias_proyeccion', 30)
            data = {
                'cuentas_por_cobrar': (
                    ReporteEstadisticasService.total_cuentas_por_cobrar()
                ),
                'antiguedad_cartera': (
                    ReporteEstadisticasService.antiguedad_cartera()
                ),
                'proyeccion_ingresos': (
                    ReporteEstadisticasService.proyeccion_ingresos(
                        dias_proyeccion,
                    )
                ),
            }
            return Response(data)
        except DRFValidationError as exc:
            return _validation_error_response(exc)
        except InformeError as exc:
            return Response(
                {'error': _error_message(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )


class CierreCajaViewSet(BaseInformesViewSet):
    """
    CRUD y acciones de negocio para cierres de caja.
    """

    serializer_classes = {
        'list': CierreCajaListSerializer,
        'retrieve': CierreCajaDetailSerializer,
        'create': CierreCajaCreateSerializer,
        'update': CierreCajaUpdateSerializer,
        'partial_update': CierreCajaUpdateSerializer,
        'generar': CierreCajaGenerateSerializer,
    }

    def get_serializer_class(self):
        return self.serializer_classes.get(
            self.action,
            CierreCajaDetailSerializer,
        )

    def get_serializer(self, *args, **kwargs):
        serializer_class = self.get_serializer_class()
        kwargs.setdefault('context', {'request': self.request})
        return serializer_class(*args, **kwargs)

    def _validated_filters(self, request: Request) -> dict[str, Any]:
        serializer = CierreCajaFilterSerializer(
            data=_compact_query_data({
                'fecha_inicio': (
                    request.query_params.get('fecha_inicio')
                    or request.query_params.get('fecha_desde')
                ),
                'fecha_fin': (
                    request.query_params.get('fecha_fin')
                    or request.query_params.get('fecha_hasta')
                ),
                'usuario_id': request.query_params.get('usuario_id'),
                'diferencia_min': request.query_params.get('diferencia_min'),
                'diferencia_max': request.query_params.get('diferencia_max'),
                'q': request.query_params.get('q'),
                'ordering': request.query_params.get('ordering'),
            }),
        )
        serializer.is_valid(raise_exception=True)
        filtros = serializer.validated_data
        return {
            'fecha_desde': filtros.get('fecha_inicio'),
            'fecha_hasta': filtros.get('fecha_fin'),
            'usuario_id': filtros.get('usuario_id'),
            'diferencia_min': filtros.get('diferencia_min'),
            'diferencia_max': filtros.get('diferencia_max'),
            'q': filtros.get('q'),
            'ordering': filtros.get('ordering'),
        }

    def _serialize_detail(self, cierre, request: Request) -> Response:
        serializer = CierreCajaDetailSerializer(
            cierre,
            context={'request': request},
        )
        return Response(serializer.data)

    def _generar_cierre_desde_validated(
        self,
        validated_data: dict[str, Any],
        request: Request,
        *,
        generated_action: bool = False,
    ) -> Response:
        fecha = (
            validated_data.get('fecha')
            or validated_data.get('fecha_cierre')
        )
        usuario_cierre = validated_data.get('usuario_cierre') or request.user
        cierre = CierreCajaService.generar_cierre_caja(
            fecha=fecha,
            efectivo_real=validated_data['efectivo_real'],
            usuario_cierre=usuario_cierre,
            gastos_operativos=validated_data.get('gastos_operativos'),
            observaciones=validated_data.get('observaciones'),
        )
        serializer = CierreCajaDetailSerializer(
            cierre,
            context={'request': request},
        )
        response_status = (
            status.HTTP_201_CREATED
            if generated_action else status.HTTP_201_CREATED
        )
        return Response(serializer.data, status=response_status)

    def list(self, request: Request) -> Response:
        try:
            cierres = CierreCajaService.obtener_cierres(
                self._validated_filters(request),
            )
            page = self.paginate_queryset(cierres)
            if page is not None:
                serializer = CierreCajaListSerializer(
                    page,
                    many=True,
                    context={'request': request},
                )
                return self.get_paginated_response(serializer.data)

            serializer = CierreCajaListSerializer(
                cierres,
                many=True,
                context={'request': request},
            )
            return Response(serializer.data)
        except DRFValidationError as exc:
            return _validation_error_response(exc)
        except InformeError as exc:
            return Response(
                {'error': _error_message(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )

    def create(self, request: Request) -> Response:
        try:
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            return self._generar_cierre_desde_validated(
                serializer.validated_data,
                request,
            )
        except DRFValidationError as exc:
            return _validation_error_response(exc)
        except InformeError as exc:
            return Response(
                {'error': _error_message(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )

    def retrieve(self, request: Request, pk: int = None) -> Response:
        try:
            cierre = CierreCajaService.obtener_detalle_cierre(int(pk))
            return self._serialize_detail(cierre, request)
        except CierreCajaNoEncontradoError as exc:
            return Response(
                {'error': _error_message(exc)},
                status=status.HTTP_404_NOT_FOUND,
            )
        except (InformeError, ValueError) as exc:
            return Response(
                {'error': _error_message(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )

    def update(self, request: Request, pk: int = None) -> Response:
        try:
            serializer = self.get_serializer(
                data=request.data,
                partial=True,
            )
            serializer.is_valid(raise_exception=True)
            cierre = CierreCajaService.modificar_cierre(
                int(pk),
                serializer.validated_data,
            )
            return self._serialize_detail(cierre, request)
        except DRFValidationError as exc:
            return _validation_error_response(exc)
        except CierreCajaNoEncontradoError as exc:
            return Response(
                {'error': _error_message(exc)},
                status=status.HTTP_404_NOT_FOUND,
            )
        except (InformeError, ValueError) as exc:
            return Response(
                {'error': _error_message(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )

    @action(detail=False, methods=['post'], url_path='generar')
    def generar(self, request: Request) -> Response:
        try:
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            return self._generar_cierre_desde_validated(
                serializer.validated_data,
                request,
                generated_action=True,
            )
        except DRFValidationError as exc:
            return _validation_error_response(exc)
        except InformeError as exc:
            return Response(
                {'error': _error_message(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )


class InformeViewSet(BaseInformesViewSet):
    """
    Endpoints para listar, generar y descargar reportes persistidos.
    """

    serializer_classes = {
        'list': InformeListSerializer,
        'retrieve': InformeDetailSerializer,
        'generar': InformeGenerateSerializer,
    }

    def get_serializer_class(self):
        return self.serializer_classes.get(
            self.action,
            InformeDetailSerializer,
        )

    def get_serializer(self, *args, **kwargs):
        serializer_class = self.get_serializer_class()
        kwargs.setdefault('context', {'request': self.request})
        return serializer_class(*args, **kwargs)

    def _validated_filters(self, request: Request) -> dict[str, Any]:
        serializer = InformeFilterSerializer(
            data=_compact_query_data({
                'tipo_informe': (
                    request.query_params.get('tipo_informe')
                    or request.query_params.get('tipo_reporte')
                ),
                'fecha_inicio': request.query_params.get('fecha_inicio'),
                'fecha_fin': request.query_params.get('fecha_fin'),
                'usuario_id': request.query_params.get('usuario_id'),
                'q': request.query_params.get('q'),
                'ordering': request.query_params.get('ordering'),
            }),
        )
        serializer.is_valid(raise_exception=True)
        return serializer.validated_data

    def _download_response(self, file_field, content_type: str):
        file_field.open('rb')
        filename = Path(file_field.name).name
        return FileResponse(
            file_field,
            as_attachment=True,
            filename=filename,
            content_type=content_type,
        )

    def list(self, request: Request) -> Response:
        try:
            informes = InformeService.listar_informes(
                self._validated_filters(request),
            )
            page = self.paginate_queryset(informes)
            if page is not None:
                serializer = InformeListSerializer(
                    page,
                    many=True,
                    context={'request': request},
                )
                return self.get_paginated_response(serializer.data)

            serializer = InformeListSerializer(
                informes,
                many=True,
                context={'request': request},
            )
            return Response(serializer.data)
        except DRFValidationError as exc:
            return _validation_error_response(exc)
        except InformeError as exc:
            return Response(
                {'error': _error_message(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )

    def retrieve(self, request: Request, pk: int = None) -> Response:
        try:
            informe = InformeService.obtener_informe(int(pk))
            serializer = InformeDetailSerializer(
                informe,
                context={'request': request},
            )
            return Response(serializer.data)
        except InformeNoEncontradoError as exc:
            return Response(
                {'error': _error_message(exc)},
                status=status.HTTP_404_NOT_FOUND,
            )
        except (InformeError, ValueError) as exc:
            return Response(
                {'error': _error_message(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )

    @action(detail=False, methods=['post'], url_path='generar')
    def generar(self, request: Request) -> Response:
        try:
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            informe = InformeService.generar_informe(
                serializer.validated_data,
                request.user,
            )
            response_serializer = InformeDetailSerializer(
                informe,
                context={'request': request},
            )
            return Response(
                response_serializer.data,
                status=status.HTTP_201_CREATED,
            )
        except DRFValidationError as exc:
            return _validation_error_response(exc)
        except InformeError as exc:
            return Response(
                {'error': _error_message(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )

    @action(detail=True, methods=['get'], url_path='descargar-pdf')
    def descargar_pdf(self, request: Request, pk: int = None):
        try:
            archivo = InformeService.obtener_archivo_reporte(
                int(pk),
                InformeService.PDF,
            )
            return self._download_response(archivo, 'application/pdf')
        except InformeNoEncontradoError as exc:
            return Response(
                {'error': _error_message(exc)},
                status=status.HTTP_404_NOT_FOUND,
            )
        except (InformeError, ValueError) as exc:
            return Response(
                {'error': _error_message(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )

    @action(detail=True, methods=['get'], url_path='descargar-excel')
    def descargar_excel(self, request: Request, pk: int = None):
        try:
            archivo = InformeService.obtener_archivo_reporte(
                int(pk),
                InformeService.EXCEL,
            )
            return self._download_response(
                archivo,
                (
                    'application/vnd.openxmlformats-officedocument.'
                    'spreadsheetml.sheet'
                ),
            )
        except InformeNoEncontradoError as exc:
            return Response(
                {'error': _error_message(exc)},
                status=status.HTTP_404_NOT_FOUND,
            )
        except (InformeError, ValueError) as exc:
            return Response(
                {'error': _error_message(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )
