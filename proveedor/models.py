from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Sum
from django.utils.translation import gettext_lazy as _


class Proveedor(models.Model):
    """
    Modelo que representa un proveedor del sistema.

    Centraliza la informacion comercial y de contacto usada
    para registrar compras y analizar la relacion de suministro.
    """

    class TipoDocumento(models.TextChoices):
        NIT = 'NIT', _('NIT')
        CC = 'CC', _('Cedula de Ciudadania')
        CE = 'CE', _('Cedula de Extranjeria')

    class FormaPago(models.TextChoices):
        CONTADO = 'CONTADO', _('Contado')
        CREDITO_15 = 'CREDITO_15', _('Credito 15 dias')
        CREDITO_30 = 'CREDITO_30', _('Credito 30 dias')
        CREDITO_60 = 'CREDITO_60', _('Credito 60 dias')

    tipo_documento = models.CharField(
        _('tipo de documento'),
        max_length=3,
        choices=TipoDocumento.choices,
        default=TipoDocumento.NIT,
        help_text=_('Tipo de documento del proveedor.'),
    )
    numero_documento = models.CharField(
        _('numero de documento'),
        max_length=20,
        unique=True,
        help_text=_('Numero unico de identificacion del proveedor.'),
    )
    razon_social = models.CharField(
        _('razon social'),
        max_length=200,
        help_text=_('Nombre legal o razon social del proveedor.'),
    )
    nombre_comercial = models.CharField(
        _('nombre comercial'),
        max_length=200,
        blank=True,
        help_text=_('Nombre comercial o marca del proveedor.'),
    )
    nombre_contacto = models.CharField(
        _('nombre de contacto'),
        max_length=100,
        help_text=_('Nombre de la persona de contacto.'),
    )
    email = models.EmailField(
        _('correo electronico'),
        help_text=_('Correo electronico principal del proveedor.'),
    )
    telefono = models.CharField(
        _('telefono'),
        max_length=20,
        help_text=_('Telefono principal del proveedor.'),
    )
    celular = models.CharField(
        _('celular'),
        max_length=20,
        blank=True,
        help_text=_('Numero de celular del proveedor.'),
    )
    direccion = models.TextField(
        _('direccion'),
        help_text=_('Direccion principal del proveedor.'),
    )
    ciudad = models.CharField(
        _('ciudad'),
        max_length=100,
        help_text=_('Ciudad del proveedor.'),
    )
    departamento = models.CharField(
        _('departamento'),
        max_length=100,
        help_text=_('Departamento del proveedor.'),
    )
    tipo_productos = models.TextField(
        _('tipo de productos'),
        help_text=_('Descripcion de los productos que suministra.'),
    )
    forma_pago = models.CharField(
        _('forma de pago'),
        max_length=15,
        choices=FormaPago.choices,
        default=FormaPago.CONTADO,
        help_text=_('Condicion de pago acordada con el proveedor.'),
    )
    cuenta_bancaria = models.CharField(
        _('cuenta bancaria'),
        max_length=50,
        blank=True,
        help_text=_('Numero de cuenta bancaria del proveedor.'),
    )
    banco = models.CharField(
        _('banco'),
        max_length=100,
        blank=True,
        help_text=_('Banco asociado a la cuenta registrada.'),
    )
    observaciones = models.TextField(
        _('observaciones'),
        blank=True,
        help_text=_('Observaciones adicionales del proveedor.'),
    )
    activo = models.BooleanField(
        _('activo'),
        default=True,
        help_text=_('Indica si el proveedor esta activo.'),
    )
    created_at = models.DateTimeField(
        _('fecha de creacion'),
        auto_now_add=True,
        help_text=_('Fecha y hora de creacion del registro.'),
    )
    updated_at = models.DateTimeField(
        _('fecha de actualizacion'),
        auto_now=True,
        help_text=_('Fecha y hora de la ultima actualizacion.'),
    )

    class Meta:
        db_table = 'proveedores'
        ordering = ['razon_social', 'nombre_comercial']
        verbose_name = _('proveedor')
        verbose_name_plural = _('proveedores')
        indexes = [
            models.Index(fields=['numero_documento']),
            models.Index(fields=['tipo_documento']),
            models.Index(fields=['razon_social']),
            models.Index(fields=['ciudad']),
            models.Index(fields=['forma_pago']),
            models.Index(fields=['activo']),
        ]

    def __str__(self):
        return f"{self.razon_social} ({self.numero_documento})"

    @property
    def nombre_completo(self):
        """
        Retorna el nombre visible del proveedor.
        """
        return self.nombre_comercial or self.razon_social

    def calcular_total_compras(self):
        """
        Calcula el total historico de compras procesadas.
        """
        from inventario.models import FacturaCompra

        if not self.pk:
            return Decimal('0.00')

        total = FacturaCompra.objects.filter(
            proveedor=self,
            estado=FacturaCompra.ESTADO_PROCESADA,
        ).aggregate(
            total=Sum('total'),
        )['total']

        return total or Decimal('0.00')

    def obtener_ultima_compra(self):
        """
        Retorna la fecha de la ultima compra procesada.
        """
        from inventario.models import FacturaCompra

        if not self.pk:
            return None

        ultima_factura = FacturaCompra.objects.filter(
            proveedor=self,
            estado=FacturaCompra.ESTADO_PROCESADA,
        ).order_by('-fecha_factura').only('fecha_factura').first()

        if ultima_factura is None:
            return None

        return ultima_factura.fecha_factura

    def clean(self):
        super().clean()
        self._normalizar_campos_texto()
        self._validar_campos_obligatorios()

    def _normalizar_campos_texto(self):
        campos = [
            'numero_documento',
            'razon_social',
            'nombre_comercial',
            'nombre_contacto',
            'telefono',
            'celular',
            'direccion',
            'ciudad',
            'departamento',
            'tipo_productos',
            'cuenta_bancaria',
            'banco',
            'observaciones',
        ]

        for campo in campos:
            valor = getattr(self, campo, None)
            if isinstance(valor, str):
                setattr(self, campo, valor.strip())

    def _validar_campos_obligatorios(self):
        errores = {}

        campos_requeridos = {
            'numero_documento': _('El numero de documento es obligatorio.'),
            'razon_social': _('La razon social es obligatoria.'),
            'nombre_contacto': _('El nombre de contacto es obligatorio.'),
            'telefono': _('El telefono es obligatorio.'),
            'direccion': _('La direccion es obligatoria.'),
            'ciudad': _('La ciudad es obligatoria.'),
            'departamento': _('El departamento es obligatorio.'),
            'tipo_productos': _('El tipo de productos es obligatorio.'),
        }

        for campo, mensaje in campos_requeridos.items():
            valor = getattr(self, campo, '')
            if not valor:
                errores[campo] = mensaje

        if errores:
            raise ValidationError(errores)

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)
