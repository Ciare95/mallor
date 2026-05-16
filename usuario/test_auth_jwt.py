import pytest
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken

from empresa.models import Empresa
from empresa.models import EmpresaUsuario
from tests.factories import EmpresaFactory, EmpresaUsuarioFactory, UsuarioFactory


@pytest.fixture
def jwt_setup(db):
    empresa_a = EmpresaFactory(razon_social='Auth Empresa A')
    empresa_b = EmpresaFactory(razon_social='Auth Empresa B')
    user = UsuarioFactory(username='jwt_admin', password='Secret123')
    EmpresaUsuarioFactory(
        empresa=empresa_a,
        usuario=user,
        rol=EmpresaUsuario.Rol.ADMIN,
        activo=True,
    )
    return user, empresa_a, empresa_b


@pytest.mark.django_db
def test_login_devuelve_access_cookie_refresh_y_empresas(jwt_setup):
    user, empresa_a, _ = jwt_setup
    client = APIClient()

    response = client.post(
        '/api/auth/login/',
        {
            'username': user.username,
            'password': 'Secret123',
            'empresa_id': empresa_a.id,
            'remember_me': True,
        },
        format='json',
    )

    assert response.status_code == status.HTTP_200_OK
    assert response.data['access']
    assert 'refresh' not in response.data
    assert response.data['empresa_activa'] == empresa_a.id
    assert response.data['empresas'][0]['rol_usuario'] == EmpresaUsuario.Rol.ADMIN
    assert 'mallor_refresh' in response.cookies
    assert response.cookies['mallor_refresh']['httponly']


@pytest.mark.django_db
def test_login_con_empresa_ajena_responde_403(jwt_setup):
    user, _, empresa_b = jwt_setup
    client = APIClient()

    response = client.post(
        '/api/auth/login/',
        {
            'username': user.username,
            'password': 'Secret123',
            'empresa_id': empresa_b.id,
        },
        format='json',
    )

    assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
def test_bearer_resuelve_empresa_activa_y_bloquea_tenant_ajeno(jwt_setup):
    user, empresa_a, empresa_b = jwt_setup
    client = APIClient()
    login = client.post(
        '/api/auth/login/',
        {'username': user.username, 'password': 'Secret123'},
        format='json',
    )
    token = login.data['access']

    response = client.get(
        '/api/empresas/',
        HTTP_AUTHORIZATION=f'Bearer {token}',
        HTTP_X_EMPRESA_ID=str(empresa_a.id),
    )
    assert response.status_code == status.HTTP_200_OK
    assert response.data['empresa_activa'] == empresa_a.id

    forbidden = client.get(
        '/api/empresas/',
        HTTP_AUTHORIZATION=f'Bearer {token}',
        HTTP_X_EMPRESA_ID=str(empresa_b.id),
    )
    assert forbidden.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
def test_refresh_rota_y_logout_revoca_refresh(jwt_setup):
    user, _, _ = jwt_setup
    client = APIClient()
    login = client.post(
        '/api/auth/login/',
        {'username': user.username, 'password': 'Secret123'},
        format='json',
    )
    refresh_cookie = login.cookies['mallor_refresh'].value

    refreshed = client.post(
        '/api/auth/refresh/',
        HTTP_COOKIE=f'mallor_refresh={refresh_cookie}',
    )

    assert refreshed.status_code == status.HTTP_200_OK
    assert refreshed.data['access']
    assert BlacklistedToken.objects.count() == 1

    rotated_cookie = refreshed.cookies['mallor_refresh'].value
    logout = client.post(
        '/api/auth/logout/',
        HTTP_COOKIE=f'mallor_refresh={rotated_cookie}',
    )

    assert logout.status_code == status.HTTP_204_NO_CONTENT
    assert BlacklistedToken.objects.count() == 2


@pytest.mark.django_db
def test_membresia_inactiva_bloquea_access_token(jwt_setup):
    user, empresa_a, _ = jwt_setup
    client = APIClient()
    login = client.post(
        '/api/auth/login/',
        {'username': user.username, 'password': 'Secret123'},
        format='json',
    )
    token = login.data['access']
    EmpresaUsuario.objects.filter(usuario=user, empresa=empresa_a).update(
        activo=False,
    )

    response = client.get(
        '/api/empresas/',
        HTTP_AUTHORIZATION=f'Bearer {token}',
        HTTP_X_EMPRESA_ID=str(empresa_a.id),
    )

    assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
def test_empleado_no_lista_usuarios_de_empresa(jwt_setup):
    _, empresa_a, _ = jwt_setup
    empleado = UsuarioFactory(username='jwt_empleado', password='Secret123')
    EmpresaUsuarioFactory(
        empresa=empresa_a,
        usuario=empleado,
        rol=EmpresaUsuario.Rol.EMPLEADO,
        activo=True,
    )
    client = APIClient()
    login = client.post(
        '/api/auth/login/',
        {'username': empleado.username, 'password': 'Secret123'},
        format='json',
    )

    response = client.get(
        '/api/usuarios/',
        HTTP_AUTHORIZATION=f"Bearer {login.data['access']}",
        HTTP_X_EMPRESA_ID=str(empresa_a.id),
    )

    assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
def test_admin_de_tenant_no_recibe_empresa_principal_implicita():
    empresa_local = EmpresaFactory(razon_social='Empresa Local JWT')
    user = UsuarioFactory(
        username='jwt_admin_local',
        password='Secret123',
        role='ADMIN',
    )
    EmpresaUsuarioFactory(
        empresa=empresa_local,
        usuario=user,
        rol=EmpresaUsuario.Rol.ADMIN,
        activo=True,
    )
    client = APIClient()

    response = client.post(
        '/api/auth/login/',
        {'username': user.username, 'password': 'Secret123'},
        format='json',
    )

    assert response.status_code == status.HTTP_200_OK
    assert response.data['empresa_activa'] == empresa_local.id
    assert [empresa['id'] for empresa in response.data['empresas']] == [
        empresa_local.id,
    ]
    assert not EmpresaUsuario.objects.filter(
        usuario=user,
        empresa=Empresa.get_default(),
    ).exists()
