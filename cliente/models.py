from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q, Sum
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
    municipio_codigo = models.CharField(
        _('codigo de municipio'),
        max_length=10,
        blank=True,
        help_text=_('Codigo DIAN/Factus del municipio del cliente.'),
    )
    digito_verificacion = models.CharField(
        _('digito de verificacion'),
        max_length=5,
        blank=True,
        help_text=_('Digito de verificacion para NIT cuando aplique.'),
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
            models.Index(fields=['tipo_documento']),
            models.Index(fields=['nombre']),
            models.Index(fields=['razon_social']),
            models.Index(fields=['tipo_cliente']),
            models.Index(fields=['activo']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['tipo_documento', 'numero_documento'],
                name='cliente_tipo_numero_documento_unique',
            ),
            models.CheckConstraint(
                condition=Q(limite_credito__gte=0),
                name='cliente_limite_credito_gte_0',
            ),
            models.CheckConstraint(
                condition=Q(credito_disponible__gte=0),
                name='cliente_credito_disponible_gte_0',
            ),
            models.CheckConstraint(
                condition=Q(dias_plazo__gte=0),
                name='cliente_dias_plazo_gte_0',
            ),
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

    def _calcular_credito_disponible_actual(self):
        """
        Calcula el credito disponible a partir del saldo pendiente actual.
        """
        saldo_actual = self.calcular_saldo_pendiente()
        return max(self.limite_credito - saldo_actual, Decimal('0.00'))

    def tiene_credito_disponible(self, monto):
        """
        Valida si el cliente puede asumir un nuevo credito.
        """
        monto_decimal = Decimal(str(monto))
        disponible = self._calcular_credito_disponible_actual()
        return disponible >= monto_decimal

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
            tipo_documento=cls.TipoDocumento.CC,
            numero_documento=cls.CONSUMIDOR_FINAL_DOCUMENTO,
            defaults={
                'nombre': 'Consumidor Final',
                'telefono': '0000000000',
                'direccion': 'No especificada',
                'ciudad': 'No especificada',
                'departamento': 'No especificado',
                'municipio_codigo': '11001',
                'tipo_cliente': cls.TipoCliente.NATURAL,
                'regimen_tributario': '',
                'responsable_iva': False,
            },
        )
        return cliente

    def validate_unique(self, exclude=None):
        super().validate_unique(exclude=exclude)

        if not self.tipo_documento or not self.numero_documento:
            return

        queryset = type(self).objects.filter(
            tipo_documento=self.tipo_documento,
            numero_documento=self.numero_documento,
        )

        if self.pk:
            queryset = queryset.exclude(pk=self.pk)

        if queryset.exists():
            raise ValidationError({
                'numero_documento': _(
                    'Ya existe un cliente con este tipo y numero de '
                    'documento.'
                ),
            })

    def clean(self):
        super().clean()

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

        if self.tipo_documento == self.TipoDocumento.NIT:
            dv = (self.digito_verificacion or '').strip()
            if dv and not dv.isdigit():
                raise ValidationError({
                    'digito_verificacion': _(
                        'El digito de verificacion debe ser numerico.'
                    ),
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
        self.credito_disponible = self._calcular_credito_disponible_actual()
        self.full_clean()
        super().save(*args, **kwargs)
