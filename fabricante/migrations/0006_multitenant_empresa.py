from django.db import migrations, models
import django.db.models.deletion


def backfill_fabricante_empresa(apps, schema_editor):
    Empresa = apps.get_model('empresa', 'Empresa')
    Ingrediente = apps.get_model('fabricante', 'Ingrediente')
    InventarioIngredientes = apps.get_model('fabricante', 'InventarioIngredientes')
    ProductoFabricado = apps.get_model('fabricante', 'ProductoFabricado')
    IngredientesProducto = apps.get_model('fabricante', 'IngredientesProducto')
    PresentacionProductoFabricado = apps.get_model('fabricante', 'PresentacionProductoFabricado')
    MovimientoEmpaquePresentacion = apps.get_model('fabricante', 'MovimientoEmpaquePresentacion')

    empresa, _ = Empresa.objects.get_or_create(
        nit='000000000',
        defaults={
            'razon_social': 'Empresa Principal',
            'nombre_comercial': 'Empresa Principal',
            'ambiente_facturacion': 'SANDBOX',
        },
    )

    Ingrediente.objects.filter(empresa__isnull=True).update(empresa=empresa)
    ProductoFabricado.objects.filter(empresa__isnull=True).update(empresa=empresa)

    for movimiento in InventarioIngredientes.objects.filter(empresa__isnull=True).select_related('ingrediente'):
        movimiento.empresa_id = movimiento.ingrediente.empresa_id or empresa.id
        movimiento.save(update_fields=['empresa'])

    for receta in IngredientesProducto.objects.filter(empresa__isnull=True).select_related('producto_fabricado'):
        receta.empresa_id = receta.producto_fabricado.empresa_id or empresa.id
        receta.save(update_fields=['empresa'])

    for presentacion in PresentacionProductoFabricado.objects.filter(empresa__isnull=True).select_related('producto_fabricado'):
        presentacion.empresa_id = presentacion.producto_fabricado.empresa_id or empresa.id
        presentacion.save(update_fields=['empresa'])

    for movimiento in MovimientoEmpaquePresentacion.objects.filter(empresa__isnull=True).select_related('presentacion'):
        movimiento.empresa_id = movimiento.presentacion.empresa_id or empresa.id
        movimiento.save(update_fields=['empresa'])


class Migration(migrations.Migration):

    dependencies = [
        ('empresa', '0002_backfill_empresa_principal'),
        ('fabricante', '0005_productofabricado_stock_fabricado_disponible_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='ingrediente',
            name='empresa',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name='ingredientes_fabricacion', to='empresa.empresa', verbose_name='empresa'),
        ),
        migrations.AddField(
            model_name='inventarioingredientes',
            name='empresa',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name='movimientos_ingredientes_fabricacion', to='empresa.empresa', verbose_name='empresa'),
        ),
        migrations.AddField(
            model_name='ingredientesproducto',
            name='empresa',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name='recetas_fabricacion', to='empresa.empresa', verbose_name='empresa'),
        ),
        migrations.AddField(
            model_name='movimientoempaquepresentacion',
            name='empresa',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name='movimientos_empaque_empresa', to='empresa.empresa', verbose_name='empresa'),
        ),
        migrations.AddField(
            model_name='presentacionproductofabricado',
            name='empresa',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name='presentaciones_fabricacion', to='empresa.empresa', verbose_name='empresa'),
        ),
        migrations.AddField(
            model_name='productofabricado',
            name='empresa',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name='productos_fabricados_empresa', to='empresa.empresa', verbose_name='empresa'),
        ),
        migrations.RunPython(backfill_fabricante_empresa, migrations.RunPython.noop),
        migrations.AddIndex(
            model_name='ingrediente',
            index=models.Index(fields=['empresa'], name='ingrediente_empresa_idx'),
        ),
        migrations.AddIndex(
            model_name='inventarioingredientes',
            index=models.Index(fields=['empresa'], name='inventarioi_empresa_idx'),
        ),
        migrations.AddIndex(
            model_name='ingredientesproducto',
            index=models.Index(fields=['empresa'], name='ingredientep_empresa_idx'),
        ),
        migrations.AddIndex(
            model_name='movimientoempaquepresentacion',
            index=models.Index(fields=['empresa'], name='movimientoe_empresa_idx'),
        ),
        migrations.AddIndex(
            model_name='presentacionproductofabricado',
            index=models.Index(fields=['empresa'], name='presentacio_empresa_idx'),
        ),
        migrations.AddIndex(
            model_name='productofabricado',
            index=models.Index(fields=['empresa'], name='productofab_empresa_idx'),
        ),
        migrations.AddConstraint(
            model_name='ingrediente',
            constraint=models.UniqueConstraint(fields=('empresa', 'nombre'), name='ingrediente_empresa_nombre_unique'),
        ),
        migrations.AddConstraint(
            model_name='presentacionproductofabricado',
            constraint=models.UniqueConstraint(fields=('empresa', 'producto_fabricado', 'nombre'), name='presentacion_empresa_producto_nombre_unique'),
        ),
        migrations.AddConstraint(
            model_name='productofabricado',
            constraint=models.UniqueConstraint(fields=('empresa', 'nombre'), name='producto_fabricado_empresa_nombre_unique'),
        ),
    ]
