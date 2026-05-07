import base64

from django.contrib.auth import authenticate
from django.core.exceptions import PermissionDenied
from django.http import JsonResponse

from empresa.context import reset_empresa_actual, set_empresa_actual
from empresa.services import EmpresaService


class EmpresaActivaMiddleware:
    """
    Resuelve la empresa activa por request y la deja disponible en request
    y en contextvars para servicios que no reciben request.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    @staticmethod
    def _autenticar_basic_si_aplica(request) -> None:
        if getattr(request.user, 'is_authenticated', False):
            return

        header = request.META.get('HTTP_AUTHORIZATION', '')
        if not header.startswith('Basic '):
            return

        try:
            encoded_credentials = header.split(' ', 1)[1].strip()
            decoded_credentials = base64.b64decode(encoded_credentials).decode(
                'utf-8',
            )
            username, password = decoded_credentials.split(':', 1)
        except (ValueError, UnicodeDecodeError, base64.binascii.Error):
            return

        usuario = authenticate(
            request,
            username=username,
            password=password,
        )
        if usuario is not None:
            request.user = usuario

    def __call__(self, request):
        token = None
        try:
            self._autenticar_basic_si_aplica(request)
            empresa = EmpresaService.resolver_empresa_request(request)
            request.empresa = empresa
            token = set_empresa_actual(empresa)
            return self.get_response(request)
        except PermissionDenied as exc:
            return JsonResponse({'error': str(exc)}, status=403)
        finally:
            if token is not None:
                reset_empresa_actual(token)
