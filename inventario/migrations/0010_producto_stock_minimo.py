from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('inventario', '0009_categoria_empresa_detallefacturacompra_empresa_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='producto',
            name='stock_minimo',
            field=models.DecimalField(
                decimal_places=2,
                default=10,
                help_text='Cantidad minima esperada antes de considerar bajo stock',
                max_digits=10,
                verbose_name='stock minimo',
            ),
        ),
        migrations.AddIndex(
            model_name='producto',
            index=models.Index(fields=['stock_minimo'], name='productos_stock_m_8a5f6e_idx'),
        ),
    ]
