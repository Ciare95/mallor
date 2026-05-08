from datetime import datetime, timezone

from django.conf import settings
from django.contrib.auth import authenticate
from django.core.cache import cache
from django.core.exceptions import PermissionDenied
from django.utils.translation import gettext_lazy as _
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken

from empresa.models import EmpresaUsuario
from empresa.services import EmpresaService
from usuario.models import Usuario


class AuthRateLimitError(Exception):
    """Error de limite de intentos de autenticacion."""


class AuthService:
    LOGIN_RATE_LIMIT_ATTEMPTS = 5
    LOGIN_RATE_LIMIT_WINDOW = 15 * 60

    @staticmethod
    def get_client_ip(request) -> str:
        forwarded = request.META.get('HTTP_X_FORWARDED_FOR', '')
        if forwarded:
            return forwarded.split(',')[0].strip()
        return request.META.get('REMOTE_ADDR', 'unknown')

    @staticmethod
    def _rate_limit_key(request, username: str) -> str:
        ip = AuthService.get_client_ip(request)
        normalized = (username or '').strip().lower()
        return f'auth-login:{ip}:{normalized}'

    @staticmethod
    def validate_rate_limit(request, username: str) -> None:
        key = AuthService._rate_limit_key(request, username)
        attempts = cache.get(key, 0)
        if attempts >= AuthService.LOGIN_RATE_LIMIT_ATTEMPTS:
            raise AuthRateLimitError(
                _('Demasiados intentos fallidos. Intente mas tarde.'),
            )

    @staticmethod
    def register_failed_login(request, username: str) -> None:
        key = AuthService._rate_limit_key(request, username)
        attempts = cache.get(key, 0) + 1
        cache.set(key, attempts, AuthService.LOGIN_RATE_LIMIT_WINDOW)

    @staticmethod
    def clear_failed_logins(request, username: str) -> None:
        cache.delete(AuthService._rate_limit_key(request, username))

    @staticmethod
    def authenticate_user(request, username: str, password: str) -> Usuario:
        AuthService.validate_rate_limit(request, username)
        user = authenticate(request, username=username, password=password)
        if user is None:
            AuthService.register_failed_login(request, username)
            raise serializers.ValidationError({
                'detail': _('Credenciales invalidas.'),
            })
        if not user.is_active:
            AuthService.register_failed_login(request, username)
            raise serializers.ValidationError({
                'detail': _('El usuario esta inactivo.'),
            })
        AuthService.clear_failed_logins(request, username)
        return user

    @staticmethod
    def user_payload(user: Usuario) -> dict:
        return {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'is_staff': user.is_staff,
            'is_superuser': user.is_superuser,
        }

    @staticmethod
    def empresas_payload(user: Usuario) -> list[dict]:
        empresas = EmpresaService.empresas_usuario(user).order_by(
            'razon_social',
            'id',
        )
        return [
            {
                'id': empresa.id,
                'nit': empresa.nit,
                'digito_verificacion': empresa.digito_verificacion,
                'razon_social': empresa.razon_social,
                'nombre_comercial': empresa.nombre_comercial,
                'email': empresa.email,
                'telefono': empresa.telefono,
                'direccion': empresa.direccion,
                'municipio_codigo': empresa.municipio_codigo,
                'ambiente_facturacion': empresa.ambiente_facturacion,
                'activo': empresa.activo,
                'rol_usuario': EmpresaService.rol_usuario(user, empresa),
            }
            for empresa in empresas
        ]

    @staticmethod
    def resolve_login_empresa(user: Usuario, empresa_id=None):
        EmpresaService.asegurar_membresia_inicial(user)
        if empresa_id:
            return EmpresaService.seleccionar_empresa(user, empresa_id)

        empresa = EmpresaService.empresas_usuario(user).order_by('id').first()
        if empresa is None and not EmpresaService.es_admin_interno(user):
            raise PermissionDenied(
                _('El usuario no tiene una membresia activa.'),
            )
        return empresa

    @staticmethod
    def issue_tokens(user: Usuario, remember_me: bool = False) -> dict:
        refresh = RefreshToken.for_user(user)
        refresh['remember_me'] = bool(remember_me)
        if remember_me:
            refresh.set_exp(
                lifetime=settings.JWT_REMEMBER_REFRESH_LIFETIME,
            )

        access = refresh.access_token
        return {
            'access': str(access),
            'refresh': str(refresh),
            'expires_in': AuthService._token_ttl_seconds(access),
            'refresh_expires_in': AuthService._token_ttl_seconds(refresh),
            'remember_me': bool(remember_me),
        }

    @staticmethod
    def refresh_tokens(refresh_token: str) -> tuple[Usuario, dict]:
        refresh = RefreshToken(refresh_token)
        user_id = refresh.get('user_id')
        user = Usuario.objects.get(pk=user_id, is_active=True)
        remember_me = bool(refresh.get('remember_me', False))
        refresh.blacklist()
        return user, AuthService.issue_tokens(user, remember_me)

    @staticmethod
    def revoke_refresh(refresh_token: str) -> None:
        RefreshToken(refresh_token).blacklist()

    @staticmethod
    def build_session_payload(
        user: Usuario,
        empresa=None,
        token_payload: dict | None = None,
    ) -> dict:
        payload = {
            'user': AuthService.user_payload(user),
            'empresa_activa': empresa.id if empresa else None,
            'empresas': AuthService.empresas_payload(user),
        }
        if token_payload:
            payload.update({
                'access': token_payload['access'],
                'expires_in': token_payload['expires_in'],
                'refresh_expires_in': token_payload['refresh_expires_in'],
                'remember_me': token_payload['remember_me'],
            })
        return payload

    @staticmethod
    def extract_refresh_from_request(request) -> str:
        return (
            request.data.get('refresh')
            or request.COOKIES.get(settings.JWT_REFRESH_COOKIE_NAME)
            or ''
        )

    @staticmethod
    def set_refresh_cookie(response, refresh_token: str, remember_me: bool):
        max_age = None
        if remember_me:
            max_age = int(
                settings.JWT_REMEMBER_REFRESH_LIFETIME.total_seconds(),
            )
        response.set_cookie(
            settings.JWT_REFRESH_COOKIE_NAME,
            refresh_token,
            max_age=max_age,
            httponly=True,
            secure=settings.JWT_REFRESH_COOKIE_SECURE,
            samesite=settings.JWT_REFRESH_COOKIE_SAMESITE,
            path='/api/auth/',
        )

    @staticmethod
    def clear_refresh_cookie(response):
        response.delete_cookie(
            settings.JWT_REFRESH_COOKIE_NAME,
            path='/api/auth/',
            samesite=settings.JWT_REFRESH_COOKIE_SAMESITE,
        )

    @staticmethod
    def _token_ttl_seconds(token) -> int:
        exp = int(token['exp'])
        now = int(datetime.now(timezone.utc).timestamp())
        return max(exp - now, 0)
