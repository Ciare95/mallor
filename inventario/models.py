from django.db import models
from django.utils.translation import gettext_lazy as _


class Categoria(models.Model):
    """
    Modelo que representa una categoría de productos en el inventario.
    
    Las categorías permiten clasificar y organizar los productos
    para facilitar su búsqueda y gestión.
    """
    
    nombre = models.CharField(
        _('nombre'),
        max_length=100,
        unique=True,
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
            models.Index(fields=['nombre']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        """
        Representación en string de la categoría.
        
        Returns:
            str: Nombre de la categoría
        """
        return self.nombre
    

