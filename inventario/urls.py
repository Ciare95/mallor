from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    CategoriaViewSet,
    ProductoViewSet,
    FacturaCompraViewSet,
    ReportesViewSet,
    ExportarInventarioView,
)

router = DefaultRouter()
router.register(r'categorias', CategoriaViewSet, basename='categoria')
router.register(r'productos', ProductoViewSet, basename='producto')
router.register(r'facturas', FacturaCompraViewSet, basename='factura')
router.register(r'reportes', ReportesViewSet, basename='reporte')

urlpatterns = [
    path('', include(router.urls)),
    path('exportar/excel/', ExportarInventarioView.as_view(), name='exportar-inventario'),
]
