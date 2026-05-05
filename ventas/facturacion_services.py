import logging
from typing import Any, Dict, Optional

from django.db import transaction
from django.utils.dateparse import parse_date
from django.utils import timezone

from core.exceptions import (
    FacturacionConfiguracionError,
    FacturacionDocumentoNoEncontradoError,
    FacturacionOperacionError,
    FacturacionValidacionError,
)
from ventas.adapters.factus_adapter import FactusAdapter
from empresa.context import get_empresa_actual_or_default
from ventas.factus_transformers import (
    build_credit_note_payload,
    build_factus_bill_payload,
    build_reference_code,
    extract_bill_result,
    validar_venta_facturable,
)
from ventas.models import (
    FacturacionElectronicaConfig,
    FacturaElectronicaIntento,
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


class FacturacionElectronicaService:
    def __init__(self, adapter=None):
        self.adapter = adapter

    def _adapter_for_empresa(self, empresa):
        return self.adapter or FactusAdapter(empresa=empresa)

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
        request_payload: Optional[Dict[str, Any]] = None,
        response_payload: Optional[Dict[str, Any]] = None,
        error_message: str = '',
        response_status_code: Optional[int] = None,
    ) -> None:
        empresa = None
        if factura is not None:
            empresa = factura.empresa or factura.venta.empresa
        else:
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
    def _is_pending_dian_conflict(code: str, message: str) -> bool:
        return (
            code == 'factus_http_409'
            and 'pendiente por enviar a la dian' in (message or '').lower()
        )

    @staticmethod
    def _next_retry_reference_code(
        documento: VentaFacturaElectronica,
    ) -> str:
        base_reference = f'VENTA-{documento.venta_id}'
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

    def validar_conexion(self) -> Dict[str, Any]:
        empresa = get_empresa_actual_or_default()
        config = self.get_config(empresa)
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
            response_payload=payload,
        )
        return payload

    @transaction.atomic
    def sincronizar_rangos(self) -> Dict[str, Any]:
        empresa = get_empresa_actual_or_default()
        config = self.get_config(empresa)
        adapter = self._adapter_for_empresa(empresa)
        rangos_response = adapter.listar_rangos()
        empresa_response = adapter.ver_empresa()

        rows = _extract_rows(rangos_response)
        synced_ids = []

        for row in rows:
            factus_id = row.get('id') or row.get('numbering_range_id')
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

        config.company_snapshot = empresa_response
        config.last_connection_status = 'ok'
        config.last_connection_checked_at = timezone.now()
        config.save()

        self._registrar_intento(
            factura=None,
            action=FacturaElectronicaIntento.Action.SINCRONIZAR_RANGOS,
            is_success=True,
            response_payload={
                'rangos': rangos_response,
                'empresa': empresa_response,
            },
        )
        return {
            'count': len(synced_ids),
            'company_snapshot': empresa_response,
        }

    def emitir_factura(self, venta_id: int) -> VentaFacturaElectronica:
        empresa = get_empresa_actual_or_default()
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
            parsed = extract_bill_result(response)
            documento.status = VentaFacturaElectronica.Status.EMITIDA
            documento.bill_number = parsed['bill_number']
            documento.cufe = parsed['cufe']
            documento.resolution_number = parsed['resolution_number']
            documento.response_payload = response
            documento.validated_at = timezone.now()
            documento.save()
            documento.sync_venta_fields()
            self._registrar_intento(
                factura=documento,
                action=FacturaElectronicaIntento.Action.EMITIR,
                is_success=True,
                request_payload=payload,
                response_payload=response,
            )
            return documento
        except Exception as exc:
            documento.status = VentaFacturaElectronica.Status.ERROR
            documento.last_error_code = getattr(exc, 'code', 'factus_error')
            documento.last_error_message = getattr(exc, 'message', str(exc))
            if self._is_pending_dian_conflict(
                documento.last_error_code,
                documento.last_error_message,
            ):
                documento.reference_code = self._next_retry_reference_code(documento)
            documento.save()
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
            ).prefetch_related('intentos').get(
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
        return documento

    def descargar_pdf(self, venta_id: int) -> Dict[str, Any]:
        documento = self.obtener_documento(venta_id)
        if not documento.bill_number:
            raise FacturacionValidacionError(
                'La venta aun no tiene factura emitida.',
                code='factus_pdf_sin_numero',
            )
        payload = self._adapter_for_empresa(documento.empresa).descargar_pdf(
            documento.bill_number,
        )
        self._registrar_intento(
            factura=documento,
            action=FacturaElectronicaIntento.Action.DESCARGAR_PDF,
            is_success=True,
        )
        return payload

    def descargar_xml(self, venta_id: int) -> Dict[str, Any]:
        documento = self.obtener_documento(venta_id)
        if not documento.bill_number:
            raise FacturacionValidacionError(
                'La venta aun no tiene factura emitida.',
                code='factus_xml_sin_numero',
            )
        payload = self._adapter_for_empresa(documento.empresa).descargar_xml(
            documento.bill_number,
        )
        self._registrar_intento(
            factura=documento,
            action=FacturaElectronicaIntento.Action.DESCARGAR_XML,
            is_success=True,
        )
        return payload

    @transaction.atomic
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
        payload = build_credit_note_payload(
            documento,
            config.active_credit_note_range.factus_id,
            concept_code,
            reason,
        )
        response = self._adapter_for_empresa(documento.empresa).crear_nota_credito(
            payload,
        )
        parsed = extract_bill_result(response)
        documento.status = VentaFacturaElectronica.Status.ANULADA
        documento.credit_note_number = parsed['bill_number']
        documento.credit_note_payload = response
        documento.response_payload = response
        documento.save()
        self._registrar_intento(
            factura=documento,
            action=FacturaElectronicaIntento.Action.NOTA_CREDITO,
            is_success=True,
            request_payload=payload,
            response_payload=response,
        )
        return documento
