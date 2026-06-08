---
name: pep-8
description: Guía de estilo PEP 8 para código Python en el proyecto Mallor.
license: Complete terms in LICENSE.txt
---

# PEP 8 - Guía de Estilo para Python

Este skill proporciona las mejores prácticas de estilo de código Python según PEP 8, adaptado para el proyecto Mallor.

## Propósito
Garantizar que todo el código Python del proyecto Mallor siga las convenciones de estilo PEP 8 para mantener consistencia, legibilidad y calidad.

## Cuándo usar este skill
- Al escribir nuevo código Python
- Al revisar código existente
- Al refactorizar módulos Django
- Al implementar servicios y lógica de negocio

## 1. Layout del Código

### Indentación
- Usar **4 espacios** por nivel de indentación
- **NO usar tabs**

```python
# ✓ Correcto
def funcion_ejemplo():
    if condicion:
        hacer_algo()
        hacer_otra_cosa()
    return resultado

# ✗ Evitar
def funcion_ejemplo():
  if condicion:  # 2 espacios - incorrecto
        hacer_algo()  # Inconsistente
```

### Longitud de Línea
- Máximo **79 caracteres** para código
- Máximo **72 caracteres** para comentarios y docstrings

```python
# ✓ Correcto - Dividir líneas largas
resultado = funcion_muy_larga(
    parametro1,
    parametro2,
    parametro3
)

# ✓ Correcto - Usar paréntesis implícitos
texto = (
    "Este es un texto muy largo que necesita "
    "ser dividido en múltiples líneas para "
    "mantener la legibilidad"
)
```

### Líneas en Blanco
- **2 líneas en blanco** entre definiciones de clases y funciones de nivel superior
- **1 línea en blanco** entre métodos dentro de una clase
- Usar líneas en blanco con moderación dentro de funciones

```python
# ✓ Correcto
class MiClase:
    """Docstring de la clase"""

    def __init__(self):
        self.valor = 0

    def metodo_uno(self):
        return self.valor

    def metodo_dos(self):
        return self.valor * 2


class OtraClase:
    """Segunda clase"""
    pass
```

## 2. Imports

### Orden de Imports
1. **Biblioteca estándar**
2. **Terceros relacionados**
3. **Locales específicos de la aplicación**

```python
# ✓ Correcto
# Biblioteca estándar
import os
import sys
from datetime import datetime
from typing import List, Optional

# Terceros
from django.db import models
from rest_framework import serializers
import requests

# Locales
from ventas.models import Venta
from cliente.service import ClienteService
```

### Formato de Imports
```python
# ✓ Correcto - Cada import en su línea
import os
import sys

# ✗ Evitar - Múltiples imports en una línea
import os, sys

# ✓ Correcto - from import en la misma línea si son relacionados
from django.db import models, transaction

# ✓ Correcto - Dividir imports largos
from ventas.services import (
    VentaService,
    FacturaService,
    InventarioService,
)
```

### Imports Absolutos vs Relativos
```python
# ✓ Preferir imports absolutos
from ventas.models import Venta
from cliente.service import ClienteService

# ✓ Imports relativos explícitos están OK
from .models import Venta
from ..cliente.service import ClienteService

# ✗ Evitar imports relativos implícitos
from models import Venta  # Ambiguo
```

## 3. Nombres (Naming Conventions)

### Funciones y Variables
- **snake_case** (minúsculas con guiones bajos)

```python
# ✓ Correcto
def calcular_precio_total():
    precio_base = 100
    precio_final = precio_base * 1.19
    return precio_final

# ✗ Evitar
def CalcularPrecioTotal():  # camelCase o PascalCase para funciones
    precioBase = 100  # camelCase para variables
```

### Clases
- **PascalCase** (primera letra de cada palabra en mayúscula)

```python
# ✓ Correcto
class ProductoService:
    pass

class VentaRepository:
    pass

# ✗ Evitar
class producto_service:  # snake_case
    pass
```

### Constantes
- **UPPER_CASE_WITH_UNDERSCORES**

```python
# ✓ Correcto
MAX_INTENTOS = 3
TASA_IVA = 0.19
API_URL = "https://api.ejemplo.com"

# ✗ Evitar
max_intentos = 3  # Parece variable
MaxIntentos = 3   # Parece clase
```

### Métodos y Variables Privadas
- Prefijo con **un guion bajo** `_`

```python
# ✓ Correcto
class MiClase:
    def __init__(self):
        self._variable_privada = 0
        self.variable_publica = 1

    def _metodo_privado(self):
        """Método interno de la clase"""
        pass

    def metodo_publico(self):
        """Método de la API pública"""
        return self._metodo_privado()
```

### Métodos Especiales
- Prefijo y sufijo con **dos guiones bajos** `__`

```python
# ✓ Correcto
class Producto:
    def __init__(self, nombre, precio):
        self.nombre = nombre
        self.precio = precio

    def __str__(self):
        return f"Producto: {self.nombre}"

    def __repr__(self):
        return f"Producto(nombre='{self.nombre}', precio={self.precio})"
```

## 4. Comentarios y Docstrings

### Docstrings
- Usar **triple comillas dobles** `"""`
- Formato: Resumen en una línea, línea en blanco, descripción detallada

```python
# ✓ Correcto
def calcular_descuento(precio, porcentaje):
    """
    Calcula el descuento aplicado a un precio.

    Args:
        precio (Decimal): Precio base del producto
        porcentaje (Decimal): Porcentaje de descuento (0-100)

    Returns:
        Decimal: Precio después de aplicar el descuento

    Raises:
        ValueError: Si el porcentaje es negativo o mayor a 100
    """
    if porcentaje < 0 or porcentaje > 100:
        raise ValueError("Porcentaje debe estar entre 0 y 100")

    descuento = precio * (porcentaje / 100)
    return precio - descuento


class VentaService:
    """
    Servicio para gestionar operaciones de ventas.

    Este servicio maneja la lógica de negocio relacionada con la
    creación, actualización y consulta de ventas en el sistema.

    Attributes:
        repository (VentaRepository): Repositorio para acceso a datos
        notificacion (NotificacionService): Servicio de notificaciones
    """

    def __init__(self, repository, notificacion):
        self.repository = repository
        self.notificacion = notificacion
```

### Comentarios en Línea
- Usar con moderación
- Separar con **al menos 2 espacios** del código

```python
# ✓ Correcto
x = x + 1  # Compensar por el borde

# ✗ Evitar - Comentarios obvios
x = x + 1  # Incrementar x en 1

# ✓ Mejor - Código auto-explicativo sin comentario
incrementar_contador()
```

## 5. Espacios en Blanco

### Alrededor de Operadores
```python
# ✓ Correcto
i = i + 1
submitted += 1
x = x*2 - 1
hypot2 = x*x + y*y
c = (a+b) * (a-b)

# ✗ Evitar
i=i+1
submitted +=1
x = x * 2 - 1  # Inconsistente
```

### En Llamadas a Funciones
```python
# ✓ Correcto
funcion(arg1, arg2, kwarg1=valor1)
diccionario['clave'] = lista[indice]

# ✗ Evitar
funcion( arg1, arg2, kwarg1 = valor1 )
diccionario ['clave'] = lista [indice]
```

### Trailing Commas
```python
# ✓ Correcto - Facilita versionado
DIAS_SEMANA = [
    'Lunes',
    'Martes',
    'Miércoles',
    'Jueves',
    'Viernes',
]
```

## 6. Expresiones y Sentencias

### Comparaciones
```python
# ✓ Correcto
if valor is None:
    hacer_algo()

if valor is not None:
    hacer_otra_cosa()

# ✗ Evitar
if valor == None:  # Usar 'is' para None
    hacer_algo()

# ✓ Correcto - Verificar lista vacía
if not lista:
    print("Lista vacía")

# ✗ Evitar
if len(lista) == 0:  # Menos pythónico
    print("Lista vacía")
```

### Type Hints
```python
# ✓ Correcto - Usar type hints
from typing import List, Optional, Dict
from decimal import Decimal

def calcular_total(
    items: List[Dict[str, any]],
    descuento: Optional[Decimal] = None
) -> Decimal:
    """Calcula el total de items con descuento opcional."""
    total = sum(item['precio'] for item in items)
    if descuento:
        total -= descuento
    return total
```

## 7. Aplicación en Django/Mallor

### Models
```python
# ventas/models.py
from django.db import models
from decimal import Decimal


class Venta(models.Model):
    """
    Modelo que representa una venta en el sistema.

    Attributes:
        cliente: Cliente asociado a la venta
        fecha: Fecha de la venta
        total: Total de la venta
        estado: Estado actual de la venta
    """

    ESTADO_PENDIENTE = 'pendiente'
    ESTADO_COMPLETADA = 'completada'
    ESTADO_CANCELADA = 'cancelada'

    ESTADOS = [
        (ESTADO_PENDIENTE, 'Pendiente'),
        (ESTADO_COMPLETADA, 'Completada'),
        (ESTADO_CANCELADA, 'Cancelada'),
    ]

    cliente = models.ForeignKey(
        'cliente.Cliente',
        on_delete=models.PROTECT,
        related_name='ventas'
    )
    fecha = models.DateTimeField(auto_now_add=True)
    total = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00')
    )
    estado = models.CharField(
        max_length=20,
        choices=ESTADOS,
        default=ESTADO_PENDIENTE
    )

    class Meta:
        db_table = 'ventas'
        ordering = ['-fecha']
        verbose_name = 'Venta'
        verbose_name_plural = 'Ventas'

    def __str__(self):
        return f"Venta #{self.id} - {self.cliente.nombre}"

    def calcular_total(self):
        """Calcula el total de la venta sumando todos los detalles."""
        return sum(
            detalle.cantidad * detalle.precio_unitario
            for detalle in self.detalles.all()
        )
```

### Services
```python
# ventas/service.py
from typing import List, Optional
from decimal import Decimal
from django.db import transaction

from ventas.models import Venta, DetalleVenta
from cliente.models import Cliente


class VentaService:
    """Servicio para gestionar operaciones de ventas."""

    @staticmethod
    def crear_venta(
        cliente_id: int,
        items: List[dict],
        estado: str = Venta.ESTADO_PENDIENTE
    ) -> Venta:
        """
        Crea una nueva venta con sus detalles.

        Args:
            cliente_id: ID del cliente
            items: Lista de items con producto_id, cantidad, precio
            estado: Estado inicial de la venta

        Returns:
            Venta: Instancia de la venta creada

        Raises:
            ValueError: Si los datos son inválidos
            Cliente.DoesNotExist: Si el cliente no existe
        """
        if not items:
            raise ValueError("La venta debe tener al menos un item")

        cliente = Cliente.objects.get(id=cliente_id)

        with transaction.atomic():
            # Crear venta
            venta = Venta.objects.create(
                cliente=cliente,
                estado=estado,
                total=Decimal('0.00')
            )

            # Crear detalles
            total = Decimal('0.00')
            for item in items:
                detalle = DetalleVenta.objects.create(
                    venta=venta,
                    producto_id=item['producto_id'],
                    cantidad=item['cantidad'],
                    precio_unitario=item['precio']
                )
                total += detalle.cantidad * detalle.precio_unitario

            # Actualizar total
            venta.total = total
            venta.save()

        return venta
```

### Views
```python
# ventas/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from ventas.service import VentaService
from ventas.serializers import VentaSerializer


class VentaCreateView(APIView):
    """Vista para crear ventas."""

    def post(self, request):
        """
        Crea una nueva venta.

        Body:
            {
                "cliente_id": 1,
                "items": [
                    {
                        "producto_id": 1,
                        "cantidad": 2,
                        "precio": "10.50"
                    }
                ]
            }
        """
        try:
            venta = VentaService.crear_venta(
                cliente_id=request.data['cliente_id'],
                items=request.data['items']
            )

            serializer = VentaSerializer(venta)
            return Response(
                serializer.data,
                status=status.HTTP_201_CREATED
            )

        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {'error': 'Error al crear venta'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
```

## 8. Herramientas de Verificación

### Flake8
```bash
# Instalar
pip install flake8

# Verificar código
flake8 ventas/

# Configuración en setup.cfg o .flake8
[flake8]
max-line-length = 79
exclude = migrations,__pycache__,venv
ignore = E203,W503
```

### Black (Formateador automático)
```bash
# Instalar
pip install black

# Formatear código
black ventas/

# Configuración en pyproject.toml
[tool.black]
line-length = 79
target-version = ['py310']
include = '\.pyi?$'
exclude = '''
/(
    \.git
  | migrations
  | venv
)/
'''
```

### isort (Ordenar imports)
```bash
# Instalar
pip install isort

# Ordenar imports
isort ventas/

# Configuración en .isort.cfg
[settings]
profile = black
line_length = 79
```

## 9. Checklist PEP 8

- [ ] Usar 4 espacios para indentación
- [ ] Líneas máximo 79 caracteres
- [ ] Imports al inicio, ordenados correctamente
- [ ] snake_case para funciones y variables
- [ ] PascalCase para clases
- [ ] UPPER_CASE para constantes
- [ ] Docstrings para módulos, clases y funciones públicas
- [ ] Espacios alrededor de operadores
- [ ] Usar `is` y `is not` para comparar con None
- [ ] Type hints donde sea apropiado
- [ ] Código auto-explicativo con nombres descriptivos

## Referencias

- [PEP 8 - Style Guide for Python Code](https://peps.python.org/pep-0008/)
- [PEP 257 - Docstring Conventions](https://peps.python.org/pep-0257/)
- [PEP 484 - Type Hints](https://peps.python.org/pep-0484/)
- [Google Python Style Guide](https://google.github.io/styleguide/pyguide.html)

## Notas para Mallor

- Aplicar PEP 8 en todos los archivos Python del proyecto
- Configurar Flake8 o Black en pre-commit hooks
- Revisar código existente gradualmente
- Priorizar legibilidad sobre brevedad
- Usar herramientas de formateo automático para ahorrar tiempo
- Documentar APIs públicas con docstrings completos
