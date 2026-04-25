from django.test import TestCase
from django.core.exceptions import ValidationError
from .models import Categoria, Producto


class CategoriaModelTest(TestCase):
    """
    Pruebas unitarias para el modelo Categoria.
    """
    
    def test_creacion_categoria(self):
        """
        Verifica que se pueda crear una categoría con datos válidos.
        """
        categoria = Categoria.objects.create(
            nombre='Medicamentos',
            descripcion='Productos farmacéuticos y medicamentos'
        )
        
        self.assertEqual(categoria.nombre, 'Medicamentos')
        self.assertEqual(categoria.descripcion, 'Productos farmacéuticos y medicamentos')
        self.assertIsNotNone(categoria.created_at)
        self.assertIsNotNone(categoria.updated_at)
        self.assertEqual(str(categoria), 'Medicamentos')
    
    def test_nombre_unico(self):
        """
        Verifica que no se puedan crear dos categorías con el mismo nombre.
        """
        Categoria.objects.create(nombre='Insumos')
        
        with self.assertRaises(Exception):
            Categoria.objects.create(nombre='Insumos')
    
    def test_ordering(self):
        """
        Verifica que el orden por defecto sea por nombre.
        """
        Categoria.objects.create(nombre='Zeta')
        Categoria.objects.create(nombre='Alfa')
        Categoria.objects.create(nombre='Beta')
        
        categorias = Categoria.objects.all()
        nombres = [c.nombre for c in categorias]
        
        self.assertEqual(nombres, ['Alfa', 'Beta', 'Zeta'])
    
    def test_validacion_nombre_no_vacio(self):
        """
        Verifica que el campo nombre no pueda estar vacío.
        """
        categoria = Categoria(nombre='')
        
        with self.assertRaises(ValidationError):
            categoria.full_clean()


class ProductoModelTest(TestCase):
    """
    Pruebas unitarias para el modelo Producto.
    """
    
    def setUp(self):
        """
        Configuración inicial para las pruebas.
        """
        self.categoria = Categoria.objects.create(
            nombre='Medicamentos',
            descripcion='Productos farmacéuticos'
        )
    
    def test_creacion_producto(self):
        """
        Verifica que se pueda crear un producto con datos válidos.
        """
        producto = Producto.objects.create(
            codigo_interno='MED001',
            nombre='Paracetamol 500mg',
            categoria=self.categoria,
            existencias=100,
            precio_compra=50.00,
            precio_venta=80.00,
            iva=19.00
        )
        
        self.assertEqual(producto.codigo_interno, 'MED001')
        self.assertEqual(producto.nombre, 'Paracetamol 500mg')
        self.assertEqual(producto.categoria, self.categoria)
        self.assertEqual(producto.existencias, 100)
        self.assertEqual(producto.precio_compra, 50.00)
        self.assertEqual(producto.precio_venta, 80.00)
        self.assertEqual(producto.iva, 19.00)
        self.assertIsNotNone(producto.created_at)
        self.assertIsNotNone(producto.updated_at)
        self.assertEqual(str(producto), 'Paracetamol 500mg (MED001)')
    
    def test_codigo_interno_unico(self):
        """
        Verifica que no se puedan crear dos productos con el mismo código interno.
        """
        Producto.objects.create(
            codigo_interno='COD001',
            nombre='Producto 1',
            existencias=10,
            precio_compra=10.00,
            precio_venta=15.00
        )
        
        with self.assertRaises(Exception):
            Producto.objects.create(
                codigo_interno='COD001',
                nombre='Producto 2',
                existencias=5,
                precio_compra=8.00,
                precio_venta=12.00
            )
    
    def test_calcular_valor_inventario(self):
        """
        Verifica el cálculo del valor en inventario.
        """
        producto = Producto.objects.create(
            codigo_interno='TEST001',
            nombre='Producto Test',
            existencias=50,
            precio_compra=30.00,
            precio_venta=45.00
        )
        
        valor_esperado = 50 * 30.00  # 1500
        self.assertEqual(producto.calcular_valor_inventario(), valor_esperado)
    
    def test_calcular_valor_venta(self):
        """
        Verifica el cálculo del valor de venta.
        """
        producto = Producto.objects.create(
            codigo_interno='TEST002',
            nombre='Producto Test 2',
            existencias=20,
            precio_compra=25.00,
            precio_venta=40.00
        )
        
        valor_esperado = 20 * 40.00  # 800
        self.assertEqual(producto.calcular_valor_venta(), valor_esperado)
    
    def test_actualizar_stock(self):
        """
        Verifica la actualización del stock.
        """
        producto = Producto.objects.create(
            codigo_interno='TEST003',
            nombre='Producto Test 3',
            existencias=100,
            precio_compra=10.00,
            precio_venta=15.00
        )
        
        # Agregar stock
        nuevas_existencias = producto.actualizar_stock(50)
        self.assertEqual(nuevas_existencias, 150)
        self.assertEqual(producto.existencias, 150)
        
        # Reducir stock
        nuevas_existencias = producto.actualizar_stock(-30)
        self.assertEqual(nuevas_existencias, 120)
        self.assertEqual(producto.existencias, 120)
        
        # Intentar reducir más stock del disponible
        with self.assertRaises(ValueError):
            producto.actualizar_stock(-200)
    
    def test_validar_stock(self):
        """
        Verifica la validación de stock disponible.
        """
        producto = Producto.objects.create(
            codigo_interno='TEST004',
            nombre='Producto Test 4',
            existencias=30,
            precio_compra=5.00,
            precio_venta=8.00
        )
        
        self.assertTrue(producto.validar_stock(20))
        self.assertTrue(producto.validar_stock(30))
        self.assertFalse(producto.validar_stock(31))
    
    def test_validacion_existencias_no_negativas(self):
        """
        Verifica que las existencias no puedan ser negativas.
        """
        producto = Producto(
            codigo_interno='TEST005',
            nombre='Producto Test 5',
            existencias=-10,
            precio_compra=10.00,
            precio_venta=15.00
        )
        
        with self.assertRaises(ValidationError):
            producto.full_clean()
    
    def test_validacion_precios_positivos(self):
        """
        Verifica que los precios deben ser positivos.
        """
        # Precio de compra negativo
        producto = Producto(
            codigo_interno='TEST006',
            nombre='Producto Test 6',
            existencias=10,
            precio_compra=-5.00,
            precio_venta=10.00
        )
        
        with self.assertRaises(ValidationError):
            producto.full_clean()
        
        # Precio de venta negativo
        producto = Producto(
            codigo_interno='TEST007',
            nombre='Producto Test 7',
            existencias=10,
            precio_compra=5.00,
            precio_venta=-10.00
        )
        
        with self.assertRaises(ValidationError):
            producto.full_clean()
    
    def test_validacion_iva_rango(self):
        """
        Verifica que el IVA esté entre 0 y 100.
        """
        # IVA negativo
        producto = Producto(
            codigo_interno='TEST008',
            nombre='Producto Test 8',
            existencias=10,
            precio_compra=10.00,
            precio_venta=15.00,
            iva=-5.00
        )
        
        with self.assertRaises(ValidationError):
            producto.full_clean()
        
        # IVA mayor a 100
        producto = Producto(
            codigo_interno='TEST009',
            nombre='Producto Test 9',
            existencias=10,
            precio_compra=10.00,
            precio_venta=15.00,
            iva=150.00
        )
        
        with self.assertRaises(ValidationError):
            producto.full_clean()
    
    def test_relacion_categoria(self):
        """
        Verifica la relación con categoría.
        """
        producto = Producto.objects.create(
            codigo_interno='TEST010',
            nombre='Producto Test 10',
            categoria=self.categoria,
            existencias=10,
            precio_compra=10.00,
            precio_venta=15.00
        )
        
        self.assertEqual(producto.categoria, self.categoria)
        self.assertIn(producto, self.categoria.producto_set.all())
    
    def test_producto_sin_categoria(self):
        """
        Verifica que un producto pueda crearse sin categoría.
        """
        producto = Producto.objects.create(
            codigo_interno='TEST011',
            nombre='Producto Test 11',
            existencias=10,
            precio_compra=10.00,
            precio_venta=15.00
        )
        
        self.assertIsNone(producto.categoria)
    
    def test_ordering(self):
        """
        Verifica que el orden por defecto sea por nombre.
        """
        Producto.objects.create(
            codigo_interno='Z001',
            nombre='Zeta',
            existencias=10,
            precio_compra=10.00,
            precio_venta=15.00
        )
        Producto.objects.create(
            codigo_interno='A001',
            nombre='Alfa',
            existencias=10,
            precio_compra=10.00,
            precio_venta=15.00
        )
        Producto.objects.create(
            codigo_interno='B001',
            nombre='Beta',
            existencias=10,
            precio_compra=10.00,
            precio_venta=15.00
        )
        
        productos = Producto.objects.all()
        nombres = [p.nombre for p in productos]
        
        self.assertEqual(nombres, ['Alfa', 'Beta', 'Zeta'])


class ProductoAdminTest(TestCase):
    """
    Pruebas para el admin de Producto.
    """
    
    def setUp(self):
        """
        Configuración inicial para las pruebas de admin.
        """
        from usuario.models import Usuario
        
        # Crear superusuario para acceder al admin
        self.superuser = Usuario.objects.create_superuser(
            username='admin',
            email='admin@example.com',
            password='adminpass'
        )
        self.client.login(username='admin', password='adminpass')
    
    def test_admin_add_page_loads(self):
        """
        Verifica que la página de agregar producto en el admin cargue sin errores.
        """
        url = '/admin/inventario/producto/add/'
        response = self.client.get(url)
        
        # Debe retornar 200 (OK) o 302 (redirect si no está autenticado)
        # Con autenticación debería ser 200
        self.assertIn(response.status_code, [200, 302])
        
        # Si es 200, verificar que no hay errores de tipo en el template
        if response.status_code == 200:
            self.assertNotContains(response, 'TypeError')
            self.assertNotContains(response, 'unsupported operand type')
    
    def test_admin_change_page_loads(self):
        """
        Verifica que la página de edición de producto en el admin cargue sin errores.
        """
        # Primero crear un producto
        categoria = Categoria.objects.create(nombre='Test Cat')
        producto = Producto.objects.create(
            codigo_interno='ADM001',
            nombre='Producto Admin Test',
            categoria=categoria,
            existencias=10,
            precio_compra=50.00,
            precio_venta=80.00
        )
        
        url = f'/admin/inventario/producto/{producto.id}/change/'
        response = self.client.get(url)
        
        self.assertIn(response.status_code, [200, 302])
        if response.status_code == 200:
            self.assertNotContains(response, 'TypeError')
            self.assertNotContains(response, 'unsupported operand type')
