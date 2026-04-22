from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils.translation import gettext_lazy as _


class Usuario(AbstractUser):
    """
    Modelo de usuario personalizado para el sistema Mallor.
    
    Extiende AbstractUser de Django agregando campos específicos
    para roles de negocio (Administrador/Empleado) y campos de auditoría.
    """
    
    class Rol(models.TextChoices):
        ADMIN = 'ADMIN', _('Administrador')
        EMPLEADO = 'EMPLEADO', _('Empleado')
    
    # Sobrescribir campo email para hacerlo único
    email = models.EmailField(
        _('email address'),
        unique=True,
        blank=False,
        help_text=_('Dirección de correo electrónico única para cada usuario')
    )
    
    role = models.CharField(
        _('rol'),
        max_length=20,
        choices=Rol.choices,
        default=Rol.EMPLEADO,
        help_text=_('Rol del usuario en el sistema')
    )
    
    phone = models.CharField(
        _('teléfono'),
        max_length=20,
        blank=True,
        null=True,
        help_text=_('Número de teléfono de contacto')
    )
    
    created_at = models.DateTimeField(
        _('fecha de creación'),
        auto_now_add=True,
        help_text=_('Fecha y hora de creación del registro')
    )
    
    updated_at = models.DateTimeField(
        _('fecha de actualización'),
        auto_now=True,
        help_text=_('Fecha y hora de la última actualización')
    )
    
    class Meta:
        db_table = 'usuarios'
        ordering = ['-date_joined']
        verbose_name = _('usuario')
        verbose_name_plural = _('usuarios')
        indexes = [
            models.Index(fields=['email']),
            models.Index(fields=['username']),
            models.Index(fields=['role']),
            models.Index(fields=['is_active']),
        ]
    
    def __str__(self):
        return f"{self.get_full_name()} ({self.username})"
    
    def get_full_name(self):
        """
        Retorna el nombre completo del usuario.
        
        Returns:
            str: Nombre completo o username si no tiene nombre/apellido
        """
        full_name = f"{self.first_name} {self.last_name}".strip()
        return full_name if full_name else self.username
    
    @property
    def is_admin(self):
        """
        Verifica si el usuario tiene rol de administrador.
        
        Returns:
            bool: True si es administrador, False en caso contrario
        """
        return self.role == self.Rol.ADMIN
    
    @property
    def is_empleado(self):
        """
        Verifica si el usuario tiene rol de empleado.
        
        Returns:
            bool: True si es empleado, False en caso contrario
        """
        return self.role == self.Rol.EMPLEADO
