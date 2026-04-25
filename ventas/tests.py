from decimal import Decimal

from django.test import TestCase
from django.core.exceptions import ValidationError

from cliente.models import Cliente
from core.exceptions import AbonoNoPermitidoError, VentaNoCancelableError
from inventario.models import HistorialInventario, Producto
from usuario.models import Usuario
from ventas.models import Abono, DetalleVenta, Venta
from ventas.serializers import (
    AbonoCreateSerializer,
    DetalleVentaSerializer,
    VentaCreateSerializer,
    VentaSerializer,
)
from ventas.services import AbonoService, VentaReporteService, VentaService


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


class VentaSerializerTest(TestCase):
    def setUp(self):
        self.usuario = Usuario.objects.create_user(
            username='serializador',
            email='serializador@example.com',
            password='password-seguro-123',
        )
        self.cliente = Cliente.objects.create(
            tipo_documento=Cliente.TipoDocumento.CC,
            numero_documento='44556677',
            nombre='Cliente Serializer',
            telefono='3001112233',
            direccion='Carrera 10 # 20-30',
            ciudad='Bogota',
            departamento='Cundinamarca',
            tipo_cliente=Cliente.TipoCliente.NATURAL,
        )
        self.producto = Producto.objects.create(
            nombre='Producto Serializer',
            existencias=Decimal('15.00'),
            precio_compra=Decimal('60.00'),
            precio_venta=Decimal('120.00'),
            iva=Decimal('19.00'),
        )

    def test_detalle_venta_serializer_retorna_producto_anidado(self):
        venta = Venta.objects.create(
            cliente=self.cliente,
            estado=Venta.Estado.TERMINADA,
            usuario_registro=self.usuario,
        )
        detalle = DetalleVenta.objects.create(
            venta=venta,
            producto=self.producto,
            cantidad=Decimal('1.00'),
            precio_unitario=Decimal('120.00'),
        )

        serializer = DetalleVentaSerializer(detalle)

        self.assertEqual(serializer.data['producto']['id'], self.producto.id)
        self.assertEqual(serializer.data['producto']['nombre'], self.producto.nombre)
        self.assertEqual(serializer.data['subtotal'], '120.00')
        self.assertEqual(serializer.data['iva'], '22.80')

    def test_venta_create_serializer_asigna_consumidor_final_y_calcula_totales(self):
        serializer = VentaCreateSerializer(data={
            'estado': Venta.Estado.TERMINADA,
            'metodo_pago': Venta.MetodoPago.EFECTIVO,
            'usuario_registro': self.usuario.id,
            'detalles': [
                {
                    'producto': self.producto.id,
                    'cantidad': '2.00',
                }
            ],
        })

        self.assertTrue(serializer.is_valid(), serializer.errors)
        venta = serializer.save()

        venta.refresh_from_db()
        self.producto.refresh_from_db()

        self.assertEqual(venta.cliente.nombre, 'Consumidor Final')
        self.assertEqual(venta.subtotal, Decimal('240.00'))
        self.assertEqual(venta.impuestos, Decimal('45.60'))
        self.assertEqual(venta.total, Decimal('285.60'))
        self.assertEqual(self.producto.existencias, Decimal('13.00'))

    def test_venta_create_serializer_requiere_al_menos_un_detalle(self):
        serializer = VentaCreateSerializer(data={
            'estado': Venta.Estado.TERMINADA,
            'metodo_pago': Venta.MetodoPago.EFECTIVO,
            'usuario_registro': self.usuario.id,
            'detalles': [],
        })

        self.assertFalse(serializer.is_valid())
        self.assertIn('detalles', serializer.errors)

    def test_venta_create_serializer_valida_stock_disponible(self):
        serializer = VentaCreateSerializer(data={
            'cliente': self.cliente.id,
            'estado': Venta.Estado.TERMINADA,
            'metodo_pago': Venta.MetodoPago.EFECTIVO,
            'usuario_registro': self.usuario.id,
            'detalles': [
                {
                    'producto': self.producto.id,
                    'cantidad': '20.00',
                }
            ],
        })

        self.assertFalse(serializer.is_valid())
        self.assertIn('detalles', serializer.errors)

    def test_venta_serializer_retorna_detalles_anidados(self):
        venta = Venta.objects.create(
            cliente=self.cliente,
            estado=Venta.Estado.TERMINADA,
            usuario_registro=self.usuario,
        )
        DetalleVenta.objects.create(
            venta=venta,
            producto=self.producto,
            cantidad=Decimal('1.00'),
            precio_unitario=Decimal('120.00'),
        )

        serializer = VentaSerializer(venta)

        self.assertEqual(serializer.data['cliente']['id'], self.cliente.id)
        self.assertEqual(len(serializer.data['detalles']), 1)
        self.assertEqual(serializer.data['detalles_count'], 1)

    def test_abono_create_serializer_actualiza_estado_pago(self):
        venta = Venta.objects.create(
            cliente=self.cliente,
            subtotal=Decimal('100.00'),
            impuestos=Decimal('0.00'),
            total=Decimal('100.00'),
            estado=Venta.Estado.TERMINADA,
            usuario_registro=self.usuario,
        )
        serializer = AbonoCreateSerializer(data={
            'venta': venta.id,
            'monto_abonado': '30.00',
            'metodo_pago': Abono.MetodoPago.EFECTIVO,
            'usuario_registro': self.usuario.id,
        })

        self.assertTrue(serializer.is_valid(), serializer.errors)
        serializer.save()
        venta.refresh_from_db()

        self.assertEqual(venta.total_abonado, Decimal('30.00'))
        self.assertEqual(venta.saldo_pendiente, Decimal('70.00'))
        self.assertEqual(venta.estado_pago, Venta.EstadoPago.PARCIAL)

    def test_abono_create_serializer_rechaza_venta_no_terminada(self):
        venta = Venta.objects.create(
            cliente=self.cliente,
            subtotal=Decimal('100.00'),
            impuestos=Decimal('0.00'),
            total=Decimal('100.00'),
            estado=Venta.Estado.PENDIENTE,
            usuario_registro=self.usuario,
        )
        serializer = AbonoCreateSerializer(data={
            'venta': venta.id,
            'monto_abonado': '10.00',
            'metodo_pago': Abono.MetodoPago.EFECTIVO,
            'usuario_registro': self.usuario.id,
        })

        self.assertFalse(serializer.is_valid())
        self.assertIn('venta', serializer.errors)


class VentaServiceTest(TestCase):
    def setUp(self):
        self.usuario = Usuario.objects.create_user(
            username='servicios',
            email='servicios@example.com',
            password='password-seguro-123',
        )
        self.cliente = Cliente.objects.create(
            tipo_documento=Cliente.TipoDocumento.CC,
            numero_documento='99887766',
            nombre='Cliente Servicios',
            telefono='3004445566',
            direccion='Calle 1 # 2-3',
            ciudad='Bogota',
            departamento='Cundinamarca',
            tipo_cliente=Cliente.TipoCliente.NATURAL,
        )
        self.producto = Producto.objects.create(
            nombre='Producto Servicio',
            existencias=Decimal('10.00'),
            precio_compra=Decimal('45.00'),
            precio_venta=Decimal('100.00'),
            iva=Decimal('19.00'),
        )

    def test_crear_venta_service_registra_historial_y_descuenta_stock(self):
        venta = VentaService.crear_venta(
            data={
                'cliente': self.cliente,
                'estado': Venta.Estado.TERMINADA,
                'metodo_pago': Venta.MetodoPago.EFECTIVO,
                'observaciones': 'Venta desde servicio',
                'detalles': [
                    {
                        'producto': self.producto,
                        'cantidad': Decimal('3.00'),
                    }
                ],
            },
            usuario=self.usuario,
        )

        self.producto.refresh_from_db()
        historial = HistorialInventario.objects.get(venta=venta)

        self.assertEqual(venta.detalles.count(), 1)
        self.assertEqual(self.producto.existencias, Decimal('7.00'))
        self.assertEqual(venta.total, Decimal('357.00'))
        self.assertEqual(
            historial.tipo_movimiento,
            HistorialInventario.TIPO_SALIDA,
        )
        self.assertEqual(historial.cantidad, Decimal('-3.00'))

    def test_actualizar_venta_service_reemplaza_detalles_y_recalcula_stock(self):
        venta = VentaService.crear_venta(
            data={
                'cliente': self.cliente,
                'estado': Venta.Estado.TERMINADA,
                'metodo_pago': Venta.MetodoPago.EFECTIVO,
                'detalles': [
                    {
                        'producto': self.producto,
                        'cantidad': Decimal('2.00'),
                    }
                ],
            },
            usuario=self.usuario,
        )

        venta = VentaService.actualizar_venta(
            venta_id=venta.id,
            data={
                'descuento': Decimal('10.00'),
                'observaciones': 'Actualizada desde servicio',
                'detalles': [
                    {
                        'producto': self.producto,
                        'cantidad': Decimal('4.00'),
                        'precio_unitario': Decimal('100.00'),
                    }
                ],
            },
            usuario=self.usuario,
        )

        self.producto.refresh_from_db()

        self.assertEqual(self.producto.existencias, Decimal('6.00'))
        self.assertEqual(venta.subtotal, Decimal('400.00'))
        self.assertEqual(venta.impuestos, Decimal('76.00'))
        self.assertEqual(venta.total, Decimal('466.00'))
        self.assertEqual(
            HistorialInventario.objects.filter(
                producto=self.producto,
            ).count(),
            3,
        )

    def test_cancelar_venta_service_restaura_stock_y_marca_estado(self):
        venta = VentaService.crear_venta(
            data={
                'cliente': self.cliente,
                'estado': Venta.Estado.TERMINADA,
                'metodo_pago': Venta.MetodoPago.EFECTIVO,
                'detalles': [
                    {
                        'producto': self.producto,
                        'cantidad': Decimal('2.00'),
                    }
                ],
            },
            usuario=self.usuario,
        )

        venta = VentaService.cancelar_venta(
            venta_id=venta.id,
            motivo='Cliente desistió',
            usuario=self.usuario,
        )

        self.producto.refresh_from_db()

        self.assertEqual(self.producto.existencias, Decimal('10.00'))
        self.assertEqual(venta.estado, Venta.Estado.CANCELADA)
        self.assertIn('Cliente desistió', venta.observaciones)
        self.assertEqual(
            HistorialInventario.objects.filter(
                producto=self.producto,
            ).count(),
            2,
        )

    def test_cancelar_venta_service_rechaza_ventas_con_abonos(self):
        venta = Venta.objects.create(
            cliente=self.cliente,
            subtotal=Decimal('100.00'),
            impuestos=Decimal('0.00'),
            total=Decimal('100.00'),
            estado=Venta.Estado.TERMINADA,
            usuario_registro=self.usuario,
        )
        Abono.objects.create(
            venta=venta,
            monto_abonado=Decimal('20.00'),
            metodo_pago=Abono.MetodoPago.EFECTIVO,
            usuario_registro=self.usuario,
        )

        with self.assertRaises(VentaNoCancelableError):
            VentaService.cancelar_venta(
                venta_id=venta.id,
                motivo='No debe cancelar',
                usuario=self.usuario,
            )

    def test_registrar_abono_service_actualiza_cartera(self):
        venta = Venta.objects.create(
            cliente=self.cliente,
            subtotal=Decimal('100.00'),
            impuestos=Decimal('0.00'),
            total=Decimal('100.00'),
            estado=Venta.Estado.TERMINADA,
            usuario_registro=self.usuario,
        )

        AbonoService.registrar_abono(
            venta_id=venta.id,
            data={
                'monto_abonado': Decimal('30.00'),
                'metodo_pago': Abono.MetodoPago.EFECTIVO,
            },
            usuario=self.usuario,
        )

        venta.refresh_from_db()
        cuentas = AbonoService.obtener_cuentas_por_cobrar()

        self.assertEqual(venta.estado_pago, Venta.EstadoPago.PARCIAL)
        self.assertEqual(venta.saldo_pendiente, Decimal('70.00'))
        self.assertEqual(len(cuentas), 1)
        self.assertEqual(
            AbonoService.calcular_total_por_cobrar(),
            Decimal('70.00'),
        )

    def test_registrar_abono_service_rechaza_exceso_de_saldo(self):
        venta = Venta.objects.create(
            cliente=self.cliente,
            subtotal=Decimal('100.00'),
            impuestos=Decimal('0.00'),
            total=Decimal('100.00'),
            estado=Venta.Estado.TERMINADA,
            usuario_registro=self.usuario,
        )

        with self.assertRaises(AbonoNoPermitidoError):
            AbonoService.registrar_abono(
                venta_id=venta.id,
                data={
                    'monto_abonado': Decimal('120.00'),
                    'metodo_pago': Abono.MetodoPago.EFECTIVO,
                },
                usuario=self.usuario,
            )

    def test_reporte_service_calcula_estadisticas_excluyendo_canceladas(self):
        venta_activa = VentaService.crear_venta(
            data={
                'cliente': self.cliente,
                'estado': Venta.Estado.TERMINADA,
                'metodo_pago': Venta.MetodoPago.EFECTIVO,
                'detalles': [
                    {
                        'producto': self.producto,
                        'cantidad': Decimal('1.00'),
                    }
                ],
            },
            usuario=self.usuario,
        )
        venta_cancelada = VentaService.crear_venta(
            data={
                'cliente': self.cliente,
                'estado': Venta.Estado.TERMINADA,
                'metodo_pago': Venta.MetodoPago.EFECTIVO,
                'detalles': [
                    {
                        'producto': self.producto,
                        'cantidad': Decimal('1.00'),
                    }
                ],
            },
            usuario=self.usuario,
        )
        VentaService.cancelar_venta(
            venta_id=venta_cancelada.id,
            motivo='Anulada para reporte',
            usuario=self.usuario,
        )

        estadisticas = VentaReporteService.calcular_estadisticas_ventas('hoy')
        ventas_periodo = VentaReporteService.ventas_por_periodo(
            fecha_inicio=venta_activa.fecha_venta.date(),
            fecha_fin=venta_activa.fecha_venta.date(),
        )
        ventas_producto = VentaReporteService.ventas_por_producto(
            producto_id=self.producto.id,
        )

        self.assertEqual(estadisticas['total_ventas'], 1)
        self.assertEqual(estadisticas['ingresos'], Decimal('119.00'))
        self.assertEqual(estadisticas['unidades_vendidas'], Decimal('1.00'))
        self.assertEqual(len(ventas_periodo), 1)
        self.assertEqual(len(ventas_producto), 1)
