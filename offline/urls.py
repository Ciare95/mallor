from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import LicenseAdminViewSet, LicenseVerifyView, OfflineViewSet, SyncIngestView


router = DefaultRouter()
router.register(r'offline', OfflineViewSet, basename='offline')
router.register(r'offline/admin/licenses', LicenseAdminViewSet, basename='license-admin')

urlpatterns = [
    path('', include(router.urls)),
    path('offline/sync/ingest/', SyncIngestView.as_view(), name='sync-ingest'),
    path('offline/licenses/verify/', LicenseVerifyView.as_view(), name='license-verify'),
]
