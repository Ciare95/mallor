import pytest
from django.core.exceptions import PermissionDenied

from empresa.context import get_empresa_actual_or_default
from empresa.services import EmpresaService
from tests.helpers import empresa_context


@pytest.mark.django_db
@pytest.mark.multitenant
def test_usuario_sin_membresia_no_resuelve_empresa_ajena(
    rf,
    usuario_sin_membresia,
    empresa_b,
):
    request = rf.get('/', HTTP_X_EMPRESA_ID=str(empresa_b.id))
    request.user = usuario_sin_membresia
    request.session = {}

    with pytest.raises(PermissionDenied):
        EmpresaService.resolver_empresa_request(request)


@pytest.mark.django_db
@pytest.mark.multitenant
def test_empleado_respeta_matriz_de_permisos(empleado_a, empresa_a):
    assert EmpresaService.validar_permiso_operacion(
        empleado_a,
        empresa_a,
        'listar_ventas',
    )
    assert not EmpresaService.validar_permiso_operacion(
        empleado_a,
        empresa_a,
        'administrar_usuarios',
    )
    assert not EmpresaService.validar_permiso_operacion(
        empleado_a,
        empresa_a,
        'configurar_factus',
    )


@pytest.mark.django_db
@pytest.mark.multitenant
def test_empresa_inactiva_no_opera_modulos_restringidos(admin_a, empresa_a):
    empresa_a.activo = False
    empresa_a.save(update_fields=['activo', 'updated_at'])

    assert not EmpresaService.validar_permiso_operacion(
        admin_a,
        empresa_a,
        'crear_venta',
    )


@pytest.mark.django_db
@pytest.mark.multitenant
def test_empresa_context_aisla_services_sin_request(empresa_a, empresa_b):
    with empresa_context(empresa_a):
        assert get_empresa_actual_or_default() == empresa_a

    with empresa_context(empresa_b):
        assert get_empresa_actual_or_default() == empresa_b
