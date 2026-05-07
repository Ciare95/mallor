from django.contrib import admin

from empresa.models import Empresa, EmpresaUsuario


@admin.register(Empresa)
class EmpresaAdmin(admin.ModelAdmin):
    list_display = ('razon_social', 'nit', 'ambiente_facturacion', 'activo')
    list_filter = ('ambiente_facturacion', 'activo')
    search_fields = ('razon_social', 'nombre_comercial', 'nit')


@admin.register(EmpresaUsuario)
class EmpresaUsuarioAdmin(admin.ModelAdmin):
    list_display = ('empresa', 'usuario', 'rol', 'activo')
    list_filter = ('rol', 'activo')
    search_fields = ('empresa__razon_social', 'usuario__username', 'usuario__email')

