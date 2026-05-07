from decimal import Decimal

import pytest

from core.exceptions import ProductoNoEncontradoError
from inventario.services import ProductoService
from tests.factories import ProductoFactory
from tests.helpers import empresa_context


@pytest.mark.django_db
@pytest.mark.multitenant
def test_producto_service_lista_solo_productos_de_empresa_activa(
    empresa_a,
    empresa_b,
):
    producto_a = ProductoFactory(empresa=empresa_a, nombre='Producto A')
    ProductoFactory(empresa=empresa_b, nombre='Producto B')

    with empresa_context(empresa_a):
        productos = ProductoService.listar_productos()

    assert [producto.id for producto in productos] == [producto_a.id]


@pytest.mark.django_db
@pytest.mark.multitenant
def test_producto_service_no_resuelve_producto_de_otro_tenant(
    empresa_a,
    empresa_b,
):
    producto_b = ProductoFactory(
        empresa=empresa_b,
        nombre='Producto B',
        existencias=Decimal('8'),
    )

    with empresa_context(empresa_a):
        with pytest.raises(ProductoNoEncontradoError):
            ProductoService.obtener_producto(producto_b.id)
