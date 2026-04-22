from typing import Any, Dict
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.request import Request
from django.core.exceptions import ValidationError, PermissionDenied
from django.utils.translation import gettext_lazy as _

from .models import Usuario
from .serializers import (
    UsuarioSerializer,
    UsuarioListSerializer,
    UsuarioCreateSerializer,
    UsuarioUpdateSerializer,
)
from .services import UsuarioService
from core.exceptions import (
    UsuarioError,
    UsuarioNoEncontradoError,
    UsuarioDuplicadoError,
    PasswordIncorrectoError,
    PasswordInseguroError,
    PermisoDenegadoError,
    UltimoAdministradorError,
)


class UsuarioPermission(permissions.BasePermission):
    """
    Permiso personalizado para validar acceso a usuarios basado en roles.
    
    Utiliza el servicio UsuarioService.validar_permisos para determinar
    si un usuario puede realizar una acción específica.
    """

    def has_permission(self, request: Request, view) -> bool:
        """
        Verifica permisos a nivel de vista (list, create).
        """
        # Si el usuario no está autenticado
        if not request.user or not request.user.is_authenticated:
            # Permitir creación solo si es el primer usuario del sistema
            if view.action == 'create':
                # Verificar si hay usuarios en la base de datos
                if Usuario.objects.filter(is_active=True).count() == 0:
                    return True  # Permitir crear primer usuario
                return False  # No permitir creación sin autenticación si ya hay usuarios
            return False

        # Obtener acción de la vista
        accion = self._map_view_action_to_business_action(view.action)
        
        # Validar permisos usando el servicio
        return UsuarioService.validar_permisos(request.user, accion)

    def has_object_permission(self, request: Request, view, obj: Usuario) -> bool:
        """
        Verifica permisos a nivel de objeto (retrieve, update, delete, cambiar_password).
        """
        if not request.user or not request.user.is_authenticated:
            return False

        # Obtener acción de la vista
        accion = self._map_view_action_to_business_action(view.action)
        
        # Validar permisos usando el servicio
        return UsuarioService.validar_permisos(request.user, accion, obj)

    def _map_view_action_to_business_action(self, view_action: str) -> str:
        """
        Mapea acciones de DRF ViewSet a acciones de negocio.
        """
        mapping = {
            'list': 'listar_usuarios',
            'create': 'crear_usuario',
            'retrieve': 'ver_usuario',
            'update': 'actualizar_usuario',
            'partial_update': 'actualizar_usuario',
            'destroy': 'eliminar_usuario',
            'cambiar_password': 'cambiar_password',
            'me': 'ver_usuario',
        }
        return mapping.get(view_action, view_action)


class UsuarioViewSet(viewsets.ViewSet):
    """
    ViewSet para gestionar operaciones CRUD de usuarios.
    
    Implementa todos los endpoints requeridos para el módulo de usuarios:
    - Listar usuarios con filtros y paginación
    - Crear nuevos usuarios
    - Obtener, actualizar y eliminar usuarios específicos
    - Cambiar contraseña
    - Obtener información del usuario actual
    
    Sigue la arquitectura de capas: View → Serializer → Service → Model
    """

    permission_classes = [UsuarioPermission]
    serializer_classes = {
        'list': UsuarioListSerializer,
        'retrieve': UsuarioSerializer,
        'create': UsuarioCreateSerializer,
        'update': UsuarioUpdateSerializer,
        'partial_update': UsuarioUpdateSerializer,
        'me': UsuarioSerializer,
    }

    def get_serializer_class(self):
        """
        Retorna el serializer apropiado según la acción.
        """
        return self.serializer_classes.get(self.action, UsuarioSerializer)

    def get_serializer(self, *args, **kwargs):
        """
        Crea una instancia del serializer con el contexto de la request.
        """
        serializer_class = self.get_serializer_class()
        kwargs.setdefault('context', {'request': self.request})
        return serializer_class(*args, **kwargs)

    def list(self, request: Request) -> Response:
        """
        Lista usuarios con filtros y paginación.
        
        Filtros disponibles:
        - role: ADMIN o EMPLEADO
        - email__icontains: Búsqueda parcial en email
        - username__icontains: Búsqueda parcial en username
        - first_name__icontains: Búsqueda parcial en nombre
        - last_name__icontains: Búsqueda parcial en apellido
        - orden: Campo para ordenar (username, email, first_name, last_name, date_joined, role)
        
        Ejemplo: /api/usuarios/?role=ADMIN&email__icontains=admin&orden=-date_joined
        """
        try:
            # Extraer filtros de query parameters
            filtros = {
                'role': request.query_params.get('role'),
                'email': request.query_params.get('email__icontains'),
                'username': request.query_params.get('username__icontains'),
                'first_name': request.query_params.get('first_name__icontains'),
                'last_name': request.query_params.get('last_name__icontains'),
                'orden': request.query_params.get('orden', '-date_joined'),
            }
            
            # Eliminar filtros None
            filtros = {k: v for k, v in filtros.items() if v is not None}
            
            # Obtener usuarios usando el servicio
            usuarios = UsuarioService.listar_usuarios(filtros)
            
            # Paginación manual (DRF no la hace automática en ViewSet)
            page = self.paginate_queryset(usuarios)
            if page is not None:
                serializer = self.get_serializer(page, many=True)
                return self.get_paginated_response(serializer.data)
            
            serializer = self.get_serializer(usuarios, many=True)
            return Response(serializer.data)
            
        except Exception as e:
            return Response(
                {'error': _('Error al listar usuarios: %(error)s') % {'error': str(e)}},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def create(self, request: Request) -> Response:
        """
        Crea un nuevo usuario.
        
        Requiere permisos de administrador para crear otros administradores.
        Empleados solo pueden crear otros empleados.
        """
        try:
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            
            # Obtener usuario que realiza la solicitud (si está autenticado)
            usuario_solicitante = request.user if request.user.is_authenticated else None
            
            # Crear usuario usando el servicio
            usuario = UsuarioService.crear_usuario(
                data=serializer.validated_data,
                usuario_solicitante=usuario_solicitante
            )
            
            # Retornar respuesta con serializer de lectura
            response_serializer = UsuarioSerializer(usuario)
            return Response(
                response_serializer.data,
                status=status.HTTP_201_CREATED
            )
            
        except (UsuarioDuplicadoError, PasswordInseguroError, PermisoDenegadoError) as e:
            return Response(
                {'error': e.message},
                status=status.HTTP_400_BAD_REQUEST
            )
        except ValidationError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {'error': _('Error al crear usuario: %(error)s') % {'error': str(e)}},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def retrieve(self, request: Request, pk: int = None) -> Response:
        """
        Obtiene un usuario específico por ID.
        """
        try:
            usuario = UsuarioService.obtener_usuario(int(pk))
            serializer = self.get_serializer(usuario)
            return Response(serializer.data)
            
        except UsuarioNoEncontradoError as e:
            return Response(
                {'error': e.message},
                status=status.HTTP_404_NOT_FOUND
            )
        except ValueError:
            return Response(
                {'error': _('ID de usuario inválido')},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {'error': _('Error al obtener usuario: %(error)s') % {'error': str(e)}},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def update(self, request: Request, pk: int = None) -> Response:
        """
        Actualiza un usuario completo (PUT).
        """
        return self._actualizar_usuario(request, pk, partial=False)

    def partial_update(self, request: Request, pk: int = None) -> Response:
        """
        Actualiza un usuario parcialmente (PATCH).
        """
        return self._actualizar_usuario(request, pk, partial=True)

    def _actualizar_usuario(self, request: Request, pk: int, partial: bool) -> Response:
        """
        Método interno para actualizar usuarios (completo o parcial).
        """
        try:
            usuario = UsuarioService.obtener_usuario(int(pk))
            
            serializer = self.get_serializer(
                usuario,
                data=request.data,
                partial=partial
            )
            serializer.is_valid(raise_exception=True)
            
            # Obtener usuario que realiza la solicitud
            usuario_solicitante = request.user if request.user.is_authenticated else None
            
            # Actualizar usuario usando el servicio
            usuario_actualizado = UsuarioService.actualizar_usuario(
                user_id=int(pk),
                data=serializer.validated_data,
                usuario_solicitante=usuario_solicitante
            )
            
            # Retornar respuesta con serializer de lectura
            response_serializer = UsuarioSerializer(usuario_actualizado)
            return Response(response_serializer.data)
            
        except UsuarioNoEncontradoError as e:
            return Response(
                {'error': e.message},
                status=status.HTTP_404_NOT_FOUND
            )
        except (UsuarioDuplicadoError, PermisoDenegadoError) as e:
            return Response(
                {'error': e.message},
                status=status.HTTP_400_BAD_REQUEST
            )
        except ValidationError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except ValueError:
            return Response(
                {'error': _('ID de usuario inválido')},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {'error': _('Error al actualizar usuario: %(error)s') % {'error': str(e)}},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def destroy(self, request: Request, pk: int = None) -> Response:
        """
        Elimina un usuario (soft delete).
        
        No se puede eliminar el último administrador del sistema.
        """
        try:
            # Obtener usuario que realiza la solicitud
            usuario_solicitante = request.user if request.user.is_authenticated else None
            
            # Eliminar usuario usando el servicio
            UsuarioService.eliminar_usuario(
                user_id=int(pk),
                usuario_solicitante=usuario_solicitante
            )
            
            return Response(status=status.HTTP_204_NO_CONTENT)
            
        except UsuarioNoEncontradoError as e:
            return Response(
                {'error': e.message},
                status=status.HTTP_404_NOT_FOUND
            )
        except (UltimoAdministradorError, PermisoDenegadoError) as e:
            return Response(
                {'error': e.message},
                status=status.HTTP_400_BAD_REQUEST
            )
        except ValueError:
            return Response(
                {'error': _('ID de usuario inválido')},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {'error': _('Error al eliminar usuario: %(error)s') % {'error': str(e)}},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'])
    def cambiar_password(self, request: Request, pk: int = None) -> Response:
        """
        Cambia la contraseña de un usuario.
        
        Requiere la contraseña actual y la nueva contraseña.
        Solo el propio usuario puede cambiar su contraseña,
        a menos que sea administrador.
        """
        try:
            old_password = request.data.get('old_password')
            new_password = request.data.get('new_password')
            
            if not old_password or not new_password:
                return Response(
                    {'error': _('Se requieren old_password y new_password')},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Cambiar contraseña usando el servicio
            UsuarioService.cambiar_password(
                user_id=int(pk),
                old_password=old_password,
                new_password=new_password
            )
            
            return Response(
                {'message': _('Contraseña cambiada exitosamente')},
                status=status.HTTP_200_OK
            )
            
        except UsuarioNoEncontradoError as e:
            return Response(
                {'error': e.message},
                status=status.HTTP_404_NOT_FOUND
            )
        except (PasswordIncorrectoError, PasswordInseguroError) as e:
            return Response(
                {'error': e.message},
                status=status.HTTP_400_BAD_REQUEST
            )
        except ValueError:
            return Response(
                {'error': _('ID de usuario inválido')},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {'error': _('Error al cambiar contraseña: %(error)s') % {'error': str(e)}},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'])
    def me(self, request: Request) -> Response:
        """
        Obtiene la información del usuario actualmente autenticado.
        """
        if not request.user or not request.user.is_authenticated:
            return Response(
                {'error': _('No autenticado')},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        try:
            usuario = UsuarioService.obtener_usuario(request.user.id)
            serializer = self.get_serializer(usuario)
            return Response(serializer.data)
            
        except UsuarioNoEncontradoError as e:
            return Response(
                {'error': e.message},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': _('Error al obtener información del usuario: %(error)s') % {'error': str(e)}},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @property
    def paginator(self):
        """
        Propiedad para acceder al paginador.
        """
        if not hasattr(self, '_paginator'):
            from rest_framework.pagination import PageNumberPagination
            
            class UsuarioPagination(PageNumberPagination):
                page_size = 10
                page_size_query_param = 'page_size'
                max_page_size = 100
                
                def get_paginated_response(self, data):
                    return Response({
                        'count': self.page.paginator.count,
                        'next': self.get_next_link(),
                        'previous': self.get_previous_link(),
                        'results': data,
                        'page_size': self.page_size,
                        'current_page': self.page.number,
                        'total_pages': self.page.paginator.num_pages,
                    })
            
            self._paginator = UsuarioPagination()
        return self._paginator

    def paginate_queryset(self, queryset):
        """
        Pagina el queryset si está habilitada la paginación.
        """
        if self.request and self.paginator:
            return self.paginator.paginate_queryset(queryset, self.request, view=self)
        return None

    def get_paginated_response(self, data):
        """
        Retorna respuesta paginada.
        """
        assert self.paginator is not None
        return self.paginator.get_paginated_response(data)