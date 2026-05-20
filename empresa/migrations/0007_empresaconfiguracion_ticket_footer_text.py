from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('empresa', '0006_empresaconfiguracion_ticket_settings'),
    ]

    operations = [
        migrations.AddField(
            model_name='empresaconfiguracion',
            name='ticket_footer_text',
            field=models.TextField(
                blank=True,
                default='',
                verbose_name='texto final de tirilla',
            ),
        ),
    ]
