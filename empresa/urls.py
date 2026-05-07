from rest_framework.routers import DefaultRouter

from empresa.views import EmpresaViewSet


router = DefaultRouter()
router.register(r'empresas', EmpresaViewSet, basename='empresa')

urlpatterns = router.urls

