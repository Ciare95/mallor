from decimal import Decimal

from django.db.models.signals import post_delete, post_save, pre_save
from django.dispatch import receiver
from django.utils import timezone

from ventas.models import Abono, DetalleVenta, Venta


def _recalcular_totales_venta(venta_id):
    venta = Venta.objects.get(pk=venta_id)
    if venta.detalles.exists():
        venta.calcular_totales()
    else:
        venta.subtotal = Decimal('0.00')
        venta.impuestos = Decimal('0.00')
        venta.total = Decimal('0.00')
        venta.calcular_saldo_pendiente()

    venta.actualizar_estado_pago()
    Venta.objects.filter(pk=venta.pk).update(
        subtotal=venta.subtotal,
        impuestos=venta.impuestos,
        total=venta.total,
        total_abonado=venta.total_abonado,
        saldo_pendiente=venta.saldo_pendiente,
        estado_pago=venta.estado_pago,
        updated_at=timezone.now(),
    )


def _recalcular_pago_venta(venta_id):
    venta = Venta.objects.get(pk=venta_id)
    venta.actualizar_estado_pago()
    Venta.objects.filter(pk=venta.pk).update(
        total_abonado=venta.total_abonado,
        saldo_pendiente=venta.saldo_pendiente,
        estado_pago=venta.estado_pago,
        updated_at=timezone.now(),
    )


@receiver(pre_save, sender=Venta)
def preparar_venta_antes_de_guardar(sender, instance, **kwargs):
    """
    Aplica defaults y recalculos antes del guardado.
    """
    instance.preparar_para_guardado()


@receiver(pre_save, sender=DetalleVenta)
def capturar_estado_anterior_detalle(sender, instance, **kwargs):
    """
    Conserva el estado anterior para ajustar stock al actualizar.
    """
    if not instance.pk:
        instance._stock_snapshot = None
        return

    instance._stock_snapshot = DetalleVenta.objects.get(pk=instance.pk)


@receiver(post_save, sender=DetalleVenta)
def actualizar_stock_y_venta_al_guardar_detalle(
    sender,
    instance,
    created,
    **kwargs,
):
    """
    Actualiza el stock del producto y recalcula la venta.
    """
    detalle_anterior = getattr(instance, '_stock_snapshot', None)

    if created or detalle_anterior is None:
        instance.producto.actualizar_stock(-instance.cantidad)
    elif detalle_anterior.producto_id == instance.producto_id:
        diferencia = instance.cantidad - detalle_anterior.cantidad
        if diferencia:
            instance.producto.actualizar_stock(-diferencia)
    else:
        detalle_anterior.producto.actualizar_stock(detalle_anterior.cantidad)
        instance.producto.actualizar_stock(-instance.cantidad)

    _recalcular_totales_venta(instance.venta_id)


@receiver(post_delete, sender=DetalleVenta)
def restaurar_stock_y_venta_al_eliminar_detalle(sender, instance, **kwargs):
    """
    Restaura el stock del producto y recalcula la venta.
    """
    instance.producto.actualizar_stock(instance.cantidad)
    _recalcular_totales_venta(instance.venta_id)


@receiver(post_save, sender=Abono)
def actualizar_venta_al_guardar_abono(sender, instance, **kwargs):
    """
    Recalcula saldo pendiente y estado de pago de la venta.
    """
    _recalcular_pago_venta(instance.venta_id)
