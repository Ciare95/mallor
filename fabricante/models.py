from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import models, transaction
from django.db.models import Sum
from django.utils import timezone
from django.utils.translation import gettext_lazy as _


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
