from django.contrib import admin
from django.utils.translation import gettext_lazy as _
from django.utils import timezone
from .models import Categoria, Producto


@admin.register(Categoria)
class CategoriaAdmin(admin.ModelAdmin):
    """
    Configuración del modelo Categoria en el admin de Django.
    """
    list_display = ('nombre', 'created_at', 'updated_at')
    list_filter = ('created_at', 'updated_at')
    search_fields = ('nombre', 'descripcion')
    ordering = ('nombre',)
    readonly_fields = ('created_at', 'updated_at')
    fieldsets = (
        (None, {
            'fields': ('nombre', 'descripcion')
        }),
        ('Auditoría', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(Producto)
class ProductoAdmin(admin.ModelAdmin):
    """
    Configuración del modelo Producto en el admin de Django.
    """
    list_display = (
        'nombre',
        'codigo_interno_formateado',
        'categoria',
        'existencias',
        'precio_compra',
        'precio_venta',
        'fecha_caducidad',
        'activo'
    )
    list_filter = (
        'categoria',
        'fecha_caducidad',
        'created_at',
        'updated_at'
    )
    search_fields = (
        'nombre',
        'codigo_interno',
        'codigo_barras',
        'descripcion',
        'marca'
    )
    ordering = ('nombre',)
    readonly_fields = (
        'created_at',
        'updated_at',
        'fecha_ingreso',
        'valor_inventario',
        'valor_venta'
    )
    fieldsets = (
        ('Identificación', {
            'fields': (
                'codigo_interno',
                'codigo_barras',
                'nombre',
                'categoria',
                'marca',
                'descripcion'
            )
        }),
        ('Inventario y Precios', {
            'fields': (
                'existencias',
                'precio_compra',
                'precio_venta',
                'iva',
                'valor_inventario',
                'valor_venta'
            )
        }),
        ('Información Adicional', {
            'fields': (
                'invima',
                'imagen',
                'fecha_caducidad'
            )
        }),
        ('Auditoría', {
            'fields': (
                'fecha_ingreso',
                'created_at',
                'updated_at'
            ),
            'classes': ('collapse',)
        }),
    )
    
    def valor_inventario(self, obj):
        """
        Muestra el valor total en inventario en el admin.
        """
        return obj.calcular_valor_inventario()
    valor_inventario.short_description = _('Valor en Inventario')
    valor_inventario.admin_order_field = 'existencias'
    
    def valor_venta(self, obj):
        """
        Muestra el valor total de venta en el admin.
        """
        return obj.calcular_valor_venta()
    valor_venta.short_description = _('Valor de Venta')
    valor_venta.admin_order_field = 'existencias'
    
    def activo(self, obj):
        """
        Indica si el producto está activo (tiene stock o no está caducado).
        """

        
        if obj.existencias <= 0:
            return '❌ Sin Stock'
        elif obj.fecha_caducidad and obj.fecha_caducidad < timezone.now().date():
            return '⚠️ Caducado'
        else:
            return '✅ Activo'
    activo.short_description = _('Estado')
