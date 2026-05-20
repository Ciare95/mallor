import logging
import zlib
from typing import Any, Dict, Optional

from django.db import transaction
from django.utils.dateparse import parse_date, parse_datetime
from django.utils import timezone

from core.exceptions import (
    FacturacionConfiguracionError,
    FacturacionDocumentoNoEncontradoError,
    FacturacionError,
    FacturacionOperacionError,
    FacturacionValidacionError,
)
from ventas.adapters.factus_adapter import FactusAdapter
from empresa.context import get_empresa_actual_or_default
from empresa.services import EmpresaService
from ventas.factus_transformers import (
    build_credit_note_payload,
    build_factus_bill_payload,
    build_reference_code,
    extract_bill_result,
    validate_bill_response,
    validar_venta_facturable,
)
from ventas.models import (
    FacturacionElectronicaConfig,
    FacturaElectronicaEntrega,
    FacturaElectronicaIntento,
    FacturaElectronicaSoporte,
    FactusNumberingRange,
    Venta,
    VentaFacturaElectronica,
)


logger = logging.getLogger('mallor.factus')


def _parse_optional_date(value: Any):
    if not value:
        return None
    if hasattr(value, 'year'):
        return value
    return parse_date(str(value))


def _parse_optional_datetime(value: Any):
    if not value:
        return None
    if hasattr(value, 'hour'):
        return value
    parsed = parse_datetime(str(value))
    if parsed is not None:
        return parsed
    return None


def _extract_rows(payload: Dict[str, Any]) -> list[Dict[str, Any]]:
    data = payload.get('data')
    if isinstance(data, dict):
        nested = data.get('data')
        if isinstance(nested, list):
            return nested
    if isinstance(data, list):
        return data
    numbering_ranges = payload.get('numbering_ranges')
    if isinstance(numbering_ranges, list):
        return numbering_ranges
    return []


def _nested_get(source: Dict[str, Any], path: str) -> Any:
    current: Any = source
    for segment in path.split('.'):
        if not isinstance(current, dict):
            return None
        current = current.get(segment)
    return current


def _normalize_range_document_code(value: Any) -> str:
    raw = str(value or '').strip().lower()
    mapping = {
        '01': '01',
        '21': '01',
        'factura de venta': '01',
        'factura': '01',
        '22': '22',
        'nota crédito': '22',
        'nota credito': '22',
        '23': '23',
        'nota débito': '23',
        'nota debito': '23',
        '24': '24',
        'documento soporte': '24',
        '25': '25',
        'nota de ajuste documento soporte': '25',
        '26': '26',
        'nómina': '26',
        'nomina': '26',
        '27': '27',
        'nota de ajuste nómina': '27',
        'nota de ajuste nomina': '27',
        '28': '28',
        'nota de eliminación de nómina': '28',
        'nota de eliminacion de nomina': '28',
    }
    return mapping.get(raw, '')


def _resolve_range_factus_id(row: Dict[str, Any]) -> Optional[int]:
    factus_id = row.get('id') or row.get('numbering_range_id')
    if factus_id:
        return int(factus_id)

    fallback_parts = [
        row.get('prefix') or '',
        row.get('resolution_number') or '',
        row.get('from') or row.get('from_number') or '',
        row.get('to') or row.get('to_number') or '',
    ]
    fallback_key = '|'.join(str(part).strip() for part in fallback_parts if part)
    if not fallback_key:
        return None

    synthetic_id = zlib.crc32(fallback_key.encode('utf-8')) % 2147483647
    return synthetic_id or 1


class FacturacionElectronicaService:
    def __init__(self, adapter=None):
        self.adapter = adapter

    def _adapter_for_empresa(self, empresa):
        return self.adapter or FactusAdapter(empresa=empresa)

    @staticmethod
    def _extract_qr_payload(
        response_payload: Optional[Dict[str, Any]],
        *,
        cufe: str = '',
    ) -> Dict[str, Any]:
        payload = response_payload or {}
        data = payload.get('data') if isinstance(payload, dict) else {}
        if not isinstance(data, dict):
            data = {}

        qr_value = (
            data.get('qr_image')
            or data.get('qr')
            or data.get('qr_code')
            or data.get('qr_data_url')
            or data.get('qr_url')
            or _nested_get(data, 'links.qr')
            or _nested_get(data, 'bill.links.qr')
            or _nested_get(data, 'invoice.links.qr')
            or cufe
        )
        public_url = _nested_get(data, 'links.public_url') or ''

        return {
            'value': str(qr_value or '').strip(),
            'source_url': (
                str(_nested_get(data, 'links.qr') or '').strip()
            ),
            'public_url': str(public_url).strip(),
            'cufe': str(cufe or '').strip(),
        }

    @staticmethod
    def _build_qr_svg(qr_value: str) -> str:
        normalized = str(qr_value or '').strip()
        if not normalized:
            return ''

        try:
            from reportlab.graphics import renderSVG
            from reportlab.graphics.barcode.qr import QrCodeWidget
            from reportlab.graphics.shapes import Drawing
        except Exception as exc:
            logger.warning('No fue posible importar generador SVG de QR: %s', exc)
            return ''

        try:
            qr_widget = QrCodeWidget(normalized)
            bounds = qr_widget.getBounds()
            width = bounds[2] - bounds[0]
            height = bounds[3] - bounds[1]
            size = 132
            drawing = Drawing(
                size,
                size,
                transform=[size / width, 0, 0, size / height, 0, 0],
            )
            drawing.add(qr_widget)
            svg = renderSVG.drawToString(drawing)
            if isinstance(svg, bytes):
                return svg.decode('utf-8')
            return str(svg)
        except Exception as exc:
            logger.warning('No fue posible generar SVG QR para factura: %s', exc)
            return ''

    @staticmethod
    def get_config(empresa=None) -> FacturacionElectronicaConfig:
        return FacturacionElectronicaConfig.get_solo(empresa)

    @staticmethod
    def _require_enabled_config(empresa=None) -> FacturacionElectronicaConfig:
        config = FacturacionElectronicaService.get_config(empresa)
        if not config.is_enabled:
            raise FacturacionConfiguracionError(
                'La facturacion electronica no esta habilitada.',
                code='factus_config_disabled',
            )
        if config.active_bill_range is None:
            raise FacturacionConfiguracionError(
                'No hay rango activo configurado para facturas.',
                code='factus_rango_factura',
            )
        return config

    @staticmethod
    def _get_or_create_documento(
        venta: Venta,
        numbering_range: Optional[FactusNumberingRange] = None,
    ) -> VentaFacturaElectronica:
        documento, _ = VentaFacturaElectronica.objects.get_or_create(
            venta=venta,
            defaults={
                'empresa': venta.empresa,
                'reference_code': build_reference_code(venta),
                'numbering_range': numbering_range,
            },
        )
        if documento.empresa_id is None and venta.empresa_id:
            documento.empresa = venta.empresa
            documento.save(update_fields=['empresa', 'updated_at'])
        if numbering_range and documento.numbering_range_id is None:
            documento.numbering_range = numbering_range
            documento.save(update_fields=['numbering_range', 'updated_at'])
        return documento

    @staticmethod
    def _registrar_intento(
        *,
        factura: Optional[VentaFacturaElectronica],
        action: str,
        is_success: bool,
        empresa=None,
        request_payload: Optional[Dict[str, Any]] = None,
        response_payload: Optional[Dict[str, Any]] = None,
        error_message: str = '',
        response_status_code: Optional[int] = None,
    ) -> None:
        if factura is not None:
            empresa = factura.empresa or factura.venta.empresa
        elif empresa is None:
            empresa = get_empresa_actual_or_default()
        FacturaElectronicaIntento.objects.create(
            factura=factura,
            empresa=empresa,
            action=action,
            is_success=is_success,
            request_payload=request_payload or {},
            response_payload=response_payload or {},
            error_message=error_message,
            response_status_code=response_status_code,
        )

    @staticmethod
    def _registrar_entrega(
        documento: VentaFacturaElectronica,
        *,
        medio: str,
        destino: str = '',
        resultado: str = FacturaElectronicaEntrega.Resultado.PENDIENTE,
        mensaje: str = '',
        usuario=None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> FacturaElectronicaEntrega:
        entrega = FacturaElectronicaEntrega.objects.create(
            factura=documento,
            empresa=documento.empresa,
            medio=medio,
            destino=destino or '',
            resultado=resultado,
            mensaje=mensaje or '',
            usuario=usuario if getattr(usuario, 'is_authenticated', True) else None,
            metadata=metadata or {},
        )
        if hasattr(documento, '_prefetched_objects_cache'):
            documento._prefetched_objects_cache.pop('entregas', None)
        return entrega

    @staticmethod
    def _registrar_entrega_post_emision(
        documento: VentaFacturaElectronica,
        *,
        send_email: bool,
    ) -> None:
        cliente_email = documento.venta.cliente.email if documento.venta.cliente else ''
        if send_email and cliente_email:
            documento.email_last_sent_at = documento.email_last_sent_at or timezone.now()
            documento.save(update_fields=['email_last_sent_at', 'updated_at'])
            FacturacionElectronicaService._registrar_entrega(
                documento,
                medio=FacturaElectronicaEntrega.Medio.EMAIL,
                destino=cliente_email,
                resultado=FacturaElectronicaEntrega.Resultado.EXITOSO,
                mensaje='Factura enviada por Factus durante la emision.',
            )
            return

        FacturacionElectronicaService._registrar_entrega(
            documento,
            medio=FacturaElectronicaEntrega.Medio.SIN_MEDIO,
            resultado=FacturaElectronicaEntrega.Resultado.PENDIENTE,
            mensaje=(
                'Factura emitida sin entrega confirmada. Debe registrarse '
                'email, descarga o impresion al adquirente.'
            ),
        )

    @staticmethod
    def _registrar_soporte(
        documento: VentaFacturaElectronica,
        *,
        tipo: str,
        payload: Dict[str, Any],
    ) -> FacturaElectronicaSoporte:
        content = payload.get('content') or b''
        if isinstance(content, str):
            content = content.encode('utf-8')
        soporte, _ = FacturaElectronicaSoporte.objects.update_or_create(
            factura=documento,
            tipo=tipo,
            defaults={
                'empresa': documento.empresa,
                'filename': payload.get('filename') or f'{documento.bill_number}.{tipo.lower()}',
                'content_type': payload.get('content_type') or '',
                'content': content,
                'metadata': {
                    'bill_number': documento.bill_number,
                    'cufe': documento.cufe,
                    'retencion_minima_anos': 5,
                },
            },
        )
        if hasattr(documento, '_prefetched_objects_cache'):
            documento._prefetched_objects_cache.pop('soportes', None)
        return soporte

    @staticmethod
    def _payload_desde_soporte(
        documento: VentaFacturaElectronica,
        *,
        tipo: str,
    ) -> Optional[Dict[str, Any]]:
        soporte = documento.soportes.filter(tipo=tipo).first()
        if soporte is None:
            return None
        content = soporte.content
        if isinstance(content, memoryview):
            content = content.tobytes()
        return {
            'content': bytes(content or b''),
            'content_type': soporte.content_type,
            'filename': soporte.filename,
            'from_archive': True,
        }

    @staticmethod
    def _is_pending_dian_conflict(code: str, message: str) -> bool:
        return (
            code == 'factus_http_409'
            and 'pendiente por enviar a la dian' in (message or '').lower()
        )

    @staticmethod
    def _next_retry_reference_code(
        documento: VentaFacturaElectronica,
    ) -> str:
        base_reference = documento.reference_code
        if '-R' in base_reference:
            base_reference = base_reference.rsplit('-R', 1)[0]
        retry_prefix = f'{base_reference}-R'
        next_retry = 1

        if documento.reference_code.startswith(retry_prefix):
            try:
                next_retry = int(
                    documento.reference_code.removeprefix(retry_prefix),
                ) + 1
            except ValueError:
                next_retry = 1

        for retry_number in range(next_retry, next_retry + 100):
            candidate = f'{retry_prefix}{retry_number}'
            exists = VentaFacturaElectronica.objects.filter(
                reference_code=candidate,
            ).exclude(pk=documento.pk).exists()
            if not exists:
                return candidate

        raise FacturacionOperacionError(
            'No fue posible generar una referencia de reintento para Factus.',
            code='factus_reference_retry_exhausted',
        )

    def _rotate_reference_if_pending_conflict(
        self,
        documento: VentaFacturaElectronica,
    ) -> None:
        if not self._is_pending_dian_conflict(
            documento.last_error_code,
            documento.last_error_message,
        ):
            return

        documento.reference_code = self._next_retry_reference_code(documento)
        documento.last_error_code = ''
        documento.last_error_message = ''
        documento.save(
            update_fields=[
                'reference_code',
                'last_error_code',
                'last_error_message',
                'updated_at',
            ],
        )

    @staticmethod
    def _next_credit_note_reference_code(
        documento: VentaFacturaElectronica,
        current_reference: str,
    ) -> str:
        base_reference = current_reference or f'NC-{documento.reference_code}'
        if '-R' in base_reference:
            base_reference = base_reference.rsplit('-R', 1)[0]
        retry_prefix = f'{base_reference}-R'
        next_retry = 1

        if current_reference.startswith(retry_prefix):
            try:
                next_retry = int(
                    current_reference.removeprefix(retry_prefix),
                ) + 1
            except ValueError:
                next_retry = 1

        return f'{retry_prefix}{next_retry}'

    def validar_conexion(
        self,
        empresa=None,
        *,
        environment: Optional[str] = None,
    ) -> Dict[str, Any]:
        empresa = empresa or get_empresa_actual_or_default()
        EmpresaService.validar_empresa_activa(empresa)
        config = self.get_config(empresa)
        if environment:
            config.environment = environment
            config.save(update_fields=['environment', 'updated_at'])
        payload = self._adapter_for_empresa(empresa).validar_conexion()
        config.company_snapshot = payload
        config.last_connection_status = 'ok'
        config.last_connection_checked_at = timezone.now()
        config.save(
            update_fields=[
                'company_snapshot',
                'last_connection_status',
                'last_connection_checked_at',
                'updated_at',
            ],
        )
        self._registrar_intento(
            factura=None,
            action=FacturaElectronicaIntento.Action.VALIDAR_CONEXION,
            is_success=True,
            empresa=empresa,
            response_payload=payload,
        )
        return payload

    @transaction.atomic
    def sincronizar_rangos(
        self,
        empresa=None,
        *,
        environment: Optional[str] = None,
    ) -> Dict[str, Any]:
        empresa = empresa or get_empresa_actual_or_default()
        EmpresaService.validar_empresa_activa(empresa)
        config = self.get_config(empresa)
        if environment:
            config.environment = environment
            config.save(update_fields=['environment', 'updated_at'])
        adapter = self._adapter_for_empresa(empresa)
        rangos_response = adapter.listar_rangos()
        empresa_response = adapter.ver_empresa()

        rows = _extract_rows(rangos_response)
        synced_ids = []

        for row in rows:
            factus_id = _resolve_range_factus_id(row)
            if not factus_id:
                continue
            document_code = _normalize_range_document_code(
                row.get('document_code') or row.get('document') or '01',
            )
            if document_code not in {'01', '22'}:
                continue
            synced_ids.append(factus_id)
            range_obj, _ = FactusNumberingRange.objects.update_or_create(
                empresa=empresa,
                factus_id=factus_id,
                defaults={
                    'document_code': document_code,
                    'prefix': row.get('prefix') or '',
                    'from_number': row.get('from') or row.get('from_number') or 0,
                    'to_number': row.get('to') or row.get('to_number') or 0,
                    'current_number': row.get('current') or row.get('current_number') or 0,
                    'resolution_number': str(row.get('resolution_number') or ''),
                    'start_date': _parse_optional_date(
                        row.get('start_date') or row.get('valid_from'),
                    ),
                    'end_date': _parse_optional_date(
                        row.get('end_date') or row.get('valid_to'),
                    ),
                    'is_active': str(row.get('is_active', '1')).strip() not in {
                        '0',
                        'false',
                        'False',
                        '',
                    },
                    'is_credit_note_range': document_code == '22',
                    'raw_payload': row,
                },
            )
            if config.active_bill_range_id is None and not range_obj.is_credit_note_range:
                config.active_bill_range = range_obj
            if config.active_credit_note_range_id is None and range_obj.is_credit_note_range:
                config.active_credit_note_range = range_obj

        FactusNumberingRange.objects.filter(empresa=empresa).exclude(
            factus_id__in=synced_ids,
        ).update(is_active=False)

        if config.active_bill_range_id and not FactusNumberingRange.objects.filter(
            pk=config.active_bill_range_id,
            factus_id__in=synced_ids,
            is_active=True,
        ).exists():
            config.active_bill_range = None
        if (
            config.active_credit_note_range_id
            and not FactusNumberingRange.objects.filter(
                pk=config.active_credit_note_range_id,
                factus_id__in=synced_ids,
                is_active=True,
            ).exists()
        ):
            config.active_credit_note_range = None

        config.company_snapshot = empresa_response
        config.last_connection_status = 'ok'
        config.last_connection_checked_at = timezone.now()
        config.save()

        self._registrar_intento(
            factura=None,
            action=FacturaElectronicaIntento.Action.SINCRONIZAR_RANGOS,
            is_success=True,
            empresa=empresa,
            response_payload={
                'rangos': rangos_response,
                'empresa': empresa_response,
            },
        )
        return {
            'count': len(synced_ids),
            'company_snapshot': empresa_response,
        }

    def diagnostico_notas_credito_pendientes(self) -> Dict[str, Any]:
        empresa = get_empresa_actual_or_default()
        EmpresaService.validar_empresa_activa(empresa)
        config = self.get_config(empresa)
        response = self._adapter_for_empresa(empresa).listar_notas_credito(
            status='0',
        )
        rows = _extract_rows(response)

        bill_numbers = []
        for row in rows:
            bill_number = _nested_get(row, 'bill.number')
            if bill_number:
                bill_numbers.append(str(bill_number))

        documentos = {
            documento.bill_number: documento
            for documento in VentaFacturaElectronica.objects.select_related('venta').filter(
                empresa=empresa,
                bill_number__in=bill_numbers,
            )
        }

        items = []
        for row in rows:
            bill_number = str(_nested_get(row, 'bill.number') or '').strip()
            documento = documentos.get(bill_number)
            customer_name = (
                _nested_get(row, 'customer.graphic_representation_name')
                or _nested_get(row, 'customer.names')
                or _nested_get(row, 'customer.company')
                or ''
            )
            items.append({
                'reference_code': str(row.get('reference_code') or '').strip(),
                'number': str(row.get('number') or '').strip(),
                'is_validated': bool(row.get('is_validated')),
                'validated_at': row.get('validated_at'),
                'created_at': row.get('created_at'),
                'observation': str(row.get('observation') or '').strip(),
                'total': str(row.get('total') or '').strip(),
                'errors': row.get('errors'),
                'customer_name': str(customer_name).strip(),
                'customer_identification': str(
                    _nested_get(row, 'customer.identification') or '',
                ).strip(),
                'bill_number': bill_number,
                'bill_reference_code': str(
                    _nested_get(row, 'bill.reference_code') or '',
                ).strip(),
                'local_document': (
                    {
                        'venta_id': documento.venta_id,
                        'numero_venta': documento.venta.numero_venta,
                        'factura_id': documento.id,
                        'bill_number': documento.bill_number,
                        'reference_code': documento.reference_code,
                        'credit_note_number': documento.credit_note_number,
                        'last_error_code': documento.last_error_code,
                        'last_error_message': documento.last_error_message,
                    }
                    if documento is not None else None
                ),
            })

        return {
            'environment': config.environment,
            'count': len(items),
            'items': items,
            'fetched_at': timezone.now().isoformat(),
        }

    def diagnostico_detalle_nota_credito(self, note_number: str) -> Dict[str, Any]:
        empresa = get_empresa_actual_or_default()
        EmpresaService.validar_empresa_activa(empresa)
        response = self._adapter_for_empresa(empresa).consultar_nota_credito(
            note_number,
        )
        data = response.get('data') or {}
        bill_number = str(_nested_get(data, 'bill.number') or '').strip()
        documento = None
        if bill_number:
            documento = VentaFacturaElectronica.objects.select_related('venta').filter(
                empresa=empresa,
                bill_number=bill_number,
            ).first()

        customer_name = (
            _nested_get(data, 'customer.graphic_representation_name')
            or _nested_get(data, 'customer.names')
            or _nested_get(data, 'customer.company')
            or ''
        )
        return {
            'reference_code': str(data.get('reference_code') or '').strip(),
            'number': str(data.get('number') or '').strip(),
            'is_validated': bool(data.get('is_validated')),
            'validated_at': data.get('validated_at'),
            'created_at': data.get('created_at'),
            'observation': str(data.get('observation') or '').strip(),
            'total': str(_nested_get(data, 'totals.total') or data.get('total') or '').strip(),
            'errors': data.get('errors'),
            'cude': str(data.get('cude') or '').strip(),
            'bill_number': bill_number,
            'bill_reference_code': str(
                _nested_get(data, 'bill.reference_code') or '',
            ).strip(),
            'bill_cufe': str(_nested_get(data, 'bill.cufe') or '').strip(),
            'customer_name': str(customer_name).strip(),
            'customer_identification': str(
                _nested_get(data, 'customer.identification') or '',
            ).strip(),
            'public_url': str(_nested_get(data, 'links.public_url') or '').strip(),
            'qr_url': str(_nested_get(data, 'links.qr') or '').strip(),
            'local_document': (
                {
                    'venta_id': documento.venta_id,
                    'numero_venta': documento.venta.numero_venta,
                    'factura_id': documento.id,
                    'bill_number': documento.bill_number,
                    'reference_code': documento.reference_code,
                    'credit_note_number': documento.credit_note_number,
                    'last_error_code': documento.last_error_code,
                    'last_error_message': documento.last_error_message,
                }
                if documento is not None else None
            ),
        }

    def emitir_factura(self, venta_id: int) -> VentaFacturaElectronica:
        empresa = get_empresa_actual_or_default()
        EmpresaService.validar_empresa_activa(empresa)
        config = self._require_enabled_config(empresa)
        venta = Venta.objects.select_related('cliente').prefetch_related(
            'detalles__producto',
        ).get(pk=venta_id, empresa=empresa)
        validar_venta_facturable(venta)
        documento = self._get_or_create_documento(venta, config.active_bill_range)
        self._rotate_reference_if_pending_conflict(documento)

        payload = build_factus_bill_payload(
            venta,
            config.active_bill_range.factus_id,
            send_email=config.auto_enviar_email,
            reference_code=documento.reference_code,
        )
        documento.status = VentaFacturaElectronica.Status.PENDIENTE_ENVIO
        documento.request_payload = payload
        documento.last_error_code = ''
        documento.last_error_message = ''
        documento.save()

        try:
            response = self._adapter_for_empresa(empresa).emitir_factura(payload)
            validate_bill_response(payload, response)
            parsed = extract_bill_result(response)
            qr_payload = self._extract_qr_payload(
                response,
                cufe=parsed['cufe'],
            )
            documento.status = VentaFacturaElectronica.Status.EMITIDA
            documento.bill_number = parsed['bill_number']
            documento.cufe = parsed['cufe']
            documento.resolution_number = parsed['resolution_number']
            documento.response_payload = response
            documento.qr_payload = qr_payload
            documento.qr_svg = self._build_qr_svg(qr_payload.get('value', ''))
            documento.validated_at = (
                _parse_optional_datetime(parsed['validated_at'])
                or timezone.now()
            )
            documento.save()
            documento.sync_venta_fields()
            documento.venta.invoice_status = Venta.InvoiceStatus.FACTURA_EMITIDA
            documento.venta.save(
                update_fields=['invoice_status', 'updated_at'],
            )
            self._registrar_intento(
                factura=documento,
                action=FacturaElectronicaIntento.Action.EMITIR,
                is_success=True,
                request_payload=payload,
                response_payload=response,
            )
            self._registrar_entrega_post_emision(
                documento,
                send_email=payload.get('send_email', False),
            )
            return documento
        except Exception as exc:
            documento.status = VentaFacturaElectronica.Status.ERROR
            documento.last_error_code = getattr(exc, 'code', 'factus_error')
            documento.last_error_message = getattr(exc, 'message', str(exc))
            if 'response' in locals():
                documento.response_payload = response
            if self._is_pending_dian_conflict(
                documento.last_error_code,
                documento.last_error_message,
            ):
                documento.reference_code = self._next_retry_reference_code(documento)
            documento.save()
            documento.venta.invoice_status = Venta.InvoiceStatus.ERROR_FACTURACION
            documento.venta.save(
                update_fields=['invoice_status', 'updated_at'],
            )
            self._registrar_intento(
                factura=documento,
                action=FacturaElectronicaIntento.Action.EMITIR,
                is_success=False,
                request_payload=payload,
                error_message=str(exc),
            )
            raise

    def obtener_documento(self, venta_id: int) -> VentaFacturaElectronica:
        empresa = get_empresa_actual_or_default()
        try:
            return VentaFacturaElectronica.objects.select_related(
                'venta',
                'numbering_range',
            ).prefetch_related('entregas', 'intentos', 'soportes').get(
                venta_id=venta_id,
                empresa=empresa,
            )
        except VentaFacturaElectronica.DoesNotExist as exc:
            raise FacturacionDocumentoNoEncontradoError(
                'La venta no tiene documento electronico asociado.',
                code='factus_documento_no_encontrado',
            ) from exc

    def reintentar_emision(self, venta_id: int) -> VentaFacturaElectronica:
        documento = self.obtener_documento(venta_id)
        if documento.status == VentaFacturaElectronica.Status.EMITIDA:
            raise FacturacionValidacionError(
                'La factura ya fue emitida.',
                code='factus_documento_emitido',
            )
        return self.emitir_factura(venta_id)

    @transaction.atomic
    def consultar_estado(self, venta_id: int) -> VentaFacturaElectronica:
        documento = self.obtener_documento(venta_id)
        if not documento.bill_number:
            raise FacturacionValidacionError(
                'La venta aun no tiene numero emitido en Factus.',
                code='factus_numero_no_disponible',
            )
        response = self._adapter_for_empresa(
            documento.empresa,
        ).consultar_factura(documento.bill_number)
        documento.response_payload = response
        documento.save(update_fields=['response_payload', 'updated_at'])
        self._registrar_intento(
            factura=documento,
            action=FacturaElectronicaIntento.Action.CONSULTAR,
            is_success=True,
            response_payload=response,
        )
        return documento

    @transaction.atomic
    def enviar_email(self, venta_id: int, email: Optional[str] = None) -> VentaFacturaElectronica:
        documento = self.obtener_documento(venta_id)
        if not documento.bill_number:
            raise FacturacionValidacionError(
                'La venta aun no tiene factura emitida.',
                code='factus_email_sin_numero',
            )
        target_email = email or documento.venta.cliente.email
        if not target_email:
            raise FacturacionValidacionError(
                'Debe indicar un email destino.',
                code='factus_email_requerido',
            )
        response = self._adapter_for_empresa(
            documento.empresa,
        ).enviar_email(documento.bill_number, target_email)
        documento.email_last_sent_at = timezone.now()
        documento.response_payload = response
        documento.save(
            update_fields=['email_last_sent_at', 'response_payload', 'updated_at'],
        )
        self._registrar_intento(
            factura=documento,
            action=FacturaElectronicaIntento.Action.ENVIAR_EMAIL,
            is_success=True,
            response_payload=response,
        )
        self._registrar_entrega(
            documento,
            medio=FacturaElectronicaEntrega.Medio.EMAIL,
            destino=target_email,
            resultado=FacturaElectronicaEntrega.Resultado.EXITOSO,
            mensaje='Factura enviada por email al adquirente.',
            metadata={'response': response},
        )
        return documento

    def descargar_pdf(self, venta_id: int, usuario=None) -> Dict[str, Any]:
        documento = self.obtener_documento(venta_id)
        if not documento.bill_number:
            raise FacturacionValidacionError(
                'La venta aun no tiene factura emitida.',
                code='factus_pdf_sin_numero',
            )
        try:
            payload = self._adapter_for_empresa(documento.empresa).descargar_pdf(
                documento.bill_number,
            )
            self._registrar_intento(
                factura=documento,
                action=FacturaElectronicaIntento.Action.DESCARGAR_PDF,
                is_success=True,
            )
            self._registrar_soporte(
                documento,
                tipo=FacturaElectronicaSoporte.Tipo.PDF,
                payload=payload,
            )
        except FacturacionError as exc:
            self._registrar_intento(
                factura=documento,
                action=FacturaElectronicaIntento.Action.DESCARGAR_PDF,
                is_success=False,
                error_message=str(exc),
            )
            payload = self._payload_desde_soporte(
                documento,
                tipo=FacturaElectronicaSoporte.Tipo.PDF,
            )
            if payload is None:
                raise
        self._registrar_entrega(
            documento,
            medio=FacturaElectronicaEntrega.Medio.DESCARGA,
            destino=payload.get('filename') or documento.bill_number,
            resultado=FacturaElectronicaEntrega.Resultado.EXITOSO,
            mensaje='Representacion grafica descargada para entrega al adquirente.',
            usuario=usuario,
        )
        return payload

    def descargar_xml(self, venta_id: int, usuario=None) -> Dict[str, Any]:
        documento = self.obtener_documento(venta_id)
        if not documento.bill_number:
            raise FacturacionValidacionError(
                'La venta aun no tiene factura emitida.',
                code='factus_xml_sin_numero',
            )
        try:
            payload = self._adapter_for_empresa(documento.empresa).descargar_xml(
                documento.bill_number,
            )
            self._registrar_intento(
                factura=documento,
                action=FacturaElectronicaIntento.Action.DESCARGAR_XML,
                is_success=True,
            )
            self._registrar_soporte(
                documento,
                tipo=FacturaElectronicaSoporte.Tipo.XML,
                payload=payload,
            )
        except FacturacionError as exc:
            self._registrar_intento(
                factura=documento,
                action=FacturaElectronicaIntento.Action.DESCARGAR_XML,
                is_success=False,
                error_message=str(exc),
            )
            payload = self._payload_desde_soporte(
                documento,
                tipo=FacturaElectronicaSoporte.Tipo.XML,
            )
            if payload is None:
                raise
        return payload

    @transaction.atomic
    def registrar_entrega(
        self,
        venta_id: int,
        *,
        medio: str,
        destino: str = '',
        resultado: str = FacturaElectronicaEntrega.Resultado.EXITOSO,
        mensaje: str = '',
        usuario=None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> VentaFacturaElectronica:
        documento = self.obtener_documento(venta_id)
        if documento.status != VentaFacturaElectronica.Status.EMITIDA:
            raise FacturacionValidacionError(
                'Solo se puede registrar entrega de una factura emitida.',
                code='factus_entrega_sin_emision',
            )
        if medio not in FacturaElectronicaEntrega.Medio.values:
            raise FacturacionValidacionError(
                'Medio de entrega no valido.',
                code='factus_entrega_medio',
            )
        if resultado not in FacturaElectronicaEntrega.Resultado.values:
            raise FacturacionValidacionError(
                'Resultado de entrega no valido.',
                code='factus_entrega_resultado',
            )
        self._registrar_entrega(
            documento,
            medio=medio,
            destino=destino,
            resultado=resultado,
            mensaje=mensaje,
            usuario=usuario,
            metadata=metadata,
        )
        if (
            medio == FacturaElectronicaEntrega.Medio.EMAIL
            and resultado == FacturaElectronicaEntrega.Resultado.EXITOSO
        ):
            documento.email_last_sent_at = timezone.now()
            documento.save(update_fields=['email_last_sent_at', 'updated_at'])
        return documento

    def crear_nota_credito(
        self,
        venta_id: int,
        *,
        reason: str,
        concept_code: str = '1',
    ) -> VentaFacturaElectronica:
        documento = self.obtener_documento(venta_id)
        config = self.get_config(documento.empresa)
        if config.active_credit_note_range is None:
            raise FacturacionConfiguracionError(
                'No hay rango activo configurado para notas credito.',
                code='factus_rango_nota_credito',
            )
        note_reference = (
            (
                documento.credit_note_payload.get('request_payload') or {}
            ).get('reference_code')
            or f'NC-{documento.reference_code}'
        )

        for attempt in range(2):
            payload = build_credit_note_payload(
                documento,
                config.active_credit_note_range.factus_id,
                concept_code,
                reason,
                reference_code=note_reference,
            )
            try:
                response = self._adapter_for_empresa(
                    documento.empresa,
                ).crear_nota_credito(payload)
                parsed = extract_bill_result(response)
                documento.status = VentaFacturaElectronica.Status.ANULADA
                documento.credit_note_number = parsed['bill_number']
                documento.credit_note_payload = {
                    'request_payload': payload,
                    'response_payload': response,
                }
                documento.response_payload = response
                documento.last_error_code = ''
                documento.last_error_message = ''
                documento.save()
                self._registrar_intento(
                    factura=documento,
                    action=FacturaElectronicaIntento.Action.NOTA_CREDITO,
                    is_success=True,
                    request_payload=payload,
                    response_payload=response,
                )
                return documento
            except Exception as exc:
                error_code = getattr(exc, 'code', 'factus_error')
                error_message = getattr(exc, 'message', str(exc))
                documento.last_error_code = error_code
                documento.last_error_message = error_message
                documento.credit_note_payload = {
                    'request_payload': payload,
                    'error': error_message,
                }

                should_retry = (
                    attempt == 0
                    and self._is_pending_dian_conflict(error_code, error_message)
                )
                if should_retry:
                    note_reference = self._next_credit_note_reference_code(
                        documento,
                        note_reference,
                    )
                    documento.save(
                        update_fields=[
                            'last_error_code',
                            'last_error_message',
                            'credit_note_payload',
                            'updated_at',
                        ],
                    )
                    continue

                documento.save()
                self._registrar_intento(
                    factura=documento,
                    action=FacturaElectronicaIntento.Action.NOTA_CREDITO,
                    is_success=False,
                    request_payload=payload,
                    error_message=str(exc),
                )
                if self._is_pending_dian_conflict(error_code, error_message):
                    raise FacturacionOperacionError(
                        (
                            'Ya existe una nota credito pendiente en la DIAN '
                            'para esta factura. Revisa el documento pendiente '
                            'en Factus antes de volver a intentarlo.'
                        ),
                        code='factus_nota_credito_pendiente_dian',
                    ) from exc
                raise
