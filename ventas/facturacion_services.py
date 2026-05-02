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


class FacturacionElectronicaService:
    def __init__(self, adapter=None):
        self.adapter = adapter or FactusAdapter()

    @staticmethod
    def get_config() -> FacturacionElectronicaConfig:
        return FacturacionElectronicaConfig.get_solo()

    @staticmethod
    def _require_enabled_config() -> FacturacionElectronicaConfig:
        config = FacturacionElectronicaService.get_config()
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
                'reference_code': build_reference_code(venta),
                'numbering_range': numbering_range,
            },
        )
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
        FacturaElectronicaIntento.objects.create(
            factura=factura,
            action=action,
            is_success=is_success,
            request_payload=request_payload or {},
            response_payload=response_payload or {},
            error_message=error_message,
            response_status_code=response_status_code,
        )

    def validar_conexion(self) -> Dict[str, Any]:
        config = self.get_config()
        payload = self.adapter.validar_conexion()
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
        config = self.get_config()
        rangos_response = self.adapter.listar_rangos()
        empresa_response = self.adapter.ver_empresa()

        rows = rangos_response.get('data') or rangos_response.get('numbering_ranges') or []
        synced_ids = []

        for row in rows:
            factus_id = row.get('id') or row.get('numbering_range_id')
            if not factus_id:
                continue
            synced_ids.append(factus_id)
            document_code = str(row.get('document') or row.get('document_code') or '01')
            range_obj, _ = FactusNumberingRange.objects.update_or_create(
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
                    'is_active': bool(row.get('is_active', True)),
                    'is_credit_note_range': document_code != '01',
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
        config = self._require_enabled_config()
        venta = Venta.objects.select_related('cliente').prefetch_related(
            'detalles__producto',
        ).get(pk=venta_id)
        validar_venta_facturable(venta)
        documento = self._get_or_create_documento(venta, config.active_bill_range)

        payload = build_factus_bill_payload(
            venta,
            config.active_bill_range.factus_id,
            send_email=config.auto_enviar_email,
        )
        documento.status = VentaFacturaElectronica.Status.PENDIENTE_ENVIO
        documento.request_payload = payload
        documento.last_error_code = ''
        documento.last_error_message = ''
        documento.save()

        try:
            response = self.adapter.emitir_factura(payload)
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
        try:
            return VentaFacturaElectronica.objects.select_related(
                'venta',
                'numbering_range',
            ).prefetch_related('intentos').get(venta_id=venta_id)
        except VentaFacturaElectronica.DoesNotExist as exc:
            raise FacturacionDocumentoNoEncontradoError(
                'La venta no tiene documento electronico asociado.',
                code='factus_documento_no_encontrado',
            ) from exc

    @transaction.atomic
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
        response = self.adapter.consultar_factura(documento.bill_number)
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
        response = self.adapter.enviar_email(documento.bill_number, target_email)
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
        payload = self.adapter.descargar_pdf(documento.bill_number)
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
        payload = self.adapter.descargar_xml(documento.bill_number)
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
        config = self.get_config()
        if config.active_credit_note_range is None:
            raise FacturacionConfiguracionError(
                'No hay rango activo configurado para notas credito.',
                code='factus_rango_nota_credito',
            )
        documento = self.obtener_documento(venta_id)
        payload = build_credit_note_payload(
            documento,
            config.active_credit_note_range.factus_id,
            concept_code,
            reason,
        )
        response = self.adapter.crear_nota_credito(payload)
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
