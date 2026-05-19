from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('inventario', '0011_local_offline_uuid'),
    ]

    operations = [
        migrations.AddField(
            model_name='producto',
            name='es_producto_especial',
            field=models.BooleanField(
                default=False,
                help_text=(
                    'Permite vender el producto con precio variable sin '
                    'afectar stock.'
                ),
                verbose_name='producto especial',
            ),
        ),
        migrations.AddIndex(
            model_name='producto',
            index=models.Index(
                fields=['es_producto_especial'],
                name='productos_es_prod_5b0d43_idx',
            ),
        ),
    ]
