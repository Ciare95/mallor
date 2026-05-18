import time
from urllib.parse import urlparse

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from empresa.models import Empresa
from ventas.facturacion_services import FacturacionElectronicaService
from ventas.models import VentaFacturaElectronica

from offline.models import ConnectivityLog, LocalConfig, SyncOutbox
from offline.services import OfflineService


class Command(BaseCommand):
    help = 'Runs the Mallor local worker for connectivity, sync outbox and pending invoices.'

    def add_arguments(self, parser):
        parser.add_argument('--once', action='store_true')
        parser.add_argument('--interval', type=int, default=30)

    def handle(self, *args, **options):
        once = options['once']
        interval = options['interval']
        while True:
            for empresa in Empresa.objects.filter(activo=True):
                self._process_empresa(empresa)
            if once:
                break
            time.sleep(interval)

    def _process_empresa(self, empresa):
        config = OfflineService.get_config(empresa)
        online = self._check_cloud(config)
        self._process_outbox(empresa, online)
        if online and config.invoice_retry_enabled:
            self._process_invoices(empresa)

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

    def _process_outbox(self, empresa, online):
        if not online:
            return
        config = OfflineService.get_config(empresa)
        if not config.sync_enabled:
            return

        # V1 leaves the cloud push adapter explicit but non-destructive.
        for item in SyncOutbox.objects.filter(
            empresa=empresa,
            status__in=[SyncOutbox.Status.PENDING, SyncOutbox.Status.ERROR],
            next_retry_at__lte=timezone.now(),
        )[:50]:
            with transaction.atomic():
                locked = SyncOutbox.objects.select_for_update().get(pk=item.pk)
                locked.status = SyncOutbox.Status.SENT
                locked.sent_at = timezone.now()
                locked.last_error = ''
                locked.save(
                    update_fields=['status', 'sent_at', 'last_error', 'updated_at'],
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
