import pytest

from tests.factories import EmpresaFactory, EmpresaUsuarioFactory, UsuarioFactory
from tests.helpers import api_client_for_empresa


def pytest_collection_modifyitems(items):
    for item in items:
        path = str(item.fspath).replace('\\', '/').lower()
        name = item.name.lower()

        if '/ia/' in path:
            item.add_marker(pytest.mark.ia)
        if 'factus' in path or 'facturacion' in path:
            item.add_marker(pytest.mark.factus)
        if (
            'tenant' in path
            or 'multitenant' in path
            or 'empresa' in path
            or 'aislamiento' in name
            or 'tenant' in name
        ):
            item.add_marker(pytest.mark.multitenant)
        if 'api' in name or 'endpoint' in name or 'view' in name:
            item.add_marker(pytest.mark.integration)
        if not item.iter_markers():
            item.add_marker(pytest.mark.unit)


@pytest.fixture
def empresa_a(db):
    return EmpresaFactory(razon_social='Empresa A', nit='900000001')


@pytest.fixture
def empresa_b(db):
    return EmpresaFactory(razon_social='Empresa B', nit='900000002')


@pytest.fixture
def admin_a(db, empresa_a):
    user = UsuarioFactory(username='admin_a', role='ADMIN')
    EmpresaUsuarioFactory(
        empresa=empresa_a,
        usuario=user,
        rol='ADMIN',
        activo=True,
    )
    return user


@pytest.fixture
def empleado_a(db, empresa_a):
    user = UsuarioFactory(username='empleado_a', role='EMPLEADO')
    EmpresaUsuarioFactory(
        empresa=empresa_a,
        usuario=user,
        rol='EMPLEADO',
        activo=True,
    )
    return user


@pytest.fixture
def usuario_sin_membresia(db):
    return UsuarioFactory(username='sin_membresia')


@pytest.fixture
def api_client_empresa(admin_a, empresa_a):
    return api_client_for_empresa(admin_a, empresa_a)
