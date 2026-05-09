from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .auth_views import LoginView, LogoutView, MeView, RefreshView
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
    path('', include(router.urls)),
]
