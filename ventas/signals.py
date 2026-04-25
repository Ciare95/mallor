from django.db.models.signals import pre_save
from django.dispatch import receiver

from ventas.models import Venta


@receiver(pre_save, sender=Venta)
def preparar_venta_antes_de_guardar(sender, instance, **kwargs):
    """
    Aplica defaults y recalculos antes del guardado.
    """
    instance.preparar_para_guardado()
