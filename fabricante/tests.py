from decimal import Decimal

from django.test import SimpleTestCase, TestCase

from core.exceptions import ProduccionNoPermitidaError
from inventario.models import Producto
from proveedor.models import Proveedor
from usuario.models import Usuario

from fabricante.models import Ingrediente, IngredientesProducto, ProductoFabricado
from fabricante.serializers import (
    IngredienteSerializer,
    ProductoFabricadoDetailSerializer,
)
from fabricante.services import IngredienteService, ProductoFabricadoService
from fabricante.utils import (
    calcular_costo_por_unidad_destino,
    convertir_unidad,
    validar_compatibilidad_unidades,
)


class ConversionUnidadesUtilsTest(SimpleTestCase):
    """
    Pruebas unitarias para las utilidades de conversion de unidades.
    """

    def test_validar_compatibilidad_unidades_volumen(self):
        """
        Verifica compatibilidad entre unidades del mismo tipo.
        """
        self.assertTrue(
            validar_compatibilidad_unidades('GALONES', 'MILILITROS')
        )
        self.assertTrue(
            validar_compatibilidad_unidades('LIBRAS', 'GRAMOS')
        )

    def test_validar_compatibilidad_unidades_incompatibles(self):
        """
        Verifica que unidades de distinto tipo no sean compatibles.
        """
        self.assertFalse(
            validar_compatibilidad_unidades('GALONES', 'GRAMOS')
        )
        self.assertFalse(
            validar_compatibilidad_unidades('UNIDADES', 'LITROS')
        )

    def test_convertir_unidad_volumen(self):
        """
        Verifica conversiones de volumen soportadas.
        """
        self.assertEqual(
            convertir_unidad(Decimal('1'), 'GALONES', 'LITROS'),
            Decimal('3.7854'),
        )
        self.assertEqual(
            convertir_unidad(Decimal('1'), 'ONZAS_LIQUIDAS', 'MILILITROS'),
            Decimal('29.5735'),
        )
        self.assertEqual(
            convertir_unidad(Decimal('500'), 'MILILITROS', 'GALONES'),
            Decimal('0.1321'),
        )

    def test_convertir_unidad_masa(self):
        """
        Verifica conversiones de masa soportadas.
        """
        self.assertEqual(
            convertir_unidad(Decimal('1'), 'LIBRAS', 'KILOGRAMOS'),
            Decimal('0.4536'),
        )
        self.assertEqual(
            convertir_unidad(Decimal('2'), 'KILOGRAMOS', 'GRAMOS'),
            Decimal('2000.0000'),
        )
        self.assertEqual(
            convertir_unidad(Decimal('1'), 'ONZAS', 'GRAMOS'),
            Decimal('28.3495'),
        )

    def test_convertir_unidad_incompatible_lanza_error(self):
        """
        Verifica que las conversiones incompatibles fallen.
        """
        with self.assertRaises(ValueError):
            convertir_unidad(Decimal('1'), 'LITROS', 'GRAMOS')

    def test_calcular_costo_por_unidad_destino(self):
        """
        Verifica el costo equivalente por unidad de destino.
        """
        costo_por_mililitro = calcular_costo_por_unidad_destino(
            Decimal('10000'),
            'GALONES',
            'MILILITROS',
        )

        self.assertEqual(costo_por_mililitro, Decimal('2.6417'))
        self.assertEqual(
            (costo_por_mililitro * Decimal('500')).quantize(
                Decimal('0.0001')
            ),
            Decimal('1320.8500'),
        )


class IngredientesProductoConversionTest(TestCase):
    """
    Pruebas de integracion entre receta y conversion de unidades.
    """

    def setUp(self):
        """
        Configuracion base para las pruebas del producto fabricado.
        """
        self.ingrediente = Ingrediente.objects.create(
            nombre='Leche entera',
            descripcion='Leche para preparacion',
            unidad_medida=Ingrediente.UnidadMedida.GALONES,
            precio_por_unidad=Decimal('10000'),
            stock_actual=Decimal('2.0000'),
            stock_minimo=Decimal('0.5000'),
        )
        self.producto_fabricado = ProductoFabricado.objects.create(
            nombre='Yogur de fresa',
            descripcion='Lote de yogur sabor fresa',
            unidad_medida=ProductoFabricado.UnidadMedida.UNIDADES,
            cantidad_producida=Decimal('10'),
            precio_venta_sugerido=Decimal('2500'),
            precio_venta=Decimal('2500'),
            tiempo_produccion=90,
        )

    def test_receta_calcula_costo_con_conversion(self):
        """
        Verifica que la receta convierta mililitros a galones.
        """
        receta = IngredientesProducto.objects.create(
            producto_fabricado=self.producto_fabricado,
            ingrediente=self.ingrediente,
            cantidad_necesaria=Decimal('500'),
            unidad_medida=Ingrediente.UnidadMedida.MILILITROS,
        )

        self.producto_fabricado.refresh_from_db()

        self.assertEqual(receta.costo_ingrediente, Decimal('1320.8500'))
        self.assertEqual(
            self.producto_fabricado.costo_produccion,
            Decimal('1320.8500'),
        )
        self.assertEqual(
            self.producto_fabricado.costo_unitario,
            Decimal('132.0850'),
        )

    def test_validar_disponibilidad_ingredientes_con_conversion(self):
        """
        Verifica stock insuficiente usando unidades convertidas.
        """
        self.ingrediente.stock_actual = Decimal('0.1000')
        self.ingrediente.save(update_fields=['stock_actual', 'updated_at'])

        IngredientesProducto.objects.create(
            producto_fabricado=self.producto_fabricado,
            ingrediente=self.ingrediente,
            cantidad_necesaria=Decimal('500'),
            unidad_medida=Ingrediente.UnidadMedida.MILILITROS,
        )

        self.producto_fabricado.refresh_from_db()
        self.assertFalse(
            self.producto_fabricado.validar_disponibilidad_ingredientes()
        )


class FabricanteSerializerTest(TestCase):
    """
    Pruebas para serializers del modulo fabricante.
    """

    def setUp(self):
        self.proveedor = Proveedor.objects.create(
            numero_documento='900100200',
            razon_social='Proveedor Lacteos SAS',
            nombre_contacto='Ana Proveedor',
            email='proveedor@mallor.test',
            telefono='3000000000',
            direccion='Calle 1 # 2-3',
            ciudad='Bogota',
            departamento='Cundinamarca',
            tipo_productos='Lacteos',
        )
        self.ingrediente = Ingrediente.objects.create(
            nombre='Leche',
            descripcion='Leche entera',
            unidad_medida=Ingrediente.UnidadMedida.GALONES,
            precio_por_unidad=Decimal('10000'),
            proveedor=self.proveedor,
            stock_actual=Decimal('2.0000'),
            stock_minimo=Decimal('0.5000'),
        )
        self.producto_fabricado = ProductoFabricado.objects.create(
            nombre='Batido de vainilla',
            descripcion='Producto de prueba',
            unidad_medida=ProductoFabricado.UnidadMedida.UNIDADES,
            cantidad_producida=Decimal('10'),
            precio_venta_sugerido=Decimal('2500'),
            precio_venta=Decimal('2500'),
            tiempo_produccion=30,
        )
        self.receta = IngredientesProducto.objects.create(
            producto_fabricado=self.producto_fabricado,
            ingrediente=self.ingrediente,
            cantidad_necesaria=Decimal('500'),
            unidad_medida=Ingrediente.UnidadMedida.MILILITROS,
        )

    def test_ingrediente_serializer_expone_proveedor_y_stock(self):
        serializer = IngredienteSerializer(instance=self.ingrediente)

        self.assertEqual(serializer.data['proveedor_nombre'], self.proveedor.nombre_completo)
        self.assertFalse(serializer.data['stock_bajo_minimo'])

    def test_producto_fabricado_detail_serializer_incluye_receta(self):
        serializer = ProductoFabricadoDetailSerializer(
            instance=self.producto_fabricado,
        )

        self.assertEqual(len(serializer.data['receta']), 1)
        self.assertEqual(
            serializer.data['receta'][0]['ingrediente']['nombre'],
            'Leche',
        )


class FabricanteServiceTest(TestCase):
    """
    Pruebas para los services del modulo fabricante.
    """

    def setUp(self):
        self.usuario = Usuario.objects.create_user(
            username='fabricante',
            email='fabricante@mallor.test',
            password='Password123',
            first_name='Fab',
            last_name='Ricante',
        )
        self.proveedor = Proveedor.objects.create(
            numero_documento='900200300',
            razon_social='Proveedor General SAS',
            nombre_contacto='Luis Compra',
            email='compras@mallor.test',
            telefono='3110000000',
            direccion='Carrera 7 # 10-11',
            ciudad='Bogota',
            departamento='Cundinamarca',
            tipo_productos='General',
        )
        self.ingrediente = Ingrediente.objects.create(
            nombre='Leche descremada',
            descripcion='Ingrediente principal',
            unidad_medida=Ingrediente.UnidadMedida.GALONES,
            precio_por_unidad=Decimal('10000'),
            proveedor=self.proveedor,
            stock_actual=Decimal('2.0000'),
            stock_minimo=Decimal('0.5000'),
        )

    def test_crear_y_listar_ingredientes(self):
        IngredienteService.crear_ingrediente({
            'nombre': 'Azucar',
            'descripcion': 'Azucar blanca',
            'unidad_medida': Ingrediente.UnidadMedida.KILOGRAMOS,
            'precio_por_unidad': Decimal('4500'),
            'stock_actual': Decimal('5.0000'),
            'stock_minimo': Decimal('1.0000'),
        })

        ingredientes = IngredienteService.listar_ingredientes({'q': 'azu'})
        self.assertEqual(len(ingredientes), 1)
        self.assertEqual(ingredientes[0].nombre, 'Azucar')

    def test_crear_producto_fabricado_con_receta_calcula_costos(self):
        producto = ProductoFabricadoService.crear_producto_fabricado(
            data={
                'nombre': 'Yogur natural',
                'descripcion': 'Lote de yogur natural',
                'unidad_medida': ProductoFabricado.UnidadMedida.UNIDADES,
                'cantidad_producida': Decimal('10'),
                'precio_venta': Decimal('2500'),
                'precio_venta_sugerido': Decimal('2500'),
                'tiempo_produccion': 45,
            },
            receta=[
                {
                    'ingrediente_id': self.ingrediente.id,
                    'cantidad_necesaria': Decimal('500'),
                    'unidad_medida': Ingrediente.UnidadMedida.MILILITROS,
                },
            ],
        )

        self.assertEqual(producto.receta.count(), 1)
        self.assertEqual(producto.costo_produccion, Decimal('1320.8500'))
        self.assertEqual(producto.costo_unitario, Decimal('132.0850'))

    def test_sugerir_precio_venta_por_margen(self):
        producto = ProductoFabricadoService.crear_producto_fabricado(
            data={
                'nombre': 'Kumis',
                'descripcion': 'Kumis natural',
                'unidad_medida': ProductoFabricado.UnidadMedida.UNIDADES,
                'cantidad_producida': Decimal('10'),
                'precio_venta': Decimal('0'),
                'precio_venta_sugerido': Decimal('0'),
                'tiempo_produccion': 35,
            },
            receta=[
                {
                    'ingrediente_id': self.ingrediente.id,
                    'cantidad_necesaria': Decimal('500'),
                    'unidad_medida': Ingrediente.UnidadMedida.MILILITROS,
                },
            ],
        )

        sugerido = ProductoFabricadoService.sugerir_precio_venta(
            producto.id,
            Decimal('50'),
        )

        self.assertEqual(sugerido, Decimal('198.13'))

    def test_validar_produccion_detecta_faltantes(self):
        self.ingrediente.stock_actual = Decimal('0.1000')
        self.ingrediente.save(update_fields=['stock_actual', 'updated_at'])

        producto = ProductoFabricadoService.crear_producto_fabricado(
            data={
                'nombre': 'Yogur fresa',
                'descripcion': 'Yogur de prueba',
                'unidad_medida': ProductoFabricado.UnidadMedida.UNIDADES,
                'cantidad_producida': Decimal('10'),
                'precio_venta': Decimal('2500'),
                'precio_venta_sugerido': Decimal('2500'),
                'tiempo_produccion': 45,
            },
            receta=[
                {
                    'ingrediente_id': self.ingrediente.id,
                    'cantidad_necesaria': Decimal('500'),
                    'unidad_medida': Ingrediente.UnidadMedida.MILILITROS,
                },
            ],
        )

        resultado = ProductoFabricadoService.validar_produccion(
            producto.id,
            Decimal('1'),
        )

        self.assertFalse(resultado['es_valida'])
        self.assertEqual(len(resultado['faltantes']), 1)

    def test_producir_lote_descuenta_stock_y_actualiza_inventario(self):
        producto = ProductoFabricadoService.crear_producto_fabricado(
            data={
                'nombre': 'Avena',
                'descripcion': 'Avena lista',
                'unidad_medida': ProductoFabricado.UnidadMedida.UNIDADES,
                'cantidad_producida': Decimal('10'),
                'precio_venta': Decimal('2500'),
                'precio_venta_sugerido': Decimal('2500'),
                'tiempo_produccion': 40,
            },
            receta=[
                {
                    'ingrediente_id': self.ingrediente.id,
                    'cantidad_necesaria': Decimal('500'),
                    'unidad_medida': Ingrediente.UnidadMedida.MILILITROS,
                },
            ],
        )
        producto_inventario = ProductoFabricadoService.convertir_a_producto_inventario(
            producto.id,
        )

        resultado = ProductoFabricadoService.producir_lote(
            producto.id,
            Decimal('1'),
        )

        self.ingrediente.refresh_from_db()
        producto_inventario.refresh_from_db()

        self.assertEqual(self.ingrediente.stock_actual, Decimal('1.8679'))
        self.assertEqual(producto_inventario.existencias, Decimal('10.00'))
        self.assertEqual(
            resultado['cantidad_total_producida'],
            Decimal('10.0000'),
        )

    def test_producir_lote_sin_stock_lanza_error(self):
        self.ingrediente.stock_actual = Decimal('0.0500')
        self.ingrediente.save(update_fields=['stock_actual', 'updated_at'])

        producto = ProductoFabricadoService.crear_producto_fabricado(
            data={
                'nombre': 'Leche saborizada',
                'descripcion': 'Producto de prueba',
                'unidad_medida': ProductoFabricado.UnidadMedida.UNIDADES,
                'cantidad_producida': Decimal('10'),
                'precio_venta': Decimal('2500'),
                'precio_venta_sugerido': Decimal('2500'),
                'tiempo_produccion': 20,
            },
            receta=[
                {
                    'ingrediente_id': self.ingrediente.id,
                    'cantidad_necesaria': Decimal('500'),
                    'unidad_medida': Ingrediente.UnidadMedida.MILILITROS,
                },
            ],
        )

        with self.assertRaises(ProduccionNoPermitidaError):
            ProductoFabricadoService.producir_lote(producto.id, Decimal('1'))

    def test_convertir_a_producto_inventario_crea_relacion(self):
        producto = ProductoFabricadoService.crear_producto_fabricado(
            data={
                'nombre': 'Queso crema',
                'descripcion': 'Producto para inventario',
                'unidad_medida': ProductoFabricado.UnidadMedida.UNIDADES,
                'cantidad_producida': Decimal('8'),
                'precio_venta': Decimal('4200'),
                'precio_venta_sugerido': Decimal('4300'),
                'tiempo_produccion': 50,
            },
            receta=[
                {
                    'ingrediente_id': self.ingrediente.id,
                    'cantidad_necesaria': Decimal('500'),
                    'unidad_medida': Ingrediente.UnidadMedida.MILILITROS,
                },
            ],
        )

        inventario_producto = ProductoFabricadoService.convertir_a_producto_inventario(
            producto.id,
        )
        producto.refresh_from_db()

        self.assertIsInstance(inventario_producto, Producto)
        self.assertEqual(producto.producto_final_id, inventario_producto.id)
        self.assertEqual(inventario_producto.precio_compra, Decimal('165.11'))
