from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('ventas', '0009_factura_entrega_soporte'),
    ]

    operations = [
        migrations.AddField(
            model_name='ventafacturaelectronica',
            name='qr_payload',
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.AddField(
            model_name='ventafacturaelectronica',
            name='qr_svg',
            field=models.TextField(blank=True),
        ),
    ]
