from decimal import Decimal

from django.test import TestCase
from rest_framework.test import APIClient, APITestCase

from inventario.models import FacturaCompra
from proveedor.serializers import (
    ProveedorCreateSerializer,
    ProveedorListSerializer,
    ProveedorSerializer,
    ProveedorUpdateSerializer,
)
from proveedor.models import Proveedor
from proveedor.services import ProveedorService
from usuario.models import Usuario


class ProveedorBaseTestCase(TestCase):
    def setUp(self):
        self.usuario = Usuario.objects.create_user(
            username='compras',
            email='compras@example.com',
            password='secret123',
            role=Usuario.Rol.ADMIN,
        )

    def crear_proveedor(self, **overrides):
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

    def crear_factura(self, proveedor, **overrides):
        data = {
            'numero_factura': 'FC-001',
            'proveedor': proveedor,
            'fecha_factura': '2026-04-01',
            'subtotal': Decimal('1000.00'),
            'iva': Decimal('190.00'),
            'descuento': Decimal('0.00'),
            'total': Decimal('1190.00'),
            'observaciones': 'Compra de prueba',
            'usuario_registro': self.usuario,
            'estado': FacturaCompra.ESTADO_PROCESADA,
        }
        data.update(overrides)
        return FacturaCompra.objects.create(**data)


class ProveedorSerializerTest(ProveedorBaseTestCase):
    def test_serializer_completo_incluye_metricas(self):
        proveedor = self.crear_proveedor()
        self.crear_factura(proveedor)

        data = ProveedorSerializer(proveedor).data

        self.assertEqual(data['numero_documento'], '900123456')
        self.assertEqual(data['total_compras'], '1190.00')
        self.assertIsNotNone(data['ultima_compra'])

    def test_serializer_listado_retorna_resumen(self):
        proveedor = self.crear_proveedor()

        data = ProveedorListSerializer(proveedor).data

        self.assertEqual(data['razon_social'], 'Laboratorios Proveedor SAS')
        self.assertIn('cantidad_compras', data)

    def test_serializer_creacion_valida_documento_unico(self):
        self.crear_proveedor()
        serializer = ProveedorCreateSerializer(data={
            'tipo_documento': Proveedor.TipoDocumento.CC,
            'numero_documento': '900123456',
            'razon_social': 'Otro proveedor',
            'nombre_comercial': '',
            'nombre_contacto': 'Maria',
            'email': 'otro@proveedor.com',
            'telefono': '6010000000',
            'celular': '',
            'direccion': 'Cra 1',
            'ciudad': 'Bogota',
            'departamento': 'Cundinamarca',
            'tipo_productos': 'Insumos',
            'forma_pago': Proveedor.FormaPago.CONTADO,
            'cuenta_bancaria': '',
            'banco': '',
            'observaciones': '',
            'activo': True,
        })

        self.assertFalse(serializer.is_valid())
        self.assertIn('numero_documento', serializer.errors)

    def test_serializer_actualizacion_permite_parcial(self):
        proveedor = self.crear_proveedor()
        serializer = ProveedorUpdateSerializer(
            proveedor,
            data={'telefono': '6019999999'},
            partial=True,
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)


class ProveedorServiceTest(ProveedorBaseTestCase):
    def test_listar_y_buscar_proveedores(self):
        proveedor = self.crear_proveedor()
        self.crear_proveedor(
            numero_documento='901000111',
            razon_social='Distribuciones Norte',
            nombre_comercial='Norte Distribuciones',
            ciudad='Medellin',
        )

        resultados = ProveedorService.listar_proveedores({'q': 'Lab'})

        self.assertEqual(len(resultados), 1)
        self.assertEqual(resultados[0].id, proveedor.id)

    def test_obtener_historial_y_estadisticas(self):
        proveedor = self.crear_proveedor()
        self.crear_factura(proveedor, numero_factura='FC-101')
        self.crear_factura(
            proveedor,
            numero_factura='FC-102',
            fecha_factura='2026-04-10',
            total=Decimal('595.00'),
            subtotal=Decimal('500.00'),
            iva=Decimal('95.00'),
            estado=FacturaCompra.ESTADO_PENDIENTE,
        )

        historial = ProveedorService.obtener_historial_compras(proveedor.id)
        estadisticas = ProveedorService.obtener_estadisticas_proveedor(
            proveedor.id,
        )

        self.assertEqual(len(historial), 2)
        self.assertEqual(estadisticas['compras_procesadas'], 1)
        self.assertEqual(estadisticas['compras_pendientes'], 1)
        self.assertEqual(
            estadisticas['total_compras'],
            Decimal('1190.00'),
        )

    def test_eliminar_proveedor_hace_soft_delete(self):
        proveedor = self.crear_proveedor()

        ProveedorService.eliminar_proveedor(proveedor.id)
        proveedor.refresh_from_db()

        self.assertFalse(proveedor.activo)


class ProveedorApiTest(APITestCase):
    def setUp(self):
        self.usuario = Usuario.objects.create_user(
            username='admin',
            email='admin@mallor.com',
            password='secret123',
            role=Usuario.Rol.ADMIN,
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.usuario)
        self.proveedor = Proveedor.objects.create(
            tipo_documento=Proveedor.TipoDocumento.NIT,
            numero_documento='900123456',
            razon_social='Laboratorios Proveedor SAS',
            nombre_comercial='Lab Proveedor',
            nombre_contacto='Ana Compras',
            email='contacto@proveedor.com',
            telefono='6011234567',
            celular='3001234567',
            direccion='Calle 10 # 20-30',
            ciudad='Bogota',
            departamento='Cundinamarca',
            tipo_productos='Medicamentos y dispositivos',
            forma_pago=Proveedor.FormaPago.CREDITO_30,
            cuenta_bancaria='123456789',
            banco='Banco Prueba',
            observaciones='Proveedor prioritario',
            activo=True,
        )
        FacturaCompra.objects.create(
            numero_factura='FC-500',
            proveedor=self.proveedor,
            fecha_factura='2026-04-01',
            subtotal=Decimal('1000.00'),
            iva=Decimal('190.00'),
            descuento=Decimal('0.00'),
            total=Decimal('1190.00'),
            observaciones='Compra de prueba',
            usuario_registro=self.usuario,
            estado=FacturaCompra.ESTADO_PROCESADA,
        )

    def test_listar_proveedores(self):
        response = self.client.get('/api/proveedores/')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['count'], 1)

    def test_crear_proveedor(self):
        payload = {
            'tipo_documento': 'CC',
            'numero_documento': '123456789',
            'razon_social': 'Proveedor Nuevo',
            'nombre_comercial': '',
            'nombre_contacto': 'Carlos',
            'email': 'nuevo@proveedor.com',
            'telefono': '6015555555',
            'celular': '',
            'direccion': 'Calle 1',
            'ciudad': 'Cali',
            'departamento': 'Valle',
            'tipo_productos': 'Insumos',
            'forma_pago': 'CONTADO',
            'cuenta_bancaria': '',
            'banco': '',
            'observaciones': '',
            'activo': True,
        }

        response = self.client.post('/api/proveedores/', payload, format='json')

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['razon_social'], 'Proveedor Nuevo')

    def test_actualizar_proveedor(self):
        response = self.client.patch(
            f'/api/proveedores/{self.proveedor.id}/',
            {'ciudad': 'Medellin'},
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['ciudad'], 'Medellin')

    def test_historial_proveedor(self):
        response = self.client.get(
            f'/api/proveedores/{self.proveedor.id}/historial/',
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['numero_factura'], 'FC-500')

    def test_estadisticas_proveedor(self):
        response = self.client.get(
            f'/api/proveedores/{self.proveedor.id}/estadisticas/',
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['total_compras'], '1190.00')
        self.assertEqual(response.data['compras_procesadas'], 1)

    def test_buscar_proveedor(self):
        response = self.client.get('/api/proveedores/buscar/?q=Lab')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['count'], 1)

    def test_eliminar_proveedor(self):
        response = self.client.delete(f'/api/proveedores/{self.proveedor.id}/')

        self.assertEqual(response.status_code, 204)
        self.proveedor.refresh_from_db()
        self.assertFalse(self.proveedor.activo)
