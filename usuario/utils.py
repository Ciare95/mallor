from functools import wraps
from typing import List, Union, Callable
from django.http import HttpRequest, HttpResponse, JsonResponse
from django.views import View
from django.utils.translation import gettext_lazy as _
from rest_framework.request import Request as DRFRequest
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from .models import Usuario
from .services import UsuarioService
from core.exceptions import PermisoDenegadoError


"""
Módulo de utilidades para gestión de permisos basados en roles.

Este módulo proporciona todas las herramientas necesarias para implementar
y aplicar el sistema de permisos basado en roles (ADMIN/EMPLEADO) en el
proyecto Mallor.

Componentes principales:
1. Decoradores: @role_required, @permission_required
2. Mixins: RolePermissionMixin para vistas basadas en clases
3. Mensajes: PermissionMessages para errores consistentes
4. Constantes: PERMISOS para referencia centralizada

El sistema se integra con:
- Django views (funciones y clases)
- Django REST Framework (APIView, ViewSet)
- Capa de servicios (UsuarioService.validar_permisos)
- Excepciones de dominio (PermisoDenegadoError)

Para más detalles sobre la lógica de permisos, ver UsuarioService.validar_permisos.
"""


def role_required(roles: Union[str, List[str]]):
    """
    Decorador para vistas basadas en funciones que valida que el usuario
    tenga al menos uno de los roles especificados.
    
    Args:
        roles: Rol o lista de roles requeridos (ADMIN, EMPLEADO)
    
    Returns:
        Función decorada que valida permisos antes de ejecutar la vista
        
    Raises:
        PermisoDenegadoError: Si el usuario no tiene el rol requerido
    
    Ejemplo:
        @role_required(['ADMIN'])
        def vista_solo_admin(request):
            ...
            
        @role_required('ADMIN')
        def otra_vista_admin(request):
            ...
    """
    if isinstance(roles, str):
        roles = [roles]
    
    def decorator(view_func: Callable):
        @wraps(view_func)
        def _wrapped_view(request: HttpRequest, *args, **kwargs):
            # Verificar autenticación
            if not request.user or not request.user.is_authenticated:
                return JsonResponse(
                    {'error': _('No autenticado')},
                    status=status.HTTP_401_UNAUTHORIZED
                )
            
            # Verificar que el usuario tenga al menos uno de los roles requeridos
            usuario = request.user
            if not hasattr(usuario, 'role'):
                return JsonResponse(
                    {'error': _('Usuario no tiene rol definido')},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            if usuario.role not in roles:
                error_msg = _(
                    'Se requiere rol %(roles)s. Tu rol es %(user_role)s.'
                ) % {'roles': ', '.join(roles), 'user_role': usuario.role}
                return JsonResponse(
                    {'error': error_msg},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Ejecutar vista si pasa validación
            return view_func(request, *args, **kwargs)
        
        return _wrapped_view
    
    return decorator


class RolePermissionMixin:
    """
    Mixin para vistas basadas en clases que valida permisos basados en roles.
    
    Este mixin puede usarse con vistas Django (View) o DRF (APIView).
    Proporciona métodos para validar permisos antes de ejecutar acciones.
    
    Attributes:
        required_roles: Lista de roles requeridos para acceder a la vista
        permission_action: Acción de negocio para validación granular (opcional)
    
    Ejemplo:
        class MiVista(RolePermissionMixin, APIView):
            required_roles = ['ADMIN']
            
            def get(self, request):
                ...
    """
    
    required_roles = None  # Se debe sobrescribir en subclases
    permission_action = None
    
    def dispatch(self, request: HttpRequest, *args, **kwargs):
        """
        Intercepta el dispatch para validar permisos antes de procesar la request.
        """
        # Validar permisos si hay roles requeridos
        if self.required_roles:
            self._validate_role_permission(request)
        
        # Validar permisos granular si hay acción definida
        if self.permission_action and hasattr(request, 'user') and request.user.is_authenticated:
            self._validate_business_permission(request)
        
        return super().dispatch(request, *args, **kwargs)
    
    def _validate_role_permission(self, request: HttpRequest) -> None:
        """
        Valida que el usuario tenga al menos uno de los roles requeridos.
        
        Args:
            request: Request HTTP
            
        Raises:
            PermisoDenegadoError: Si el usuario no tiene el rol requerido
        """
        if not request.user or not request.user.is_authenticated:
            raise PermisoDenegadoError(_("acceder a esta vista"))
        
        usuario = request.user
        if not hasattr(usuario, 'role'):
            raise PermisoDenegadoError(_("acceder a esta vista"))
        
        if usuario.role not in self.required_roles:
            error_msg = _(
                'Se requiere rol %(roles)s. Tu rol es %(user_role)s.'
            ) % {'roles': ', '.join(self.required_roles), 'user_role': usuario.role}
            raise PermisoDenegadoError(error_msg)
    
    def _validate_business_permission(self, request: HttpRequest) -> None:
        """
        Valida permisos de negocio granular usando UsuarioService.
        
        Args:
            request: Request HTTP
            
        Raises:
            PermisoDenegadoError: Si el usuario no tiene permisos para la acción
        """
        usuario = request.user
        if not UsuarioService.validar_permisos(usuario, self.permission_action):
            raise PermisoDenegadoError(self.permission_action)
    
    def handle_permission_denied(self, request: HttpRequest, exception: Exception) -> HttpResponse:
        """
        Maneja excepciones de permisos denegados.
        
        Args:
            request: Request HTTP
            exception: Excepción de permiso denegado
            
        Returns:
            HttpResponse: Respuesta HTTP con error
        """
        if isinstance(request, DRFRequest):
            # Para DRF APIView
            return Response(
                {'error': str(exception)},
                status=status.HTTP_403_FORBIDDEN
            )
        else:
            # Para Django View
            return JsonResponse(
                {'error': str(exception)},
                status=status.HTTP_403_FORBIDDEN
            )
    
    def handle_exception(self, exc):
        """
        Sobrescribe handle_exception para manejar PermisoDenegadoError.
        """
        if isinstance(exc, PermisoDenegadoError):
            return self.handle_permission_denied(self.request, exc)
        return super().handle_exception(exc)


def permission_required(action: str):
    """
    Decorador para validar permisos de negocio granular.
    
    Args:
        action: Acción de negocio a validar (ej: 'crear_usuario', 'ver_informes')
    
    Returns:
        Función decorada que valida permisos antes de ejecutar
        
    Ejemplo:
        @permission_required('crear_usuario')
        def crear_usuario_view(request):
            ...
    """
    def decorator(view_func: Callable):
        @wraps(view_func)
        def _wrapped_view(request: HttpRequest, *args, **kwargs):
            # Verificar autenticación
            if not request.user or not request.user.is_authenticated:
                return JsonResponse(
                    {'error': _('No autenticado')},
                    status=status.HTTP_401_UNAUTHORIZED
                )
            
            # Validar permisos usando UsuarioService
            if not UsuarioService.validar_permisos(request.user, action):
                raise PermisoDenegadoError(action)
            
            # Ejecutar vista si pasa validación
            return view_func(request, *args, **kwargs)
        
        return _wrapped_view
    
    return decorator


class PermissionMessages:
    """
    Utilidad para generar mensajes de error de permisos consistentes.
    
    Proporciona mensajes predefinidos para diferentes tipos de errores
    de permisos en el sistema.
    """
    
    @staticmethod
    def get_role_required_message(required_roles: List[str], user_role: str) -> str:
        """
        Genera mensaje cuando se requiere un rol específico.
        """
        if len(required_roles) == 1:
            return _(
                'Se requiere rol %(role)s. Tu rol es %(user_role)s.'
            ) % {'role': required_roles[0], 'user_role': user_role}
        else:
            return _(
                'Se requiere uno de los roles: %(roles)s. Tu rol es %(user_role)s.'
            ) % {'roles': ', '.join(required_roles), 'user_role': user_role}
    
    @staticmethod
    def get_action_denied_message(action: str) -> str:
        """
        Genera mensaje cuando se deniega una acción específica.
        """
        return _('No tiene permisos para %(action)s.') % {'action': action}
    
    @staticmethod
    def get_resource_permission_message(action: str, resource_type: str) -> str:
        """
        Genera mensaje cuando se deniega acceso a un recurso específico.
        """
        return _(
            'No tiene permisos para %(action)s %(resource_type)s.'
        ) % {'action': action, 'resource_type': resource_type}
    
    @staticmethod
    def get_self_only_message(action: str) -> str:
        """
        Genera mensaje cuando solo puede realizar acción sobre sí mismo.
        """
        return _(
            'Solo puede %(action)s su propio perfil.'
        ) % {'action': action}


# Constantes de permisos para uso en todo el sistema
PERMISOS = {
    # Usuarios
    'USUARIO_CREAR': 'crear_usuario',
    'USUARIO_VER': 'ver_usuario',
    'USUARIO_ACTUALIZAR': 'actualizar_usuario',
    'USUARIO_ELIMINAR': 'eliminar_usuario',
    'USUARIO_CAMBIAR_PASSWORD': 'cambiar_password',
    'USUARIO_LISTAR': 'listar_usuarios',
    'USUARIO_ACTUALIZAR_ROL': 'actualizar_rol',
    
    # Inventario
    'INVENTARIO_CREAR': 'crear_producto',
    'INVENTARIO_ACTUALIZAR': 'actualizar_producto',
    'INVENTARIO_ELIMINAR': 'eliminar_producto',
    'INVENTARIO_VER': 'ver_producto',
    'INVENTARIO_LISTAR': 'listar_productos',
    
    # Ventas
    'VENTA_CREAR': 'crear_venta',
    'VENTA_VER': 'ver_venta',
    'VENTA_ACTUALIZAR': 'actualizar_venta',
    'VENTA_ELIMINAR': 'eliminar_venta',
    'VENTA_LISTAR': 'listar_ventas',

    # Clientes
    'CLIENTE_CREAR': 'crear_cliente',
    'CLIENTE_VER': 'ver_cliente',
    'CLIENTE_ACTUALIZAR': 'actualizar_cliente',
    'CLIENTE_ELIMINAR': 'eliminar_cliente',
    'CLIENTE_LISTAR': 'listar_clientes',
    'CLIENTE_VER_INFORMES': 'ver_informe_clientes',

    # Proveedores
    'PROVEEDOR_CREAR': 'crear_proveedor',
    'PROVEEDOR_VER': 'ver_proveedor',
    'PROVEEDOR_ACTUALIZAR': 'actualizar_proveedor',
    'PROVEEDOR_ELIMINAR': 'eliminar_proveedor',
    'PROVEEDOR_LISTAR': 'listar_proveedores',

    # Facturas
    'FACTURA_CREAR': 'crear_factura',
    'FACTURA_VER': 'ver_factura',
    'FACTURA_ANULAR': 'anular_factura',
    'FACTURA_LISTAR': 'listar_facturas',
    
    # Informes
    'INFORME_VER_FINANCIERO': 'ver_informe_financiero',
    'INFORME_VER_VENTAS': 'ver_informe_ventas',
    'INFORME_VER_INVENTARIO': 'ver_informe_inventario',
    
    # Configuración
    'CONFIGURACION_VER': 'ver_configuracion',
    'CONFIGURACION_ACTUALIZAR': 'actualizar_configuracion',
}
