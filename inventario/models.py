import uuid

from django.db import models
from django.utils.translation import gettext_lazy as _
from django.utils import timezone
from decimal import Decimal


class Categoria(models.Model):
    """
    Modelo que representa una categoría de productos en el inventario.
    
    Las categorías permiten clasificar y organizar los productos
    para facilitar su búsqueda y gestión.
    """

    empresa = models.ForeignKey(
        'empresa.Empresa',
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='categorias',
        verbose_name=_('empresa'),
    )

    nombre = models.CharField(
        _('nombre'),
        max_length=100,
        help_text=_('Nombre único de la categoría (ej: Medicamentos, Insumos, Equipos)')
    )
    
    descripcion = models.TextField(
        _('descripción'),
        blank=True,
        help_text=_('Descripción detallada de la categoría (opcional)')
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
        db_table = 'categorias'
        ordering = ['nombre']
        verbose_name = _('categoría')
        verbose_name_plural = _('categorías')
        indexes = [
            models.Index(fields=['empresa']),
            models.Index(fields=['nombre']),
            models.Index(fields=['created_at']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['empresa', 'nombre'],
                name='categoria_empresa_nombre_unique',
            ),
        ]
    
    def __str__(self):
        """
        Representación en string de la categoría.
        
        Returns:
            str: Nombre de la categoría
        """
        return self.nombre

    def save(self, *args, **kwargs):
        skip_full_clean = kwargs.pop('skip_full_clean', False)
        if self.empresa_id is None:
            from empresa.context import get_empresa_actual_or_default

            self.empresa = get_empresa_actual_or_default()
        if not skip_full_clean:
            self.full_clean()
        super().save(*args, **kwargs)


class Producto(models.Model):
    """
    Modelo que representa un producto en el inventario.
    
    Contiene todos los campos necesarios para la gestión de inventario,
    incluyendo precios, stock, categorización y soporte para importación
    desde el sistema antiguo.
    """
    uuid = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    empresa = models.ForeignKey(
        'empresa.Empresa',
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='productos',
        verbose_name=_('empresa'),
    )

    codigo_interno = models.IntegerField(
        _('código interno'),
        blank=True,
        null=True,
        help_text=_('Código único numérico autoincremental para identificación interna')
    )
    
    codigo_barras = models.CharField(
        _('código de barras'),
        max_length=100,
        blank=True,
        help_text=_('Código de barras del producto (opcional)')
    )
    
    nombre = models.CharField(
        _('nombre'),
        max_length=200,
        help_text=_('Nombre descriptivo del producto')
    )
    
    categoria = models.ForeignKey(
        Categoria,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name=_('categoría'),
        help_text=_('Categoría a la que pertenece el producto')
    )
    
    marca = models.CharField(
        _('marca'),
        max_length=100,
        blank=True,
        help_text=_('Marca o fabricante del producto')
    )
    
    descripcion = models.TextField(
        _('descripción'),
        blank=True,
        help_text=_('Descripción detallada del producto')
    )
    
    existencias = models.DecimalField(
        _('existencias'),
        max_digits=10,
        decimal_places=2,
        default=0,
        help_text=_('Cantidad disponible en inventario')
    )

    stock_minimo = models.DecimalField(
        _('stock minimo'),
        max_digits=10,
        decimal_places=2,
        default=10,
        help_text=_('Cantidad minima esperada antes de considerar bajo stock')
    )
    
    invima = models.CharField(
        _('invima'),
        max_length=100,
        blank=True,
        help_text=_('Registro sanitario INVIMA (si aplica)')
    )
    
    precio_compra = models.DecimalField(
        _('precio de compra'),
        max_digits=12,
        decimal_places=2,
        help_text=_('Precio al que se compró el producto')
    )
    
    precio_venta = models.DecimalField(
        _('precio de venta'),
        max_digits=12,
        decimal_places=2,
        help_text=_('Precio al que se vende el producto')
    )

    es_producto_especial = models.BooleanField(
        _('producto especial'),
        default=False,
        help_text=_(
            'Permite vender el producto con precio variable sin afectar stock.'
        )
    )
    
    iva = models.DecimalField(
        _('IVA'),
        max_digits=5,
        decimal_places=2,
        default=0,
        help_text=_('Porcentaje de IVA aplicable (0-100)')
    )
    unidad_medida_codigo = models.CharField(
        _('codigo de unidad de medida'),
        max_length=10,
        default='94',
        help_text=_('Codigo Factus/DIAN de la unidad de medida del producto')
    )
    estandar_codigo = models.CharField(
        _('codigo estandar'),
        max_length=10,
        default='999',
        help_text=_('Codigo estandar del producto para facturación electrónica')
    )
    
    imagen = models.ImageField(
        _('imagen'),
        upload_to='productos/',
        blank=True,
        null=True,
        help_text=_('Imagen del producto')
    )
    
    fecha_ingreso = models.DateTimeField(
        _('fecha de ingreso'),
        auto_now_add=True,
        help_text=_('Fecha y hora en que el producto ingresó al inventario')
    )
    
    fecha_caducidad = models.DateField(
        _('fecha de caducidad'),
        blank=True,
        null=True,
        help_text=_('Fecha de caducidad del producto (si aplica)')
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
        db_table = 'productos'
        ordering = ['nombre']
        verbose_name = _('producto')
        verbose_name_plural = _('productos')
        indexes = [
            models.Index(fields=['uuid'], name='productos_uuid_idx'),
            models.Index(fields=['empresa']),
            models.Index(fields=['codigo_interno']),
            models.Index(fields=['codigo_barras']),
            models.Index(fields=['nombre']),
            models.Index(fields=['categoria']),
            models.Index(fields=['existencias']),
            models.Index(fields=['stock_minimo'], name='productos_stock_m_8a5f6e_idx'),
            models.Index(
                fields=['es_producto_especial'],
                name='productos_es_prod_5b0d43_idx',
            ),
            models.Index(fields=['fecha_caducidad']),
            models.Index(fields=['created_at']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['empresa', 'codigo_interno'],
                name='producto_empresa_codigo_unique',
            ),
        ]
    
    def __str__(self):
        """
        Representación en string del producto.
        
        Returns:
            str: Nombre y código interno del producto
        """
        codigo = self.codigo_interno_formateado if self.codigo_interno else "Sin código"
        return f"{self.nombre} ({codigo})"
    
    @property
    def codigo_interno_formateado(self):
        """
        Retorna el código interno formateado con 8 dígitos.
        
        Returns:
            str: Código interno formateado (ej: 00000017)
        """
        if self.codigo_interno is None:
            return ""
        return f"{self.codigo_interno:08d}"
    
    def calcular_valor_inventario(self):
        """
        Calcula el valor total del producto en inventario.
        
        Returns:
            Decimal: Valor total (precio_compra * existencias)
        """
        from decimal import Decimal
        if self.precio_compra is None or self.existencias is None:
            return Decimal('0')
        return (self.precio_compra * self.existencias).quantize(Decimal('0.01'))
    
    def calcular_valor_venta(self):
        """
        Calcula el valor total de venta del producto en inventario.
        
        Returns:
            Decimal: Valor total de venta (precio_venta * existencias)
        """
        from decimal import Decimal
        if self.precio_venta is None or self.existencias is None:
            return Decimal('0')
        return (self.precio_venta * self.existencias).quantize(Decimal('0.01'))
    
    def actualizar_stock(self, cantidad, allow_negative=False):
        """
        Actualiza las existencias del producto.
        
        Args:
            cantidad (Decimal): Cantidad a agregar (positiva) o restar (negativa)
        
        Returns:
            Decimal: Nuevo valor de existencias
        
        Raises:
            ValueError: Si la cantidad resultante es negativa y no se permite
        """
        from decimal import Decimal
        existencias_actuales = self.existencias if self.existencias is not None else Decimal('0')
        nuevas_existencias = existencias_actuales + cantidad
        if nuevas_existencias < 0 and not allow_negative:
            raise ValueError(
                f"No hay suficiente stock. Disponible: {existencias_actuales}, "
                f"requerido: {-cantidad}"
            )
        self.existencias = nuevas_existencias
        self.save(
            update_fields=['existencias', 'updated_at'],
            skip_full_clean=allow_negative,
        )
        return self.existencias
    
    def validar_stock(self, cantidad):
        """
        Verifica si hay suficiente stock disponible.
        
        Args:
            cantidad (Decimal): Cantidad requerida
        
        Returns:
            bool: True si hay suficiente stock, False en caso contrario
        """
        from decimal import Decimal
        existencias_actuales = self.existencias if self.existencias is not None else Decimal('0')
        return existencias_actuales >= cantidad
    
    def clean(self):
        """
        Validaciones personalizadas del modelo.
        """
        from django.core.exceptions import ValidationError
        from decimal import Decimal
        
        # Validar que existencias no sean negativas (solo si tiene valor)
        if self.existencias is not None and self.existencias < 0:
            raise ValidationError({
                'existencias': _('Las existencias no pueden ser negativas')
            })

        if self.stock_minimo is not None and self.stock_minimo < 0:
            raise ValidationError({
                'stock_minimo': _('El stock minimo no puede ser negativo')
            })
        
        if self.precio_compra is not None and self.precio_compra < 0:
            raise ValidationError({
                'precio_compra': _(
                    'El precio de compra no puede ser negativo'
                )
            })

        if self.precio_venta is not None and self.precio_venta < 0:
            raise ValidationError({
                'precio_venta': _(
                    'El precio de venta no puede ser negativo'
                )
            })

        if not self.es_producto_especial:
            if (
                self.precio_compra is not None
                and self.precio_compra <= Decimal('0')
            ):
                raise ValidationError({
                    'precio_compra': _(
                        'El precio de compra debe ser mayor que cero'
                    )
                })
            if (
                self.precio_venta is not None
                and self.precio_venta <= Decimal('0')
            ):
                raise ValidationError({
                    'precio_venta': _(
                        'El precio de venta debe ser mayor que cero'
                    )
                })
        
        # Advertencia: precio_venta menor que precio_compra (solo si ambos tienen valor)
        if (self.precio_venta is not None and self.precio_compra is not None and 
                self.precio_venta < self.precio_compra):
            # Esto es una advertencia, no un error
            # Se podría registrar en logs o mostrar como warning
            pass
        
        # Validar que IVA esté entre 0 y 100 (solo si tiene valor)
        if self.iva is not None and (self.iva < 0 or self.iva > 100):
            raise ValidationError({
                'iva': _('El IVA debe estar entre 0 y 100')
            })

        if not (self.unidad_medida_codigo or '').strip():
            raise ValidationError({
                'unidad_medida_codigo': _(
                    'El codigo de unidad de medida es obligatorio.'
                )
            })

        if not (self.estandar_codigo or '').strip():
            raise ValidationError({
                'estandar_codigo': _(
                    'El codigo estandar es obligatorio.'
                )
            })
        
        # Validar que fecha_caducidad no sea en el pasado (solo si está presente)
        if self.fecha_caducidad and self.fecha_caducidad < timezone.now().date():
            raise ValidationError({
                'fecha_caducidad': _('La fecha de caducidad no puede ser en el pasado')
            })
    
    @classmethod
    def get_next_codigo_interno(cls, empresa=None):
        """
        Obtiene el siguiente código interno disponible.
        
        Returns:
            int: Siguiente código interno numérico
        """
        queryset = cls.objects.filter(codigo_interno__isnull=False)
        if empresa is not None:
            queryset = queryset.filter(empresa=empresa)
        ultimo_producto = queryset.order_by('-codigo_interno').first()
        
        if ultimo_producto and ultimo_producto.codigo_interno is not None:
            return ultimo_producto.codigo_interno + 1
        return 1
    
    def save(self, *args, **kwargs):
        """
        Sobrescribe el método save para generar código interno y ejecutar validaciones.
        """
        # Generar código interno automáticamente si no se proporciona
        if self.empresa_id is None:
            from empresa.context import get_empresa_actual_or_default

            self.empresa = get_empresa_actual_or_default()
        if self.codigo_interno is None:
            self.codigo_interno = self.get_next_codigo_interno(self.empresa)
        
        skip_full_clean = kwargs.pop('skip_full_clean', False)
        if not skip_full_clean:
            self.full_clean()
        super().save(*args, **kwargs)


class FacturaCompra(models.Model):
    """
    Modelo que representa una factura de compra de productos a proveedores.
    
    Registra las compras realizadas a proveedores para actualizar el inventario
    y llevar control de las transacciones de entrada.
    """
    
    # Estados de la factura
    ESTADO_PENDIENTE = 'PENDIENTE'
    ESTADO_PROCESADA = 'PROCESADA'
    ESTADO_PAGO_PENDIENTE = 'PENDIENTE'
    ESTADO_PAGO_ABONADA = 'ABONADA'
    ESTADO_PAGO_PAGADA = 'PAGADA'
    FORMA_PAGO_CONTADO = 'CONTADO'
    FORMA_PAGO_CREDITO = 'CREDITO'
    METODO_PAGO_EFECTIVO = 'EFECTIVO'
    METODO_PAGO_TRANSFERENCIA = 'TRANSFERENCIA'
    
    ESTADO_CHOICES = [
        (ESTADO_PENDIENTE, _('Pendiente')),
        (ESTADO_PROCESADA, _('Procesada')),
    ]
    ESTADO_PAGO_CHOICES = [
        (ESTADO_PAGO_PENDIENTE, _('Pendiente')),
        (ESTADO_PAGO_ABONADA, _('Abonada')),
        (ESTADO_PAGO_PAGADA, _('Pagada')),
    ]
    FORMA_PAGO_CHOICES = [
        (FORMA_PAGO_CONTADO, _('Contado')),
        (FORMA_PAGO_CREDITO, _('Credito')),
    ]
    METODO_PAGO_CHOICES = [
        (METODO_PAGO_EFECTIVO, _('Efectivo')),
        (METODO_PAGO_TRANSFERENCIA, _('Transferencia')),
    ]
    
    empresa = models.ForeignKey(
        'empresa.Empresa',
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='facturas_compra',
        verbose_name=_('empresa'),
    )

    numero_factura = models.CharField(
        _('número de factura'),
        max_length=50,
        help_text=_('Número único de la factura del proveedor')
    )
    
    proveedor = models.ForeignKey(
        'proveedor.Proveedor',
        on_delete=models.SET_NULL,
        null=True,
        blank=False,
        verbose_name=_('proveedor'),
        help_text=_('Proveedor que emitió la factura')
    )
    
    fecha_factura = models.DateField(
        _('fecha de factura'),
        help_text=_('Fecha de emisión de la factura')
    )
    
    fecha_vencimiento = models.DateField(
        _('fecha de vencimiento'),
        null=True,
        blank=True,
        help_text=_('Fecha limite de pago de la factura'),
    )

    fecha_registro = models.DateTimeField(
        _('fecha de registro'),
        auto_now_add=True,
        help_text=_('Fecha y hora de registro en el sistema')
    )
    
    subtotal = models.DecimalField(
        _('subtotal'),
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text=_('Suma de los valores antes de impuestos y descuentos')
    )
    
    iva = models.DecimalField(
        _('IVA'),
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text=_('Valor del impuesto al valor agregado')
    )
    
    descuento = models.DecimalField(
        _('descuento'),
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text=_('Descuento aplicado a la factura')
    )
    
    total = models.DecimalField(
        _('total'),
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text=_('Valor total de la factura (subtotal + IVA - descuento)')
    )
    
    forma_pago = models.CharField(
        _('forma de pago'),
        max_length=20,
        choices=FORMA_PAGO_CHOICES,
        default=FORMA_PAGO_CONTADO,
    )

    metodo_pago = models.CharField(
        _('metodo de pago'),
        max_length=20,
        choices=METODO_PAGO_CHOICES,
        default=METODO_PAGO_EFECTIVO,
    )

    total_abonado = models.DecimalField(
        _('total abonado'),
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
    )

    saldo_pendiente = models.DecimalField(
        _('saldo pendiente'),
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
    )

    estado_pago = models.CharField(
        _('estado de pago'),
        max_length=20,
        choices=ESTADO_PAGO_CHOICES,
        default=ESTADO_PAGO_PENDIENTE,
    )

    observaciones = models.TextField(
        _('observaciones'),
        blank=True,
        help_text=_('Observaciones adicionales sobre la factura')
    )
    
    usuario_registro = models.ForeignKey(
        'usuario.Usuario',
        on_delete=models.PROTECT,
        verbose_name=_('usuario de registro'),
        help_text=_('Usuario que registró la factura en el sistema')
    )
    
    estado = models.CharField(
        _('estado'),
        max_length=20,
        choices=ESTADO_CHOICES,
        default=ESTADO_PENDIENTE,
        help_text=_('Estado actual de la factura')
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
        db_table = 'facturas_compra'
        ordering = ['-fecha_factura', '-fecha_registro']
        verbose_name = _('factura de compra')
        verbose_name_plural = _('facturas de compra')
        indexes = [
            models.Index(fields=['empresa']),
            models.Index(fields=['numero_factura']),
            models.Index(fields=['proveedor']),
            models.Index(fields=['fecha_factura']),
            models.Index(fields=['fecha_vencimiento']),
            models.Index(fields=['estado']),
            models.Index(fields=['estado_pago']),
            models.Index(fields=['usuario_registro']),
            models.Index(fields=['created_at']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['empresa', 'numero_factura'],
                name='factura_compra_empresa_numero_unique',
            ),
        ]
    
    def __str__(self):
        """
        Representación en string de la factura de compra.
        
        Returns:
            str: Número de factura y proveedor
        """
        proveedor_nombre = self.proveedor.razon_social if self.proveedor else 'Sin proveedor'
        return f"Factura {self.numero_factura} - {proveedor_nombre}"
    
    def calcular_totales(self):
        """
        Calcula subtotal, IVA y total de la factura.
        
        Este método debe ser llamado después de agregar los detalles de la factura
        o cuando cambien los valores de los productos.
        
        Returns:
            dict: Diccionario con subtotal, iva, descuento y total
        """
        detalles = self.detalles.all()
        
        subtotal = Decimal('0.00')
        iva_total = Decimal('0.00')
        q = Decimal('0.01')
        
        for detalle in detalles:
            subtotal += detalle.cantidad * detalle.precio_unitario
            iva_total += detalle.cantidad * detalle.precio_unitario * (detalle.iva / Decimal('100'))
        
        subtotal = subtotal.quantize(q)
        iva_total = iva_total.quantize(q)
        total = (subtotal + iva_total - self.descuento).quantize(q)
        
        # Actualizar campos
        self.subtotal = subtotal
        self.iva = iva_total
        self.total = total
        
        return {
            'subtotal': subtotal,
            'iva': iva_total,
            'descuento': self.descuento,
            'total': total
        }

    def actualizar_estado_pago(self):
        total_abonos = self.abonos.aggregate(
            total=models.Sum('monto'),
        )['total'] or Decimal('0.00')
        q = Decimal('0.01')
        self.total_abonado = total_abonos.quantize(q)
        saldo = (self.total - self.total_abonado).quantize(q)
        self.saldo_pendiente = max(saldo, Decimal('0.00'))
        if self.saldo_pendiente <= Decimal('0.00') and self.total > 0:
            self.estado_pago = self.ESTADO_PAGO_PAGADA
        elif self.total_abonado > Decimal('0.00'):
            self.estado_pago = self.ESTADO_PAGO_ABONADA
        else:
            self.estado_pago = self.ESTADO_PAGO_PENDIENTE
        return self.estado_pago

    @property
    def vencimiento_proximo(self):
        if not self.fecha_vencimiento or self.estado_pago == self.ESTADO_PAGO_PAGADA:
            return False
        dias = (self.fecha_vencimiento - timezone.now().date()).days
        return 0 <= dias <= 3
    
    def marcar_como_procesada(self):
        """
        Cambia el estado de la factura a PROCESADA.
        
        Returns:
            bool: True si se cambió el estado, False si ya estaba procesada
        """
        if self.estado != self.ESTADO_PROCESADA:
            self.estado = self.ESTADO_PROCESADA
            self.save(update_fields=['estado', 'updated_at'])
            return True
        return False
    
    def clean(self):
        """
        Validaciones personalizadas del modelo.
        """
        from django.core.exceptions import ValidationError
        
        # Validar que fecha_factura no sea futura
        if self.fecha_factura and self.fecha_factura > timezone.now().date():
            raise ValidationError({
                'fecha_factura': _('La fecha de factura no puede ser futura')
            })
        if (
            self.fecha_vencimiento
            and self.fecha_factura
            and self.fecha_vencimiento < self.fecha_factura
        ):
            raise ValidationError({
                'fecha_vencimiento': _(
                    'La fecha de vencimiento no puede ser anterior a la factura'
                )
            })
        
        # Validar que descuento no sea negativo
        if self.descuento < 0:
            raise ValidationError({
                'descuento': _('El descuento no puede ser negativo')
            })
        
        # Validar que total sea positivo (o cero)
        if self.total < 0:
            raise ValidationError({
                'total': _('El total no puede ser negativo')
            })
        
        # Validar que subtotal sea positivo (o cero)
        if self.subtotal < 0:
            raise ValidationError({
                'subtotal': _('El subtotal no puede ser negativo')
            })
        
        # Validar que IVA no sea negativo
        if self.iva < 0:
            raise ValidationError({
                'iva': _('El IVA no puede ser negativo')
            })
    
    def save(self, *args, **kwargs):
        """
        Sobrescribe el método save para ejecutar validaciones.
        """
        if self.empresa_id is None:
            from empresa.context import get_empresa_actual_or_default

            self.empresa = get_empresa_actual_or_default()
        self.full_clean()
        super().save(*args, **kwargs)


class AbonoFacturaCompra(models.Model):
    factura = models.ForeignKey(
        FacturaCompra,
        on_delete=models.CASCADE,
        related_name='abonos',
        verbose_name=_('factura de compra'),
    )
    empresa = models.ForeignKey(
        'empresa.Empresa',
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='abonos_facturas_compra',
    )
    monto = models.DecimalField(max_digits=12, decimal_places=2)
    metodo_pago = models.CharField(
        max_length=20,
        choices=FacturaCompra.METODO_PAGO_CHOICES,
        default=FacturaCompra.METODO_PAGO_EFECTIVO,
    )
    fecha_pago = models.DateTimeField(default=timezone.now)
    referencia_pago = models.CharField(max_length=100, blank=True)
    observaciones = models.TextField(blank=True)
    usuario_registro = models.ForeignKey(
        'usuario.Usuario',
        on_delete=models.PROTECT,
        related_name='abonos_facturas_compra',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'abonos_facturas_compra'
        ordering = ['-fecha_pago', '-created_at']
        indexes = [
            models.Index(fields=['empresa']),
            models.Index(fields=['factura']),
            models.Index(fields=['fecha_pago']),
            models.Index(fields=['metodo_pago']),
        ]

    def clean(self):
        from django.core.exceptions import ValidationError

        if self.monto <= Decimal('0.00'):
            raise ValidationError({'monto': _('El abono debe ser mayor que cero')})
        abonado = self.factura.abonos.exclude(pk=self.pk).aggregate(
            total=models.Sum('monto'),
        )['total'] or Decimal('0.00')
        if self.monto > (self.factura.total - abonado).quantize(Decimal('0.01')):
            raise ValidationError({
                'monto': _('El abono no puede exceder el saldo pendiente')
            })

    def save(self, *args, **kwargs):
        if self.empresa_id is None and self.factura_id:
            self.empresa = self.factura.empresa
        self.full_clean()
        super().save(*args, **kwargs)
        self.factura.actualizar_estado_pago()
        self.factura.save(update_fields=[
            'total_abonado',
            'saldo_pendiente',
            'estado_pago',
            'updated_at',
        ])


class DetalleFacturaCompra(models.Model):
    """
    Modelo que representa un producto dentro de una factura de compra.
    
    Relaciona productos con facturas de compra, almacenando cantidades,
    precios unitarios e impuestos aplicados en el momento de la compra.
    """
    
    factura = models.ForeignKey(
        FacturaCompra,
        on_delete=models.CASCADE,
        related_name='detalles',
        verbose_name=_('factura'),
        help_text=_('Factura de compra a la que pertenece este detalle')
    )
    
    empresa = models.ForeignKey(
        'empresa.Empresa',
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='detalles_factura_compra',
        verbose_name=_('empresa'),
    )

    producto = models.ForeignKey(
        Producto,
        on_delete=models.PROTECT,
        verbose_name=_('producto'),
        help_text=_('Producto comprado')
    )
    
    cantidad = models.DecimalField(
        _('cantidad'),
        max_digits=10,
        decimal_places=2,
        default=Decimal('1.00'),
        help_text=_('Cantidad comprada del producto')
    )
    
    precio_unitario = models.DecimalField(
        _('precio unitario'),
        max_digits=12,
        decimal_places=2,
        help_text=_('Precio unitario al que se compró el producto')
    )
    
    precio_venta_sugerido = models.DecimalField(
        _('precio de venta sugerido'),
        max_digits=12,
        decimal_places=2,
        blank=True,
        null=True,
        help_text=_('Precio de venta que se aplicara al procesar la factura')
    )
    iva = models.DecimalField(
        _('IVA'),
        max_digits=5,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text=_('Porcentaje de IVA aplicado al producto (0-100)')
    )
    
    descuento = models.DecimalField(
        _('descuento'),
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text=_('Descuento aplicado a este producto')
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
        db_table = 'detalles_factura_compra'
        ordering = ['factura', 'producto']
        verbose_name = _('detalle de factura de compra')
        verbose_name_plural = _('detalles de factura de compra')
        indexes = [
            models.Index(fields=['factura']),
            models.Index(fields=['producto']),
            models.Index(fields=['created_at']),
        ]
        unique_together = [['factura', 'producto']]
    
    def __str__(self):
        """
        Representación en string del detalle.
        
        Returns:
            str: Producto y cantidad
        """
        return f"{self.producto.nombre} x {self.cantidad} - {self.factura.numero_factura}"
    
    @property
    def subtotal(self):
        """
        Calcula el subtotal del detalle (cantidad * precio_unitario).
        
        Returns:
            Decimal: Subtotal sin impuestos ni descuentos
        """
        return self.cantidad * self.precio_unitario
    
    @property
    def iva_valor(self):
        """
        Calcula el valor del IVA del detalle.
        
        Returns:
            Decimal: Valor del IVA
        """
        return self.subtotal * (self.iva / Decimal('100'))
    
    @property
    def total(self):
        """
        Calcula el total del detalle (subtotal + iva_valor - descuento).
        
        Returns:
            Decimal: Total del detalle
        """
        return self.subtotal + self.iva_valor - self.descuento
    
    def clean(self):
        """
        Validaciones personalizadas del modelo.
        """
        from django.core.exceptions import ValidationError
        
        # Validar que cantidad sea positiva
        if self.cantidad <= 0:
            raise ValidationError({
                'cantidad': _('La cantidad debe ser mayor que cero')
            })
        
        # Validar que precio_unitario sea positivo
        if self.precio_unitario <= 0:
            raise ValidationError({
                'precio_unitario': _('El precio unitario debe ser mayor que cero')
            })

        if (
            self.precio_venta_sugerido is not None and
            self.precio_venta_sugerido <= 0
        ):
            raise ValidationError({
                'precio_venta_sugerido': _(
                    'El precio de venta sugerido debe ser mayor que cero'
                )
            })
        
        # Validar que IVA esté entre 0 y 100
        if self.iva < 0 or self.iva > 100:
            raise ValidationError({
                'iva': _('El IVA debe estar entre 0 y 100')
            })
        
        # Validar que descuento no sea negativo
        if self.descuento < 0:
            raise ValidationError({
                'descuento': _('El descuento no puede ser negativo')
            })
        
        # Validar que descuento no exceda el subtotal
        if self.descuento > self.subtotal:
            raise ValidationError({
                'descuento': _('El descuento no puede exceder el subtotal del producto')
            })
    
    def save(self, *args, **kwargs):
        """
        Sobrescribe el método save para ejecutar validaciones.
        """
        self.full_clean()
        super().save(*args, **kwargs)


class HistorialInventario(models.Model):
    """
    Modelo que registra todos los movimientos de inventario (entradas, salidas, ajustes).
    
    Cada vez que cambia el stock de un producto, se crea un registro en este historial
    para mantener trazabilidad completa de los movimientos.
    """
    uuid = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    idempotency_key = models.CharField(max_length=160, blank=True, unique=True, null=True)
    # Tipos de movimiento
    TIPO_ENTRADA = 'ENTRADA'
    TIPO_SALIDA = 'SALIDA'
    TIPO_AJUSTE = 'AJUSTE'
    
    TIPO_MOVIMIENTO_CHOICES = [
        (TIPO_ENTRADA, _('Entrada')),
        (TIPO_SALIDA, _('Salida')),
        (TIPO_AJUSTE, _('Ajuste')),
    ]

    empresa = models.ForeignKey(
        'empresa.Empresa',
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='historial_inventario',
        verbose_name=_('empresa'),
    )

    producto = models.ForeignKey(
        Producto,
        on_delete=models.PROTECT,
        related_name='historial',
        verbose_name=_('producto'),
        help_text=_('Producto al que se le registra el movimiento')
    )
    
    tipo_movimiento = models.CharField(
        _('tipo de movimiento'),
        max_length=20,
        choices=TIPO_MOVIMIENTO_CHOICES,
        help_text=_('Tipo de movimiento: Entrada, Salida o Ajuste')
    )
    
    cantidad = models.DecimalField(
        _('cantidad'),
        max_digits=10,
        decimal_places=2,
        help_text=_('Cantidad movida (positiva para entrada, negativa para salida)')
    )
    
    precio_unitario = models.DecimalField(
        _('precio unitario'),
        max_digits=12,
        decimal_places=2,
        help_text=_('Precio unitario del producto al momento del movimiento')
    )
    
    factura = models.ForeignKey(
        FacturaCompra,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='movimientos_inventario',
        verbose_name=_('factura de compra'),
        help_text=_('Factura de compra asociada a la entrada (opcional)')
    )
    
    venta = models.ForeignKey(
        'ventas.Venta',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='movimientos_inventario',
        verbose_name=_('venta'),
        help_text=_('Venta asociada a la salida (opcional)')
    )
    
    motivo = models.CharField(
        _('motivo'),
        max_length=200,
        help_text=_('Motivo o descripción del movimiento')
    )
    
    usuario = models.ForeignKey(
        'usuario.Usuario',
        on_delete=models.PROTECT,
        verbose_name=_('usuario'),
        help_text=_('Usuario que registró el movimiento')
    )
    
    fecha = models.DateTimeField(
        _('fecha'),
        auto_now_add=True,
        help_text=_('Fecha y hora del movimiento')
    )
    
    observaciones = models.TextField(
        _('observaciones'),
        blank=True,
        help_text=_('Observaciones adicionales sobre el movimiento')
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
        db_table = 'historial_inventario'
        ordering = ['-fecha', '-created_at']
        verbose_name = _('registro de historial de inventario')
        verbose_name_plural = _('registros de historial de inventario')
        indexes = [
            models.Index(fields=['uuid'], name='hist_inv_uuid_idx'),
            models.Index(fields=['empresa']),
            models.Index(fields=['producto']),
            models.Index(fields=['tipo_movimiento']),
            models.Index(fields=['fecha']),
            models.Index(fields=['usuario']),
            models.Index(fields=['factura']),
            models.Index(fields=['venta']),
        ]
    
    def __str__(self):
        """
        Representación en string del registro de historial.
        
        Returns:
            str: Producto, tipo, cantidad y fecha
        """
        return f"{self.producto.nombre} - {self.get_tipo_movimiento_display()} x{self.cantidad} ({self.fecha.strftime('%Y-%m-%d %H:%M')})"
    
    def clean(self):
        """
        Validaciones personalizadas del modelo.
        """
        from django.core.exceptions import ValidationError
        from decimal import Decimal
        
        # Validar que cantidad no sea cero
        if self.cantidad == 0:
            raise ValidationError({
                'cantidad': _('La cantidad no puede ser cero')
            })
        
        # Validar que precio_unitario sea positivo
        if self.precio_unitario <= 0:
            raise ValidationError({
                'precio_unitario': _('El precio unitario debe ser mayor que cero')
            })
        
        # Validar consistencia entre tipo_movimiento y signo de cantidad
        if self.tipo_movimiento == self.TIPO_ENTRADA and self.cantidad < 0:
            raise ValidationError({
                'cantidad': _('Para movimientos de ENTRADA, la cantidad debe ser positiva')
            })
        elif self.tipo_movimiento == self.TIPO_SALIDA and self.cantidad > 0:
            raise ValidationError({
                'cantidad': _('Para movimientos de SALIDA, la cantidad debe ser negativa')
            })
        
        # Validar que factura solo esté presente para entradas
        if self.factura and self.tipo_movimiento != self.TIPO_ENTRADA:
            raise ValidationError({
                'factura': _('La factura solo puede asociarse a movimientos de ENTRADA')
            })
        
        # Validar que venta solo esté presente para salidas
        if self.venta and self.tipo_movimiento != self.TIPO_SALIDA:
            raise ValidationError({
                'venta': _('La venta solo puede asociarse a movimientos de SALIDA')
            })
        
        # Validar que al menos una de las referencias (factura/venta) esté presente para entradas/salidas
        if self.tipo_movimiento == self.TIPO_ENTRADA and not self.factura:
            # Advertencia: entrada sin factura (podría ser ajuste positivo)
            pass
        elif self.tipo_movimiento == self.TIPO_SALIDA and not self.venta:
            # Advertencia: salida sin venta (podría ser ajuste negativo)
            pass
    
    def save(self, *args, **kwargs):
        """
        Sobrescribe el método save para ejecutar validaciones.
        """
        self.full_clean()
        super().save(*args, **kwargs)


