from django.db import models
from django.utils.translation import gettext_lazy as _
from django.utils import timezone


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


class Producto(models.Model):
    """
    Modelo que representa un producto en el inventario.
    
    Contiene todos los campos necesarios para la gestión de inventario,
    incluyendo precios, stock, categorización y soporte para importación
    desde el sistema antiguo.
    """
    
    codigo_interno = models.CharField(
        _('código interno'),
        max_length=50,
        unique=True,
        help_text=_('Código único de identificación interna del producto')
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
    
    iva = models.DecimalField(
        _('IVA'),
        max_digits=5,
        decimal_places=2,
        default=0,
        help_text=_('Porcentaje de IVA aplicable (0-100)')
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
            models.Index(fields=['codigo_interno']),
            models.Index(fields=['codigo_barras']),
            models.Index(fields=['nombre']),
            models.Index(fields=['categoria']),
            models.Index(fields=['existencias']),
            models.Index(fields=['fecha_caducidad']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        """
        Representación en string del producto.
        
        Returns:
            str: Nombre y código interno del producto
        """
        return f"{self.nombre} ({self.codigo_interno})"
    
    def calcular_valor_inventario(self):
        """
        Calcula el valor total del producto en inventario.
        
        Returns:
            Decimal: Valor total (precio_compra * existencias)
        """
        from decimal import Decimal
        return self.precio_compra * self.existencias
    
    def calcular_valor_venta(self):
        """
        Calcula el valor total de venta del producto en inventario.
        
        Returns:
            Decimal: Valor total de venta (precio_venta * existencias)
        """
        from decimal import Decimal
        return self.precio_venta * self.existencias
    
    def actualizar_stock(self, cantidad):
        """
        Actualiza las existencias del producto.
        
        Args:
            cantidad (Decimal): Cantidad a agregar (positiva) o restar (negativa)
        
        Returns:
            Decimal: Nuevo valor de existencias
        
        Raises:
            ValueError: Si la cantidad resultante es negativa
        """
        from decimal import Decimal
        nuevas_existencias = self.existencias + cantidad
        if nuevas_existencias < 0:
            raise ValueError(
                f"No hay suficiente stock. Disponible: {self.existencias}, "
                f"requerido: {-cantidad}"
            )
        self.existencias = nuevas_existencias
        self.save(update_fields=['existencias', 'updated_at'])
        return self.existencias
    
    def validar_stock(self, cantidad):
        """
        Verifica si hay suficiente stock disponible.
        
        Args:
            cantidad (Decimal): Cantidad requerida
        
        Returns:
            bool: True si hay suficiente stock, False en caso contrario
        """
        return self.existencias >= cantidad
    
    def clean(self):
        """
        Validaciones personalizadas del modelo.
        """
        from django.core.exceptions import ValidationError
        from decimal import Decimal
        
        # Validar que existencias no sean negativas
        if self.existencias < 0:
            raise ValidationError({
                'existencias': _('Las existencias no pueden ser negativas')
            })
        
        # Validar que precio_compra sea positivo
        if self.precio_compra <= 0:
            raise ValidationError({
                'precio_compra': _('El precio de compra debe ser mayor que cero')
            })
        
        # Validar que precio_venta sea positivo
        if self.precio_venta <= 0:
            raise ValidationError({
                'precio_venta': _('El precio de venta debe ser mayor que cero')
            })
        
        # Advertencia: precio_venta menor que precio_compra
        if self.precio_venta < self.precio_compra:
            # Esto es una advertencia, no un error
            # Se podría registrar en logs o mostrar como warning
            pass
        
        # Validar que IVA esté entre 0 y 100
        if self.iva < 0 or self.iva > 100:
            raise ValidationError({
                'iva': _('El IVA debe estar entre 0 y 100')
            })
        
        # Validar que fecha_caducidad no sea en el pasado (solo si está presente)
        if self.fecha_caducidad and self.fecha_caducidad < timezone.now().date():
            raise ValidationError({
                'fecha_caducidad': _('La fecha de caducidad no puede ser en el pasado')
            })
    
    def save(self, *args, **kwargs):
        """
        Sobrescribe el método save para ejecutar validaciones.
        """
        self.full_clean()
        super().save(*args, **kwargs)
    

