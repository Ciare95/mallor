from decimal import Decimal

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('empresa', '0007_empresaconfiguracion_ticket_footer_text'),
        ('informes', '0003_cierrecaja_empresa_informe_empresa_and_more'),
        ('usuario', '0002_alter_usuario_email_alter_usuario_id'),
    ]

    operations = [
        migrations.CreateModel(
            name='GastoCaja',
            fields=[
                ('id', models.AutoField(primary_key=True, serialize=False)),
                ('fecha', models.DateField(help_text='Fecha en la que se realizo el gasto.', verbose_name='fecha')),
                ('descripcion', models.CharField(help_text='Detalle del gasto realizado.', max_length=255, verbose_name='descripcion')),
                ('monto', models.DecimalField(decimal_places=2, default=Decimal('0.00'), max_digits=12, verbose_name='monto')),
                ('metodo_pago', models.CharField(choices=[('EFECTIVO', 'Efectivo'), ('TRANSFERENCIA', 'Transferencia')], max_length=20, verbose_name='metodo de pago')),
                ('fecha_registro', models.DateTimeField(auto_now_add=True, verbose_name='fecha de registro')),
                ('fecha_actualizacion', models.DateTimeField(auto_now=True, verbose_name='fecha de actualizacion')),
                ('empresa', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name='gastos_caja', to='empresa.empresa', verbose_name='empresa')),
                ('usuario_registro', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name='gastos_caja_registrados', to='usuario.usuario', verbose_name='usuario que registro')),
            ],
            options={
                'verbose_name': 'gasto de caja',
                'verbose_name_plural': 'gastos de caja',
                'db_table': 'gastos_caja',
                'ordering': ['fecha', 'fecha_registro', 'id'],
            },
        ),
        migrations.AddIndex(
            model_name='gastocaja',
            index=models.Index(fields=['empresa', 'fecha'], name='gastos_caja_empresa_11aeb6_idx'),
        ),
        migrations.AddIndex(
            model_name='gastocaja',
            index=models.Index(fields=['fecha_registro'], name='gastos_caja_fecha_r_bfdf04_idx'),
        ),
        migrations.AddIndex(
            model_name='gastocaja',
            index=models.Index(fields=['metodo_pago'], name='gastos_caja_metodo__cb51ab_idx'),
        ),
    ]
