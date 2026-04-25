from django.contrib import admin

from .models import Cliente


@admin.register(Cliente)
class ClienteAdmin(admin.ModelAdmin):
    """
    Configuracion del modelo Cliente en el admin de Django.
    """

    list_display = (
        'get_nombre_completo',
        'tipo_documento',
        'numero_documento',
        'telefono',
        'tipo_cliente',
        'activo',
    )
    list_filter = (
        'tipo_documento',
        'tipo_cliente',
        'responsable_iva',
        'activo',
        'created_at',
    )
    search_fields = (
        'nombre',
        'razon_social',
        'nombre_comercial',
        'numero_documento',
        'telefono',
        'email',
    )
    ordering = ('nombre', 'razon_social')
    readonly_fields = ('created_at', 'updated_at')
    fieldsets = (
        ('Identificacion', {
            'fields': (
                'tipo_documento',
                'numero_documento',
                'tipo_cliente',
            ),
        }),
        ('Datos principales', {
            'fields': (
                'nombre',
                'razon_social',
                'nombre_comercial',
                'email',
                'telefono',
                'celular',
            ),
        }),
        ('Ubicacion', {
            'fields': (
                'direccion',
                'ciudad',
                'departamento',
                'codigo_postal',
            ),
        }),
        ('Credito', {
            'fields': (
                'regimen_tributario',
                'responsable_iva',
                'limite_credito',
                'credito_disponible',
                'dias_plazo',
                'activo',
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
