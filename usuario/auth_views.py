from django.core.exceptions import PermissionDenied
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError

from empresa.services import EmpresaService
from usuario.auth_serializers import (
    LoginSerializer,
    LogoutSerializer,
    RefreshSerializer,
)
from usuario.auth_services import AuthService


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = LoginSerializer(
            data=request.data,
            context={'request': request},
        )
        serializer.is_valid(raise_exception=True)

        user = serializer.validated_data['user']
        empresa = serializer.validated_data['empresa']
        tokens = serializer.validated_data['tokens']
        if empresa:
            request.session[EmpresaService.SESSION_EMPRESA_ID] = empresa.id

        payload = AuthService.build_session_payload(user, empresa, tokens)
        response = Response(payload, status=status.HTTP_200_OK)
        AuthService.set_refresh_cookie(
            response,
            tokens['refresh'],
            tokens['remember_me'],
        )
        return response


class RefreshView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = RefreshSerializer(
            data=request.data,
            context={'request': request},
        )
        serializer.is_valid(raise_exception=True)

        user = serializer.validated_data['user']
        empresa = serializer.validated_data.get('empresa')
        tokens = serializer.validated_data['tokens']
        if empresa:
            request.session[EmpresaService.SESSION_EMPRESA_ID] = empresa.id

        payload = AuthService.build_session_payload(user, empresa, tokens)
        response = Response(payload, status=status.HTTP_200_OK)
        AuthService.set_refresh_cookie(
            response,
            tokens['refresh'],
            tokens['remember_me'],
        )
        return response


class LogoutView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = LogoutSerializer(
            data=request.data,
            context={'request': request},
        )
        serializer.is_valid(raise_exception=True)
        refresh = serializer.validated_data.get('refresh')
        if refresh:
            try:
                AuthService.revoke_refresh(refresh)
            except TokenError:
                pass

        request.session.pop(EmpresaService.SESSION_EMPRESA_ID, None)
        response = Response(status=status.HTTP_204_NO_CONTENT)
        AuthService.clear_refresh_cookie(response)
        return response


class MeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        try:
            empresa = getattr(request, 'empresa', None)
            if empresa is None:
                empresa = EmpresaService.resolver_empresa_request(request)
        except PermissionDenied as exc:
            return Response(
                {'detail': str(exc)},
                status=status.HTTP_403_FORBIDDEN,
            )

        if empresa:
            request.session[EmpresaService.SESSION_EMPRESA_ID] = empresa.id

        return Response(
            AuthService.build_session_payload(request.user, empresa),
            status=status.HTTP_200_OK,
        )
