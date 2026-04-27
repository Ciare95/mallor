from decimal import Decimal

from django.test import SimpleTestCase, TestCase

from fabricante.models import Ingrediente, IngredientesProducto, ProductoFabricado
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
