# Generated manually for Mallor Local LAN Offline V1.

import uuid

import django.db.models.deletion
import django.utils.timezone
from django.db import migrations, models


def populate_uuid(model_name):
    def _populate(apps, schema_editor):
        Model = apps.get_model('ventas', model_name)
        for obj in Model.objects.filter(uuid__isnull=True).iterator():
            obj.uuid = uuid.uuid4()
            obj.save(update_fields=['uuid'])

    return _populate


class Migration(migrations.Migration):

    dependencies = [
        ('offline', '0001_initial'),
        ('ventas', '0010_ventafacturaelectronica_qr_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='venta',
            name='uuid',
            field=models.UUIDField(editable=False, null=True),
        ),
        migrations.AddField(
            model_name='detalleventa',
            name='uuid',
            field=models.UUIDField(editable=False, null=True),
        ),
        migrations.AddField(
            model_name='abono',
            name='uuid',
            field=models.UUIDField(editable=False, null=True),
        ),
        migrations.RunPython(populate_uuid('Venta'), migrations.RunPython.noop),
        migrations.RunPython(populate_uuid('DetalleVenta'), migrations.RunPython.noop),
        migrations.RunPython(populate_uuid('Abono'), migrations.RunPython.noop),
        migrations.AlterField(
            model_name='venta',
            name='uuid',
            field=models.UUIDField(default=uuid.uuid4, editable=False, unique=True),
        ),
        migrations.AlterField(
            model_name='detalleventa',
            name='uuid',
            field=models.UUIDField(default=uuid.uuid4, editable=False, unique=True),
        ),
        migrations.AlterField(
            model_name='abono',
            name='uuid',
            field=models.UUIDField(default=uuid.uuid4, editable=False, unique=True),
        ),
        migrations.AddField(
            model_name='venta',
            name='terminal',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name='ventas',
                to='offline.posterminal',
                verbose_name='terminal POS',
            ),
        ),
        migrations.AddField(
            model_name='venta',
            name='caja_sesion',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name='ventas',
                to='offline.cajasesion',
                verbose_name='sesion de caja',
            ),
        ),
        migrations.AddField(
            model_name='venta',
            name='local_created_at',
            field=models.DateTimeField(
                default=django.utils.timezone.now,
                verbose_name='fecha local de creacion',
            ),
        ),
        migrations.AddField(
            model_name='venta',
            name='sync_status',
            field=models.CharField(
                choices=[
                    ('LOCAL_ONLY', 'Local only'),
                    ('PENDIENTE', 'Pendiente sincronizacion'),
                    ('SINCRONIZADA', 'Sincronizada'),
                    ('ERROR', 'Error sincronizacion'),
                ],
                default='LOCAL_ONLY',
                max_length=30,
                verbose_name='estado de sincronizacion',
            ),
        ),
        migrations.AddField(
            model_name='venta',
            name='invoice_status',
            field=models.CharField(
                choices=[
                    ('NO_REQUIERE', 'No requiere'),
                    ('PENDIENTE_FACTURACION', 'Pendiente facturacion'),
                    ('FACTURA_EMITIDA', 'Factura emitida'),
                    ('ERROR_FACTURACION', 'Error facturacion'),
                ],
                default='NO_REQUIERE',
                max_length=30,
                verbose_name='estado de facturacion offline',
            ),
        ),
        migrations.AddField(
            model_name='venta',
            name='cloud_id',
            field=models.CharField(blank=True, max_length=80, verbose_name='id en nube'),
        ),
        migrations.AddField(
            model_name='venta',
            name='prefactura_numero',
            field=models.CharField(
                blank=True,
                max_length=60,
                verbose_name='numero de prefactura',
            ),
        ),
        migrations.AddField(
            model_name='ventafacturaelectronica',
            name='offline_reason',
            field=models.CharField(blank=True, max_length=120),
        ),
        migrations.AlterField(
            model_name='ventafacturaelectronica',
            name='status',
            field=models.CharField(
                choices=[
                    ('PENDIENTE_FACTURACION', 'Pendiente facturacion'),
                    ('PENDIENTE_ENVIO', 'Pendiente de envio'),
                    ('EMITIDA', 'Emitida'),
                    ('ERROR', 'Error'),
                    ('ANULADA', 'Anulada'),
                ],
                default='PENDIENTE_ENVIO',
                max_length=30,
            ),
        ),
        migrations.AddIndex(
            model_name='venta',
            index=models.Index(fields=['uuid'], name='ventas_uuid_idx'),
        ),
        migrations.AddIndex(
            model_name='venta',
            index=models.Index(fields=['terminal'], name='ventas_terminal_idx'),
        ),
        migrations.AddIndex(
            model_name='venta',
            index=models.Index(fields=['caja_sesion'], name='ventas_caja_idx'),
        ),
        migrations.AddIndex(
            model_name='venta',
            index=models.Index(fields=['sync_status'], name='ventas_sync_idx'),
        ),
        migrations.AddIndex(
            model_name='venta',
            index=models.Index(fields=['invoice_status'], name='ventas_invoice_idx'),
        ),
        migrations.AddIndex(
            model_name='detalleventa',
            index=models.Index(fields=['uuid'], name='det_venta_uuid_idx'),
        ),
        migrations.AddIndex(
            model_name='abono',
            index=models.Index(fields=['uuid'], name='abonos_uuid_idx'),
        ),
    ]
