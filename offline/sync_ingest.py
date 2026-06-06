import logging
from decimal import Decimal
from typing import Any, Dict, List

from django.db import transaction
from django.utils import timezone

logger = logging.getLogger('mallor.sync')


class SyncIngestService:
    """
    Processes sync events sent by a local Mallor instance to the cloud.
    All operations are idempotent: re-processing the same event is safe.
    """

    def process_events(
        self,
        empresa,
        usuario,
        events: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        results = []
        for event in events:
            try:
                result = self._dispatch(empresa, usuario, event)
                results.append({'uuid': event.get('uuid', ''), 'status': 'ok', **result})
            except Exception as exc:
                logger.exception(
                    'sync_ingest error for event %s', event.get('uuid')
                )
                results.append({
                    'uuid': event.get('uuid', ''),
                    'status': 'error',
                    'error': str(exc),
                })
        return {'results': results}

    # ------------------------------------------------------------------ #

    def _dispatch(self, empresa, usuario, event: Dict[str, Any]) -> Dict[str, Any]:
        event_type = event.get('event_type')
        if event_type == 'venta.terminada':
            return self._ingest_venta(empresa, usuario, event['payload'])
        logger.warning('Unknown sync event_type=%r', event_type)
        return {'action': 'skipped', 'reason': f'unknown event_type={event_type!r}'}

    @transaction.atomic
    def _ingest_venta(
        self,
        empresa,
        usuario,
        payload: Dict[str, Any],
    ) -> Dict[str, Any]:
        from cliente.models import Cliente
        from inventario.models import Producto
        from ventas.models import DetalleVenta, Venta

        venta_uuid = payload['uuid']

        # Idempotent: already synced
        existing = Venta.objects.filter(uuid=venta_uuid).first()
        if existing:
            return {'action': 'noop', 'cloud_venta_uuid': str(existing.uuid)}

        # Avoid numero_venta collision with existing cloud sales
        numero_venta = payload['numero_venta']
        if Venta.objects.filter(empresa=empresa, numero_venta=numero_venta).exists():
            numero_venta = f"{numero_venta}-S{str(venta_uuid)[:6].upper()}"

        venta = Venta(
            uuid=venta_uuid,
            empresa=empresa,
            numero_venta=numero_venta,
            # V1: client matching requires UUID not yet in payload; use default
            cliente=Cliente.get_consumidor_final(),
            subtotal=Decimal(str(payload['subtotal'])),
            descuento=Decimal(str(payload['descuento'])),
            impuestos=Decimal(str(payload['impuestos'])),
            total=Decimal(str(payload['total'])),
            total_abonado=Decimal(str(payload.get('total_abonado', payload['total']))),
            estado=payload['estado'],
            estado_pago=payload['estado_pago'],
            metodo_pago=payload['metodo_pago'],
            factura_electronica=payload.get('factura_electronica', False),
            invoice_status=payload.get('invoice_status', Venta.InvoiceStatus.NO_REQUIERE),
            prefactura_numero=payload.get('prefactura_numero', ''),
            sync_status=Venta.SyncStatus.SINCRONIZADA,
            local_created_at=payload.get('fecha_venta') or timezone.now(),
            usuario_registro=usuario,
        )
        # preparar_para_guardado() respects pre-set numero_venta and empresa.
        # calcular_totales() uses field values (no detalles yet, pk is None).
        venta.save()

        # Create details bypassing full_clean/stock-validation (historical replica).
        detalles = []
        for d in payload.get('detalles', []):
            producto = Producto.objects.filter(
                empresa=empresa,
                uuid=d.get('producto_uuid'),
            ).first()
            nombre_temporal = (
                ''
                if producto
                else d.get('producto_nombre') or d.get('producto_uuid', '')
            )
            detalles.append(
                DetalleVenta(
                    uuid=d['uuid'],
                    venta=venta,
                    producto=producto,
                    producto_temporal_nombre=nombre_temporal,
                    cantidad=Decimal(str(d['cantidad'])),
                    precio_unitario=Decimal(str(d['precio_unitario'])),
                    subtotal=Decimal(str(d['subtotal'])),
                    descuento=Decimal(str(d['descuento'])),
                    iva=Decimal(str(d['iva'])),
                    total=Decimal(str(d['total'])),
                )
            )
        if detalles:
            # ignore_conflicts keeps ingest idempotent if detalles were partially created
            DetalleVenta.objects.bulk_create(detalles, ignore_conflicts=True)

        return {'action': 'created', 'cloud_venta_uuid': str(venta.uuid)}
