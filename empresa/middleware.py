import base64

from django.conf import settings
from django.contrib.auth import authenticate
from django.core.exceptions import PermissionDenied
from django.http import JsonResponse

from empresa.context import reset_empresa_actual, set_empresa_actual
from empresa.services import EmpresaService
from usuario.authentication import authenticate_bearer_request


class EmpresaActivaMiddleware:
    """
    Resuelve la empresa activa por request y la deja disponible en request
    y en contextvars para servicios que no reciben request.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    @staticmethod
    def _autenticar_basic_si_aplica(request) -> None:
        if not settings.ENABLE_BASIC_AUTH:
            return

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

    @staticmethod
    def _autenticar_bearer_si_aplica(request) -> None:
        if getattr(request.user, 'is_authenticated', False):
            return

        auth_result = authenticate_bearer_request(request)
        if auth_result is None:
            return

        usuario, token = auth_result
        request.user = usuario
        request.auth = token

    def __call__(self, request):
        token = None
        try:
            self._autenticar_bearer_si_aplica(request)
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
