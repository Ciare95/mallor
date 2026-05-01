from decimal import Decimal

from django.test import SimpleTestCase, TestCase
from rest_framework import status
from rest_framework.test import APIClient

from core.exceptions import ProduccionNoPermitidaError
from inventario.models import Producto
from proveedor.models import Proveedor
from usuario.models import Usuario

from fabricante.models import (
    Ingrediente,
    IngredientesProducto,
    PresentacionProductoFabricado,
    ProductoFabricado,
)
from fabricante.serializers import (
    IngredienteSerializer,
    ProductoFabricadoDetailSerializer,
)
from fabricante.services import (
    IngredienteService,
    ProductoFabricadoService,
)
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
            validar_compatibilidad_unidades('GARRAFAS', 'LITROS')
        )
        self.assertTrue(
            validar_compatibilidad_unidades('LIBRAS', 'GRAMOS')
        )
        self.assertTrue(
            validar_compatibilidad_unidades('GALONES', 'GRAMOS')
        )
        self.assertTrue(
            validar_compatibilidad_unidades('KILOGRAMOS', 'LITROS')
        )

    def test_validar_compatibilidad_unidades_incompatibles(self):
        """
        Verifica que unidades de distinto tipo no sean compatibles.
        """
        self.assertFalse(
            validar_compatibilidad_unidades('UNIDADES', 'LITROS')
        )

    def test_convertir_unidad_volumen(self):
        """
        Verifica conversiones de volumen soportadas.
        """
        self.assertEqual(
            convertir_unidad(Decimal('1'), 'GARRAFAS', 'GALONES'),
            Decimal('5.0000'),
        )
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

    def test_convertir_unidad_liquidos_entre_volumen_y_masa(self):
        """
        Verifica conversiones liquidas usando equivalencia 1 ml = 1 g.
        """
        self.assertEqual(
            convertir_unidad(Decimal('1'), 'GALONES', 'GRAMOS'),
            Decimal('3785.4118'),
        )
        self.assertEqual(
            convertir_unidad(Decimal('500'), 'GRAMOS', 'GALONES'),
            Decimal('0.1321'),
        )
        self.assertEqual(
            convertir_unidad(Decimal('1'), 'KILOGRAMOS', 'LITROS'),
            Decimal('1.0000'),
        )

    def test_convertir_unidad_incompatible_lanza_error(self):
        """
        Verifica que las conversiones incompatibles fallen.
        """
        with self.assertRaises(ValueError):
            convertir_unidad(Decimal('1'), 'UNIDADES', 'GRAMOS')

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

    def test_calcular_costo_por_unidad_destino_desde_garrafa(self):
        """
        Verifica el costo equivalente desde una garrafa de 5 galones.
        """
        costo_por_litro = calcular_costo_por_unidad_destino(
            Decimal('50000'),
            'GARRAFAS',
            'LITROS',
        )

        self.assertEqual(costo_por_litro, Decimal('2641.7148'))


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

    def test_validar_disponibilidad_ingredientes_galones_a_gramos(self):
        """
        Verifica equivalencia liquida entre galones y gramos.
        """
        IngredientesProducto.objects.create(
            producto_fabricado=self.producto_fabricado,
            ingrediente=self.ingrediente,
            cantidad_necesaria=Decimal('500'),
            unidad_medida=Ingrediente.UnidadMedida.GRAMOS,
        )

        self.producto_fabricado.refresh_from_db()

        self.assertTrue(
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

    def test_crear_producto_con_presentaciones(self):
        producto = ProductoFabricadoService.crear_producto_fabricado(
            data={
                'nombre': 'Jabon liquido base',
                'descripcion': 'Lote maestro',
                'unidad_medida': ProductoFabricado.UnidadMedida.LITROS,
                'cantidad_producida': Decimal('20'),
                'precio_venta': Decimal('0'),
                'precio_venta_sugerido': Decimal('0'),
                'tiempo_produccion': 55,
            },
            receta=[
                {
                    'ingrediente_id': self.ingrediente.id,
                    'cantidad_necesaria': Decimal('1'),
                    'unidad_medida': Ingrediente.UnidadMedida.GALONES,
                },
            ],
            presentaciones=[
                {
                    'nombre': 'Envase 1 litro',
                    'cantidad_por_unidad': Decimal('1'),
                    'unidad_medida': ProductoFabricado.UnidadMedida.LITROS,
                    'precio_venta_sugerido': Decimal('800'),
                    'precio_venta': Decimal('850'),
                },
                {
                    'nombre': 'Envase 3 litros',
                    'cantidad_por_unidad': Decimal('3'),
                    'unidad_medida': ProductoFabricado.UnidadMedida.LITROS,
                    'precio_venta_sugerido': Decimal('2200'),
                    'precio_venta': Decimal('2400'),
                },
            ],
        )

        self.assertEqual(producto.presentaciones.count(), 2)
        presentacion = producto.presentaciones.get(nombre='Envase 1 litro')
        self.assertEqual(
            presentacion.costo_unitario_presentacion,
            Decimal('500.0000'),
        )

    def test_empacar_presentacion_descuenta_stock_fabricado(self):
        producto = ProductoFabricadoService.crear_producto_fabricado(
            data={
                'nombre': 'Jabon liquido base',
                'descripcion': 'Lote maestro',
                'unidad_medida': ProductoFabricado.UnidadMedida.LITROS,
                'cantidad_producida': Decimal('20'),
                'precio_venta': Decimal('0'),
                'precio_venta_sugerido': Decimal('0'),
                'tiempo_produccion': 55,
            },
            receta=[
                {
                    'ingrediente_id': self.ingrediente.id,
                    'cantidad_necesaria': Decimal('1'),
                    'unidad_medida': Ingrediente.UnidadMedida.GALONES,
                },
            ],
            presentaciones=[
                {
                    'nombre': 'Envase 1 litro',
                    'cantidad_por_unidad': Decimal('1'),
                    'unidad_medida': ProductoFabricado.UnidadMedida.LITROS,
                    'precio_venta_sugerido': Decimal('800'),
                    'precio_venta': Decimal('850'),
                },
                {
                    'nombre': 'Envase 3 litros',
                    'cantidad_por_unidad': Decimal('3'),
                    'unidad_medida': ProductoFabricado.UnidadMedida.LITROS,
                    'precio_venta_sugerido': Decimal('2200'),
                    'precio_venta': Decimal('2400'),
                },
            ],
        )

        ProductoFabricadoService.producir_lote(producto.id, Decimal('1'))
        presentacion = producto.presentaciones.get(nombre='Envase 3 litros')

        resultado = ProductoFabricadoService.empacar_presentacion(
            producto.id,
            presentacion.id,
            Decimal('2'),
            usuario=self.usuario,
        )

        producto.refresh_from_db()
        inventario = resultado['producto_inventario']
        inventario.refresh_from_db()

        self.assertEqual(producto.stock_fabricado_disponible, Decimal('14.0000'))
        self.assertEqual(inventario.existencias, Decimal('2.00'))
        self.assertEqual(
            inventario.nombre,
            'Jabon liquido base - Envase 3 litros',
        )
        self.assertEqual(
            resultado['cantidad_consumida_lote'],
            Decimal('6.0000'),
        )

    def test_empacar_presentacion_resincroniza_nombre_inventario_existente(self):
        producto = ProductoFabricadoService.crear_producto_fabricado(
            data={
                'nombre': 'Jabon liquido base',
                'descripcion': 'Lote maestro',
                'unidad_medida': ProductoFabricado.UnidadMedida.LITROS,
                'cantidad_producida': Decimal('20'),
                'precio_venta': Decimal('0'),
                'precio_venta_sugerido': Decimal('0'),
                'tiempo_produccion': 55,
            },
            receta=[
                {
                    'ingrediente_id': self.ingrediente.id,
                    'cantidad_necesaria': Decimal('1'),
                    'unidad_medida': Ingrediente.UnidadMedida.GALONES,
                },
            ],
            presentaciones=[
                {
                    'nombre': 'Envase 1 litro',
                    'cantidad_por_unidad': Decimal('1'),
                    'unidad_medida': ProductoFabricado.UnidadMedida.LITROS,
                    'precio_venta_sugerido': Decimal('800'),
                    'precio_venta': Decimal('850'),
                },
            ],
        )

        presentacion = producto.presentaciones.get(nombre='Envase 1 litro')
        inventario = ProductoFabricadoService.convertir_presentacion_a_inventario(
            producto.id,
            presentacion.id,
        )
        inventario.nombre = 'Envase 1 litro'
        inventario.save(update_fields=['nombre', 'updated_at'])

        ProductoFabricadoService.producir_lote(producto.id, Decimal('1'))
        resultado = ProductoFabricadoService.empacar_presentacion(
            producto.id,
            presentacion.id,
            Decimal('1'),
            usuario=self.usuario,
        )

        inventario.refresh_from_db()

        self.assertEqual(
            inventario.nombre,
            'Jabon liquido base - Envase 1 litro',
        )
        self.assertEqual(
            resultado['producto_inventario'].nombre,
            'Jabon liquido base - Envase 1 litro',
        )


class FabricanteApiTest(TestCase):
    """
    Pruebas de API para vistas y endpoints del modulo fabricante.
    """

    def setUp(self):
        self.client = APIClient()
        self.admin_password = 'Password123'
        self.empleado_password = 'Password123'
        self.admin = Usuario.objects.create_user(
            username='admin_fabricante',
            email='admin.fabricante@mallor.test',
            password=self.admin_password,
            role=Usuario.Rol.ADMIN,
        )
        self.empleado = Usuario.objects.create_user(
            username='empleado_fabricante',
            email='empleado.fabricante@mallor.test',
            password=self.empleado_password,
            role=Usuario.Rol.EMPLEADO,
        )
        self.proveedor = Proveedor.objects.create(
            numero_documento='900300400',
            razon_social='Proveedor API SAS',
            nombre_contacto='Maria API',
            email='api@proveedor.test',
            telefono='3200000000',
            direccion='Calle API # 1-2',
            ciudad='Bogota',
            departamento='Cundinamarca',
            tipo_productos='Lacteos',
        )
        self.ingrediente = Ingrediente.objects.create(
            nombre='Leche API',
            descripcion='Ingrediente para pruebas API',
            unidad_medida=Ingrediente.UnidadMedida.GALONES,
            precio_por_unidad=Decimal('10000'),
            proveedor=self.proveedor,
            stock_actual=Decimal('2.0000'),
            stock_minimo=Decimal('0.5000'),
        )
        self.ingrediente_secundario = Ingrediente.objects.create(
            nombre='Azucar API',
            descripcion='Ingrediente secundario',
            unidad_medida=Ingrediente.UnidadMedida.KILOGRAMOS,
            precio_por_unidad=Decimal('5000'),
            stock_actual=Decimal('1.5000'),
            stock_minimo=Decimal('0.2000'),
        )

    def test_endpoints_requieren_rol_admin(self):
        self.client.login(
            username=self.empleado.username,
            password=self.empleado_password,
        )

        response = self.client.get('/api/fabricante/ingredientes/')

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_puede_hacer_crud_de_ingredientes(self):
        self.client.login(
            username=self.admin.username,
            password=self.admin_password,
        )

        create_response = self.client.post(
            '/api/fabricante/ingredientes/',
            {
                'nombre': 'Canela API',
                'descripcion': 'Especia molida',
                'unidad_medida': Ingrediente.UnidadMedida.GRAMOS,
                'precio_por_unidad': '25.5000',
                'proveedor_id': self.proveedor.id,
                'stock_actual': '100.0000',
                'stock_minimo': '10.0000',
            },
            format='json',
        )
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        ingrediente_id = create_response.data['id']

        list_response = self.client.get('/api/fabricante/ingredientes/')
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(list_response.data['count'], 1)

        retrieve_response = self.client.get(
            f'/api/fabricante/ingredientes/{ingrediente_id}/'
        )
        self.assertEqual(retrieve_response.status_code, status.HTTP_200_OK)
        self.assertEqual(retrieve_response.data['nombre'], 'Canela API')

        update_response = self.client.put(
            f'/api/fabricante/ingredientes/{ingrediente_id}/',
            {
                'nombre': 'Canela API',
                'descripcion': 'Especia premium',
                'unidad_medida': Ingrediente.UnidadMedida.GRAMOS,
                'precio_por_unidad': '30.0000',
                'proveedor_id': self.proveedor.id,
                'stock_actual': '100.0000',
                'stock_minimo': '5.0000',
            },
            format='json',
        )
        self.assertEqual(update_response.status_code, status.HTTP_200_OK)
        self.assertEqual(update_response.data['stock_minimo'], '5.0000')

        delete_response = self.client.delete(
            f'/api/fabricante/ingredientes/{ingrediente_id}/'
        )
        self.assertEqual(delete_response.status_code, status.HTTP_204_NO_CONTENT)

    def test_actualizar_stock_y_bajo_stock_funcionan(self):
        self.client.login(
            username=self.admin.username,
            password=self.admin_password,
        )

        stock_response = self.client.post(
            f'/api/fabricante/ingredientes/{self.ingrediente.id}/actualizar-stock/',
            {'cantidad': '-1.6000'},
            format='json',
        )
        self.assertEqual(stock_response.status_code, status.HTTP_200_OK)
        self.assertEqual(stock_response.data['stock_actual'], '0.4000')

        bajo_stock_response = self.client.get(
            '/api/fabricante/ingredientes/bajo-stock/'
        )
        self.assertEqual(bajo_stock_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(bajo_stock_response.data), 1)
        self.assertEqual(
            bajo_stock_response.data[0]['nombre'],
            self.ingrediente.nombre,
        )

    def test_admin_puede_hacer_crud_de_productos_fabricados(self):
        self.client.login(
            username=self.admin.username,
            password=self.admin_password,
        )

        create_response = self.client.post(
            '/api/fabricante/productos/',
            {
                'nombre': 'Yogur API',
                'descripcion': 'Producto fabricado desde API',
                'unidad_medida': ProductoFabricado.UnidadMedida.LITROS,
                'cantidad_producida': '10.0000',
                'precio_venta_sugerido': '0.00',
                'precio_venta': '2500.00',
                'tiempo_produccion': 45,
                'receta': [
                    {
                        'ingrediente_id': self.ingrediente.id,
                        'cantidad_necesaria': '500.0000',
                        'unidad_medida': Ingrediente.UnidadMedida.MILILITROS,
                    },
                ],
                'presentaciones': [
                    {
                        'nombre': 'Botella 500 ml',
                        'cantidad_por_unidad': '500.0000',
                        'unidad_medida': Ingrediente.UnidadMedida.MILILITROS,
                        'precio_venta_sugerido': '1500.00',
                        'precio_venta': '1700.00',
                    },
                ],
            },
            format='json',
        )
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        producto_id = create_response.data['id']

        list_response = self.client.get('/api/fabricante/productos/')
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        producto_listado = next(
            item
            for item in list_response.data['results']
            if item['id'] == producto_id
        )
        self.assertEqual(len(producto_listado['presentaciones']), 1)
        self.assertEqual(
            producto_listado['presentaciones'][0]['nombre'],
            'Botella 500 ml',
        )

        retrieve_response = self.client.get(
            f'/api/fabricante/productos/{producto_id}/'
        )
        self.assertEqual(retrieve_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(retrieve_response.data['receta']), 1)
        self.assertEqual(len(retrieve_response.data['presentaciones']), 1)

        update_response = self.client.put(
            f'/api/fabricante/productos/{producto_id}/',
            {
                'nombre': 'Yogur API Editado',
                'descripcion': 'Producto actualizado',
                'unidad_medida': ProductoFabricado.UnidadMedida.LITROS,
                'cantidad_producida': '12.0000',
                'precio_venta_sugerido': '2600.00',
                'precio_venta': '2700.00',
                'tiempo_produccion': 50,
            },
            format='json',
        )
        self.assertEqual(update_response.status_code, status.HTTP_200_OK)
        self.assertEqual(update_response.data['nombre'], 'Yogur API Editado')

        delete_response = self.client.delete(
            f'/api/fabricante/productos/{producto_id}/'
        )
        self.assertEqual(delete_response.status_code, status.HTTP_204_NO_CONTENT)

    def test_costos_precio_produccion_y_conversion_funcionan(self):
        self.client.login(
            username=self.admin.username,
            password=self.admin_password,
        )
        producto = ProductoFabricadoService.crear_producto_fabricado(
            data={
                'nombre': 'Kumis API',
                'descripcion': 'Producto para acciones especiales',
                'unidad_medida': ProductoFabricado.UnidadMedida.UNIDADES,
                'cantidad_producida': Decimal('10'),
                'precio_venta': Decimal('0'),
                'precio_venta_sugerido': Decimal('0'),
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

        costos_response = self.client.get(
            f'/api/fabricante/productos/{producto.id}/costos/'
        )
        self.assertEqual(costos_response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            costos_response.data['costo_produccion'],
            '1320.8500',
        )

        precio_response = self.client.post(
            f'/api/fabricante/productos/{producto.id}/calcular-precio/',
            {'margen_deseado': '50'},
            format='json',
        )
        self.assertEqual(precio_response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            precio_response.data['precio_venta_sugerido'],
            '198.13',
        )

        inventario_response = self.client.post(
            f'/api/fabricante/productos/{producto.id}/convertir-inventario/',
            {},
            format='json',
        )
        self.assertEqual(inventario_response.status_code, status.HTTP_200_OK)
        self.assertIsNotNone(
            inventario_response.data['producto_inventario']['id']
        )

        producir_response = self.client.post(
            f'/api/fabricante/productos/{producto.id}/producir/',
            {'cantidad_lotes': '1'},
            format='json',
        )
        self.assertEqual(producir_response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            producir_response.data['cantidad_total_producida'],
            '10.0000',
        )

    def test_endpoints_de_receta_funcionan(self):
        self.client.login(
            username=self.admin.username,
            password=self.admin_password,
        )
        producto = ProductoFabricadoService.crear_producto_fabricado(
            data={
                'nombre': 'Avena API',
                'descripcion': 'Producto para probar receta',
                'unidad_medida': ProductoFabricado.UnidadMedida.UNIDADES,
                'cantidad_producida': Decimal('8'),
                'precio_venta': Decimal('2200'),
                'precio_venta_sugerido': Decimal('2300'),
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

        list_response = self.client.get(
            f'/api/fabricante/productos/{producto.id}/receta/'
        )
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(list_response.data), 1)

        add_response = self.client.post(
            f'/api/fabricante/productos/{producto.id}/receta/',
            {
                'ingrediente_id': self.ingrediente_secundario.id,
                'cantidad_necesaria': '0.2500',
                'unidad_medida': Ingrediente.UnidadMedida.KILOGRAMOS,
            },
            format='json',
        )
        self.assertEqual(add_response.status_code, status.HTTP_201_CREATED)

        delete_response = self.client.delete(
            f'/api/fabricante/productos/{producto.id}/receta/'
            f'{self.ingrediente_secundario.id}/'
        )
        self.assertEqual(delete_response.status_code, status.HTTP_204_NO_CONTENT)

    def test_endpoints_de_presentaciones_y_empaque_funcionan(self):
        self.client.login(
            username=self.admin.username,
            password=self.admin_password,
        )
        producto = ProductoFabricadoService.crear_producto_fabricado(
            data={
                'nombre': 'Jabon API',
                'descripcion': 'Producto para probar empaque',
                'unidad_medida': ProductoFabricado.UnidadMedida.LITROS,
                'cantidad_producida': Decimal('20'),
                'precio_venta': Decimal('0'),
                'precio_venta_sugerido': Decimal('0'),
                'tiempo_produccion': 30,
            },
            receta=[
                {
                    'ingrediente_id': self.ingrediente.id,
                    'cantidad_necesaria': Decimal('1'),
                    'unidad_medida': Ingrediente.UnidadMedida.GALONES,
                },
            ],
        )

        create_response = self.client.post(
            f'/api/fabricante/productos/{producto.id}/presentaciones/',
            {
                'nombre': 'Envase 3 litros',
                'cantidad_por_unidad': '3.0000',
                'unidad_medida': ProductoFabricado.UnidadMedida.LITROS,
                'precio_venta_sugerido': '2200.00',
                'precio_venta': '2400.00',
            },
            format='json',
        )
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        presentacion_id = create_response.data['id']

        list_response = self.client.get(
            f'/api/fabricante/productos/{producto.id}/presentaciones/'
        )
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(list_response.data), 1)

        producir_response = self.client.post(
            f'/api/fabricante/productos/{producto.id}/producir/',
            {'cantidad_lotes': '1'},
            format='json',
        )
        self.assertEqual(producir_response.status_code, status.HTTP_200_OK)

        empaque_response = self.client.post(
            f'/api/fabricante/productos/{producto.id}/presentaciones/'
            f'{presentacion_id}/empacar/',
            {'cantidad_unidades': '2'},
            format='json',
        )
        self.assertEqual(empaque_response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            empaque_response.data['producto_inventario']['nombre'],
            'Jabon API - Envase 3 litros',
        )
        self.assertEqual(
            empaque_response.data['cantidad_consumida_lote'],
            '6.0000',
        )
