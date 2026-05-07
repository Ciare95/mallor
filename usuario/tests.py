from rest_framework import status
from rest_framework.test import APIClient
from django.test import TestCase

from usuario.models import Usuario


class UsuarioMeApiTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.usuario = Usuario.objects.create_user(
            username='empleado_me',
            email='empleado_me@mallor.test',
            password='Secret123',
            role=Usuario.Rol.EMPLEADO,
        )

    def test_usuario_autenticado_puede_consultar_me(self):
        self.client.login(username=self.usuario.username, password='Secret123')

        response = self.client.get('/api/usuarios/me/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], self.usuario.id)
        self.assertEqual(response.data['username'], self.usuario.username)
