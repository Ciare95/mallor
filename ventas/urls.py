from django.urls import include, path
from rest_framework.routers import DefaultRouter

from ventas.views import (
    AbonoViewSet,
    FacturacionViewSet,
    VentaReporteViewSet,
    VentaViewSet,
)


router = DefaultRouter()
router.register(
    r'ventas/reportes',
    VentaReporteViewSet,
    basename='venta-reporte',
)
router.register(r'ventas', VentaViewSet, basename='venta')
router.register(r'abonos', AbonoViewSet, basename='abono')
router.register(r'facturacion', FacturacionViewSet, basename='facturacion')

urlpatterns = [
    path('', include(router.urls)),
]
