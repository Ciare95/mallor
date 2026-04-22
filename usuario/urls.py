from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import UsuarioViewSet

# Crear router y registrar ViewSet
router = DefaultRouter()
router.register(r'usuarios', UsuarioViewSet, basename='usuario')

# URLs de la aplicación
urlpatterns = [
    path('', include(router.urls)),
]