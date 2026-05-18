from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import OfflineViewSet


router = DefaultRouter()
router.register(r'offline', OfflineViewSet, basename='offline')

urlpatterns = [
    path('', include(router.urls)),
]
