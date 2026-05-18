import socket
import time
from decimal import Decimal
from typing import Any, Dict, Optional

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
    POSTerminal,
    SyncOutbox,
)


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
            return queryset.filter(pk=terminal_id).first()
        if terminal_code:
            return queryset.filter(code=terminal_code).first()
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
            'id': venta.id,
            'numero_venta': venta.numero_venta,
            'empresa_id': venta.empresa_id,
            'terminal_id': venta.terminal_id,
            'caja_sesion_id': venta.caja_sesion_id,
            'cliente_id': venta.cliente_id,
            'fecha_venta': venta.fecha_venta.isoformat() if venta.fecha_venta else None,
            'subtotal': str(venta.subtotal),
            'descuento': str(venta.descuento),
            'impuestos': str(venta.impuestos),
            'total': str(venta.total),
            'estado': venta.estado,
            'estado_pago': venta.estado_pago,
            'metodo_pago': venta.metodo_pago,
            'factura_electronica': venta.factura_electronica,
            'invoice_status': venta.invoice_status,
            'prefactura_numero': venta.prefactura_numero,
            'detalles': [
                {
                    'uuid': str(detalle.uuid),
                    'producto_uuid': str(detalle.producto.uuid),
                    'producto_id': detalle.producto_id,
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
            'counts': OfflineService.pending_counts(empresa),
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
