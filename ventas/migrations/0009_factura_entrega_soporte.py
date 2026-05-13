from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('empresa', '0003_empresausuario_rol_contador'),
        ('ventas', '0008_encrypt_factus_credentials'),
    ]

    operations = [
        migrations.CreateModel(
            name='FacturaElectronicaSoporte',
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
                    'tipo',
                    models.CharField(
                        choices=[
                            ('PDF', 'PDF'),
                            ('XML', 'XML'),
                            ('OTRO', 'Otro'),
                        ],
                        max_length=20,
                    ),
                ),
                ('filename', models.CharField(max_length=255)),
                ('content_type', models.CharField(blank=True, max_length=100)),
                ('content', models.BinaryField(blank=True, default=bytes)),
                ('metadata', models.JSONField(blank=True, default=dict)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                (
                    'empresa',
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name='factura_soportes',
                        to='empresa.empresa',
                        verbose_name='empresa',
                    ),
                ),
                (
                    'factura',
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name='soportes',
                        to='ventas.ventafacturaelectronica',
                    ),
                ),
            ],
            options={
                'verbose_name': 'soporte de factura electronica',
                'verbose_name_plural': 'soportes de facturas electronicas',
                'db_table': 'factura_electronica_soportes',
            },
        ),
        migrations.CreateModel(
            name='FacturaElectronicaEntrega',
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
                    'medio',
                    models.CharField(
                        choices=[
                            ('EMAIL', 'Email'),
                            ('DESCARGA', 'Descarga'),
                            ('IMPRESION', 'Impresion'),
                            ('OTRO', 'Otro'),
                            ('SIN_MEDIO', 'Sin medio'),
                        ],
                        max_length=20,
                    ),
                ),
                ('destino', models.CharField(blank=True, max_length=255)),
                (
                    'resultado',
                    models.CharField(
                        choices=[
                            ('EXITOSO', 'Exitoso'),
                            ('FALLIDO', 'Fallido'),
                            ('PENDIENTE', 'Pendiente'),
                        ],
                        default='PENDIENTE',
                        max_length=20,
                    ),
                ),
                ('mensaje', models.TextField(blank=True)),
                ('metadata', models.JSONField(blank=True, default=dict)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                (
                    'empresa',
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name='factura_entregas',
                        to='empresa.empresa',
                        verbose_name='empresa',
                    ),
                ),
                (
                    'factura',
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name='entregas',
                        to='ventas.ventafacturaelectronica',
                    ),
                ),
                (
                    'usuario',
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name='factura_entregas',
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                'verbose_name': 'entrega de factura electronica',
                'verbose_name_plural': 'entregas de facturas electronicas',
                'db_table': 'factura_electronica_entregas',
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='facturaelectronicasoporte',
            index=models.Index(fields=['empresa'], name='factura_ele_empresa_764e49_idx'),
        ),
        migrations.AddIndex(
            model_name='facturaelectronicasoporte',
            index=models.Index(fields=['factura'], name='factura_ele_factura_de3213_idx'),
        ),
        migrations.AddIndex(
            model_name='facturaelectronicasoporte',
            index=models.Index(fields=['tipo'], name='factura_ele_tipo_846930_idx'),
        ),
        migrations.AddConstraint(
            model_name='facturaelectronicasoporte',
            constraint=models.UniqueConstraint(
                fields=('factura', 'tipo'),
                name='factura_soporte_tipo_unique',
            ),
        ),
        migrations.AddIndex(
            model_name='facturaelectronicaentrega',
            index=models.Index(fields=['empresa'], name='factura_ele_empresa_22a820_idx'),
        ),
        migrations.AddIndex(
            model_name='facturaelectronicaentrega',
            index=models.Index(fields=['factura'], name='factura_ele_factura_ea3b0c_idx'),
        ),
        migrations.AddIndex(
            model_name='facturaelectronicaentrega',
            index=models.Index(fields=['medio'], name='factura_ele_medio_cb4ad0_idx'),
        ),
        migrations.AddIndex(
            model_name='facturaelectronicaentrega',
            index=models.Index(fields=['resultado'], name='factura_ele_resulta_2a89d4_idx'),
        ),
        migrations.AddIndex(
            model_name='facturaelectronicaentrega',
            index=models.Index(fields=['created_at'], name='factura_ele_created_d187e7_idx'),
        ),
    ]
