from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Sum
from django.utils.translation import gettext_lazy as _


class Venta(models.Model):
    """
    Modelo que representa una venta registrada en el sistema.
    """

    class Estado(models.TextChoices):
        PENDIENTE = 'PENDIENTE', _('Pendiente')
        TERMINADA = 'TERMINADA', _('Terminada')
        CANCELADA = 'CANCELADA', _('Cancelada')

    class EstadoPago(models.TextChoices):
        PENDIENTE = 'PENDIENTE', _('Pendiente')
        PARCIAL = 'PARCIAL', _('Parcial')
        PAGADA = 'PAGADA', _('Pagada')

    class MetodoPago(models.TextChoices):
        EFECTIVO = 'EFECTIVO', _('Efectivo')
        TARJETA = 'TARJETA', _('Tarjeta')
        TRANSFERENCIA = 'TRANSFERENCIA', _('Transferencia')
        CREDITO = 'CREDITO', _('Credito')

    numero_venta = models.CharField(
        _('numero de venta'),
        max_length=30,
        unique=True,
        blank=True,
        help_text=_('Numero unico de venta generado automaticamente.'),
    )
    cliente = models.ForeignKey(
        'cliente.Cliente',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='ventas',
        verbose_name=_('cliente'),
        help_text=_('Cliente asociado a la venta.'),
    )
    fecha_venta = models.DateTimeField(
        _('fecha de venta'),
        auto_now_add=True,
        help_text=_('Fecha y hora de registro de la venta.'),
    )
    subtotal = models.DecimalField(
        _('subtotal'),
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text=_('Subtotal de la venta antes de impuestos.'),
    )
    descuento = models.DecimalField(
        _('descuento'),
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text=_('Descuento global aplicado a la venta.'),
    )
    impuestos = models.DecimalField(
        _('impuestos'),
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text=_('Valor total de impuestos de la venta.'),
    )
    total = models.DecimalField(
        _('total'),
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text=_('Valor total final de la venta.'),
    )
    estado = models.CharField(
        _('estado'),
        max_length=20,
        choices=Estado.choices,
        default=Estado.PENDIENTE,
        help_text=_('Estado operativo de la venta.'),
    )
    estado_pago = models.CharField(
        _('estado de pago'),
        max_length=20,
        choices=EstadoPago.choices,
        default=EstadoPago.PENDIENTE,
        help_text=_('Estado del pago de la venta.'),
    )
    total_abonado = models.DecimalField(
        _('total abonado'),
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text=_('Valor abonado hasta el momento.'),
    )
    saldo_pendiente = models.DecimalField(
        _('saldo pendiente'),
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text=_('Valor pendiente por pagar.'),
    )
    metodo_pago = models.CharField(
        _('metodo de pago'),
        max_length=20,
        choices=MetodoPago.choices,
        default=MetodoPago.EFECTIVO,
        help_text=_('Metodo de pago principal de la venta.'),
    )
    factura_electronica = models.BooleanField(
        _('factura electronica'),
        default=False,
        help_text=_('Indica si la venta requiere factura electronica.'),
    )
    numero_factura_electronica = models.CharField(
        _('numero de factura electronica'),
        max_length=50,
        blank=True,
        help_text=_('Consecutivo de la factura electronica emitida.'),
    )
    fecha_facturacion = models.DateTimeField(
        _('fecha de facturacion'),
        null=True,
        blank=True,
        help_text=_('Fecha y hora de emision de la factura electronica.'),
    )
    observaciones = models.TextField(
        _('observaciones'),
        blank=True,
        help_text=_('Observaciones adicionales sobre la venta.'),
    )
    usuario_registro = models.ForeignKey(
        'usuario.Usuario',
        on_delete=models.PROTECT,
        related_name='ventas_registradas',
        verbose_name=_('usuario de registro'),
        help_text=_('Usuario que registro la venta.'),
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
        db_table = 'ventas'
        ordering = ['-fecha_venta', '-created_at']
        verbose_name = _('venta')
        verbose_name_plural = _('ventas')
        indexes = [
            models.Index(fields=['numero_venta']),
            models.Index(fields=['fecha_venta']),
            models.Index(fields=['estado']),
            models.Index(fields=['estado_pago']),
            models.Index(fields=['metodo_pago']),
            models.Index(fields=['cliente']),
            models.Index(fields=['usuario_registro']),
        ]

    def __str__(self):
        return f"{self.numero_venta} - {self.get_estado_display()}"

    @classmethod
    def _obtener_siguiente_consecutivo(cls):
        ultima_venta = cls.objects.exclude(
            numero_venta='',
        ).order_by('-id').only('numero_venta').first()

        if not ultima_venta or not ultima_venta.numero_venta:
            return 1

        try:
            return int(ultima_venta.numero_venta.split('-')[-1]) + 1
        except (TypeError, ValueError):
            return cls.objects.count() + 1

    def generar_numero_venta(self):
        """
        Genera el numero consecutivo de venta.
        """
        return f"V-{self._obtener_siguiente_consecutivo():08d}"

    def _obtener_agregados_detalles(self):
        if not hasattr(self, 'detalles'):
            return None

        try:
            return self.detalles.aggregate(
                subtotal=Sum('subtotal'),
                descuento=Sum('descuento'),
                impuestos=Sum('iva'),
            )
        except Exception:
            return None

    def _obtener_total_abonos(self):
        if not hasattr(self, 'abonos'):
            return self.total_abonado

        try:
            total = self.abonos.aggregate(
                total=Sum('monto_abonado'),
            )['total']
            return total or Decimal('0.00')
        except Exception:
            return self.total_abonado

    def calcular_totales(self):
        """
        Calcula subtotal, impuestos y total de la venta.
        """
        agregados = self._obtener_agregados_detalles()
        quantizer = Decimal('0.01')

        if agregados:
            subtotal = agregados['subtotal'] or Decimal('0.00')
            impuestos = agregados['impuestos'] or Decimal('0.00')
            descuento_detalles = agregados['descuento'] or Decimal('0.00')
            descuento_total = descuento_detalles + self.descuento
            total = subtotal + impuestos - descuento_total
        else:
            subtotal = self.subtotal
            impuestos = self.impuestos
            total = subtotal + impuestos - self.descuento

        self.subtotal = subtotal.quantize(quantizer)
        self.impuestos = impuestos.quantize(quantizer)
        self.total = max(total, Decimal('0.00')).quantize(quantizer)
        self.calcular_saldo_pendiente()

        return {
            'subtotal': self.subtotal,
            'impuestos': self.impuestos,
            'descuento': self.descuento,
            'total': self.total,
        }

    def actualizar_estado_pago(self):
        """
        Actualiza el estado de pago segun el total abonado.
        """
        quantizer = Decimal('0.01')
        self.total_abonado = self._obtener_total_abonos().quantize(quantizer)
        saldo = self.calcular_saldo_pendiente()

        if saldo <= Decimal('0.00'):
            self.estado_pago = self.EstadoPago.PAGADA
        elif self.total_abonado > Decimal('0.00'):
            self.estado_pago = self.EstadoPago.PARCIAL
        else:
            self.estado_pago = self.EstadoPago.PENDIENTE

        return self.estado_pago

    def calcular_saldo_pendiente(self):
        """
        Calcula el saldo restante de la venta.
        """
        saldo = self.total - self.total_abonado
        self.saldo_pendiente = max(saldo, Decimal('0.00'))
        return self.saldo_pendiente

    def puede_facturar(self):
        """
        Valida si la venta puede emitir factura electronica.
        """
        return all([
            self.factura_electronica,
            self.estado == self.Estado.TERMINADA,
            self.total > Decimal('0.00'),
            not self.numero_factura_electronica,
        ])

    def preparar_para_guardado(self):
        """
        Aplica reglas previas al guardado del modelo.
        """
        from cliente.models import Cliente

        if not self.numero_venta:
            self.numero_venta = self.generar_numero_venta()

        if self.cliente_id is None:
            self.cliente = Cliente.get_consumidor_final()

        self.calcular_totales()
        self.actualizar_estado_pago()

    def clean(self):
        if self.subtotal < 0:
            raise ValidationError({
                'subtotal': _('El subtotal no puede ser negativo.'),
            })

        if self.descuento < 0:
            raise ValidationError({
                'descuento': _('El descuento no puede ser negativo.'),
            })

        if self.impuestos < 0:
            raise ValidationError({
                'impuestos': _('Los impuestos no pueden ser negativos.'),
            })

        if self.total < 0:
            raise ValidationError({
                'total': _('El total no puede ser negativo.'),
            })

        if self.total_abonado < 0:
            raise ValidationError({
                'total_abonado': _(
                    'El total abonado no puede ser negativo.'
                ),
            })

        if self.total_abonado > self.total:
            raise ValidationError({
                'total_abonado': _(
                    'El total abonado no puede exceder el total de la venta.'
                ),
            })

        if (
            self.numero_factura_electronica
            and not self.factura_electronica
        ):
            raise ValidationError({
                'numero_factura_electronica': _(
                    'No puede asignar numero de factura si la venta no '
                    'requiere factura electronica.'
                ),
            })

        if self.fecha_facturacion and not self.factura_electronica:
            raise ValidationError({
                'fecha_facturacion': _(
                    'No puede registrar fecha de facturacion si la venta no '
                    'requiere factura electronica.'
                ),
            })

    def save(self, *args, **kwargs):
        self.preparar_para_guardado()
        self.full_clean()
        super().save(*args, **kwargs)
