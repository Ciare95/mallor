from django.urls import path, include
from rest_framework.routers import SimpleRouter

from .views import UsuarioViewSet

# Crear router y registrar ViewSet
router = SimpleRouter(trailing_slash=False)
router.register(r'usuarios', UsuarioViewSet, basename='usuario')

# URLs de la aplicación
urlpatterns = [
    path('', include(router.urls)),
]