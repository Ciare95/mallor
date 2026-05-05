from django.core.exceptions import PermissionDenied
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.request import Request
from rest_framework.response import Response

from empresa.models import Empresa
from empresa.serializers import (
    EmpresaSeleccionSerializer,
    EmpresaSerializer,
    FactusCredentialSerializer,
)
from empresa.services import EmpresaService
from ventas.models import FactusCredential
from ventas.serializers import FacturacionElectronicaConfigSerializer


class EmpresaViewSet(viewsets.ViewSet):
    """
    Endpoints de seleccion y administracion basica de empresas del usuario.
    """

    def list(self, request: Request) -> Response:
        queryset = EmpresaService.empresas_usuario(request.user)
        serializer = EmpresaSerializer(
            queryset,
            many=True,
            context={'request': request},
        )
        empresa_activa = getattr(request, 'empresa', None)
        return Response({
            'empresa_activa': empresa_activa.id if empresa_activa else None,
            'results': serializer.data,
        })

    def retrieve(self, request: Request, pk: int = None) -> Response:
        try:
            empresa = EmpresaService.empresas_usuario(request.user).get(pk=pk)
        except Empresa.DoesNotExist:
            return Response(
                {'error': 'Empresa no encontrada.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        serializer = EmpresaSerializer(empresa, context={'request': request})
        return Response(serializer.data)

    def partial_update(self, request: Request, pk: int = None) -> Response:
        try:
            empresa = EmpresaService.empresas_usuario(request.user).get(pk=pk)
        except Empresa.DoesNotExist:
            return Response(
                {'error': 'Empresa no encontrada.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        rol = EmpresaService.rol_usuario(request.user, empresa)
        if rol not in ('PROPIETARIO', 'ADMIN'):
            return Response(
                {'error': 'No tiene permisos para editar esta empresa.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        serializer = EmpresaSerializer(
            empresa,
            data=request.data,
            partial=True,
            context={'request': request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def _get_empresa_permitida(self, request: Request, pk: int):
        try:
            return EmpresaService.empresas_usuario(request.user).get(pk=pk)
        except Empresa.DoesNotExist:
            return None

    def _can_admin_empresa(self, request: Request, empresa: Empresa) -> bool:
        return EmpresaService.rol_usuario(
            request.user,
            empresa,
        ) in ('PROPIETARIO', 'ADMIN')

    @action(
        detail=True,
        methods=['get', 'patch'],
        url_path='facturacion/configuracion',
    )
    def facturacion_configuracion(self, request: Request, pk: int = None) -> Response:
        empresa = self._get_empresa_permitida(request, pk)
        if empresa is None:
            return Response(
                {'error': 'Empresa no encontrada.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        if not self._can_admin_empresa(request, empresa):
            return Response(
                {'error': 'No tiene permisos para configurar Factus.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        config = empresa.facturacion_config if hasattr(
            empresa,
            'facturacion_config',
        ) else None
        if config is None:
            from ventas.models import FacturacionElectronicaConfig

            config = FacturacionElectronicaConfig.get_solo(empresa)

        if request.method == 'GET':
            return Response(FacturacionElectronicaConfigSerializer(config).data)

        serializer = FacturacionElectronicaConfigSerializer(
            config,
            data=request.data,
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    @action(
        detail=True,
        methods=['get', 'patch', 'post'],
        url_path='facturacion/credenciales',
    )
    def facturacion_credenciales(self, request: Request, pk: int = None) -> Response:
        empresa = self._get_empresa_permitida(request, pk)
        if empresa is None:
            return Response(
                {'error': 'Empresa no encontrada.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        if not self._can_admin_empresa(request, empresa):
            return Response(
                {'error': 'No tiene permisos para configurar credenciales.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        environment = request.data.get(
            'environment',
            request.query_params.get('environment', 'SANDBOX'),
        )
        credential = FactusCredential.objects.filter(
            empresa=empresa,
            environment=environment,
        ).first()

        if request.method == 'GET':
            if credential is None:
                return Response({'configured': False})
            data = FactusCredentialSerializer(credential).data
            data['configured'] = True
            return Response(data)

        serializer = FactusCredentialSerializer(
            credential,
            data=request.data,
            partial=request.method == 'PATCH',
        )
        serializer.is_valid(raise_exception=True)
        serializer.save(empresa=empresa)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], url_path='seleccionar')
    def seleccionar(self, request: Request) -> Response:
        serializer = EmpresaSeleccionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            empresa = EmpresaService.seleccionar_empresa(
                request.user,
                serializer.validated_data['empresa_id'],
            )
        except PermissionDenied as exc:
            return Response({'error': str(exc)}, status=status.HTTP_403_FORBIDDEN)

        request.session[EmpresaService.SESSION_EMPRESA_ID] = empresa.id
        return Response(
            EmpresaSerializer(
                empresa,
                context={'request': request},
            ).data,
        )
