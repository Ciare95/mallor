import logging
from collections import defaultdict
from datetime import date, datetime, time, timedelta, timezone as dt_timezone
from decimal import Decimal
from typing import Any, Dict, List, Optional
from zoneinfo import ZoneInfo

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.db.models import Count, DecimalField, Q, Sum
from django.db.models.functions import Coalesce
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from cliente.models import Cliente
from core.exceptions import (
    AbonoNoEncontradoError,
    AbonoNoPermitidoError,
    EstadoVentaInvalidoError,
    ProductoNoEncontradoError,
    StockInsuficienteError,
    VentaError,
    VentaFacturadaError,
    VentaNoCancelableError,
    VentaNoEditableError,
    VentaNoEncontradaError,
    VentaSinDetallesError,
)
from inventario.models import HistorialInventario, Producto
from usuario.models import Usuario
from empresa.context import get_empresa_actual_or_default
from empresa.services import EmpresaService
from ventas.models import Abono, DetalleVenta, Venta


QUANTIZER = Decimal('0.01')
BUSINESS_TIMEZONE = ZoneInfo('America/Bogota')
logger = logging.getLogger('mallor.factus')


def _local_day_start_utc(target_date: date) -> datetime:
    local_start = datetime.combine(
        target_date,
        time.min,
        tzinfo=BUSINESS_TIMEZONE,
    )
    return local_start.astimezone(dt_timezone.utc)


def _next_local_day_start_utc(target_date: date) -> datetime:
    return _local_day_start_utc(target_date + timedelta(days=1))


def _schedule_facturacion_electronica(venta: Venta) -> None:
    if venta.estado != Venta.Estado.TERMINADA or not venta.factura_electronica:
        return

    def _emitir() -> None:
        from ventas.facturacion_services import FacturacionElectronicaService

        try:
            config = FacturacionElectronicaService.get_config()
            if not config.is_enabled or not config.auto_emitir_al_terminar:
                return

            FacturacionElectronicaService().emitir_factura(venta.id)
        except Exception:
            # La venta debe persistirse incluso si la emision falla.
            logger.exception(
                'No fue posible emitir automaticamente la factura de la venta %s',
                venta.id,
            )

    transaction.on_commit(_emitir)


class _VentaInventarioService:
    """
    Helpers internos para validación de stock e historial de ventas.
    """

    @staticmethod
    def obtener_usuario_registro(
        data: Dict[str, Any],
        usuario: Optional[Usuario] = None,
    ) -> Usuario:
        usuario_registro = usuario or data.get('usuario_registro')

        if isinstance(usuario_registro, Usuario):
            return usuario_registro

        if usuario_registro is None:
            raise VentaError(
                _('La venta requiere un usuario de registro.'),
                code='venta_sin_usuario',
            )

        try:
            return Usuario.objects.get(pk=usuario_registro)
        except Usuario.DoesNotExist as exc:
            raise VentaError(
                _(
                    'El usuario de registro %(usuario)s no existe.'
                ) % {
                    'usuario': usuario_registro,
                },
                code='usuario_registro_invalido',
            ) from exc

    @staticmethod
    def obtener_cliente(cliente: Optional[Cliente]) -> Cliente:
        if cliente is None:
            return Cliente.get_consumidor_final()

        if isinstance(cliente, Cliente):
            return cliente

        try:
            return Cliente.objects.get(pk=cliente)
        except Cliente.DoesNotExist as exc:
            raise VentaError(
                _('El cliente solicitado no existe.'),
                code='cliente_no_encontrado',
            ) from exc

    @staticmethod
    def normalizar_detalles(
        detalles_data: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        if not detalles_data:
            raise VentaSinDetallesError()

        detalles_normalizados: List[Dict[str, Any]] = []

        for detalle in detalles_data:
            producto = detalle.get('producto')
            if isinstance(producto, Producto):
                producto_id = producto.pk
            else:
                producto_id = producto

            try:
                producto_obj = Producto.objects.get(
                    pk=producto_id,
                    empresa=get_empresa_actual_or_default(),
                )
            except Producto.DoesNotExist as exc:
                raise ProductoNoEncontradoError(producto_id) from exc

            cantidad = detalle.get('cantidad')
            precio_unitario = (
                detalle.get('precio_unitario') or producto_obj.precio_venta
            )
            descuento = detalle.get('descuento', Decimal('0.00'))

            if cantidad is None or cantidad <= Decimal('0.00'):
                raise VentaError(
                    _(
                        'La cantidad para %(producto)s debe ser mayor '
                        'que cero.'
                    ) % {
                        'producto': producto_obj.nombre,
                    },
                    code='detalle_cantidad_invalida',
                )

            if precio_unitario <= Decimal('0.00'):
                raise VentaError(
                    _(
                        'El precio unitario para %(producto)s debe ser '
                        'mayor que cero.'
                    ) % {
                        'producto': producto_obj.nombre,
                    },
                    code='detalle_precio_invalido',
                )

            if descuento < Decimal('0.00'):
                raise VentaError(
                    _(
                        'El descuento para %(producto)s no puede ser '
                        'negativo.'
                    ) % {
                        'producto': producto_obj.nombre,
                    },
                    code='detalle_descuento_invalido',
                )

            subtotal = cantidad * precio_unitario
            if descuento > subtotal:
                raise VentaError(
                    _(
                        'El descuento para %(producto)s no puede exceder '
                        'su subtotal.'
                    ) % {
                        'producto': producto_obj.nombre,
                    },
                    code='detalle_descuento_excedido',
                )

            detalles_normalizados.append({
                'producto': producto_obj,
                'cantidad': cantidad.quantize(QUANTIZER),
                'precio_unitario': precio_unitario.quantize(QUANTIZER),
                'descuento': descuento.quantize(QUANTIZER),
            })

        return detalles_normalizados

    @staticmethod
    def validar_stock_detalles(
        detalles_data: List[Dict[str, Any]],
        detalles_actuales: Optional[List[DetalleVenta]] = None,
    ) -> None:
        stock_requerido = defaultdict(lambda: Decimal('0.00'))
        stock_actual = defaultdict(lambda: Decimal('0.00'))

        if detalles_actuales:
            for detalle in detalles_actuales:
                stock_actual[detalle.producto_id] += detalle.cantidad

        for detalle in detalles_data:
            stock_requerido[detalle['producto'].id] += detalle['cantidad']

        productos = Producto.objects.select_for_update().filter(
            empresa=get_empresa_actual_or_default(),
            id__in=stock_requerido.keys(),
        ).in_bulk()

        for producto_id, cantidad_requerida in stock_requerido.items():
            producto = productos.get(producto_id)
            if producto is None:
                raise ProductoNoEncontradoError(producto_id)

            disponible = producto.existencias + stock_actual[producto_id]
            if cantidad_requerida > disponible:
                raise StockInsuficienteError(
                    producto.nombre,
                    disponible,
                    cantidad_requerida,
                )

    @staticmethod
    def calcular_totales_proyectados(
        detalles_data: List[Dict[str, Any]],
        descuento_global: Decimal,
    ) -> Dict[str, Decimal]:
        subtotal = Decimal('0.00')
        impuestos = Decimal('0.00')
        descuento_detalles = Decimal('0.00')

        for detalle in detalles_data:
            subtotal_detalle = detalle['cantidad'] * detalle['precio_unitario']
            subtotal += subtotal_detalle
            descuento_detalles += detalle['descuento']
            impuestos += (
                subtotal_detalle *
                (detalle['producto'].iva / Decimal('100'))
            )

        total = subtotal + impuestos - descuento_detalles - descuento_global
        return {
            'subtotal': subtotal.quantize(QUANTIZER),
            'impuestos': impuestos.quantize(QUANTIZER),
            'total': max(total, Decimal('0.00')).quantize(QUANTIZER),
        }

    @staticmethod
    def registrar_historial_salida(
        detalle: DetalleVenta,
        usuario: Usuario,
        motivo: str,
        observaciones: str = '',
    ) -> HistorialInventario:
        return HistorialInventario.objects.create(
            producto=detalle.producto,
            tipo_movimiento=HistorialInventario.TIPO_SALIDA,
            cantidad=-detalle.cantidad,
            precio_unitario=detalle.precio_unitario,
            venta=detalle.venta,
            motivo=motivo,
            usuario=usuario,
            observaciones=observaciones,
        )

    @staticmethod
    def registrar_historial_entrada(
        producto: Producto,
        cantidad: Decimal,
        precio_unitario: Decimal,
        usuario: Usuario,
        motivo: str,
        observaciones: str = '',
    ) -> HistorialInventario:
        return HistorialInventario.objects.create(
            producto=producto,
            tipo_movimiento=HistorialInventario.TIPO_ENTRADA,
            cantidad=cantidad,
            precio_unitario=precio_unitario,
            motivo=motivo,
            usuario=usuario,
            observaciones=observaciones,
        )


class VentaService:
    """
    Servicio de negocio para operaciones de ventas.
    """

    @staticmethod
    def _queryset_base():
        empresa = get_empresa_actual_or_default()
        return Venta.objects.filter(empresa=empresa).select_related(
            'cliente',
            'usuario_registro',
            'factura_documento',
            'factura_documento__numbering_range',
        ).prefetch_related(
            'factura_documento__intentos',
            'abonos__usuario_registro',
            'detalles__producto__categoria',
        )

    @staticmethod
    def _obtener_venta_para_actualizar(venta_id: int) -> Venta:
        empresa = get_empresa_actual_or_default()
        try:
            return Venta.objects.select_for_update(of=('self',)).select_related(
                'usuario_registro',
                'cliente',
            ).prefetch_related(
                'factura_documento__numbering_range',
                'factura_documento__intentos',
                'abonos',
                'detalles__producto',
            ).get(pk=venta_id, empresa=empresa)
        except Venta.DoesNotExist as exc:
            raise VentaNoEncontradaError(venta_id) from exc

    @staticmethod
    def _validar_venta_editable(venta: Venta) -> None:
        if venta.estado == Venta.Estado.CANCELADA:
            raise VentaNoEditableError(
                venta.numero_venta,
                _('la venta se encuentra cancelada'),
            )

        if venta.numero_factura_electronica or venta.fecha_facturacion:
            raise VentaFacturadaError(venta.numero_venta)

    @staticmethod
    def _validar_venta_cancelable(venta: Venta) -> None:
        if venta.estado == Venta.Estado.CANCELADA:
            raise VentaNoCancelableError(
                venta.numero_venta,
                _('ya fue cancelada'),
            )

        if venta.numero_factura_electronica or venta.fecha_facturacion:
            raise VentaFacturadaError(venta.numero_venta)

        if venta.total_abonado > Decimal('0.00'):
            raise VentaNoCancelableError(
                venta.numero_venta,
                _('tiene abonos registrados'),
            )

    @staticmethod
    @transaction.atomic
    def crear_venta(
        data: Dict[str, Any],
        usuario: Optional[Usuario] = None,
    ) -> Venta:
        datos_venta = data.copy()
        detalles_data = _VentaInventarioService.normalizar_detalles(
            datos_venta.pop('detalles', []),
        )
        descuento_global = datos_venta.get('descuento', Decimal('0.00'))

        if descuento_global < Decimal('0.00'):
            raise VentaError(
                _('El descuento global no puede ser negativo.'),
                code='venta_descuento_invalido',
            )

        totales = _VentaInventarioService.calcular_totales_proyectados(
            detalles_data,
            descuento_global,
        )

        if descuento_global > totales['subtotal']:
            raise VentaError(
                _(
                    'El descuento global no puede exceder el subtotal '
                    'de la venta.'
                ),
                code='venta_descuento_excedido',
            )

        usuario_registro = _VentaInventarioService.obtener_usuario_registro(
            datos_venta,
            usuario,
        )
        empresa = get_empresa_actual_or_default()
        EmpresaService.validar_empresa_activa(empresa)
        cliente = _VentaInventarioService.obtener_cliente(
            datos_venta.pop('cliente', None),
        )
        if cliente and cliente.empresa_id and cliente.empresa_id != empresa.id:
            raise VentaError(
                _('El cliente no pertenece a la empresa activa.'),
                code='venta_cliente_empresa_invalida',
            )
        datos_venta['empresa'] = empresa
        datos_venta['usuario_registro'] = usuario_registro
        datos_venta['cliente'] = cliente
        datos_venta.pop('detalles', None)

        _VentaInventarioService.validar_stock_detalles(detalles_data)

        venta = Venta.objects.create(**datos_venta)

        for detalle_data in detalles_data:
            detalle_creacion = detalle_data.copy()
            detalle_creacion['producto'] = Producto.objects.get(
                pk=detalle_data['producto'].pk,
                empresa=empresa,
            )
            detalle = DetalleVenta.objects.create(
                venta=venta,
                **detalle_creacion,
            )
            _VentaInventarioService.registrar_historial_salida(
                detalle=detalle,
                usuario=usuario_registro,
                motivo=_('Salida por venta %(numero)s') % {
                    'numero': venta.numero_venta,
                },
                observaciones=_(
                    'Registro automático de salida por creación de venta.'
                ),
            )

        _schedule_facturacion_electronica(venta)
        return VentaService.obtener_venta(venta.id)

    @staticmethod
    def obtener_venta(venta_id: int) -> Venta:
        try:
            return VentaService._queryset_base().get(pk=venta_id)
        except Venta.DoesNotExist as exc:
            raise VentaNoEncontradaError(venta_id) from exc

    @staticmethod
    def obtener_historial(venta_id: int) -> List[HistorialInventario]:
        VentaService.obtener_venta(venta_id)
        return list(
            HistorialInventario.objects.select_related(
                'producto',
                'usuario',
            ).filter(
                venta_id=venta_id,
            ).order_by('-fecha', '-created_at')
        )

    @staticmethod
    def listar_ventas(
        filtros: Optional[Dict[str, Any]] = None,
    ) -> List[Venta]:
        queryset = VentaService._queryset_base()

        if not filtros:
            return list(queryset.order_by('-fecha_venta'))

        q_objects = Q()

        if filtros.get('fecha_desde'):
            q_objects &= Q(
                fecha_venta__gte=_local_day_start_utc(filtros['fecha_desde']),
            )

        if filtros.get('fecha_hasta'):
            q_objects &= Q(
                fecha_venta__lt=_next_local_day_start_utc(filtros['fecha_hasta']),
            )

        if filtros.get('cliente_id'):
            q_objects &= Q(cliente_id=filtros['cliente_id'])

        if filtros.get('estado'):
            q_objects &= Q(estado=filtros['estado'])

        if filtros.get('estado_pago'):
            q_objects &= Q(estado_pago=filtros['estado_pago'])

        if filtros.get('usuario_id'):
            q_objects &= Q(usuario_registro_id=filtros['usuario_id'])

        if filtros.get('metodo_pago'):
            q_objects &= Q(metodo_pago=filtros['metodo_pago'])

        if filtros.get('q'):
            termino = filtros['q']
            q_objects &= (
                Q(numero_venta__icontains=termino) |
                Q(cliente__nombre__icontains=termino) |
                Q(cliente__numero_documento__icontains=termino) |
                Q(observaciones__icontains=termino)
            )

        if q_objects:
            queryset = queryset.filter(q_objects)

        ordering = filtros.get('ordering', '-fecha_venta')
        ordering_permitido = {
            'fecha_venta',
            '-fecha_venta',
            'total',
            '-total',
            'numero_venta',
            '-numero_venta',
            'saldo_pendiente',
            '-saldo_pendiente',
        }
        if ordering not in ordering_permitido:
            ordering = '-fecha_venta'

        return list(queryset.order_by(ordering))

    @staticmethod
    @transaction.atomic
    def actualizar_venta(
        venta_id: int,
        data: Dict[str, Any],
        usuario: Optional[Usuario] = None,
    ) -> Venta:
        venta = VentaService._obtener_venta_para_actualizar(venta_id)
        VentaService._validar_venta_editable(venta)

        datos_venta = data.copy()
        usuario_accion = usuario or venta.usuario_registro
        detalles_actuales = list(venta.detalles.all())
        detalles_data = None
        datos_venta.pop('usuario_registro', None)

        nuevo_estado = datos_venta.get('estado')
        if nuevo_estado == Venta.Estado.CANCELADA:
            raise VentaNoEditableError(
                venta.numero_venta,
                _('use cancelar_venta para anularla'),
            )

        if 'cliente' in datos_venta and datos_venta['cliente'] is None:
            datos_venta['cliente'] = Cliente.get_consumidor_final()

        if 'detalles' in datos_venta:
            detalles_data = _VentaInventarioService.normalizar_detalles(
                datos_venta.pop('detalles'),
            )
            descuento_global = datos_venta.get('descuento', venta.descuento)
            if descuento_global < Decimal('0.00'):
                raise VentaError(
                    _('El descuento global no puede ser negativo.'),
                    code='venta_descuento_invalido',
                )

            _VentaInventarioService.validar_stock_detalles(
                detalles_data,
                detalles_actuales=detalles_actuales,
            )
            totales = _VentaInventarioService.calcular_totales_proyectados(
                detalles_data,
                descuento_global,
            )
            if venta.total_abonado > totales['total']:
                raise VentaError(
                    _(
                        'El nuevo total de la venta no puede ser inferior '
                        'al valor ya abonado.'
                    ),
                    code='venta_total_menor_a_abonos',
                )

        for campo, valor in datos_venta.items():
            if hasattr(venta, campo):
                setattr(venta, campo, valor)

        if detalles_data is not None:
            for detalle in detalles_actuales:
                _VentaInventarioService.registrar_historial_entrada(
                    producto=detalle.producto,
                    cantidad=detalle.cantidad,
                    precio_unitario=detalle.precio_unitario,
                    usuario=usuario_accion,
                    motivo=_(
                        'Reversión por actualización de venta %(numero)s'
                    ) % {
                        'numero': venta.numero_venta,
                    },
                    observaciones=_(
                        'Restitución automática antes de reemplazar detalles.'
                    ),
                )
                detalle.delete()

            for detalle_data in detalles_data:
                detalle_creacion = detalle_data.copy()
                detalle_creacion['producto'] = Producto.objects.get(
                    pk=detalle_data['producto'].pk,
                    empresa=venta.empresa,
                )
                detalle = DetalleVenta.objects.create(
                    venta=venta,
                    **detalle_creacion,
                )
                _VentaInventarioService.registrar_historial_salida(
                    detalle=detalle,
                    usuario=usuario_accion,
                    motivo=_(
                        'Salida por actualización de venta %(numero)s'
                    ) % {
                        'numero': venta.numero_venta,
                    },
                    observaciones=_(
                        'Salida automática por actualización de detalles.'
                    ),
                )

        venta.save()
        _schedule_facturacion_electronica(venta)
        return VentaService.obtener_venta(venta.id)

    @staticmethod
    @transaction.atomic
    def cancelar_venta(
        venta_id: int,
        motivo: str,
        usuario: Optional[Usuario] = None,
    ) -> Venta:
        venta = VentaService._obtener_venta_para_actualizar(venta_id)
        VentaService._validar_venta_cancelable(venta)

        usuario_accion = usuario or venta.usuario_registro
        detalles = list(venta.detalles.all())

        for detalle in detalles:
            producto = Producto.objects.select_for_update().get(
                pk=detalle.producto_id,
                empresa=venta.empresa,
            )
            producto.actualizar_stock(detalle.cantidad)
            _VentaInventarioService.registrar_historial_entrada(
                producto=producto,
                cantidad=detalle.cantidad,
                precio_unitario=detalle.precio_unitario,
                usuario=usuario_accion,
                motivo=_('Cancelación de venta %(numero)s') % {
                    'numero': venta.numero_venta,
                },
                observaciones=motivo,
            )

        venta.estado = Venta.Estado.CANCELADA
        if motivo:
            observacion = venta.observaciones.strip()
            detalle_motivo = _('Cancelada: %(motivo)s') % {
                'motivo': motivo,
            }
            venta.observaciones = (
                f"{observacion}\n{detalle_motivo}".strip()
                if observacion else detalle_motivo
            )
        venta.save()

        return VentaService.obtener_venta(venta.id)

    @staticmethod
    @transaction.atomic
    def cambiar_estado(
        venta_id: int,
        nuevo_estado: str,
    ) -> Venta:
        if nuevo_estado not in Venta.Estado.values:
            raise EstadoVentaInvalidoError(nuevo_estado)

        if nuevo_estado == Venta.Estado.CANCELADA:
            raise EstadoVentaInvalidoError(nuevo_estado)

        venta = VentaService._obtener_venta_para_actualizar(venta_id)
        VentaService._validar_venta_editable(venta)

        venta.estado = nuevo_estado
        venta.save()
        _schedule_facturacion_electronica(venta)
        return VentaService.obtener_venta(venta.id)

    @staticmethod
    @transaction.atomic
    def eliminar_venta(
        venta_id: int,
        usuario: Optional[Usuario] = None,
    ) -> None:
        venta = VentaService._obtener_venta_para_actualizar(venta_id)
        VentaService._validar_venta_cancelable(venta)

        usuario_accion = usuario or venta.usuario_registro
        detalles = list(venta.detalles.select_related('producto'))

        for detalle in detalles:
            _VentaInventarioService.registrar_historial_entrada(
                producto=detalle.producto,
                cantidad=detalle.cantidad,
                precio_unitario=detalle.precio_unitario,
                usuario=usuario_accion,
                motivo=_('EliminaciÃ³n de venta %(numero)s') % {
                    'numero': venta.numero_venta,
                },
                observaciones=_(
                    'RestituciÃ³n automÃ¡tica por eliminaciÃ³n de venta.'
                ),
            )

        venta.delete()


class AbonoService:
    """
    Servicio de negocio para pagos parciales a ventas.
    """

    @staticmethod
    def _queryset_base():
        return Abono.objects.select_related(
            'venta',
            'venta__cliente',
            'usuario_registro',
        )

    @staticmethod
    @transaction.atomic
    def registrar_abono(
        venta_id: int,
        data: Dict[str, Any],
        usuario: Optional[Usuario] = None,
    ) -> Abono:
        venta = VentaService._obtener_venta_para_actualizar(venta_id)
        datos_abono = data.copy()
        datos_abono['venta'] = venta
        datos_abono['usuario_registro'] = (
            _VentaInventarioService.obtener_usuario_registro(
                datos_abono,
                usuario,
            )
            if usuario or datos_abono.get('usuario_registro')
            else venta.usuario_registro
        )

        try:
            abono = Abono(**datos_abono)
            abono.full_clean()
            abono.save()
        except DjangoValidationError as exc:
            mensajes = []
            for errores in exc.message_dict.values():
                mensajes.extend(errores)
            raise AbonoNoPermitidoError(' '.join(mensajes)) from exc

        return Abono.objects.select_related(
            'venta',
            'usuario_registro',
        ).get(pk=abono.pk)

    @staticmethod
    def obtener_abonos_venta(venta_id: int) -> List[Abono]:
        VentaService.obtener_venta(venta_id)
        return list(
            AbonoService._queryset_base().filter(
                venta_id=venta_id,
            ).order_by('-fecha_abono')
        )

    @staticmethod
    def listar_abonos(
        filtros: Optional[Dict[str, Any]] = None,
    ) -> List[Abono]:
        queryset = AbonoService._queryset_base()

        if filtros:
            if filtros.get('venta_id'):
                queryset = queryset.filter(venta_id=filtros['venta_id'])
            if filtros.get('usuario_id'):
                queryset = queryset.filter(
                    usuario_registro_id=filtros['usuario_id'],
                )
            if filtros.get('metodo_pago'):
                queryset = queryset.filter(
                    metodo_pago=filtros['metodo_pago'],
                )
            if filtros.get('fecha_desde'):
                queryset = queryset.filter(
                    fecha_abono__date__gte=filtros['fecha_desde'],
                )
            if filtros.get('fecha_hasta'):
                queryset = queryset.filter(
                    fecha_abono__date__lte=filtros['fecha_hasta'],
                )
            if filtros.get('q'):
                termino = filtros['q']
                queryset = queryset.filter(
                    Q(venta__numero_venta__icontains=termino) |
                    Q(referencia_pago__icontains=termino) |
                    Q(observaciones__icontains=termino)
                )

        return list(queryset.order_by('-fecha_abono'))

    @staticmethod
    def obtener_abono(abono_id: int) -> Abono:
        try:
            return AbonoService._queryset_base().get(pk=abono_id)
        except Abono.DoesNotExist as exc:
            raise AbonoNoEncontradoError(abono_id) from exc

    @staticmethod
    def obtener_cuentas_por_cobrar(
        filtros: Optional[Dict[str, Any]] = None,
    ) -> List[Venta]:
        queryset = VentaService._queryset_base().filter(
            estado=Venta.Estado.TERMINADA,
            saldo_pendiente__gt=Decimal('0.00'),
        )

        if filtros:
            if filtros.get('cliente_id'):
                queryset = queryset.filter(cliente_id=filtros['cliente_id'])
            if filtros.get('usuario_id'):
                queryset = queryset.filter(
                    usuario_registro_id=filtros['usuario_id'],
                )
            if filtros.get('fecha_desde'):
                queryset = queryset.filter(
                    fecha_venta__date__gte=filtros['fecha_desde'],
                )
            if filtros.get('fecha_hasta'):
                queryset = queryset.filter(
                    fecha_venta__date__lte=filtros['fecha_hasta'],
                )
            if filtros.get('q'):
                termino = filtros['q']
                queryset = queryset.filter(
                    Q(numero_venta__icontains=termino) |
                    Q(cliente__nombre__icontains=termino) |
                    Q(cliente__numero_documento__icontains=termino)
                )

        return list(queryset.order_by('-fecha_venta'))

    @staticmethod
    def calcular_total_por_cobrar() -> Decimal:
        total = Venta.objects.filter(
            empresa=get_empresa_actual_or_default(),
            estado=Venta.Estado.TERMINADA,
            saldo_pendiente__gt=Decimal('0.00'),
        ).aggregate(
            total=Coalesce(
                Sum('saldo_pendiente'),
                Decimal('0.00'),
                output_field=DecimalField(
                    max_digits=12,
                    decimal_places=2,
                ),
            ),
        )['total']
        return total.quantize(QUANTIZER)


class VentaReporteService:
    """
    Servicio para consultas y estadísticas del dominio de ventas.
    """

    @staticmethod
    def _queryset_reportes():
        return VentaService._queryset_base().exclude(
            estado=Venta.Estado.CANCELADA,
        )

    @staticmethod
    def _resolver_filtro_periodo(periodo: Any) -> Dict[str, date]:
        hoy = timezone.localdate()

        if isinstance(periodo, dict):
            fecha_inicio = periodo.get('fecha_inicio')
            fecha_fin = periodo.get('fecha_fin')
            if not fecha_inicio or not fecha_fin:
                raise VentaError(
                    _(
                        'El período personalizado requiere fecha_inicio '
                        'y fecha_fin.'
                    ),
                    code='periodo_invalido',
                )
            return {
                'fecha_inicio': fecha_inicio,
                'fecha_fin': fecha_fin,
            }

        if periodo == 'hoy':
            return {'fecha_inicio': hoy, 'fecha_fin': hoy}

        if periodo == 'semana':
            inicio = hoy - timedelta(days=hoy.weekday())
            return {'fecha_inicio': inicio, 'fecha_fin': hoy}

        if periodo == 'mes':
            inicio = hoy.replace(day=1)
            return {'fecha_inicio': inicio, 'fecha_fin': hoy}

        if periodo == 'anio':
            inicio = hoy.replace(month=1, day=1)
            return {'fecha_inicio': inicio, 'fecha_fin': hoy}

        raise VentaError(
            _('El período solicitado no es válido.'),
            code='periodo_invalido',
        )

    @staticmethod
    def ventas_por_periodo(
        fecha_inicio: date,
        fecha_fin: date,
    ) -> List[Venta]:
        return list(
            VentaReporteService._queryset_reportes().filter(
                fecha_venta__date__gte=fecha_inicio,
                fecha_venta__date__lte=fecha_fin,
            ).order_by('-fecha_venta')
        )

    @staticmethod
    def ventas_por_producto(
        producto_id: int,
        fecha_inicio: Optional[date] = None,
        fecha_fin: Optional[date] = None,
    ) -> List[DetalleVenta]:
        empresa = get_empresa_actual_or_default()
        try:
            Producto.objects.get(pk=producto_id, empresa=empresa)
        except Producto.DoesNotExist as exc:
            raise ProductoNoEncontradoError(producto_id) from exc

        queryset = DetalleVenta.objects.select_related(
            'producto',
            'venta',
            'venta__cliente',
            'venta__usuario_registro',
        ).exclude(
            venta__estado=Venta.Estado.CANCELADA,
        ).filter(
            producto_id=producto_id,
            venta__empresa=empresa,
        )

        if fecha_inicio:
            queryset = queryset.filter(venta__fecha_venta__date__gte=fecha_inicio)
        if fecha_fin:
            queryset = queryset.filter(venta__fecha_venta__date__lte=fecha_fin)

        return list(queryset.order_by('-venta__fecha_venta'))

    @staticmethod
    def ventas_por_cliente(cliente_id: int) -> List[Venta]:
        empresa = get_empresa_actual_or_default()
        if not Cliente.objects.filter(pk=cliente_id, empresa=empresa).exists():
            raise VentaError(
                _('El cliente solicitado no existe.'),
                code='cliente_no_encontrado',
            )

        return list(
            VentaService._queryset_base().filter(
                cliente_id=cliente_id,
            ).order_by('-fecha_venta')
        )

    @staticmethod
    def calcular_estadisticas_ventas(periodo: Any) -> Dict[str, Any]:
        fechas = VentaReporteService._resolver_filtro_periodo(periodo)
        queryset = VentaReporteService._queryset_reportes().filter(
            estado=Venta.Estado.TERMINADA,
            fecha_venta__date__gte=fechas['fecha_inicio'],
            fecha_venta__date__lte=fechas['fecha_fin'],
        )

        agregados = queryset.aggregate(
            total_ventas=Count('id'),
            subtotal=Coalesce(
                Sum('subtotal'),
                Decimal('0.00'),
                output_field=DecimalField(max_digits=12, decimal_places=2),
            ),
            impuestos=Coalesce(
                Sum('impuestos'),
                Decimal('0.00'),
                output_field=DecimalField(max_digits=12, decimal_places=2),
            ),
            ingresos=Coalesce(
                Sum('total'),
                Decimal('0.00'),
                output_field=DecimalField(max_digits=12, decimal_places=2),
            ),
            total_abonado=Coalesce(
                Sum('total_abonado'),
                Decimal('0.00'),
                output_field=DecimalField(max_digits=12, decimal_places=2),
            ),
            saldo_pendiente=Coalesce(
                Sum('saldo_pendiente'),
                Decimal('0.00'),
                output_field=DecimalField(max_digits=12, decimal_places=2),
            ),
        )

        detalles = DetalleVenta.objects.filter(
            venta__in=queryset,
        ).aggregate(
            items_vendidos=Count('id'),
            unidades_vendidas=Coalesce(
                Sum('cantidad'),
                Decimal('0.00'),
                output_field=DecimalField(max_digits=12, decimal_places=2),
            ),
        )

        total_ventas = agregados['total_ventas'] or 0
        ingresos = agregados['ingresos'].quantize(QUANTIZER)
        ticket_promedio = Decimal('0.00')
        if total_ventas:
            ticket_promedio = (
                ingresos / Decimal(str(total_ventas))
            ).quantize(QUANTIZER)

        return {
            'fecha_inicio': fechas['fecha_inicio'],
            'fecha_fin': fechas['fecha_fin'],
            'total_ventas': total_ventas,
            'subtotal': agregados['subtotal'].quantize(QUANTIZER),
            'impuestos': agregados['impuestos'].quantize(QUANTIZER),
            'ingresos': ingresos,
            'total_abonado': agregados['total_abonado'].quantize(QUANTIZER),
            'saldo_pendiente': agregados['saldo_pendiente'].quantize(
                QUANTIZER
            ),
            'ticket_promedio': ticket_promedio,
            'items_vendidos': detalles['items_vendidos'] or 0,
            'unidades_vendidas': detalles['unidades_vendidas'].quantize(
                QUANTIZER
            ),
        }
