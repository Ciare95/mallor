from django.db import models
from django.utils.translation import gettext_lazy as _
from decimal import Decimal


class Venta(models.Model):
    """
    Modelo que representa una venta en el sistema.
    
    Este es un modelo placeholder para permitir relaciones con el módulo de inventario.
    Será expandido en la Épica 4: Módulo de Ventas y Abonos.
    """
    
    numero_venta = models.CharField(
        _('número de venta'),
        max_length=50,
        unique=True,
        blank=True,
        null=True,
        help_text=_('Número único de venta (será generado automáticamente)')
    )
    
    fecha_venta = models.DateTimeField(
        _('fecha de venta'),
        auto_now_add=True,
        help_text=_('Fecha y hora de la venta')
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
        db_table = 'ventas'
        ordering = ['-fecha_venta']
        verbose_name = _('venta')
        verbose_name_plural = _('ventas')
        indexes = [
            models.Index(fields=['numero_venta']),
            models.Index(fields=['fecha_venta']),
        ]
    
    def __str__(self):
        return f"Venta #{self.id} - {self.numero_venta or 'Sin número'}"
