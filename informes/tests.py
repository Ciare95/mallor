from datetime import timedelta
from decimal import Decimal

import pytest
from django.utils import timezone
from rest_framework import status

import informes.services as informes_services
from informes.services import ReporteEstadisticasService
from ventas.models import Venta
from tests.factories import (
    EmpresaFactory,
    EmpresaUsuarioFactory,
    ProductoFactory,
    UsuarioFactory,
    VentaFactory,
)
from tests.helpers import api_client_for_empresa, empresa_context


@pytest.mark.django_db
def test_dashboard_informes_aisla_ventas_por_empresa(
    empresa_a,
    empresa_b,
    admin_a,
):
    cliente = api_client_for_empresa(admin_a, empresa_a)
    ahora = timezone.now()
    Venta.objects.filter(empresa=empresa_a).delete()
    Venta.objects.filter(empresa=empresa_b).delete()
    VentaFactory(
        empresa=empresa_a,
        usuario_registro=admin_a,
        total=Decimal('1200.00'),
        subtotal=Decimal('1000.00'),
        impuestos=Decimal('200.00'),
        fecha_venta=ahora,
    )
    VentaFactory(
        empresa=empresa_b,
        total=Decimal('9800.00'),
        subtotal=Decimal('9000.00'),
        impuestos=Decimal('800.00'),
        fecha_venta=ahora,
    )

    response = cliente.get('/api/informes/estadisticas/dashboard/')

    assert response.status_code == status.HTTP_200_OK
    assert response.data['ventas']['resumen']['total_ventas'] == 1200.0
    assert response.data['ventas']['resumen']['cantidad_ventas'] == 1


@pytest.mark.django_db
def test_empleado_no_accede_a_informes_financieros(empresa_a, empleado_a):
    cliente = api_client_for_empresa(empleado_a, empresa_a)

    response = cliente.get('/api/informes/estadisticas/dashboard/')

    assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
def test_reporte_estadisticas_valor_inventario_aisla_empresa(empresa_a, empresa_b):
    ProductoFactory(
        empresa=empresa_a,
        existencias=Decimal('5'),
        precio_compra=Decimal('1000'),
        precio_venta=Decimal('1500'),
    )
    ProductoFactory(
        empresa=empresa_b,
        existencias=Decimal('20'),
        precio_compra=Decimal('5000'),
        precio_venta=Decimal('7000'),
    )

    with empresa_context(empresa_a):
        resultado = ReporteEstadisticasService.valor_total_inventario()

    assert resultado == {
        'valor_compra': 5000.0,
        'valor_venta': 7500.0,
        'margen_potencial': 2500.0,
        'total_existencias': 5.0,
        'cantidad_productos': 1,
    }


@pytest.mark.django_db
def test_reporte_estadisticas_cartera_y_proyeccion_usan_empresa_activa(
    empresa_a,
    empresa_b,
    admin_a,
    monkeypatch,
):
    empresa_local = EmpresaFactory(nit='900009991', razon_social='Empresa Local')
    empresa_externa = EmpresaFactory(nit='900009992', razon_social='Empresa Externa')
    admin_local = UsuarioFactory(username='admin_informes_local', role='ADMIN')
    EmpresaUsuarioFactory(
        empresa=empresa_local,
        usuario=admin_local,
        rol='ADMIN',
        activo=True,
    )

    hoy = timezone.now()
    hace_dos_dias = hoy - timedelta(days=2)
    Venta.objects.filter(empresa=empresa_local).delete()
    Venta.objects.filter(empresa=empresa_externa).delete()
    VentaFactory(
        empresa=empresa_local,
        usuario_registro=admin_local,
        saldo_pendiente=Decimal('300.00'),
        total=Decimal('1000.00'),
        subtotal=Decimal('1000.00'),
        impuestos=Decimal('0.00'),
        total_abonado=Decimal('700.00'),
        fecha_venta=hace_dos_dias,
    )
    VentaFactory(
        empresa=empresa_local,
        usuario_registro=admin_local,
        saldo_pendiente=Decimal('100.00'),
        total=Decimal('500.00'),
        subtotal=Decimal('500.00'),
        impuestos=Decimal('0.00'),
        total_abonado=Decimal('400.00'),
        fecha_venta=hoy,
    )
    VentaFactory(
        empresa=empresa_externa,
        total=Decimal('9000.00'),
        subtotal=Decimal('9000.00'),
        impuestos=Decimal('0.00'),
        saldo_pendiente=Decimal('9000.00'),
        fecha_venta=hoy,
    )

    monkeypatch.setattr(
        informes_services,
        'get_empresa_actual_or_default',
        lambda: empresa_local,
    )
    cartera = ReporteEstadisticasService.total_cuentas_por_cobrar()
    proyeccion = ReporteEstadisticasService.proyeccion_ingresos(7)

    assert cartera == {
        'total_cartera': 400.0,
        'cantidad_ventas': 2,
        'clientes_con_saldo': 2,
        'ticket_promedio_pendiente': 200.0,
    }
    assert proyeccion['dias_proyeccion'] == 7
    assert proyeccion['promedio_diario_historico'] > 0
    assert len(proyeccion['serie_proyectada']) == 7
