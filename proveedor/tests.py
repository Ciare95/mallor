from decimal import Decimal

from django.core.exceptions import ValidationError
from django.test import TestCase

from inventario.models import FacturaCompra
from proveedor.models import Proveedor
from usuario.models import Usuario


class ProveedorModelTest(TestCase):
    def setUp(self):
        self.usuario = Usuario.objects.create_user(
            username='compras',
            email='compras@example.com',
            password='secret123',
        )

    def _crear_proveedor(self, **overrides):
        data = {
            'tipo_documento': Proveedor.TipoDocumento.NIT,
            'numero_documento': '900123456',
            'razon_social': 'Laboratorios Proveedor SAS',
            'nombre_comercial': 'Lab Proveedor',
            'nombre_contacto': 'Ana Compras',
            'email': 'contacto@proveedor.com',
            'telefono': '6011234567',
            'celular': '3001234567',
            'direccion': 'Calle 10 # 20-30',
            'ciudad': 'Bogota',
            'departamento': 'Cundinamarca',
            'tipo_productos': 'Medicamentos y dispositivos',
            'forma_pago': Proveedor.FormaPago.CREDITO_30,
            'cuenta_bancaria': '123456789',
            'banco': 'Banco Prueba',
            'observaciones': 'Proveedor prioritario',
            'activo': True,
        }
        data.update(overrides)
        return Proveedor.objects.create(**data)

    def test_debe_crear_proveedor_valido(self):
        proveedor = self._crear_proveedor()

        self.assertEqual(
            proveedor.tipo_documento,
            Proveedor.TipoDocumento.NIT,
        )
        self.assertEqual(
            proveedor.forma_pago,
            Proveedor.FormaPago.CREDITO_30,
        )
        self.assertEqual(
            str(proveedor),
            'Laboratorios Proveedor SAS (900123456)',
        )

    def test_nombre_completo_prefiere_nombre_comercial(self):
        proveedor = self._crear_proveedor(
            nombre_comercial='Distribuciones LP',
        )

        self.assertEqual(proveedor.nombre_completo, 'Distribuciones LP')

    def test_nombre_completo_retorna_razon_social_si_no_hay_comercial(self):
        proveedor = self._crear_proveedor(nombre_comercial='')

        self.assertEqual(
            proveedor.nombre_completo,
            'Laboratorios Proveedor SAS',
        )

    def test_calcular_total_compras_suma_solo_facturas_procesadas(self):
        proveedor = self._crear_proveedor()
        FacturaCompra.objects.create(
            numero_factura='FC-001',
            proveedor=proveedor,
            fecha_factura='2026-04-01',
            subtotal=Decimal('1000.00'),
            iva=Decimal('190.00'),
            total=Decimal('1190.00'),
            usuario_registro=self.usuario,
            estado=FacturaCompra.ESTADO_PROCESADA,
        )
        FacturaCompra.objects.create(
            numero_factura='FC-002',
            proveedor=proveedor,
            fecha_factura='2026-04-10',
            subtotal=Decimal('500.00'),
            iva=Decimal('95.00'),
            total=Decimal('595.00'),
            usuario_registro=self.usuario,
            estado=FacturaCompra.ESTADO_PENDIENTE,
        )

        total = proveedor.calcular_total_compras()

        self.assertEqual(total, Decimal('1190.00'))

    def test_obtener_ultima_compra_retorna_fecha_mas_reciente_procesada(self):
        proveedor = self._crear_proveedor()
        FacturaCompra.objects.create(
            numero_factura='FC-101',
            proveedor=proveedor,
            fecha_factura='2026-03-05',
            subtotal=Decimal('800.00'),
            iva=Decimal('152.00'),
            total=Decimal('952.00'),
            usuario_registro=self.usuario,
            estado=FacturaCompra.ESTADO_PROCESADA,
        )
        FacturaCompra.objects.create(
            numero_factura='FC-102',
            proveedor=proveedor,
            fecha_factura='2026-04-15',
            subtotal=Decimal('300.00'),
            iva=Decimal('57.00'),
            total=Decimal('357.00'),
            usuario_registro=self.usuario,
            estado=FacturaCompra.ESTADO_PROCESADA,
        )

        self.assertEqual(
            str(proveedor.obtener_ultima_compra()),
            '2026-04-15',
        )

    def test_debe_rechazar_campos_obligatorios_vacios(self):
        with self.assertRaises(ValidationError) as error:
            self._crear_proveedor(
                razon_social='   ',
                nombre_contacto='',
                telefono=' ',
                direccion='',
                ciudad='',
                departamento='',
                tipo_productos=' ',
            )

        errores = error.exception.message_dict
        self.assertIn('razon_social', errores)
        self.assertIn('nombre_contacto', errores)
        self.assertIn('telefono', errores)
        self.assertIn('tipo_productos', errores)

    def test_no_debe_permitir_documento_duplicado(self):
        self._crear_proveedor()

        with self.assertRaises(ValidationError) as error:
            proveedor = self._crear_proveedor(
                email='otro@proveedor.com',
                numero_documento='900123456',
            )
            proveedor.full_clean()

        self.assertIn('numero_documento', error.exception.message_dict)
