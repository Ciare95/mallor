# Generated manually for Mallor Local LAN Offline V1.

import uuid

from django.db import migrations, models


def populate_cliente_uuid(apps, schema_editor):
    Cliente = apps.get_model('cliente', 'Cliente')
    for cliente in Cliente.objects.filter(uuid__isnull=True).iterator():
        cliente.uuid = uuid.uuid4()
        cliente.save(update_fields=['uuid'])


class Migration(migrations.Migration):

    dependencies = [
        ('cliente', '0005_remove_cliente_cliente_tipo_numero_documento_unique_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='cliente',
            name='uuid',
            field=models.UUIDField(editable=False, null=True),
        ),
        migrations.RunPython(populate_cliente_uuid, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='cliente',
            name='uuid',
            field=models.UUIDField(default=uuid.uuid4, editable=False, unique=True),
        ),
        migrations.AddIndex(
            model_name='cliente',
            index=models.Index(fields=['uuid'], name='clientes_uuid_idx'),
        ),
    ]
