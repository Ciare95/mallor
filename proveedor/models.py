from django.db import models
from django.utils.translation import gettext_lazy as _
from django.core.validators import MinValueValidator, MaxValueValidator
from decimal import Decimal


class Proveedor(models.Model):
    """
    Modelo que representa un proveedor en el sistema.
    
    Los proveedores son empresas o personas que suministran productos
    al inventario mediante facturas de compra.
    """
    
    # Choices para tipo de documento
    TIPO_DOCUMENTO_NIT = 'NIT'
    TIPO_DOCUMENTO_CC = 'CC'
    TIPO_DOCUMENTO_CE = 'CE'
    
    TIPO_DOCUMENTO_CHOICES = [
        (TIPO_DOCUMENTO_NIT, _('NIT')),
        (TIPO_DOCUMENTO_CC, _('Cédula de Ciudadanía')),
        (TIPO_DOCUMENTO_CE, _('Cédula de Extranjería')),
    ]
    
    # Choices para forma de pago
    FORMA_PAGO_CONTADO = 'CONTADO'
    FORMA_PAGO_CREDITO_15 = 'CREDITO_15'
    FORMA_PAGO_CREDITO_30 = 'CREDITO_30'
    FORMA_PAGO_CREDITO_60 = 'CREDITO_60'
    
    FORMA_PAGO_CHOICES = [
        (FORMA_PAGO_CONTADO, _('Contado')),
        (FORMA_PAGO_CREDITO_15, _('Crédito 15 días')),
        (FORMA_PAGO_CREDITO_30, _('Crédito 30 días')),
        (FORMA_PAGO_CREDITO_60, _('Crédito 60 días')),
    ]
    
    tipo_documento = models.CharField(
        _('tipo de documento'),
        max_length=3,
        choices=TIPO_DOCUMENTO_CHOICES,
        default=TIPO_DOCUMENTO_NIT,
        help_text=_('Tipo de documento del proveedor')
    )
    
    numero_documento = models.CharField(
        _('número de documento'),
        max_length=20,
        unique=True,
        help_text=_('Número único de documento (NIT, CC, CE)')
    )
    
    razon_social = models.CharField(
        _('razón social'),
        max_length=200,
        help_text=_('Nombre legal o razón social del proveedor')
    )
    
    nombre_comercial = models.CharField(
        _('nombre comercial'),
        max_length=200,
        blank=True,
        help_text=_('Nombre comercial o marca (opcional)')
    )
    
    nombre_contacto = models.CharField(
        _('nombre de contacto'),
        max_length=100,
        help_text=_('Nombre de la persona de contacto')
    )
    
    email = models.EmailField(
        _('correo electrónico'),
        help_text=_('Correo electrónico para contacto')
    )
    
    telefono = models.CharField(
        _('teléfono'),
        max_length=20,
        help_text=_('Número de teléfono fijo')
    )
    
    celular = models.CharField(
        _('celular'),
        max_length=20,
        blank=True,
        help_text=_('Número de celular (opcional)')
    )
    
    direccion = models.TextField(
        _('dirección'),
        help_text=_('Dirección completa del proveedor')
    )
    
    ciudad = models.CharField(
        _('ciudad'),
        max_length=100,
        help_text=_('Ciudad donde se encuentra el proveedor')
    )
    
    departamento = models.CharField(
        _('departamento'),
        max_length=100,
        help_text=_('Departamento o estado')
    )
    
    tipo_productos = models.TextField(
        _('tipo de productos'),
        help_text=_('Descripción de los tipos de productos que suministra')
    )
    
    forma_pago = models.CharField(
        _('forma de pago'),
        max_length=15,
        choices=FORMA_PAGO_CHOICES,
        default=FORMA_PAGO_CONTADO,
        help_text=_('Condiciones de pago acordadas')
    )
    
    cuenta_bancaria = models.CharField(
        _('cuenta bancaria'),
        max_length=50,
        blank=True,
        help_text=_('Número de cuenta bancaria (opcional)')
    )
    
    banco = models.CharField(
        _('banco'),
        max_length=100,
        blank=True,
        help_text=_('Nombre del banco (opcional)')
    )
    
    observaciones = models.TextField(
        _('observaciones'),
        blank=True,
        help_text=_('Observaciones adicionales sobre el proveedor')
    )
    
    activo = models.BooleanField(
        _('activo'),
        default=True,
        help_text=_('Indica si el proveedor está activo en el sistema')
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
        db_table = 'proveedores'
        ordering = ['razon_social']
        verbose_name = _('proveedor')
        verbose_name_plural = _('proveedores')
        indexes = [
            models.Index(fields=['numero_documento']),
            models.Index(fields=['razon_social']),
            models.Index(fields=['ciudad']),
            models.Index(fields=['activo']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        """
        Representación en string del proveedor.
        
        Returns:
            str: Razón social y documento del proveedor
        """
        return f"{self.razon_social} ({self.numero_documento})"
    
    @property
    def nombre_completo(self):
        """
        Retorna el nombre completo del proveedor.
        
        Returns:
            str: Nombre comercial si existe, sino razón social
        """
        return self.nombre_comercial if self.nombre_comercial else self.razon_social
    
    def calcular_total_compras(self):
        """
        Calcula el total de compras realizadas a este proveedor.
        
        Returns:
            Decimal: Suma total de todas las facturas de compra
        """
        from inventario.models import FacturaCompra
        total = FacturaCompra.objects.filter(
            proveedor=self,
            estado=FacturaCompra.ESTADO_PROCESADA
        ).aggregate(total=models.Sum('total'))['total']
        
        return total if total else Decimal('0')
    
    def obtener_ultima_compra(self):
        """
        Obtiene la fecha de la última compra realizada a este proveedor.
        
        Returns:
            datetime or None: Fecha de la última factura procesada
        """
        from inventario.models import FacturaCompra
        ultima_factura = FacturaCompra.objects.filter(
            proveedor=self,
            estado=FacturaCompra.ESTADO_PROCESADA
        ).order_by('-fecha_factura').first()
        
        return ultima_factura.fecha_factura if ultima_factura else None
    
    def clean(self):
        """
        Validaciones personalizadas del modelo.
        """
        from django.core.exceptions import ValidationError
        
        # Validar que el email tenga formato válido (ya lo hace EmailField)
        # Validar que el número de documento sea único por tipo (ya lo hace unique)
        
        # Validar que teléfono no esté vacío
        if not self.telefono.strip():
            raise ValidationError({
                'telefono': _('El teléfono es obligatorio')
            })
        
        # Validar que dirección no esté vacía
        if not self.direccion.strip():
            raise ValidationError({
                'direccion': _('La dirección es obligatoria')
            })
        
        # Validar que ciudad no esté vacía
        if not self.ciudad.strip():
            raise ValidationError({
                'ciudad': _('La ciudad es obligatoria')
            })
        
        # Validar que departamento no esté vacío
        if not self.departamento.strip():
            raise ValidationError({
                'departamento': _('El departamento es obligatorio')
            })
        
        # Validar que tipo_productos no esté vacío
        if not self.tipo_productos.strip():
            raise ValidationError({
                'tipo_productos': _('El tipo de productos es obligatorio')
            })
    
    def save(self, *args, **kwargs):
        """
        Sobrescribe el método save para ejecutar validaciones.
        """
        self.full_clean()
        super().save(*args, **kwargs)
