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

    empresa = models.ForeignKey(
        'empresa.Empresa',
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='ventas',
        verbose_name=_('empresa'),
    )
    numero_venta = models.CharField(
        _('numero de venta'),
        max_length=30,
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
            models.Index(fields=['empresa']),
            models.Index(fields=['numero_venta']),
            models.Index(fields=['fecha_venta']),
            models.Index(fields=['estado']),
            models.Index(fields=['estado_pago']),
            models.Index(fields=['metodo_pago']),
            models.Index(fields=['cliente']),
            models.Index(fields=['usuario_registro']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['empresa', 'numero_venta'],
                name='venta_empresa_numero_unique',
            ),
        ]

    def __str__(self):
        return f"{self.numero_venta} - {self.get_estado_display()}"

    @classmethod
    def _obtener_siguiente_consecutivo(cls, empresa=None):
        queryset = cls.objects.exclude(
            numero_venta='',
        )
        if empresa is not None:
            queryset = queryset.filter(empresa=empresa)
        ultima_venta = queryset.order_by('-id').only('numero_venta').first()

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
        return f"V-{self._obtener_siguiente_consecutivo(self.empresa):08d}"

    def _obtener_agregados_detalles(self):
        if not hasattr(self, 'detalles'):
            return None

        try:
            if not self.pk or not self.detalles.exists():
                return None

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

        if self.empresa_id is None:
            from empresa.context import get_empresa_actual_or_default

            self.empresa = get_empresa_actual_or_default()

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


class DetalleVenta(models.Model):
    """
    Modelo que representa un producto incluido en una venta.
    """

    venta = models.ForeignKey(
        Venta,
        on_delete=models.CASCADE,
        related_name='detalles',
        verbose_name=_('venta'),
        help_text=_('Venta a la que pertenece este detalle.'),
    )
    producto = models.ForeignKey(
        'inventario.Producto',
        on_delete=models.PROTECT,
        related_name='detalles_venta',
        verbose_name=_('producto'),
        help_text=_('Producto vendido.'),
    )
    cantidad = models.DecimalField(
        _('cantidad'),
        max_digits=10,
        decimal_places=2,
        help_text=_('Cantidad vendida del producto.'),
    )
    precio_unitario = models.DecimalField(
        _('precio unitario'),
        max_digits=12,
        decimal_places=2,
        help_text=_('Precio del producto al momento de la venta.'),
    )
    subtotal = models.DecimalField(
        _('subtotal'),
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text=_('Subtotal del detalle sin descuentos.'),
    )
    descuento = models.DecimalField(
        _('descuento'),
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text=_('Descuento aplicado al detalle.'),
    )
    iva = models.DecimalField(
        _('IVA'),
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text=_('Valor del IVA aplicado al detalle.'),
    )
    total = models.DecimalField(
        _('total'),
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text=_('Total final del detalle.'),
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
        db_table = 'detalles_venta'
        ordering = ['venta', 'producto']
        verbose_name = _('detalle de venta')
        verbose_name_plural = _('detalles de venta')
        indexes = [
            models.Index(fields=['venta']),
            models.Index(fields=['producto']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return (
            f"{self.venta.numero_venta} - {self.producto.nombre} x "
            f"{self.cantidad}"
        )

    def calcular_subtotal(self):
        """
        Calcula el subtotal del detalle.
        """
        quantizer = Decimal('0.01')
        self.subtotal = (
            self.cantidad * self.precio_unitario
        ).quantize(quantizer)
        return self.subtotal

    def calcular_total(self):
        """
        Calcula el total del detalle con IVA y descuento.
        """
        quantizer = Decimal('0.01')
        subtotal = self.calcular_subtotal()
        iva_porcentaje = self.producto.iva if self.producto_id else Decimal('0.00')
        self.iva = (
            subtotal * (iva_porcentaje / Decimal('100'))
        ).quantize(quantizer)
        self.total = (
            subtotal + self.iva - self.descuento
        ).quantize(quantizer)
        return self.total

    def clean(self):
        if self.cantidad <= 0:
            raise ValidationError({
                'cantidad': _('La cantidad debe ser mayor que cero.'),
            })

        if self.precio_unitario <= 0:
            raise ValidationError({
                'precio_unitario': _(
                    'El precio unitario debe ser mayor que cero.'
                ),
            })

        if self.descuento < 0:
            raise ValidationError({
                'descuento': _('El descuento no puede ser negativo.'),
            })

        subtotal = self.cantidad * self.precio_unitario
        if self.descuento > subtotal:
            raise ValidationError({
                'descuento': _(
                    'El descuento no puede exceder el subtotal del detalle.'
                ),
            })

        if not self.producto_id:
            return

        cantidad_requerida = self.cantidad
        if self.pk:
            detalle_anterior = DetalleVenta.objects.get(pk=self.pk)
            if detalle_anterior.producto_id == self.producto_id:
                cantidad_requerida = self.cantidad - detalle_anterior.cantidad

        if (
            cantidad_requerida > 0
            and not self.producto.validar_stock(cantidad_requerida)
        ):
            raise ValidationError({
                'cantidad': _(
                    'No hay suficiente stock disponible para el producto.'
                ),
            })

    def save(self, *args, **kwargs):
        self.calcular_total()
        self.full_clean()
        super().save(*args, **kwargs)


class Abono(models.Model):
    """
    Modelo que representa un pago parcial aplicado a una venta.
    """

    class MetodoPago(models.TextChoices):
        EFECTIVO = 'EFECTIVO', _('Efectivo')
        TARJETA = 'TARJETA', _('Tarjeta')
        TRANSFERENCIA = 'TRANSFERENCIA', _('Transferencia')

    venta = models.ForeignKey(
        Venta,
        on_delete=models.CASCADE,
        related_name='abonos',
        verbose_name=_('venta'),
        help_text=_('Venta sobre la cual se registra el abono.'),
    )
    monto_abonado = models.DecimalField(
        _('monto abonado'),
        max_digits=12,
        decimal_places=2,
        help_text=_('Valor abonado a la venta.'),
    )
    fecha_abono = models.DateTimeField(
        _('fecha de abono'),
        auto_now_add=True,
        help_text=_('Fecha y hora en que se registro el abono.'),
    )
    metodo_pago = models.CharField(
        _('metodo de pago'),
        max_length=20,
        choices=MetodoPago.choices,
        help_text=_('Metodo de pago con el que se realizo el abono.'),
    )
    referencia_pago = models.CharField(
        _('referencia de pago'),
        max_length=100,
        blank=True,
        help_text=_('Numero de transaccion o referencia del pago.'),
    )
    observaciones = models.TextField(
        _('observaciones'),
        blank=True,
        help_text=_('Observaciones adicionales del abono.'),
    )
    usuario_registro = models.ForeignKey(
        'usuario.Usuario',
        on_delete=models.PROTECT,
        related_name='abonos_registrados',
        verbose_name=_('usuario de registro'),
        help_text=_('Usuario que registro el abono.'),
    )
    created_at = models.DateTimeField(
        _('fecha de creacion'),
        auto_now_add=True,
        help_text=_('Fecha y hora de creacion del registro.'),
    )

    class Meta:
        db_table = 'abonos'
        ordering = ['-fecha_abono', '-created_at']
        verbose_name = _('abono')
        verbose_name_plural = _('abonos')
        indexes = [
            models.Index(fields=['venta']),
            models.Index(fields=['fecha_abono']),
            models.Index(fields=['metodo_pago']),
            models.Index(fields=['usuario_registro']),
        ]

    def __str__(self):
        return f"{self.venta.numero_venta} - {self.monto_abonado}"

    def validar_monto(self):
        """
        Valida que el monto del abono sea consistente con la venta.
        """
        quantizer = Decimal('0.01')
        monto = self.monto_abonado.quantize(quantizer)

        if monto <= Decimal('0.00'):
            raise ValidationError({
                'monto_abonado': _(
                    'El monto abonado debe ser mayor que cero.'
                ),
            })

        if self.venta.estado == Venta.Estado.CANCELADA:
            raise ValidationError({
                'venta': _(
                    'No se pueden registrar abonos a ventas canceladas.'
                ),
            })

        total_existente = self.venta.abonos.exclude(
            pk=self.pk,
        ).aggregate(total=Sum('monto_abonado'))['total'] or Decimal('0.00')
        saldo_disponible = self.venta.total - total_existente

        if monto > saldo_disponible.quantize(quantizer):
            raise ValidationError({
                'monto_abonado': _(
                    'El monto abonado no puede exceder el saldo pendiente.'
                ),
            })

        return True

    def clean(self):
        if not self.venta_id:
            return

        self.validar_monto()

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)


class FactusEnvironment(models.TextChoices):
    SANDBOX = 'SANDBOX', _('Sandbox')
    PRODUCCION = 'PRODUCCION', _('Produccion')


class FactusCredential(models.Model):
    """
    Credenciales Factus por empresa y ambiente.
    """

    empresa = models.ForeignKey(
        'empresa.Empresa',
        on_delete=models.CASCADE,
        related_name='factus_credentials',
        verbose_name=_('empresa'),
    )
    environment = models.CharField(
        _('ambiente'),
        max_length=20,
        choices=FactusEnvironment.choices,
        default=FactusEnvironment.SANDBOX,
    )
    base_url = models.URLField(default='https://api-sandbox.factus.com.co')
    client_id = models.CharField(max_length=255)
    client_secret = models.TextField()
    username = models.CharField(max_length=255)
    password = models.TextField()
    timeout = models.PositiveIntegerField(default=30)
    max_retries = models.PositiveIntegerField(default=2)
    verify_ssl = models.BooleanField(default=True)
    activo = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'factus_credentials'
        verbose_name = _('credencial Factus')
        verbose_name_plural = _('credenciales Factus')
        constraints = [
            models.UniqueConstraint(
                fields=['empresa', 'environment'],
                name='factus_credential_empresa_environment_unique',
            ),
        ]
        indexes = [
            models.Index(fields=['empresa', 'environment']),
            models.Index(fields=['activo']),
        ]

    def __str__(self):
        return f'{self.empresa} - {self.environment}'

    @property
    def client_id_masked(self):
        if not self.client_id:
            return ''
        return f'***{self.client_id[-4:]}'


class FacturacionElectronicaConfig(models.Model):
    """
    Configuración funcional de facturación electrónica.
    """

    empresa = models.OneToOneField(
        'empresa.Empresa',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='facturacion_config',
        verbose_name=_('empresa'),
    )
    is_enabled = models.BooleanField(
        _('facturacion habilitada'),
        default=False,
    )
    environment = models.CharField(
        _('ambiente'),
        max_length=20,
        choices=FactusEnvironment.choices,
        default=FactusEnvironment.SANDBOX,
    )
    auto_emitir_al_terminar = models.BooleanField(
        _('auto emitir al terminar'),
        default=True,
    )
    auto_enviar_email = models.BooleanField(
        _('auto enviar email'),
        default=False,
    )
    active_bill_range = models.ForeignKey(
        'FactusNumberingRange',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='configs_factura',
    )
    active_credit_note_range = models.ForeignKey(
        'FactusNumberingRange',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='configs_nota_credito',
    )
    company_snapshot = models.JSONField(
        _('snapshot de empresa'),
        default=dict,
        blank=True,
    )
    last_connection_status = models.CharField(
        _('ultimo estado de conexion'),
        max_length=50,
        blank=True,
    )
    last_connection_checked_at = models.DateTimeField(
        _('ultima verificacion de conexion'),
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'facturacion_electronica_config'
        verbose_name = _('configuracion de facturacion electronica')
        verbose_name_plural = _('configuracion de facturacion electronica')
        indexes = [
            models.Index(fields=['empresa']),
        ]

    def clean(self):
        if self.empresa_id:
            return
        if self.pk is None and FacturacionElectronicaConfig.objects.filter(
            empresa__isnull=True,
        ).exists():
            raise ValidationError(
                _('Solo puede existir una configuracion de facturacion.'),
            )

    @classmethod
    def get_solo(cls, empresa=None):
        if empresa is None:
            from empresa.context import get_empresa_actual_or_default

            empresa = get_empresa_actual_or_default()
        obj, _ = cls.objects.get_or_create(empresa=empresa)
        return obj


class FactusNumberingRange(models.Model):
    """
    Rango de numeración sincronizado desde Factus.
    """

    empresa = models.ForeignKey(
        'empresa.Empresa',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='factus_numbering_ranges',
        verbose_name=_('empresa'),
    )
    factus_id = models.PositiveIntegerField()
    document_code = models.CharField(max_length=10, default='01')
    prefix = models.CharField(max_length=20)
    from_number = models.PositiveIntegerField(default=0)
    to_number = models.PositiveIntegerField(default=0)
    current_number = models.PositiveIntegerField(default=0)
    resolution_number = models.CharField(max_length=100, blank=True)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    is_credit_note_range = models.BooleanField(default=False)
    synced_at = models.DateTimeField(auto_now=True)
    raw_payload = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = 'factus_numbering_ranges'
        verbose_name = _('rango de numeracion Factus')
        verbose_name_plural = _('rangos de numeracion Factus')
        indexes = [
            models.Index(fields=['empresa']),
            models.Index(fields=['factus_id']),
            models.Index(fields=['document_code']),
            models.Index(fields=['is_active']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['empresa', 'factus_id'],
                name='factus_range_empresa_factus_id_unique',
            ),
        ]

    def __str__(self):
        return f'{self.prefix} ({self.factus_id})'


class VentaFacturaElectronica(models.Model):
    """
    Estado documental electrónico de una venta.
    """

    class Status(models.TextChoices):
        PENDIENTE_ENVIO = 'PENDIENTE_ENVIO', _('Pendiente de envio')
        EMITIDA = 'EMITIDA', _('Emitida')
        ERROR = 'ERROR', _('Error')
        ANULADA = 'ANULADA', _('Anulada')

    venta = models.OneToOneField(
        Venta,
        on_delete=models.CASCADE,
        related_name='factura_documento',
    )
    empresa = models.ForeignKey(
        'empresa.Empresa',
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='facturas_electronicas',
        verbose_name=_('empresa'),
    )
    status = models.CharField(
        max_length=30,
        choices=Status.choices,
        default=Status.PENDIENTE_ENVIO,
    )
    reference_code = models.CharField(max_length=100)
    bill_number = models.CharField(max_length=100, blank=True)
    cufe = models.CharField(max_length=255, blank=True)
    numbering_range = models.ForeignKey(
        FactusNumberingRange,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='facturas_emitidas',
    )
    resolution_number = models.CharField(max_length=100, blank=True)
    validated_at = models.DateTimeField(null=True, blank=True)
    email_last_sent_at = models.DateTimeField(null=True, blank=True)
    last_error_code = models.CharField(max_length=100, blank=True)
    last_error_message = models.TextField(blank=True)
    request_payload = models.JSONField(default=dict, blank=True)
    response_payload = models.JSONField(default=dict, blank=True)
    credit_note_number = models.CharField(max_length=100, blank=True)
    credit_note_payload = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'ventas_factura_electronica'
        verbose_name = _('factura electronica de venta')
        verbose_name_plural = _('facturas electronicas de ventas')
        indexes = [
            models.Index(fields=['empresa']),
            models.Index(fields=['status']),
            models.Index(fields=['bill_number']),
            models.Index(fields=['cufe']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['empresa', 'reference_code'],
                name='factura_electronica_empresa_reference_unique',
            ),
        ]

    def __str__(self):
        return f'{self.venta.numero_venta} - {self.status}'

    def save(self, *args, **kwargs):
        if self.empresa_id is None and self.venta_id:
            self.empresa = self.venta.empresa
        super().save(*args, **kwargs)

    def sync_venta_fields(self):
        self.venta.numero_factura_electronica = self.bill_number
        self.venta.fecha_facturacion = self.validated_at
        self.venta.save(
            update_fields=[
                'numero_factura_electronica',
                'fecha_facturacion',
                'updated_at',
            ],
        )


class FacturaElectronicaIntento(models.Model):
    """
    Auditoría de interacciones con Factus.
    """

    class Action(models.TextChoices):
        EMITIR = 'EMITIR', _('Emitir')
        CONSULTAR = 'CONSULTAR', _('Consultar')
        ENVIAR_EMAIL = 'ENVIAR_EMAIL', _('Enviar email')
        DESCARGAR_PDF = 'DESCARGAR_PDF', _('Descargar PDF')
        DESCARGAR_XML = 'DESCARGAR_XML', _('Descargar XML')
        NOTA_CREDITO = 'NOTA_CREDITO', _('Nota credito')
        SINCRONIZAR_RANGOS = 'SINCRONIZAR_RANGOS', _('Sincronizar rangos')
        VALIDAR_CONEXION = 'VALIDAR_CONEXION', _('Validar conexion')

    factura = models.ForeignKey(
        VentaFacturaElectronica,
        on_delete=models.CASCADE,
        related_name='intentos',
        null=True,
        blank=True,
    )
    empresa = models.ForeignKey(
        'empresa.Empresa',
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='factura_electronica_intentos',
        verbose_name=_('empresa'),
    )
    action = models.CharField(max_length=30, choices=Action.choices)
    is_success = models.BooleanField(default=False)
    response_status_code = models.PositiveIntegerField(null=True, blank=True)
    request_payload = models.JSONField(default=dict, blank=True)
    response_payload = models.JSONField(default=dict, blank=True)
    error_message = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'factura_electronica_intentos'
        verbose_name = _('intento de factura electronica')
        verbose_name_plural = _('intentos de factura electronica')
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['empresa']),
            models.Index(fields=['action']),
            models.Index(fields=['is_success']),
        ]

    def __str__(self):
        return f'{self.action} - {"OK" if self.is_success else "ERROR"}'
