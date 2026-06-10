from django.conf import settings
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.core.exceptions import PermissionDenied
from django.core.mail import send_mail
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError

from empresa.services import EmpresaService
from usuario.auth_serializers import (
    ForgotPasswordSerializer,
    LoginSerializer,
    LogoutSerializer,
    RefreshSerializer,
    ResetPasswordSerializer,
)
from usuario.auth_services import AuthService
from usuario.models import Usuario


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def post(self, request):
        AuthService.verify_turnstile(
            request,
            request.data.get('cf_turnstile_response', ''),
        )
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


class ForgotPasswordView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        username = serializer.validated_data['username']

        try:
            user = Usuario.objects.get(username=username)
        except Usuario.DoesNotExist:
            # Respuesta idéntica para no revelar si el usuario existe
            return Response(
                {'detail': 'Si el usuario existe y tiene correo registrado, recibirás las instrucciones en breve.'},
                status=status.HTTP_200_OK,
            )

        if not user.email:
            return Response(
                {'detail': 'Si el usuario existe y tiene correo registrado, recibirás las instrucciones en breve.'},
                status=status.HTTP_200_OK,
            )

        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = PasswordResetTokenGenerator().make_token(user)
        reset_url = f"{settings.FRONTEND_URL}/reset-password?uid={uid}&token={token}"

        try:
            send_mail(
                subject='Recuperar contraseña — Mallor',
                message=(
                    f'Hola {user.get_full_name() or user.username},\n\n'
                    f'Haz clic en el siguiente enlace para crear una nueva contraseña:\n\n'
                    f'{reset_url}\n\n'
                    f'Este enlace expira en 24 horas y solo puede usarse una vez.\n\n'
                    f'Si no solicitaste esto, ignora este mensaje.'
                ),
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=False,
            )
        except Exception:
            return Response(
                {'detail': 'No fue posible enviar el correo. Verifica la configuración de email del servidor.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        return Response(
            {'detail': 'Si el usuario existe y tiene correo registrado, recibirás las instrucciones en breve.'},
            status=status.HTTP_200_OK,
        )


class ResetPasswordView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = serializer.validated_data['user']
        user.set_password(serializer.validated_data['new_password'])
        user.save(update_fields=['password'])

        return Response(
            {'detail': 'Contraseña actualizada correctamente.'},
            status=status.HTTP_200_OK,
        )
