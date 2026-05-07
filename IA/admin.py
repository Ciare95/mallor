from django.contrib import admin

from IA.models import MensajeIA


@admin.register(MensajeIA)
class MensajeIAAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'empresa',
        'usuario',
        'sesion_id',
        'rol_empresa',
        'herramienta_usada',
        'feedback',
        'created_at',
    )
    list_filter = ('rol_empresa', 'herramienta_usada', 'feedback', 'created_at')
    search_fields = ('consulta', 'respuesta', 'usuario__username')
    readonly_fields = (
        'empresa',
        'usuario',
        'sesion_id',
        'rol_empresa',
        'consulta',
        'respuesta',
        'herramienta_usada',
        'parametros_herramienta',
        'metadatos_resultado',
        'tiempo_respuesta',
        'tokens_entrada',
        'tokens_salida',
        'created_at',
    )

# Register your models here.
