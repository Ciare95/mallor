from django.test import TestCase
from django.core.exceptions import ValidationError
from .models import Categoria


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
