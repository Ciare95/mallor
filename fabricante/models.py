from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import models, transaction
from django.db.models import Sum
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

ZERO = Decimal('0.00')
ZERO_QUANTITY = Decimal('0.0000')
COST_QUANTIZER = Decimal('0.0001')
PERCENTAGE_QUANTIZER = Decimal('0.01')

UNIDAD_CONVERSIONES = {
    ('LITROS', 'MILILITROS'): Decimal('1000'),
    ('MILILITROS', 'LITROS'): Decimal('0.001'),
    ('KILOGRAMOS', 'GRAMOS'): Decimal('1000'),
    ('GRAMOS', 'KILOGRAMOS'): Decimal('0.001'),
}


def convertir_cantidad_unidad(cantidad, unidad_origen, unidad_destino):
    """
    Convierte una cantidad entre unidades compatibles.
    """
    if unidad_origen == unidad_destino:
        return Decimal(cantidad).quantize(COST_QUANTIZER)

    factor = UNIDAD_CONVERSIONES.get((unidad_origen, unidad_destino))
    if factor is None:
        raise ValueError(
            'No existe una conversion configurada entre las unidades '
            f'{unidad_origen} y {unidad_destino}.'
        )

    return (Decimal(cantidad) * factor).quantize(COST_QUANTIZER)


def unidades_compatibles(unidad_origen, unidad_destino):
    """
    Determina si dos unidades pueden convertirse entre si.
    """
    return (
        unidad_origen == unidad_destino or
        (unidad_origen, unidad_destino) in UNIDAD_CONVERSIONES
    )


class Ingrediente(models.Model):
    """
    Modelo que representa una materia prima usada en fabricacion.
    """

    class UnidadMedida(models.TextChoices):
        LITROS = 'LITROS', _('Litros')
        MILILITROS = 'MILILITROS', _('Mililitros')
        KILOGRAMOS = 'KILOGRAMOS', _('Kilogramos')
        GRAMOS = 'GRAMOS', _('Gramos')
        UNIDADES = 'UNIDADES', _('Unidades')

    id = models.AutoField(primary_key=True)
    nombre = models.CharField(
        _('nombre'),
        max_length=200,
        help_text=_('Nombre del ingrediente o materia prima.'),
    )
    descripcion = models.TextField(
        _('descripcion'),
        blank=True,
        help_text=_('Descripcion adicional del ingrediente.'),
    )
    unidad_medida = models.CharField(
        _('unidad de medida'),
        max_length=20,
        choices=UnidadMedida.choices,
        help_text=_('Unidad base usada para stock y costos.'),
    )
    precio_por_unidad = models.DecimalField(
        _('precio por unidad'),
        max_digits=14,
        decimal_places=4,
        help_text=_('Costo por unidad base del ingrediente.'),
    )
    proveedor = models.ForeignKey(
        'proveedor.Proveedor',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='ingredientes',
        verbose_name=_('proveedor'),
        help_text=_('Proveedor principal del ingrediente.'),
    )
    stock_actual = models.DecimalField(
        _('stock actual'),
        max_digits=14,
        decimal_places=4,
        default=Decimal('0.0000'),
        help_text=_('Cantidad disponible del ingrediente.'),
    )
    stock_minimo = models.DecimalField(
        _('stock minimo'),
        max_digits=14,
        decimal_places=4,
        default=Decimal('0.0000'),
        help_text=_('Cantidad minima recomendada para reposicion.'),
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
        db_table = 'ingredientes'
        ordering = ['nombre', 'id']
        verbose_name = _('ingrediente')
        verbose_name_plural = _('ingredientes')
        indexes = [
            models.Index(fields=['nombre']),
            models.Index(fields=['unidad_medida']),
            models.Index(fields=['proveedor']),
            models.Index(fields=['stock_actual']),
        ]

    def __str__(self):
        return self.nombre

    @property
    def stock_bajo_minimo(self):
        """
        Indica si el ingrediente requiere reposicion.
        """
        return self.stock_actual <= self.stock_minimo

    def calcular_stock_actual(self):
        """
        Suma todos los ingresos registrados para este ingrediente.
        """
        if not self.pk:
            return self.stock_actual or Decimal('0.0000')

        total = self.movimientos_inventario.aggregate(
            total=Sum('cantidad'),
        )['total']

        return (total or Decimal('0.0000')).quantize(Decimal('0.0001'))

    def sincronizar_stock_actual(self, commit=True):
        """
        Actualiza el stock actual a partir del inventario registrado.
        """
        self.stock_actual = self.calcular_stock_actual()

        if commit and self.pk:
            self.save(update_fields=['stock_actual', 'updated_at'])

        return self.stock_actual

    def clean(self):
        self.nombre = (self.nombre or '').strip()
        self.descripcion = (self.descripcion or '').strip()

        errores = {}

        if not self.nombre:
            errores['nombre'] = _('El nombre del ingrediente es obligatorio.')

        if self.precio_por_unidad <= Decimal('0.0000'):
            errores['precio_por_unidad'] = _(
                'El precio por unidad debe ser mayor que cero.'
            )

        if self.stock_actual < Decimal('0.0000'):
            errores['stock_actual'] = _(
                'El stock actual no puede ser negativo.'
            )

        if self.stock_minimo < Decimal('0.0000'):
            errores['stock_minimo'] = _(
                'El stock minimo no puede ser negativo.'
            )

        if errores:
            raise ValidationError(errores)

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)


class InventarioIngredientes(models.Model):
    """
    Modelo que registra ingresos de inventario de ingredientes.
    """

    id = models.AutoField(primary_key=True)
    ingrediente = models.ForeignKey(
        Ingrediente,
        on_delete=models.PROTECT,
        related_name='movimientos_inventario',
        verbose_name=_('ingrediente'),
        help_text=_('Ingrediente asociado al ingreso de inventario.'),
    )
    cantidad = models.DecimalField(
        _('cantidad'),
        max_digits=14,
        decimal_places=4,
        help_text=_('Cantidad ingresada del ingrediente.'),
    )
    precio_unitario = models.DecimalField(
        _('precio unitario'),
        max_digits=14,
        decimal_places=4,
        help_text=_('Costo unitario del ingrediente al ingresar.'),
    )
    fecha_ingreso = models.DateTimeField(
        _('fecha de ingreso'),
        default=timezone.now,
        help_text=_('Fecha y hora en que se registra el ingreso.'),
    )
    factura = models.ForeignKey(
        'inventario.FacturaCompra',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='movimientos_ingredientes',
        verbose_name=_('factura de compra'),
        help_text=_('Factura de compra asociada al ingreso.'),
    )
    usuario = models.ForeignKey(
        'usuario.Usuario',
        on_delete=models.PROTECT,
        related_name='ingresos_ingredientes',
        verbose_name=_('usuario'),
        help_text=_('Usuario que registra el ingreso del ingrediente.'),
    )

    class Meta:
        db_table = 'inventario_ingredientes'
        ordering = ['-fecha_ingreso', '-id']
        verbose_name = _('ingreso de inventario de ingrediente')
        verbose_name_plural = _('ingresos de inventario de ingredientes')
        indexes = [
            models.Index(fields=['ingrediente']),
            models.Index(fields=['fecha_ingreso']),
            models.Index(fields=['factura']),
            models.Index(fields=['usuario']),
        ]

    def __str__(self):
        return f"{self.ingrediente.nombre} - {self.cantidad}"

    def clean(self):
        errores = {}

        if self.cantidad <= Decimal('0.0000'):
            errores['cantidad'] = _(
                'La cantidad ingresada debe ser mayor que cero.'
            )

        if self.precio_unitario <= Decimal('0.0000'):
            errores['precio_unitario'] = _(
                'El precio unitario debe ser mayor que cero.'
            )

        if self.fecha_ingreso and self.fecha_ingreso > timezone.now():
            errores['fecha_ingreso'] = _(
                'La fecha de ingreso no puede ser futura.'
            )

        if errores:
            raise ValidationError(errores)

    def save(self, *args, **kwargs):
        ingrediente_anterior_id = None

        if self.pk:
            ingrediente_anterior_id = type(self).objects.filter(
                pk=self.pk,
            ).values_list('ingrediente_id', flat=True).first()

        with transaction.atomic():
            self.full_clean()
            super().save(*args, **kwargs)

            if (
                ingrediente_anterior_id and
                ingrediente_anterior_id != self.ingrediente_id
            ):
                ingrediente_anterior = Ingrediente.objects.filter(
                    pk=ingrediente_anterior_id,
                ).first()
                if ingrediente_anterior is not None:
                    ingrediente_anterior.sincronizar_stock_actual()

            self.ingrediente.sincronizar_stock_actual()

    def delete(self, *args, **kwargs):
        ingrediente = self.ingrediente

        with transaction.atomic():
            super().delete(*args, **kwargs)
            if ingrediente is not None:
                ingrediente.sincronizar_stock_actual()


class ProductoFabricado(models.Model):
    """
    Modelo que representa un producto elaborado con receta.
    """

    class UnidadMedida(models.TextChoices):
        LITROS = 'LITROS', _('Litros')
        MILILITROS = 'MILILITROS', _('Mililitros')
        KILOGRAMOS = 'KILOGRAMOS', _('Kilogramos')
        GRAMOS = 'GRAMOS', _('Gramos')
        UNIDADES = 'UNIDADES', _('Unidades')

    id = models.AutoField(primary_key=True)
    nombre = models.CharField(
        _('nombre'),
        max_length=200,
        help_text=_('Nombre del producto fabricado.'),
    )
    descripcion = models.TextField(
        _('descripcion'),
        help_text=_('Descripcion del producto fabricado.'),
    )
    unidad_medida = models.CharField(
        _('unidad de medida'),
        max_length=20,
        choices=UnidadMedida.choices,
        help_text=_('Unidad de medida del producto terminado.'),
    )
    cantidad_producida = models.DecimalField(
        _('cantidad producida'),
        max_digits=14,
        decimal_places=4,
        help_text=_('Cantidad producida por lote.'),
    )
    costo_produccion = models.DecimalField(
        _('costo de produccion'),
        max_digits=14,
        decimal_places=4,
        default=ZERO_QUANTITY,
        help_text=_('Costo total de produccion por lote.'),
    )
    costo_unitario = models.DecimalField(
        _('costo unitario'),
        max_digits=14,
        decimal_places=4,
        default=ZERO_QUANTITY,
        help_text=_('Costo unitario calculado del producto fabricado.'),
    )
    precio_venta_sugerido = models.DecimalField(
        _('precio de venta sugerido'),
        max_digits=14,
        decimal_places=2,
        default=ZERO,
        help_text=_('Precio sugerido de venta al publico.'),
    )
    precio_venta = models.DecimalField(
        _('precio de venta'),
        max_digits=14,
        decimal_places=2,
        default=ZERO,
        help_text=_('Precio final de venta del producto.'),
    )
    margen_utilidad = models.DecimalField(
        _('margen de utilidad'),
        max_digits=14,
        decimal_places=4,
        default=ZERO_QUANTITY,
        help_text=_('Margen de utilidad calculado por unidad.'),
    )
    porcentaje_utilidad = models.DecimalField(
        _('porcentaje de utilidad'),
        max_digits=7,
        decimal_places=2,
        default=ZERO,
        help_text=_('Porcentaje de utilidad calculado.'),
    )
    tiempo_produccion = models.IntegerField(
        _('tiempo de produccion'),
        help_text=_('Tiempo estimado de produccion por lote en minutos.'),
    )
    producto_final = models.ForeignKey(
        'inventario.Producto',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='productos_fabricados',
        verbose_name=_('producto final'),
        help_text=_('Producto de inventario asociado al producto fabricado.'),
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
        db_table = 'productos_fabricados'
        ordering = ['nombre', 'id']
        verbose_name = _('producto fabricado')
        verbose_name_plural = _('productos fabricados')
        indexes = [
            models.Index(fields=['nombre']),
            models.Index(fields=['unidad_medida']),
            models.Index(fields=['producto_final']),
        ]

    def __str__(self):
        return self.nombre

    def calcular_costo_produccion(self):
        """
        Suma el costo de todos los ingredientes de la receta.
        """
        if not self.pk:
            return self.costo_produccion or ZERO_QUANTITY

        costo_total = sum(
            (
                ingrediente_producto.calcular_costo_ingrediente()
                for ingrediente_producto in self.receta.select_related(
                    'ingrediente',
                )
            ),
            ZERO_QUANTITY,
        )
        return Decimal(costo_total).quantize(COST_QUANTIZER)

    def calcular_costo_unitario(self):
        """
        Calcula el costo unitario por producto elaborado.
        """
        if self.cantidad_producida <= ZERO_QUANTITY:
            return ZERO_QUANTITY

        return (
            self.calcular_costo_produccion() / self.cantidad_producida
        ).quantize(COST_QUANTIZER)

    def calcular_margen_utilidad(self):
        """
        Calcula la utilidad por unidad vendida.
        """
        precio_venta = Decimal(self.precio_venta or ZERO)
        return (
            precio_venta - self.calcular_costo_unitario()
        ).quantize(COST_QUANTIZER)

    def calcular_porcentaje_utilidad(self):
        """
        Calcula el porcentaje de utilidad sobre el costo unitario.
        """
        costo_unitario = self.calcular_costo_unitario()
        if costo_unitario <= ZERO_QUANTITY:
            return ZERO

        return (
            (self.calcular_margen_utilidad() / costo_unitario) * Decimal('100')
        ).quantize(PERCENTAGE_QUANTIZER)

    def _obtener_ingredientes_faltantes(self):
        faltantes = []

        for ingrediente_producto in self.receta.select_related(
            'ingrediente',
        ):
            cantidad_requerida = convertir_cantidad_unidad(
                ingrediente_producto.cantidad_necesaria,
                ingrediente_producto.unidad_medida,
                ingrediente_producto.ingrediente.unidad_medida,
            )

            if (
                ingrediente_producto.ingrediente.stock_actual <
                cantidad_requerida
            ):
                faltantes.append(ingrediente_producto.ingrediente_id)

        return faltantes

    def validar_disponibilidad_ingredientes(self):
        """
        Verifica si existe stock suficiente para fabricar un lote.
        """
        return not self._obtener_ingredientes_faltantes()

    def actualizar_campos_calculados(self):
        """
        Sincroniza los campos calculados del producto fabricado.
        """
        self.costo_produccion = self.calcular_costo_produccion()
        self.costo_unitario = self.calcular_costo_unitario()
        self.margen_utilidad = self.calcular_margen_utilidad()
        self.porcentaje_utilidad = self.calcular_porcentaje_utilidad()

    def clean(self):
        self.nombre = (self.nombre or '').strip()
        self.descripcion = (self.descripcion or '').strip()

        errores = {}

        if not self.nombre:
            errores['nombre'] = _(
                'El nombre del producto fabricado es obligatorio.'
            )

        if not self.descripcion:
            errores['descripcion'] = _(
                'La descripcion del producto fabricado es obligatoria.'
            )

        if self.cantidad_producida <= ZERO_QUANTITY:
            errores['cantidad_producida'] = _(
                'La cantidad producida debe ser mayor que cero.'
            )

        if self.precio_venta_sugerido < ZERO:
            errores['precio_venta_sugerido'] = _(
                'El precio de venta sugerido no puede ser negativo.'
            )

        if self.precio_venta < ZERO:
            errores['precio_venta'] = _(
                'El precio de venta no puede ser negativo.'
            )

        if self.tiempo_produccion < 0:
            errores['tiempo_produccion'] = _(
                'El tiempo de produccion no puede ser negativo.'
            )

        if errores:
            raise ValidationError(errores)

    def save(self, *args, **kwargs):
        self.actualizar_campos_calculados()
        self.full_clean()
        super().save(*args, **kwargs)


class IngredientesProducto(models.Model):
    """
    Modelo que representa la receta de un producto fabricado.
    """

    id = models.AutoField(primary_key=True)
    producto_fabricado = models.ForeignKey(
        ProductoFabricado,
        on_delete=models.CASCADE,
        related_name='receta',
        verbose_name=_('producto fabricado'),
        help_text=_('Producto fabricado al que pertenece la receta.'),
    )
    ingrediente = models.ForeignKey(
        Ingrediente,
        on_delete=models.PROTECT,
        related_name='productos_receta',
        verbose_name=_('ingrediente'),
        help_text=_('Ingrediente usado en la receta del producto.'),
    )
    cantidad_necesaria = models.DecimalField(
        _('cantidad necesaria'),
        max_digits=14,
        decimal_places=4,
        help_text=_('Cantidad necesaria del ingrediente para un lote.'),
    )
    unidad_medida = models.CharField(
        _('unidad de medida'),
        max_length=20,
        choices=Ingrediente.UnidadMedida.choices,
        help_text=_('Unidad de medida usada en la receta.'),
    )
    costo_ingrediente = models.DecimalField(
        _('costo del ingrediente'),
        max_digits=14,
        decimal_places=4,
        default=ZERO_QUANTITY,
        help_text=_('Costo calculado del ingrediente dentro del lote.'),
    )

    class Meta:
        db_table = 'ingredientes_producto'
        ordering = ['producto_fabricado', 'ingrediente']
        verbose_name = _('ingrediente de producto')
        verbose_name_plural = _('ingredientes de producto')
        indexes = [
            models.Index(fields=['producto_fabricado']),
            models.Index(fields=['ingrediente']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['producto_fabricado', 'ingrediente'],
                name='unique_ingrediente_por_producto_fabricado',
            ),
        ]

    def __str__(self):
        return (
            f"{self.producto_fabricado.nombre} - {self.ingrediente.nombre}"
        )

    def calcular_costo_ingrediente(self):
        """
        Calcula el costo del ingrediente dentro del lote.
        """
        cantidad_base = convertir_cantidad_unidad(
            self.cantidad_necesaria,
            self.unidad_medida,
            self.ingrediente.unidad_medida,
        )
        self.costo_ingrediente = (
            cantidad_base * self.ingrediente.precio_por_unidad
        ).quantize(COST_QUANTIZER)
        return self.costo_ingrediente

    def clean(self):
        errores = {}

        if self.cantidad_necesaria <= ZERO_QUANTITY:
            errores['cantidad_necesaria'] = _(
                'La cantidad necesaria debe ser mayor que cero.'
            )

        if (
            self.ingrediente_id and
            not unidades_compatibles(
                self.unidad_medida,
                self.ingrediente.unidad_medida,
            )
        ):
            errores['unidad_medida'] = _(
                'La unidad de medida de la receta no es compatible con el '
                'ingrediente seleccionado.'
            )

        if errores:
            raise ValidationError(errores)

    def save(self, *args, **kwargs):
        producto_fabricado_anterior_id = None

        if self.pk:
            producto_fabricado_anterior_id = type(self).objects.filter(
                pk=self.pk,
            ).values_list('producto_fabricado_id', flat=True).first()

        with transaction.atomic():
            self.full_clean()
            self.calcular_costo_ingrediente()
            super().save(*args, **kwargs)

            if (
                producto_fabricado_anterior_id and
                producto_fabricado_anterior_id != self.producto_fabricado_id
            ):
                producto_anterior = ProductoFabricado.objects.filter(
                    pk=producto_fabricado_anterior_id,
                ).first()
                if producto_anterior is not None:
                    producto_anterior.save()

            self.producto_fabricado.save()

    def delete(self, *args, **kwargs):
        producto_fabricado = self.producto_fabricado

        with transaction.atomic():
            super().delete(*args, **kwargs)
            if producto_fabricado is not None:
                producto_fabricado.save()
