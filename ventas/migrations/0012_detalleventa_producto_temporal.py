from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('inventario', '0013_abonofacturacompra_facturacompra_estado_pago_and_more'),
        ('ventas', '0011_local_offline_fields'),
    ]

    operations = [
        migrations.AlterField(
            model_name='detalleventa',
            name='producto',
            field=models.ForeignKey(
                blank=True,
                help_text='Producto vendido.',
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name='detalles_venta',
                to='inventario.producto',
                verbose_name='producto',
            ),
        ),
        migrations.AddField(
            model_name='detalleventa',
            name='producto_temporal_nombre',
            field=models.CharField(
                blank=True,
                help_text='Nombre del producto temporal registrado solo en la venta.',
                max_length=200,
                verbose_name='nombre de producto temporal',
            ),
        ),
    ]
