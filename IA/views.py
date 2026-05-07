from django.core.exceptions import PermissionDenied
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

from IA.context import resolver_contexto_ia
from IA.models import MensajeIA
from IA.serializers import IAChatSerializer, IAFeedbackSerializer, MensajeIASerializer
from IA.services import IAService


class IAHistoryPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 50


class IAViewSet(viewsets.ViewSet):
    pagination_class = IAHistoryPagination

    @action(detail=False, methods=['post'], url_path='chat')
    def chat(self, request):
        serializer = IAChatSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            result = IAService.procesar_consulta(
                request=request,
                consulta=serializer.validated_data['consulta'],
                sesion_id=serializer.validated_data.get('sesion_id'),
            )
        except PermissionDenied as exc:
            return Response({'error': str(exc)}, status=status.HTTP_403_FORBIDDEN)
        except ValueError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(result)

    @action(detail=False, methods=['get', 'delete'], url_path='historial')
    def historial(self, request):
        try:
            contexto = resolver_contexto_ia(
                request,
                request.query_params.get('sesion_id') or None,
            )
        except PermissionDenied as exc:
            return Response({'error': str(exc)}, status=status.HTTP_403_FORBIDDEN)
        except ValueError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        sesion_id = request.query_params.get('sesion_id')
        if request.method == 'DELETE':
            deleted = IAService.limpiar_historial(contexto, sesion_id)
            return Response({'deleted': deleted})

        queryset = IAService.obtener_historial(contexto, sesion_id)
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(queryset, request)
        serializer = MensajeIASerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    @action(detail=False, methods=['get'], url_path='sugerencias')
    def sugerencias(self, request):
        try:
            contexto = resolver_contexto_ia(request)
        except PermissionDenied as exc:
            return Response({'error': str(exc)}, status=status.HTTP_403_FORBIDDEN)
        return Response({'results': IAService.sugerencias(contexto)})

    @action(detail=False, methods=['post'], url_path='feedback')
    def feedback(self, request):
        serializer = IAFeedbackSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            contexto = resolver_contexto_ia(request)
            mensaje = IAService.registrar_feedback(
                contexto,
                serializer.validated_data['mensaje_id'],
                serializer.validated_data['feedback'],
                serializer.validated_data.get('comentario', ''),
            )
        except MensajeIA.DoesNotExist:
            return Response(
                {'error': 'Mensaje no encontrado.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        except PermissionDenied as exc:
            return Response({'error': str(exc)}, status=status.HTTP_403_FORBIDDEN)

        return Response(MensajeIASerializer(mensaje).data)
