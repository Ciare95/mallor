from decimal import Decimal
from datetime import date
from rest_framework import viewsets, status, permissions, views
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.request import Request
from rest_framework.pagination import PageNumberPagination
from django.core.exceptions import ValidationError
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from .models import Categoria, Producto, FacturaCompra
from .serializers import (
    CategoriaSerializer,
    ProductoSerializer,
    ProductoListSerializer,
    ProductoCreateSerializer,
    ProductoUpdateSerializer,
    FacturaCompraSerializer,
    FacturaCompraCreateSerializer,
    HistorialInventarioSerializer,
    InventarioExportSerializer,
)
from .services import (
    CategoriaService,
    ProductoService,
    StockService,
    FacturaCompraService,
    ReporteService,
    HistorialService,
)
from core.exceptions import (
    ProductoNoEncontradoError,
    ProductoDuplicadoError,
    ProductoConMovimientosError,
    StockInsuficienteError,
    FacturaNoEncontradaError,
    FacturaYaProcesadaError,
    FacturaSinDetallesError,
    CategoriaNoEncontradaError,
    CategoriaConProductosError,
)
from usuario.utils import RolePermissionMixin
from usuario.services import UsuarioService
from .utils import generar_excel_inventario, generar_respuesta_excel


class InventarioPagination(PageNumberPagination):
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


class BaseInventarioPermission(permissions.BasePermission):
    action_mapping = {}

    def has_permission(self, request: Request, view) -> bool:
        if not request.user or not request.user.is_authenticated:
            return False
        accion = self.action_mapping.get(view.action, view.action)
        return UsuarioService.validar_permisos(request.user, accion)

    def has_object_permission(self, request: Request, view, obj) -> bool:
        return self.has_permission(request, view)


class CategoriaPermission(BaseInventarioPermission):
    action_mapping = {
        'list': 'listar_productos',
        'create': 'crear_producto',
        'retrieve': 'ver_producto',
        'update': 'actualizar_producto',
        'partial_update': 'actualizar_producto',
        'destroy': 'eliminar_producto',
    }


class ProductoPermission(BaseInventarioPermission):
    action_mapping = {
        'list': 'listar_productos',
        'create': 'crear_producto',
        'retrieve': 'ver_producto',
        'update': 'actualizar_producto',
        'partial_update': 'actualizar_producto',
        'destroy': 'eliminar_producto',
        'buscar': 'listar_productos',
        'historial': 'ver_producto',
        'ajustar_stock': 'actualizar_producto',
    }


class FacturaCompraPermission(BaseInventarioPermission):
    action_mapping = {
        'list': 'listar_facturas',
        'create': 'crear_factura',
        'retrieve': 'ver_factura',
        'procesar': 'actualizar_producto',
    }


class ReportesPermission(BaseInventarioPermission):
    action_mapping = {
        'valor_total': 'ver_informe_inventario',
        'bajo_stock': 'ver_informe_inventario',
        'mas_vendidos': 'ver_informe_inventario',
    }


class CategoriaViewSet(RolePermissionMixin, viewsets.ModelViewSet):
    required_roles = None
    permission_classes = [CategoriaPermission]
    pagination_class = InventarioPagination
    serializer_class = CategoriaSerializer

    def list(self, request: Request) -> Response:
        try:
            filtros = {}
            q = request.query_params.get('q')
            if q:
                filtros['q'] = q
            categorias = CategoriaService.listar_categorias(filtros)
            page = self.paginate_queryset(categorias)
            if page is not None:
                serializer = self.get_serializer(page, many=True)
                return self.get_paginated_response(serializer.data)
            serializer = self.get_serializer(categorias, many=True)
            return Response(serializer.data)
        except Exception as e:
            return Response(
                {'error': _('Error al listar categorías: %(error)s') % {'error': str(e)}},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def create(self, request: Request) -> Response:
        try:
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            categoria = CategoriaService.crear_categoria(serializer.validated_data)
            response_serializer = self.get_serializer(categoria)
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)
        except ProductoDuplicadoError as e:
            return Response({'error': e.message}, status=status.HTTP_400_BAD_REQUEST)
        except ValidationError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response(
                {'error': _('Error al crear categoría: %(error)s') % {'error': str(e)}},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def retrieve(self, request: Request, pk: int = None) -> Response:
        try:
            categoria = CategoriaService.obtener_categoria(int(pk))
            serializer = self.get_serializer(categoria)
            return Response(serializer.data)
        except CategoriaNoEncontradaError as e:
            return Response({'error': e.message}, status=status.HTTP_404_NOT_FOUND)
        except ValueError:
            return Response({'error': _('ID de categoría inválido')}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response(
                {'error': _('Error al obtener categoría: %(error)s') % {'error': str(e)}},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def update(self, request: Request, pk: int = None) -> Response:
        return self._actualizar_categoria(request, pk, partial=False)

    def partial_update(self, request: Request, pk: int = None) -> Response:
        return self._actualizar_categoria(request, pk, partial=True)

    def _actualizar_categoria(self, request: Request, pk: int, partial: bool) -> Response:
        try:
            categoria = CategoriaService.obtener_categoria(int(pk))
            serializer = self.get_serializer(categoria, data=request.data, partial=partial)
            serializer.is_valid(raise_exception=True)
            categoria_actualizada = CategoriaService.actualizar_categoria(
                int(pk), serializer.validated_data
            )
            response_serializer = self.get_serializer(categoria_actualizada)
            return Response(response_serializer.data)
        except CategoriaNoEncontradaError as e:
            return Response({'error': e.message}, status=status.HTTP_404_NOT_FOUND)
        except ProductoDuplicadoError as e:
            return Response({'error': e.message}, status=status.HTTP_400_BAD_REQUEST)
        except ValidationError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except ValueError:
            return Response({'error': _('ID de categoría inválido')}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response(
                {'error': _('Error al actualizar categoría: %(error)s') % {'error': str(e)}},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def destroy(self, request: Request, pk: int = None) -> Response:
        try:
            CategoriaService.eliminar_categoria(int(pk))
            return Response(status=status.HTTP_204_NO_CONTENT)
        except CategoriaNoEncontradaError as e:
            return Response({'error': e.message}, status=status.HTTP_404_NOT_FOUND)
        except CategoriaConProductosError as e:
            return Response({'error': e.message}, status=status.HTTP_400_BAD_REQUEST)
        except ValueError:
            return Response({'error': _('ID de categoría inválido')}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response(
                {'error': _('Error al eliminar categoría: %(error)s') % {'error': str(e)}},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ProductoViewSet(RolePermissionMixin, viewsets.ModelViewSet):
    required_roles = None
    permission_classes = [ProductoPermission]
    pagination_class = InventarioPagination
    serializer_classes = {
        'list': ProductoListSerializer,
        'retrieve': ProductoSerializer,
        'create': ProductoCreateSerializer,
        'update': ProductoUpdateSerializer,
        'partial_update': ProductoUpdateSerializer,
        'buscar': ProductoListSerializer,
        'historial': HistorialInventarioSerializer,
    }

    def get_serializer_class(self):
        return self.serializer_classes.get(self.action, ProductoSerializer)

    def get_serializer(self, *args, **kwargs):
        serializer_class = self.get_serializer_class()
        kwargs.setdefault('context', {'request': self.request})
        return serializer_class(*args, **kwargs)

    def list(self, request: Request) -> Response:
        try:
            filtros = {}
            for param in ['q', 'categoria_id', 'marca', 'fecha_caducidad_desde',
                          'fecha_caducidad_hasta', 'stock_min', 'stock_max', 'ordering']:
                val = request.query_params.get(param)
                if val is not None:
                    filtros[param] = val
            if 'categoria_id' in filtros:
                try:
                    filtros['categoria_id'] = int(filtros['categoria_id'])
                except ValueError:
                    pass
            if 'stock_min' in filtros:
                try:
                    filtros['stock_min'] = int(filtros['stock_min'])
                except ValueError:
                    pass
            if 'stock_max' in filtros:
                try:
                    filtros['stock_max'] = int(filtros['stock_max'])
                except ValueError:
                    pass
            productos = ProductoService.listar_productos(filtros)
            page = self.paginate_queryset(productos)
            if page is not None:
                serializer = self.get_serializer(page, many=True)
                return self.get_paginated_response(serializer.data)
            serializer = self.get_serializer(productos, many=True)
            return Response(serializer.data)
        except Exception as e:
            return Response(
                {'error': _('Error al listar productos: %(error)s') % {'error': str(e)}},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def create(self, request: Request) -> Response:
        try:
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            usuario = request.user if request.user.is_authenticated else None
            producto = ProductoService.crear_producto(
                serializer.validated_data, usuario=usuario
            )
            response_serializer = ProductoSerializer(producto, context={'request': request})
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)
        except ProductoDuplicadoError as e:
            return Response({'error': e.message}, status=status.HTTP_400_BAD_REQUEST)
        except ValidationError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response(
                {'error': _('Error al crear producto: %(error)s') % {'error': str(e)}},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def retrieve(self, request: Request, pk: int = None) -> Response:
        try:
            producto = ProductoService.obtener_producto(int(pk))
            serializer = self.get_serializer(producto)
            return Response(serializer.data)
        except ProductoNoEncontradoError as e:
            return Response({'error': e.message}, status=status.HTTP_404_NOT_FOUND)
        except ValueError:
            return Response({'error': _('ID de producto inválido')}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response(
                {'error': _('Error al obtener producto: %(error)s') % {'error': str(e)}},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def update(self, request: Request, pk: int = None) -> Response:
        return self._actualizar_producto(request, pk, partial=False)

    def partial_update(self, request: Request, pk: int = None) -> Response:
        return self._actualizar_producto(request, pk, partial=True)

    def _actualizar_producto(self, request: Request, pk: int, partial: bool) -> Response:
        try:
            producto = ProductoService.obtener_producto(int(pk))
            serializer = self.get_serializer(producto, data=request.data, partial=partial)
            serializer.is_valid(raise_exception=True)
            producto_actualizado = ProductoService.actualizar_producto(
                int(pk), serializer.validated_data
            )
            response_serializer = ProductoSerializer(producto_actualizado, context={'request': request})
            return Response(response_serializer.data)
        except ProductoNoEncontradoError as e:
            return Response({'error': e.message}, status=status.HTTP_404_NOT_FOUND)
        except ProductoDuplicadoError as e:
            return Response({'error': e.message}, status=status.HTTP_400_BAD_REQUEST)
        except ValidationError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except ValueError:
            return Response({'error': _('ID de producto inválido')}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response(
                {'error': _('Error al actualizar producto: %(error)s') % {'error': str(e)}},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def destroy(self, request: Request, pk: int = None) -> Response:
        try:
            ProductoService.eliminar_producto(int(pk))
            return Response(status=status.HTTP_204_NO_CONTENT)
        except ProductoNoEncontradoError as e:
            return Response({'error': e.message}, status=status.HTTP_404_NOT_FOUND)
        except ProductoConMovimientosError as e:
            return Response({'error': e.message}, status=status.HTTP_400_BAD_REQUEST)
        except ValueError:
            return Response({'error': _('ID de producto inválido')}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response(
                {'error': _('Error al eliminar producto: %(error)s') % {'error': str(e)}},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'], url_path='buscar')
    def buscar(self, request: Request) -> Response:
        try:
            query = request.query_params.get('q', '')
            productos = ProductoService.buscar_producto(query)
            serializer = self.get_serializer(productos, many=True)
            return Response(serializer.data)
        except Exception as e:
            return Response(
                {'error': _('Error al buscar productos: %(error)s') % {'error': str(e)}},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['get'], url_path='historial')
    def historial(self, request: Request, pk: int = None) -> Response:
        try:
            filtros = {}
            for param in ['tipo_movimiento', 'fecha_desde', 'fecha_hasta']:
                val = request.query_params.get(param)
                if val is not None:
                    filtros[param] = val
            limite = request.query_params.get('limite')
            if limite:
                try:
                    filtros['limite'] = int(limite)
                except ValueError:
                    pass
            movimientos = HistorialService.obtener_historial_producto(
                int(pk), filtros
            )
            serializer = HistorialInventarioSerializer(movimientos, many=True)
            return Response(serializer.data)
        except ProductoNoEncontradoError as e:
            return Response({'error': e.message}, status=status.HTTP_404_NOT_FOUND)
        except ValueError:
            return Response({'error': _('ID de producto inválido')}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response(
                {'error': _('Error al obtener historial: %(error)s') % {'error': str(e)}},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'], url_path='ajustar-stock')
    def ajustar_stock(self, request: Request, pk: int = None) -> Response:
        try:
            nueva_cantidad = request.data.get('nueva_cantidad')
            motivo = request.data.get('motivo')
            observaciones = request.data.get('observaciones', '')
            if nueva_cantidad is None:
                return Response(
                    {'error': _('El campo nueva_cantidad es requerido')},
                    status=status.HTTP_400_BAD_REQUEST
                )
            if not motivo:
                return Response(
                    {'error': _('El campo motivo es requerido')},
                    status=status.HTTP_400_BAD_REQUEST
                )
            usuario = request.user if request.user.is_authenticated else None
            if not usuario:
                return Response(
                    {'error': _('Usuario no autenticado')},
                    status=status.HTTP_401_UNAUTHORIZED
                )
            try:
                nueva_cantidad_dec = Decimal(str(nueva_cantidad))
            except (ValueError, TypeError):
                return Response(
                    {'error': _('nueva_cantidad debe ser un número válido')},
                    status=status.HTTP_400_BAD_REQUEST
                )
            historial = StockService.ajustar_inventario(
                producto_id=int(pk),
                nueva_cantidad=nueva_cantidad_dec,
                motivo=motivo,
                usuario=usuario,
                observaciones=observaciones,
            )
            serializer = HistorialInventarioSerializer(historial)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except ProductoNoEncontradoError as e:
            return Response({'error': e.message}, status=status.HTTP_404_NOT_FOUND)
        except ValueError:
            return Response({'error': _('ID de producto inválido')}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response(
                {'error': _('Error al ajustar stock: %(error)s') % {'error': str(e)}},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class FacturaCompraViewSet(RolePermissionMixin, viewsets.ViewSet):
    required_roles = None
    permission_classes = [FacturaCompraPermission]

    def list(self, request: Request) -> Response:
        try:
            filtros = {}
            for param in ['proveedor_id', 'estado', 'fecha_desde', 'fecha_hasta', 'q']:
                val = request.query_params.get(param)
                if val is not None:
                    filtros[param] = val
            if 'proveedor_id' in filtros:
                try:
                    filtros['proveedor_id'] = int(filtros['proveedor_id'])
                except ValueError:
                    pass
            facturas = FacturaCompraService.listar_facturas(filtros)
            serializer = FacturaCompraSerializer(facturas, many=True)
            return Response(serializer.data)
        except Exception as e:
            return Response(
                {'error': _('Error al listar facturas: %(error)s') % {'error': str(e)}},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def create(self, request: Request) -> Response:
        try:
            serializer = FacturaCompraCreateSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            factura = FacturaCompraService.registrar_factura_compra(
                serializer.validated_data
            )
            response_serializer = FacturaCompraSerializer(factura)
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)
        except (FacturaSinDetallesError, ValidationError) as e:
            status_code = status.HTTP_400_BAD_REQUEST
            error_msg = e.message if hasattr(e, 'message') else str(e)
            return Response({'error': error_msg}, status=status_code)
        except ProductoNoEncontradoError as e:
            return Response({'error': e.message}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response(
                {'error': _('Error al crear factura: %(error)s') % {'error': str(e)}},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def retrieve(self, request: Request, pk: int = None) -> Response:
        try:
            factura = FacturaCompraService.obtener_factura(int(pk))
            serializer = FacturaCompraSerializer(factura)
            return Response(serializer.data)
        except FacturaNoEncontradaError as e:
            return Response({'error': e.message}, status=status.HTTP_404_NOT_FOUND)
        except ValueError:
            return Response({'error': _('ID de factura inválido')}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response(
                {'error': _('Error al obtener factura: %(error)s') % {'error': str(e)}},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'], url_path='procesar')
    def procesar(self, request: Request, pk: int = None) -> Response:
        try:
            usuario = request.user if request.user.is_authenticated else None
            if not usuario:
                return Response(
                    {'error': _('Usuario no autenticado')},
                    status=status.HTTP_401_UNAUTHORIZED
                )
            factura = FacturaCompraService.procesar_factura(
                factura_id=int(pk), usuario=usuario
            )
            serializer = FacturaCompraSerializer(factura)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except FacturaNoEncontradaError as e:
            return Response({'error': e.message}, status=status.HTTP_404_NOT_FOUND)
        except (FacturaYaProcesadaError, FacturaSinDetallesError, StockInsuficienteError) as e:
            return Response({'error': e.message}, status=status.HTTP_400_BAD_REQUEST)
        except ValueError:
            return Response({'error': _('ID de factura inválido')}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response(
                {'error': _('Error al procesar factura: %(error)s') % {'error': str(e)}},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ReportesViewSet(RolePermissionMixin, viewsets.ViewSet):
    required_roles = None
    permission_classes = [ReportesPermission]

    @action(detail=False, methods=['get'], url_path='valor-total')
    def valor_total(self, request: Request) -> Response:
        try:
            reporte = ReporteService.calcular_valor_total_inventario()
            return Response(reporte)
        except Exception as e:
            return Response(
                {'error': _('Error al calcular valor total: %(error)s') % {'error': str(e)}},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'], url_path='bajo-stock')
    def bajo_stock(self, request: Request) -> Response:
        try:
            minimo = request.query_params.get('minimo', '10')
            try:
                minimo_dec = Decimal(str(minimo))
            except (ValueError, TypeError):
                minimo_dec = Decimal('10')
            productos = ReporteService.productos_bajo_stock(minimo_dec)
            serializer = ProductoListSerializer(productos, many=True)
            return Response(serializer.data)
        except Exception as e:
            return Response(
                {'error': _('Error al obtener productos bajo stock: %(error)s') % {'error': str(e)}},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'], url_path='mas-vendidos')
    def mas_vendidos(self, request: Request) -> Response:
        try:
            fecha_inicio = request.query_params.get('fecha_inicio')
            fecha_fin = request.query_params.get('fecha_fin')
            limite = request.query_params.get('limite', '10')
            fecha_inicio_date = None
            fecha_fin_date = None
            if fecha_inicio:
                try:
                    fecha_inicio_date = date.fromisoformat(fecha_inicio)
                except ValueError:
                    pass
            if fecha_fin:
                try:
                    fecha_fin_date = date.fromisoformat(fecha_fin)
                except ValueError:
                    pass
            try:
                limite_int = int(limite)
            except (ValueError, TypeError):
                limite_int = 10
            resultados = ReporteService.productos_mas_vendidos(
                fecha_inicio=fecha_inicio_date,
                fecha_fin=fecha_fin_date,
                limite=limite_int,
            )
            return Response(resultados)
        except Exception as e:
            return Response(
                {'error': _('Error al obtener productos más vendidos: %(error)s') % {'error': str(e)}},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ExportarInventarioView(RolePermissionMixin, views.APIView):
    required_roles = ['ADMIN']

    def get(self, request: Request) -> Response:
        try:
            output = generar_excel_inventario()
            filename = (
                f"inventario_{timezone.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
            )
            return generar_respuesta_excel(output, filename)
        except Exception as e:
            return Response(
                {'error': _('Error al exportar inventario: %(error)s') % {
                    'error': str(e)
                }},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
