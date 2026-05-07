import base64
from decimal import Decimal

from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from cliente.models import Cliente
from empresa.models import Empresa, EmpresaUsuario
from inventario.models import Producto
from usuario.models import Usuario
from ventas.models import FactusCredential, Venta, VentaFacturaElectronica


class EmpresaApiTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.usuario = Usuario.objects.create_user(
            username='tenant_admin',
            email='tenant_admin@mallor.test',
            password='Secret123',
            role=Usuario.Rol.ADMIN,
        )
        self.password = 'Secret123'
        self.empresa_principal = Empresa.get_default()
        self.empresa_secundaria = Empresa.objects.create(
            nit='900555444',
            razon_social='Empresa Dos SAS',
            nombre_comercial='Empresa Dos',
        )
        EmpresaUsuario.objects.get_or_create(
            empresa=self.empresa_principal,
            usuario=self.usuario,
            defaults={'rol': EmpresaUsuario.Rol.ADMIN, 'activo': True},
        )
        self.client.login(
            username=self.usuario.username,
            password=self.password,
        )

    def test_no_permite_seleccionar_empresa_sin_membresia(self):
        response = self.client.post(
            '/api/empresas/seleccionar/',
            {'empresa_id': self.empresa_secundaria.id},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_credenciales_factus_se_guardan_cifradas_y_no_se_exponen(self):
        EmpresaUsuario.objects.create(
            empresa=self.empresa_secundaria,
            usuario=self.usuario,
            rol=EmpresaUsuario.Rol.ADMIN,
            activo=True,
        )

        response = self.client.post(
            f'/api/empresas/{self.empresa_secundaria.id}/facturacion/credenciales/',
            {
                'environment': 'SANDBOX',
                'base_url': 'https://api-sandbox.factus.com.co',
                'client_id': 'cliente-prueba',
                'client_secret': 'secret-super-seguro',
                'username': 'sandboxv2@factus.com.co',
                'password': 'password-super-seguro',
                'timeout': 30,
                'max_retries': 1,
                'verify_ssl': True,
                'activo': True,
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        credential = FactusCredential.objects.get(
            empresa=self.empresa_secundaria,
            environment='SANDBOX',
        )
        self.assertNotEqual(credential.client_secret, 'secret-super-seguro')
        self.assertNotEqual(credential.password, 'password-super-seguro')
        self.assertTrue(credential.client_secret.startswith('enc::'))
        self.assertTrue(credential.password.startswith('enc::'))
        self.assertEqual(credential.get_client_secret(), 'secret-super-seguro')
        self.assertEqual(credential.get_password(), 'password-super-seguro')

        get_response = self.client.get(
            f'/api/empresas/{self.empresa_secundaria.id}/facturacion/credenciales/?environment=SANDBOX',
        )

        self.assertEqual(get_response.status_code, status.HTTP_200_OK)
        self.assertNotIn('client_secret', get_response.data)
        self.assertNotIn('password', get_response.data)
        self.assertTrue(get_response.data['has_client_secret'])
        self.assertTrue(get_response.data['has_password'])

    def test_admin_interno_crea_empresa_con_propietario(self):
        admin = Usuario.objects.create_superuser(
            username='mallor_admin',
            email='mallor_admin@mallor.test',
            password='Secret123',
        )
        self.client.login(username=admin.username, password='Secret123')

        response = self.client.post(
            '/api/empresas/admin/',
            {
                'nit': '901222333',
                'razon_social': 'Nueva Empresa SAS',
                'nombre_comercial': 'Nueva Empresa',
                'ambiente_facturacion': 'SANDBOX',
                'propietario': {
                    'username': 'nuevo_owner',
                    'email': 'owner@nueva.test',
                    'password': 'Secret123',
                    'confirm_password': 'Secret123',
                    'first_name': 'Propietario',
                    'last_name': 'Nuevo',
                },
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        empresa = Empresa.objects.get(nit='901222333')
        owner = Usuario.objects.get(username='nuevo_owner')
        self.assertTrue(
            EmpresaUsuario.objects.filter(
                empresa=empresa,
                usuario=owner,
                rol=EmpresaUsuario.Rol.PROPIETARIO,
                activo=True,
            ).exists(),
        )

    def test_empleado_no_administra_usuarios_ni_factus(self):
        empleado = Usuario.objects.create_user(
            username='empleado_tenant',
            email='empleado@mallor.test',
            password='Secret123',
            role=Usuario.Rol.EMPLEADO,
        )
        EmpresaUsuario.objects.create(
            empresa=self.empresa_principal,
            usuario=empleado,
            rol=EmpresaUsuario.Rol.EMPLEADO,
            activo=True,
        )
        self.client.login(username=empleado.username, password='Secret123')

        usuarios_response = self.client.get(
            f'/api/empresas/{self.empresa_principal.id}/usuarios/',
        )
        factus_response = self.client.get(
            f'/api/empresas/{self.empresa_principal.id}/facturacion/credenciales/',
        )

        self.assertEqual(usuarios_response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(factus_response.status_code, status.HTTP_403_FORBIDDEN)

    def test_no_permite_dejar_empresa_sin_propietario_activo(self):
        propietario = Usuario.objects.create_user(
            username='owner_unico',
            email='owner_unico@mallor.test',
            password='Secret123',
            role=Usuario.Rol.ADMIN,
        )
        empresa = Empresa.objects.create(
            nit='901777888',
            razon_social='Propietario Unico SAS',
        )
        membresia = EmpresaUsuario.objects.create(
            empresa=empresa,
            usuario=propietario,
            rol=EmpresaUsuario.Rol.PROPIETARIO,
            activo=True,
        )
        self.client.login(username=propietario.username, password='Secret123')

        response = self.client.patch(
            f'/api/empresas/{empresa.id}/usuarios/{membresia.id}/',
            {'rol': EmpresaUsuario.Rol.ADMIN},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class AislamientoMultitenantApiTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.usuario = Usuario.objects.create_user(
            username='tenant_a_admin',
            email='tenant_a_admin@mallor.test',
            password='Secret123',
            role=Usuario.Rol.ADMIN,
        )
        self.empresa_a = Empresa.objects.create(
            nit='900100100',
            razon_social='Empresa A SAS',
        )
        self.empresa_b = Empresa.objects.create(
            nit='900200200',
            razon_social='Empresa B SAS',
        )
        EmpresaUsuario.objects.create(
            empresa=self.empresa_a,
            usuario=self.usuario,
            rol=EmpresaUsuario.Rol.ADMIN,
            activo=True,
        )
        self.client.login(username=self.usuario.username, password='Secret123')
        self.client.defaults['HTTP_X_EMPRESA_ID'] = str(self.empresa_a.id)

        self.cliente_b = Cliente.objects.create(
            empresa=self.empresa_b,
            tipo_documento=Cliente.TipoDocumento.CC,
            numero_documento='100200300',
            nombre='Cliente B',
            telefono='3000000000',
            direccion='Calle B',
            ciudad='Bogota',
            departamento='Cundinamarca',
        )
        self.producto_b = Producto.objects.create(
            empresa=self.empresa_b,
            nombre='Producto B',
            existencias='10.00',
            precio_compra='1000.00',
            precio_venta='2000.00',
        )
        self.venta_b = Venta.objects.create(
            empresa=self.empresa_b,
            cliente=self.cliente_b,
            subtotal=Decimal('2000.00'),
            impuestos=Decimal('0.00'),
            total=Decimal('2000.00'),
            estado=Venta.Estado.TERMINADA,
            usuario_registro=self.usuario,
            factura_electronica=True,
        )
        VentaFacturaElectronica.objects.create(
            empresa=self.empresa_b,
            venta=self.venta_b,
            reference_code='VENTA-B-1',
            bill_number='B001',
            status=VentaFacturaElectronica.Status.EMITIDA,
        )

    def test_no_accede_recursos_de_otra_empresa(self):
        endpoints = [
            f'/api/clientes/{self.cliente_b.id}/',
            f'/api/inventario/productos/{self.producto_b.id}/',
            f'/api/ventas/{self.venta_b.id}/',
            f'/api/ventas/{self.venta_b.id}/factura/pdf/',
            f'/api/ventas/{self.venta_b.id}/factura/xml/',
        ]

        for endpoint in endpoints:
            response = self.client.get(endpoint)
            self.assertIn(
                response.status_code,
                (status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND),
                endpoint,
            )

    def test_basic_auth_resuelve_empresa_activa_por_header(self):
        basic_token = base64.b64encode(
            b'tenant_a_admin:Secret123',
        ).decode('ascii')

        response = self.client.get(
            '/api/empresas/',
            HTTP_AUTHORIZATION=f'Basic {basic_token}',
            HTTP_X_EMPRESA_ID=str(self.empresa_a.id),
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['empresa_activa'], self.empresa_a.id)
