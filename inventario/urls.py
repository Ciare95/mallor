from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    CategoriaViewSet,
    ProductoViewSet,
    FacturaCompraViewSet,
    ReportesViewSet,
    ExportarInventarioView,
    ImportarProductosExcelView,
    PlantillaProductosExcelView,
)

router = DefaultRouter()
router.register(r'categorias', CategoriaViewSet, basename='categoria')
router.register(r'productos', ProductoViewSet, basename='producto')
router.register(r'facturas', FacturaCompraViewSet, basename='factura')
router.register(r'reportes', ReportesViewSet, basename='reporte')

urlpatterns = [
    path('exportar/excel/', ExportarInventarioView.as_view(), name='exportar-inventario'),
    path(
        'productos/plantilla-excel/',
        PlantillaProductosExcelView.as_view(),
        name='productos-plantilla-excel',
    ),
    path(
        'productos/importar-excel/',
        ImportarProductosExcelView.as_view(),
        name='productos-importar-excel',
    ),
    path('', include(router.urls)),
]
