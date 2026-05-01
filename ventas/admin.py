from django.contrib import admin

from .models import Abono, DetalleVenta, Venta


@admin.register(Venta)
class VentaAdmin(admin.ModelAdmin):
    """
    Configuracion del modelo Venta en el admin de Django.
    """

    list_display = (
        'numero_venta',
        'cliente',
        'fecha_venta',
        'total',
        'estado',
        'estado_pago',
        'metodo_pago',
        'usuario_registro',
    )
    list_filter = (
        'estado',
        'estado_pago',
        'metodo_pago',
        'factura_electronica',
        'fecha_venta',
        'usuario_registro',
    )
    search_fields = (
        'numero_venta',
        'cliente__nombre',
        'cliente__razon_social',
        'numero_factura_electronica',
        'observaciones',
    )
    ordering = ('-fecha_venta', '-created_at')
    readonly_fields = (
        'numero_venta',
        'fecha_venta',
        'created_at',
        'updated_at',
    )
    fieldsets = (
        ('Informacion general', {
            'fields': (
                'numero_venta',
                'cliente',
                'fecha_venta',
                'usuario_registro',
                'metodo_pago',
            ),
        }),
        ('Valores', {
            'fields': (
                'subtotal',
                'descuento',
                'impuestos',
                'total',
                'total_abonado',
                'saldo_pendiente',
            ),
        }),
        ('Estados', {
            'fields': (
                'estado',
                'estado_pago',
                'factura_electronica',
                'numero_factura_electronica',
                'fecha_facturacion',
            ),
        }),
        ('Auditoria', {
            'fields': (
                'observaciones',
                'created_at',
                'updated_at',
            ),
            'classes': ('collapse',),
        }),
    )


@admin.register(DetalleVenta)
class DetalleVentaAdmin(admin.ModelAdmin):
    """
    Configuracion del modelo DetalleVenta en el admin de Django.
    """

    list_display = (
        'venta',
        'producto',
        'cantidad',
        'precio_unitario',
        'subtotal',
        'descuento',
        'iva',
        'total',
    )
    list_filter = ('venta', 'producto', 'created_at')
    search_fields = (
        'venta__numero_venta',
        'producto__nombre',
        'producto__codigo_barras',
    )
    ordering = ('-created_at',)
    readonly_fields = ('created_at', 'updated_at')


@admin.register(Abono)
class AbonoAdmin(admin.ModelAdmin):
    """
    Configuracion del modelo Abono en el admin de Django.
    """

    list_display = (
        'venta',
        'monto_abonado',
        'fecha_abono',
        'metodo_pago',
        'referencia_pago',
        'usuario_registro',
    )
    list_filter = ('metodo_pago', 'fecha_abono', 'usuario_registro')
    search_fields = (
        'venta__numero_venta',
        'referencia_pago',
        'observaciones',
    )
    ordering = ('-fecha_abono', '-created_at')
    readonly_fields = ('fecha_abono', 'created_at')
