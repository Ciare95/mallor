from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Sum
from django.utils.translation import gettext_lazy as _


class Cliente(models.Model):
    """
    Modelo que representa un cliente del sistema.

    Permite gestionar clientes naturales y juridicos, incluyendo
    informacion comercial y datos basicos para cartera.
    """

    CONSUMIDOR_FINAL_DOCUMENTO = '222222222222'

    class TipoDocumento(models.TextChoices):
        CC = 'CC', _('Cedula de Ciudadania')
        NIT = 'NIT', _('NIT')
        CE = 'CE', _('Cedula de Extranjeria')
        PASAPORTE = 'PASAPORTE', _('Pasaporte')

    class TipoCliente(models.TextChoices):
        NATURAL = 'NATURAL', _('Natural')
        JURIDICO = 'JURIDICO', _('Juridico')

    class RegimenTributario(models.TextChoices):
        SIMPLIFICADO = 'SIMPLIFICADO', _('Simplificado')
        COMUN = 'COMUN', _('Comun')

    tipo_documento = models.CharField(
        _('tipo de documento'),
        max_length=10,
        choices=TipoDocumento.choices,
        default=TipoDocumento.CC,
        help_text=_('Tipo de documento del cliente.'),
    )
    numero_documento = models.CharField(
        _('numero de documento'),
        max_length=20,
        unique=True,
        help_text=_('Numero unico de identificacion del cliente.'),
    )
    nombre = models.CharField(
        _('nombre'),
        max_length=200,
        blank=True,
        help_text=_('Nombre del cliente cuando es persona natural.'),
    )
    razon_social = models.CharField(
        _('razon social'),
        max_length=200,
        blank=True,
        help_text=_('Razon social del cliente cuando es persona juridica.'),
    )
    nombre_comercial = models.CharField(
        _('nombre comercial'),
        max_length=200,
        blank=True,
        help_text=_('Nombre comercial del cliente.'),
    )
    email = models.EmailField(
        _('correo electronico'),
        blank=True,
        help_text=_('Correo electronico del cliente.'),
    )
    telefono = models.CharField(
        _('telefono'),
        max_length=20,
        help_text=_('Telefono principal del cliente.'),
    )
    celular = models.CharField(
        _('celular'),
        max_length=20,
        blank=True,
        help_text=_('Numero de celular del cliente.'),
    )
    direccion = models.TextField(
        _('direccion'),
        help_text=_('Direccion principal del cliente.'),
    )
    ciudad = models.CharField(
        _('ciudad'),
        max_length=100,
        help_text=_('Ciudad del cliente.'),
    )
    departamento = models.CharField(
        _('departamento'),
        max_length=100,
        help_text=_('Departamento del cliente.'),
    )
    codigo_postal = models.CharField(
        _('codigo postal'),
        max_length=20,
        blank=True,
        help_text=_('Codigo postal del cliente.'),
    )
    tipo_cliente = models.CharField(
        _('tipo de cliente'),
        max_length=10,
        choices=TipoCliente.choices,
        default=TipoCliente.NATURAL,
        help_text=_('Define si el cliente es natural o juridico.'),
    )
    regimen_tributario = models.CharField(
        _('regimen tributario'),
        max_length=20,
        choices=RegimenTributario.choices,
        blank=True,
        help_text=_('Regimen tributario del cliente.'),
    )
    responsable_iva = models.BooleanField(
        _('responsable de IVA'),
        default=False,
        help_text=_('Indica si el cliente es responsable de IVA.'),
    )
    credito_disponible = models.DecimalField(
        _('credito disponible'),
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text=_('Credito disponible para ventas a credito.'),
    )
    limite_credito = models.DecimalField(
        _('limite de credito'),
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text=_('Limite maximo de credito permitido.'),
    )
    dias_plazo = models.IntegerField(
        _('dias de plazo'),
        default=0,
        help_text=_('Dias maximos para pago a credito.'),
    )
    observaciones = models.TextField(
        _('observaciones'),
        blank=True,
        help_text=_('Observaciones adicionales del cliente.'),
    )
    activo = models.BooleanField(
        _('activo'),
        default=True,
        help_text=_('Indica si el cliente esta activo.'),
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
        db_table = 'clientes'
        ordering = ['nombre', 'razon_social']
        verbose_name = _('cliente')
        verbose_name_plural = _('clientes')
        indexes = [
            models.Index(fields=['numero_documento']),
            models.Index(fields=['nombre']),
            models.Index(fields=['razon_social']),
            models.Index(fields=['tipo_cliente']),
            models.Index(fields=['activo']),
        ]

    def __str__(self):
        return f"{self.get_nombre_completo()} ({self.numero_documento})"

    def get_nombre_completo(self):
        """
        Retorna el nombre visible del cliente.
        """
        if self.tipo_cliente == self.TipoCliente.JURIDICO and self.razon_social:
            return self.razon_social
        return self.nombre or self.nombre_comercial or self.razon_social

    def calcular_saldo_pendiente(self):
        """
        Suma los saldos pendientes de las ventas asociadas.
        """
        if not self.pk:
            return Decimal('0.00')

        total = self.ventas.exclude(
            estado='CANCELADA',
        ).aggregate(
            total=Sum('saldo_pendiente'),
        )['total']
        return total or Decimal('0.00')

    def tiene_credito_disponible(self, monto):
        """
        Valida si el cliente puede asumir un nuevo credito.
        """
        monto_decimal = Decimal(str(monto))
        saldo_actual = self.calcular_saldo_pendiente()
        disponible = self.limite_credito - saldo_actual
        self.credito_disponible = max(disponible, Decimal('0.00'))
        return self.credito_disponible >= monto_decimal

    def calcular_total_compras(self):
        """
        Calcula el total historico de compras del cliente.
        """
        if not self.pk:
            return Decimal('0.00')

        total = self.ventas.exclude(
            estado='CANCELADA',
        ).aggregate(
            total=Sum('total'),
        )['total']
        return total or Decimal('0.00')

    @classmethod
    def get_consumidor_final(cls):
        """
        Obtiene o crea el cliente por defecto Consumidor Final.
        """
        cliente, _ = cls.objects.get_or_create(
            numero_documento=cls.CONSUMIDOR_FINAL_DOCUMENTO,
            defaults={
                'tipo_documento': cls.TipoDocumento.CC,
                'nombre': 'Consumidor Final',
                'telefono': '0000000000',
                'direccion': 'No especificada',
                'ciudad': 'No especificada',
                'departamento': 'No especificado',
                'tipo_cliente': cls.TipoCliente.NATURAL,
                'regimen_tributario': '',
                'responsable_iva': False,
            },
        )
        return cliente

    def clean(self):
        if self.limite_credito < 0:
            raise ValidationError({
                'limite_credito': _(
                    'El limite de credito no puede ser negativo.'
                ),
            })

        if self.credito_disponible < 0:
            raise ValidationError({
                'credito_disponible': _(
                    'El credito disponible no puede ser negativo.'
                ),
            })

        if self.dias_plazo < 0:
            raise ValidationError({
                'dias_plazo': _(
                    'Los dias de plazo no pueden ser negativos.'
                ),
            })

        if not self.telefono.strip():
            raise ValidationError({
                'telefono': _('El telefono es obligatorio.'),
            })

        if not self.direccion.strip():
            raise ValidationError({
                'direccion': _('La direccion es obligatoria.'),
            })

        if not self.ciudad.strip():
            raise ValidationError({
                'ciudad': _('La ciudad es obligatoria.'),
            })

        if not self.departamento.strip():
            raise ValidationError({
                'departamento': _('El departamento es obligatorio.'),
            })

        if (
            self.tipo_cliente == self.TipoCliente.NATURAL
            and not self.nombre.strip()
        ):
            raise ValidationError({
                'nombre': _(
                    'El nombre es obligatorio para clientes naturales.'
                ),
            })

        if (
            self.tipo_cliente == self.TipoCliente.JURIDICO
            and not self.razon_social.strip()
        ):
            raise ValidationError({
                'razon_social': _(
                    'La razon social es obligatoria para clientes juridicos.'
                ),
            })

    def save(self, *args, **kwargs):
        saldo_actual = self.calcular_saldo_pendiente()
        self.credito_disponible = max(
            self.limite_credito - saldo_actual,
            Decimal('0.00'),
        )
        self.full_clean()
        super().save(*args, **kwargs)
