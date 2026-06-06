from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed

from empresa.models import EmpresaUsuario

from .models import LocalLicense


class SyncTokenAuthentication(BaseAuthentication):
    """
    Validates 'Authorization: SyncToken <license_key>' used by local instances
    when pushing sync events to the cloud.

    On success returns (empresa_admin_user, license_obj) so that:
      - request.user  → a real, active admin user (satisfies IsAuthenticated)
      - request.auth  → the LocalLicense (provides request.auth.empresa)
    """

    _keyword = 'SyncToken'

    def authenticate(self, request):
        header = request.META.get('HTTP_AUTHORIZATION', '')
        parts = header.split()
        if not parts or parts[0] != self._keyword:
            return None
        if len(parts) != 2:
            raise AuthenticationFailed('Malformed SyncToken header.')

        token = parts[1]
        license_obj = (
            LocalLicense.objects.select_related('empresa')
            .filter(
                license_key=token,
                status__in=[LocalLicense.Status.ACTIVE, LocalLicense.Status.GRACE],
            )
            .first()
        )
        if license_obj is None:
            raise AuthenticationFailed('Invalid or expired sync token.')

        membership = (
            EmpresaUsuario.objects.select_related('usuario')
            .filter(
                empresa=license_obj.empresa,
                rol__in=[EmpresaUsuario.Rol.PROPIETARIO, EmpresaUsuario.Rol.ADMIN],
                activo=True,
                usuario__is_active=True,
            )
            .order_by('id')
            .first()
        )
        if membership is None:
            raise AuthenticationFailed(
                'No active admin user found for the empresa associated with this token.'
            )

        return (membership.usuario, license_obj)

    def authenticate_header(self, request):
        return self._keyword
