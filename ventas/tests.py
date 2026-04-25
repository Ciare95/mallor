from decimal import Decimal

from django.test import TestCase
from django.core.exceptions import ValidationError

from cliente.models import Cliente
from inventario.models import Producto
from usuario.models import Usuario
from ventas.models import Abono, DetalleVenta, Venta


class VentaModelTest(TestCase):
    def setUp(self):
        self.usuario = Usuario.objects.create_user(
            username='cajero',
            email='cajero@example.com',
            password='password-seguro-123',
        )
        self.producto = Producto.objects.create(
            nombre='Producto Test',
            existencias=Decimal('20.00'),
            precio_compra=Decimal('50.00'),
            precio_venta=Decimal('100.00'),
            iva=Decimal('19.00'),
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
            estado=Venta.Estado.TERMINADA,
            usuario_registro=self.usuario,
        )

        Abono.objects.create(
            venta=venta,
            monto_abonado=Decimal('40.00'),
            metodo_pago=Abono.MetodoPago.EFECTIVO,
            usuario_registro=self.usuario,
        )

        venta.refresh_from_db()

        self.assertEqual(venta.estado_pago, Venta.EstadoPago.PARCIAL)
        self.assertEqual(venta.saldo_pendiente, Decimal('60.00'))

        Abono.objects.create(
            venta=venta,
            monto_abonado=Decimal('60.00'),
            metodo_pago=Abono.MetodoPago.TARJETA,
            usuario_registro=self.usuario,
        )
        venta.refresh_from_db()

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


class DetalleVentaModelTest(TestCase):
    def setUp(self):
        self.usuario = Usuario.objects.create_user(
            username='vendedor',
            email='vendedor@example.com',
            password='password-seguro-123',
        )
        self.cliente = Cliente.get_consumidor_final()
        self.producto = Producto.objects.create(
            nombre='Producto Detalle',
            existencias=Decimal('10.00'),
            precio_compra=Decimal('40.00'),
            precio_venta=Decimal('100.00'),
            iva=Decimal('19.00'),
        )
        self.venta = Venta.objects.create(
            cliente=self.cliente,
            estado=Venta.Estado.TERMINADA,
            usuario_registro=self.usuario,
        )

    def test_crear_detalle_actualiza_stock_y_totales(self):
        detalle = DetalleVenta.objects.create(
            venta=self.venta,
            producto=self.producto,
            cantidad=Decimal('2.00'),
            precio_unitario=Decimal('100.00'),
        )

        self.producto.refresh_from_db()
        self.venta.refresh_from_db()

        self.assertEqual(detalle.subtotal, Decimal('200.00'))
        self.assertEqual(detalle.iva, Decimal('38.00'))
        self.assertEqual(detalle.total, Decimal('238.00'))
        self.assertEqual(self.producto.existencias, Decimal('8.00'))
        self.assertEqual(self.venta.subtotal, Decimal('200.00'))
        self.assertEqual(self.venta.impuestos, Decimal('38.00'))
        self.assertEqual(self.venta.total, Decimal('238.00'))

    def test_eliminar_detalle_restaura_stock_y_recalcula_venta(self):
        detalle = DetalleVenta.objects.create(
            venta=self.venta,
            producto=self.producto,
            cantidad=Decimal('3.00'),
            precio_unitario=Decimal('100.00'),
        )

        detalle.delete()
        self.producto.refresh_from_db()
        self.venta.refresh_from_db()

        self.assertEqual(self.producto.existencias, Decimal('10.00'))
        self.assertEqual(self.venta.subtotal, Decimal('0.00'))
        self.assertEqual(self.venta.impuestos, Decimal('0.00'))
        self.assertEqual(self.venta.total, Decimal('0.00'))

    def test_actualizar_detalle_ajusta_stock_por_diferencia(self):
        detalle = DetalleVenta.objects.create(
            venta=self.venta,
            producto=self.producto,
            cantidad=Decimal('2.00'),
            precio_unitario=Decimal('100.00'),
        )

        detalle.cantidad = Decimal('4.00')
        detalle.save()

        self.producto.refresh_from_db()
        self.venta.refresh_from_db()

        self.assertEqual(self.producto.existencias, Decimal('6.00'))
        self.assertEqual(self.venta.subtotal, Decimal('400.00'))
        self.assertEqual(self.venta.impuestos, Decimal('76.00'))
        self.assertEqual(self.venta.total, Decimal('476.00'))


class AbonoModelTest(TestCase):
    def setUp(self):
        self.usuario = Usuario.objects.create_user(
            username='cobrador',
            email='cobrador@example.com',
            password='password-seguro-123',
        )
        self.cliente = Cliente.get_consumidor_final()
        self.venta = Venta.objects.create(
            cliente=self.cliente,
            subtotal=Decimal('100.00'),
            impuestos=Decimal('0.00'),
            total=Decimal('100.00'),
            estado=Venta.Estado.TERMINADA,
            usuario_registro=self.usuario,
        )

    def test_crear_abono_actualiza_estado_pago_y_saldo(self):
        Abono.objects.create(
            venta=self.venta,
            monto_abonado=Decimal('40.00'),
            metodo_pago=Abono.MetodoPago.EFECTIVO,
            usuario_registro=self.usuario,
        )

        self.venta.refresh_from_db()

        self.assertEqual(self.venta.total_abonado, Decimal('40.00'))
        self.assertEqual(self.venta.saldo_pendiente, Decimal('60.00'))
        self.assertEqual(self.venta.estado_pago, Venta.EstadoPago.PARCIAL)

    def test_abono_completo_marca_venta_pagada(self):
        Abono.objects.create(
            venta=self.venta,
            monto_abonado=Decimal('100.00'),
            metodo_pago=Abono.MetodoPago.TRANSFERENCIA,
            referencia_pago='TX-100',
            usuario_registro=self.usuario,
        )

        self.venta.refresh_from_db()

        self.assertEqual(self.venta.total_abonado, Decimal('100.00'))
        self.assertEqual(self.venta.saldo_pendiente, Decimal('0.00'))
        self.assertEqual(self.venta.estado_pago, Venta.EstadoPago.PAGADA)

    def test_validar_monto_rechaza_exceso_de_saldo(self):
        with self.assertRaises(ValidationError):
            abono = Abono(
                venta=self.venta,
                monto_abonado=Decimal('120.00'),
                metodo_pago=Abono.MetodoPago.TARJETA,
                usuario_registro=self.usuario,
            )
            abono.full_clean()

    def test_no_permite_abonos_a_venta_cancelada(self):
        self.venta.estado = Venta.Estado.CANCELADA
        self.venta.save()

        with self.assertRaises(ValidationError):
            abono = Abono(
                venta=self.venta,
                monto_abonado=Decimal('20.00'),
                metodo_pago=Abono.MetodoPago.EFECTIVO,
                usuario_registro=self.usuario,
            )
            abono.full_clean()

    def test_no_permite_abonos_a_venta_pendiente(self):
        self.venta.estado = Venta.Estado.PENDIENTE
        self.venta.save()

        with self.assertRaises(ValidationError):
            abono = Abono(
                venta=self.venta,
                monto_abonado=Decimal('20.00'),
                metodo_pago=Abono.MetodoPago.EFECTIVO,
                usuario_registro=self.usuario,
            )
            abono.full_clean()
