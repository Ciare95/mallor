from django.urls import include, path
from rest_framework.routers import DefaultRouter

from proveedor.views import ProveedorViewSet


router = DefaultRouter()
router.register(r'proveedores', ProveedorViewSet, basename='proveedor')

urlpatterns = [
    path('', include(router.urls)),
]
