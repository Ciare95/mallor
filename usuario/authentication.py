from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError


class MallorJWTAuthentication(JWTAuthentication):
    """
    Autenticacion JWT de Mallor.

    La clase no autoriza empresas. Solo resuelve el usuario autenticado; el
    tenant activo se valida en EmpresaActivaMiddleware/EmpresaService.
    """


def authenticate_bearer_request(request):
    """
    Autentica un HttpRequest Django con Bearer antes de que DRF ejecute.

    EmpresaActivaMiddleware necesita request.user resuelto antes de calcular
    request.empresa. Si el Bearer no existe, devuelve None para permitir que
    otros mecanismos de autenticacion sigan funcionando.
    """
    header = request.META.get('HTTP_AUTHORIZATION', '')
    if not header.startswith('Bearer '):
        return None

    try:
        return MallorJWTAuthentication().authenticate(request)
    except (InvalidToken, TokenError):
        return None
