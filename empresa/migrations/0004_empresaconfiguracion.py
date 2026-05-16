import empresa.models
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('empresa', '0003_empresausuario_rol_contador'),
    ]

    operations = [
        migrations.CreateModel(
            name='EmpresaConfiguracion',
            fields=[
                (
                    'id',
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name='ID',
                    ),
                ),
                (
                    'tema',
                    models.CharField(
                        choices=[('LIGHT', 'Claro'), ('DARK', 'Oscuro')],
                        default='LIGHT',
                        max_length=10,
                        verbose_name='tema',
                    ),
                ),
                (
                    'permitir_stock_negativo_ventas',
                    models.BooleanField(
                        default=False,
                        verbose_name='permitir stock negativo en ventas',
                    ),
                ),
                (
                    'atajos_ventas_activos',
                    models.BooleanField(
                        default=True,
                        verbose_name='atajos de ventas activos',
                    ),
                ),
                (
                    'atajos_ventas',
                    models.JSONField(
                        default=empresa.models.get_default_atajos_ventas,
                        verbose_name='atajos de ventas',
                    ),
                ),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                (
                    'empresa',
                    models.OneToOneField(
                        on_delete=models.deletion.CASCADE,
                        related_name='configuracion_operativa',
                        to='empresa.empresa',
                        verbose_name='empresa',
                    ),
                ),
            ],
            options={
                'verbose_name': 'configuracion de empresa',
                'verbose_name_plural': 'configuraciones de empresa',
                'db_table': 'empresas_configuracion',
            },
        ),
    ]
