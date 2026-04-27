from decimal import Decimal

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('inventario', '0005_historialinventario'),
    ]

    operations = [
        migrations.AddField(
            model_name='detallefacturacompra',
            name='precio_venta_sugerido',
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                help_text='Precio de venta que se aplicarÃ¡ al procesar la factura',
                max_digits=12,
                null=True,
                verbose_name='precio de venta sugerido',
            ),
        ),
    ]
