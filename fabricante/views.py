from decimal import Decimal, InvalidOperation

from django.core.exceptions import ValidationError
from django.db.models.deletion import ProtectedError
from django.utils.translation import gettext_lazy as _
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError as DRFValidationError
from rest_framework.pagination import PageNumberPagination
from rest_framework.request import Request
from rest_framework.response import Response

from core.exceptions import (
    IngredienteNoEncontradoError,
    ProductoFabricadoNoEncontradoError,
    ProduccionNoPermitidaError,
    RecetaInvalidaError,
)
from usuario.utils import RolePermissionMixin

from .serializers import (
    IngredienteSerializer,
    IngredientesProductoSerializer,
    ProductoFabricadoDetailSerializer,
    ProductoFabricadoSerializer,
)
from .services import (
    actualizar_ingrediente,
    actualizar_producto_fabricado,
    actualizar_stock_ingrediente,
    agregar_ingrediente_a_receta,
    calcular_costos_producto,
    convertir_a_producto_inventario,
    crear_ingrediente,
    crear_producto_fabricado,
    eliminar_ingrediente,
    eliminar_ingrediente_de_receta,
    eliminar_producto_fabricado,
    ingredientes_bajo_stock,
    listar_ingredientes,
    listar_productos_fabricados,
    obtener_desglose_costos_producto,
    obtener_producto_fabricado,
    obtener_receta_producto,
    producir_lote,
    sugerir_precio_venta,
)


class FabricantePagination(PageNumberPagination):
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


def _parse_bool(value):
    if value is None:
        return None

    if isinstance(value, bool):
        return value

    valor = str(value).strip().lower()
    if valor in {'1', 'true', 'si', 'yes'}:
        return True
    if valor in {'0', 'false', 'no'}:
        return False
    return None


def _normalize_nested_data(value):
    if value is None:
        return []
    if isinstance(value, list) and len(value) == 1 and isinstance(value[0], list):
        return value[0]
    if isinstance(value, dict):
        return [value]
    return value


def _parse_decimal(value, field_name: str) -> Decimal:
    try:
        return Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError):
        raise RecetaInvalidaError(
            f'El valor de "{field_name}" debe ser numerico.'
        )


class AdminRolePermission(permissions.BasePermission):
    """
    Permiso DRF para restringir el modulo fabricante a administradores.
    """

    message = _('Solo los administradores pueden acceder a este recurso.')

    def has_permission(self, request, view) -> bool:
        user = getattr(request, 'user', None)
        return bool(
            user and
            user.is_authenticated and
            getattr(user, 'role', None) == 'ADMIN'
        )


class IngredienteViewSet(RolePermissionMixin, viewsets.ModelViewSet):
    required_roles = None
    permission_classes = [AdminRolePermission]
    serializer_class = IngredienteSerializer
    pagination_class = FabricantePagination

    def list(self, request: Request) -> Response:
        try:
            filtros = {}
            for param in ['q', 'proveedor_id', 'unidad_medida', 'ordering']:
                valor = request.query_params.get(param)
                if valor is not None:
                    filtros[param] = valor

            bajo_stock = _parse_bool(request.query_params.get('bajo_stock'))
            if bajo_stock is not None:
                filtros['bajo_stock'] = bajo_stock

            ingredientes = listar_ingredientes(filtros)
            page = self.paginate_queryset(ingredientes)
            if page is not None:
                serializer = self.get_serializer(page, many=True)
                return self.get_paginated_response(serializer.data)

            serializer = self.get_serializer(ingredientes, many=True)
            return Response(serializer.data)
        except Exception as exc:
            return Response(
                {'error': _('Error al listar ingredientes: %(error)s') % {
                    'error': str(exc),
                }},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def create(self, request: Request) -> Response:
        try:
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            ingrediente = crear_ingrediente(serializer.validated_data)
            response_serializer = self.get_serializer(ingrediente)
            return Response(
                response_serializer.data,
                status=status.HTTP_201_CREATED,
            )
        except (
            RecetaInvalidaError,
            ValidationError,
            DRFValidationError,
        ) as exc:
            return Response(
                {'error': getattr(exc, 'message', str(exc))},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as exc:
            return Response(
                {'error': _('Error al crear ingrediente: %(error)s') % {
                    'error': str(exc),
                }},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def retrieve(self, request: Request, pk: int = None) -> Response:
        try:
            ingrediente = listar_ingredientes({'ordering': 'nombre'})
            ingrediente = next(
                item for item in ingrediente if item.id == int(pk)
            )
            serializer = self.get_serializer(ingrediente)
            return Response(serializer.data)
        except StopIteration:
            return Response(
                {'error': IngredienteNoEncontradoError(int(pk)).message},
                status=status.HTTP_404_NOT_FOUND,
            )
        except ValueError:
            return Response(
                {'error': _('ID de ingrediente invalido')},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as exc:
            return Response(
                {'error': _('Error al obtener ingrediente: %(error)s') % {
                    'error': str(exc),
                }},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def update(self, request: Request, pk: int = None) -> Response:
        return self._actualizar(request, pk, partial=False)

    def partial_update(self, request: Request, pk: int = None) -> Response:
        return self._actualizar(request, pk, partial=True)

    def _actualizar(
        self,
        request: Request,
        pk: int,
        partial: bool,
    ) -> Response:
        try:
            ingrediente = listar_ingredientes({'ordering': 'nombre'})
            ingrediente = next(
                item for item in ingrediente if item.id == int(pk)
            )
            serializer = self.get_serializer(
                ingrediente,
                data=request.data,
                partial=partial,
            )
            serializer.is_valid(raise_exception=True)
            actualizado = actualizar_ingrediente(
                int(pk),
                serializer.validated_data,
            )
            response_serializer = self.get_serializer(actualizado)
            return Response(response_serializer.data)
        except StopIteration:
            return Response(
                {'error': IngredienteNoEncontradoError(int(pk)).message},
                status=status.HTTP_404_NOT_FOUND,
            )
        except (
            RecetaInvalidaError,
            ValidationError,
            DRFValidationError,
        ) as exc:
            return Response(
                {'error': getattr(exc, 'message', str(exc))},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except ValueError:
            return Response(
                {'error': _('ID de ingrediente invalido')},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as exc:
            return Response(
                {'error': _('Error al actualizar ingrediente: %(error)s') % {
                    'error': str(exc),
                }},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def destroy(self, request: Request, pk: int = None) -> Response:
        try:
            eliminar_ingrediente(int(pk))
            return Response(status=status.HTTP_204_NO_CONTENT)
        except IngredienteNoEncontradoError as exc:
            return Response(
                {'error': exc.message},
                status=status.HTTP_404_NOT_FOUND,
            )
        except ProtectedError:
            return Response(
                {
                    'error': _(
                        'No se puede eliminar el ingrediente porque tiene '
                        'movimientos o recetas asociadas.'
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        except ValueError:
            return Response(
                {'error': _('ID de ingrediente invalido')},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as exc:
            return Response(
                {'error': _('Error al eliminar ingrediente: %(error)s') % {
                    'error': str(exc),
                }},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=True, methods=['post'], url_path='actualizar-stock')
    def actualizar_stock(self, request: Request, pk: int = None) -> Response:
        try:
            cantidad = request.data.get('cantidad')
            if cantidad is None:
                return Response(
                    {'error': _('El campo cantidad es requerido.')},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            ingrediente = actualizar_stock_ingrediente(int(pk), cantidad)
            serializer = self.get_serializer(ingrediente)
            return Response(serializer.data)
        except (
            IngredienteNoEncontradoError,
            ProduccionNoPermitidaError,
            RecetaInvalidaError,
        ) as exc:
            status_code = (
                status.HTTP_404_NOT_FOUND
                if isinstance(exc, IngredienteNoEncontradoError)
                else status.HTTP_400_BAD_REQUEST
            )
            return Response({'error': exc.message}, status=status_code)
        except ValueError:
            return Response(
                {'error': _('ID de ingrediente invalido')},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as exc:
            return Response(
                {'error': _('Error al actualizar stock: %(error)s') % {
                    'error': str(exc),
                }},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=False, methods=['get'], url_path='bajo-stock')
    def bajo_stock(self, request: Request) -> Response:
        try:
            ingredientes = ingredientes_bajo_stock()
            serializer = self.get_serializer(ingredientes, many=True)
            return Response(serializer.data)
        except Exception as exc:
            return Response(
                {
                    'error': _(
                        'Error al obtener ingredientes bajo stock: %(error)s'
                    ) % {'error': str(exc)},
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class ProductoFabricadoViewSet(RolePermissionMixin, viewsets.ModelViewSet):
    required_roles = None
    permission_classes = [AdminRolePermission]
    pagination_class = FabricantePagination
    serializer_classes = {
        'list': ProductoFabricadoSerializer,
        'create': ProductoFabricadoSerializer,
        'retrieve': ProductoFabricadoDetailSerializer,
        'update': ProductoFabricadoSerializer,
        'partial_update': ProductoFabricadoSerializer,
        'receta': IngredientesProductoSerializer,
        'eliminar_ingrediente_receta': IngredientesProductoSerializer,
    }

    def get_serializer_class(self):
        return self.serializer_classes.get(
            self.action,
            ProductoFabricadoSerializer,
        )

    def list(self, request: Request) -> Response:
        try:
            filtros = {}
            for param in ['q', 'unidad_medida', 'producto_final_id', 'ordering']:
                valor = request.query_params.get(param)
                if valor is not None:
                    filtros[param] = valor

            con_producto_final = _parse_bool(
                request.query_params.get('con_producto_final'),
            )
            if con_producto_final is not None:
                filtros['con_producto_final'] = con_producto_final

            productos = listar_productos_fabricados(filtros)
            page = self.paginate_queryset(productos)
            if page is not None:
                serializer = self.get_serializer(page, many=True)
                return self.get_paginated_response(serializer.data)

            serializer = self.get_serializer(productos, many=True)
            return Response(serializer.data)
        except Exception as exc:
            return Response(
                {'error': _('Error al listar productos fabricados: %(error)s') % {
                    'error': str(exc),
                }},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def create(self, request: Request) -> Response:
        try:
            data = request.data.copy()
            receta_data = _normalize_nested_data(data.pop('receta', None))
            serializer = ProductoFabricadoSerializer(data=data)
            serializer.is_valid(raise_exception=True)
            receta_serializer = IngredientesProductoSerializer(
                data=receta_data,
                many=True,
            )
            receta_serializer.is_valid(raise_exception=True)

            producto = crear_producto_fabricado(
                serializer.validated_data,
                receta_serializer.validated_data,
            )
            response_serializer = ProductoFabricadoDetailSerializer(
                producto,
                context={'request': request},
            )
            return Response(
                response_serializer.data,
                status=status.HTTP_201_CREATED,
            )
        except (
            RecetaInvalidaError,
            ValidationError,
            DRFValidationError,
        ) as exc:
            return Response(
                {'error': getattr(exc, 'message', str(exc))},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as exc:
            return Response(
                {
                    'error': _(
                        'Error al crear producto fabricado: %(error)s'
                    ) % {'error': str(exc)},
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def retrieve(self, request: Request, pk: int = None) -> Response:
        try:
            producto = obtener_producto_fabricado(int(pk))
            serializer = ProductoFabricadoDetailSerializer(
                producto,
                context={'request': request},
            )
            return Response(serializer.data)
        except ProductoFabricadoNoEncontradoError as exc:
            return Response(
                {'error': exc.message},
                status=status.HTTP_404_NOT_FOUND,
            )
        except ValueError:
            return Response(
                {'error': _('ID de producto fabricado invalido')},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as exc:
            return Response(
                {
                    'error': _(
                        'Error al obtener producto fabricado: %(error)s'
                    ) % {'error': str(exc)},
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def update(self, request: Request, pk: int = None) -> Response:
        return self._actualizar(request, pk, partial=False)

    def partial_update(self, request: Request, pk: int = None) -> Response:
        return self._actualizar(request, pk, partial=True)

    def _actualizar(
        self,
        request: Request,
        pk: int,
        partial: bool,
    ) -> Response:
        try:
            producto = obtener_producto_fabricado(int(pk))
            serializer = ProductoFabricadoSerializer(
                producto,
                data=request.data,
                partial=partial,
            )
            serializer.is_valid(raise_exception=True)
            actualizado = actualizar_producto_fabricado(
                int(pk),
                serializer.validated_data,
            )
            response_serializer = ProductoFabricadoDetailSerializer(
                actualizado,
                context={'request': request},
            )
            return Response(response_serializer.data)
        except ProductoFabricadoNoEncontradoError as exc:
            return Response(
                {'error': exc.message},
                status=status.HTTP_404_NOT_FOUND,
            )
        except (
            RecetaInvalidaError,
            ValidationError,
            DRFValidationError,
        ) as exc:
            return Response(
                {'error': getattr(exc, 'message', str(exc))},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except ValueError:
            return Response(
                {'error': _('ID de producto fabricado invalido')},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as exc:
            return Response(
                {
                    'error': _(
                        'Error al actualizar producto fabricado: %(error)s'
                    ) % {'error': str(exc)},
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def destroy(self, request: Request, pk: int = None) -> Response:
        try:
            eliminar_producto_fabricado(int(pk))
            return Response(status=status.HTTP_204_NO_CONTENT)
        except ProductoFabricadoNoEncontradoError as exc:
            return Response(
                {'error': exc.message},
                status=status.HTTP_404_NOT_FOUND,
            )
        except ValueError:
            return Response(
                {'error': _('ID de producto fabricado invalido')},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as exc:
            return Response(
                {
                    'error': _(
                        'Error al eliminar producto fabricado: %(error)s'
                    ) % {'error': str(exc)},
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=True, methods=['get'], url_path='costos')
    def costos(self, request: Request, pk: int = None) -> Response:
        try:
            desglose = obtener_desglose_costos_producto(int(pk))
            producto = ProductoFabricadoDetailSerializer(
                desglose['producto'],
                context={'request': request},
            )
            return Response({
                'producto': producto.data,
                'ingredientes': desglose['ingredientes'],
                'costo_produccion': str(desglose['costo_produccion']),
                'costo_unitario': str(desglose['costo_unitario']),
                'margen_utilidad': str(desglose['margen_utilidad']),
                'porcentaje_utilidad': str(desglose['porcentaje_utilidad']),
            })
        except ProductoFabricadoNoEncontradoError as exc:
            return Response(
                {'error': exc.message},
                status=status.HTTP_404_NOT_FOUND,
            )
        except ValueError:
            return Response(
                {'error': _('ID de producto fabricado invalido')},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as exc:
            return Response(
                {'error': _('Error al calcular costos: %(error)s') % {
                    'error': str(exc),
                }},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=True, methods=['post'], url_path='calcular-precio')
    def calcular_precio(self, request: Request, pk: int = None) -> Response:
        try:
            margen_deseado = request.data.get('margen_deseado')
            if margen_deseado is None:
                return Response(
                    {'error': _('El campo margen_deseado es requerido.')},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            precio = sugerir_precio_venta(int(pk), margen_deseado)
            producto = obtener_producto_fabricado(int(pk))
            serializer = ProductoFabricadoDetailSerializer(
                producto,
                context={'request': request},
            )
            return Response({
                'precio_venta_sugerido': str(precio),
                'producto': serializer.data,
            })
        except (
            ProductoFabricadoNoEncontradoError,
            RecetaInvalidaError,
        ) as exc:
            status_code = (
                status.HTTP_404_NOT_FOUND
                if isinstance(exc, ProductoFabricadoNoEncontradoError)
                else status.HTTP_400_BAD_REQUEST
            )
            return Response({'error': exc.message}, status=status_code)
        except ValueError:
            return Response(
                {'error': _('ID de producto fabricado invalido')},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as exc:
            return Response(
                {'error': _('Error al calcular precio: %(error)s') % {
                    'error': str(exc),
                }},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=True, methods=['post'], url_path='producir')
    def producir(self, request: Request, pk: int = None) -> Response:
        try:
            cantidad_lotes = request.data.get('cantidad_lotes')
            if cantidad_lotes is None:
                return Response(
                    {'error': _('El campo cantidad_lotes es requerido.')},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            resultado = producir_lote(int(pk), cantidad_lotes)
            serializer = ProductoFabricadoDetailSerializer(
                resultado['producto'],
                context={'request': request},
            )
            return Response({
                'producto': serializer.data,
                'cantidad_lotes': str(resultado['cantidad_lotes']),
                'cantidad_total_producida': str(
                    resultado['cantidad_total_producida']
                ),
                'ingredientes_consumidos': (
                    resultado['ingredientes_consumidos']
                ),
                'producto_inventario_id': getattr(
                    resultado['producto_inventario'],
                    'id',
                    None,
                ),
            })
        except (
            ProductoFabricadoNoEncontradoError,
            ProduccionNoPermitidaError,
            RecetaInvalidaError,
        ) as exc:
            status_code = (
                status.HTTP_404_NOT_FOUND
                if isinstance(exc, ProductoFabricadoNoEncontradoError)
                else status.HTTP_400_BAD_REQUEST
            )
            return Response({'error': exc.message}, status=status_code)
        except ValueError:
            return Response(
                {'error': _('ID de producto fabricado invalido')},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as exc:
            return Response(
                {'error': _('Error al producir lote: %(error)s') % {
                    'error': str(exc),
                }},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=True, methods=['post'], url_path='convertir-inventario')
    def convertir_inventario(
        self,
        request: Request,
        pk: int = None,
    ) -> Response:
        try:
            producto_inventario = convertir_a_producto_inventario(int(pk))
            producto = obtener_producto_fabricado(int(pk))
            serializer = ProductoFabricadoDetailSerializer(
                producto,
                context={'request': request},
            )
            return Response({
                'producto': serializer.data,
                'producto_inventario': {
                    'id': producto_inventario.id,
                    'nombre': producto_inventario.nombre,
                    'precio_compra': str(producto_inventario.precio_compra),
                    'precio_venta': str(producto_inventario.precio_venta),
                    'existencias': str(producto_inventario.existencias),
                },
            })
        except (
            ProductoFabricadoNoEncontradoError,
            ProduccionNoPermitidaError,
        ) as exc:
            status_code = (
                status.HTTP_404_NOT_FOUND
                if isinstance(exc, ProductoFabricadoNoEncontradoError)
                else status.HTTP_400_BAD_REQUEST
            )
            return Response({'error': exc.message}, status=status_code)
        except ValueError:
            return Response(
                {'error': _('ID de producto fabricado invalido')},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as exc:
            return Response(
                {
                    'error': _(
                        'Error al convertir producto a inventario: %(error)s'
                    ) % {'error': str(exc)},
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=True, methods=['get', 'post'], url_path='receta')
    def receta(self, request: Request, pk: int = None) -> Response:
        if request.method.lower() == 'get':
            return self._listar_receta(request, pk)
        return self._agregar_ingrediente_receta(request, pk)

    @action(
        detail=True,
        methods=['delete'],
        url_path=r'receta/(?P<ingrediente_id>[^/.]+)',
    )
    def eliminar_ingrediente_receta(
        self,
        request: Request,
        pk: int = None,
        ingrediente_id: int = None,
    ) -> Response:
        try:
            eliminar_ingrediente_de_receta(int(pk), int(ingrediente_id))
            return Response(status=status.HTTP_204_NO_CONTENT)
        except (
            ProductoFabricadoNoEncontradoError,
            RecetaInvalidaError,
        ) as exc:
            status_code = (
                status.HTTP_404_NOT_FOUND
                if isinstance(exc, ProductoFabricadoNoEncontradoError)
                else status.HTTP_400_BAD_REQUEST
            )
            return Response({'error': exc.message}, status=status_code)
        except ValueError:
            return Response(
                {'error': _('IDs de producto o ingrediente invalidos')},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as exc:
            return Response(
                {'error': _('Error al eliminar ingrediente de receta: %(error)s') % {
                    'error': str(exc),
                }},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def _listar_receta(self, request: Request, pk: int) -> Response:
        try:
            receta = obtener_receta_producto(int(pk))
            serializer = IngredientesProductoSerializer(
                receta,
                many=True,
                context={'request': request},
            )
            return Response(serializer.data)
        except ProductoFabricadoNoEncontradoError as exc:
            return Response(
                {'error': exc.message},
                status=status.HTTP_404_NOT_FOUND,
            )
        except ValueError:
            return Response(
                {'error': _('ID de producto fabricado invalido')},
                status=status.HTTP_400_BAD_REQUEST,
            )

    def _agregar_ingrediente_receta(
        self,
        request: Request,
        pk: int,
    ) -> Response:
        try:
            serializer = IngredientesProductoSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            receta = agregar_ingrediente_a_receta(
                int(pk),
                serializer.validated_data,
            )
            response_serializer = IngredientesProductoSerializer(
                receta,
                context={'request': request},
            )
            return Response(
                response_serializer.data,
                status=status.HTTP_201_CREATED,
            )
        except (
            ProductoFabricadoNoEncontradoError,
            RecetaInvalidaError,
            ValidationError,
            DRFValidationError,
        ) as exc:
            status_code = (
                status.HTTP_404_NOT_FOUND
                if isinstance(exc, ProductoFabricadoNoEncontradoError)
                else status.HTTP_400_BAD_REQUEST
            )
            return Response(
                {'error': getattr(exc, 'message', str(exc))},
                status=status_code,
            )
        except ValueError:
            return Response(
                {'error': _('ID de producto fabricado invalido')},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as exc:
            return Response(
                {'error': _('Error al agregar ingrediente a receta: %(error)s') % {
                    'error': str(exc),
                }},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
