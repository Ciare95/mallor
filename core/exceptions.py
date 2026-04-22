from django.utils.translation import gettext_lazy as _


class MallorError(Exception):
    """
    Excepción base para todos los errores de dominio en el sistema Mallor.
    
    Attributes:
        message (str): Mensaje descriptivo del error
        code (str): Código único del error para identificación
    """
    
    def __init__(self, message: str, code: str = "error_general"):
        self.message = message
        self.code = code
        super().__init__(message)


class UsuarioError(MallorError):
    """
    Excepción base para errores de dominio en el módulo de usuarios.
    
    Attributes:
        message (str): Mensaje descriptivo del error
        code (str): Código único del error para identificación
    """
    
    def __init__(self, message: str, code: str = "usuario_error"):
        super().__init__(message, code)


class UsuarioNoEncontradoError(UsuarioError):
    """Excepción cuando un usuario no existe."""
    
    def __init__(self, user_id: int):
        super().__init__(
            message=_("Usuario con ID %(id)s no encontrado.") % {'id': user_id},
            code="usuario_no_encontrado"
        )


class UsuarioDuplicadoError(UsuarioError):
    """Excepción cuando se intenta crear un usuario con datos duplicados."""
    
    def __init__(self, campo: str, valor: str):
        super().__init__(
            message=_("%(campo)s '%(valor)s' ya está en uso.") % {
                'campo': campo,
                'valor': valor
            },
            code="usuario_duplicado"
        )


class PasswordIncorrectoError(UsuarioError):
    """Excepción cuando la contraseña actual es incorrecta."""
    
    def __init__(self):
        super().__init__(
            message=_("La contraseña actual es incorrecta."),
            code="password_incorrecto"
        )


class PasswordInseguroError(UsuarioError):
    """Excepción cuando la contraseña no cumple requisitos de seguridad."""
    
    def __init__(self, motivo: str):
        super().__init__(
            message=_("La contraseña no es segura: %(motivo)s") % {'motivo': motivo},
            code="password_inseguro"
        )


class PermisoDenegadoError(UsuarioError):
    """Excepción cuando el usuario no tiene permisos para realizar una acción."""
    
    def __init__(self, accion: str):
        super().__init__(
            message=_("No tiene permisos para %(accion)s.") % {'accion': accion},
            code="permiso_denegado"
        )


class UltimoAdministradorError(UsuarioError):
    """Excepción cuando se intenta eliminar el último administrador."""
    
    def __init__(self):
        super().__init__(
            message=_("No se puede eliminar el último administrador del sistema."),
            code="ultimo_administrador"
        )