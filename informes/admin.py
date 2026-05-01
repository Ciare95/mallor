from django.contrib import admin

from .models import CierreCaja, Informe


@admin.register(CierreCaja)
class CierreCajaAdmin(admin.ModelAdmin):
    """
    Configuracion del modelo CierreCaja en el admin de Django.
    """

    list_display = (
        'fecha_cierre',
        'total_ventas',
        'total_efectivo',
        'total_abonos',
        'total_gastos',
        'efectivo_esperado',
        'efectivo_real',
        'diferencia',
        'usuario_cierre',
    )
    list_filter = ('fecha_cierre', 'fecha_registro', 'usuario_cierre')
    search_fields = ('fecha_cierre', 'observaciones', 'usuario_cierre__username')
    ordering = ('-fecha_cierre', '-fecha_registro')
    readonly_fields = (
        'fecha_registro',
        'total_ventas',
        'total_efectivo',
        'total_tarjeta',
        'total_transferencia',
        'total_credito',
        'total_abonos',
        'total_gastos',
        'efectivo_esperado',
        'diferencia',
    )
    fieldsets = (
        ('Informacion general', {
            'fields': (
                'fecha_cierre',
                'fecha_registro',
                'usuario_cierre',
                'observaciones',
            ),
        }),
        ('Totales del cierre', {
            'fields': (
                'total_ventas',
                'total_efectivo',
                'total_tarjeta',
                'total_transferencia',
                'total_credito',
                'total_abonos',
                'total_gastos',
            ),
        }),
        ('Control de efectivo', {
            'fields': (
                'efectivo_esperado',
                'efectivo_real',
                'diferencia',
            ),
        }),
        ('Desgloses', {
            'fields': (
                'gastos_operativos',
                'ventas_por_categoria',
            ),
            'classes': ('collapse',),
        }),
    )


@admin.register(Informe)
class InformeAdmin(admin.ModelAdmin):
    """
    Configuracion del modelo Informe en el admin de Django.
    """

    list_display = (
        'tipo_informe',
        'fecha_generacion',
        'fecha_inicio',
        'fecha_fin',
        'usuario_genero',
        'archivo_pdf',
        'archivo_excel',
    )
    list_filter = (
        'tipo_informe',
        'fecha_generacion',
        'fecha_inicio',
        'fecha_fin',
        'usuario_genero',
    )
    search_fields = ('tipo_informe', 'usuario_genero__username')
    ordering = ('-fecha_generacion', '-id')
    readonly_fields = ('fecha_generacion',)
    fieldsets = (
        ('Informacion general', {
            'fields': (
                'tipo_informe',
                'fecha_generacion',
                'usuario_genero',
            ),
        }),
        ('Periodo consultado', {
            'fields': (
                'fecha_inicio',
                'fecha_fin',
            ),
        }),
        ('Contenido y archivos', {
            'fields': (
                'datos',
                'archivo_pdf',
                'archivo_excel',
            ),
        }),
    )
