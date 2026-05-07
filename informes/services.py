from datetime import date, datetime, time, timedelta, timezone as dt_timezone
from decimal import Decimal, InvalidOperation
from typing import Any, Dict, List, Optional
from zoneinfo import ZoneInfo

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.db.models import (
    Avg,
    Count,
    DecimalField,
    ExpressionWrapper,
    F,
    Max,
    Min,
    Q,
    Sum,
)
from django.db.models.functions import Coalesce, TruncDate, TruncMonth
from django.utils.functional import Promise
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from core.exceptions import (
    CierreCajaDuplicadoError,
    CierreCajaNoEncontradoError,
    InformeError,
    InformeNoEncontradoError,
    RangoFechasInvalidoError,
)
from cliente.models import Cliente
from empresa.context import get_empresa_actual_or_default
from inventario.models import FacturaCompra
from inventario.models import Producto
from usuario.models import Usuario
from ventas.models import DetalleVenta, Venta

from .models import CierreCaja, Informe


ZERO = Decimal('0.00')
QUANTIZER = Decimal('0.01')
MANUAL_GASTO_KEYS = (
    'servicios_publicos',
    'arriendos',
    'salarios',
    'otros_gastos',
)
BUSINESS_TIMEZONE = ZoneInfo('America/Bogota')
MONTH_LABELS = (
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre',
)


def _local_day_start_utc(target_date: date) -> datetime:
    local_start = datetime.combine(
        target_date,
        time.min,
        tzinfo=BUSINESS_TIMEZONE,
    )
    return local_start.astimezone(dt_timezone.utc)


def _next_local_day_start_utc(target_date: date) -> datetime:
    return _local_day_start_utc(target_date + timedelta(days=1))


class CierreCajaService:
    """
    Servicio de negocio para la gestion de cierres de caja.

    Centraliza la generacion automatica de cierres diarios, el
    recalculo de gastos operativos y los ajustes manuales del cierre.
    """

    @staticmethod
    def _queryset_base():
        return CierreCaja.objects.select_related('usuario_cierre').filter(
            empresa=get_empresa_actual_or_default(),
        )

    @staticmethod
    def _coerce_decimal(value: Any) -> Decimal:
        if value in (None, '', [], {}):
            return ZERO

        if isinstance(value, Decimal):
            return value

        try:
            return Decimal(str(value))
        except (InvalidOperation, TypeError, ValueError):
            return ZERO

    @staticmethod
    def _quantize(value: Decimal) -> Decimal:
        return (value or ZERO).quantize(QUANTIZER)

    @staticmethod
    def _parse_date(value: Any, field_name: str) -> date:
        if isinstance(value, datetime):
            if timezone.is_aware(value):
                return timezone.localtime(value).date()
            return value.date()

        if isinstance(value, date):
            return value

        if isinstance(value, str):
            try:
                return date.fromisoformat(value)
            except ValueError as exc:
                raise InformeError(
                    _(
                        'El campo %(campo)s debe tener una fecha valida.'
                    ) % {
                        'campo': field_name,
                    },
                    code='fecha_invalida',
                ) from exc

        raise InformeError(
            _(
                'El campo %(campo)s debe ser una fecha valida.'
            ) % {
                'campo': field_name,
            },
            code='fecha_invalida',
        )

    @staticmethod
    def _parse_decimal(value: Any, field_name: str) -> Decimal:
        try:
            decimal_value = Decimal(str(value))
        except (InvalidOperation, TypeError, ValueError) as exc:
            raise InformeError(
                _(
                    'El campo %(campo)s debe ser numerico.'
                ) % {
                    'campo': field_name,
                },
                code='decimal_invalido',
            ) from exc

        decimal_value = decimal_value.quantize(QUANTIZER)

        if decimal_value < ZERO:
            raise InformeError(
                _(
                    'El campo %(campo)s no puede ser negativo.'
                ) % {
                    'campo': field_name,
                },
                code='decimal_negativo',
            )

        return decimal_value

    @staticmethod
    def _resolve_usuario(usuario: Any) -> Optional[Usuario]:
        if usuario is None:
            return None

        if isinstance(usuario, Usuario):
            return usuario

        try:
            return Usuario.objects.get(pk=usuario)
        except Usuario.DoesNotExist as exc:
            raise InformeError(
                _('El usuario de cierre indicado no existe.'),
                code='usuario_cierre_invalido',
            ) from exc

    @staticmethod
    def _validar_rango_fechas(
        fecha_inicio: date,
        fecha_fin: date,
    ) -> None:
        if fecha_inicio > fecha_fin:
            raise RangoFechasInvalidoError(fecha_inicio, fecha_fin)

    @staticmethod
    def _combine_validation_error_messages(
        exc: DjangoValidationError,
    ) -> str:
        mensajes = []

        if hasattr(exc, 'message_dict'):
            for errores in exc.message_dict.values():
                mensajes.extend(errores)
        elif hasattr(exc, 'messages'):
            mensajes.extend(exc.messages)
        else:
            mensajes.append(str(exc))

        return ' '.join(mensajes).strip()

    @staticmethod
    def _to_json_safe(value: Any) -> Any:
        if isinstance(value, Promise):
            return str(value)

        if isinstance(value, Decimal):
            return float(CierreCajaService._quantize(value))

        if isinstance(value, datetime):
            return value.isoformat()

        if isinstance(value, date):
            return value.isoformat()

        if isinstance(value, dict):
            return {
                key: CierreCajaService._to_json_safe(data)
                for key, data in value.items()
            }

        if isinstance(value, list):
            return [
                CierreCajaService._to_json_safe(item)
                for item in value
            ]

        if isinstance(value, tuple):
            return [
                CierreCajaService._to_json_safe(item)
                for item in value
            ]

        return value

    @staticmethod
    def _obtener_cierre_para_actualizar(cierre_id: int) -> CierreCaja:
        try:
            return CierreCajaService._queryset_base().select_for_update().get(
                pk=cierre_id,
            )
        except CierreCaja.DoesNotExist as exc:
            raise CierreCajaNoEncontradoError(cierre_id) from exc

    @staticmethod
    def _obtener_facturas_periodo(
        fecha_inicio: date,
        fecha_fin: date,
    ):
        return FacturaCompra.objects.select_related(
            'proveedor',
            'usuario_registro',
        ).filter(
            empresa=get_empresa_actual_or_default(),
            fecha_factura__gte=fecha_inicio,
            fecha_factura__lte=fecha_fin,
        )

    @staticmethod
    def _construir_detalle_facturas(
        facturas: List[FacturaCompra],
    ) -> List[Dict[str, Any]]:
        detalles = []

        for factura in facturas:
            detalles.append({
                'factura_id': factura.id,
                'numero_factura': factura.numero_factura,
                'fecha_factura': factura.fecha_factura.isoformat(),
                'proveedor': (
                    factura.proveedor.razon_social
                    if factura.proveedor else ''
                ),
                'estado': factura.estado,
                'total': float(
                    CierreCajaService._quantize(factura.total),
                ),
            })

        return detalles

    @staticmethod
    def _calcular_compras_mercancia_periodo(
        fecha_inicio: date,
        fecha_fin: date,
    ) -> Dict[str, Any]:
        facturas_qs = CierreCajaService._obtener_facturas_periodo(
            fecha_inicio,
            fecha_fin,
        )
        facturas = list(
            facturas_qs.order_by('fecha_factura', 'numero_factura'),
        )
        total = facturas_qs.aggregate(
            total=Coalesce(
                Sum('total'),
                ZERO,
                output_field=DecimalField(
                    max_digits=12,
                    decimal_places=2,
                ),
            ),
        )['total']

        return {
            'monto': CierreCajaService._quantize(total),
            'detalle': CierreCajaService._construir_detalle_facturas(
                facturas,
            ),
        }

    @staticmethod
    def _extraer_total_gasto(data: Any) -> Decimal:
        if isinstance(data, dict):
            for key in ('valor', 'monto', 'total'):
                if key in data:
                    return CierreCajaService._coerce_decimal(data.get(key))

            return sum(
                (
                    CierreCajaService._extraer_total_gasto(valor)
                    for valor in data.values()
                ),
                start=ZERO,
            )

        if isinstance(data, list):
            return sum(
                (
                    CierreCajaService._extraer_total_gasto(item)
                    for item in data
                ),
                start=ZERO,
            )

        return CierreCajaService._coerce_decimal(data)

    @staticmethod
    def _normalizar_detalle_gasto(data: Any) -> List[Any]:
        if isinstance(data, dict):
            detalle = data.get('detalle', data.get('detalles', []))
            if isinstance(detalle, list):
                return detalle
            if detalle in (None, ''):
                return []
            return [detalle]

        if isinstance(data, list):
            return data

        return []

    @staticmethod
    def _normalizar_gasto_manual(raw_value: Any) -> Dict[str, Any]:
        monto = CierreCajaService._quantize(
            CierreCajaService._extraer_total_gasto(raw_value),
        )
        gasto = {
            'monto': monto,
            'detalle': CierreCajaService._normalizar_detalle_gasto(
                raw_value,
            ),
        }

        if isinstance(raw_value, dict) and raw_value.get('descripcion'):
            gasto['descripcion'] = str(raw_value['descripcion'])

        return gasto

    @staticmethod
    def _serializar_gasto(gasto: Dict[str, Any]) -> Dict[str, Any]:
        serializado = {
            'monto': float(CierreCajaService._quantize(gasto['monto'])),
            'detalle': CierreCajaService._to_json_safe(
                gasto.get('detalle', []),
            ),
        }

        if gasto.get('descripcion'):
            serializado['descripcion'] = gasto['descripcion']

        return serializado

    @staticmethod
    def _construir_gastos_operativos(
        fecha_cierre: date,
        gastos_operativos: Optional[Dict[str, Any]] = None,
        gastos_existentes: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        compras = CierreCajaService._calcular_compras_mercancia_periodo(
            fecha_cierre,
            fecha_cierre,
        )

        gastos_normalizados: Dict[str, Any] = {
            'compras_mercancia': compras,
        }
        total = compras['monto']
        gastos_input = (
            gastos_operativos
            if isinstance(gastos_operativos, dict) else {}
        )
        gastos_previos = (
            gastos_existentes
            if isinstance(gastos_existentes, dict) else {}
        )

        for key in MANUAL_GASTO_KEYS:
            raw_value = (
                gastos_input[key]
                if key in gastos_input else gastos_previos.get(key, {})
            )
            gasto = CierreCajaService._normalizar_gasto_manual(raw_value)
            gastos_normalizados[key] = gasto
            total += gasto['monto']

        gastos_normalizados['total'] = CierreCajaService._quantize(total)
        return gastos_normalizados

    @staticmethod
    def _serializar_gastos_operativos(
        gastos_operativos: Dict[str, Any],
    ) -> Dict[str, Any]:
        serializado = {
            'compras_mercancia': {
                'monto': float(
                    CierreCajaService._quantize(
                        gastos_operativos['compras_mercancia']['monto'],
                    ),
                ),
                'detalle': CierreCajaService._to_json_safe(
                    gastos_operativos['compras_mercancia'].get(
                        'detalle',
                        [],
                    ),
                ),
            },
        }

        for key in MANUAL_GASTO_KEYS:
            serializado[key] = CierreCajaService._serializar_gasto(
                gastos_operativos[key],
            )

        serializado['total'] = float(
            CierreCajaService._quantize(gastos_operativos['total']),
        )
        return serializado

    @staticmethod
    def _acumular_gastos_manuales_desde_cierres(
        cierres: List[CierreCaja],
    ) -> Dict[str, Dict[str, Any]]:
        acumulados = {
            key: {
                'monto': ZERO,
                'detalle': [],
            }
            for key in MANUAL_GASTO_KEYS
        }

        for cierre in cierres:
            gastos_operativos = (
                cierre.gastos_operativos
                if isinstance(cierre.gastos_operativos, dict) else {}
            )
            for key in MANUAL_GASTO_KEYS:
                raw_value = gastos_operativos.get(key, {})
                gasto = CierreCajaService._normalizar_gasto_manual(raw_value)
                acumulados[key]['monto'] += gasto['monto']
                if gasto['monto'] > ZERO or gasto['detalle']:
                    acumulados[key]['detalle'].append({
                        'cierre_id': cierre.id,
                        'fecha_cierre': cierre.fecha_cierre.isoformat(),
                        'monto': CierreCajaService._quantize(
                            gasto['monto'],
                        ),
                        'detalle': gasto['detalle'],
                    })

        for key in MANUAL_GASTO_KEYS:
            acumulados[key]['monto'] = CierreCajaService._quantize(
                acumulados[key]['monto'],
            )

        return acumulados

    @staticmethod
    @transaction.atomic
    def generar_cierre_caja(
        fecha: Any,
        efectivo_real: Any,
        usuario_cierre: Any = None,
        gastos_operativos: Optional[Dict[str, Any]] = None,
        observaciones: Optional[str] = None,
    ) -> CierreCaja:
        fecha_cierre = CierreCajaService._parse_date(fecha, 'fecha')
        efectivo_real_decimal = CierreCajaService._parse_decimal(
            efectivo_real,
            'efectivo_real',
        )
        usuario_obj = CierreCajaService._resolve_usuario(usuario_cierre)
        cierre = CierreCaja.objects.select_for_update().filter(
            empresa=get_empresa_actual_or_default(),
            fecha_cierre=fecha_cierre,
        ).first()

        if cierre is None and usuario_obj is None:
            raise InformeError(
                _('El cierre de caja requiere un usuario responsable.'),
                code='usuario_cierre_requerido',
            )

        gastos_normalizados = CierreCajaService._construir_gastos_operativos(
            fecha_cierre=fecha_cierre,
            gastos_operativos=gastos_operativos,
            gastos_existentes=(
                cierre.gastos_operativos if cierre else None
            ),
        )

        if cierre is None:
            cierre = CierreCaja(
                fecha_cierre=fecha_cierre,
                usuario_cierre=usuario_obj,
            )
        else:
            cierre.usuario_cierre = usuario_obj or cierre.usuario_cierre

        cierre.efectivo_real = efectivo_real_decimal
        cierre.gastos_operativos = (
            CierreCajaService._serializar_gastos_operativos(
                gastos_normalizados,
            )
        )

        if observaciones is not None:
            cierre.observaciones = observaciones
        elif cierre.pk is None:
            cierre.observaciones = ''

        try:
            cierre.save()
        except DjangoValidationError as exc:
            raise InformeError(
                CierreCajaService._combine_validation_error_messages(exc),
                code='cierre_caja_invalido',
            ) from exc

        return CierreCajaService.obtener_detalle_cierre(cierre.id)

    @staticmethod
    def obtener_cierres(
        filtros: Optional[Dict[str, Any]] = None,
    ) -> List[CierreCaja]:
        queryset = CierreCajaService._queryset_base()

        if not filtros:
            return list(queryset.order_by('-fecha_cierre', '-fecha_registro'))

        q_objects = Q()
        fecha_desde = None
        fecha_hasta = None

        if filtros.get('fecha_desde'):
            fecha_desde = CierreCajaService._parse_date(
                filtros['fecha_desde'],
                'fecha_desde',
            )
            q_objects &= Q(fecha_cierre__gte=fecha_desde)

        if filtros.get('fecha_hasta'):
            fecha_hasta = CierreCajaService._parse_date(
                filtros['fecha_hasta'],
                'fecha_hasta',
            )
            q_objects &= Q(fecha_cierre__lte=fecha_hasta)

        if fecha_desde and fecha_hasta:
            CierreCajaService._validar_rango_fechas(
                fecha_desde,
                fecha_hasta,
            )

        if filtros.get('usuario_id'):
            q_objects &= Q(usuario_cierre_id=filtros['usuario_id'])

        if filtros.get('diferencia_min') is not None:
            q_objects &= Q(
                diferencia__gte=CierreCajaService._parse_decimal(
                    filtros['diferencia_min'],
                    'diferencia_min',
                ),
            )

        if filtros.get('diferencia_max') is not None:
            q_objects &= Q(
                diferencia__lte=CierreCajaService._parse_decimal(
                    filtros['diferencia_max'],
                    'diferencia_max',
                ),
            )

        if filtros.get('q'):
            termino = str(filtros['q']).strip()
            q_objects &= (
                Q(observaciones__icontains=termino) |
                Q(usuario_cierre__username__icontains=termino) |
                Q(usuario_cierre__first_name__icontains=termino) |
                Q(usuario_cierre__last_name__icontains=termino)
            )

        if q_objects:
            queryset = queryset.filter(q_objects)

        ordering = filtros.get('ordering', '-fecha_cierre')
        ordering_permitido = {
            'fecha_cierre',
            '-fecha_cierre',
            'fecha_registro',
            '-fecha_registro',
            'diferencia',
            '-diferencia',
            'total_ventas',
            '-total_ventas',
        }
        if ordering not in ordering_permitido:
            ordering = '-fecha_cierre'

        return list(queryset.order_by(ordering))

    @staticmethod
    def obtener_detalle_cierre(cierre_id: int) -> CierreCaja:
        try:
            return CierreCajaService._queryset_base().get(pk=cierre_id)
        except CierreCaja.DoesNotExist as exc:
            raise CierreCajaNoEncontradoError(cierre_id) from exc

    @staticmethod
    @transaction.atomic
    def modificar_cierre(
        cierre_id: int,
        data: Dict[str, Any],
    ) -> CierreCaja:
        cierre = CierreCajaService._obtener_cierre_para_actualizar(cierre_id)

        fecha_cierre = (
            CierreCajaService._parse_date(
                data['fecha_cierre'],
                'fecha_cierre',
            )
            if 'fecha_cierre' in data else cierre.fecha_cierre
        )

        if CierreCaja.objects.exclude(pk=cierre.pk).filter(
            empresa=get_empresa_actual_or_default(),
            fecha_cierre=fecha_cierre,
        ).exists():
            raise CierreCajaDuplicadoError(fecha_cierre)

        usuario_cierre = (
            CierreCajaService._resolve_usuario(data.get('usuario_cierre'))
            if 'usuario_cierre' in data else cierre.usuario_cierre
        )
        if usuario_cierre is None:
            raise InformeError(
                _('El cierre de caja requiere un usuario responsable.'),
                code='usuario_cierre_requerido',
            )

        efectivo_real = (
            CierreCajaService._parse_decimal(
                data['efectivo_real'],
                'efectivo_real',
            )
            if 'efectivo_real' in data else cierre.efectivo_real
        )
        gastos_normalizados = CierreCajaService._construir_gastos_operativos(
            fecha_cierre=fecha_cierre,
            gastos_operativos=data.get('gastos_operativos'),
            gastos_existentes=cierre.gastos_operativos,
        )

        cierre.fecha_cierre = fecha_cierre
        cierre.usuario_cierre = usuario_cierre
        cierre.efectivo_real = efectivo_real
        cierre.gastos_operativos = (
            CierreCajaService._serializar_gastos_operativos(
                gastos_normalizados,
            )
        )

        if 'observaciones' in data:
            cierre.observaciones = data.get('observaciones', '')

        try:
            cierre.save()
        except DjangoValidationError as exc:
            raise InformeError(
                CierreCajaService._combine_validation_error_messages(exc),
                code='cierre_caja_invalido',
            ) from exc

        return CierreCajaService.obtener_detalle_cierre(cierre.id)

    @staticmethod
    def calcular_gastos_periodo(
        fecha_inicio: Any,
        fecha_fin: Any,
    ) -> Dict[str, Any]:
        fecha_inicio_date = CierreCajaService._parse_date(
            fecha_inicio,
            'fecha_inicio',
        )
        fecha_fin_date = CierreCajaService._parse_date(
            fecha_fin,
            'fecha_fin',
        )
        CierreCajaService._validar_rango_fechas(
            fecha_inicio_date,
            fecha_fin_date,
        )

        compras_mercancia = (
            CierreCajaService._calcular_compras_mercancia_periodo(
                fecha_inicio_date,
                fecha_fin_date,
            )
        )
        cierres = list(
            CierreCajaService._queryset_base().filter(
                fecha_cierre__gte=fecha_inicio_date,
                fecha_cierre__lte=fecha_fin_date,
            ).order_by('fecha_cierre')
        )
        gastos_manuales = (
            CierreCajaService._acumular_gastos_manuales_desde_cierres(
                cierres,
            )
        )
        total = compras_mercancia['monto']

        for key in MANUAL_GASTO_KEYS:
            total += gastos_manuales[key]['monto']

        return {
            'fecha_inicio': fecha_inicio_date,
            'fecha_fin': fecha_fin_date,
            'compras_mercancia': compras_mercancia,
            'servicios_publicos': gastos_manuales['servicios_publicos'],
            'arriendos': gastos_manuales['arriendos'],
            'salarios': gastos_manuales['salarios'],
            'otros_gastos': gastos_manuales['otros_gastos'],
            'total': CierreCajaService._quantize(total),
        }


class ReporteEstadisticasService:
    """
    Servicio para estadisticas y reportes transversales del negocio.

    Entrega datos agregados y series listas para visualizacion en el
    frontend, reutilizando consultas optimizadas sobre ventas,
    productos, clientes e inventario.
    """

    @staticmethod
    def _quantize(value: Decimal) -> Decimal:
        return (value or ZERO).quantize(QUANTIZER)

    @staticmethod
    def _safe_percentage(
        current_value: Decimal,
        previous_value: Decimal,
    ) -> Optional[float]:
        if previous_value == ZERO:
            return None

        variacion = (
            (current_value - previous_value) / previous_value
        ) * Decimal('100')
        return float(ReporteEstadisticasService._quantize(variacion))

    @staticmethod
    def _safe_ticket(total: Decimal, cantidad: int) -> Decimal:
        if cantidad <= 0:
            return ZERO
        return ReporteEstadisticasService._quantize(
            total / Decimal(str(cantidad)),
        )

    @staticmethod
    def _parse_date(value: Any, field_name: str) -> date:
        if isinstance(value, datetime):
            if timezone.is_aware(value):
                return timezone.localtime(value).date()
            return value.date()

        if isinstance(value, date):
            return value

        if isinstance(value, str):
            try:
                return date.fromisoformat(value)
            except ValueError as exc:
                raise InformeError(
                    _(
                        'El campo %(campo)s debe tener una fecha valida.'
                    ) % {
                        'campo': field_name,
                    },
                    code='fecha_invalida',
                ) from exc

        raise InformeError(
            _(
                'El campo %(campo)s debe ser una fecha valida.'
            ) % {
                'campo': field_name,
            },
            code='fecha_invalida',
        )

    @staticmethod
    def _parse_positive_int(value: Any, field_name: str) -> int:
        try:
            parsed_value = int(value)
        except (TypeError, ValueError) as exc:
            raise InformeError(
                _(
                    'El campo %(campo)s debe ser un entero valido.'
                ) % {
                    'campo': field_name,
                },
                code='entero_invalido',
            ) from exc

        if parsed_value <= 0:
            raise InformeError(
                _(
                    'El campo %(campo)s debe ser mayor que cero.'
                ) % {
                    'campo': field_name,
                },
                code='entero_no_positivo',
            )

        return parsed_value

    @staticmethod
    def _validar_rango_fechas(
        fecha_inicio: date,
        fecha_fin: date,
    ) -> None:
        if fecha_inicio > fecha_fin:
            raise RangoFechasInvalidoError(fecha_inicio, fecha_fin)

    @staticmethod
    def _ventas_queryset_periodo(
        fecha_inicio: date,
        fecha_fin: date,
    ):
        ReporteEstadisticasService._validar_rango_fechas(
            fecha_inicio,
            fecha_fin,
        )
        return Venta.objects.filter(
            empresa=get_empresa_actual_or_default(),
            estado=Venta.Estado.TERMINADA,
            fecha_venta__gte=_local_day_start_utc(fecha_inicio),
            fecha_venta__lt=_next_local_day_start_utc(fecha_fin),
        )

    @staticmethod
    def _detalles_queryset_periodo(
        fecha_inicio: date,
        fecha_fin: date,
    ):
        return DetalleVenta.objects.filter(
            venta__in=ReporteEstadisticasService._ventas_queryset_periodo(
                fecha_inicio,
                fecha_fin,
            ),
        )

    @staticmethod
    def _generar_rango_fechas(
        fecha_inicio: date,
        fecha_fin: date,
    ) -> List[date]:
        dias = (fecha_fin - fecha_inicio).days
        return [
            fecha_inicio + timedelta(days=offset)
            for offset in range(dias + 1)
        ]

    @staticmethod
    def _cliente_nombre_desde_registro(registro: Dict[str, Any]) -> str:
        return (
            registro.get('cliente__razon_social')
            or registro.get('cliente__nombre')
            or registro.get('cliente__nombre_comercial')
            or _('Cliente sin nombre')
        )

    @staticmethod
    def _comparacion_metricas(
        actual: Decimal,
        anterior: Decimal,
    ) -> Dict[str, Any]:
        diferencia = ReporteEstadisticasService._quantize(actual - anterior)
        return {
            'actual': float(ReporteEstadisticasService._quantize(actual)),
            'anterior': float(ReporteEstadisticasService._quantize(anterior)),
            'variacion_absoluta': float(diferencia),
            'variacion_porcentual': (
                ReporteEstadisticasService._safe_percentage(
                    actual,
                    anterior,
                )
            ),
        }

    @staticmethod
    def estadisticas_ventas_periodo(
        fecha_inicio: Any,
        fecha_fin: Any,
    ) -> Dict[str, Any]:
        """
        Retorna estadisticas generales de ventas en un periodo.
        """
        fecha_inicio_date = ReporteEstadisticasService._parse_date(
            fecha_inicio,
            'fecha_inicio',
        )
        fecha_fin_date = ReporteEstadisticasService._parse_date(
            fecha_fin,
            'fecha_fin',
        )
        ventas_qs = ReporteEstadisticasService._ventas_queryset_periodo(
            fecha_inicio_date,
            fecha_fin_date,
        )
        agregados = ventas_qs.aggregate(
            total_ventas=Coalesce(
                Sum('total'),
                ZERO,
                output_field=DecimalField(
                    max_digits=14,
                    decimal_places=2,
                ),
            ),
            cantidad_ventas=Count('id'),
        )
        total_ventas = ReporteEstadisticasService._quantize(
            agregados['total_ventas'],
        )
        cantidad_ventas = agregados['cantidad_ventas']
        ticket_promedio = ReporteEstadisticasService._safe_ticket(
            total_ventas,
            cantidad_ventas,
        )

        dias_periodo = (fecha_fin_date - fecha_inicio_date).days + 1
        fecha_fin_anterior = fecha_inicio_date - timedelta(days=1)
        fecha_inicio_anterior = (
            fecha_fin_anterior - timedelta(days=dias_periodo - 1)
        )
        ventas_anterior_qs = (
            ReporteEstadisticasService._ventas_queryset_periodo(
                fecha_inicio_anterior,
                fecha_fin_anterior,
            )
        )
        agregados_anteriores = ventas_anterior_qs.aggregate(
            total_ventas=Coalesce(
                Sum('total'),
                ZERO,
                output_field=DecimalField(
                    max_digits=14,
                    decimal_places=2,
                ),
            ),
            cantidad_ventas=Count('id'),
        )
        total_ventas_anterior = ReporteEstadisticasService._quantize(
            agregados_anteriores['total_ventas'],
        )
        cantidad_ventas_anterior = agregados_anteriores['cantidad_ventas']
        ticket_promedio_anterior = ReporteEstadisticasService._safe_ticket(
            total_ventas_anterior,
            cantidad_ventas_anterior,
        )

        return {
            'fecha_inicio': fecha_inicio_date.isoformat(),
            'fecha_fin': fecha_fin_date.isoformat(),
            'resumen': {
                'total_ventas': float(total_ventas),
                'cantidad_ventas': cantidad_ventas,
                'ticket_promedio': float(ticket_promedio),
            },
            'periodo_anterior': {
                'fecha_inicio': fecha_inicio_anterior.isoformat(),
                'fecha_fin': fecha_fin_anterior.isoformat(),
            },
            'comparacion_periodo_anterior': {
                'total_ventas': (
                    ReporteEstadisticasService._comparacion_metricas(
                        total_ventas,
                        total_ventas_anterior,
                    )
                ),
                'cantidad_ventas': {
                    'actual': cantidad_ventas,
                    'anterior': cantidad_ventas_anterior,
                    'variacion_absoluta': (
                        cantidad_ventas - cantidad_ventas_anterior
                    ),
                    'variacion_porcentual': (
                        ReporteEstadisticasService._safe_percentage(
                            Decimal(str(cantidad_ventas)),
                            Decimal(str(cantidad_ventas_anterior)),
                        )
                    ),
                },
                'ticket_promedio': (
                    ReporteEstadisticasService._comparacion_metricas(
                        ticket_promedio,
                        ticket_promedio_anterior,
                    )
                ),
            },
            'grafico_tendencia': (
                ReporteEstadisticasService.ventas_por_dia(
                    fecha_inicio_date,
                    fecha_fin_date,
                )['series']
            ),
        }

    @staticmethod
    def ventas_por_dia(
        fecha_inicio: Any,
        fecha_fin: Any,
    ) -> Dict[str, Any]:
        """
        Retorna la serie temporal diaria de ventas del periodo.
        """
        fecha_inicio_date = ReporteEstadisticasService._parse_date(
            fecha_inicio,
            'fecha_inicio',
        )
        fecha_fin_date = ReporteEstadisticasService._parse_date(
            fecha_fin,
            'fecha_fin',
        )
        ventas_qs = ReporteEstadisticasService._ventas_queryset_periodo(
            fecha_inicio_date,
            fecha_fin_date,
        )
        resultados = ventas_qs.annotate(
            fecha_local=TruncDate(
                'fecha_venta',
                tzinfo=BUSINESS_TIMEZONE,
            ),
        ).values(
            'fecha_local',
        ).annotate(
            total_ventas=Coalesce(
                Sum('total'),
                ZERO,
                output_field=DecimalField(
                    max_digits=14,
                    decimal_places=2,
                ),
            ),
            cantidad_ventas=Count('id'),
        ).order_by('fecha_local')

        resultados_por_fecha = {
            item['fecha_local']: item
            for item in resultados
        }
        series = []

        for fecha_item in ReporteEstadisticasService._generar_rango_fechas(
            fecha_inicio_date,
            fecha_fin_date,
        ):
            item = resultados_por_fecha.get(fecha_item)
            total = (
                ReporteEstadisticasService._quantize(
                    item['total_ventas'],
                )
                if item else ZERO
            )
            cantidad = item['cantidad_ventas'] if item else 0
            ticket = ReporteEstadisticasService._safe_ticket(
                total,
                cantidad,
            )
            series.append({
                'fecha': fecha_item.isoformat(),
                'total_ventas': float(total),
                'cantidad_ventas': cantidad,
                'ticket_promedio': float(ticket),
            })

        return {
            'fecha_inicio': fecha_inicio_date.isoformat(),
            'fecha_fin': fecha_fin_date.isoformat(),
            'series': series,
        }

    @staticmethod
    def ventas_por_mes(anio: Any) -> Dict[str, Any]:
        """
        Retorna la serie temporal mensual de ventas para un año.
        """
        anio_int = ReporteEstadisticasService._parse_positive_int(
            anio,
            'anio',
        )
        fecha_inicio = date(anio_int, 1, 1)
        fecha_fin = date(anio_int, 12, 31)
        ventas_qs = ReporteEstadisticasService._ventas_queryset_periodo(
            fecha_inicio,
            fecha_fin,
        )
        resultados = ventas_qs.annotate(
            mes_local=TruncMonth(
                'fecha_venta',
                tzinfo=BUSINESS_TIMEZONE,
            ),
        ).values(
            'mes_local',
        ).annotate(
            total_ventas=Coalesce(
                Sum('total'),
                ZERO,
                output_field=DecimalField(
                    max_digits=14,
                    decimal_places=2,
                ),
            ),
            cantidad_ventas=Count('id'),
        ).order_by('mes_local')

        resultados_por_mes = {
            item['mes_local'].month: item
            for item in resultados
        }
        series = []

        for mes in range(1, 13):
            item = resultados_por_mes.get(mes)
            total = (
                ReporteEstadisticasService._quantize(
                    item['total_ventas'],
                )
                if item else ZERO
            )
            cantidad = item['cantidad_ventas'] if item else 0
            ticket = ReporteEstadisticasService._safe_ticket(
                total,
                cantidad,
            )
            series.append({
                'mes': mes,
                'label': MONTH_LABELS[mes - 1],
                'total_ventas': float(total),
                'cantidad_ventas': cantidad,
                'ticket_promedio': float(ticket),
            })

        return {
            'anio': anio_int,
            'series': series,
        }

    @staticmethod
    def ventas_por_categoria(
        fecha_inicio: Any,
        fecha_fin: Any,
    ) -> Dict[str, Any]:
        """
        Retorna la distribucion de ventas por categoria.
        """
        fecha_inicio_date = ReporteEstadisticasService._parse_date(
            fecha_inicio,
            'fecha_inicio',
        )
        fecha_fin_date = ReporteEstadisticasService._parse_date(
            fecha_fin,
            'fecha_fin',
        )
        detalles_qs = ReporteEstadisticasService._detalles_queryset_periodo(
            fecha_inicio_date,
            fecha_fin_date,
        )
        resultados = detalles_qs.values(
            'producto__categoria__nombre',
        ).annotate(
            total_vendido=Coalesce(
                Sum('total'),
                ZERO,
                output_field=DecimalField(
                    max_digits=14,
                    decimal_places=2,
                ),
            ),
            cantidad_vendida=Coalesce(
                Sum('cantidad'),
                ZERO,
                output_field=DecimalField(
                    max_digits=14,
                    decimal_places=2,
                ),
            ),
            cantidad_ventas=Count('venta', distinct=True),
        ).order_by('-total_vendido', 'producto__categoria__nombre')

        total_general = sum(
            (
                ReporteEstadisticasService._quantize(item['total_vendido'])
                for item in resultados
            ),
            start=ZERO,
        )
        distribucion = []

        for item in resultados:
            total_vendido = ReporteEstadisticasService._quantize(
                item['total_vendido'],
            )
            porcentaje = (
                float(
                    ReporteEstadisticasService._quantize(
                        (total_vendido / total_general) * Decimal('100'),
                    ),
                )
                if total_general > ZERO else 0.0
            )
            distribucion.append({
                'categoria': (
                    item['producto__categoria__nombre'] or 'Sin categoria'
                ),
                'total_vendido': float(total_vendido),
                'cantidad_vendida': float(
                    ReporteEstadisticasService._quantize(
                        item['cantidad_vendida'],
                    ),
                ),
                'cantidad_ventas': item['cantidad_ventas'],
                'porcentaje': porcentaje,
            })

        return {
            'fecha_inicio': fecha_inicio_date.isoformat(),
            'fecha_fin': fecha_fin_date.isoformat(),
            'total_general': float(total_general),
            'distribucion': distribucion,
        }

    @staticmethod
    def ventas_por_metodo_pago(
        fecha_inicio: Any,
        fecha_fin: Any,
    ) -> Dict[str, Any]:
        """
        Retorna la distribucion de ventas por metodo de pago.
        """
        fecha_inicio_date = ReporteEstadisticasService._parse_date(
            fecha_inicio,
            'fecha_inicio',
        )
        fecha_fin_date = ReporteEstadisticasService._parse_date(
            fecha_fin,
            'fecha_fin',
        )
        ventas_qs = ReporteEstadisticasService._ventas_queryset_periodo(
            fecha_inicio_date,
            fecha_fin_date,
        )
        resultados = ventas_qs.values(
            'metodo_pago',
        ).annotate(
            total_vendido=Coalesce(
                Sum('total'),
                ZERO,
                output_field=DecimalField(
                    max_digits=14,
                    decimal_places=2,
                ),
            ),
            cantidad_ventas=Count('id'),
        ).order_by('-total_vendido', 'metodo_pago')

        total_general = sum(
            (
                ReporteEstadisticasService._quantize(item['total_vendido'])
                for item in resultados
            ),
            start=ZERO,
        )
        etiquetas = dict(Venta.MetodoPago.choices)
        distribucion = []

        for item in resultados:
            total_vendido = ReporteEstadisticasService._quantize(
                item['total_vendido'],
            )
            porcentaje = (
                float(
                    ReporteEstadisticasService._quantize(
                        (total_vendido / total_general) * Decimal('100'),
                    ),
                )
                if total_general > ZERO else 0.0
            )
            distribucion.append({
                'metodo_pago': item['metodo_pago'],
                'label': etiquetas.get(item['metodo_pago'], item['metodo_pago']),
                'total_vendido': float(total_vendido),
                'cantidad_ventas': item['cantidad_ventas'],
                'porcentaje': porcentaje,
            })

        return {
            'fecha_inicio': fecha_inicio_date.isoformat(),
            'fecha_fin': fecha_fin_date.isoformat(),
            'total_general': float(total_general),
            'distribucion': distribucion,
        }

    @staticmethod
    def productos_mas_vendidos(
        fecha_inicio: Any,
        fecha_fin: Any,
        limite: Any = 10,
    ) -> Dict[str, Any]:
        """
        Retorna el top de productos mas vendidos en el periodo.
        """
        fecha_inicio_date = ReporteEstadisticasService._parse_date(
            fecha_inicio,
            'fecha_inicio',
        )
        fecha_fin_date = ReporteEstadisticasService._parse_date(
            fecha_fin,
            'fecha_fin',
        )
        limite_int = ReporteEstadisticasService._parse_positive_int(
            limite,
            'limite',
        )
        detalles_qs = ReporteEstadisticasService._detalles_queryset_periodo(
            fecha_inicio_date,
            fecha_fin_date,
        )
        costo_expr = ExpressionWrapper(
            F('cantidad') * F('producto__precio_compra'),
            output_field=DecimalField(
                max_digits=16,
                decimal_places=2,
            ),
        )
        resultados = detalles_qs.values(
            'producto_id',
            'producto__nombre',
            'producto__codigo_interno',
            'producto__categoria__nombre',
        ).annotate(
            cantidad_vendida=Coalesce(
                Sum('cantidad'),
                ZERO,
                output_field=DecimalField(
                    max_digits=14,
                    decimal_places=2,
                ),
            ),
            total_vendido=Coalesce(
                Sum('total'),
                ZERO,
                output_field=DecimalField(
                    max_digits=16,
                    decimal_places=2,
                ),
            ),
            costo_estimado=Coalesce(
                Sum(costo_expr),
                ZERO,
                output_field=DecimalField(
                    max_digits=16,
                    decimal_places=2,
                ),
            ),
            cantidad_ventas=Count('venta', distinct=True),
        ).order_by('-cantidad_vendida', '-total_vendido')[:limite_int]

        productos = []

        for item in resultados:
            total_vendido = ReporteEstadisticasService._quantize(
                item['total_vendido'],
            )
            costo_estimado = ReporteEstadisticasService._quantize(
                item['costo_estimado'],
            )
            margen = ReporteEstadisticasService._quantize(
                total_vendido - costo_estimado,
            )
            productos.append({
                'producto_id': item['producto_id'],
                'nombre': item['producto__nombre'],
                'codigo_interno': item['producto__codigo_interno'],
                'categoria': item['producto__categoria__nombre'],
                'cantidad_vendida': float(
                    ReporteEstadisticasService._quantize(
                        item['cantidad_vendida'],
                    ),
                ),
                'total_vendido': float(total_vendido),
                'margen_generado': float(margen),
                'cantidad_ventas': item['cantidad_ventas'],
            })

        return {
            'fecha_inicio': fecha_inicio_date.isoformat(),
            'fecha_fin': fecha_fin_date.isoformat(),
            'limite': limite_int,
            'resultados': productos,
        }

    @staticmethod
    def productos_menos_vendidos(
        limite: Any = 10,
    ) -> Dict[str, Any]:
        """
        Retorna productos con baja rotacion historica.
        """
        limite_int = ReporteEstadisticasService._parse_positive_int(
            limite,
            'limite',
        )
        resultados = DetalleVenta.objects.filter(
            venta__empresa=get_empresa_actual_or_default(),
            venta__estado=Venta.Estado.TERMINADA,
        ).values(
            'producto_id',
            'producto__nombre',
            'producto__codigo_interno',
            'producto__categoria__nombre',
        ).annotate(
            cantidad_vendida=Coalesce(
                Sum('cantidad'),
                ZERO,
                output_field=DecimalField(
                    max_digits=14,
                    decimal_places=2,
                ),
            ),
            total_vendido=Coalesce(
                Sum('total'),
                ZERO,
                output_field=DecimalField(
                    max_digits=16,
                    decimal_places=2,
                ),
            ),
            ultima_venta=Max('venta__fecha_venta'),
        ).filter(
            cantidad_vendida__gt=ZERO,
        ).order_by('cantidad_vendida', 'total_vendido')[:limite_int]

        productos = []

        for item in resultados:
            ultima_venta = item['ultima_venta']
            ultima_venta_str = (
                timezone.localtime(ultima_venta).isoformat()
                if ultima_venta else None
            )
            productos.append({
                'producto_id': item['producto_id'],
                'nombre': item['producto__nombre'],
                'codigo_interno': item['producto__codigo_interno'],
                'categoria': item['producto__categoria__nombre'],
                'cantidad_vendida': float(
                    ReporteEstadisticasService._quantize(
                        item['cantidad_vendida'],
                    ),
                ),
                'total_vendido': float(
                    ReporteEstadisticasService._quantize(
                        item['total_vendido'],
                    ),
                ),
                'ultima_venta': ultima_venta_str,
            })

        return {
            'limite': limite_int,
            'resultados': productos,
        }

    @staticmethod
    def productos_sin_movimiento(
        dias: Any = 30,
    ) -> Dict[str, Any]:
        """
        Retorna productos sin ventas en los ultimos N dias.
        """
        dias_int = ReporteEstadisticasService._parse_positive_int(
            dias,
            'dias',
        )
        fecha_corte = timezone.localdate() - timedelta(days=dias_int)
        fecha_corte_dt = _local_day_start_utc(fecha_corte)
        productos_qs = Producto.objects.select_related('categoria').annotate(
            ultima_venta=Max(
                'detalles_venta__venta__fecha_venta',
                filter=Q(
                    detalles_venta__venta__estado=Venta.Estado.TERMINADA,
                ),
            ),
        ).filter(
            Q(ultima_venta__lt=fecha_corte_dt) | Q(ultima_venta__isnull=True),
            empresa=get_empresa_actual_or_default(),
        ).order_by('ultima_venta', 'nombre')

        productos = []
        hoy = timezone.localdate()

        for producto in productos_qs:
            ultima_venta = producto.ultima_venta
            ultima_fecha = (
                timezone.localtime(ultima_venta).date()
                if ultima_venta else None
            )
            dias_sin_movimiento = (
                (hoy - ultima_fecha).days
                if ultima_fecha else None
            )
            productos.append({
                'producto_id': producto.id,
                'nombre': producto.nombre,
                'codigo_interno': producto.codigo_interno,
                'categoria': (
                    producto.categoria.nombre
                    if producto.categoria else 'Sin categoria'
                ),
                'existencias': float(
                    ReporteEstadisticasService._quantize(
                        producto.existencias,
                    ),
                ),
                'valor_inventario': float(
                    ReporteEstadisticasService._quantize(
                        producto.precio_compra * producto.existencias,
                    ),
                ),
                'ultima_venta': (
                    ultima_fecha.isoformat() if ultima_fecha else None
                ),
                'dias_sin_movimiento': dias_sin_movimiento,
            })

        return {
            'dias': dias_int,
            'fecha_corte': fecha_corte.isoformat(),
            'resultados': productos,
        }

    @staticmethod
    def mejores_clientes(
        fecha_inicio: Any,
        fecha_fin: Any,
        limite: Any = 10,
    ) -> Dict[str, Any]:
        """
        Retorna el top de clientes por compras en un periodo.
        """
        fecha_inicio_date = ReporteEstadisticasService._parse_date(
            fecha_inicio,
            'fecha_inicio',
        )
        fecha_fin_date = ReporteEstadisticasService._parse_date(
            fecha_fin,
            'fecha_fin',
        )
        limite_int = ReporteEstadisticasService._parse_positive_int(
            limite,
            'limite',
        )
        ventas_qs = ReporteEstadisticasService._ventas_queryset_periodo(
            fecha_inicio_date,
            fecha_fin_date,
        ).exclude(
            cliente__numero_documento=Cliente.CONSUMIDOR_FINAL_DOCUMENTO,
        ).filter(
            cliente__isnull=False,
        )
        resultados = ventas_qs.values(
            'cliente_id',
            'cliente__nombre',
            'cliente__razon_social',
            'cliente__nombre_comercial',
            'cliente__numero_documento',
        ).annotate(
            total_comprado=Coalesce(
                Sum('total'),
                ZERO,
                output_field=DecimalField(
                    max_digits=16,
                    decimal_places=2,
                ),
            ),
            cantidad_compras=Count('id'),
            ticket_promedio=Coalesce(
                Avg('total'),
                ZERO,
                output_field=DecimalField(
                    max_digits=14,
                    decimal_places=2,
                ),
            ),
        ).order_by('-total_comprado', '-cantidad_compras')[:limite_int]

        clientes = []

        for item in resultados:
            clientes.append({
                'cliente_id': item['cliente_id'],
                'nombre': (
                    ReporteEstadisticasService._cliente_nombre_desde_registro(
                        item,
                    )
                ),
                'numero_documento': item['cliente__numero_documento'],
                'total_comprado': float(
                    ReporteEstadisticasService._quantize(
                        item['total_comprado'],
                    ),
                ),
                'cantidad_compras': item['cantidad_compras'],
                'ticket_promedio': float(
                    ReporteEstadisticasService._quantize(
                        item['ticket_promedio'],
                    ),
                ),
            })

        return {
            'fecha_inicio': fecha_inicio_date.isoformat(),
            'fecha_fin': fecha_fin_date.isoformat(),
            'limite': limite_int,
            'resultados': clientes,
        }

    @staticmethod
    def analisis_recurrencia_clientes() -> Dict[str, Any]:
        """
        Analiza clientes nuevos vs recurrentes con base en ventas cerradas.
        """
        clientes_qs = Cliente.objects.filter(
            empresa=get_empresa_actual_or_default(),
            ventas__estado=Venta.Estado.TERMINADA,
            ventas__empresa=get_empresa_actual_or_default(),
        ).exclude(
            numero_documento=Cliente.CONSUMIDOR_FINAL_DOCUMENTO,
        ).annotate(
            total_compras=Count(
                'ventas',
                filter=Q(ventas__estado=Venta.Estado.TERMINADA),
            ),
            total_comprado=Coalesce(
                Sum(
                    'ventas__total',
                    filter=Q(ventas__estado=Venta.Estado.TERMINADA),
                ),
                ZERO,
                output_field=DecimalField(
                    max_digits=16,
                    decimal_places=2,
                ),
            ),
            primera_compra=Min(
                'ventas__fecha_venta',
                filter=Q(ventas__estado=Venta.Estado.TERMINADA),
            ),
            ultima_compra=Max(
                'ventas__fecha_venta',
                filter=Q(ventas__estado=Venta.Estado.TERMINADA),
            ),
        ).filter(
            total_compras__gt=0,
        )

        clientes = list(
            clientes_qs.values(
                'id',
                'nombre',
                'razon_social',
                'nombre_comercial',
                'numero_documento',
                'total_compras',
                'total_comprado',
                'primera_compra',
                'ultima_compra',
            ).order_by('-total_compras', '-total_comprado')
        )
        clientes_nuevos = [
            cliente for cliente in clientes
            if cliente['total_compras'] == 1
        ]
        clientes_recurrentes = [
            cliente for cliente in clientes
            if cliente['total_compras'] > 1
        ]
        total_clientes = len(clientes)
        porcentaje_recurrentes = (
            round((len(clientes_recurrentes) / total_clientes) * 100, 2)
            if total_clientes else 0.0
        )
        top_recurrentes = []

        for cliente in clientes_recurrentes[:10]:
            top_recurrentes.append({
                'cliente_id': cliente['id'],
                'nombre': (
                    cliente['razon_social']
                    or cliente['nombre']
                    or cliente['nombre_comercial']
                ),
                'numero_documento': cliente['numero_documento'],
                'total_compras': cliente['total_compras'],
                'total_comprado': float(
                    ReporteEstadisticasService._quantize(
                        cliente['total_comprado'],
                    ),
                ),
                'primera_compra': (
                    timezone.localtime(cliente['primera_compra']).date()
                    .isoformat()
                    if cliente['primera_compra'] else None
                ),
                'ultima_compra': (
                    timezone.localtime(cliente['ultima_compra']).date()
                    .isoformat()
                    if cliente['ultima_compra'] else None
                ),
            })

        return {
            'resumen': {
                'total_clientes': total_clientes,
                'clientes_nuevos': len(clientes_nuevos),
                'clientes_recurrentes': len(clientes_recurrentes),
                'porcentaje_recurrentes': porcentaje_recurrentes,
            },
            'distribucion': [
                {
                    'tipo': 'NUEVOS',
                    'cantidad': len(clientes_nuevos),
                },
                {
                    'tipo': 'RECURRENTES',
                    'cantidad': len(clientes_recurrentes),
                },
            ],
            'top_recurrentes': top_recurrentes,
        }

    @staticmethod
    def valor_total_inventario() -> Dict[str, Any]:
        """
        Calcula la valorizacion actual del inventario.
        """
        valor_compra_expr = ExpressionWrapper(
            F('precio_compra') * F('existencias'),
            output_field=DecimalField(
                max_digits=16,
                decimal_places=2,
            ),
        )
        valor_venta_expr = ExpressionWrapper(
            F('precio_venta') * F('existencias'),
            output_field=DecimalField(
                max_digits=16,
                decimal_places=2,
            ),
        )
        agregados = Producto.objects.filter(
            empresa=get_empresa_actual_or_default(),
        ).aggregate(
            valor_compra=Coalesce(
                Sum(valor_compra_expr),
                ZERO,
                output_field=DecimalField(
                    max_digits=16,
                    decimal_places=2,
                ),
            ),
            valor_venta=Coalesce(
                Sum(valor_venta_expr),
                ZERO,
                output_field=DecimalField(
                    max_digits=16,
                    decimal_places=2,
                ),
            ),
            total_existencias=Coalesce(
                Sum('existencias'),
                ZERO,
                output_field=DecimalField(
                    max_digits=16,
                    decimal_places=2,
                ),
            ),
            cantidad_productos=Count('id'),
        )
        margen_potencial = ReporteEstadisticasService._quantize(
            agregados['valor_venta'] - agregados['valor_compra'],
        )

        return {
            'valor_compra': float(
                ReporteEstadisticasService._quantize(
                    agregados['valor_compra'],
                ),
            ),
            'valor_venta': float(
                ReporteEstadisticasService._quantize(
                    agregados['valor_venta'],
                ),
            ),
            'margen_potencial': float(margen_potencial),
            'total_existencias': float(
                ReporteEstadisticasService._quantize(
                    agregados['total_existencias'],
                ),
            ),
            'cantidad_productos': agregados['cantidad_productos'],
        }

    @staticmethod
    def rotacion_inventario(
        fecha_inicio: Any,
        fecha_fin: Any,
    ) -> Dict[str, Any]:
        """
        Calcula un indice de rotacion con base en ventas del periodo.
        """
        fecha_inicio_date = ReporteEstadisticasService._parse_date(
            fecha_inicio,
            'fecha_inicio',
        )
        fecha_fin_date = ReporteEstadisticasService._parse_date(
            fecha_fin,
            'fecha_fin',
        )
        detalles_qs = ReporteEstadisticasService._detalles_queryset_periodo(
            fecha_inicio_date,
            fecha_fin_date,
        )
        costo_expr = ExpressionWrapper(
            F('cantidad') * F('producto__precio_compra'),
            output_field=DecimalField(
                max_digits=16,
                decimal_places=2,
            ),
        )
        agregados = detalles_qs.aggregate(
            costo_productos_vendidos=Coalesce(
                Sum(costo_expr),
                ZERO,
                output_field=DecimalField(
                    max_digits=16,
                    decimal_places=2,
                ),
            ),
            unidades_vendidas=Coalesce(
                Sum('cantidad'),
                ZERO,
                output_field=DecimalField(
                    max_digits=16,
                    decimal_places=2,
                ),
            ),
        )
        inventario_actual = ReporteEstadisticasService.valor_total_inventario()
        valor_inventario_actual = Decimal(
            str(inventario_actual['valor_compra']),
        )
        costo_productos_vendidos = (
            ReporteEstadisticasService._quantize(
                agregados['costo_productos_vendidos'],
            )
        )
        indice_rotacion = (
            ReporteEstadisticasService._quantize(
                costo_productos_vendidos / valor_inventario_actual,
            )
            if valor_inventario_actual > ZERO else ZERO
        )
        dias_periodo = (fecha_fin_date - fecha_inicio_date).days + 1
        dias_inventario = (
            ReporteEstadisticasService._quantize(
                Decimal(str(dias_periodo)) / indice_rotacion,
            )
            if indice_rotacion > ZERO else ZERO
        )
        productos_rotacion_qs = detalles_qs.values(
            'producto_id',
            'producto__nombre',
            'producto__codigo_interno',
        ).annotate(
            unidades_vendidas=Coalesce(
                Sum('cantidad'),
                ZERO,
                output_field=DecimalField(
                    max_digits=16,
                    decimal_places=2,
                ),
            ),
            stock_actual=Coalesce(
                Max('producto__existencias'),
                ZERO,
                output_field=DecimalField(
                    max_digits=16,
                    decimal_places=2,
                ),
            ),
        ).order_by('-unidades_vendidas')[:10]
        productos_rotacion = []

        for item in productos_rotacion_qs:
            stock_actual = ReporteEstadisticasService._quantize(
                item['stock_actual'],
            )
            indice_producto = (
                ReporteEstadisticasService._quantize(
                    item['unidades_vendidas'] / stock_actual,
                )
                if stock_actual > ZERO else ZERO
            )
            productos_rotacion.append({
                'producto_id': item['producto_id'],
                'nombre': item['producto__nombre'],
                'codigo_interno': item['producto__codigo_interno'],
                'unidades_vendidas': float(
                    ReporteEstadisticasService._quantize(
                        item['unidades_vendidas'],
                    ),
                ),
                'stock_actual': float(stock_actual),
                'indice_rotacion': float(indice_producto),
            })

        return {
            'fecha_inicio': fecha_inicio_date.isoformat(),
            'fecha_fin': fecha_fin_date.isoformat(),
            'costo_productos_vendidos': float(costo_productos_vendidos),
            'valor_inventario_actual': float(
                ReporteEstadisticasService._quantize(
                    valor_inventario_actual,
                ),
            ),
            'indice_rotacion': float(indice_rotacion),
            'dias_inventario': float(dias_inventario),
            'productos_rotacion': productos_rotacion,
        }

    @staticmethod
    def total_cuentas_por_cobrar() -> Dict[str, Any]:
        """
        Retorna el total actual de cartera por cobrar.
        """
        ventas_qs = Venta.objects.filter(
            empresa=get_empresa_actual_or_default(),
            estado=Venta.Estado.TERMINADA,
            saldo_pendiente__gt=ZERO,
        )
        agregados = ventas_qs.aggregate(
            total_cartera=Coalesce(
                Sum('saldo_pendiente'),
                ZERO,
                output_field=DecimalField(
                    max_digits=16,
                    decimal_places=2,
                ),
            ),
            cantidad_ventas=Count('id'),
            clientes_con_saldo=Count('cliente_id', distinct=True),
            ticket_promedio=Coalesce(
                Avg('saldo_pendiente'),
                ZERO,
                output_field=DecimalField(
                    max_digits=14,
                    decimal_places=2,
                ),
            ),
        )

        return {
            'total_cartera': float(
                ReporteEstadisticasService._quantize(
                    agregados['total_cartera'],
                ),
            ),
            'cantidad_ventas': agregados['cantidad_ventas'],
            'clientes_con_saldo': agregados['clientes_con_saldo'],
            'ticket_promedio_pendiente': float(
                ReporteEstadisticasService._quantize(
                    agregados['ticket_promedio'],
                ),
            ),
        }

    @staticmethod
    def antiguedad_cartera() -> Dict[str, Any]:
        """
        Retorna un analisis de antiguedad de la cartera actual.
        """
        hoy = timezone.localdate()
        ventas = list(
            Venta.objects.select_related('cliente').filter(
                empresa=get_empresa_actual_or_default(),
                estado=Venta.Estado.TERMINADA,
                saldo_pendiente__gt=ZERO,
            ).order_by('fecha_venta')
        )
        buckets = {
            'AL_DIA': {
                'label': 'Al dia',
                'total': ZERO,
                'cantidad_ventas': 0,
            },
            '1_30': {
                'label': '1-30 dias',
                'total': ZERO,
                'cantidad_ventas': 0,
            },
            '31_60': {
                'label': '31-60 dias',
                'total': ZERO,
                'cantidad_ventas': 0,
            },
            '61_90': {
                'label': '61-90 dias',
                'total': ZERO,
                'cantidad_ventas': 0,
            },
            '91_MAS': {
                'label': '91+ dias',
                'total': ZERO,
                'cantidad_ventas': 0,
            },
        }

        for venta in ventas:
            fecha_venta = timezone.localtime(venta.fecha_venta).date()
            dias_plazo = venta.cliente.dias_plazo if venta.cliente else 0
            fecha_vencimiento = fecha_venta + timedelta(days=dias_plazo)
            dias_vencidos = (hoy - fecha_vencimiento).days

            if dias_vencidos <= 0:
                bucket = 'AL_DIA'
            elif dias_vencidos <= 30:
                bucket = '1_30'
            elif dias_vencidos <= 60:
                bucket = '31_60'
            elif dias_vencidos <= 90:
                bucket = '61_90'
            else:
                bucket = '91_MAS'

            buckets[bucket]['total'] += venta.saldo_pendiente
            buckets[bucket]['cantidad_ventas'] += 1

        distribucion = []
        total_general = ZERO

        for key in ('AL_DIA', '1_30', '31_60', '61_90', '91_MAS'):
            total_bucket = ReporteEstadisticasService._quantize(
                buckets[key]['total'],
            )
            total_general += total_bucket
            distribucion.append({
                'bucket': key,
                'label': buckets[key]['label'],
                'total': float(total_bucket),
                'cantidad_ventas': buckets[key]['cantidad_ventas'],
            })

        return {
            'fecha_corte': hoy.isoformat(),
            'total_general': float(total_general),
            'distribucion': distribucion,
        }

    @staticmethod
    def proyeccion_ingresos(
        dias: Any = 30,
    ) -> Dict[str, Any]:
        """
        Proyecta ingresos futuros usando promedio diario historico.
        """
        dias_int = ReporteEstadisticasService._parse_positive_int(
            dias,
            'dias',
        )
        ventana_historica = max(30, dias_int)
        fecha_fin_historica = timezone.localdate()
        fecha_inicio_historica = (
            fecha_fin_historica - timedelta(days=ventana_historica - 1)
        )
        serie_historica = ReporteEstadisticasService.ventas_por_dia(
            fecha_inicio_historica,
            fecha_fin_historica,
        )['series']
        total_historico = sum(
            (
                Decimal(str(item['total_ventas']))
                for item in serie_historica
            ),
            start=ZERO,
        )
        promedio_diario = ReporteEstadisticasService._quantize(
            total_historico / Decimal(str(ventana_historica)),
        )
        total_proyectado = ReporteEstadisticasService._quantize(
            promedio_diario * Decimal(str(dias_int)),
        )
        fecha_inicio_proyeccion = fecha_fin_historica + timedelta(days=1)
        serie_proyectada = []

        for offset in range(dias_int):
            fecha_proyectada = fecha_inicio_proyeccion + timedelta(
                days=offset,
            )
            serie_proyectada.append({
                'fecha': fecha_proyectada.isoformat(),
                'ingreso_proyectado': float(promedio_diario),
            })

        return {
            'dias_proyeccion': dias_int,
            'ventana_historica': ventana_historica,
            'fecha_inicio_historica': fecha_inicio_historica.isoformat(),
            'fecha_fin_historica': fecha_fin_historica.isoformat(),
            'promedio_diario_historico': float(promedio_diario),
            'total_historico': float(
                ReporteEstadisticasService._quantize(total_historico),
            ),
            'total_proyectado': float(total_proyectado),
            'serie_historica': serie_historica,
            'serie_proyectada': serie_proyectada,
        }


class InformeService:
    """
    Servicio de negocio para persistir y exportar informes generados.

    Mantiene la orquestacion entre estadisticas, generadores de archivo y
    el modelo `Informe`, evitando que las vistas mezclen reglas de
    negocio con respuestas HTTP.
    """

    PDF = 'pdf'
    EXCEL = 'excel'

    @staticmethod
    def _queryset_base():
        return Informe.objects.select_related('usuario_genero').filter(
            empresa=get_empresa_actual_or_default(),
        )

    @staticmethod
    def _parse_date(value: Any, field_name: str) -> date:
        return ReporteEstadisticasService._parse_date(value, field_name)

    @staticmethod
    def _parse_positive_int(value: Any, field_name: str) -> int:
        return ReporteEstadisticasService._parse_positive_int(
            value,
            field_name,
        )

    @staticmethod
    def _validar_rango_fechas(
        fecha_inicio: date,
        fecha_fin: date,
    ) -> None:
        ReporteEstadisticasService._validar_rango_fechas(
            fecha_inicio,
            fecha_fin,
        )

    @staticmethod
    def _default_period() -> tuple[date, date]:
        fecha_fin = timezone.localdate()
        fecha_inicio = fecha_fin.replace(day=1)
        return fecha_inicio, fecha_fin

    @staticmethod
    def _resolve_period(
        tipo_informe: str,
        fecha_inicio: Any = None,
        fecha_fin: Any = None,
    ) -> tuple[date, date]:
        if fecha_inicio is None and fecha_fin is None:
            if tipo_informe == Informe.TipoInforme.CIERRE_CAJA:
                hoy = timezone.localdate()
                return hoy, hoy
            return InformeService._default_period()

        fecha_inicio_date = InformeService._parse_date(
            fecha_inicio,
            'fecha_inicio',
        )
        fecha_fin_date = InformeService._parse_date(
            fecha_fin,
            'fecha_fin',
        )
        InformeService._validar_rango_fechas(
            fecha_inicio_date,
            fecha_fin_date,
        )
        return fecha_inicio_date, fecha_fin_date

    @staticmethod
    def _to_json_safe(value: Any) -> Any:
        return CierreCajaService._to_json_safe(value)

    @staticmethod
    def _resolve_cierre_id(
        cierre_id: Optional[int],
        fecha_inicio: date,
        fecha_fin: date,
    ) -> int:
        if cierre_id is not None:
            return int(cierre_id)

        fecha_objetivo = fecha_fin or fecha_inicio
        cierre = CierreCaja.objects.filter(
            empresa=get_empresa_actual_or_default(),
            fecha_cierre=fecha_objetivo,
        ).only('id').first()
        if cierre is None:
            raise InformeError(
                _(
                    'No existe un cierre de caja para la fecha '
                    '%(fecha)s.'
                ) % {
                    'fecha': fecha_objetivo,
                },
                code='cierre_caja_no_disponible',
            )
        return cierre.id

    @staticmethod
    def _build_report_data(
        tipo_informe: str,
        fecha_inicio: date,
        fecha_fin: date,
        limite: int = 10,
        cierre_id: Optional[int] = None,
    ) -> dict[str, Any]:
        if tipo_informe == Informe.TipoInforme.VENTAS_PERIODO:
            return {
                'estadisticas_ventas_periodo': (
                    ReporteEstadisticasService.estadisticas_ventas_periodo(
                        fecha_inicio,
                        fecha_fin,
                    )
                ),
                'ventas_por_dia': (
                    ReporteEstadisticasService.ventas_por_dia(
                        fecha_inicio,
                        fecha_fin,
                    )
                ),
                'ventas_por_mes': (
                    ReporteEstadisticasService.ventas_por_mes(
                        fecha_inicio.year,
                    )
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

        if tipo_informe == Informe.TipoInforme.PRODUCTOS_MAS_VENDIDOS:
            return {
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
                    ReporteEstadisticasService.productos_sin_movimiento(30)
                ),
            }

        if tipo_informe == Informe.TipoInforme.CLIENTES_TOP:
            return {
                'mejores_clientes': (
                    ReporteEstadisticasService.mejores_clientes(
                        fecha_inicio,
                        fecha_fin,
                        limite,
                    )
                ),
                'analisis_recurrencia_clientes': (
                    ReporteEstadisticasService.analisis_recurrencia_clientes()
                ),
            }

        if tipo_informe == Informe.TipoInforme.INVENTARIO_VALORIZADO:
            return {
                'valor_total_inventario': (
                    ReporteEstadisticasService.valor_total_inventario()
                ),
                'rotacion_inventario': (
                    ReporteEstadisticasService.rotacion_inventario(
                        fecha_inicio,
                        fecha_fin,
                    )
                ),
            }

        if tipo_informe == Informe.TipoInforme.CUENTAS_POR_COBRAR:
            return {
                'total_cuentas_por_cobrar': (
                    ReporteEstadisticasService.total_cuentas_por_cobrar()
                ),
                'antiguedad_cartera': (
                    ReporteEstadisticasService.antiguedad_cartera()
                ),
                'proyeccion_ingresos': (
                    ReporteEstadisticasService.proyeccion_ingresos(30)
                ),
            }

        if tipo_informe == Informe.TipoInforme.CIERRE_CAJA:
            cierre = CierreCajaService.obtener_detalle_cierre(
                InformeService._resolve_cierre_id(
                    cierre_id,
                    fecha_inicio,
                    fecha_fin,
                ),
            )
            return {
                'cierre_id': cierre.id,
                'cierre_caja': cierre.generar_resumen(),
            }

        raise InformeError(
            _('El tipo de informe solicitado no es valido.'),
            code='tipo_informe_invalido',
        )

    @staticmethod
    def _generate_pdf_file(
        tipo_informe: str,
        datos: dict[str, Any],
        fecha_inicio: date,
        fecha_fin: date,
        cierre_id: Optional[int] = None,
    ):
        from .generators import (
            generar_pdf_cierre_caja,
            generar_pdf_cuentas_por_cobrar,
            generar_pdf_inventario_valorizado,
            generar_pdf_ventas_periodo,
        )

        if tipo_informe == Informe.TipoInforme.VENTAS_PERIODO:
            return generar_pdf_ventas_periodo(
                datos.get('estadisticas_ventas_periodo', {}),
                fecha_inicio,
                fecha_fin,
            )

        if tipo_informe == Informe.TipoInforme.INVENTARIO_VALORIZADO:
            return generar_pdf_inventario_valorizado()

        if tipo_informe == Informe.TipoInforme.CUENTAS_POR_COBRAR:
            return generar_pdf_cuentas_por_cobrar()

        if tipo_informe == Informe.TipoInforme.CIERRE_CAJA:
            return generar_pdf_cierre_caja(
                InformeService._resolve_cierre_id(
                    cierre_id,
                    fecha_inicio,
                    fecha_fin,
                ),
            )

        raise InformeError(
            _(
                'El tipo de informe %(tipo)s no tiene generador PDF '
                'configurado.'
            ) % {
                'tipo': tipo_informe,
            },
            code='pdf_no_soportado',
        )

    @staticmethod
    def _generate_excel_file(
        tipo_informe: str,
        fecha_inicio: date,
        fecha_fin: date,
        limite: int = 10,
    ):
        from .generators import (
            generar_excel_clientes_cartera,
            generar_excel_clientes_top,
            generar_excel_productos_vendidos,
            generar_excel_ventas_detallado,
        )

        if tipo_informe == Informe.TipoInforme.VENTAS_PERIODO:
            return generar_excel_ventas_detallado(
                fecha_inicio,
                fecha_fin,
            )

        if tipo_informe == Informe.TipoInforme.PRODUCTOS_MAS_VENDIDOS:
            return generar_excel_productos_vendidos(
                fecha_inicio,
                fecha_fin,
            )

        if tipo_informe == Informe.TipoInforme.CLIENTES_TOP:
            return generar_excel_clientes_top(
                fecha_inicio,
                fecha_fin,
                limite,
            )

        if tipo_informe == Informe.TipoInforme.CUENTAS_POR_COBRAR:
            return generar_excel_clientes_cartera()

        raise InformeError(
            _(
                'El tipo de informe %(tipo)s no tiene generador Excel '
                'configurado.'
            ) % {
                'tipo': tipo_informe,
            },
            code='excel_no_soportado',
        )

    @staticmethod
    def _assign_generated_file(
        informe: Informe,
        formato: str,
        generated_file: Any,
    ) -> None:
        django_file = generated_file.to_content_file()
        save_kwargs = {'save': False}

        if formato == InformeService.PDF:
            informe.archivo_pdf.save(
                generated_file.filename,
                django_file,
                **save_kwargs,
            )
        else:
            informe.archivo_excel.save(
                generated_file.filename,
                django_file,
                **save_kwargs,
            )

    @staticmethod
    def _save_report_instance(
        *,
        tipo_informe: str,
        fecha_inicio: date,
        fecha_fin: date,
        datos: dict[str, Any],
        usuario_genero: Usuario,
        formato: str,
        generated_file: Any,
    ) -> Informe:
        informe = Informe(
            tipo_informe=tipo_informe,
            fecha_inicio=fecha_inicio,
            fecha_fin=fecha_fin,
            datos=InformeService._to_json_safe(datos),
            usuario_genero=usuario_genero,
        )
        InformeService._assign_generated_file(
            informe,
            formato,
            generated_file,
        )
        try:
            informe.save()
        except DjangoValidationError as exc:
            raise InformeError(
                CierreCajaService._combine_validation_error_messages(exc),
                code='informe_invalido',
            ) from exc
        return informe

    @staticmethod
    def listar_informes(
        filtros: Optional[Dict[str, Any]] = None,
    ) -> List[Informe]:
        queryset = InformeService._queryset_base()

        if not filtros:
            return list(queryset.order_by('-fecha_generacion', '-id'))

        if filtros.get('tipo_informe'):
            queryset = queryset.filter(tipo_informe=filtros['tipo_informe'])

        if filtros.get('fecha_inicio'):
            queryset = queryset.filter(fecha_inicio__gte=filtros['fecha_inicio'])

        if filtros.get('fecha_fin'):
            queryset = queryset.filter(fecha_fin__lte=filtros['fecha_fin'])

        if filtros.get('usuario_id'):
            queryset = queryset.filter(usuario_genero_id=filtros['usuario_id'])

        if filtros.get('q'):
            termino = str(filtros['q']).strip()
            queryset = queryset.filter(
                Q(tipo_informe__icontains=termino)
                | Q(usuario_genero__username__icontains=termino)
                | Q(usuario_genero__first_name__icontains=termino)
                | Q(usuario_genero__last_name__icontains=termino)
            )

        ordering = filtros.get('ordering', '-fecha_generacion')
        ordering_permitido = {
            'fecha_generacion',
            '-fecha_generacion',
            'fecha_inicio',
            '-fecha_inicio',
            'fecha_fin',
            '-fecha_fin',
            'tipo_informe',
            '-tipo_informe',
        }
        if ordering not in ordering_permitido:
            ordering = '-fecha_generacion'

        return list(queryset.order_by(ordering, '-id'))

    @staticmethod
    def obtener_informe(informe_id: int) -> Informe:
        try:
            return InformeService._queryset_base().get(pk=informe_id)
        except Informe.DoesNotExist as exc:
            raise InformeNoEncontradoError(informe_id) from exc

    @staticmethod
    @transaction.atomic
    def generar_informe(
        data: Dict[str, Any],
        usuario_genero: Usuario,
    ) -> Informe:
        tipo_informe = data['tipo_informe']
        formato = str(data['formato']).lower()
        limite = InformeService._parse_positive_int(
            data.get('limite', 10),
            'limite',
        )
        fecha_inicio, fecha_fin = InformeService._resolve_period(
            tipo_informe,
            data.get('fecha_inicio'),
            data.get('fecha_fin'),
        )
        cierre_id = data.get('cierre_id')
        datos = InformeService._build_report_data(
            tipo_informe=tipo_informe,
            fecha_inicio=fecha_inicio,
            fecha_fin=fecha_fin,
            limite=limite,
            cierre_id=cierre_id,
        )

        if formato == InformeService.PDF:
            generated_file = InformeService._generate_pdf_file(
                tipo_informe=tipo_informe,
                datos=datos,
                fecha_inicio=fecha_inicio,
                fecha_fin=fecha_fin,
                cierre_id=cierre_id,
            )
        elif formato == InformeService.EXCEL:
            generated_file = InformeService._generate_excel_file(
                tipo_informe=tipo_informe,
                fecha_inicio=fecha_inicio,
                fecha_fin=fecha_fin,
                limite=limite,
            )
        else:
            raise InformeError(
                _('El formato solicitado no es soportado.'),
                code='formato_invalido',
            )

        return InformeService._save_report_instance(
            tipo_informe=tipo_informe,
            fecha_inicio=fecha_inicio,
            fecha_fin=fecha_fin,
            datos=datos,
            usuario_genero=usuario_genero,
            formato=formato,
            generated_file=generated_file,
        )

    @staticmethod
    @transaction.atomic
    def obtener_archivo_reporte(
        informe_id: int,
        formato: str,
    ):
        informe = InformeService.obtener_informe(informe_id)
        formato_normalizado = str(formato).lower()

        if formato_normalizado == InformeService.PDF and informe.archivo_pdf:
            return informe.archivo_pdf

        if formato_normalizado == InformeService.EXCEL and informe.archivo_excel:
            return informe.archivo_excel

        datos = (
            informe.datos
            if isinstance(informe.datos, dict) else {}
        )
        limite = 10

        if informe.tipo_informe == Informe.TipoInforme.PRODUCTOS_MAS_VENDIDOS:
            limite = (
                datos.get('productos_mas_vendidos', {})
                .get('limite', 10)
            )
        elif informe.tipo_informe == Informe.TipoInforme.CLIENTES_TOP:
            limite = (
                datos.get('mejores_clientes', {})
                .get('limite', 10)
            )

        cierre_id = datos.get('cierre_id')

        if formato_normalizado == InformeService.PDF:
            generated_file = InformeService._generate_pdf_file(
                tipo_informe=informe.tipo_informe,
                datos=datos,
                fecha_inicio=informe.fecha_inicio,
                fecha_fin=informe.fecha_fin,
                cierre_id=cierre_id,
            )
        elif formato_normalizado == InformeService.EXCEL:
            generated_file = InformeService._generate_excel_file(
                tipo_informe=informe.tipo_informe,
                fecha_inicio=informe.fecha_inicio,
                fecha_fin=informe.fecha_fin,
                limite=limite,
            )
        else:
            raise InformeError(
                _('El formato solicitado no es soportado.'),
                code='formato_invalido',
            )

        InformeService._assign_generated_file(
            informe,
            formato_normalizado,
            generated_file,
        )
        informe.save(update_fields=['archivo_pdf', 'archivo_excel'])

        if formato_normalizado == InformeService.PDF:
            return informe.archivo_pdf

        return informe.archivo_excel
