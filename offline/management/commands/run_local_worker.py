import logging
import time
from urllib.parse import urlparse

from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

import requests

from empresa.models import Empresa
from ventas.facturacion_services import FacturacionElectronicaService
from ventas.models import Venta, VentaFacturaElectronica

from offline.cloud_adapter import CloudSyncAdapter, CloudSyncError
from offline.models import ConnectivityLog, LocalConfig, LocalLicense, SyncOutbox
from offline.services import OfflineService

logger = logging.getLogger('mallor.sync')

# Validate license every this many worker cycles (30s * 120 = 60 min)
_LICENSE_VALIDATE_EVERY = 120


class Command(BaseCommand):
    help = 'Runs the Mallor local worker for connectivity, sync outbox and pending invoices.'

    def add_arguments(self, parser):
        parser.add_argument('--once', action='store_true')
        parser.add_argument('--interval', type=int, default=30)

    def handle(self, *args, **options):
        once = options['once']
        interval = options['interval']
        cycle = 0
        while True:
            validate_license = (cycle % _LICENSE_VALIDATE_EVERY == 0)
            for empresa in Empresa.objects.filter(activo=True):
                self._process_empresa(empresa, validate_license=validate_license)
            cycle += 1
            if once:
                break
            time.sleep(interval)

    def _process_empresa(self, empresa, validate_license: bool = False):
        config = OfflineService.get_config(empresa)
        online = self._check_cloud(config)
        self._process_outbox(empresa, config, online)
        if online and config.invoice_retry_enabled:
            self._process_invoices(empresa)
        if online and validate_license:
            self._validate_license(empresa, config)

    def _check_cloud(self, config):
        parsed = urlparse(config.cloud_api_url or '')
        if not parsed.hostname:
            OfflineService.record_connectivity(
                empresa=config.empresa,
                target=ConnectivityLog.Target.CLOUD,
                is_online=False,
                message='cloud_api_url no configurado',
            )
            return False

        port = parsed.port or (443 if parsed.scheme == 'https' else 80)
        online, latency_ms, message = OfflineService.check_tcp_connectivity(
            parsed.hostname,
            port,
        )
        OfflineService.record_connectivity(
            empresa=config.empresa,
            target=ConnectivityLog.Target.CLOUD,
            is_online=online,
            latency_ms=latency_ms,
            message=message,
        )
        return online

    def _process_outbox(self, empresa, config, online):
        if not online or not config.sync_enabled:
            return

        pending = list(
            SyncOutbox.objects.filter(
                empresa=empresa,
                status__in=[SyncOutbox.Status.PENDING, SyncOutbox.Status.ERROR],
                next_retry_at__lte=timezone.now(),
            )[:50]
        )
        if not pending:
            return

        try:
            adapter = CloudSyncAdapter(config)
        except CloudSyncError as exc:
            logger.warning('Sync setup failed for empresa %s: %s', empresa.id, exc)
            return

        # Mark batch as in-flight so a crash doesn't leave them in PROCESSING forever;
        # schedule_retry will reset them to ERROR with backoff on failure.
        SyncOutbox.objects.filter(pk__in=[e.pk for e in pending]).update(
            status=SyncOutbox.Status.PROCESSING,
        )

        try:
            response = adapter.push_events(pending)
        except CloudSyncError as exc:
            logger.warning('Cloud push failed for empresa %s: %s', empresa.id, exc)
            for item in pending:
                item.refresh_from_db()
                item.schedule_retry(exc)
            return

        results_by_uuid = {
            r['uuid']: r for r in response.get('results', [])
        }

        for item in pending:
            result = results_by_uuid.get(str(item.uuid), {})
            if result.get('status') == 'ok':
                with transaction.atomic():
                    SyncOutbox.objects.filter(pk=item.pk).update(
                        status=SyncOutbox.Status.SENT,
                        sent_at=timezone.now(),
                        last_error='',
                    )
                    if item.aggregate_type == 'venta':
                        cloud_uuid = result.get('cloud_venta_uuid', '')
                        Venta.objects.filter(uuid=item.aggregate_uuid).update(
                            sync_status=Venta.SyncStatus.SINCRONIZADA,
                            cloud_id=cloud_uuid,
                        )
            else:
                item.refresh_from_db()
                item.schedule_retry(result.get('error', 'no result returned'))

    def _validate_license(self, empresa, config):
        license_obj = LocalLicense.objects.filter(empresa=empresa).first()
        if license_obj is None:
            return

        cloud_base = getattr(settings, 'MALLOR_CLOUD_BASE_URL', '').rstrip('/')
        if not cloud_base:
            return

        try:
            resp = requests.get(
                f'{cloud_base}/api/offline/licenses/verify/',
                params={'key': license_obj.license_key},
                timeout=10,
            )
            data = resp.json()
        except Exception as exc:
            logger.warning('License validation failed for empresa %s: %s', empresa.id, exc)
            return

        new_status = data.get('status', license_obj.status)
        license_obj.status = new_status
        license_obj.support_until = data.get('support_until') or license_obj.support_until
        license_obj.last_validated_at = timezone.now()
        license_obj.save(update_fields=['status', 'support_until', 'last_validated_at', 'updated_at'])

        if new_status in [LocalLicense.Status.REVOKED, LocalLicense.Status.EXPIRED]:
            config.sync_enabled = False
            config.save(update_fields=['sync_enabled', 'updated_at'])
            logger.warning(
                'License %s for empresa %s is %s — sync disabled.',
                license_obj.license_key, empresa.id, new_status,
            )

    def _process_invoices(self, empresa):
        service = FacturacionElectronicaService()
        documentos = VentaFacturaElectronica.objects.select_related('venta').filter(
            empresa=empresa,
            status__in=[
                VentaFacturaElectronica.Status.PENDIENTE_FACTURACION,
                VentaFacturaElectronica.Status.PENDIENTE_ENVIO,
                VentaFacturaElectronica.Status.ERROR,
            ],
        )[:25]
        for documento in documentos:
            try:
                emitted = service.reintentar_emision(documento.venta_id)
                try:
                    service.descargar_pdf(emitted.venta_id)
                except Exception:
                    pass
                try:
                    service.descargar_xml(emitted.venta_id)
                except Exception:
                    pass
            except Exception as exc:
                self.stderr.write(
                    f'Factura pendiente venta {documento.venta_id}: {exc}',
                )
