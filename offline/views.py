from decimal import Decimal

from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from empresa.context import get_empresa_actual_or_default
from ventas.facturacion_services import FacturacionElectronicaService
from ventas.models import VentaFacturaElectronica

from .models import CajaSesion, LocalLicense, POSTerminal, SyncOutbox
from .serializers import (
    AbrirCajaSerializer,
    CajaSesionSerializer,
    CerrarCajaSerializer,
    LocalLicenseSerializer,
    POSTerminalSerializer,
    SyncOutboxSerializer,
)
from .services import OfflineService


def _terminal_params(request):
    return {
        'terminal_id': (
            request.data.get('terminal_id')
            or request.query_params.get('terminal_id')
            or request.headers.get('X-Terminal-Id')
        ),
        'terminal_code': (
            request.data.get('terminal_code')
            or request.query_params.get('terminal_code')
            or request.headers.get('X-Terminal-Code')
            or ''
        ),
    }


class OfflineViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=['get'], url_path='status')
    def status(self, request):
        params = _terminal_params(request)
        payload = OfflineService.status_payload(
            request=request,
            terminal_id=params['terminal_id'],
            terminal_code=params['terminal_code'],
        )
        return Response(payload)

    @action(detail=False, methods=['get', 'post'], url_path='terminales')
    def terminales(self, request):
        empresa = get_empresa_actual_or_default()
        if request.method == 'GET':
            terminals = POSTerminal.objects.filter(empresa=empresa).order_by('code')
            return Response(POSTerminalSerializer(terminals, many=True).data)

        serializer = POSTerminalSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        terminal = serializer.save(empresa=empresa)
        return Response(
            POSTerminalSerializer(terminal).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=False, methods=['post'], url_path='caja/abrir')
    def abrir_caja(self, request):
        serializer = AbrirCajaSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        params = serializer.validated_data
        terminal = OfflineService.resolve_terminal(
            terminal_id=params.get('terminal_id'),
            terminal_code=params.get('terminal_code', ''),
        )
        if terminal is None:
            return Response(
                {'error': 'Debe configurar una terminal POS activa.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        sesion = OfflineService.abrir_caja(
            terminal=terminal,
            usuario=request.user,
            efectivo_inicial=params.get('efectivo_inicial') or Decimal('0.00'),
        )
        return Response(CajaSesionSerializer(sesion).data)

    @action(detail=False, methods=['post'], url_path='caja/cerrar')
    def cerrar_caja(self, request):
        serializer = CerrarCajaSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        params = serializer.validated_data
        sesion = None
        if params.get('caja_sesion_id'):
            sesion = CajaSesion.objects.filter(
                pk=params['caja_sesion_id'],
                empresa=get_empresa_actual_or_default(),
            ).first()
        if sesion is None:
            terminal = OfflineService.resolve_terminal(
                terminal_id=params.get('terminal_id'),
                terminal_code=params.get('terminal_code', ''),
            )
            sesion = OfflineService.get_open_session(terminal)
        if sesion is None:
            return Response(
                {'error': 'No hay una caja abierta para cerrar.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        sesion = OfflineService.cerrar_caja(
            sesion=sesion,
            usuario=request.user,
            efectivo_final=params['efectivo_final'],
            observaciones=params.get('observaciones', ''),
        )
        return Response(CajaSesionSerializer(sesion).data)

    @action(detail=False, methods=['get'], url_path='sync/outbox')
    def sync_outbox(self, request):
        queryset = SyncOutbox.objects.filter(
            empresa=get_empresa_actual_or_default(),
        ).order_by('-created_at')[:100]
        return Response(SyncOutboxSerializer(queryset, many=True).data)

    @action(detail=False, methods=['post'], url_path='sync/retry')
    def sync_retry(self, request):
        updated = SyncOutbox.objects.filter(
            empresa=get_empresa_actual_or_default(),
            status=SyncOutbox.Status.ERROR,
        ).update(status=SyncOutbox.Status.PENDING, last_error='')
        return Response({'updated': updated})

    @action(detail=False, methods=['post'], url_path='facturacion/retry')
    def facturacion_retry(self, request):
        empresa = get_empresa_actual_or_default()
        service = FacturacionElectronicaService()
        processed = 0
        errors = []
        documentos = VentaFacturaElectronica.objects.select_related('venta').filter(
            empresa=empresa,
            status__in=[
                VentaFacturaElectronica.Status.PENDIENTE_ENVIO,
                VentaFacturaElectronica.Status.PENDIENTE_FACTURACION,
                VentaFacturaElectronica.Status.ERROR,
            ],
        )[:25]
        for documento in documentos:
            try:
                service.reintentar_emision(documento.venta_id)
                processed += 1
            except Exception as exc:
                errors.append({
                    'venta_id': documento.venta_id,
                    'error': str(exc),
                })
        return Response({'processed': processed, 'errors': errors})

    @action(detail=False, methods=['get'], url_path='licencia')
    def licencia(self, request):
        license_obj = LocalLicense.objects.filter(
            empresa=get_empresa_actual_or_default(),
        ).first()
        if license_obj is None:
            return Response({'license': None})
        return Response(LocalLicenseSerializer(license_obj).data)
