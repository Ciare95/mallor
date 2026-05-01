from datetime import date, datetime
from decimal import Decimal, InvalidOperation
from typing import Any, Dict, List, Optional

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.db.models import DecimalField, Q, Sum
from django.db.models.functions import Coalesce
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from core.exceptions import (
    CierreCajaDuplicadoError,
    CierreCajaNoEncontradoError,
    InformeError,
    RangoFechasInvalidoError,
)
from inventario.models import FacturaCompra
from usuario.models import Usuario

from .models import CierreCaja


ZERO = Decimal('0.00')
QUANTIZER = Decimal('0.01')
MANUAL_GASTO_KEYS = (
    'servicios_publicos',
    'arriendos',
    'salarios',
    'otros_gastos',
)


class CierreCajaService:
    """
    Servicio de negocio para la gestion de cierres de caja.

    Centraliza la generacion automatica de cierres diarios, el
    recalculo de gastos operativos y los ajustes manuales del cierre.
    """

    @staticmethod
    def _queryset_base():
        return CierreCaja.objects.select_related('usuario_cierre')

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
