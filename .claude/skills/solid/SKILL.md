---
name: solid
description: Principios SOLID aplicados a Python/Django para el proyecto Mallor.
license: Complete terms in LICENSE.txt
---

# Principios SOLID en Python

Este skill proporciona una guía para aplicar los principios SOLID en el desarrollo backend de Python/Django del proyecto Mallor.

## Propósito
Garantizar que el código Python siga los principios SOLID para mantener un código limpio, mantenible y escalable.

## Cuándo usar este skill
- Al diseñar nuevas clases y servicios
- Al refactorizar código existente
- Al revisar arquitectura de módulos
- Al implementar lógica de negocio en services.py

## Los 5 Principios SOLID

### 1. S - Single Responsibility Principle (SRP)
**"Una clase debe tener una única razón para cambiar"**

#### ❌ Incorrecto
```python
# Clase con múltiples responsabilidades
class Producto:
    def __init__(self, nombre, precio):
        self.nombre = nombre
        self.precio = precio

    def calcular_total(self, cantidad):
        return self.precio * cantidad

    def guardar_en_bd(self):
        # Lógica para guardar en base de datos
        pass

    def enviar_email_notificacion(self):
        # Lógica para enviar email
        pass

    def generar_pdf(self):
        # Lógica para generar PDF
        pass
```

#### ✅ Correcto
```python
# Cada clase tiene una única responsabilidad

class Producto:
    """Representa un producto con sus atributos básicos"""
    def __init__(self, nombre, precio):
        self.nombre = nombre
        self.precio = precio

    def calcular_total(self, cantidad):
        return self.precio * cantidad


class ProductoRepository:
    """Maneja la persistencia de productos"""
    def guardar(self, producto):
        # Lógica para guardar en base de datos
        pass

    def obtener(self, id):
        # Lógica para obtener de base de datos
        pass


class NotificacionService:
    """Maneja el envío de notificaciones"""
    def enviar_email(self, destinatario, asunto, mensaje):
        # Lógica para enviar email
        pass


class PDFGenerator:
    """Genera documentos PDF"""
    def generar_factura(self, venta):
        # Lógica para generar PDF
        pass
```

### 2. O - Open/Closed Principle (OCP)
**"Las clases deben estar abiertas para extensión pero cerradas para modificación"**

#### ❌ Incorrecto
```python
class CalculadoraDescuento:
    def calcular(self, tipo_cliente, precio):
        if tipo_cliente == "regular":
            return precio * 0.95  # 5% descuento
        elif tipo_cliente == "premium":
            return precio * 0.90  # 10% descuento
        elif tipo_cliente == "vip":
            return precio * 0.85  # 15% descuento
        # Si necesitamos agregar un nuevo tipo, debemos modificar esta clase
```

#### ✅ Correcto
```python
from abc import ABC, abstractmethod

class EstrategiaDescuento(ABC):
    """Clase base para estrategias de descuento"""
    @abstractmethod
    def calcular(self, precio):
        pass


class DescuentoRegular(EstrategiaDescuento):
    def calcular(self, precio):
        return precio * 0.95  # 5% descuento


class DescuentoPremium(EstrategiaDescuento):
    def calcular(self, precio):
        return precio * 0.90  # 10% descuento


class DescuentoVIP(EstrategiaDescuento):
    def calcular(self, precio):
        return precio * 0.85  # 15% descuento


class CalculadoraDescuento:
    def __init__(self, estrategia: EstrategiaDescuento):
        self.estrategia = estrategia

    def calcular(self, precio):
        return self.estrategia.calcular(precio)


# Uso
calculadora = CalculadoraDescuento(DescuentoPremium())
precio_final = calculadora.calcular(1000)

# Para agregar un nuevo tipo, solo creamos una nueva clase sin modificar las existentes
class DescuentoMayorista(EstrategiaDescuento):
    def calcular(self, precio):
        return precio * 0.80  # 20% descuento
```

### 3. L - Liskov Substitution Principle (LSP)
**"Los objetos de una clase derivada deben poder reemplazar a los de la clase base sin alterar el comportamiento del programa"**

#### ❌ Incorrecto
```python
class Producto:
    def __init__(self, nombre, precio, stock):
        self.nombre = nombre
        self.precio = precio
        self.stock = stock

    def reducir_stock(self, cantidad):
        if self.stock >= cantidad:
            self.stock -= cantidad
            return True
        return False


class ProductoDigital(Producto):
    def reducir_stock(self, cantidad):
        # Los productos digitales no tienen stock limitado
        # Este método rompe el principio LSP porque cambia el comportamiento esperado
        raise NotImplementedError("Los productos digitales no tienen stock físico")
```

#### ✅ Correcto
```python
from abc import ABC, abstractmethod

class ProductoBase(ABC):
    def __init__(self, nombre, precio):
        self.nombre = nombre
        self.precio = precio

    @abstractmethod
    def esta_disponible(self, cantidad):
        pass


class ProductoFisico(ProductoBase):
    def __init__(self, nombre, precio, stock):
        super().__init__(nombre, precio)
        self.stock = stock

    def esta_disponible(self, cantidad):
        return self.stock >= cantidad

    def reducir_stock(self, cantidad):
        if self.esta_disponible(cantidad):
            self.stock -= cantidad
            return True
        return False


class ProductoDigital(ProductoBase):
    def __init__(self, nombre, precio):
        super().__init__(nombre, precio)

    def esta_disponible(self, cantidad):
        # Los productos digitales siempre están disponibles
        return True


# Ambas clases pueden sustituirse entre sí para el método esta_disponible
def puede_procesar_venta(producto: ProductoBase, cantidad: int):
    return producto.esta_disponible(cantidad)
```

### 4. I - Interface Segregation Principle (ISP)
**"Los clientes no deben verse obligados a depender de interfaces que no utilizan"**

#### ❌ Incorrecto
```python
from abc import ABC, abstractmethod

class Trabajador(ABC):
    @abstractmethod
    def trabajar(self):
        pass

    @abstractmethod
    def comer(self):
        pass

    @abstractmethod
    def dormir(self):
        pass


class Humano(Trabajador):
    def trabajar(self):
        print("Trabajando...")

    def comer(self):
        print("Comiendo...")

    def dormir(self):
        print("Durmiendo...")


class Robot(Trabajador):
    def trabajar(self):
        print("Trabajando...")

    def comer(self):
        # Los robots no comen, pero estamos obligados a implementar esto
        raise NotImplementedError("Los robots no comen")

    def dormir(self):
        # Los robots no duermen
        raise NotImplementedError("Los robots no duermen")
```

#### ✅ Correcto
```python
from abc import ABC, abstractmethod

class Trabajable(ABC):
    @abstractmethod
    def trabajar(self):
        pass


class Alimentable(ABC):
    @abstractmethod
    def comer(self):
        pass


class Descansable(ABC):
    @abstractmethod
    def dormir(self):
        pass


class Humano(Trabajable, Alimentable, Descansable):
    def trabajar(self):
        print("Trabajando...")

    def comer(self):
        print("Comiendo...")

    def dormir(self):
        print("Durmiendo...")


class Robot(Trabajable):
    def trabajar(self):
        print("Trabajando...")


# En Django/Mallor - Ejemplo práctico
class Exportable(ABC):
    @abstractmethod
    def exportar_excel(self):
        pass


class Imprimible(ABC):
    @abstractmethod
    def imprimir(self):
        pass


class EmailEnviable(ABC):
    @abstractmethod
    def enviar_email(self):
        pass


class Venta(Exportable, Imprimible, EmailEnviable):
    """Una venta puede exportarse, imprimirse y enviarse por email"""
    pass


class Producto(Exportable):
    """Un producto solo necesita exportarse"""
    pass
```

### 5. D - Dependency Inversion Principle (DIP)
**"Depender de abstracciones, no de concreciones"**

#### ❌ Incorrecto
```python
class MySQLDatabase:
    def guardar_venta(self, venta):
        # Lógica específica de MySQL
        print(f"Guardando venta en MySQL: {venta}")


class VentaService:
    def __init__(self):
        # Dependencia directa de una implementación concreta
        self.db = MySQLDatabase()

    def crear_venta(self, venta):
        # Validaciones
        self.db.guardar_venta(venta)


# Si queremos cambiar a PostgreSQL, debemos modificar VentaService
```

#### ✅ Correcto
```python
from abc import ABC, abstractmethod

class DatabaseInterface(ABC):
    """Abstracción de base de datos"""
    @abstractmethod
    def guardar_venta(self, venta):
        pass


class MySQLDatabase(DatabaseInterface):
    def guardar_venta(self, venta):
        print(f"Guardando venta en MySQL: {venta}")


class PostgreSQLDatabase(DatabaseInterface):
    def guardar_venta(self, venta):
        print(f"Guardando venta en PostgreSQL: {venta}")


class VentaService:
    def __init__(self, database: DatabaseInterface):
        # Dependemos de la abstracción, no de la implementación
        self.db = database

    def crear_venta(self, venta):
        # Validaciones
        self.db.guardar_venta(venta)


# Uso - Podemos intercambiar implementaciones fácilmente
mysql_db = MySQLDatabase()
servicio_mysql = VentaService(mysql_db)

postgres_db = PostgreSQLDatabase()
servicio_postgres = VentaService(postgres_db)
```

## Aplicación en Django/Mallor

### Ejemplo Completo: Módulo de Ventas

```python
# ventas/interfaces.py
from abc import ABC, abstractmethod
from typing import List, Optional

class VentaRepositoryInterface(ABC):
    """Interfaz para el repositorio de ventas"""
    @abstractmethod
    def crear(self, venta_data: dict) -> dict:
        pass

    @abstractmethod
    def obtener(self, venta_id: int) -> Optional[dict]:
        pass

    @abstractmethod
    def listar(self, filtros: dict) -> List[dict]:
        pass


class NotificacionInterface(ABC):
    """Interfaz para servicios de notificación"""
    @abstractmethod
    def enviar(self, destinatario: str, mensaje: str) -> bool:
        pass


class FacturacionInterface(ABC):
    """Interfaz para servicios de facturación"""
    @abstractmethod
    def emitir_factura(self, venta: dict) -> dict:
        pass


# ventas/repositories.py
from ventas.models import Venta
from ventas.interfaces import VentaRepositoryInterface

class VentaRepository(VentaRepositoryInterface):
    """Implementación concreta del repositorio usando Django ORM"""

    def crear(self, venta_data: dict) -> dict:
        venta = Venta.objects.create(**venta_data)
        return self._to_dict(venta)

    def obtener(self, venta_id: int) -> Optional[dict]:
        try:
            venta = Venta.objects.get(id=venta_id)
            return self._to_dict(venta)
        except Venta.DoesNotExist:
            return None

    def listar(self, filtros: dict) -> List[dict]:
        ventas = Venta.objects.filter(**filtros)
        return [self._to_dict(v) for v in ventas]

    def _to_dict(self, venta: Venta) -> dict:
        return {
            'id': venta.id,
            'cliente': venta.cliente,
            'total': venta.total,
            'estado': venta.estado,
        }


# ventas/services/notificacion_service.py
from ventas.interfaces import NotificacionInterface
import smtplib

class EmailNotificacionService(NotificacionInterface):
    """Servicio de notificación por email"""

    def enviar(self, destinatario: str, mensaje: str) -> bool:
        try:
            # Lógica de envío de email
            print(f"Enviando email a {destinatario}: {mensaje}")
            return True
        except Exception as e:
            print(f"Error al enviar email: {e}")
            return False


# ventas/services/facturacion_service.py
from ventas.interfaces import FacturacionInterface
import requests

class FactusFacturacionService(FacturacionInterface):
    """Servicio de facturación usando Factus API"""

    def __init__(self, api_key: str, api_url: str):
        self.api_key = api_key
        self.api_url = api_url

    def emitir_factura(self, venta: dict) -> dict:
        try:
            headers = {'Authorization': f'Bearer {self.api_key}'}
            response = requests.post(
                f"{self.api_url}/facturas",
                json=venta,
                headers=headers
            )
            return response.json()
        except Exception as e:
            raise Exception(f"Error al emitir factura: {e}")


# ventas/services/venta_service.py
from typing import Optional
from ventas.interfaces import (
    VentaRepositoryInterface,
    NotificacionInterface,
    FacturacionInterface
)

class VentaService:
    """Servicio principal de ventas - Orquesta las operaciones"""

    def __init__(
        self,
        repository: VentaRepositoryInterface,
        notificacion: NotificacionInterface,
        facturacion: FacturacionInterface
    ):
        self.repository = repository
        self.notificacion = notificacion
        self.facturacion = facturacion

    def crear_venta(
        self,
        cliente: str,
        productos: list,
        emitir_factura: bool = False
    ) -> dict:
        """
        Crea una venta siguiendo el proceso de negocio
        """
        # 1. Calcular total
        total = self._calcular_total(productos)

        # 2. Crear venta en BD
        venta_data = {
            'cliente': cliente,
            'total': total,
            'estado': 'completada'
        }
        venta = self.repository.crear(venta_data)

        # 3. Emitir factura si se solicita
        if emitir_factura:
            try:
                factura = self.facturacion.emitir_factura(venta)
                venta['factura'] = factura
            except Exception as e:
                print(f"Error al emitir factura: {e}")

        # 4. Enviar notificación
        self.notificacion.enviar(
            cliente,
            f"Venta creada exitosamente. Total: ${total}"
        )

        return venta

    def _calcular_total(self, productos: list) -> float:
        """Calcula el total de la venta"""
        return sum(p['precio'] * p['cantidad'] for p in productos)


# ventas/views.py (Django REST Framework)
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings

from ventas.services.venta_service import VentaService
from ventas.repositories import VentaRepository
from ventas.services.notificacion_service import EmailNotificacionService
from ventas.services.facturacion_service import FactusFacturacionService

class VentaCreateView(APIView):
    """Vista para crear ventas - Inyección de dependencias"""

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Inyección de dependencias
        repository = VentaRepository()
        notificacion = EmailNotificacionService()
        facturacion = FactusFacturacionService(
            api_key=settings.FACTUS_API_KEY,
            api_url=settings.FACTUS_API_URL
        )
        self.venta_service = VentaService(repository, notificacion, facturacion)

    def post(self, request):
        try:
            venta = self.venta_service.crear_venta(
                cliente=request.data.get('cliente'),
                productos=request.data.get('productos'),
                emitir_factura=request.data.get('emitir_factura', False)
            )
            return Response(venta, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
```

## Resumen de Beneficios

1. **SRP**: Cada clase tiene una única responsabilidad, facilitando mantenimiento
2. **OCP**: Podemos extender funcionalidad sin modificar código existente
3. **LSP**: Las clases derivadas son intercambiables con las base
4. **ISP**: Interfaces pequeñas y específicas, sin métodos innecesarios
5. **DIP**: Dependemos de abstracciones, facilitando testing y cambios

## Checklist para Aplicar SOLID en Mallor

- [ ] ¿Mi clase tiene una sola responsabilidad? (SRP)
- [ ] ¿Puedo agregar funcionalidad sin modificar clases existentes? (OCP)
- [ ] ¿Puedo sustituir una clase por su derivada sin problemas? (LSP)
- [ ] ¿Mis interfaces son específicas y no obligan a implementar métodos innecesarios? (ISP)
- [ ] ¿Mis clases dependen de abstracciones en lugar de implementaciones concretas? (DIP)

## Referencias

- [SOLID Principles in Python](https://realpython.com/solid-principles-python/)
- [Principios SOLID con Python - Software Crafters](https://softwarecrafters.io/python/principios-solid-python)
- [Clean Architecture by Robert C. Martin](https://blog.cleancoder.com/)

## Notas para Mallor

- Aplicar especialmente en archivos `service.py` de cada módulo
- Usar interfaces (clases abstractas) para componentes intercambiables
- Separar responsabilidades: models (datos), services (lógica), views (presentación)
- Facilita testing mediante inyección de dependencias
- Mejora la mantenibilidad del proyecto a largo plazo
