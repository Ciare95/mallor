from decimal import Decimal
from typing import Any, Dict

from django.utils.translation import gettext_lazy as _
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError as DRFValidationError
from rest_framework.pagination import PageNumberPagination
from rest_framework.request import Request
from rest_framework.response import Response

from cliente.serializers import (
    ClienteCreateSerializer,
    ClienteDetailSerializer,
    ClienteListSerializer,
    ClienteSerializer,
    ClienteUpdateSerializer,
)
from cliente.services import ClienteService
from core.exceptions import ClienteError, ClienteNoEncontradoError
from empresa.services import EmpresaService
from usuario.utils import RolePermissionMixin
from ventas.serializers import VentaListSerializer


class ClientesPagination(PageNumberPagination):
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


class BaseClientePermission(permissions.BasePermission):
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
        return EmpresaService.validar_permiso_operacion(
            request.user,
            getattr(request, 'empresa', None),
            accion,
        )

    def has_object_permission(self, request: Request, view, obj) -> bool:
        return self.has_permission(request, view)


class ClientePermission(BaseClientePermission):
    action_mapping = {
        'list': 'listar_clientes',
        'create': 'crear_cliente',
        'retrieve': 'ver_cliente',
        'update': 'actualizar_cliente',
        'partial_update': 'actualizar_cliente',
        'destroy': 'eliminar_cliente',
        'historial': 'ver_cliente',
        'cartera': 'ver_cliente',
        'estadisticas': 'ver_cliente',
        'buscar': 'listar_clientes',
        'mejores': 'ver_informe_clientes',
        'morosos': 'ver_informe_clientes',
    }


def _error_message(exc: Exception) -> str:
    return getattr(exc, 'message', str(exc))


def _clean_filter_values(filtros: Dict[str, Any]) -> Dict[str, Any]:
    return {
        key: value
        for key, value in filtros.items()
        if value not in (None, '')
    }


class ClienteViewSet(RolePermissionMixin, viewsets.ViewSet):
    required_roles = None
    permission_classes = [ClientePermission]
    pagination_class = ClientesPagination
    serializer_classes = {
        'list': ClienteListSerializer,
        'retrieve': ClienteDetailSerializer,
        'create': ClienteCreateSerializer,
        'update': ClienteUpdateSerializer,
        'partial_update': ClienteUpdateSerializer,
        'buscar': ClienteListSerializer,
        'historial': VentaListSerializer,
        'cartera': VentaListSerializer,
    }

    def get_serializer_class(self):
        return self.serializer_classes.get(self.action, ClienteSerializer)

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

    def _get_filtros_clientes(self, request: Request) -> Dict[str, Any]:
        return _clean_filter_values({
            'q': request.query_params.get('q'),
            'tipo_cliente': request.query_params.get('tipo_cliente'),
            'ciudad': request.query_params.get('ciudad'),
            'activo': request.query_params.get('activo'),
            'con_saldo_pendiente': request.query_params.get(
                'con_saldo_pendiente',
            ),
            'ordering': request.query_params.get('ordering'),
        })

    def _paginate_list_response(self, data, serializer_class):
        page = self.paginate_queryset(data)
        if page is not None:
            serializer = serializer_class(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = serializer_class(data, many=True)
        return Response(serializer.data)

    def list(self, request: Request) -> Response:
        try:
            clientes = ClienteService.listar_clientes(
                self._get_filtros_clientes(request),
            )
            return self._paginate_list_response(
                clientes,
                self.get_serializer_class(),
            )
        except Exception as exc:
            return Response(
                {'error': _('Error al listar clientes: %(error)s') % {
                    'error': str(exc),
                }},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def create(self, request: Request) -> Response:
        try:
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            cliente = ClienteService.crear_cliente(serializer.validated_data)
            response_serializer = ClienteDetailSerializer(
                cliente,
                context={'request': request},
            )
            return Response(
                response_serializer.data,
                status=status.HTTP_201_CREATED,
            )
        except DRFValidationError as exc:
            return Response(
                {'errors': exc.detail},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except ClienteError as exc:
            return Response(
                {'error': _error_message(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as exc:
            return Response(
                {'error': _('Error al crear cliente: %(error)s') % {
                    'error': str(exc),
                }},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def retrieve(self, request: Request, pk=None) -> Response:
        try:
            cliente = ClienteService.obtener_cliente(int(pk))
            serializer = self.get_serializer(cliente)
            return Response(serializer.data)
        except ClienteNoEncontradoError as exc:
            return Response(
                {'error': _error_message(exc)},
                status=status.HTTP_404_NOT_FOUND,
            )
        except Exception as exc:
            return Response(
                {'error': _('Error al obtener cliente: %(error)s') % {
                    'error': str(exc),
                }},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def update(self, request: Request, pk=None) -> Response:
        return self._update(request, pk, partial=False)

    def partial_update(self, request: Request, pk=None) -> Response:
        return self._update(request, pk, partial=True)

    def _update(self, request: Request, pk=None, partial: bool = False):
        try:
            cliente = ClienteService.obtener_cliente(int(pk))
            serializer = self.get_serializer(
                cliente,
                data=request.data,
                partial=partial,
            )
            serializer.is_valid(raise_exception=True)
            cliente_actualizado = ClienteService.actualizar_cliente(
                int(pk),
                serializer.validated_data,
            )
            response_serializer = ClienteDetailSerializer(
                cliente_actualizado,
                context={'request': request},
            )
            return Response(response_serializer.data)
        except DRFValidationError as exc:
            return Response(
                {'errors': exc.detail},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except ClienteNoEncontradoError as exc:
            return Response(
                {'error': _error_message(exc)},
                status=status.HTTP_404_NOT_FOUND,
            )
        except ClienteError as exc:
            return Response(
                {'error': _error_message(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as exc:
            return Response(
                {'error': _('Error al actualizar cliente: %(error)s') % {
                    'error': str(exc),
                }},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def destroy(self, request: Request, pk=None) -> Response:
        try:
            ClienteService.eliminar_cliente(int(pk))
            return Response(status=status.HTTP_204_NO_CONTENT)
        except ClienteNoEncontradoError as exc:
            return Response(
                {'error': _error_message(exc)},
                status=status.HTTP_404_NOT_FOUND,
            )
        except ClienteError as exc:
            return Response(
                {'error': _error_message(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as exc:
            return Response(
                {'error': _('Error al eliminar cliente: %(error)s') % {
                    'error': str(exc),
                }},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=True, methods=['get'], url_path='historial')
    def historial(self, request: Request, pk=None) -> Response:
        try:
            historial = ClienteService.obtener_historial_compras(
                int(pk),
                _clean_filter_values({
                    'q': request.query_params.get('q'),
                    'fecha_desde': request.query_params.get('fecha_desde'),
                    'fecha_hasta': request.query_params.get('fecha_hasta'),
                    'estado': request.query_params.get('estado'),
                    'estado_pago': request.query_params.get('estado_pago'),
                    'metodo_pago': request.query_params.get('metodo_pago'),
                    'ordering': request.query_params.get('ordering'),
                }),
            )
            return self._paginate_list_response(
                historial,
                self.get_serializer_class(),
            )
        except ClienteNoEncontradoError as exc:
            return Response(
                {'error': _error_message(exc)},
                status=status.HTTP_404_NOT_FOUND,
            )
        except ClienteError as exc:
            return Response(
                {'error': _error_message(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as exc:
            return Response(
                {'error': _('Error al obtener historial: %(error)s') % {
                    'error': str(exc),
                }},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=True, methods=['get'], url_path='cartera')
    def cartera(self, request: Request, pk=None) -> Response:
        try:
            cartera = ClienteService.obtener_cartera_cliente(int(pk))
            return self._paginate_list_response(
                cartera,
                self.get_serializer_class(),
            )
        except ClienteNoEncontradoError as exc:
            return Response(
                {'error': _error_message(exc)},
                status=status.HTTP_404_NOT_FOUND,
            )
        except ClienteError as exc:
            return Response(
                {'error': _error_message(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as exc:
            return Response(
                {'error': _('Error al obtener cartera: %(error)s') % {
                    'error': str(exc),
                }},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=True, methods=['get'], url_path='estadisticas')
    def estadisticas(self, request: Request, pk=None) -> Response:
        try:
            estadisticas = ClienteService.calcular_estadisticas_cliente(
                int(pk),
            )
            data = {
                **estadisticas,
                'total_compras': f"{estadisticas['total_compras']:.2f}",
                'saldo_pendiente': (
                    f"{estadisticas['saldo_pendiente']:.2f}"
                ),
                'ticket_promedio': f"{estadisticas['ticket_promedio']:.2f}",
                'total_vencido': f"{estadisticas['total_vencido']:.2f}",
                'credito_disponible': (
                    f"{estadisticas['credito_disponible']:.2f}"
                ),
                'limite_credito': f"{estadisticas['limite_credito']:.2f}",
            }
            return Response(data)
        except ClienteNoEncontradoError as exc:
            return Response(
                {'error': _error_message(exc)},
                status=status.HTTP_404_NOT_FOUND,
            )
        except ClienteError as exc:
            return Response(
                {'error': _error_message(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as exc:
            return Response(
                {'error': _('Error al obtener estadísticas: %(error)s') % {
                    'error': str(exc),
                }},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=False, methods=['get'], url_path='buscar')
    def buscar(self, request: Request) -> Response:
        return self.list(request)

    @action(detail=False, methods=['get'], url_path='mejores')
    def mejores(self, request: Request) -> Response:
        try:
            limite = request.query_params.get('limite', 10)
            clientes = ClienteService.obtener_mejores_clientes(limite=limite)
            return self._paginate_list_response(
                clientes,
                ClienteListSerializer,
            )
        except ClienteError as exc:
            return Response(
                {'error': _error_message(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as exc:
            return Response(
                {'error': _('Error al obtener mejores clientes: %(error)s') % {
                    'error': str(exc),
                }},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=False, methods=['get'], url_path='morosos')
    def morosos(self, request: Request) -> Response:
        try:
            morosos = ClienteService.obtener_clientes_morosos()
            serialized = []

            for item in morosos:
                cliente_data = ClienteListSerializer(
                    item['cliente'],
                    context={'request': request},
                ).data
                serialized.append({
                    'cliente': cliente_data,
                    'total_vencido': f"{item['total_vencido']:.2f}",
                    'cantidad_ventas_vencidas': (
                        item['cantidad_ventas_vencidas']
                    ),
                    'ventas': VentaListSerializer(
                        item['ventas'],
                        many=True,
                        context={'request': request},
                    ).data,
                })

            page = self.paginate_queryset(serialized)
            if page is not None:
                return self.get_paginated_response(page)

            return Response(serialized)
        except ClienteError as exc:
            return Response(
                {'error': _error_message(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as exc:
            return Response(
                {'error': _('Error al obtener clientes morosos: %(error)s') % {
                    'error': str(exc),
                }},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
