from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('empresa', '0004_empresaconfiguracion'),
    ]

    operations = [
        migrations.AddField(
            model_name='empresa',
            name='logo',
            field=models.ImageField(
                blank=True,
                null=True,
                upload_to='empresas/',
                verbose_name='logo',
            ),
        ),
    ]
