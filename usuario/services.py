from typing import List, Dict, Optional, Any
from django.db import transaction
from django.core.exceptions import ValidationError, PermissionDenied
from django.contrib.auth.hashers import check_password, make_password
from django.utils.translation import gettext_lazy as _

from core.exceptions import (
    UsuarioError,
    UsuarioNoEncontradoError,
    UsuarioDuplicadoError,
    PasswordIncorrectoError,
    PasswordInseguroError,
    PermisoDenegadoError,
    UltimoAdministradorError,
)

from .models import Usuario


class UsuarioService:
    """
    Servicio para gestionar la lógica de negocio de usuarios.
    
    Esta clase encapsula todas las reglas de negocio relacionadas con
    la creación, actualización, eliminación y consulta de usuarios.
    
    Sigue el principio de Single Responsibility (SOLID) separando la
    lógica de negocio de las vistas y serializers.
    
    **Sistema de Permisos:**
    
    El servicio incluye un sistema completo de permisos basado en roles
    (ADMIN/EMPLEADO) que se utiliza en toda la aplicación para controlar
    el acceso a funcionalidades. Los permisos se validan mediante el
    método `validar_permisos()` que implementa las reglas de negocio
    definidas en los requerimientos del sistema.
    
    **Roles y sus capacidades:**
    
    1. **ADMINISTRADOR (ADMIN):**
       - Acceso completo al sistema
       - Gestión completa de usuarios (CRUD)
       - Acceso a informes y estadísticas
       - Configuración del sistema
       - Sin restricciones
    
    2. **EMPLEADO (EMPLEADO):**
       - Creación de ventas
       - Registro de facturas
       - Ingreso de productos
       - Consulta de información básica
       - Sin acceso a informes financieros
       - Solo puede gestionar su propio perfil de usuario
    
    Los permisos se aplican en tres capas:
    1. **Vistas**: Mediante `UsuarioPermission` y decoradores
    2. **Servicios**: Validación en métodos de negocio
    3. **Serializers**: Validación de datos según permisos
    """
    
    @staticmethod
    @transaction.atomic
    def crear_usuario(data: Dict[str, Any], usuario_solicitante: Optional[Usuario] = None) -> Usuario:
        """
        Crea un nuevo usuario aplicando todas las reglas de negocio.
        
        Args:
            data: Diccionario con los datos del usuario a crear
            usuario_solicitante: Usuario que realiza la solicitud (opcional)
            
        Returns:
            Usuario: Instancia del usuario creado
            
        Raises:
            UsuarioDuplicadoError: Si el email o username ya existen
            PermisoDenegadoError: Si se intenta crear admin sin permisos
            PasswordInseguroError: Si la contraseña no es segura
            ValidationError: Si los datos no son válidos
        """
        # Extraer datos críticos
        email = data.get('email')
        username = data.get('username')
        password = data.get('password')
        role = data.get('role', Usuario.Rol.EMPLEADO)
        
        # Validar unicidad de email
        if email and Usuario.objects.filter(email=email).exists():
            raise UsuarioDuplicadoError('email', email)
        
        # Validar unicidad de username
        if username and Usuario.objects.filter(username=username).exists():
            raise UsuarioDuplicadoError('username', username)
        
        # Validar permisos para crear administradores
        if role == Usuario.Rol.ADMIN:
            if usuario_solicitante and not usuario_solicitante.is_admin:
                raise PermisoDenegadoError(_("crear usuarios administradores"))
        
        # Validar seguridad de la contraseña
        if password:
            UsuarioService._validar_seguridad_password(password)
        
        # Crear usuario
        try:
            # Hashear password si se proporciona
            if password:
                data['password'] = make_password(password)
            
            # Eliminar campos que no son del modelo (ej. confirm_password)
            campos_modelo = {field.name for field in Usuario._meta.get_fields()}
            data_filtrada = {k: v for k, v in data.items() if k in campos_modelo}
            
            usuario = Usuario.objects.create(**data_filtrada)
            return usuario
            
        except Exception as e:
            # Relanzar excepciones de Django como ValidationError
            raise ValidationError(_("Error al crear usuario: %(error)s") % {'error': str(e)})
    
    @staticmethod
    def obtener_usuario(user_id: int) -> Usuario:
        """
        Obtiene un usuario por su ID.
        
        Args:
            user_id: ID del usuario a obtener
            
        Returns:
            Usuario: Instancia del usuario
            
        Raises:
            UsuarioNoEncontradoError: Si el usuario no existe
        """
        try:
            return Usuario.objects.get(id=user_id, is_active=True)
        except Usuario.DoesNotExist:
            raise UsuarioNoEncontradoError(user_id)
    
    @staticmethod
    def listar_usuarios(filtros: Optional[Dict[str, Any]] = None) -> List[Usuario]:
        """
        Lista usuarios aplicando filtros opcionales.
        
        Args:
            filtros: Diccionario con filtros a aplicar
            
        Returns:
            List[Usuario]: Lista de usuarios que cumplen los filtros
        """
        queryset = Usuario.objects.filter(is_active=True)
        
        if not filtros:
            return list(queryset.order_by('-date_joined'))
        
        # Aplicar filtros permitidos
        filtros_permitidos = {
            'role': 'role',
            'is_staff': 'is_staff',
            'is_superuser': 'is_superuser',
            'email__icontains': 'email',
            'username__icontains': 'username',
            'first_name__icontains': 'first_name',
            'last_name__icontains': 'last_name',
        }
        
        filtros_aplicados = {}
        for filtro_db, filtro_input in filtros_permitidos.items():
            if filtro_input in filtros:
                valor = filtros[filtro_input]
                # Ignorar valores vacíos o None
                if valor is not None and valor != '':
                    filtros_aplicados[filtro_db] = valor
        
        if filtros_aplicados:
            queryset = queryset.filter(**filtros_aplicados)
        
        # Ordenamiento
        orden = filtros.get('orden', '-date_joined')
        if orden.lstrip('-') in ['username', 'email', 'first_name', 'last_name', 'date_joined', 'role']:
            queryset = queryset.order_by(orden)
        
        return list(queryset)
    
    @staticmethod
    @transaction.atomic
    def actualizar_usuario(user_id: int, data: Dict[str, Any], 
                          usuario_solicitante: Optional[Usuario] = None) -> Usuario:
        """
        Actualiza un usuario existente aplicando reglas de negocio.
        
        Args:
            user_id: ID del usuario a actualizar
            data: Datos a actualizar
            usuario_solicitante: Usuario que realiza la solicitud (opcional)
            
        Returns:
            Usuario: Instancia del usuario actualizado
            
        Raises:
            UsuarioNoEncontradoError: Si el usuario no existe
            UsuarioDuplicadoError: Si se intenta usar email/username duplicado
            PermisoDenegadoError: Si no tiene permisos para la operación
        """
        # Obtener usuario a actualizar
        usuario = UsuarioService.obtener_usuario(user_id)
        
        # Extraer datos críticos
        email = data.get('email')
        username = data.get('username')
        role = data.get('role')
        
        # Validar unicidad de email (excluyendo el usuario actual)
        if email and email != usuario.email:
            if Usuario.objects.filter(email=email).exclude(id=user_id).exists():
                raise UsuarioDuplicadoError('email', email)
        
        # Validar unicidad de username (excluyendo el usuario actual)
        if username and username != usuario.username:
            if Usuario.objects.filter(username=username).exclude(id=user_id).exists():
                raise UsuarioDuplicadoError('username', username)
        
        # Validar permisos para cambiar rol a ADMIN
        if role and role == Usuario.Rol.ADMIN and usuario.role != Usuario.Rol.ADMIN:
            if usuario_solicitante and not usuario_solicitante.is_admin:
                raise PermisoDenegadoError(_("asignar rol de administrador"))
        
        # Validar permisos para desactivar administradores
        if 'is_active' in data and data['is_active'] is False and usuario.is_admin:
            if usuario_solicitante and not usuario_solicitante.is_admin:
                raise PermisoDenegadoError(_("desactivar administradores"))
        
        # Actualizar campos
        for campo, valor in data.items():
            if hasattr(usuario, campo):
                setattr(usuario, campo, valor)
        
        # Guardar cambios
        usuario.save()
        return usuario
    
    @staticmethod
    @transaction.atomic
    def eliminar_usuario(user_id: int, usuario_solicitante: Optional[Usuario] = None) -> None:
        """
        Elimina un usuario (soft delete) aplicando reglas de negocio.
        
        Args:
            user_id: ID del usuario a eliminar
            usuario_solicitante: Usuario que realiza la solicitud (opcional)
            
        Raises:
            UsuarioNoEncontradoError: Si el usuario no existe
            UltimoAdministradorError: Si se intenta eliminar el último admin
            PermisoDenegadoError: Si no tiene permisos para eliminar
        """
        usuario = UsuarioService.obtener_usuario(user_id)
        
        # Validar que no sea el último administrador
        if usuario.is_admin:
            administradores_activos = Usuario.objects.filter(
                role=Usuario.Rol.ADMIN,
                is_active=True
            ).count()
            
            if administradores_activos <= 1:
                raise UltimoAdministradorError()
        
        # Validar permisos para eliminar administradores
        if usuario.is_admin:
            if usuario_solicitante and not usuario_solicitante.is_admin:
                raise PermisoDenegadoError(_("eliminar administradores"))
        
        # Soft delete: marcar como inactivo
        usuario.is_active = False
        usuario.save()
    
    @staticmethod
    @transaction.atomic
    def cambiar_password(user_id: int, old_password: str, new_password: str) -> None:
        """
        Cambia la contraseña de un usuario.
        
        Args:
            user_id: ID del usuario
            old_password: Contraseña actual
            new_password: Nueva contraseña
            
        Raises:
            UsuarioNoEncontradoError: Si el usuario no existe
            PasswordIncorrectoError: Si la contraseña actual es incorrecta
            PasswordInseguroError: Si la nueva contraseña no es segura
        """
        usuario = UsuarioService.obtener_usuario(user_id)
        
        # Verificar contraseña actual
        if not check_password(old_password, usuario.password):
            raise PasswordIncorrectoError()
        
        # Validar seguridad de la nueva contraseña
        UsuarioService._validar_seguridad_password(new_password)
        
        # Cambiar contraseña
        usuario.password = make_password(new_password)
        usuario.save()
    
    @staticmethod
    def validar_permisos(usuario: Usuario, accion: str, recurso: Optional[Any] = None) -> bool:
        """
        Valida si un usuario tiene permisos para realizar una acción.
        
        Este es el corazón del sistema de permisos basado en roles. Implementa
        la lógica de negocio para determinar qué acciones puede realizar cada
        tipo de usuario (ADMIN o EMPLEADO).
        
        **Reglas de permisos:**
        
        1. **Administradores (ADMIN):**
           - Acceso completo a todas las funcionalidades
           - Pueden gestionar cualquier usuario
           - Pueden acceder a informes y configuración
        
        2. **Empleados (EMPLEADO):**
           - NO pueden: crear usuarios, eliminar usuarios, actualizar roles
           - PUEDEN: ver y actualizar su propio perfil
           - PUEDEN: cambiar su propia contraseña
           - Acceso limitado a otras funcionalidades (definidas por cada módulo)
        
        **Acciones definidas:**
        - 'crear_usuario': Crear nuevos usuarios
        - 'ver_usuario': Ver información de usuario
        - 'actualizar_usuario': Actualizar información de usuario
        - 'eliminar_usuario': Eliminar usuario (soft delete)
        - 'cambiar_password': Cambiar contraseña de usuario
        - 'listar_usuarios': Listar todos los usuarios
        - 'actualizar_rol': Cambiar rol de un usuario
        
        Args:
            usuario: Usuario a validar (debe ser instancia de Usuario)
            accion: Acción a realizar (ver lista arriba)
            recurso: Recurso sobre el que se realiza la acción (opcional, ej: objeto Usuario)
            
        Returns:
            bool: True si tiene permisos, False en caso contrario
            
        Raises:
            ValueError: Si el usuario no es una instancia válida de Usuario
            
        Ejemplo:
            >>> usuario_admin = Usuario.objects.get(role='ADMIN')
            >>> UsuarioService.validar_permisos(usuario_admin, 'crear_usuario')
            True
            
            >>> usuario_empleado = Usuario.objects.get(role='EMPLEADO')
            >>> UsuarioService.validar_permisos(usuario_empleado, 'crear_usuario')
            False
        """
        # Administradores tienen acceso completo
        if usuario.is_admin:
            return True
        
        # Empleados tienen permisos limitados
        if usuario.is_empleado:
            acciones_operativas = {
                'crear_venta',
                'ver_venta',
                'actualizar_venta',
                'listar_ventas',
                'registrar_abono',
                'ver_abono',
                'listar_abonos',
                'ver_informe_ventas',
            }

            if accion in acciones_operativas:
                return True

            # Empleados no pueden gestionar usuarios (excepto su propio perfil)
            if accion in ['crear_usuario', 'eliminar_usuario', 'actualizar_rol']:
                return False
            
            # Empleados pueden ver y actualizar su propio perfil
            if accion in ['ver_usuario', 'actualizar_usuario']:
                if recurso and hasattr(recurso, 'id'):
                    return recurso.id == usuario.id
            
            # Empleados pueden cambiar su propia contraseña
            if accion == 'cambiar_password':
                if recurso and hasattr(recurso, 'id'):
                    return recurso.id == usuario.id
        
        return False
    
    @staticmethod
    def _validar_seguridad_password(password: str) -> None:
        """
        Valida que una contraseña cumpla con los requisitos de seguridad.
        
        Args:
            password: Contraseña a validar
            
        Raises:
            PasswordInseguroError: Si la contraseña no es segura
        """
        if len(password) < 8:
            raise PasswordInseguroError(
                _("debe tener al menos 8 caracteres")
            )
        
        if len(password) > 128:
            raise PasswordInseguroError(
                _("no puede exceder 128 caracteres")
            )
        
        # Verificar complejidad básica
        tiene_minuscula = any(c.islower() for c in password)
        tiene_mayuscula = any(c.isupper() for c in password)
        tiene_digito = any(c.isdigit() for c in password)
        
        if not (tiene_minuscula and tiene_mayuscula and tiene_digito):
            raise PasswordInseguroError(
                _("debe contener letras minúsculas, mayúsculas y números")
            )
        
        # Verificar contraseñas comunes (lista básica)
        contraseñas_comunes = [
            'password', '12345678', 'qwerty', 'admin', 'letmein',
            'welcome', 'monkey', 'sunshine', 'password1', '123456789'
        ]
        
        if password.lower() in contraseñas_comunes:
            raise PasswordInseguroError(
                _("es demasiado común, elija una contraseña más segura")
            )
