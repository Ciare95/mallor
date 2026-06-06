from decimal import Decimal

from django.conf import settings
from rest_framework import mixins, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from empresa.context import get_empresa_actual_or_default, reset_empresa_actual, set_empresa_actual
from empresa.services import EmpresaService
from ventas.facturacion_services import FacturacionElectronicaService
from ventas.models import VentaFacturaElectronica

from .authentication import SyncTokenAuthentication
from .models import CajaSesion, LocalLicense, POSTerminal, SyncOutbox
from .serializers import (
    AbrirCajaSerializer,
    CajaSesionSerializer,
    CerrarCajaSerializer,
    LicenseActivarSerializer,
    LocalLicenseAdminSerializer,
    LocalLicenseSerializer,
    POSTerminalSerializer,
    SyncOutboxSerializer,
)
from .services import OfflineService
from .sync_ingest import SyncIngestService


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

    @action(detail=False, methods=['post'], url_path='activar')
    def activar(self, request):
        """Activates a hybrid license from the local desktop wizard."""
        serializer = LicenseActivarSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        empresa = get_empresa_actual_or_default()
        try:
            result = OfflineService.activar_licencia(
                empresa,
                serializer.validated_data['license_key'],
            )
        except ValueError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(result)


class LicenseVerifyView(APIView):
    """
    GET /api/offline/licenses/verify/?key=<license_key>

    Public endpoint (cloud-side only) used by local instances to validate
    their license before activation and during periodic checks.
    """

    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        if getattr(settings, 'MALLOR_MODE', 'cloud') == 'local':
            return Response(
                {'error': 'Este endpoint solo está disponible en el servidor cloud.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        key = request.query_params.get('key', '').strip()
        if not key:
            return Response({'valid': False, 'status': 'NOT_FOUND'}, status=status.HTTP_404_NOT_FOUND)

        license_obj = (
            LocalLicense.objects.select_related('empresa')
            .filter(license_key=key)
            .first()
        )
        if license_obj is None:
            return Response({'valid': False, 'status': 'NOT_FOUND'}, status=status.HTTP_404_NOT_FOUND)

        cloud_base = getattr(settings, 'MALLOR_CLOUD_BASE_URL', '')
        is_valid = license_obj.status in [LocalLicense.Status.ACTIVE, LocalLicense.Status.GRACE]
        return Response({
            'valid': is_valid,
            'status': license_obj.status,
            'plan': license_obj.plan,
            'empresa_razon_social': license_obj.empresa.razon_social if license_obj.empresa_id else '',
            'cloud_api_url': cloud_base,
            'support_until': license_obj.support_until,
            'purchased_at': license_obj.purchased_at,
        })


class LicenseAdminViewSet(
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    """
    Admin CRUD for LocalLicense. Only accessible to Mallor staff (is_staff / is_superuser).
    Cloud-side only.
    """

    serializer_class = LocalLicenseAdminSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ['get', 'post', 'patch', 'head', 'options']

    def get_queryset(self):
        EmpresaService.validar_admin_interno(self.request.user)
        return LocalLicense.objects.select_related('empresa').order_by('-created_at')

    def perform_create(self, serializer):
        EmpresaService.validar_admin_interno(self.request.user)
        serializer.save()

    def perform_update(self, serializer):
        EmpresaService.validar_admin_interno(self.request.user)
        serializer.save()

    @action(detail=True, methods=['post'], url_path='revocar')
    def revocar(self, request, pk=None):
        EmpresaService.validar_admin_interno(request.user)
        license_obj = self.get_object()
        license_obj.status = LocalLicense.Status.REVOKED
        license_obj.save(update_fields=['status', 'updated_at'])
        return Response(LocalLicenseAdminSerializer(license_obj).data)


class SyncIngestView(APIView):
    """
    POST /api/offline/sync/ingest/

    Receives sync events pushed from a local Mallor instance.
    Authenticated via 'Authorization: SyncToken <license_key>'.
    """

    authentication_classes = [SyncTokenAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        events = request.data.get('events')
        if not isinstance(events, list):
            return Response(
                {'error': "'events' must be a list"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        empresa = request.auth.empresa
        # Set empresa context so helpers like Cliente.get_consumidor_final() resolve correctly
        ctx_token = set_empresa_actual(empresa)
        try:
            result = SyncIngestService().process_events(empresa, request.user, events)
        finally:
            reset_empresa_actual(ctx_token)

        return Response(result)
