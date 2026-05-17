from datetime import timedelta
from decimal import Decimal
from typing import Any, Dict, Optional

from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from core.exceptions import FacturacionOperacionError, FacturacionValidacionError
from empresa.models import Empresa
from ventas.models import Venta, VentaFacturaElectronica


DOCUMENT_CODE = '01'
OPERATION_TYPE = '10'
TAX_CODE_IVA = '01'

TIPO_DOCUMENTO_MAP = {
    'CC': '13',
    'NIT': '31',
    'CE': '22',
    'PASAPORTE': '41',
}

LEGAL_ORGANIZATION_MAP = {
    'NATURAL': '2',
    'JURIDICO': '1',
}

TRIBUTE_CODE_MAP = {
    True: '01',
    False: 'ZZ',
}

PAYMENT_FORM_MAP = {
    Venta.MetodoPago.CREDITO: 2,
    Venta.MetodoPago.EFECTIVO: 1,
    Venta.MetodoPago.TARJETA: 1,
    Venta.MetodoPago.TRANSFERENCIA: 1,
}

PAYMENT_METHOD_MAP = {
    Venta.MetodoPago.EFECTIVO: '10',
    Venta.MetodoPago.TARJETA: '49',
    Venta.MetodoPago.TRANSFERENCIA: '42',
    Venta.MetodoPago.CREDITO: '30',
}


def _format_decimal(value: Decimal) -> str:
    return Decimal(value).quantize(Decimal('0.01')).to_eng_string()


def build_reference_code(venta: Venta) -> str:
    documento = getattr(venta, 'factura_documento', None)
    if documento and documento.reference_code:
        return documento.reference_code
    empresa_id = venta.empresa_id or 0
    created_at = venta.created_at or venta.fecha_venta or timezone.now()
    timestamp = timezone.localtime(created_at).strftime('%Y%m%d%H%M%S')
    return f'MLR-E{empresa_id}-V{venta.id}-{timestamp}'


def _validate_cliente(venta: Venta) -> None:
    cliente = venta.cliente
    if cliente is None:
        raise FacturacionValidacionError(
            'La venta no tiene cliente asociado.',
            code='factus_cliente_requerido',
        )

    if not cliente.numero_documento:
        raise FacturacionValidacionError(
            'El adquirente debe tener numero de documento para facturar.',
            code='factus_cliente_documento',
        )

    if not cliente.get_nombre_completo():
        raise FacturacionValidacionError(
            'El adquirente debe tener nombre o razon social para facturar.',
            code='factus_cliente_nombre',
        )

    if not cliente.municipio_codigo:
        raise FacturacionValidacionError(
            'El cliente debe tener codigo de municipio para facturar.',
            code='factus_cliente_municipio',
        )

    if not cliente.direccion:
        raise FacturacionValidacionError(
            'El cliente debe tener direccion para facturar.',
            code='factus_cliente_direccion',
        )

    if not cliente.telefono:
        raise FacturacionValidacionError(
            'El cliente debe tener telefono para facturar.',
            code='factus_cliente_telefono',
        )


def validar_empresa_facturable(empresa: Empresa | None) -> None:
    if empresa is None:
        raise FacturacionValidacionError(
            'La venta no tiene empresa facturadora asociada.',
            code='factus_empresa_requerida',
        )

    required_fields = {
        'nit': 'NIT del vendedor',
        'razon_social': 'razon social del vendedor',
        'direccion': 'direccion fiscal del vendedor',
        'municipio_codigo': 'codigo de municipio del vendedor',
    }
    for field, label in required_fields.items():
        if not getattr(empresa, field):
            raise FacturacionValidacionError(
                f'Falta {label} para cumplir requisitos minimos de factura.',
                code=f'factus_empresa_{field}',
            )


def _validate_empresa(venta: Venta) -> None:
    validar_empresa_facturable(venta.empresa)


def _validate_detalles_articulo_617(venta: Venta) -> None:
    for detalle in venta.detalles.select_related('producto').all():
        producto = detalle.producto
        if not producto.nombre:
            raise FacturacionValidacionError(
                'Cada item debe tener descripcion para facturar.',
                code='factus_item_descripcion',
            )
        if not producto.unidad_medida_codigo:
            raise FacturacionValidacionError(
                'Cada item debe tener unidad de medida DIAN/Factus.',
                code='factus_item_unidad_medida',
            )
        if not producto.estandar_codigo:
            raise FacturacionValidacionError(
                'Cada item debe tener codigo estandar DIAN/Factus.',
                code='factus_item_estandar',
            )
        if detalle.precio_unitario <= Decimal('0.00'):
            raise FacturacionValidacionError(
                'Cada item debe tener valor unitario mayor que cero.',
                code='factus_item_valor_unitario',
            )
        if producto.iva is None:
            raise FacturacionValidacionError(
                'Cada item debe tener IVA definido, incluso si es 0%.',
                code='factus_item_iva',
            )


def validar_venta_facturable(venta: Venta) -> None:
    if venta.estado != Venta.Estado.TERMINADA:
        raise FacturacionValidacionError(
            'La venta debe estar TERMINADA para emitir factura electronica.',
            code='factus_venta_estado',
        )

    if not venta.factura_electronica:
        raise FacturacionValidacionError(
            'La venta no tiene activada la factura electronica.',
            code='factus_venta_flag',
        )

    if venta.total <= Decimal('0.00'):
        raise FacturacionValidacionError(
            'La venta debe tener total mayor que cero.',
            code='factus_venta_total',
        )

    if venta.numero_factura_electronica:
        raise FacturacionValidacionError(
            'La venta ya tiene numero de factura electronica.',
            code='factus_venta_emitida',
        )

    if not venta.detalles.exists():
        raise FacturacionValidacionError(
            'La venta debe tener detalles para facturar.',
            code='factus_venta_sin_detalles',
        )

    _validate_empresa(venta)
    _validate_cliente(venta)
    _validate_detalles_articulo_617(venta)


def build_factus_bill_payload(
    venta: Venta,
    numbering_range_id: int,
    *,
    send_email: bool = False,
    reference_code: Optional[str] = None,
) -> Dict[str, Any]:
    validar_venta_facturable(venta)
    factus_reference_code = reference_code or build_reference_code(venta)
    cliente = venta.cliente
    due_date = timezone.localdate()
    if venta.metodo_pago == Venta.MetodoPago.CREDITO:
        due_date = due_date + timedelta(days=max(cliente.dias_plazo, 1))

    payment_form = PAYMENT_FORM_MAP[venta.metodo_pago]
    payment_method_code = PAYMENT_METHOD_MAP[venta.metodo_pago]
    customer_name = cliente.get_nombre_completo()
    company_name = cliente.razon_social or customer_name
    identification_code = TIPO_DOCUMENTO_MAP.get(
        cliente.tipo_documento,
        '13',
    )

    items = []
    for detalle in venta.detalles.select_related('producto').all():
        producto = detalle.producto
        code_reference = producto.codigo_barras or producto.codigo_interno_formateado
        taxes = [{
            'code': TAX_CODE_IVA,
            'rate': _format_decimal(producto.iva),
        }]

        items.append({
            'code_reference': code_reference,
            'name': producto.nombre,
            'quantity': _format_decimal(detalle.cantidad),
            'discount_rate': _format_decimal(
                (detalle.descuento / detalle.subtotal * 100)
                if detalle.subtotal > Decimal('0.00')
                else Decimal('0.00')
            ),
            'price': _format_decimal(detalle.precio_unitario),
            'unit_measure_code': producto.unidad_medida_codigo,
            'standard_code': producto.estandar_codigo,
            'taxes': taxes,
        })

    payload = {
        'reference_code': factus_reference_code,
        'document': DOCUMENT_CODE,
        'numbering_range_id': numbering_range_id,
        'operation_type': OPERATION_TYPE,
        'send_email': send_email and bool(cliente.email),
        'payment_details': [{
            'payment_form': payment_form,
            'payment_method_code': payment_method_code,
            'reference_code': factus_reference_code,
            'amount': _format_decimal(venta.total),
            'due_date': due_date.isoformat(),
        }],
        'observation': venta.observaciones or '',
        'customer': {
            'identification_document_code': identification_code,
            'identification': cliente.numero_documento,
            'dv': cliente.digito_verificacion or '',
            'company': company_name,
            'trade_name': cliente.nombre_comercial or customer_name,
            'names': cliente.nombre or customer_name,
            'address': cliente.direccion,
            'email': cliente.email or '',
            'phone': cliente.telefono,
            'legal_organization_code': LEGAL_ORGANIZATION_MAP.get(
                cliente.tipo_cliente,
                '2',
            ),
            'tribute_code': TRIBUTE_CODE_MAP[bool(cliente.responsable_iva)],
            'municipality_code': cliente.municipio_codigo,
        },
        'items': items,
    }
    return payload


def _first_data(payload: Any) -> Any:
    if isinstance(payload, dict):
        for key in ('data', 'bill', 'invoice'):
            value = payload.get(key)
            if value:
                return value
    return payload


def extract_bill_result(payload: Dict[str, Any]) -> Dict[str, Any]:
    data = _first_data(payload)
    if isinstance(data, list):
        data = data[0] if data else {}
    data = data or {}
    return {
        'bill_number': (
            data.get('number')
            or data.get('bill_number')
            or payload.get('number')
            or payload.get('bill_number')
            or ''
        ),
        'cufe': data.get('cufe') or payload.get('cufe') or '',
        'resolution_number': (
            data.get('resolution_number')
            or payload.get('resolution_number')
            or ''
        ),
        'validated_at': (
            data.get('validated_at')
            or payload.get('validated_at')
            or data.get('created_at')
            or payload.get('created_at')
        ),
        'raw': payload,
    }


def validate_bill_response(
    request_payload: Dict[str, Any],
    response_payload: Dict[str, Any],
) -> None:
    data = _first_data(response_payload)
    if isinstance(data, list):
        data = data[0] if data else {}
    data = data or {}

    request_customer = request_payload.get('customer') or {}
    response_customer = data.get('customer') or {}
    request_identification = str(
        request_customer.get('identification') or '',
    ).strip()
    response_identification = str(
        response_customer.get('identification') or '',
    ).strip()

    request_total = str(
        ((request_payload.get('payment_details') or [{}])[0]).get('amount') or '',
    ).strip()
    response_total = str(
        ((data.get('totals') or {}).get('total')) or '',
    ).strip()

    if (
        request_identification
        and response_identification
        and request_identification != response_identification
    ):
        raise FacturacionOperacionError(
            'Factus devolvio una factura con un cliente distinto al enviado.',
            code='factus_respuesta_inconsistente',
        )

    if request_total and response_total and request_total != response_total:
        raise FacturacionOperacionError(
            'Factus devolvio una factura con total distinto al enviado.',
            code='factus_respuesta_inconsistente',
        )


def build_credit_note_payload(
    factura: VentaFacturaElectronica,
    numbering_range_id: int,
    concept_code: str,
    reason: str,
    *,
    reference_code: Optional[str] = None,
) -> Dict[str, Any]:
    if not factura.bill_number:
        raise FacturacionValidacionError(
            'La venta no tiene numero de factura emitido.',
            code='factus_nota_sin_factura',
        )

    original_payload = factura.request_payload or {}
    payment_details = original_payload.get('payment_details') or []
    customer = original_payload.get('customer') or {}
    items = original_payload.get('items') or []

    if not payment_details or not customer or not items:
        raise FacturacionValidacionError(
            (
                'La factura original no tiene payload suficiente para '
                'construir la nota credito.'
            ),
            code='factus_nota_payload_incompleto',
        )

    note_reference = reference_code or f'NC-{factura.reference_code}'
    normalized_payment_details = []
    for detail in payment_details:
        normalized_detail = dict(detail)
        normalized_detail['reference_code'] = note_reference
        normalized_payment_details.append(normalized_detail)

    return {
        'reference_code': note_reference,
        'correction_concept_code': concept_code,
        'customization_id': '20',
        'bill_number': factura.bill_number,
        'numbering_range_id': numbering_range_id,
        'payment_details': normalized_payment_details,
        'observation': reason,
        'customer': customer,
        'items': items,
    }
