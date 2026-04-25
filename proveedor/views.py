from decimal import Decimal
from typing import Any, Dict

from django.utils.translation import gettext_lazy as _
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError as DRFValidationError
from rest_framework.pagination import PageNumberPagination
from rest_framework.request import Request
from rest_framework.response import Response

from core.exceptions import ProveedorError, ProveedorNoEncontradoError
from inventario.serializers import FacturaCompraSerializer
from proveedor.serializers import (
    ProveedorCreateSerializer,
    ProveedorListSerializer,
    ProveedorSerializer,
    ProveedorUpdateSerializer,
)
from proveedor.services import ProveedorService
from usuario.services import UsuarioService
from usuario.utils import RolePermissionMixin


class ProveedoresPagination(PageNumberPagination):
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


class BaseProveedorPermission(permissions.BasePermission):
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


class ProveedorPermission(BaseProveedorPermission):
    action_mapping = {
        'list': 'listar_proveedores',
        'create': 'crear_proveedor',
        'retrieve': 'ver_proveedor',
        'update': 'actualizar_proveedor',
        'partial_update': 'actualizar_proveedor',
        'destroy': 'eliminar_proveedor',
        'historial': 'ver_proveedor',
        'estadisticas': 'ver_proveedor',
        'buscar': 'listar_proveedores',
    }


def _error_message(exc: Exception) -> str:
    return getattr(exc, 'message', str(exc))


def _clean_filter_values(filtros: Dict[str, Any]) -> Dict[str, Any]:
    return {
        key: value
        for key, value in filtros.items()
        if value not in (None, '')
    }


class ProveedorViewSet(RolePermissionMixin, viewsets.ViewSet):
    required_roles = None
    permission_classes = [ProveedorPermission]
    pagination_class = ProveedoresPagination
    serializer_classes = {
        'list': ProveedorListSerializer,
        'retrieve': ProveedorSerializer,
        'create': ProveedorCreateSerializer,
        'update': ProveedorUpdateSerializer,
        'partial_update': ProveedorUpdateSerializer,
        'buscar': ProveedorListSerializer,
        'historial': FacturaCompraSerializer,
    }

    def get_serializer_class(self):
        return self.serializer_classes.get(self.action, ProveedorSerializer)

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

    def _get_filtros_proveedores(self, request: Request) -> Dict[str, Any]:
        return _clean_filter_values({
            'q': request.query_params.get('q'),
            'tipo_documento': request.query_params.get('tipo_documento'),
            'ciudad': request.query_params.get('ciudad'),
            'forma_pago': request.query_params.get('forma_pago'),
            'activo': request.query_params.get('activo'),
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
            proveedores = ProveedorService.listar_proveedores(
                self._get_filtros_proveedores(request),
            )
            return self._paginate_list_response(
                proveedores,
                self.get_serializer_class(),
            )
        except Exception as exc:
            return Response(
                {'error': _('Error al listar proveedores: %(error)s') % {
                    'error': str(exc),
                }},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def create(self, request: Request) -> Response:
        try:
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            proveedor = ProveedorService.crear_proveedor(
                serializer.validated_data,
            )
            response_serializer = ProveedorSerializer(
                proveedor,
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
        except ProveedorError as exc:
            return Response(
                {'error': _error_message(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as exc:
            return Response(
                {'error': _('Error al crear proveedor: %(error)s') % {
                    'error': str(exc),
                }},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def retrieve(self, request: Request, pk=None) -> Response:
        try:
            proveedor = ProveedorService.obtener_proveedor(int(pk))
            serializer = self.get_serializer(proveedor)
            return Response(serializer.data)
        except ProveedorNoEncontradoError as exc:
            return Response(
                {'error': _error_message(exc)},
                status=status.HTTP_404_NOT_FOUND,
            )
        except Exception as exc:
            return Response(
                {'error': _('Error al obtener proveedor: %(error)s') % {
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
            proveedor = ProveedorService.obtener_proveedor(int(pk))
            serializer = self.get_serializer(
                proveedor,
                data=request.data,
                partial=partial,
            )
            serializer.is_valid(raise_exception=True)
            proveedor_actualizado = ProveedorService.actualizar_proveedor(
                int(pk),
                serializer.validated_data,
            )
            response_serializer = ProveedorSerializer(
                proveedor_actualizado,
                context={'request': request},
            )
            return Response(response_serializer.data)
        except DRFValidationError as exc:
            return Response(
                {'errors': exc.detail},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except ProveedorNoEncontradoError as exc:
            return Response(
                {'error': _error_message(exc)},
                status=status.HTTP_404_NOT_FOUND,
            )
        except ProveedorError as exc:
            return Response(
                {'error': _error_message(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as exc:
            return Response(
                {'error': _('Error al actualizar proveedor: %(error)s') % {
                    'error': str(exc),
                }},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def destroy(self, request: Request, pk=None) -> Response:
        try:
            ProveedorService.eliminar_proveedor(int(pk))
            return Response(status=status.HTTP_204_NO_CONTENT)
        except ProveedorNoEncontradoError as exc:
            return Response(
                {'error': _error_message(exc)},
                status=status.HTTP_404_NOT_FOUND,
            )
        except ProveedorError as exc:
            return Response(
                {'error': _error_message(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as exc:
            return Response(
                {'error': _('Error al eliminar proveedor: %(error)s') % {
                    'error': str(exc),
                }},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=True, methods=['get'], url_path='historial')
    def historial(self, request: Request, pk=None) -> Response:
        try:
            historial = ProveedorService.obtener_historial_compras(
                int(pk),
                _clean_filter_values({
                    'q': request.query_params.get('q'),
                    'fecha_desde': request.query_params.get('fecha_desde'),
                    'fecha_hasta': request.query_params.get('fecha_hasta'),
                    'estado': request.query_params.get('estado'),
                    'ordering': request.query_params.get('ordering'),
                }),
            )
            return self._paginate_list_response(
                historial,
                self.get_serializer_class(),
            )
        except ProveedorNoEncontradoError as exc:
            return Response(
                {'error': _error_message(exc)},
                status=status.HTTP_404_NOT_FOUND,
            )
        except ProveedorError as exc:
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

    @action(detail=True, methods=['get'], url_path='estadisticas')
    def estadisticas(self, request: Request, pk=None) -> Response:
        try:
            estadisticas = ProveedorService.obtener_estadisticas_proveedor(
                int(pk),
            )
            data = {
                **estadisticas,
                'total_compras': f"{estadisticas['total_compras']:.2f}",
                'ticket_promedio': (
                    f"{estadisticas['ticket_promedio']:.2f}"
                ),
                'total_impuestos': (
                    f"{estadisticas['total_impuestos']:.2f}"
                ),
                'total_descuentos': (
                    f"{estadisticas['total_descuentos']:.2f}"
                ),
                'total_pendiente_procesar': (
                    f"{estadisticas['total_pendiente_procesar']:.2f}"
                ),
            }
            return Response(data)
        except ProveedorNoEncontradoError as exc:
            return Response(
                {'error': _error_message(exc)},
                status=status.HTTP_404_NOT_FOUND,
            )
        except ProveedorError as exc:
            return Response(
                {'error': _error_message(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as exc:
            return Response(
                {'error': _('Error al obtener estadisticas: %(error)s') % {
                    'error': str(exc),
                }},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=False, methods=['get'], url_path='buscar')
    def buscar(self, request: Request) -> Response:
        return self.list(request)
