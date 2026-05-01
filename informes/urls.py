from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import CierreCajaViewSet, EstadisticasViewSet, InformeViewSet


router = DefaultRouter()
router.register(
    r'estadisticas',
    EstadisticasViewSet,
    basename='informe-estadistica',
)
router.register(r'cierres', CierreCajaViewSet, basename='cierre-caja')
router.register(r'reportes', InformeViewSet, basename='informe')

urlpatterns = [
    path('', include(router.urls)),
]
