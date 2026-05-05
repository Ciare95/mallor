from django.db import migrations


def forwards(apps, schema_editor):
    Empresa = apps.get_model('empresa', 'Empresa')
    EmpresaUsuario = apps.get_model('empresa', 'EmpresaUsuario')
    Usuario = apps.get_model('usuario', 'Usuario')

    empresa, _ = Empresa.objects.get_or_create(
        nit='000000000',
        defaults={
            'razon_social': 'Empresa Principal',
            'nombre_comercial': 'Empresa Principal',
            'ambiente_facturacion': 'SANDBOX',
            'activo': True,
        },
    )

    for usuario in Usuario.objects.all():
        rol = 'PROPIETARIO' if usuario.is_superuser or usuario.role == 'ADMIN' else 'EMPLEADO'
        EmpresaUsuario.objects.get_or_create(
            empresa=empresa,
            usuario=usuario,
            defaults={'rol': rol, 'activo': True},
        )

    for app_label, model_name in (
        ('cliente', 'Cliente'),
        ('proveedor', 'Proveedor'),
        ('inventario', 'Categoria'),
        ('inventario', 'Producto'),
        ('inventario', 'FacturaCompra'),
        ('inventario', 'DetalleFacturaCompra'),
        ('inventario', 'HistorialInventario'),
        ('ventas', 'Venta'),
        ('ventas', 'FacturacionElectronicaConfig'),
        ('ventas', 'FactusNumberingRange'),
        ('ventas', 'VentaFacturaElectronica'),
        ('ventas', 'FacturaElectronicaIntento'),
        ('informes', 'CierreCaja'),
        ('informes', 'Informe'),
    ):
        model = apps.get_model(app_label, model_name)
        model.objects.filter(empresa__isnull=True).update(empresa=empresa)

    config_model = apps.get_model('ventas', 'FacturacionElectronicaConfig')
    if not config_model.objects.filter(empresa=empresa).exists():
        config = config_model.objects.filter(pk=1).first()
        if config:
            config.empresa = empresa
            config.save(update_fields=['empresa'])


def backwards(apps, schema_editor):
    # No se eliminan asociaciones para evitar perdida accidental de aislamiento.
    pass


class Migration(migrations.Migration):
    dependencies = [
        ('empresa', '0001_initial'),
        ('usuario', '0002_alter_usuario_email_alter_usuario_id'),
        ('cliente', '0005_remove_cliente_cliente_tipo_numero_documento_unique_and_more'),
        ('proveedor', '0003_proveedor_empresa_alter_proveedor_numero_documento_and_more'),
        ('inventario', '0009_categoria_empresa_detallefacturacompra_empresa_and_more'),
        ('ventas', '0007_factuscredential_and_more'),
        ('informes', '0003_cierrecaja_empresa_informe_empresa_and_more'),
    ]

    operations = [
        migrations.RunPython(forwards, backwards),
    ]
