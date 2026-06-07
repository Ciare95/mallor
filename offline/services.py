import logging
import socket
import time
from decimal import Decimal
from typing import Any, Dict, Optional

import requests
from django.conf import settings
from django.db import transaction
from django.db.models import Count, Q
from django.utils import timezone

from empresa.context import get_empresa_actual_or_default
from ventas.models import Venta, VentaFacturaElectronica

from .models import (
    CajaSesion,
    ConnectivityLog,
    LocalConfig,
    LocalLicense,
    POSTerminal,
    SyncOutbox,
)

logger = logging.getLogger('mallor.sync')


def is_local_mode() -> bool:
    return getattr(settings, 'MALLOR_MODE', 'cloud') == 'local'


class OfflineService:
    @staticmethod
    def get_config(empresa=None) -> LocalConfig:
        return LocalConfig.get_for_empresa(empresa or get_empresa_actual_or_default())

    @staticmethod
    def resolve_terminal(
        *,
        empresa=None,
        terminal_id: Optional[int] = None,
        terminal_code: str = '',
    ) -> Optional[POSTerminal]:
        empresa = empresa or get_empresa_actual_or_default()
        queryset = POSTerminal.objects.filter(empresa=empresa, is_active=True)
        if terminal_id:
            terminal = queryset.filter(pk=terminal_id).first()
            if terminal is not None:
                return terminal
            # ID stale (reinstalación o BD nueva) — caer al auto-create
        elif terminal_code:
            terminal = queryset.filter(code=terminal_code).first()
            if terminal is not None:
                return terminal
        terminal = queryset.order_by('id').first()
        if terminal is not None:
            return terminal
        if is_local_mode():
            return POSTerminal.objects.create(
                empresa=empresa,
                code='POS-1',
                name='Caja principal',
            )
        return None

    @staticmethod
    def get_open_session(terminal: Optional[POSTerminal]) -> Optional[CajaSesion]:
        if terminal is None:
            return None
        return (
            CajaSesion.objects.select_related('terminal', 'usuario_apertura')
            .filter(terminal=terminal, estado=CajaSesion.Estado.ABIERTA)
            .order_by('-opened_at')
            .first()
        )

    @staticmethod
    @transaction.atomic
    def abrir_caja(
        *,
        terminal: POSTerminal,
        usuario,
        efectivo_inicial: Decimal,
    ) -> CajaSesion:
        existing = (
            CajaSesion.objects.select_for_update()
            .filter(terminal=terminal, estado=CajaSesion.Estado.ABIERTA)
            .first()
        )
        if existing:
            return existing

        return CajaSesion.objects.create(
            empresa=terminal.empresa,
            terminal=terminal,
            usuario_apertura=usuario,
            efectivo_inicial=efectivo_inicial,
        )

    @staticmethod
    @transaction.atomic
    def cerrar_caja(
        *,
        sesion: CajaSesion,
        usuario,
        efectivo_final: Decimal,
        observaciones: str = '',
    ) -> CajaSesion:
        locked = CajaSesion.objects.select_for_update().get(pk=sesion.pk)
        if locked.estado == CajaSesion.Estado.CERRADA:
            return locked
        return locked.cerrar(usuario, efectivo_final, observaciones)

    @staticmethod
    def build_sale_payload(venta: Venta) -> Dict[str, Any]:
        return {
            'uuid': str(venta.uuid),
            'numero_venta': venta.numero_venta,
            'empresa_id': venta.empresa_id,
            'fecha_venta': venta.fecha_venta.isoformat() if venta.fecha_venta else None,
            'subtotal': str(venta.subtotal),
            'descuento': str(venta.descuento),
            'impuestos': str(venta.impuestos),
            'total': str(venta.total),
            'total_abonado': str(venta.total_abonado),
            'saldo_pendiente': str(venta.saldo_pendiente),
            'estado': venta.estado,
            'estado_pago': venta.estado_pago,
            'metodo_pago': venta.metodo_pago,
            'factura_electronica': venta.factura_electronica,
            'invoice_status': venta.invoice_status,
            'prefactura_numero': venta.prefactura_numero,
            'detalles': [
                {
                    'uuid': str(detalle.uuid),
                    'producto_uuid': str(detalle.producto.uuid) if detalle.producto_id else '',
                    'producto_nombre': (
                        detalle.producto.nombre
                        if detalle.producto_id
                        else detalle.producto_temporal_nombre
                    ),
                    'cantidad': str(detalle.cantidad),
                    'precio_unitario': str(detalle.precio_unitario),
                    'subtotal': str(detalle.subtotal),
                    'descuento': str(detalle.descuento),
                    'iva': str(detalle.iva),
                    'total': str(detalle.total),
                }
                for detalle in venta.detalles.select_related('producto').all()
            ],
        }

    @staticmethod
    def enqueue_sale(venta: Venta) -> SyncOutbox:
        return SyncOutbox.objects.get_or_create(
            empresa=venta.empresa,
            aggregate_type='venta',
            aggregate_uuid=venta.uuid,
            event_type='venta.terminada',
            idempotency_key=f'venta:{venta.uuid}:terminada',
            defaults={
                'payload': OfflineService.build_sale_payload(venta),
            },
        )[0]

    @staticmethod
    def pending_counts(empresa=None) -> Dict[str, int]:
        empresa = empresa or get_empresa_actual_or_default()
        outbox_counts = SyncOutbox.objects.filter(empresa=empresa).aggregate(
            sync_pending=Count(
                'id',
                filter=Q(status__in=[SyncOutbox.Status.PENDING, SyncOutbox.Status.ERROR]),
            ),
            sync_errors=Count('id', filter=Q(status=SyncOutbox.Status.ERROR)),
        )
        invoice_pending = VentaFacturaElectronica.objects.filter(
            empresa=empresa,
            status__in=[
                VentaFacturaElectronica.Status.PENDIENTE_ENVIO,
                VentaFacturaElectronica.Status.PENDIENTE_FACTURACION,
                VentaFacturaElectronica.Status.ERROR,
            ],
        ).count()
        invoice_errors = VentaFacturaElectronica.objects.filter(
            empresa=empresa,
            status=VentaFacturaElectronica.Status.ERROR,
        ).count()
        return {
            'sync_pending': outbox_counts['sync_pending'] or 0,
            'sync_errors': outbox_counts['sync_errors'] or 0,
            'invoice_pending': invoice_pending,
            'invoice_errors': invoice_errors,
        }

    @staticmethod
    def status_payload(
        *,
        request=None,
        terminal_id: Optional[int] = None,
        terminal_code: str = '',
    ) -> Dict[str, Any]:
        empresa = get_empresa_actual_or_default()
        config = OfflineService.get_config(empresa)
        terminal = OfflineService.resolve_terminal(
            empresa=empresa,
            terminal_id=terminal_id,
            terminal_code=terminal_code,
        )
        caja = OfflineService.get_open_session(terminal)
        return {
            'mode': getattr(settings, 'MALLOR_MODE', config.mode),
            'local_server': getattr(settings, 'MALLOR_LOCAL_SERVER', False),
            'online': config.is_online,
            'connectivity_status': config.connectivity_status,
            'last_connection_checked_at': config.last_connection_checked_at,
            'offline_invoice_policy': config.offline_invoice_policy,
            'terminal': (
                {
                    'id': terminal.id,
                    'uuid': str(terminal.uuid),
                    'code': terminal.code,
                    'name': terminal.name,
                }
                if terminal else None
            ),
            'caja': (
                {
                    'id': caja.id,
                    'uuid': str(caja.uuid),
                    'estado': caja.estado,
                    'opened_at': caja.opened_at,
                    'efectivo_inicial': str(caja.efectivo_inicial),
                    'usuario_apertura': caja.usuario_apertura_id,
                }
                if caja else None
            ),
            'sync_enabled': config.sync_enabled,
            'counts': OfflineService.pending_counts(empresa),
            'setup_completed': OfflineService.is_setup_completed(empresa),
        }

    @staticmethod
    def is_setup_completed(empresa=None) -> bool:
        """True when running in cloud mode, when a valid local license exists,
        or when the user explicitly completed the wizard in local-only mode."""
        if getattr(settings, 'MALLOR_MODE', 'cloud') != 'local':
            return True
        empresa = empresa or get_empresa_actual_or_default()
        if LocalLicense.objects.filter(
            empresa=empresa,
            status__in=[LocalLicense.Status.ACTIVE, LocalLicense.Status.GRACE],
        ).exists():
            return True
        config = LocalConfig.get_for_empresa(empresa)
        return config.wizard_completed

    @staticmethod
    def completar_wizard_local(empresa) -> None:
        """Marks the setup wizard as done for local-only mode (no license)."""
        config = LocalConfig.get_for_empresa(empresa)
        config.wizard_completed = True
        config.save(update_fields=['wizard_completed', 'updated_at'])

    @staticmethod
    def activar_licencia(empresa, license_key: str) -> Dict[str, Any]:
        """
        Validates license_key against the cloud, then persists LocalLicense
        and enables sync in LocalConfig. Called from the activation wizard.
        """
        cloud_base = getattr(settings, 'MALLOR_CLOUD_BASE_URL', 'https://mallor.com')
        verify_url = f'{cloud_base}/api/offline/licenses/verify/'
        try:
            resp = requests.get(
                verify_url,
                params={'key': license_key},
                timeout=30,
            )
        except requests.RequestException:
            raise ValueError(
                'No se pudo conectar al servidor de Mallor. '
                'Verifica tu conexión a internet e inténtalo de nuevo.'
            )

        if resp.status_code == 404 or not resp.json().get('valid'):
            raise ValueError('Clave de activación inválida o expirada.')
        if resp.status_code >= 400:
            raise ValueError(f'Error del servidor cloud: {resp.status_code}')

        data = resp.json()

        LocalLicense.objects.update_or_create(
            empresa=empresa,
            defaults={
                'license_key': license_key,
                'plan': data.get('plan', 'HYBRID'),
                'status': data.get('status', LocalLicense.Status.ACTIVE),
                'support_until': data.get('support_until'),
                'purchased_at': data.get('purchased_at'),
                'last_validated_at': timezone.now(),
                'metadata': {'empresa_razon_social': data.get('empresa_razon_social', '')},
            },
        )

        config = LocalConfig.get_for_empresa(empresa)
        config.cloud_api_url = cloud_base
        config.sync_enabled = True
        config.save(update_fields=['cloud_api_url', 'sync_enabled', 'updated_at'])

        return {
            'activated': True,
            'empresa_nombre': data.get('empresa_razon_social', ''),
            'plan': data.get('plan', 'HYBRID'),
            'support_until': data.get('support_until'),
        }

    @staticmethod
    def check_tcp_connectivity(host: str, port: int, timeout: float = 2.0) -> tuple[bool, int, str]:
        started = time.perf_counter()
        try:
            with socket.create_connection((host, port), timeout=timeout):
                elapsed = int((time.perf_counter() - started) * 1000)
                return True, elapsed, 'ok'
        except OSError as exc:
            elapsed = int((time.perf_counter() - started) * 1000)
            return False, elapsed, str(exc)

    @staticmethod
    def record_connectivity(
        *,
        empresa,
        target: str,
        is_online: bool,
        latency_ms: Optional[int] = None,
        message: str = '',
    ) -> ConnectivityLog:
        log = ConnectivityLog.objects.create(
            empresa=empresa,
            target=target,
            is_online=is_online,
            latency_ms=latency_ms,
            message=message,
        )
        config = OfflineService.get_config(empresa)
        config.connectivity_status = (
            LocalConfig.ConnectivityStatus.ONLINE
            if is_online
            else LocalConfig.ConnectivityStatus.OFFLINE
        )
        config.last_connection_checked_at = timezone.now()
        config.save(
            update_fields=[
                'connectivity_status',
                'last_connection_checked_at',
                'updated_at',
            ],
        )
        return log
