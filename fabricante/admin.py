from django.contrib import admin

from fabricante.models import (
    Ingrediente,
    IngredientesProducto,
    InventarioIngredientes,
    ProductoFabricado,
)


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


class IngredientesProductoInline(admin.TabularInline):
    model = IngredientesProducto
    extra = 1
    autocomplete_fields = ('ingrediente',)


@admin.register(ProductoFabricado)
class ProductoFabricadoAdmin(admin.ModelAdmin):
    list_display = (
        'nombre',
        'unidad_medida',
        'cantidad_producida',
        'costo_produccion',
        'costo_unitario',
        'precio_venta',
        'margen_utilidad',
        'porcentaje_utilidad',
        'producto_final',
    )
    list_filter = ('unidad_medida',)
    search_fields = ('nombre', 'descripcion', 'producto_final__nombre')
    autocomplete_fields = ('producto_final',)
    ordering = ('nombre',)
    inlines = (IngredientesProductoInline,)


@admin.register(IngredientesProducto)
class IngredientesProductoAdmin(admin.ModelAdmin):
    list_display = (
        'producto_fabricado',
        'ingrediente',
        'cantidad_necesaria',
        'unidad_medida',
        'costo_ingrediente',
    )
    list_filter = ('unidad_medida',)
    search_fields = (
        'producto_fabricado__nombre',
        'ingrediente__nombre',
    )
    autocomplete_fields = ('producto_fabricado', 'ingrediente')
    ordering = ('producto_fabricado', 'ingrediente')
