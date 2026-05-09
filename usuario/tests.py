import pytest
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from usuario.models import Usuario
from usuario.services import UsuarioService
from empresa.models import EmpresaUsuario
from tests.factories import EmpresaFactory, EmpresaUsuarioFactory, UsuarioFactory


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


@pytest.mark.django_db
def test_admin_puede_listar_usuarios_con_filtros():
    client = APIClient()
    empresa = EmpresaFactory(razon_social='Empresa Usuarios')
    admin = UsuarioFactory(username='admin_usuarios', role=Usuario.Rol.ADMIN)
    objetivo = UsuarioFactory(
        username='empleado_filtrado',
        role=Usuario.Rol.EMPLEADO,
        first_name='Ana',
    )
    EmpresaUsuarioFactory(
        empresa=empresa,
        usuario=admin,
        rol=EmpresaUsuario.Rol.ADMIN,
        activo=True,
    )
    EmpresaUsuarioFactory(
        empresa=empresa,
        usuario=objetivo,
        rol=EmpresaUsuario.Rol.EMPLEADO,
        activo=True,
    )
    UsuarioFactory(username='otro_admin', role=Usuario.Rol.ADMIN)
    client.login(username=admin.username, password='Secret123')

    response = client.get(
        '/api/usuarios/',
        {
          'role': Usuario.Rol.EMPLEADO,
          'first_name__icontains': 'An',
        },
        HTTP_X_EMPRESA_ID=str(empresa.id),
    )

    assert response.status_code == status.HTTP_200_OK
    assert response.data['count'] >= 1
    assert [item['username'] for item in response.data['results']] == [
        objetivo.username,
    ]


@pytest.mark.django_db
def test_empleado_no_puede_listar_usuarios():
    client = APIClient()
    empleado = UsuarioFactory(
        username='empleado_sin_permiso',
        role=Usuario.Rol.EMPLEADO,
    )
    client.force_authenticate(user=empleado)

    response = client.get('/api/usuarios/')

    assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
def test_empleado_no_puede_cambiar_password_por_endpoint_detallado():
    client = APIClient()
    empleado = UsuarioFactory(
        username='empleado_password',
        role=Usuario.Rol.EMPLEADO,
        password='OldSecret123',
    )
    client.force_authenticate(user=empleado)

    response = client.post(
        f'/api/usuarios/{empleado.id}/cambiar_password/',
        {
            'old_password': 'OldSecret123',
            'new_password': 'NewSecret123',
        },
        format='json',
    )

    empleado.refresh_from_db()

    assert response.status_code == status.HTTP_403_FORBIDDEN
    assert empleado.check_password('OldSecret123')


@pytest.mark.django_db
def test_usuario_service_cambia_password_cuando_valida_credenciales():
    empleado = UsuarioFactory(
        username='empleado_password_service',
        role=Usuario.Rol.EMPLEADO,
        password='OldSecret123',
    )

    UsuarioService.cambiar_password(
        empleado.id,
        'OldSecret123',
        'NewSecret123',
    )

    empleado.refresh_from_db()

    assert empleado.check_password('NewSecret123')


@pytest.mark.django_db
def test_usuario_service_valida_permiso_sobre_perfil_propio_y_ajeno():
    empleado = UsuarioFactory(
        username='empleado_permiso',
        role=Usuario.Rol.EMPLEADO,
    )
    otro = UsuarioFactory(
        username='empleado_otro',
        role=Usuario.Rol.EMPLEADO,
    )

    assert UsuarioService.validar_permisos(
        empleado,
        'ver_usuario',
        empleado,
    )
    assert not UsuarioService.validar_permisos(
        empleado,
        'ver_usuario',
        otro,
    )
    assert not UsuarioService.validar_permisos(
        empleado,
        'crear_usuario',
    )
