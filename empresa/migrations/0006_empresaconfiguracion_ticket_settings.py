from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('empresa', '0005_empresa_logo'),
    ]

    operations = [
        migrations.AddField(
            model_name='empresaconfiguracion',
            name='ticket_copies',
            field=models.PositiveSmallIntegerField(
                default=1,
                verbose_name='copias de tirilla',
            ),
        ),
        migrations.AddField(
            model_name='empresaconfiguracion',
            name='ticket_paper_width',
            field=models.CharField(
                choices=[('58', '58 mm'), ('80', '80 mm')],
                default='80',
                max_length=2,
                verbose_name='ancho de papel para tirilla',
            ),
        ),
        migrations.AddField(
            model_name='empresaconfiguracion',
            name='ticket_show_logo',
            field=models.BooleanField(
                default=True,
                verbose_name='mostrar logo en tirilla',
            ),
        ),
    ]
