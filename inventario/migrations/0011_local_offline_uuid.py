# Generated manually for Mallor Local LAN Offline V1.

import uuid

from django.db import migrations, models


def populate_producto_uuid(apps, schema_editor):
    Producto = apps.get_model('inventario', 'Producto')
    for producto in Producto.objects.filter(uuid__isnull=True).iterator():
        producto.uuid = uuid.uuid4()
        producto.save(update_fields=['uuid'])


def populate_historial_uuid(apps, schema_editor):
    HistorialInventario = apps.get_model('inventario', 'HistorialInventario')
    for movimiento in HistorialInventario.objects.filter(uuid__isnull=True).iterator():
        movimiento.uuid = uuid.uuid4()
        movimiento.save(update_fields=['uuid'])


class Migration(migrations.Migration):

    dependencies = [
        ('inventario', '0010_producto_stock_minimo'),
    ]

    operations = [
        migrations.AddField(
            model_name='producto',
            name='uuid',
            field=models.UUIDField(editable=False, null=True),
        ),
        migrations.AddField(
            model_name='historialinventario',
            name='uuid',
            field=models.UUIDField(editable=False, null=True),
        ),
        migrations.AddField(
            model_name='historialinventario',
            name='idempotency_key',
            field=models.CharField(blank=True, max_length=160, null=True, unique=True),
        ),
        migrations.RunPython(populate_producto_uuid, migrations.RunPython.noop),
        migrations.RunPython(populate_historial_uuid, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='producto',
            name='uuid',
            field=models.UUIDField(default=uuid.uuid4, editable=False, unique=True),
        ),
        migrations.AlterField(
            model_name='historialinventario',
            name='uuid',
            field=models.UUIDField(default=uuid.uuid4, editable=False, unique=True),
        ),
        migrations.AddIndex(
            model_name='producto',
            index=models.Index(fields=['uuid'], name='productos_uuid_idx'),
        ),
        migrations.AddIndex(
            model_name='historialinventario',
            index=models.Index(fields=['uuid'], name='hist_inv_uuid_idx'),
        ),
    ]
