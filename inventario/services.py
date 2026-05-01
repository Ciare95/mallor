from typing import List, Dict, Optional, Any
from decimal import Decimal
from datetime import date, datetime
from django.db import transaction
from django.db.models import Q, Sum, F, DecimalField
from django.utils.translation import gettext_lazy as _

from core.exceptions import (
    InventarioError,
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

from .models import (
    Categoria,
    Producto,
    FacturaCompra,
    DetalleFacturaCompra,
    HistorialInventario,
)
from proveedor.models import Proveedor
from usuario.models import Usuario

DEFAULT_SALE_PRICING_RULES = {
    'umbral': Decimal('1000'),
    'margen_menor_igual': Decimal('119'),
    'margen_mayor': Decimal('69'),
}


def normalize_sale_pricing_rules(
    pricing_rules: Optional[Dict[str, Any]] = None
) -> Dict[str, Decimal]:
    rule = pricing_rules or {}

    def parse_decimal(key: str, default: Decimal) -> Decimal:
        value = rule.get(key, default)
        try:
            return Decimal(str(value))
        except (ValueError, TypeError, ArithmeticError):
            return default

    return {
        'umbral': parse_decimal(
            'umbral',
            DEFAULT_SALE_PRICING_RULES['umbral'],
        ),
        'margen_menor_igual': parse_decimal(
            'margen_menor_igual',
            DEFAULT_SALE_PRICING_RULES['margen_menor_igual'],
        ),
        'margen_mayor': parse_decimal(
            'margen_mayor',
            DEFAULT_SALE_PRICING_RULES['margen_mayor'],
        ),
    }


def calculate_suggested_sale_price(
    base_price: Decimal,
    pricing_rules: Optional[Dict[str, Any]] = None,
) -> Decimal:
    q = Decimal('0.01')
    if base_price <= 0:
        return Decimal('0.00')

    rule = normalize_sale_pricing_rules(pricing_rules)
    markup = (
        rule['margen_menor_igual']
        if base_price <= rule['umbral']
        else rule['margen_mayor']
    )
    return (
        base_price * (Decimal('1') + (markup / Decimal('100')))
    ).quantize(q)


class CategoriaService:
    """
    Servicio para gestionar la lógica de negocio de categorías.
    """

    @staticmethod
    def crear_categoria(data: Dict[str, Any]) -> Categoria:
        nombre = data.get('nombre', '').strip().upper()
        if Categoria.objects.filter(nombre__iexact=nombre).exists():
            raise ProductoDuplicadoError('nombre', nombre)
        return Categoria.objects.create(
            nombre=nombre,
            descripcion=data.get('descripcion', ''),
        )

    @staticmethod
    def obtener_categoria(categoria_id: int) -> Categoria:
        try:
            return Categoria.objects.get(id=categoria_id)
        except Categoria.DoesNotExist:
            raise CategoriaNoEncontradaError(categoria_id)

    @staticmethod
    def listar_categorias(filtros: Optional[Dict[str, Any]] = None) -> List[Categoria]:
        queryset = Categoria.objects.all()
        if filtros:
            q_objects = Q()
            if filtros.get('q'):
                q_objects &= Q(nombre__icontains=filtros['q'])
            if q_objects:
                queryset = queryset.filter(q_objects)
        return list(queryset.order_by('nombre'))

    @staticmethod
    @transaction.atomic
    def actualizar_categoria(categoria_id: int, data: Dict[str, Any]) -> Categoria:
        categoria = CategoriaService.obtener_categoria(categoria_id)
        nombre = data.get('nombre')
        if nombre:
            nombre = nombre.strip().upper()
            if Categoria.objects.filter(nombre__iexact=nombre).exclude(id=categoria_id).exists():
                raise ProductoDuplicadoError('nombre', nombre)
            categoria.nombre = nombre
        if 'descripcion' in data:
            categoria.descripcion = data['descripcion']
        categoria.save()
        return categoria

    @staticmethod
    @transaction.atomic
    def eliminar_categoria(categoria_id: int) -> None:
        categoria = CategoriaService.obtener_categoria(categoria_id)
        if categoria.producto_set.exists():
            raise CategoriaConProductosError(categoria.nombre)
        categoria.delete()


class ProductoService:
    """
    Servicio para gestionar la lógica de negocio de productos.

    Encapsula todas las reglas de negocio relacionadas con la creación,
    actualización, eliminación y consulta de productos del inventario.
    Sigue el principio de Single Responsibility (SOLID).
    """

    @staticmethod
    @transaction.atomic
    def crear_producto(
        data: Dict[str, Any],
        usuario: Optional[Usuario] = None
    ) -> Producto:
        """
        Crea un nuevo producto con validaciones de negocio.

        Args:
            data: Datos del producto a crear
            usuario: Usuario que realiza la creación (opcional)

        Returns:
            Producto: Instancia del producto creado

        Raises:
            ProductoDuplicadoError: Si el código interno o de barras ya existe
        """
        codigo_interno = data.get('codigo_interno')
        codigo_barras = data.get('codigo_barras', '')

        if codigo_interno is not None:
            if Producto.objects.filter(codigo_interno=codigo_interno).exists():
                raise ProductoDuplicadoError(
                    'código interno', codigo_interno
                )

        if codigo_barras:
            codigo_barras = codigo_barras.strip()
            data['codigo_barras'] = codigo_barras
            if Producto.objects.filter(codigo_barras=codigo_barras).exists():
                raise ProductoDuplicadoError(
                    'código de barras', codigo_barras
                )

        producto = Producto.objects.create(**data)
        return producto

    @staticmethod
    def obtener_producto(producto_id: int) -> Producto:
        """
        Obtiene un producto por su ID incluyendo relaciones.

        Args:
            producto_id: ID del producto

        Returns:
            Producto: Instancia del producto con relaciones precargadas

        Raises:
            ProductoNoEncontradoError: Si el producto no existe
        """
        try:
            return Producto.objects.select_related(
                'categoria'
            ).get(id=producto_id)
        except Producto.DoesNotExist:
            raise ProductoNoEncontradoError(producto_id)

    @staticmethod
    def listar_productos(
        filtros: Optional[Dict[str, Any]] = None
    ) -> List[Producto]:
        """
        Lista productos aplicando filtros opcionales.

        Args:
            filtros: Diccionario con filtros (categoria, marca,
                     q, fecha_caducidad_desde, fecha_caducidad_hasta,
                     stock_min, stock_max, ordering)

        Returns:
            List[Producto]: Lista de productos filtrados
        """
        queryset = Producto.objects.select_related('categoria').all()

        if not filtros:
            return list(queryset.order_by('nombre'))

        q_objects = Q()

        if filtros.get('q'):
            q = filtros['q']
            q_objects &= (
                Q(nombre__icontains=q) |
                Q(codigo_barras__icontains=q) |
                Q(marca__icontains=q) |
                Q(invima__icontains=q)
            )
            try:
                codigo_int = int(q)
                q_objects |= Q(codigo_interno=codigo_int)
            except ValueError:
                pass

        if filtros.get('categoria_id'):
            q_objects &= Q(categoria_id=filtros['categoria_id'])

        if filtros.get('marca'):
            q_objects &= Q(marca__icontains=filtros['marca'])

        if filtros.get('fecha_caducidad_desde'):
            q_objects &= Q(
                fecha_caducidad__gte=filtros['fecha_caducidad_desde']
            )

        if filtros.get('fecha_caducidad_hasta'):
            q_objects &= Q(
                fecha_caducidad__lte=filtros['fecha_caducidad_hasta']
            )

        if filtros.get('stock_min') is not None:
            q_objects &= Q(existencias__gte=filtros['stock_min'])

        if filtros.get('stock_max') is not None:
            q_objects &= Q(existencias__lte=filtros['stock_max'])

        if q_objects:
            queryset = queryset.filter(q_objects)

        ordering = filtros.get('ordering', 'nombre')
        ordenes_permitidos = [
            'nombre', '-nombre', 'codigo_interno', '-codigo_interno',
            'precio_compra', '-precio_compra', 'precio_venta', '-precio_venta',
            'existencias', '-existencias', 'created_at', '-created_at',
        ]
        if ordering in ordenes_permitidos:
            queryset = queryset.order_by(ordering)
        else:
            queryset = queryset.order_by('nombre')

        return list(queryset)

    @staticmethod
    @transaction.atomic
    def actualizar_producto(
        producto_id: int,
        data: Dict[str, Any]
    ) -> Producto:
        """
        Actualiza un producto existente.

        Args:
            producto_id: ID del producto a actualizar
            data: Datos a actualizar

        Returns:
            Producto: Instancia del producto actualizado

        Raises:
            ProductoNoEncontradoError: Si el producto no existe
            ProductoDuplicadoError: Si el código de barras ya está en uso
        """
        producto = ProductoService.obtener_producto(producto_id)

        codigo_barras = data.get('codigo_barras')
        if codigo_barras:
            codigo_barras = codigo_barras.strip()
            data['codigo_barras'] = codigo_barras
            if Producto.objects.filter(
                codigo_barras=codigo_barras
            ).exclude(id=producto_id).exists():
                raise ProductoDuplicadoError(
                    'código de barras', codigo_barras
                )

        codigo_interno = data.get('codigo_interno')
        if codigo_interno is not None:
            if Producto.objects.filter(
                codigo_interno=codigo_interno
            ).exclude(id=producto_id).exists():
                raise ProductoDuplicadoError(
                    'código interno', codigo_interno
                )

        for campo, valor in data.items():
            if hasattr(producto, campo):
                setattr(producto, campo, valor)

        producto.save()
        return producto

    @staticmethod
    @transaction.atomic
    def eliminar_producto(producto_id: int) -> None:
        """
        Elimina un producto (solo si no tiene movimientos registrados).

        Args:
            producto_id: ID del producto a eliminar

        Raises:
            ProductoNoEncontradoError: Si el producto no existe
            ProductoConMovimientosError: Si el producto tiene movimientos
        """
        producto = ProductoService.obtener_producto(producto_id)

        if producto.historial.exists():
            raise ProductoConMovimientosError(producto_id)

        producto.delete()

    @staticmethod
    def buscar_producto(query: str) -> List[Producto]:
        """
        Búsqueda avanzada de productos por múltiples criterios.

        Args:
            query: Término de búsqueda

        Returns:
            List[Producto]: Lista de productos que coinciden
        """
        if not query or not query.strip():
            return list(
                Producto.objects.select_related('categoria').all()[:50]
            )

        q = query.strip()
        q_objects = (
            Q(nombre__icontains=q) |
            Q(codigo_barras__icontains=q) |
            Q(marca__icontains=q) |
            Q(invima__icontains=q) |
            Q(descripcion__icontains=q)
        )

        try:
            codigo_int = int(q)
            q_objects |= Q(codigo_interno=codigo_int)
        except ValueError:
            pass

        return list(
            Producto.objects.select_related('categoria')
            .filter(q_objects)
            .order_by('nombre')[:50]
        )


class StockService:
    """
    Servicio para gestionar la lógica de negocio de stock e inventario.

    Responsable de actualizar existencias, validar disponibilidad
    y registrar movimientos en el historial de inventario.
    """

    @staticmethod
    @transaction.atomic
    def actualizar_stock(
        producto_id: int,
        cantidad: Decimal,
        tipo: str,
        motivo: str,
        usuario: Usuario,
        precio_unitario: Optional[Decimal] = None,
        factura: Optional[FacturaCompra] = None,
        venta=None,
        observaciones: str = '',
    ) -> HistorialInventario:
        """
        Actualiza el stock de un producto y registra el movimiento.

        Args:
            producto_id: ID del producto
            cantidad: Cantidad (positiva para entrada, negativa para salida)
            tipo: Tipo de movimiento (ENTRADA, SALIDA, AJUSTE)
            motivo: Motivo del movimiento
            usuario: Usuario que realiza el movimiento
            precio_unitario: Precio unitario al momento del movimiento
            factura: Factura de compra asociada (opcional)
            venta: Venta asociada (opcional)
            observaciones: Observaciones adicionales (opcional)

        Returns:
            HistorialInventario: Registro del movimiento creado

        Raises:
            ProductoNoEncontradoError: Si el producto no existe
            StockInsuficienteError: Si no hay stock suficiente para salida
        """
        producto = ProductoService.obtener_producto(producto_id)

        if tipo == HistorialInventario.TIPO_SALIDA and cantidad > 0:
            cantidad = -cantidad

        if cantidad < 0:
            try:
                producto.actualizar_stock(cantidad)
            except ValueError:
                raise StockInsuficienteError(
                    producto.nombre,
                    producto.existencias,
                    -cantidad,
                )
        else:
            producto.actualizar_stock(cantidad)

        if precio_unitario is None:
            precio_unitario = producto.precio_compra

        historial = HistorialInventario.objects.create(
            producto=producto,
            tipo_movimiento=tipo,
            cantidad=cantidad,
            precio_unitario=precio_unitario,
            factura=factura,
            venta=venta,
            motivo=motivo,
            usuario=usuario,
            observaciones=observaciones,
        )

        return historial

    @staticmethod
    def validar_disponibilidad(
        producto_id: int,
        cantidad: Decimal
    ) -> bool:
        """
        Verifica si hay suficiente stock disponible.

        Args:
            producto_id: ID del producto
            cantidad: Cantidad requerida (positiva)

        Returns:
            bool: True si hay suficiente stock

        Raises:
            ProductoNoEncontradoError: Si el producto no existe
            StockInsuficienteError: Si no hay stock suficiente
        """
        producto = ProductoService.obtener_producto(producto_id)

        if not producto.validar_stock(cantidad):
            raise StockInsuficienteError(
                producto.nombre,
                producto.existencias,
                cantidad,
            )

        return True

    @staticmethod
    @transaction.atomic
    def ajustar_inventario(
        producto_id: int,
        nueva_cantidad: Decimal,
        motivo: str,
        usuario: Usuario,
        observaciones: str = '',
    ) -> HistorialInventario:
        """
        Realiza un ajuste manual de inventario.

        Establece las existencias a un valor específico y registra
        la diferencia como un movimiento de tipo AJUSTE.

        Args:
            producto_id: ID del producto
            nueva_cantidad: Nueva cantidad de existencias
            motivo: Motivo del ajuste
            usuario: Usuario que realiza el ajuste
            observaciones: Observaciones adicionales (opcional)

        Returns:
            HistorialInventario: Registro del ajuste creado
        """
        producto = ProductoService.obtener_producto(producto_id)
        diferencia = nueva_cantidad - producto.existencias

        historial = HistorialInventario.objects.create(
            producto=producto,
            tipo_movimiento=HistorialInventario.TIPO_AJUSTE,
            cantidad=diferencia,
            precio_unitario=producto.precio_compra,
            motivo=motivo,
            usuario=usuario,
            observaciones=observaciones,
        )

        producto.existencias = nueva_cantidad
        producto.save(update_fields=['existencias', 'updated_at'])

        return historial


class FacturaCompraService:
    """
    Servicio para gestionar la lógica de negocio de facturas de compra.

    Maneja el registro, procesamiento y consulta de facturas,
    incluyendo la actualización automática de inventario.
    """

    @staticmethod
    @transaction.atomic
    def registrar_factura_compra(data: Dict[str, Any]) -> FacturaCompra:
        """
        Registra una nueva factura de compra con sus detalles.

        Crea la factura y sus detalles, luego calcula los totales.
        NO actualiza el inventario automáticamente (usar procesar_factura).
        Si no se proporciona proveedor, se asigna uno genérico por defecto.

        Args:
            data: Datos de la factura incluyendo 'detalles'

        Returns:
            FacturaCompra: Instancia de la factura creada

        Raises:
            FacturaSinDetallesError: Si no se incluyen detalles
            ProductoNoEncontradoError: Si un producto no existe
        """
        detalles_data = data.pop('detalles', [])

        if not detalles_data:
            raise FacturaSinDetallesError(0)

        if 'proveedor' not in data or data['proveedor'] is None:
            proveedor_default, _ = Proveedor.objects.get_or_create(
                numero_documento='0000000000',
                defaults={
                    'razon_social': 'PROVEEDOR GENERAL',
                    'nombre_contacto': 'SIN CONTACTO',
                    'email': 'proveedor@default.com',
                    'telefono': '0000000000',
                    'direccion': 'SIN DIRECCION',
                    'ciudad': 'SIN CIUDAD',
                    'departamento': 'SIN DEPARTAMENTO',
                    'tipo_productos': 'GENERAL',
                }
            )
            data['proveedor'] = proveedor_default

        factura = FacturaCompra.objects.create(**data)

        for detalle_data in detalles_data:
            DetalleFacturaCompra.objects.create(
                factura=factura,
                **detalle_data
            )

        factura.calcular_totales()
        factura.save(update_fields=['subtotal', 'iva', 'total', 'updated_at'])

        return FacturaCompra.objects.prefetch_related(
            'detalles__producto__categoria'
        ).select_related(
            'proveedor', 'usuario_registro'
        ).get(id=factura.id)

    @staticmethod
    @transaction.atomic
    def procesar_factura(
        factura_id: int,
        usuario: Usuario,
        pricing_rules: Optional[Dict[str, Any]] = None,
    ) -> FacturaCompra:
        """
        Procesa una factura de compra y actualiza el inventario.

        Por cada detalle de la factura, crea un movimiento de entrada
        en el historial y actualiza el stock del producto.
        La factura pasa a estado PROCESADA.

        Args:
            factura_id: ID de la factura a procesar
            usuario: Usuario que procesa la factura

        Returns:
            FacturaCompra: Factura procesada

        Raises:
            FacturaNoEncontradaError: Si la factura no existe
            FacturaYaProcesadaError: Si la factura ya fue procesada
            FacturaSinDetallesError: Si la factura no tiene detalles
        """
        try:
            factura = FacturaCompra.objects.prefetch_related(
                'detalles__producto'
            ).get(id=factura_id)
        except FacturaCompra.DoesNotExist:
            raise FacturaNoEncontradaError(factura_id)

        if factura.estado == FacturaCompra.ESTADO_PROCESADA:
            raise FacturaYaProcesadaError(factura_id)

        detalles = factura.detalles.all()
        if not detalles:
            raise FacturaSinDetallesError(factura_id)

        for detalle in detalles:
            StockService.actualizar_stock(
                producto_id=detalle.producto_id,
                cantidad=detalle.cantidad,
                tipo=HistorialInventario.TIPO_ENTRADA,
                motivo=_("Entrada por factura de compra: %(num)s") % {
                    'num': factura.numero_factura
                },
                usuario=usuario,
                precio_unitario=detalle.precio_unitario,
                factura=factura,
                observaciones=_(
                    "Procesamiento automático de factura. "
                    "Producto: %(producto)s, Cantidad: %(cantidad)s, "
                    "Precio: %(precio)s"
                ) % {
                    'producto': detalle.producto.nombre,
                    'cantidad': detalle.cantidad,
                    'precio': detalle.precio_unitario,
                },
            )

            producto = detalle.producto
            if detalle.precio_unitario > 0:
                q = Decimal('0.01')
                iva_decimal = detalle.iva / Decimal('100')
                costo_final = (
                    detalle.precio_unitario * (Decimal('1') + iva_decimal)
                ).quantize(q)
                producto.precio_compra = detalle.precio_unitario.quantize(q)
                if detalle.precio_venta_sugerido:
                    producto.precio_venta = (
                        detalle.precio_venta_sugerido
                    ).quantize(q)
                else:
                    producto.precio_venta = calculate_suggested_sale_price(
                        costo_final,
                        pricing_rules=pricing_rules,
                    )
                producto.iva = detalle.iva
                producto.save(update_fields=[
                    'precio_compra', 'precio_venta', 'iva', 'updated_at'
                ])

        factura.marcar_como_procesada()

        return FacturaCompra.objects.prefetch_related(
            'detalles__producto__categoria',
            'movimientos_inventario',
        ).select_related(
            'proveedor', 'usuario_registro'
        ).get(id=factura.id)

    @staticmethod
    def obtener_factura(factura_id: int) -> FacturaCompra:
        """
        Obtiene una factura de compra con todos sus detalles.

        Args:
            factura_id: ID de la factura

        Returns:
            FacturaCompra: Factura con relaciones precargadas

        Raises:
            FacturaNoEncontradaError: Si la factura no existe
        """
        try:
            return FacturaCompra.objects.prefetch_related(
                'detalles__producto__categoria',
                'movimientos_inventario',
            ).select_related(
                'proveedor', 'usuario_registro'
            ).get(id=factura_id)
        except FacturaCompra.DoesNotExist:
            raise FacturaNoEncontradaError(factura_id)

    @staticmethod
    def listar_facturas(
        filtros: Optional[Dict[str, Any]] = None
    ) -> List[FacturaCompra]:
        """
        Lista facturas de compra con filtros opcionales.

        Args:
            filtros: Diccionario con filtros (proveedor_id, estado,
                     fecha_desde, fecha_hasta, q)

        Returns:
            List[FacturaCompra]: Lista de facturas filtradas
        """
        queryset = FacturaCompra.objects.select_related(
            'proveedor', 'usuario_registro'
        ).prefetch_related('detalles')

        if not filtros:
            return list(queryset.order_by('-fecha_registro'))

        q_objects = Q()

        if filtros.get('proveedor_id'):
            q_objects &= Q(proveedor_id=filtros['proveedor_id'])

        if filtros.get('estado'):
            q_objects &= Q(estado=filtros['estado'])

        if filtros.get('fecha_desde'):
            q_objects &= Q(fecha_factura__gte=filtros['fecha_desde'])

        if filtros.get('fecha_hasta'):
            q_objects &= Q(fecha_factura__lte=filtros['fecha_hasta'])

        if filtros.get('q'):
            q = filtros['q']
            q_objects &= (
                Q(numero_factura__icontains=q) |
                Q(proveedor__razon_social__icontains=q) |
                Q(observaciones__icontains=q)
            )

        if q_objects:
            queryset = queryset.filter(q_objects)

        return list(queryset.order_by('-fecha_registro'))


class ReporteService:
    """
    Servicio para generar reportes y estadísticas de inventario.
    """

    @staticmethod
    def calcular_valor_total_inventario() -> Dict[str, Decimal]:
        """
        Calcula el valor total del inventario.

        Returns:
            dict: Diccionario con valor_compra, valor_venta,
                  cantidad_productos y total_existencias
        """
        productos = Producto.objects.all()
        total_valor_compra = Decimal('0.00')
        total_valor_venta = Decimal('0.00')
        total_existencias = Decimal('0')
        cantidad_productos = 0

        for p in productos:
            total_valor_compra += p.calcular_valor_inventario()
            total_valor_venta += p.calcular_valor_venta()
            total_existencias += p.existencias if p.existencias else Decimal('0')
            cantidad_productos += 1

        return {
            'valor_compra': total_valor_compra,
            'valor_venta': total_valor_venta,
            'cantidad_productos': cantidad_productos,
            'total_existencias': total_existencias,
        }

    @staticmethod
    def productos_bajo_stock(
        minimo: Decimal = Decimal('10')
    ) -> List[Producto]:
        """
        Retorna productos con existencias por debajo del mínimo.

        Args:
            minimo: Cantidad mínima de stock (default: 10)

        Returns:
            List[Producto]: Productos con stock bajo
        """
        return list(
            Producto.objects.select_related('categoria')
            .filter(existencias__lt=minimo)
            .order_by('existencias')
        )

    @staticmethod
    def productos_mas_vendidos(
        fecha_inicio: Optional[date] = None,
        fecha_fin: Optional[date] = None,
        limite: int = 10,
    ) -> List[Dict]:
        """
        Retorna los productos más vendidos en un período.

        Requiere que el módulo ventas esté instalado para obtener
        los datos de ventas reales.

        Args:
            fecha_inicio: Fecha de inicio del período
            fecha_fin: Fecha de fin del período
            limite: Cantidad máxima de productos (default: 10)

        Returns:
            List[Dict]: Lista de productos con total_vendido
        """
        from django.apps import apps

        if not apps.is_installed('ventas'):
            return ReporteService.productos_bajo_stock(Decimal('0'))[:limite]

        try:
            Venta = apps.get_model('ventas', 'Venta')
            DetalleVenta = apps.get_model('ventas', 'DetalleVenta')
        except LookupError:
            return ReporteService.productos_bajo_stock(Decimal('0'))[:limite]

        ventas_qs = Venta.objects.filter(
            estado__in=['TERMINADA', 'PENDIENTE']
        )

        if fecha_inicio:
            ventas_qs = ventas_qs.filter(fecha_venta__date__gte=fecha_inicio)
        if fecha_fin:
            ventas_qs = ventas_qs.filter(fecha_venta__date__lte=fecha_fin)

        resultados = (
            DetalleVenta.objects.filter(
                venta__in=ventas_qs
            )
            .values('producto_id', 'producto__nombre', 'producto__codigo_interno')
            .annotate(
                total_vendido=Sum('cantidad', output_field=DecimalField())
            )
            .order_by('-total_vendido')[:limite]
        )

        return [
            {
                'producto_id': r['producto_id'],
                'nombre': r['producto__nombre'],
                'codigo_interno': r['producto__codigo_interno'],
                'total_vendido': r['total_vendido'] or Decimal('0'),
            }
            for r in resultados
        ]


class HistorialService:
    """
    Servicio para consultar el historial de movimientos de inventario.
    """

    @staticmethod
    def obtener_historial_producto(
        producto_id: int,
        filtros: Optional[Dict[str, Any]] = None
    ) -> List[HistorialInventario]:
        """
        Obtiene los movimientos de inventario de un producto específico.

        Args:
            producto_id: ID del producto
            filtros: Filtros opcionales (tipo_movimiento, fecha_desde,
                     fecha_hasta, limite)

        Returns:
            List[HistorialInventario]: Lista de movimientos

        Raises:
            ProductoNoEncontradoError: Si el producto no existe
        """
        producto = ProductoService.obtener_producto(producto_id)
        queryset = HistorialInventario.objects.filter(producto=producto)

        if filtros:
            if filtros.get('tipo_movimiento'):
                queryset = queryset.filter(
                    tipo_movimiento=filtros['tipo_movimiento']
                )

            if filtros.get('fecha_desde'):
                queryset = queryset.filter(
                    fecha__gte=filtros['fecha_desde']
                )

            if filtros.get('fecha_hasta'):
                queryset = queryset.filter(
                    fecha__lte=filtros['fecha_hasta']
                )

        limite = filtros.get('limite', 100) if filtros else 100
        return list(
            queryset.select_related(
                'producto', 'usuario', 'factura'
            ).order_by('-fecha')[:limite]
        )

    @staticmethod
    def obtener_historial_general(
        filtros: Optional[Dict[str, Any]] = None
    ) -> List[HistorialInventario]:
        """
        Obtiene el historial completo de movimientos de inventario.

        Args:
            filtros: Filtros opcionales (producto_id, tipo_movimiento,
                     usuario_id, fecha_desde, fecha_hasta, limite)

        Returns:
            List[HistorialInventario]: Lista de movimientos filtrados
        """
        queryset = HistorialInventario.objects.select_related(
            'producto', 'usuario', 'factura', 'venta'
        )

        if not filtros:
            return list(queryset.order_by('-fecha')[:100])

        q_objects = Q()

        if filtros.get('producto_id'):
            q_objects &= Q(producto_id=filtros['producto_id'])

        if filtros.get('tipo_movimiento'):
            q_objects &= Q(tipo_movimiento=filtros['tipo_movimiento'])

        if filtros.get('usuario_id'):
            q_objects &= Q(usuario_id=filtros['usuario_id'])

        if filtros.get('fecha_desde'):
            q_objects &= Q(fecha__gte=filtros['fecha_desde'])

        if filtros.get('fecha_hasta'):
            q_objects &= Q(fecha__lte=filtros['fecha_hasta'])

        if filtros.get('motivo'):
            q_objects &= Q(motivo__icontains=filtros['motivo'])

        if q_objects:
            queryset = queryset.filter(q_objects)

        limite = filtros.get('limite', 100)
        return list(queryset.order_by('-fecha')[:limite])
