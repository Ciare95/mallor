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

    def __call__(self, request):
        token = None
        try:
            empresa = EmpresaService.resolver_empresa_request(request)
            request.empresa = empresa
            token = set_empresa_actual(empresa)
            return self.get_response(request)
        except PermissionDenied as exc:
            return JsonResponse({'error': str(exc)}, status=403)
        finally:
            if token is not None:
                reset_empresa_actual(token)

