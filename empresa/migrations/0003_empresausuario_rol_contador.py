from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('empresa', '0002_backfill_empresa_principal'),
    ]

    operations = [
        migrations.AlterField(
            model_name='empresausuario',
            name='rol',
            field=models.CharField(
                choices=[
                    ('PROPIETARIO', 'Propietario'),
                    ('ADMIN', 'Administrador'),
                    ('CONTADOR', 'Contador'),
                    ('EMPLEADO', 'Empleado'),
                ],
                default='EMPLEADO',
                max_length=20,
                verbose_name='rol',
            ),
        ),
    ]
