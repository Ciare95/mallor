from decimal import Decimal

from django.test import TestCase, override_settings

from cliente.models import Cliente
from empresa.context import reset_empresa_actual, set_empresa_actual
from empresa.models import Empresa
from inventario.models import HistorialInventario, Producto
from offline.models import CajaSesion, LocalConfig, POSTerminal, SyncOutbox
from offline.services import OfflineService
from usuario.models import Usuario
from ventas.models import Venta, VentaFacturaElectronica
from ventas.services import VentaService


@override_settings(MALLOR_MODE='local', MALLOR_LOCAL_SERVER=True)
class LocalOfflineVentaTest(TestCase):
    def setUp(self):
        self.empresa = Empresa.objects.create(
            nit='900123456',
            razon_social='Mallor Test SAS',
            direccion='Calle 1',
            municipio_codigo='11001',
        )
        self.empresa_token = set_empresa_actual(self.empresa)
        self.usuario = Usuario.objects.create_user(
            username='cajero',
            email='cajero@example.com',
            password='password-seguro-123',
        )
        self.terminal = POSTerminal.objects.create(
            empresa=self.empresa,
            code='POS-1',
            name='Caja principal',
        )
        self.producto = Producto.objects.create(
            empresa=self.empresa,
            nombre='Producto Test',
            existencias=Decimal('10.00'),
            precio_compra=Decimal('50.00'),
            precio_venta=Decimal('100.00'),
            iva=Decimal('19.00'),
        )
        self.cliente = Cliente.get_consumidor_final()
        self.config = LocalConfig.get_for_empresa(self.empresa)
        self.config.connectivity_status = LocalConfig.ConnectivityStatus.OFFLINE
        self.config.save(update_fields=['connectivity_status'])

    def tearDown(self):
        reset_empresa_actual(self.empresa_token)

    def abrir_caja(self):
        return OfflineService.abrir_caja(
            terminal=self.terminal,
            usuario=self.usuario,
            efectivo_inicial=Decimal('0.00'),
        )

    def venta_payload(self, **overrides):
        payload = {
            'cliente': self.cliente,
            'terminal': self.terminal,
            'estado': Venta.Estado.TERMINADA,
            'metodo_pago': Venta.MetodoPago.EFECTIVO,
            'factura_electronica': False,
            'detalles': [
                {
                    'producto': self.producto,
                    'cantidad': Decimal('2.00'),
                    'precio_unitario': Decimal('100.00'),
                    'descuento': Decimal('0.00'),
                },
            ],
        }
        payload.update(overrides)
        return payload

    def test_crear_venta_local_con_caja_abierta_crea_outbox_y_movimiento(self):
        caja = self.abrir_caja()

        venta = VentaService.crear_venta(
            self.venta_payload(caja_sesion=caja),
            usuario=self.usuario,
        )

        self.producto.refresh_from_db()
        self.assertEqual(venta.uuid is not None, True)
        self.assertEqual(venta.caja_sesion_id, caja.id)
        self.assertEqual(venta.sync_status, Venta.SyncStatus.PENDIENTE)
        self.assertEqual(self.producto.existencias, Decimal('8.00'))
        self.assertTrue(
            HistorialInventario.objects.filter(venta=venta).exists(),
        )
        self.assertTrue(
            SyncOutbox.objects.filter(
                aggregate_uuid=venta.uuid,
                idempotency_key=f'venta:{venta.uuid}:terminada',
            ).exists(),
        )

    def test_crear_venta_local_sin_caja_abierta_falla(self):
        with self.assertRaisesMessage(Exception, 'Debe abrir caja'):
            VentaService.crear_venta(
                self.venta_payload(caja_sesion=None),
                usuario=self.usuario,
            )

    def test_venta_facturable_offline_crea_prefactura_pendiente(self):
        caja = self.abrir_caja()

        venta = VentaService.crear_venta(
            self.venta_payload(caja_sesion=caja, factura_electronica=True),
            usuario=self.usuario,
        )

        documento = VentaFacturaElectronica.objects.get(venta=venta)
        venta.refresh_from_db()
        self.assertEqual(
            documento.status,
            VentaFacturaElectronica.Status.PENDIENTE_FACTURACION,
        )
        self.assertEqual(venta.invoice_status, Venta.InvoiceStatus.PENDIENTE_FACTURACION)
        self.assertTrue(venta.prefactura_numero.startswith('PRE-'))
        self.assertEqual(documento.offline_reason, 'sin_conexion_local')

    def test_abrir_caja_es_idempotente_por_terminal(self):
        primera = self.abrir_caja()
        segunda = self.abrir_caja()

        self.assertEqual(primera.id, segunda.id)
        self.assertEqual(
            CajaSesion.objects.filter(
                terminal=self.terminal,
                estado=CajaSesion.Estado.ABIERTA,
            ).count(),
            1,
        )
