from decimal import Decimal, InvalidOperation
from typing import Any, Dict, List, Optional

from django.db import transaction
from django.db.models import F, Prefetch, Q
from django.utils.translation import gettext_lazy as _

from core.exceptions import (
    IngredienteNoEncontradoError,
    ProductoFabricadoNoEncontradoError,
    ProduccionNoPermitidaError,
    RecetaInvalidaError,
)
from fabricante.models import (
    COST_QUANTIZER,
    Ingrediente,
    IngredientesProducto,
    MovimientoEmpaquePresentacion,
    PresentacionProductoFabricado,
    ProductoFabricado,
)
from fabricante.utils import convertir_unidad
from inventario.models import Producto

ZERO = Decimal('0.00')
ZERO_QUANTITY = Decimal('0.0000')
INVENTORY_QUANTIZER = Decimal('0.01')


class IngredienteService:
    """
    Servicio de logica de negocio para ingredientes.
    """

    @staticmethod
    def _to_decimal(value: Any, field_name: str) -> Decimal:
        try:
            return Decimal(str(value))
        except (InvalidOperation, TypeError, ValueError) as exc:
            raise RecetaInvalidaError(
                f'El valor de "{field_name}" debe ser numerico.'
            ) from exc

    @staticmethod
    def obtener_ingrediente(ingrediente_id: int) -> Ingrediente:
        try:
            return Ingrediente.objects.select_related('proveedor').get(
                pk=ingrediente_id,
            )
        except Ingrediente.DoesNotExist as exc:
            raise IngredienteNoEncontradoError(ingrediente_id) from exc

    @staticmethod
    @transaction.atomic
    def crear_ingrediente(data: Dict[str, Any]) -> Ingrediente:
        datos = data.copy()
        nombre = str(datos.get('nombre', '')).strip()

        if not nombre:
            raise RecetaInvalidaError(
                'Debe proporcionar un nombre para el ingrediente.'
            )

        if Ingrediente.objects.filter(nombre__iexact=nombre).exists():
            raise RecetaInvalidaError(
                'Ya existe un ingrediente registrado con ese nombre.'
            )

        datos['nombre'] = nombre
        return Ingrediente.objects.create(**datos)

    @staticmethod
    @transaction.atomic
    def actualizar_ingrediente(
        ingrediente_id: int,
        data: Dict[str, Any],
    ) -> Ingrediente:
        ingrediente = IngredienteService.obtener_ingrediente(ingrediente_id)

        for campo, valor in data.items():
            setattr(ingrediente, campo, valor)

        ingrediente.save()
        return ingrediente

    @staticmethod
    @transaction.atomic
    def eliminar_ingrediente(ingrediente_id: int) -> None:
        ingrediente = IngredienteService.obtener_ingrediente(ingrediente_id)
        ingrediente.delete()

    @staticmethod
    def listar_ingredientes(
        filtros: Optional[Dict[str, Any]] = None,
    ) -> List[Ingrediente]:
        queryset = Ingrediente.objects.select_related('proveedor').all()

        if not filtros:
            return list(queryset.order_by('nombre'))

        q_objects = Q()

        if filtros.get('q'):
            termino = filtros['q']
            q_objects &= (
                Q(nombre__icontains=termino) |
                Q(descripcion__icontains=termino) |
                Q(proveedor__razon_social__icontains=termino) |
                Q(proveedor__nombre_comercial__icontains=termino)
            )

        if filtros.get('proveedor_id'):
            q_objects &= Q(proveedor_id=filtros['proveedor_id'])

        if filtros.get('unidad_medida'):
            q_objects &= Q(unidad_medida=filtros['unidad_medida'])

        if filtros.get('bajo_stock'):
            q_objects &= Q(stock_actual__lte=F('stock_minimo'))

        if q_objects:
            queryset = queryset.filter(q_objects)

        ordering = filtros.get('ordering', 'nombre')
        ordering_permitido = {
            'nombre',
            '-nombre',
            'stock_actual',
            '-stock_actual',
            'precio_por_unidad',
            '-precio_por_unidad',
            'created_at',
            '-created_at',
        }
        if ordering not in ordering_permitido:
            ordering = 'nombre'

        return list(queryset.order_by(ordering))

    @staticmethod
    @transaction.atomic
    def actualizar_stock_ingrediente(
        ingrediente_id: int,
        cantidad: Any,
    ) -> Ingrediente:
        ingrediente = IngredienteService.obtener_ingrediente(ingrediente_id)
        ajuste = IngredienteService._to_decimal(cantidad, 'cantidad').quantize(
            COST_QUANTIZER,
        )
        nuevo_stock = (ingrediente.stock_actual + ajuste).quantize(
            COST_QUANTIZER,
        )

        if nuevo_stock < ZERO_QUANTITY:
            raise ProduccionNoPermitidaError(
                _(
                    'El ajuste dejaria stock negativo para el ingrediente '
                    '%(ingrediente)s.'
                ) % {'ingrediente': ingrediente.nombre}
            )

        ingrediente.stock_actual = nuevo_stock
        ingrediente.save(update_fields=['stock_actual', 'updated_at'])
        return ingrediente

    @staticmethod
    def ingredientes_bajo_stock() -> List[Ingrediente]:
        return list(
            Ingrediente.objects.select_related('proveedor').filter(
                stock_actual__lte=F('stock_minimo'),
            ).order_by('stock_actual', 'nombre')
        )


class ProductoFabricadoService:
    """
    Servicio de logica de negocio para productos fabricados.
    """

    @staticmethod
    def _base_queryset():
        return ProductoFabricado.objects.select_related(
            'producto_final',
        ).prefetch_related(
            Prefetch(
                'receta',
                queryset=IngredientesProducto.objects.select_related(
                    'ingrediente',
                ),
            ),
            Prefetch(
                'presentaciones',
                queryset=PresentacionProductoFabricado.objects.select_related(
                    'producto_inventario',
                ),
            ),
        )

    @staticmethod
    def _to_decimal(value: Any, field_name: str) -> Decimal:
        try:
            return Decimal(str(value))
        except (InvalidOperation, TypeError, ValueError) as exc:
            raise RecetaInvalidaError(
                f'El valor de "{field_name}" debe ser numerico.'
            ) from exc

    @staticmethod
    def _obtener_producto(producto_id: int) -> ProductoFabricado:
        try:
            return ProductoFabricadoService._base_queryset().get(pk=producto_id)
        except ProductoFabricado.DoesNotExist as exc:
            raise ProductoFabricadoNoEncontradoError(producto_id) from exc

    @staticmethod
    def obtener_producto(producto_id: int) -> ProductoFabricado:
        return ProductoFabricadoService._obtener_producto(producto_id)

    @staticmethod
    def listar_productos(
        filtros: Optional[Dict[str, Any]] = None,
    ) -> List[ProductoFabricado]:
        queryset = ProductoFabricadoService._base_queryset()

        if not filtros:
            return list(queryset.order_by('nombre', 'id'))

        q_objects = Q()

        if filtros.get('q'):
            termino = filtros['q']
            q_objects &= (
                Q(nombre__icontains=termino) |
                Q(descripcion__icontains=termino)
            )

        if filtros.get('unidad_medida'):
            q_objects &= Q(unidad_medida=filtros['unidad_medida'])

        if filtros.get('producto_final_id'):
            q_objects &= Q(producto_final_id=filtros['producto_final_id'])

        if filtros.get('con_producto_final') is True:
            q_objects &= Q(producto_final__isnull=False)

        if filtros.get('con_producto_final') is False:
            q_objects &= Q(producto_final__isnull=True)

        if q_objects:
            queryset = queryset.filter(q_objects)

        ordering = filtros.get('ordering', 'nombre')
        ordering_permitido = {
            'nombre',
            '-nombre',
            'costo_unitario',
            '-costo_unitario',
            'precio_venta',
            '-precio_venta',
            'created_at',
            '-created_at',
        }
        if ordering not in ordering_permitido:
            ordering = 'nombre'

        return list(queryset.order_by(ordering, 'id'))

    @staticmethod
    def _validar_receta(receta: List[Dict[str, Any]]) -> None:
        if not receta:
            raise RecetaInvalidaError(
                'Debe incluir al menos un ingrediente en la receta.'
            )

        ingredientes = set()
        for item in receta:
            ingrediente_id = item.get('ingrediente_id') or item.get('ingrediente')
            if ingrediente_id in ingredientes:
                raise RecetaInvalidaError(
                    'No puede repetir ingredientes dentro de la misma receta.'
                )
            ingredientes.add(ingrediente_id)

    @staticmethod
    def _obtener_ingrediente_desde_item(item: Dict[str, Any]) -> Ingrediente:
        ingrediente = item.get('ingrediente')
        if isinstance(ingrediente, Ingrediente):
            return ingrediente

        ingrediente_id = item.get('ingrediente_id') or ingrediente
        if not ingrediente_id:
            raise RecetaInvalidaError(
                'Cada item de receta debe incluir un ingrediente.'
            )

        return IngredienteService.obtener_ingrediente(int(ingrediente_id))

    @staticmethod
    def _normalizar_presentaciones(
        presentaciones: Optional[List[Dict[str, Any]]],
    ) -> List[Dict[str, Any]]:
        if not presentaciones:
            return []

        nombres = set()
        normalizadas = []
        for item in presentaciones:
            nombre = str(item.get('nombre', '')).strip()
            if not nombre:
                raise RecetaInvalidaError(
                    'Cada presentacion debe incluir un nombre.'
                )
            nombre_normalizado = nombre.lower()
            if nombre_normalizado in nombres:
                raise RecetaInvalidaError(
                    'No puede repetir presentaciones dentro del mismo '
                    'producto fabricado.'
                )
            nombres.add(nombre_normalizado)
            normalizadas.append({
                **item,
                'nombre': nombre,
            })

        return normalizadas

    @staticmethod
    def _sincronizar_precio_referencia_desde_presentaciones(
        producto: ProductoFabricado,
    ) -> None:
        presentacion_referencia = producto.presentaciones.order_by(
            'cantidad_por_unidad',
            'id',
        ).first()
        if presentacion_referencia is None:
            return

        producto.precio_venta = presentacion_referencia.precio_venta
        producto.precio_venta_sugerido = (
            presentacion_referencia.precio_venta_sugerido
        )
        producto.save()

    @staticmethod
    def _construir_nombre_presentacion_inventario(
        presentacion: PresentacionProductoFabricado,
    ) -> str:
        return (
            f'{presentacion.producto_fabricado.nombre} - '
            f'{presentacion.nombre}'
        ).strip()

    @staticmethod
    @transaction.atomic
    def crear_producto_fabricado(
        data: Dict[str, Any],
        receta: List[Dict[str, Any]],
        presentaciones: Optional[List[Dict[str, Any]]] = None,
    ) -> ProductoFabricado:
        ProductoFabricadoService._validar_receta(receta)
        presentaciones_normalizadas = (
            ProductoFabricadoService._normalizar_presentaciones(
                presentaciones,
            )
        )

        producto = ProductoFabricado.objects.create(**data)

        for item in receta:
            ingrediente = ProductoFabricadoService._obtener_ingrediente_desde_item(
                item,
            )
            IngredientesProducto.objects.create(
                producto_fabricado=producto,
                ingrediente=ingrediente,
                cantidad_necesaria=ProductoFabricadoService._to_decimal(
                    item.get('cantidad_necesaria'),
                    'cantidad_necesaria',
                ),
                unidad_medida=item.get('unidad_medida'),
            )

        for item in presentaciones_normalizadas:
            PresentacionProductoFabricado.objects.create(
                producto_fabricado=producto,
                nombre=item.get('nombre'),
                cantidad_por_unidad=ProductoFabricadoService._to_decimal(
                    item.get('cantidad_por_unidad'),
                    'cantidad_por_unidad',
                ),
                unidad_medida=item.get('unidad_medida'),
                precio_venta_sugerido=ProductoFabricadoService._to_decimal(
                    item.get('precio_venta_sugerido', ZERO),
                    'precio_venta_sugerido',
                ).quantize(INVENTORY_QUANTIZER),
                precio_venta=ProductoFabricadoService._to_decimal(
                    item.get('precio_venta', ZERO),
                    'precio_venta',
                ).quantize(INVENTORY_QUANTIZER),
            )

        producto.save()
        if presentaciones_normalizadas:
            ProductoFabricadoService._sincronizar_precio_referencia_desde_presentaciones(
                producto,
            )
        return ProductoFabricadoService._obtener_producto(producto.id)

    @staticmethod
    @transaction.atomic
    def actualizar_producto(
        producto_id: int,
        data: Dict[str, Any],
    ) -> ProductoFabricado:
        producto = ProductoFabricadoService._obtener_producto(producto_id)

        for campo, valor in data.items():
            setattr(producto, campo, valor)

        producto.save()
        return ProductoFabricadoService._obtener_producto(producto.id)

    @staticmethod
    @transaction.atomic
    def eliminar_producto(producto_id: int) -> None:
        producto = ProductoFabricadoService._obtener_producto(producto_id)
        producto.delete()

    @staticmethod
    @transaction.atomic
    def calcular_costos_producto(producto_id: int) -> ProductoFabricado:
        producto = ProductoFabricadoService._obtener_producto(producto_id)
        producto.save()
        return ProductoFabricadoService._obtener_producto(producto.id)

    @staticmethod
    def obtener_receta(producto_id: int) -> List[IngredientesProducto]:
        producto = ProductoFabricadoService._obtener_producto(producto_id)
        return list(producto.receta.all())

    @staticmethod
    def obtener_presentaciones(
        producto_id: int,
    ) -> List[PresentacionProductoFabricado]:
        producto = ProductoFabricadoService._obtener_producto(producto_id)
        return list(producto.presentaciones.all())

    @staticmethod
    def _obtener_presentacion(
        producto_id: int,
        presentacion_id: int,
    ) -> PresentacionProductoFabricado:
        producto = ProductoFabricadoService._obtener_producto(producto_id)
        presentacion = producto.presentaciones.filter(pk=presentacion_id).first()

        if presentacion is None:
            raise RecetaInvalidaError(
                'La presentacion indicada no pertenece al producto fabricado.'
            )

        return presentacion

    @staticmethod
    @transaction.atomic
    def crear_presentacion(
        producto_id: int,
        data: Dict[str, Any],
    ) -> PresentacionProductoFabricado:
        producto = ProductoFabricadoService._obtener_producto(producto_id)
        nombre = str(data.get('nombre', '')).strip()

        if producto.presentaciones.filter(nombre__iexact=nombre).exists():
            raise RecetaInvalidaError(
                'Ya existe una presentacion con ese nombre.'
            )

        presentacion = PresentacionProductoFabricado.objects.create(
            producto_fabricado=producto,
            nombre=nombre,
            cantidad_por_unidad=ProductoFabricadoService._to_decimal(
                data.get('cantidad_por_unidad'),
                'cantidad_por_unidad',
            ),
            unidad_medida=data.get('unidad_medida'),
            precio_venta_sugerido=ProductoFabricadoService._to_decimal(
                data.get('precio_venta_sugerido', ZERO),
                'precio_venta_sugerido',
            ).quantize(INVENTORY_QUANTIZER),
            precio_venta=ProductoFabricadoService._to_decimal(
                data.get('precio_venta', ZERO),
                'precio_venta',
            ).quantize(INVENTORY_QUANTIZER),
        )
        ProductoFabricadoService._sincronizar_precio_referencia_desde_presentaciones(
            producto,
        )
        return PresentacionProductoFabricado.objects.select_related(
            'producto_fabricado',
            'producto_inventario',
        ).get(pk=presentacion.pk)

    @staticmethod
    @transaction.atomic
    def actualizar_presentacion(
        producto_id: int,
        presentacion_id: int,
        data: Dict[str, Any],
    ) -> PresentacionProductoFabricado:
        presentacion = ProductoFabricadoService._obtener_presentacion(
            producto_id,
            presentacion_id,
        )

        nombre = str(data.get('nombre', presentacion.nombre)).strip()
        queryset = presentacion.producto_fabricado.presentaciones.exclude(
            pk=presentacion.pk,
        )
        if queryset.filter(nombre__iexact=nombre).exists():
            raise RecetaInvalidaError(
                'Ya existe una presentacion con ese nombre.'
            )

        for campo, valor in data.items():
            setattr(presentacion, campo, valor)

        presentacion.nombre = nombre
        presentacion.save()
        ProductoFabricadoService._sincronizar_precio_referencia_desde_presentaciones(
            presentacion.producto_fabricado,
        )
        return PresentacionProductoFabricado.objects.select_related(
            'producto_fabricado',
            'producto_inventario',
        ).get(pk=presentacion.pk)

    @staticmethod
    @transaction.atomic
    def eliminar_presentacion(
        producto_id: int,
        presentacion_id: int,
    ) -> None:
        presentacion = ProductoFabricadoService._obtener_presentacion(
            producto_id,
            presentacion_id,
        )
        producto = presentacion.producto_fabricado
        presentacion.delete()
        ProductoFabricadoService._sincronizar_precio_referencia_desde_presentaciones(
            producto,
        )

    @staticmethod
    @transaction.atomic
    def agregar_ingrediente_receta(
        producto_id: int,
        data: Dict[str, Any],
    ) -> IngredientesProducto:
        producto = ProductoFabricadoService._obtener_producto(producto_id)
        ingrediente = ProductoFabricadoService._obtener_ingrediente_desde_item(
            data,
        )

        if producto.receta.filter(ingrediente=ingrediente).exists():
            raise RecetaInvalidaError(
                'El ingrediente ya esta asociado a este producto.'
            )

        receta = IngredientesProducto.objects.create(
            producto_fabricado=producto,
            ingrediente=ingrediente,
            cantidad_necesaria=ProductoFabricadoService._to_decimal(
                data.get('cantidad_necesaria'),
                'cantidad_necesaria',
            ),
            unidad_medida=data.get('unidad_medida'),
        )
        return IngredientesProducto.objects.select_related(
            'ingrediente',
            'producto_fabricado',
        ).get(pk=receta.pk)

    @staticmethod
    @transaction.atomic
    def eliminar_ingrediente_receta(
        producto_id: int,
        ingrediente_id: int,
    ) -> None:
        producto = ProductoFabricadoService._obtener_producto(producto_id)
        receta = producto.receta.filter(ingrediente_id=ingrediente_id).first()

        if receta is None:
            raise RecetaInvalidaError(
                'El ingrediente indicado no pertenece a la receta.'
            )

        receta.delete()

    @staticmethod
    def obtener_desglose_costos(producto_id: int) -> Dict[str, Any]:
        producto = ProductoFabricadoService.calcular_costos_producto(producto_id)
        ingredientes = []

        for item in producto.receta.all():
            ingredientes.append({
                'ingrediente_id': item.ingrediente_id,
                'ingrediente_nombre': item.ingrediente.nombre,
                'cantidad_necesaria': item.cantidad_necesaria,
                'unidad_medida': item.unidad_medida,
                'unidad_base_ingrediente': item.ingrediente.unidad_medida,
                'precio_por_unidad': item.ingrediente.precio_por_unidad,
                'costo_ingrediente': item.costo_ingrediente,
            })

        return {
            'producto': producto,
            'ingredientes': ingredientes,
            'costo_produccion': producto.costo_produccion,
            'costo_unitario': producto.costo_unitario,
            'margen_utilidad': producto.margen_utilidad,
            'porcentaje_utilidad': producto.porcentaje_utilidad,
        }

    @staticmethod
    @transaction.atomic
    def sugerir_precio_venta(
        producto_id: int,
        margen_deseado: Any,
    ) -> Decimal:
        producto = ProductoFabricadoService._obtener_producto(producto_id)
        margen = ProductoFabricadoService._to_decimal(
            margen_deseado,
            'margen_deseado',
        )

        if margen < ZERO:
            raise RecetaInvalidaError(
                'El margen deseado no puede ser negativo.'
            )

        sugerido = (
            producto.costo_unitario * (Decimal('1') + (margen / Decimal('100')))
        ).quantize(INVENTORY_QUANTIZER)

        producto.precio_venta_sugerido = sugerido
        producto.save(update_fields=['precio_venta_sugerido', 'updated_at'])
        return sugerido

    @staticmethod
    def validar_produccion(
        producto_id: int,
        cantidad_lotes: Any,
    ) -> Dict[str, Any]:
        producto = ProductoFabricadoService._obtener_producto(producto_id)
        lotes = ProductoFabricadoService._to_decimal(
            cantidad_lotes,
            'cantidad_lotes',
        )

        if lotes <= ZERO:
            raise ProduccionNoPermitidaError(
                'La cantidad de lotes debe ser mayor que cero.'
            )

        if not producto.receta.exists():
            raise RecetaInvalidaError(
                'El producto fabricado no tiene ingredientes asociados.'
            )

        faltantes = []
        consumos = []

        for receta in producto.receta.all():
            cantidad_total = (
                receta.cantidad_necesaria * lotes
            ).quantize(COST_QUANTIZER)
            cantidad_ingrediente = convertir_unidad(
                cantidad_total,
                receta.unidad_medida,
                receta.ingrediente.unidad_medida,
            ).quantize(COST_QUANTIZER)

            consumo = {
                'ingrediente_id': receta.ingrediente_id,
                'ingrediente_nombre': receta.ingrediente.nombre,
                'unidad_receta': receta.unidad_medida,
                'unidad_ingrediente': receta.ingrediente.unidad_medida,
                'cantidad_requerida_receta': cantidad_total,
                'cantidad_requerida_stock': cantidad_ingrediente,
                'stock_disponible': receta.ingrediente.stock_actual,
            }
            consumos.append(consumo)

            if receta.ingrediente.stock_actual < cantidad_ingrediente:
                faltantes.append(consumo)

        return {
            'producto': producto,
            'cantidad_lotes': lotes,
            'cantidad_total_producida': (
                producto.cantidad_producida * lotes
            ).quantize(COST_QUANTIZER),
            'es_valida': not faltantes,
            'faltantes': faltantes,
            'consumos': consumos,
        }

    @staticmethod
    @transaction.atomic
    def producir_lote(
        producto_id: int,
        cantidad_lotes: Any,
    ) -> Dict[str, Any]:
        validacion = ProductoFabricadoService.validar_produccion(
            producto_id,
            cantidad_lotes,
        )
        producto = validacion['producto']

        if not validacion['es_valida']:
            raise ProduccionNoPermitidaError(
                'No hay ingredientes suficientes para producir el lote.'
            )

        for consumo in validacion['consumos']:
            ingrediente = IngredienteService.obtener_ingrediente(
                consumo['ingrediente_id'],
            )
            ingrediente.stock_actual = (
                ingrediente.stock_actual - consumo['cantidad_requerida_stock']
            ).quantize(COST_QUANTIZER)
            ingrediente.save(update_fields=['stock_actual', 'updated_at'])

        cantidad_producida = validacion['cantidad_total_producida']
        producto.stock_fabricado_disponible = (
            producto.stock_fabricado_disponible + cantidad_producida
        ).quantize(COST_QUANTIZER)
        producto.total_producido_acumulado = (
            producto.total_producido_acumulado + cantidad_producida
        ).quantize(COST_QUANTIZER)
        producto.save(
            update_fields=[
                'stock_fabricado_disponible',
                'total_producido_acumulado',
                'updated_at',
            ],
        )

        producto_inventario = None
        if producto.producto_final_id and not producto.presentaciones.exists():
            producto_inventario = producto.producto_final
            producto_inventario.actualizar_stock(
                cantidad_producida.quantize(
                    INVENTORY_QUANTIZER,
                )
            )

        return {
            'producto': ProductoFabricadoService._obtener_producto(producto.id),
            'cantidad_lotes': validacion['cantidad_lotes'],
            'cantidad_total_producida': cantidad_producida,
            'ingredientes_consumidos': validacion['consumos'],
            'producto_inventario': producto_inventario,
        }

    @staticmethod
    @transaction.atomic
    def empacar_presentacion(
        producto_id: int,
        presentacion_id: int,
        cantidad_unidades: Any,
        usuario=None,
    ) -> Dict[str, Any]:
        presentacion = ProductoFabricadoService._obtener_presentacion(
            producto_id,
            presentacion_id,
        )
        producto = presentacion.producto_fabricado
        unidades = ProductoFabricadoService._to_decimal(
            cantidad_unidades,
            'cantidad_unidades',
        ).quantize(COST_QUANTIZER)

        if unidades <= ZERO_QUANTITY:
            raise ProduccionNoPermitidaError(
                'La cantidad a empacar debe ser mayor que cero.'
            )

        cantidad_consumida_lote = (
            presentacion.calcular_cantidad_consumida_lote() * unidades
        ).quantize(COST_QUANTIZER)

        if producto.stock_fabricado_disponible < cantidad_consumida_lote:
            raise ProduccionNoPermitidaError(
                'No hay stock fabricado suficiente para completar el empaque.'
            )

        producto_inventario = (
            ProductoFabricadoService.convertir_presentacion_a_inventario(
                producto_id,
                presentacion_id,
            )
        )
        presentacion.refresh_from_db()

        producto.stock_fabricado_disponible = (
            producto.stock_fabricado_disponible - cantidad_consumida_lote
        ).quantize(COST_QUANTIZER)
        producto.save(update_fields=['stock_fabricado_disponible', 'updated_at'])

        producto_inventario.actualizar_stock(
            unidades.quantize(INVENTORY_QUANTIZER),
        )

        movimiento = MovimientoEmpaquePresentacion.objects.create(
            presentacion=presentacion,
            cantidad_unidades=unidades,
            cantidad_consumida_lote=cantidad_consumida_lote,
            usuario=usuario if getattr(usuario, 'is_authenticated', False) else None,
        )

        return {
            'producto': ProductoFabricadoService._obtener_producto(producto.id),
            'presentacion': PresentacionProductoFabricado.objects.select_related(
                'producto_fabricado',
                'producto_inventario',
            ).get(pk=presentacion.pk),
            'movimiento': movimiento,
            'producto_inventario': producto_inventario,
            'cantidad_unidades': unidades,
            'cantidad_consumida_lote': cantidad_consumida_lote,
        }

    @staticmethod
    @transaction.atomic
    def convertir_a_producto_inventario(
        producto_fabricado_id: int,
    ) -> Producto:
        producto_fabricado = ProductoFabricadoService._obtener_producto(
            producto_fabricado_id,
        )
        producto_fabricado.save()

        if producto_fabricado.costo_unitario <= ZERO_QUANTITY:
            raise ProduccionNoPermitidaError(
                'El producto fabricado debe tener un costo unitario valido '
                'antes de convertirse a inventario.'
            )

        precio_compra = producto_fabricado.costo_unitario.quantize(
            INVENTORY_QUANTIZER,
        )
        precio_venta = (
            producto_fabricado.precio_venta or
            producto_fabricado.precio_venta_sugerido or
            precio_compra
        ).quantize(INVENTORY_QUANTIZER)

        datos_producto = {
            'nombre': producto_fabricado.nombre,
            'descripcion': producto_fabricado.descripcion,
            'precio_compra': precio_compra,
            'precio_venta': precio_venta,
            'iva': ZERO,
        }

        if producto_fabricado.producto_final_id:
            producto_inventario = producto_fabricado.producto_final
            for campo, valor in datos_producto.items():
                setattr(producto_inventario, campo, valor)
            producto_inventario.save()
        else:
            producto_inventario = Producto.objects.create(
                existencias=ZERO,
                **datos_producto,
            )
            producto_fabricado.producto_final = producto_inventario
            producto_fabricado.save(update_fields=['producto_final', 'updated_at'])

        return producto_inventario

    @staticmethod
    @transaction.atomic
    def convertir_presentacion_a_inventario(
        producto_id: int,
        presentacion_id: int,
    ) -> Producto:
        presentacion = ProductoFabricadoService._obtener_presentacion(
            producto_id,
            presentacion_id,
        )

        if presentacion.costo_unitario_presentacion <= ZERO_QUANTITY:
            raise ProduccionNoPermitidaError(
                'La presentacion debe tener un costo unitario valido antes '
                'de vincularse a inventario.'
            )

        precio_compra = presentacion.costo_unitario_presentacion.quantize(
            INVENTORY_QUANTIZER,
        )
        precio_venta = (
            presentacion.precio_venta or
            presentacion.precio_venta_sugerido or
            precio_compra
        ).quantize(INVENTORY_QUANTIZER)

        datos_producto = {
            'nombre': (
                ProductoFabricadoService
                ._construir_nombre_presentacion_inventario(presentacion)
            ),
            'descripcion': (
                f'{presentacion.producto_fabricado.nombre} · '
                f'{presentacion.cantidad_por_unidad} '
                f'{presentacion.unidad_medida}'
            ),
            'precio_compra': precio_compra,
            'precio_venta': precio_venta,
            'iva': ZERO,
        }

        if presentacion.producto_inventario_id:
            producto_inventario = presentacion.producto_inventario
            for campo, valor in datos_producto.items():
                setattr(producto_inventario, campo, valor)
            producto_inventario.save()
        else:
            producto_inventario = Producto.objects.create(
                existencias=ZERO,
                **datos_producto,
            )
            presentacion.producto_inventario = producto_inventario
            presentacion.save(update_fields=['producto_inventario', 'updated_at'])

        return producto_inventario


def crear_ingrediente(data: Dict[str, Any]) -> Ingrediente:
    return IngredienteService.crear_ingrediente(data)


def listar_ingredientes(
    filtros: Optional[Dict[str, Any]] = None,
) -> List[Ingrediente]:
    return IngredienteService.listar_ingredientes(filtros)


def actualizar_ingrediente(
    ingrediente_id: int,
    data: Dict[str, Any],
) -> Ingrediente:
    return IngredienteService.actualizar_ingrediente(
        ingrediente_id,
        data,
    )


def eliminar_ingrediente(ingrediente_id: int) -> None:
    IngredienteService.eliminar_ingrediente(ingrediente_id)


def actualizar_stock_ingrediente(
    ingrediente_id: int,
    cantidad: Any,
) -> Ingrediente:
    return IngredienteService.actualizar_stock_ingrediente(
        ingrediente_id,
        cantidad,
    )


def ingredientes_bajo_stock() -> List[Ingrediente]:
    return IngredienteService.ingredientes_bajo_stock()


def crear_producto_fabricado(
    data: Dict[str, Any],
    receta: List[Dict[str, Any]],
    presentaciones: Optional[List[Dict[str, Any]]] = None,
) -> ProductoFabricado:
    return ProductoFabricadoService.crear_producto_fabricado(
        data,
        receta,
        presentaciones,
    )


def listar_productos_fabricados(
    filtros: Optional[Dict[str, Any]] = None,
) -> List[ProductoFabricado]:
    return ProductoFabricadoService.listar_productos(filtros)


def obtener_producto_fabricado(producto_id: int) -> ProductoFabricado:
    return ProductoFabricadoService.obtener_producto(producto_id)


def actualizar_producto_fabricado(
    producto_id: int,
    data: Dict[str, Any],
) -> ProductoFabricado:
    return ProductoFabricadoService.actualizar_producto(
        producto_id,
        data,
    )


def eliminar_producto_fabricado(producto_id: int) -> None:
    ProductoFabricadoService.eliminar_producto(producto_id)


def calcular_costos_producto(producto_id: int) -> ProductoFabricado:
    return ProductoFabricadoService.calcular_costos_producto(producto_id)


def obtener_desglose_costos_producto(producto_id: int) -> Dict[str, Any]:
    return ProductoFabricadoService.obtener_desglose_costos(producto_id)


def sugerir_precio_venta(
    producto_id: int,
    margen_deseado: Any,
) -> Decimal:
    return ProductoFabricadoService.sugerir_precio_venta(
        producto_id,
        margen_deseado,
    )


def validar_produccion(
    producto_id: int,
    cantidad_lotes: Any,
) -> Dict[str, Any]:
    return ProductoFabricadoService.validar_produccion(
        producto_id,
        cantidad_lotes,
    )


def producir_lote(
    producto_id: int,
    cantidad_lotes: Any,
) -> Dict[str, Any]:
    return ProductoFabricadoService.producir_lote(
        producto_id,
        cantidad_lotes,
    )


def convertir_a_producto_inventario(
    producto_fabricado_id: int,
) -> Producto:
    return ProductoFabricadoService.convertir_a_producto_inventario(
        producto_fabricado_id,
    )


def obtener_receta_producto(
    producto_id: int,
) -> List[IngredientesProducto]:
    return ProductoFabricadoService.obtener_receta(producto_id)


def agregar_ingrediente_a_receta(
    producto_id: int,
    data: Dict[str, Any],
) -> IngredientesProducto:
    return ProductoFabricadoService.agregar_ingrediente_receta(
        producto_id,
        data,
    )


def eliminar_ingrediente_de_receta(
    producto_id: int,
    ingrediente_id: int,
) -> None:
    ProductoFabricadoService.eliminar_ingrediente_receta(
        producto_id,
        ingrediente_id,
    )


def obtener_presentaciones_producto(
    producto_id: int,
) -> List[PresentacionProductoFabricado]:
    return ProductoFabricadoService.obtener_presentaciones(producto_id)


def crear_presentacion_producto(
    producto_id: int,
    data: Dict[str, Any],
) -> PresentacionProductoFabricado:
    return ProductoFabricadoService.crear_presentacion(producto_id, data)


def actualizar_presentacion_producto(
    producto_id: int,
    presentacion_id: int,
    data: Dict[str, Any],
) -> PresentacionProductoFabricado:
    return ProductoFabricadoService.actualizar_presentacion(
        producto_id,
        presentacion_id,
        data,
    )


def eliminar_presentacion_producto(
    producto_id: int,
    presentacion_id: int,
) -> None:
    ProductoFabricadoService.eliminar_presentacion(
        producto_id,
        presentacion_id,
    )


def empacar_presentacion_producto(
    producto_id: int,
    presentacion_id: int,
    cantidad_unidades: Any,
    usuario=None,
) -> Dict[str, Any]:
    return ProductoFabricadoService.empacar_presentacion(
        producto_id,
        presentacion_id,
        cantidad_unidades,
        usuario=usuario,
    )
