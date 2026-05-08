from django.core.exceptions import PermissionDenied
from django.utils.translation import gettext_lazy as _
from rest_framework import serializers
from rest_framework_simplejwt.exceptions import TokenError

from empresa.services import EmpresaService
from usuario.auth_services import AuthRateLimitError, AuthService
from usuario.models import Usuario


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    password = serializers.CharField(write_only=True, trim_whitespace=False)
    remember_me = serializers.BooleanField(default=False)
    empresa_id = serializers.IntegerField(required=False, min_value=1)

    def validate(self, attrs):
        request = self.context['request']
        username = attrs['username']
        password = attrs['password']
        remember_me = attrs.get('remember_me', False)
        empresa_id = attrs.get('empresa_id')

        try:
            user = AuthService.authenticate_user(
                request,
                username,
                password,
            )
            empresa = AuthService.resolve_login_empresa(user, empresa_id)
        except AuthRateLimitError as exc:
            raise serializers.ValidationError({'detail': str(exc)}) from exc
        except PermissionDenied:
            raise

        attrs['user'] = user
        attrs['empresa'] = empresa
        attrs['tokens'] = AuthService.issue_tokens(user, remember_me)
        return attrs


class RefreshSerializer(serializers.Serializer):
    def validate(self, attrs):
        request = self.context['request']
        refresh = AuthService.extract_refresh_from_request(request)
        if not refresh:
            raise serializers.ValidationError({
                'detail': _('No hay refresh token vigente.'),
            })

        try:
            user, tokens = AuthService.refresh_tokens(refresh)
            empresa_id = (
                request.META.get(EmpresaService.HEADER_EMPRESA_ID)
                or request.session.get(EmpresaService.SESSION_EMPRESA_ID)
            )
            empresa = AuthService.resolve_login_empresa(user, empresa_id)
        except PermissionDenied:
            raise
        except (TokenError, Usuario.DoesNotExist) as exc:
            raise serializers.ValidationError({
                'detail': _('Refresh token invalido o revocado.'),
            }) from exc

        attrs['user'] = user
        attrs['tokens'] = tokens
        attrs['empresa'] = empresa
        return attrs


class LogoutSerializer(serializers.Serializer):
    def validate(self, attrs):
        request = self.context['request']
        refresh = AuthService.extract_refresh_from_request(request)
        attrs['refresh'] = refresh
        return attrs
