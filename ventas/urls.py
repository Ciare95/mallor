from django.urls import include, path
from rest_framework.routers import DefaultRouter

from ventas.views import AbonoViewSet, VentaReporteViewSet, VentaViewSet


router = DefaultRouter()
router.register(
    r'ventas/reportes',
    VentaReporteViewSet,
    basename='venta-reporte',
)
router.register(r'ventas', VentaViewSet, basename='venta')
router.register(r'abonos', AbonoViewSet, basename='abono')

urlpatterns = [
    path('', include(router.urls)),
]
