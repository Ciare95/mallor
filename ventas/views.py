from datetime import date
from typing import Any, Dict, Optional

from django.http import HttpResponse
from django.utils.dateparse import parse_date
from django.utils.translation import gettext_lazy as _
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError as DRFValidationError
from rest_framework.pagination import PageNumberPagination
from rest_framework.request import Request
from rest_framework.response import Response

from core.exceptions import (
    AbonoNoEncontradoError,
    FacturacionDocumentoNoEncontradoError,
    FacturacionError,
    ProductoNoEncontradoError,
    VentaError,
    VentaNoEncontradaError,
)
from inventario.serializers import HistorialInventarioSerializer
from usuario.services import UsuarioService
from usuario.utils import RolePermissionMixin
from ventas.serializers import (
    AbonoCreateSerializer,
    AbonoListSerializer,
    AbonoSerializer,
    DetalleVentaSerializer,
    FacturacionElectronicaConfigSerializer,
    FactusNumberingRangeSerializer,
    VentaCreateSerializer,
    VentaFacturaElectronicaSerializer,
    VentaListSerializer,
    VentaSerializer,
    VentaUpdateSerializer,
)
from ventas.facturacion_services import FacturacionElectronicaService
from ventas.models import FactusNumberingRange
from ventas.services import AbonoService, VentaReporteService, VentaService


class VentasPagination(PageNumberPagination):
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


class BaseVentasPermission(permissions.BasePermission):
    action_mapping = {}

    def has_permission(self, request: Request, view) -> bool:
        if not request.user or not request.user.is_authenticated:
            return False

        view_action = getattr(view, 'action', None)
        fallback_action = getattr(view, 'permission_action', None)
        accion = self.action_mapping.get(
            view_action,
            fallback_action or view_action,
        )
        return UsuarioService.validar_permisos(request.user, accion)

    def has_object_permission(self, request: Request, view, obj) -> bool:
        return self.has_permission(request, view)


class VentaPermission(BaseVentasPermission):
    action_mapping = {
        'list': 'listar_ventas',
        'create': 'crear_venta',
        'retrieve': 'ver_venta',
        'update': 'actualizar_venta',
        'partial_update': 'actualizar_venta',
        'destroy': 'eliminar_venta',
        'cancelar': 'eliminar_venta',
        'cambiar_estado': 'actualizar_venta',
        'historial': 'ver_venta',
        'buscar': 'listar_ventas',
        'abonos': 'registrar_abono',
        'factura': 'ver_factura',
        'emitir_factura': 'crear_factura',
        'reenviar_factura': 'crear_factura',
        'factura_pdf': 'ver_factura',
        'factura_xml': 'ver_factura',
        'factura_email': 'crear_factura',
        'factura_nota_credito': 'anular_factura',
    }


class AbonoPermission(BaseVentasPermission):
    action_mapping = {
        'list': 'listar_abonos',
        'retrieve': 'ver_abono',
    }


class ReporteVentasPermission(BaseVentasPermission):
    action_mapping = {
        'periodo': 'ver_informe_ventas',
        'cliente': 'ver_informe_ventas',
        'producto': 'ver_informe_ventas',
        'cuentas_por_cobrar': 'ver_informe_ventas',
        'estadisticas': 'ver_informe_ventas',
    }


class FacturacionPermission(BaseVentasPermission):
    action_mapping = {
        'configuracion': 'ver_configuracion_facturacion',
        'validar_conexion': 'validar_conexion_facturacion',
        'sincronizar_rangos': 'sincronizar_rangos_facturacion',
        'rangos': 'ver_configuracion_facturacion',
    }


def _error_message(exc: Exception) -> str:
    return getattr(exc, 'message', str(exc))


def _validation_error_response(exc: DRFValidationError) -> Response:
    return Response(
        {'errors': exc.detail},
        status=status.HTTP_400_BAD_REQUEST,
    )


def _parse_date_param(value: Optional[str], field: str) -> Optional[date]:
    if not value:
        return None

    parsed = parse_date(value)
    if parsed is None:
        raise ValueError(
            _('El parÃ¡metro %(field)s debe tener formato YYYY-MM-DD.') % {
                'field': field,
            },
        )
    return parsed


def _parse_int_param(value: Optional[str], field: str) -> Optional[int]:
    if not value:
        return None

    try:
        return int(value)
    except (TypeError, ValueError) as exc:
        raise ValueError(
            _('El parÃ¡metro %(field)s debe ser un entero vÃ¡lido.') % {
                'field': field,
            },
        ) from exc


def _clean_filter_values(filtros: Dict[str, Any]) -> Dict[str, Any]:
    return {
        key: value
        for key, value in filtros.items()
        if value not in (None, '')
    }


class VentaViewSet(RolePermissionMixin, viewsets.ViewSet):
    required_roles = None
    permission_classes = [VentaPermission]
    pagination_class = VentasPagination
    serializer_classes = {
        'list': VentaListSerializer,
        'retrieve': VentaSerializer,
        'create': VentaCreateSerializer,
        'update': VentaUpdateSerializer,
        'partial_update': VentaUpdateSerializer,
        'buscar': VentaListSerializer,
        'historial': HistorialInventarioSerializer,
    }

    def get_serializer_class(self):
        return self.serializer_classes.get(self.action, VentaSerializer)

    def get_serializer(self, *args, **kwargs):
        serializer_class = self.get_serializer_class()
        kwargs.setdefault('context', {'request': self.request})
        return serializer_class(*args, **kwargs)

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

    def _get_filtros_ventas(self, request: Request) -> Dict[str, Any]:
        fecha_inicio = (
            request.query_params.get('fecha_inicio') or
            request.query_params.get('fecha_desde')
        )
        fecha_fin = (
            request.query_params.get('fecha_fin') or
            request.query_params.get('fecha_hasta')
        )
        return _clean_filter_values({
            'fecha_desde': _parse_date_param(
                fecha_inicio,
                'fecha_inicio',
            ),
            'fecha_hasta': _parse_date_param(fecha_fin, 'fecha_fin'),
            'cliente_id': _parse_int_param(
                request.query_params.get('cliente_id'),
                'cliente_id',
            ),
            'estado': request.query_params.get('estado'),
            'estado_pago': request.query_params.get('estado_pago'),
            'usuario_id': _parse_int_param(
                request.query_params.get('usuario_id'),
                'usuario_id',
            ),
            'metodo_pago': request.query_params.get('metodo_pago'),
            'q': request.query_params.get('q'),
            'ordering': request.query_params.get('ordering'),
        })

    def list(self, request: Request) -> Response:
        try:
            ventas = VentaService.listar_ventas(
                self._get_filtros_ventas(request),
            )
            page = self.paginate_queryset(ventas)
            if page is not None:
                serializer = self.get_serializer(page, many=True)
                return self.get_paginated_response(serializer.data)

            serializer = self.get_serializer(ventas, many=True)
            return Response(serializer.data)
        except ValueError as exc:
            return Response(
                {'error': str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as exc:
            return Response(
                {
                    'error': _('Error al listar ventas: %(error)s') % {
                        'error': str(exc),
                    },
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def create(self, request: Request) -> Response:
        try:
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            venta = VentaService.crear_venta(
                serializer.validated_data,
                usuario=request.user,
            )
            response_serializer = VentaSerializer(
                venta,
                context={'request': request},
            )
            return Response(
                response_serializer.data,
                status=status.HTTP_201_CREATED,
            )
        except DRFValidationError as exc:
            return _validation_error_response(exc)
        except VentaError as exc:
            return Response(
                {'error': _error_message(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as exc:
            return Response(
                {
                    'error': _('Error al crear venta: %(error)s') % {
                        'error': str(exc),
                    },
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def retrieve(self, request: Request, pk: int = None) -> Response:
        try:
            venta = VentaService.obtener_venta(int(pk))
            serializer = self.get_serializer(venta)
            return Response(serializer.data)
        except VentaNoEncontradaError as exc:
            return Response(
                {'error': exc.message},
                status=status.HTTP_404_NOT_FOUND,
            )
        except ValueError:
            return Response(
                {'error': _('ID de venta invÃ¡lido')},
                status=status.HTTP_400_BAD_REQUEST,
            )

    def update(self, request: Request, pk: int = None) -> Response:
        return self._actualizar_venta(request, pk, partial=False)

    def partial_update(self, request: Request, pk: int = None) -> Response:
        return self._actualizar_venta(request, pk, partial=True)

    def _actualizar_venta(
        self,
        request: Request,
        pk: int,
        partial: bool,
    ) -> Response:
        try:
            venta = VentaService.obtener_venta(int(pk))
            serializer = self.get_serializer(
                venta,
                data=request.data,
                partial=partial,
            )
            serializer.is_valid(raise_exception=True)
            venta_actualizada = VentaService.actualizar_venta(
                int(pk),
                serializer.validated_data,
                usuario=request.user,
            )
            response_serializer = VentaSerializer(
                venta_actualizada,
                context={'request': request},
            )
            return Response(response_serializer.data)
        except DRFValidationError as exc:
            return _validation_error_response(exc)
        except VentaNoEncontradaError as exc:
            return Response(
                {'error': exc.message},
                status=status.HTTP_404_NOT_FOUND,
            )
        except VentaError as exc:
            return Response(
                {'error': _error_message(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except ValueError:
            return Response(
                {'error': _('ID de venta invÃ¡lido')},
                status=status.HTTP_400_BAD_REQUEST,
            )

    def destroy(self, request: Request, pk: int = None) -> Response:
        try:
            VentaService.eliminar_venta(int(pk), usuario=request.user)
            return Response(status=status.HTTP_204_NO_CONTENT)
        except VentaNoEncontradaError as exc:
            return Response(
                {'error': exc.message},
                status=status.HTTP_404_NOT_FOUND,
            )
        except VentaError as exc:
            return Response(
                {'error': _error_message(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except ValueError:
            return Response(
                {'error': _('ID de venta invÃ¡lido')},
                status=status.HTTP_400_BAD_REQUEST,
            )

    @action(detail=True, methods=['post'], url_path='cancelar')
    def cancelar(self, request: Request, pk: int = None) -> Response:
        try:
            motivo = request.data.get('motivo', '')
            venta = VentaService.cancelar_venta(
                int(pk),
                motivo=motivo,
                usuario=request.user,
            )
            serializer = VentaSerializer(venta, context={'request': request})
            return Response(serializer.data)
        except VentaNoEncontradaError as exc:
            return Response(
                {'error': exc.message},
                status=status.HTTP_404_NOT_FOUND,
            )
        except VentaError as exc:
            return Response(
                {'error': _error_message(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except ValueError:
            return Response(
                {'error': _('ID de venta invÃ¡lido')},
                status=status.HTTP_400_BAD_REQUEST,
            )

    @action(detail=True, methods=['post'], url_path='cambiar-estado')
    def cambiar_estado(self, request: Request, pk: int = None) -> Response:
        try:
            nuevo_estado = (
                request.data.get('estado') or
                request.data.get('nuevo_estado')
            )
            if not nuevo_estado:
                return Response(
                    {'error': _('El campo estado es requerido.')},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            venta = VentaService.cambiar_estado(int(pk), nuevo_estado)
            serializer = VentaSerializer(venta, context={'request': request})
            return Response(serializer.data)
        except VentaNoEncontradaError as exc:
            return Response(
                {'error': exc.message},
                status=status.HTTP_404_NOT_FOUND,
            )
        except VentaError as exc:
            return Response(
                {'error': _error_message(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except ValueError:
            return Response(
                {'error': _('ID de venta invÃ¡lido')},
                status=status.HTTP_400_BAD_REQUEST,
            )

    @action(detail=True, methods=['get'], url_path='historial')
    def historial(self, request: Request, pk: int = None) -> Response:
        try:
            movimientos = VentaService.obtener_historial(int(pk))
            serializer = self.get_serializer(movimientos, many=True)
            return Response(serializer.data)
        except VentaNoEncontradaError as exc:
            return Response(
                {'error': exc.message},
                status=status.HTTP_404_NOT_FOUND,
            )
        except ValueError:
            return Response(
                {'error': _('ID de venta invÃ¡lido')},
                status=status.HTTP_400_BAD_REQUEST,
            )

    @action(detail=False, methods=['get'], url_path='buscar')
    def buscar(self, request: Request) -> Response:
        try:
            filtros = self._get_filtros_ventas(request)
            filtros['q'] = request.query_params.get('q', '')
            ventas = VentaService.listar_ventas(filtros)
            page = self.paginate_queryset(ventas)
            if page is not None:
                serializer = self.get_serializer(page, many=True)
                return self.get_paginated_response(serializer.data)

            serializer = self.get_serializer(ventas, many=True)
            return Response(serializer.data)
        except ValueError as exc:
            return Response(
                {'error': str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )

    @action(detail=True, methods=['get', 'post'], url_path='abonos')
    def abonos(self, request: Request, pk: int = None) -> Response:
        if request.method == 'GET':
            return self._listar_abonos_venta(request, pk)
        return self._registrar_abono(request, pk)

    def _listar_abonos_venta(
        self,
        request: Request,
        pk: int,
    ) -> Response:
        try:
            abonos = AbonoService.obtener_abonos_venta(int(pk))
            serializer = AbonoListSerializer(abonos, many=True)
            return Response(serializer.data)
        except VentaNoEncontradaError as exc:
            return Response(
                {'error': exc.message},
                status=status.HTTP_404_NOT_FOUND,
            )
        except ValueError:
            return Response(
                {'error': _('ID de venta invÃ¡lido')},
                status=status.HTTP_400_BAD_REQUEST,
            )

    def _registrar_abono(self, request: Request, pk: int) -> Response:
        try:
            data = request.data.copy()
            data['venta'] = pk
            data['usuario_registro'] = request.user.id
            serializer = AbonoCreateSerializer(data=data)
            serializer.is_valid(raise_exception=True)
            abono = AbonoService.registrar_abono(
                int(pk),
                serializer.validated_data,
                usuario=request.user,
            )
            response_serializer = AbonoSerializer(
                abono,
                context={'request': request},
            )
            return Response(
                response_serializer.data,
                status=status.HTTP_201_CREATED,
            )
        except DRFValidationError as exc:
            return _validation_error_response(exc)
        except VentaNoEncontradaError as exc:
            return Response(
                {'error': exc.message},
                status=status.HTTP_404_NOT_FOUND,
            )
        except VentaError as exc:
            return Response(
                {'error': _error_message(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except ValueError:
            return Response(
                {'error': _('ID de venta invÃ¡lido')},
                status=status.HTTP_400_BAD_REQUEST,
            )


    @action(detail=True, methods=['get'], url_path='factura')
    def factura(self, request: Request, pk: int = None) -> Response:
        service = FacturacionElectronicaService()
        try:
            if request.query_params.get('sync') == 'true':
                documento = service.consultar_estado(int(pk))
            else:
                documento = service.obtener_documento(int(pk))
            serializer = VentaFacturaElectronicaSerializer(documento)
            return Response(serializer.data)
        except FacturacionDocumentoNoEncontradoError as exc:
            return Response(
                {'error': exc.message},
                status=status.HTTP_404_NOT_FOUND,
            )
        except FacturacionError as exc:
            return Response(
                {'error': _error_message(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )

    @action(detail=True, methods=['post'], url_path='factura/emitir')
    def emitir_factura(self, request: Request, pk: int = None) -> Response:
        service = FacturacionElectronicaService()
        try:
            documento = service.emitir_factura(int(pk))
            serializer = VentaFacturaElectronicaSerializer(documento)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except FacturacionError as exc:
            return Response(
                {'error': _error_message(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )

    @action(detail=True, methods=['post'], url_path='factura/reintentar')
    def reenviar_factura(self, request: Request, pk: int = None) -> Response:
        service = FacturacionElectronicaService()
        try:
            documento = service.reintentar_emision(int(pk))
            serializer = VentaFacturaElectronicaSerializer(documento)
            return Response(serializer.data)
        except FacturacionError as exc:
            return Response(
                {'error': _error_message(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )

    @action(detail=True, methods=['get'], url_path='factura/pdf')
    def factura_pdf(self, request: Request, pk: int = None) -> Response:
        service = FacturacionElectronicaService()
        try:
            payload = service.descargar_pdf(int(pk))
            response = HttpResponse(
                payload['content'],
                content_type=payload['content_type'],
            )
            response['Content-Disposition'] = (
                f"attachment; filename={payload['filename']}"
            )
            return response
        except FacturacionError as exc:
            return Response(
                {'error': _error_message(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )

    @action(detail=True, methods=['get'], url_path='factura/xml')
    def factura_xml(self, request: Request, pk: int = None) -> Response:
        service = FacturacionElectronicaService()
        try:
            payload = service.descargar_xml(int(pk))
            response = HttpResponse(
                payload['content'],
                content_type=payload['content_type'],
            )
            response['Content-Disposition'] = (
                f"attachment; filename={payload['filename']}"
            )
            return response
        except FacturacionError as exc:
            return Response(
                {'error': _error_message(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )

    @action(detail=True, methods=['post'], url_path='factura/enviar-email')
    def factura_email(self, request: Request, pk: int = None) -> Response:
        service = FacturacionElectronicaService()
        try:
            documento = service.enviar_email(
                int(pk),
                email=request.data.get('email'),
            )
            serializer = VentaFacturaElectronicaSerializer(documento)
            return Response(serializer.data)
        except FacturacionError as exc:
            return Response(
                {'error': _error_message(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )

    @action(detail=True, methods=['post'], url_path='factura/nota-credito')
    def factura_nota_credito(self, request: Request, pk: int = None) -> Response:
        service = FacturacionElectronicaService()
        try:
            documento = service.crear_nota_credito(
                int(pk),
                reason=request.data.get('reason') or request.data.get('motivo') or '',
                concept_code=request.data.get('concept_code', '1'),
            )
            serializer = VentaFacturaElectronicaSerializer(documento)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except FacturacionError as exc:
            return Response(
                {'error': _error_message(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )


class AbonoViewSet(RolePermissionMixin, viewsets.ViewSet):
    required_roles = None
    permission_classes = [AbonoPermission]
    pagination_class = VentasPagination
    serializer_classes = {
        'list': AbonoListSerializer,
        'retrieve': AbonoSerializer,
    }

    def get_serializer_class(self):
        return self.serializer_classes.get(self.action, AbonoSerializer)

    def get_serializer(self, *args, **kwargs):
        serializer_class = self.get_serializer_class()
        kwargs.setdefault('context', {'request': self.request})
        return serializer_class(*args, **kwargs)

    @property
    def paginator(self):
        if not hasattr(self, '_paginator'):
            self._paginator = self.pagination_class()
        return self._paginator

    def paginate_queryset(self, queryset):
        return self.paginator.paginate_queryset(
            queryset,
            self.request,
            view=self,
        )

    def get_paginated_response(self, data):
        return self.paginator.get_paginated_response(data)

    def _get_filtros_abonos(self, request: Request) -> Dict[str, Any]:
        fecha_inicio = (
            request.query_params.get('fecha_inicio') or
            request.query_params.get('fecha_desde')
        )
        fecha_fin = (
            request.query_params.get('fecha_fin') or
            request.query_params.get('fecha_hasta')
        )
        return _clean_filter_values({
            'venta_id': _parse_int_param(
                request.query_params.get('venta_id'),
                'venta_id',
            ),
            'usuario_id': _parse_int_param(
                request.query_params.get('usuario_id'),
                'usuario_id',
            ),
            'metodo_pago': request.query_params.get('metodo_pago'),
            'fecha_desde': _parse_date_param(
                fecha_inicio,
                'fecha_inicio',
            ),
            'fecha_hasta': _parse_date_param(fecha_fin, 'fecha_fin'),
            'q': request.query_params.get('q'),
        })

    def list(self, request: Request) -> Response:
        try:
            abonos = AbonoService.listar_abonos(
                self._get_filtros_abonos(request),
            )
            page = self.paginate_queryset(abonos)
            if page is not None:
                serializer = self.get_serializer(page, many=True)
                return self.get_paginated_response(serializer.data)

            serializer = self.get_serializer(abonos, many=True)
            return Response(serializer.data)
        except ValueError as exc:
            return Response(
                {'error': str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )

    def retrieve(self, request: Request, pk: int = None) -> Response:
        try:
            abono = AbonoService.obtener_abono(int(pk))
            serializer = self.get_serializer(abono)
            return Response(serializer.data)
        except AbonoNoEncontradoError as exc:
            return Response(
                {'error': exc.message},
                status=status.HTTP_404_NOT_FOUND,
            )
        except ValueError:
            return Response(
                {'error': _('ID de abono invÃ¡lido')},
                status=status.HTTP_400_BAD_REQUEST,
            )


class VentaReporteViewSet(RolePermissionMixin, viewsets.ViewSet):
    required_roles = None
    permission_classes = [ReporteVentasPermission]
    pagination_class = VentasPagination

    @property
    def paginator(self):
        if not hasattr(self, '_paginator'):
            self._paginator = self.pagination_class()
        return self._paginator

    def _paginated_response(self, request: Request, data, serializer_class):
        page = self.paginator.paginate_queryset(data, request, view=self)
        if page is not None:
            serializer = serializer_class(page, many=True)
            return self.paginator.get_paginated_response(serializer.data)

        serializer = serializer_class(data, many=True)
        return Response(serializer.data)

    def _get_periodo_personalizado(self, request: Request) -> Dict[str, date]:
        fecha_inicio = _parse_date_param(
            request.query_params.get('fecha_inicio'),
            'fecha_inicio',
        )
        fecha_fin = _parse_date_param(
            request.query_params.get('fecha_fin'),
            'fecha_fin',
        )
        if not fecha_inicio or not fecha_fin:
            raise ValueError(
                _('fecha_inicio y fecha_fin son requeridos.'),
            )
        if fecha_inicio > fecha_fin:
            raise ValueError(
                _('fecha_inicio no puede ser mayor que fecha_fin.'),
            )
        return {
            'fecha_inicio': fecha_inicio,
            'fecha_fin': fecha_fin,
        }

    @action(detail=False, methods=['get'], url_path='periodo')
    def periodo(self, request: Request) -> Response:
        try:
            fechas = self._get_periodo_personalizado(request)
            ventas = VentaReporteService.ventas_por_periodo(
                fechas['fecha_inicio'],
                fechas['fecha_fin'],
            )
            return self._paginated_response(
                request,
                ventas,
                VentaListSerializer,
            )
        except ValueError as exc:
            return Response(
                {'error': str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )

    @action(
        detail=False,
        methods=['get'],
        url_path=r'cliente/(?P<cliente_id>[^/.]+)',
    )
    def cliente(
        self,
        request: Request,
        cliente_id: int = None,
    ) -> Response:
        try:
            ventas = VentaReporteService.ventas_por_cliente(
                int(cliente_id),
            )
            return self._paginated_response(
                request,
                ventas,
                VentaListSerializer,
            )
        except VentaError as exc:
            return Response(
                {'error': _error_message(exc)},
                status=status.HTTP_404_NOT_FOUND,
            )
        except ValueError:
            return Response(
                {'error': _('ID de cliente invÃ¡lido')},
                status=status.HTTP_400_BAD_REQUEST,
            )

    @action(
        detail=False,
        methods=['get'],
        url_path=r'producto/(?P<producto_id>[^/.]+)',
    )
    def producto(
        self,
        request: Request,
        producto_id: int = None,
    ) -> Response:
        try:
            fecha_inicio = _parse_date_param(
                request.query_params.get('fecha_inicio'),
                'fecha_inicio',
            )
            fecha_fin = _parse_date_param(
                request.query_params.get('fecha_fin'),
                'fecha_fin',
            )
            detalles = VentaReporteService.ventas_por_producto(
                int(producto_id),
                fecha_inicio=fecha_inicio,
                fecha_fin=fecha_fin,
            )
            return self._paginated_response(
                request,
                detalles,
                DetalleVentaSerializer,
            )
        except ProductoNoEncontradoError as exc:
            return Response(
                {'error': exc.message},
                status=status.HTTP_404_NOT_FOUND,
            )
        except ValueError as exc:
            return Response(
                {'error': str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )

    @action(
        detail=False,
        methods=['get'],
        url_path='cuentas-por-cobrar',
    )
    def cuentas_por_cobrar(self, request: Request) -> Response:
        try:
            filtros = {
                'cliente_id': _parse_int_param(
                    request.query_params.get('cliente_id'),
                    'cliente_id',
                ),
                'usuario_id': _parse_int_param(
                    request.query_params.get('usuario_id'),
                    'usuario_id',
                ),
                'fecha_desde': _parse_date_param(
                    request.query_params.get('fecha_inicio'),
                    'fecha_inicio',
                ),
                'fecha_hasta': _parse_date_param(
                    request.query_params.get('fecha_fin'),
                    'fecha_fin',
                ),
                'q': request.query_params.get('q'),
            }
            ventas = AbonoService.obtener_cuentas_por_cobrar(
                _clean_filter_values(filtros),
            )
            response = self._paginated_response(
                request,
                ventas,
                VentaListSerializer,
            )
            response.data['total_por_cobrar'] = (
                AbonoService.calcular_total_por_cobrar()
            )
            return response
        except ValueError as exc:
            return Response(
                {'error': str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )

    @action(detail=False, methods=['get'], url_path='estadisticas')
    def estadisticas(self, request: Request) -> Response:
        try:
            periodo = request.query_params.get('periodo', 'hoy')
            if periodo == 'personalizado':
                periodo = self._get_periodo_personalizado(request)
            estadisticas = VentaReporteService.calcular_estadisticas_ventas(
                periodo,
            )
            return Response(estadisticas)
        except (VentaError, ValueError) as exc:
            return Response(
                {'error': _error_message(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )


class FacturacionViewSet(RolePermissionMixin, viewsets.ViewSet):
    required_roles = None
    permission_classes = [FacturacionPermission]

    def _service(self) -> FacturacionElectronicaService:
        return FacturacionElectronicaService()

    @action(detail=False, methods=['get', 'put', 'patch'], url_path='configuracion')
    def configuracion(self, request: Request) -> Response:
        config = FacturacionElectronicaService.get_config(
            getattr(request, 'empresa', None),
        )
        if request.method == 'GET':
            serializer = FacturacionElectronicaConfigSerializer(
                config,
                context={'request': request},
            )
            return Response(serializer.data)

        serializer = FacturacionElectronicaConfigSerializer(
            config,
            data=request.data,
            partial=request.method == 'PATCH',
            context={'request': request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    @action(detail=False, methods=['post'], url_path='validar-conexion')
    def validar_conexion(self, request: Request) -> Response:
        try:
            payload = self._service().validar_conexion()
            return Response(payload)
        except FacturacionError as exc:
            return Response(
                {'error': _error_message(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )

    @action(detail=False, methods=['post'], url_path='sincronizar-rangos')
    def sincronizar_rangos(self, request: Request) -> Response:
        try:
            payload = self._service().sincronizar_rangos()
            return Response(payload)
        except FacturacionError as exc:
            return Response(
                {'error': _error_message(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )

    @action(detail=False, methods=['get'], url_path='rangos')
    def rangos(self, request: Request) -> Response:
        queryset = FactusNumberingRange.objects.filter(
            empresa=getattr(request, 'empresa', None),
        ).order_by(
            'is_credit_note_range',
            'prefix',
        )
        serializer = FactusNumberingRangeSerializer(queryset, many=True)
        return Response(serializer.data)
