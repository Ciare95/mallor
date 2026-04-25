from decimal import Decimal

from django.test import TestCase

from cliente.models import Cliente


class ClienteModelTest(TestCase):
    def test_get_consumidor_final_crea_registro_por_defecto(self):
        cliente = Cliente.get_consumidor_final()

        self.assertEqual(cliente.nombre, 'Consumidor Final')
        self.assertEqual(
            cliente.numero_documento,
            Cliente.CONSUMIDOR_FINAL_DOCUMENTO,
        )

    def test_tiene_credito_disponible_calcula_sobre_limite(self):
        cliente = Cliente.objects.create(
            tipo_documento=Cliente.TipoDocumento.CC,
            numero_documento='123456789',
            nombre='Cliente Credito',
            telefono='3001234567',
            direccion='Calle 1 # 2-3',
            ciudad='Bogota',
            departamento='Cundinamarca',
            tipo_cliente=Cliente.TipoCliente.NATURAL,
            limite_credito=Decimal('500.00'),
        )

        self.assertTrue(cliente.tiene_credito_disponible(Decimal('200.00')))
        self.assertFalse(cliente.tiene_credito_disponible(Decimal('700.00')))
