from decimal import Decimal

from django.core.exceptions import ValidationError
from django.test import TestCase

from cliente.models import Cliente
from usuario.models import Usuario
from ventas.models import Venta


class ClienteModelTest(TestCase):
    def setUp(self):
        self.usuario = Usuario.objects.create_user(
            username='cliente_tester',
            email='cliente_tester@example.com',
            password='Admin1234',
        )

    def crear_cliente(self, **overrides):
        data = {
            'tipo_documento': Cliente.TipoDocumento.CC,
            'numero_documento': '123456789',
            'nombre': 'Cliente Base',
            'telefono': '3001234567',
            'direccion': 'Calle 1 # 2-3',
            'ciudad': 'Bogota',
            'departamento': 'Cundinamarca',
            'tipo_cliente': Cliente.TipoCliente.NATURAL,
            'limite_credito': Decimal('0.00'),
        }
        data.update(overrides)
        return Cliente.objects.create(**data)

    def crear_venta(
        self,
        cliente,
        numero_venta,
        total,
        total_abonado=Decimal('0.00'),
        estado=Venta.Estado.TERMINADA,
    ):
        return Venta.objects.create(
            numero_venta=numero_venta,
            cliente=cliente,
            subtotal=total,
            impuestos=Decimal('0.00'),
            total=total,
            descuento=Decimal('0.00'),
            total_abonado=total_abonado,
            estado=estado,
            usuario_registro=self.usuario,
        )

    def test_get_consumidor_final_crea_registro_por_defecto(self):
        cliente = Cliente.get_consumidor_final()

        self.assertEqual(cliente.nombre, 'Consumidor Final')
        self.assertEqual(
            cliente.numero_documento,
            Cliente.CONSUMIDOR_FINAL_DOCUMENTO,
        )
        self.assertEqual(
            cliente.tipo_documento,
            Cliente.TipoDocumento.CC,
        )

    def test_documento_es_unico_por_tipo(self):
        self.crear_cliente(numero_documento='900123456')

        with self.assertRaises(ValidationError) as exc:
            self.crear_cliente(
                numero_documento='900123456',
                nombre='Cliente Duplicado',
            )

        self.assertIn('numero_documento', exc.exception.message_dict)

    def test_permita_mismo_numero_con_tipo_documento_distinto(self):
        self.crear_cliente(numero_documento='445566', tipo_documento='CC')

        cliente = self.crear_cliente(
            numero_documento='445566',
            tipo_documento=Cliente.TipoDocumento.CE,
            nombre='Cliente Extranjero',
        )

        self.assertEqual(cliente.tipo_documento, Cliente.TipoDocumento.CE)

    def test_get_nombre_completo_retorna_razon_social_para_juridico(self):
        cliente = self.crear_cliente(
            tipo_documento=Cliente.TipoDocumento.NIT,
            numero_documento='901234567',
            tipo_cliente=Cliente.TipoCliente.JURIDICO,
            nombre='',
            razon_social='Drogueria Central SAS',
        )

        self.assertEqual(
            cliente.get_nombre_completo(),
            'Drogueria Central SAS',
        )

    def test_calcula_saldo_pendiente_y_total_compras(self):
        cliente = self.crear_cliente(
            numero_documento='700100200',
            limite_credito=Decimal('200.00'),
        )

        self.crear_venta(
            cliente=cliente,
            numero_venta='V-00000001',
            total=Decimal('100.00'),
        )
        self.crear_venta(
            cliente=cliente,
            numero_venta='V-00000002',
            total=Decimal('80.00'),
            total_abonado=Decimal('50.00'),
        )
        self.crear_venta(
            cliente=cliente,
            numero_venta='V-00000003',
            total=Decimal('60.00'),
            estado=Venta.Estado.CANCELADA,
        )

        self.assertEqual(
            cliente.calcular_saldo_pendiente(),
            Decimal('130.00'),
        )
        self.assertEqual(
            cliente.calcular_total_compras(),
            Decimal('180.00'),
        )

    def test_tiene_credito_disponible_se_basa_en_cartera_actual(self):
        cliente = self.crear_cliente(
            numero_documento='300400500',
            limite_credito=Decimal('150.00'),
        )
        self.crear_venta(
            cliente=cliente,
            numero_venta='V-00000004',
            total=Decimal('90.00'),
        )
        self.crear_venta(
            cliente=cliente,
            numero_venta='V-00000005',
            total=Decimal('50.00'),
            total_abonado=Decimal('20.00'),
        )

        self.assertTrue(cliente.tiene_credito_disponible(Decimal('30.00')))
        self.assertFalse(cliente.tiene_credito_disponible(Decimal('31.00')))

    def test_no_permite_limite_credito_negativo(self):
        with self.assertRaises(ValidationError) as exc:
            self.crear_cliente(
                numero_documento='800900100',
                limite_credito=Decimal('-1.00'),
            )

        self.assertIn('limite_credito', exc.exception.message_dict)

    def test_no_permite_dias_plazo_negativos(self):
        with self.assertRaises(ValidationError) as exc:
            self.crear_cliente(
                numero_documento='800900101',
                dias_plazo=-5,
            )

        self.assertIn('dias_plazo', exc.exception.message_dict)
