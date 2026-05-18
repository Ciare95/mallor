from rest_framework import status

from tests.factories import CategoriaFactory, ProductoFactory
from tests.helpers import api_client_for_empresa


def build_producto_payload(**overrides):
    payload = {
        'codigo_interno': 101,
        'codigo_barras': '7701234567890',
        'nombre': 'Producto tenant aislado',
        'categoria': None,
        'marca': 'Mallor',
        'descripcion': 'Prueba de aislamiento',
        'existencias': '5.00',
        'invima': '',
        'precio_compra': '1000.00',
        'precio_venta': '1500.00',
        'iva': '19.00',
        'unidad_medida_codigo': '94',
        'estandar_codigo': '999',
        'fecha_caducidad': None,
    }
    payload.update(overrides)
    return payload


def test_crear_producto_permite_codigo_interno_repetido_en_otro_tenant(
    api_client_empresa,
    empresa_a,
    empresa_b,
):
    ProductoFactory(
        empresa=empresa_b,
        codigo_interno=101,
        codigo_barras='7700000000101',
    )

    response = api_client_empresa.post(
        '/api/inventario/productos/',
        build_producto_payload(),
        format='json',
    )

    assert response.status_code == status.HTTP_201_CREATED
    body = response.json()
    assert body['codigo_interno'] == 101
    assert body['codigo_barras'] == '7701234567890'


def test_crear_producto_permite_codigo_barras_repetido_en_otro_tenant(
    api_client_empresa,
    empresa_b,
):
    ProductoFactory(
        empresa=empresa_b,
        codigo_interno=202,
        codigo_barras='7701234567890',
    )

    response = api_client_empresa.post(
        '/api/inventario/productos/',
        build_producto_payload(codigo_interno=303),
        format='json',
    )

    assert response.status_code == status.HTTP_201_CREATED
    assert response.json()['codigo_barras'] == '7701234567890'


def test_crear_producto_rechaza_categoria_de_otro_tenant(
    api_client_empresa,
    empresa_b,
):
    categoria_ajena = CategoriaFactory(empresa=empresa_b)

    response = api_client_empresa.post(
        '/api/inventario/productos/',
        build_producto_payload(categoria=categoria_ajena.id),
        format='json',
    )

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert 'categoria' in response.json()


def test_crear_categoria_permite_mismo_nombre_en_otro_tenant(
    admin_a,
    empresa_a,
    empresa_b,
):
    CategoriaFactory(empresa=empresa_b, nombre='Medicamentos')
    client = api_client_for_empresa(admin_a, empresa_a)

    response = client.post(
        '/api/inventario/categorias/',
        {'nombre': 'Medicamentos', 'descripcion': 'Tenant A'},
        format='json',
    )

    assert response.status_code == status.HTTP_201_CREATED
    assert response.json()['nombre'] == 'MEDICAMENTOS'
