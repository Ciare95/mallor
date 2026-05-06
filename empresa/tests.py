from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from empresa.models import Empresa, EmpresaUsuario
from usuario.models import Usuario
from ventas.models import FactusCredential


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
