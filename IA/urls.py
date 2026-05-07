from django.urls import include, path
from rest_framework.routers import DefaultRouter

from IA.views import IAViewSet


router = DefaultRouter()
router.register(r'ia', IAViewSet, basename='ia')

urlpatterns = [
    path('', include(router.urls)),
]
