from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .auth_views import ForgotPasswordView, LoginView, LogoutView, MeView, RefreshView, ResetPasswordView
from .views import UsuarioViewSet

# Crear router y registrar ViewSet
router = DefaultRouter()
router.register(r'usuarios', UsuarioViewSet, basename='usuario')

# URLs de la aplicación
urlpatterns = [
    path('auth/login/', LoginView.as_view(), name='auth-login'),
    path('auth/refresh/', RefreshView.as_view(), name='auth-refresh'),
    path('auth/logout/', LogoutView.as_view(), name='auth-logout'),
    path('auth/me/', MeView.as_view(), name='auth-me'),
    path('auth/forgot-password/', ForgotPasswordView.as_view(), name='auth-forgot-password'),
    path('auth/reset-password/', ResetPasswordView.as_view(), name='auth-reset-password'),
    path('', include(router.urls)),
]
