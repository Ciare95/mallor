from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import IngredienteViewSet, ProductoFabricadoViewSet

router = DefaultRouter()
router.register(r'ingredientes', IngredienteViewSet, basename='ingrediente')
router.register(
    r'productos',
    ProductoFabricadoViewSet,
    basename='producto-fabricado',
)

urlpatterns = [
    path('', include(router.urls)),
]
