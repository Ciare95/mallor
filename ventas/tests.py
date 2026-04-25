from decimal import Decimal

from django.test import TestCase

from cliente.models import Cliente
from usuario.models import Usuario
from ventas.models import Venta


class VentaModelTest(TestCase):
    def setUp(self):
        self.usuario = Usuario.objects.create_user(
            username='cajero',
            email='cajero@example.com',
            password='password-seguro-123',
        )

    def test_venta_asigna_consumidor_final_y_numero(self):
        venta = Venta.objects.create(
            subtotal=Decimal('100.00'),
            impuestos=Decimal('19.00'),
            total=Decimal('119.00'),
            estado=Venta.Estado.TERMINADA,
            usuario_registro=self.usuario,
        )

        self.assertTrue(venta.numero_venta.startswith('V-'))
        self.assertEqual(
            venta.cliente.nombre,
            'Consumidor Final',
        )
        self.assertEqual(
            venta.saldo_pendiente,
            Decimal('119.00'),
        )
        self.assertEqual(
            venta.estado_pago,
            Venta.EstadoPago.PENDIENTE,
        )

    def test_actualizar_estado_pago_marca_parcial_y_pagada(self):
        cliente = Cliente.get_consumidor_final()
        venta = Venta.objects.create(
            cliente=cliente,
            subtotal=Decimal('100.00'),
            impuestos=Decimal('0.00'),
            total=Decimal('100.00'),
            total_abonado=Decimal('40.00'),
            estado=Venta.Estado.TERMINADA,
            usuario_registro=self.usuario,
        )

        self.assertEqual(venta.estado_pago, Venta.EstadoPago.PARCIAL)
        self.assertEqual(venta.saldo_pendiente, Decimal('60.00'))

        venta.total_abonado = Decimal('100.00')
        venta.save()

        self.assertEqual(venta.estado_pago, Venta.EstadoPago.PAGADA)
        self.assertEqual(venta.saldo_pendiente, Decimal('0.00'))

    def test_puede_facturar_valida_condiciones_minimas(self):
        venta = Venta.objects.create(
            subtotal=Decimal('150.00'),
            impuestos=Decimal('0.00'),
            total=Decimal('150.00'),
            estado=Venta.Estado.TERMINADA,
            factura_electronica=True,
            usuario_registro=self.usuario,
        )

        self.assertTrue(venta.puede_facturar())

        venta.numero_factura_electronica = 'FE-1001'
        venta.save()

        self.assertFalse(venta.puede_facturar())
