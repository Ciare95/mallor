from django.db import connection
from django.db.models.signals import post_migrate
from django.dispatch import receiver

from cliente.models import Cliente


@receiver(post_migrate)
def asegurar_consumidor_final(sender, **kwargs):
    """
    Garantiza que exista el cliente por defecto tras las migraciones.
    """
    if sender.name != 'cliente':
        return

    if Cliente._meta.db_table not in connection.introspection.table_names():
        return

    Cliente.get_consumidor_final()
