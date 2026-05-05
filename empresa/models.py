from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _


class Empresa(models.Model):
    """
    Raiz fiscal y operativa de un tenant en Mallor.
    """

    class AmbienteFacturacion(models.TextChoices):
        SANDBOX = 'SANDBOX', _('Sandbox')
        PRODUCCION = 'PRODUCCION', _('Produccion')

    nit = models.CharField(
        _('NIT'),
        max_length=20,
        unique=True,
        help_text=_('NIT del facturador electronico.'),
    )
    digito_verificacion = models.CharField(
        _('digito de verificacion'),
        max_length=5,
        blank=True,
    )
    razon_social = models.CharField(_('razon social'), max_length=200)
    nombre_comercial = models.CharField(
        _('nombre comercial'),
        max_length=200,
        blank=True,
    )
    email = models.EmailField(_('correo electronico'), blank=True)
    telefono = models.CharField(_('telefono'), max_length=30, blank=True)
    direccion = models.TextField(_('direccion'), blank=True)
    municipio_codigo = models.CharField(
        _('codigo de municipio'),
        max_length=10,
        blank=True,
    )
    ambiente_facturacion = models.CharField(
        _('ambiente de facturacion'),
        max_length=20,
        choices=AmbienteFacturacion.choices,
        default=AmbienteFacturacion.SANDBOX,
    )
    activo = models.BooleanField(_('activo'), default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'empresas'
        ordering = ['razon_social']
        verbose_name = _('empresa')
        verbose_name_plural = _('empresas')
        indexes = [
            models.Index(fields=['nit']),
            models.Index(fields=['activo']),
            models.Index(fields=['ambiente_facturacion']),
        ]

    def __str__(self):
        return f'{self.razon_social} ({self.nit})'

    @classmethod
    def get_default(cls):
        empresa, _ = cls.objects.get_or_create(
            nit='000000000',
            defaults={
                'razon_social': 'Empresa Principal',
                'nombre_comercial': 'Empresa Principal',
                'ambiente_facturacion': cls.AmbienteFacturacion.SANDBOX,
            },
        )
        return empresa


class EmpresaUsuario(models.Model):
    """
    Membresia y rol operativo de un usuario dentro de una empresa.
    """

    class Rol(models.TextChoices):
        PROPIETARIO = 'PROPIETARIO', _('Propietario')
        ADMIN = 'ADMIN', _('Administrador')
        EMPLEADO = 'EMPLEADO', _('Empleado')

    empresa = models.ForeignKey(
        Empresa,
        on_delete=models.CASCADE,
        related_name='usuarios',
    )
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='empresas_usuario',
    )
    rol = models.CharField(
        _('rol'),
        max_length=20,
        choices=Rol.choices,
        default=Rol.EMPLEADO,
    )
    activo = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'empresas_usuarios'
        verbose_name = _('usuario de empresa')
        verbose_name_plural = _('usuarios de empresa')
        constraints = [
            models.UniqueConstraint(
                fields=['empresa', 'usuario'],
                name='empresa_usuario_unique',
            ),
        ]
        indexes = [
            models.Index(fields=['empresa', 'usuario']),
            models.Index(fields=['usuario', 'activo']),
            models.Index(fields=['rol']),
        ]

    def __str__(self):
        return f'{self.usuario} - {self.empresa} ({self.rol})'

