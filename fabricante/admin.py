from django.contrib import admin

from fabricante.models import (
    Ingrediente,
    IngredientesProducto,
    InventarioIngredientes,
    MovimientoEmpaquePresentacion,
    PresentacionProductoFabricado,
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


class PresentacionProductoFabricadoInline(admin.TabularInline):
    model = PresentacionProductoFabricado
    extra = 1
    autocomplete_fields = ('producto_inventario',)


@admin.register(ProductoFabricado)
class ProductoFabricadoAdmin(admin.ModelAdmin):
    list_display = (
        'nombre',
        'unidad_medida',
        'cantidad_producida',
        'stock_fabricado_disponible',
        'total_producido_acumulado',
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
    inlines = (IngredientesProductoInline, PresentacionProductoFabricadoInline)


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


@admin.register(PresentacionProductoFabricado)
class PresentacionProductoFabricadoAdmin(admin.ModelAdmin):
    list_display = (
        'nombre',
        'producto_fabricado',
        'cantidad_por_unidad',
        'unidad_medida',
        'costo_unitario_presentacion',
        'precio_venta',
        'porcentaje_utilidad',
        'producto_inventario',
    )
    list_filter = ('unidad_medida',)
    search_fields = ('nombre', 'producto_fabricado__nombre')
    autocomplete_fields = ('producto_fabricado', 'producto_inventario')
    ordering = ('producto_fabricado', 'nombre')


@admin.register(MovimientoEmpaquePresentacion)
class MovimientoEmpaquePresentacionAdmin(admin.ModelAdmin):
    list_display = (
        'presentacion',
        'cantidad_unidades',
        'cantidad_consumida_lote',
        'fecha_empaque',
        'usuario',
    )
    list_filter = ('fecha_empaque',)
    search_fields = (
        'presentacion__nombre',
        'presentacion__producto_fabricado__nombre',
    )
    autocomplete_fields = ('presentacion', 'usuario')
    ordering = ('-fecha_empaque', '-id')
