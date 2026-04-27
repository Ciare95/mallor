from django.contrib import admin

from fabricante.models import Ingrediente, InventarioIngredientes


@admin.register(Ingrediente)
class IngredienteAdmin(admin.ModelAdmin):
    list_display = (
        'nombre',
        'unidad_medida',
        'precio_por_unidad',
        'stock_actual',
        'stock_minimo',
        'proveedor',
    )
    list_filter = ('unidad_medida', 'proveedor')
    search_fields = ('nombre', 'descripcion')
    ordering = ('nombre',)


@admin.register(InventarioIngredientes)
class InventarioIngredientesAdmin(admin.ModelAdmin):
    list_display = (
        'ingrediente',
        'cantidad',
        'precio_unitario',
        'fecha_ingreso',
        'factura',
        'usuario',
    )
    list_filter = ('fecha_ingreso', 'factura')
    search_fields = ('ingrediente__nombre', 'factura__numero_factura')
    autocomplete_fields = ('ingrediente', 'factura', 'usuario')
    ordering = ('-fecha_ingreso', '-id')
