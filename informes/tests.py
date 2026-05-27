from datetime import timedelta
from decimal import Decimal

import pytest
from django.utils import timezone
from rest_framework import status

import informes.services as informes_services
from informes.generators import PDFReportGenerator, generar_pdf_cierre_caja
from informes.models import CierreCaja, GastoCaja
from informes.services import CierreCajaService, ReporteEstadisticasService
from inventario.models import AbonoFacturaCompra, FacturaCompra
from proveedor.models import Proveedor
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
def test_cierre_caja_usa_abonos_de_facturas_compra_por_fecha_pago(
    empresa_a,
    admin_a,
):
    proveedor = Proveedor.objects.create(
        empresa=empresa_a,
        numero_documento='900555001',
        razon_social='Proveedor cierre',
        nombre_contacto='Compras',
        email='proveedor-cierre@mallor.test',
        telefono='3000000000',
        direccion='Calle 1',
        ciudad='Bogota',
        departamento='Cundinamarca',
        tipo_productos='General',
    )
    hoy = timezone.localdate()
    ahora = timezone.now()

    with empresa_context(empresa_a):
        factura_pagada_hoy = FacturaCompra.objects.create(
            empresa=empresa_a,
            numero_factura='FC-CIERRE-001',
            proveedor=proveedor,
            fecha_factura=hoy - timedelta(days=5),
            subtotal=Decimal('10000.00'),
            total=Decimal('10000.00'),
            forma_pago=FacturaCompra.FORMA_PAGO_CREDITO,
            usuario_registro=admin_a,
        )
        factura_pagada_manana = FacturaCompra.objects.create(
            empresa=empresa_a,
            numero_factura='FC-CIERRE-002',
            proveedor=proveedor,
            fecha_factura=hoy,
            subtotal=Decimal('9000.00'),
            total=Decimal('9000.00'),
            forma_pago=FacturaCompra.FORMA_PAGO_CREDITO,
            usuario_registro=admin_a,
        )
        pago_hoy = AbonoFacturaCompra.objects.create(
            empresa=empresa_a,
            factura=factura_pagada_hoy,
            monto=Decimal('4000.00'),
            metodo_pago=FacturaCompra.METODO_PAGO_EFECTIVO,
            fecha_pago=ahora,
            usuario_registro=admin_a,
        )
        AbonoFacturaCompra.objects.create(
            empresa=empresa_a,
            factura=factura_pagada_manana,
            monto=Decimal('9000.00'),
            metodo_pago=FacturaCompra.METODO_PAGO_TRANSFERENCIA,
            fecha_pago=ahora + timedelta(days=1),
            usuario_registro=admin_a,
        )

        compras = CierreCajaService._calcular_compras_mercancia_periodo(hoy, hoy)

    assert compras['monto'] == Decimal('4000.00')
    assert compras['detalle'] == [
        {
            'factura_id': factura_pagada_hoy.id,
            'pago_id': pago_hoy.id,
            'numero_factura': 'FC-CIERRE-001',
            'fecha_factura': factura_pagada_hoy.fecha_factura.isoformat(),
            'fecha_pago': timezone.localtime(pago_hoy.fecha_pago).isoformat(),
            'proveedor': 'Proveedor cierre',
            'metodo_pago': FacturaCompra.METODO_PAGO_EFECTIVO,
            'estado': FacturaCompra.ESTADO_PENDIENTE,
            'estado_pago': FacturaCompra.ESTADO_PAGO_ABONADA,
            'total': 4000.0,
        }
    ]


@pytest.mark.django_db
def test_cierre_caja_resta_compras_mercancia_en_efectivo_del_esperado(
    empresa_a,
    admin_a,
):
    hoy = timezone.localdate()
    ahora = timezone.now()
    proveedor = Proveedor.objects.create(
        empresa=empresa_a,
        numero_documento='900555002',
        razon_social='Proveedor efectivo',
        nombre_contacto='Compras',
        email='proveedor-efectivo@mallor.test',
        telefono='3000000000',
        direccion='Calle 2',
        ciudad='Bogota',
        departamento='Cundinamarca',
        tipo_productos='General',
    )

    with empresa_context(empresa_a):
        Venta.objects.filter(empresa=empresa_a).delete()
        VentaFactory(
            empresa=empresa_a,
            usuario_registro=admin_a,
            total=Decimal('10000.00'),
            subtotal=Decimal('10000.00'),
            impuestos=Decimal('0.00'),
            metodo_pago=Venta.MetodoPago.EFECTIVO,
            fecha_venta=ahora,
        )
        factura_efectivo = FacturaCompra.objects.create(
            empresa=empresa_a,
            numero_factura='FC-EFECTIVO-001',
            proveedor=proveedor,
            fecha_factura=hoy,
            subtotal=Decimal('4000.00'),
            total=Decimal('4000.00'),
            forma_pago=FacturaCompra.FORMA_PAGO_CONTADO,
            metodo_pago=FacturaCompra.METODO_PAGO_EFECTIVO,
            usuario_registro=admin_a,
        )
        factura_transferencia = FacturaCompra.objects.create(
            empresa=empresa_a,
            numero_factura='FC-TRANSFER-001',
            proveedor=proveedor,
            fecha_factura=hoy,
            subtotal=Decimal('3000.00'),
            total=Decimal('3000.00'),
            forma_pago=FacturaCompra.FORMA_PAGO_CONTADO,
            metodo_pago=FacturaCompra.METODO_PAGO_TRANSFERENCIA,
            usuario_registro=admin_a,
        )
        AbonoFacturaCompra.objects.create(
            empresa=empresa_a,
            factura=factura_efectivo,
            monto=Decimal('4000.00'),
            metodo_pago=FacturaCompra.METODO_PAGO_EFECTIVO,
            fecha_pago=ahora,
            usuario_registro=admin_a,
        )
        AbonoFacturaCompra.objects.create(
            empresa=empresa_a,
            factura=factura_transferencia,
            monto=Decimal('3000.00'),
            metodo_pago=FacturaCompra.METODO_PAGO_TRANSFERENCIA,
            fecha_pago=ahora,
            usuario_registro=admin_a,
        )
        gastos = CierreCajaService._construir_gastos_operativos(hoy)
        cierre = CierreCaja.objects.create(
            empresa=empresa_a,
            fecha_cierre=hoy,
            usuario_cierre=admin_a,
            efectivo_real=Decimal('6000.00'),
            gastos_operativos=CierreCajaService._serializar_gastos_operativos(
                gastos,
            ),
        )

    assert cierre.total_efectivo == Decimal('10000.00')
    assert cierre.total_gastos == Decimal('7000.00')
    assert cierre.efectivo_esperado == Decimal('6000.00')
    assert cierre.diferencia == Decimal('0.00')


@pytest.mark.django_db
def test_cierre_caja_resta_gastos_manuales_en_efectivo_y_resume_metodos(
    empresa_a,
    admin_a,
):
    hoy = timezone.localdate()
    ahora = timezone.now()

    with empresa_context(empresa_a):
        Venta.objects.filter(empresa=empresa_a).delete()
        VentaFactory(
            empresa=empresa_a,
            usuario_registro=admin_a,
            total=Decimal('20000.00'),
            subtotal=Decimal('20000.00'),
            impuestos=Decimal('0.00'),
            metodo_pago=Venta.MetodoPago.EFECTIVO,
            fecha_venta=ahora,
        )
        gastos = CierreCajaService._construir_gastos_operativos(
            hoy,
            {
                'servicios_publicos': {
                    'monto': Decimal('3000.00'),
                    'metodo_pago': 'EFECTIVO',
                    'descripcion': 'Energia',
                },
                'arriendos': {
                    'monto': Decimal('5000.00'),
                    'metodo_pago': 'TRANSFERENCIA',
                    'descripcion': 'Canon',
                },
            },
        )
        cierre = CierreCaja.objects.create(
            empresa=empresa_a,
            fecha_cierre=hoy,
            usuario_cierre=admin_a,
            efectivo_real=Decimal('17000.00'),
            gastos_operativos=CierreCajaService._serializar_gastos_operativos(
                gastos,
            ),
        )

    assert cierre.total_gastos == Decimal('8000.00')
    assert cierre.efectivo_esperado == Decimal('17000.00')
    assert cierre.diferencia == Decimal('0.00')
    assert cierre.gastos_operativos['por_metodo_pago'] == {
        'EFECTIVO': 3000.0,
        'TRANSFERENCIA': 5000.0,
    }


@pytest.mark.django_db
def test_gasto_manual_con_monto_requiere_metodo_pago(empresa_a):
    with empresa_context(empresa_a), pytest.raises(Exception):
        CierreCajaService._construir_gastos_operativos(
            timezone.localdate(),
            {
                'otros_gastos': {
                    'monto': Decimal('1000.00'),
                    'descripcion': 'Papeleria',
                },
            },
        )


@pytest.mark.django_db
def test_pdf_cierre_caja_no_falla_con_metodos_de_pago_en_cero(
    empresa_a,
    admin_a,
):
    hoy = timezone.localdate()

    with empresa_context(empresa_a):
        Venta.objects.filter(empresa=empresa_a).delete()
        cierre = CierreCaja.objects.create(
            empresa=empresa_a,
            fecha_cierre=hoy,
            usuario_cierre=admin_a,
            efectivo_real=Decimal('0.00'),
            gastos_operativos=CierreCajaService._serializar_gastos_operativos(
                CierreCajaService._construir_gastos_operativos(hoy),
            ),
        )

        reporte = generar_pdf_cierre_caja(cierre.id)

    assert reporte.content_type == 'application/pdf'
    assert reporte.content.startswith(b'%PDF')


def test_pdf_cierre_caja_construye_gastos_con_metodo_y_resumen():
    generator = PDFReportGenerator()
    gastos_operativos = {
        'compras_mercancia': {
            'monto': 400000.0,
            'detalle': [
                {
                    'numero_factura': 'FC-100',
                    'proveedor': 'Proveedor Uno',
                    'metodo_pago': 'TRANSFERENCIA',
                    'total': 400000.0,
                },
            ],
        },
        'salarios': {
            'monto': 1200000.0,
            'metodo_pago': 'EFECTIVO',
            'descripcion': 'Nomina del dia',
        },
        'por_metodo_pago': {
            'EFECTIVO': 1200000.0,
            'TRANSFERENCIA': 400000.0,
        },
    }

    assert generator._build_expense_rows(gastos_operativos) == [
        [
            'Compras de mercancia',
            '$400,000.00',
            'Transferencia',
            'Factura FC-100 - Proveedor Uno',
        ],
        ['Salarios', '$1,200,000.00', 'Efectivo', 'Nomina del dia'],
    ]
    assert generator._build_expense_payment_rows(gastos_operativos) == [
        ['Efectivo', '$1,200,000.00'],
        ['Transferencia', '$400,000.00'],
    ]


@pytest.mark.django_db
def test_resumen_periodo_cierre_consolida_mes_con_gastos_por_metodo(
    empresa_a,
    admin_a,
):
    hoy = timezone.localdate()
    proveedor = Proveedor.objects.create(
        empresa=empresa_a,
        numero_documento='900555003',
        razon_social='Proveedor mensual',
        nombre_contacto='Compras',
        email='proveedor-mensual@mallor.test',
        telefono='3000000000',
        direccion='Calle 3',
        ciudad='Bogota',
        departamento='Cundinamarca',
        tipo_productos='General',
    )

    with empresa_context(empresa_a):
        Venta.objects.filter(empresa=empresa_a).delete()
        VentaFactory(
            empresa=empresa_a,
            usuario_registro=admin_a,
            total=Decimal('50000.00'),
            subtotal=Decimal('50000.00'),
            impuestos=Decimal('0.00'),
            metodo_pago=Venta.MetodoPago.EFECTIVO,
            fecha_venta=timezone.now(),
        )
        factura = FacturaCompra.objects.create(
            empresa=empresa_a,
            numero_factura='FC-MES-001',
            proveedor=proveedor,
            fecha_factura=hoy,
            subtotal=Decimal('10000.00'),
            total=Decimal('10000.00'),
            forma_pago=FacturaCompra.FORMA_PAGO_CONTADO,
            metodo_pago=FacturaCompra.METODO_PAGO_TRANSFERENCIA,
            usuario_registro=admin_a,
        )
        AbonoFacturaCompra.objects.create(
            empresa=empresa_a,
            factura=factura,
            monto=Decimal('10000.00'),
            metodo_pago=FacturaCompra.METODO_PAGO_TRANSFERENCIA,
            fecha_pago=timezone.now(),
            usuario_registro=admin_a,
        )
        gastos = CierreCajaService._construir_gastos_operativos(
            hoy,
            {
                'salarios': {
                    'monto': Decimal('12000.00'),
                    'metodo_pago': 'EFECTIVO',
                    'descripcion': 'Nomina',
                },
            },
        )
        CierreCaja.objects.create(
            empresa=empresa_a,
            fecha_cierre=hoy,
            usuario_cierre=admin_a,
            efectivo_real=Decimal('38000.00'),
            gastos_operativos=CierreCajaService._serializar_gastos_operativos(
                gastos,
            ),
        )

        resumen = CierreCajaService.generar_resumen_periodo(
            hoy.replace(day=1),
            hoy,
        )

    assert resumen['tipo_cierre'] == 'MENSUAL'
    assert resumen['total_ventas'] == 50000.0
    assert resumen['total_gastos'] == 22000.0
    assert resumen['gastos_operativos']['por_metodo_pago'] == {
        'EFECTIVO': 12000.0,
        'TRANSFERENCIA': 10000.0,
    }


@pytest.mark.django_db
def test_cierre_caja_acepta_gastos_dinamicos_con_metodos_distintos(
    empresa_a,
    admin_a,
):
    hoy = timezone.localdate()

    with empresa_context(empresa_a):
        gastos = CierreCajaService._construir_gastos_operativos(
            hoy,
            {
                'otros_gastos': {
                    'monto': Decimal('15000.00'),
                    'metodo_pago': 'EFECTIVO',
                    'detalle': [
                        {
                            'descripcion': 'Compra de agua',
                            'monto': '5000.00',
                            'metodo_pago': 'EFECTIVO',
                        },
                        {
                            'descripcion': 'Almuerzo',
                            'monto': '10000.00',
                            'metodo_pago': 'TRANSFERENCIA',
                        },
                    ],
                },
            },
        )
        cierre = CierreCaja.objects.create(
            empresa=empresa_a,
            fecha_cierre=hoy,
            usuario_cierre=admin_a,
            efectivo_real=Decimal('0.00'),
            gastos_operativos=CierreCajaService._serializar_gastos_operativos(
                gastos,
            ),
        )

    assert cierre.total_gastos == Decimal('15000.00')
    assert cierre.gastos_operativos['por_metodo_pago'] == {
        'EFECTIVO': 5000.0,
        'TRANSFERENCIA': 10000.0,
    }
    assert cierre.gastos_operativos['otros_gastos']['detalle'][0] == {
        'descripcion': 'Compra de agua',
        'monto': '5000.00',
        'metodo_pago': 'EFECTIVO',
    }


@pytest.mark.django_db
def test_cierre_caja_incluye_gastos_caja_persistidos(empresa_a, admin_a):
    hoy = timezone.localdate()

    with empresa_context(empresa_a):
        gasto = GastoCaja.objects.create(
            empresa=empresa_a,
            fecha=hoy,
            descripcion='Compra de agua',
            monto=Decimal('5000.00'),
            metodo_pago=GastoCaja.MetodoPago.EFECTIVO,
            usuario_registro=admin_a,
        )
        cierre = CierreCajaService.generar_cierre_caja(
            fecha=hoy,
            efectivo_real=Decimal('0.00'),
            usuario_cierre=admin_a,
        )

    detalle = cierre.gastos_operativos['otros_gastos']['detalle']
    assert cierre.total_gastos == Decimal('5000.00')
    assert detalle == [
        {
            'gasto_caja_id': gasto.id,
            'descripcion': 'Compra de agua',
            'monto': 5000.0,
            'metodo_pago': 'EFECTIVO',
            'fecha': hoy.isoformat(),
        },
    ]
    assert cierre.gastos_operativos['por_metodo_pago']['EFECTIVO'] == 5000.0


@pytest.mark.django_db
def test_resumen_periodo_incluye_gastos_caja_sin_cierre(empresa_a, admin_a):
    hoy = timezone.localdate()

    with empresa_context(empresa_a):
        GastoCaja.objects.create(
            empresa=empresa_a,
            fecha=hoy,
            descripcion='Almuerzo',
            monto=Decimal('12000.00'),
            metodo_pago=GastoCaja.MetodoPago.TRANSFERENCIA,
            usuario_registro=admin_a,
        )
        resumen = CierreCajaService.generar_resumen_periodo(hoy, hoy)

    detalle = resumen['gastos_operativos']['otros_gastos']['detalle']
    assert resumen['total_gastos'] == 12000.0
    assert resumen['gastos_operativos']['por_metodo_pago'] == {
        'EFECTIVO': 0.0,
        'TRANSFERENCIA': 12000.0,
    }
    assert detalle[0]['descripcion'] == 'Almuerzo'
    assert detalle[0]['metodo_pago'] == 'TRANSFERENCIA'


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
