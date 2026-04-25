---
name: factus
description: Guía de integración con la API de Factus para facturación electrónica en Mallor.
license: Complete terms in LICENSE.txt
---

# Factus - Facturación Electrónica API

Este skill proporciona una guía completa para integrar la API de Factus (facturación electrónica) en el proyecto Mallor.

## Propósito
Facilitar la integración con la API de Factus para emitir facturas electrónicas cumpliendo con las normativas de la DIAN en Colombia.

## Cuándo usar este skill
- Al implementar la emisión de facturas electrónicas
- Al configurar autenticación con Factus
- Al consultar el estado de facturas
- Al manejar errores de facturación
- Al testear la integración con Postman MCP

## Documentación Oficial
- [Documentación Factus](https://developers.factus.com.co/)
- [Guía de Uso Factus](Guia-uso-factus_Halltec (2) (1).docx)
- [API Collection](api-factus-v2.json)

## Arquitectura de Integración

```
┌─────────────────┐
│  Mallor Backend │
│    (Django)     │
└────────┬────────┘
         │
         ▼
┌─────────────────────┐
│  Factus Service     │
│  (service.py)       │
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│   Factus API        │
│  (OAuth 2.0)        │
└─────────────────────┘
         │
         ▼
┌─────────────────────┐
│       DIAN          │
│  (Autoridad Fiscal) │
└─────────────────────┘
```

## 1. Autenticación

Factus utiliza OAuth 2.0 para autenticación.

### Variables de Entorno
```python
# settings.py
FACTUS_API_URL = os.environ.get('FACTUS_API_URL', 'https://api.factus.com.co')
FACTUS_CLIENT_ID = os.environ.get('FACTUS_CLIENT_ID')
FACTUS_CLIENT_SECRET = os.environ.get('FACTUS_CLIENT_SECRET')
FACTUS_USERNAME = os.environ.get('FACTUS_USERNAME')
FACTUS_PASSWORD = os.environ.get('FACTUS_PASSWORD')
```

### Obtener Token de Acceso

```python
# ventas/services/factus_auth.py
import requests
from django.conf import settings
from django.core.cache import cache
from typing import Optional

class FactusAuthService:
    """Servicio de autenticación con Factus API"""

    TOKEN_CACHE_KEY = 'factus_access_token'
    TOKEN_EXPIRY_BUFFER = 300  # 5 minutos antes de expiración

    @classmethod
    def obtener_token(cls) -> str:
        """
        Obtiene el token de acceso, usando caché si está disponible
        """
        # Intentar obtener token del caché
        token = cache.get(cls.TOKEN_CACHE_KEY)
        if token:
            return token

        # Si no hay token en caché, obtener uno nuevo
        return cls._solicitar_nuevo_token()

    @classmethod
    def _solicitar_nuevo_token(cls) -> str:
        """
        Solicita un nuevo token de acceso a Factus
        """
        url = f"{settings.FACTUS_API_URL}/oauth/token"

        payload = {
            'grant_type': 'password',
            'client_id': settings.FACTUS_CLIENT_ID,
            'client_secret': settings.FACTUS_CLIENT_SECRET,
            'username': settings.FACTUS_USERNAME,
            'password': settings.FACTUS_PASSWORD,
        }

        headers = {
            'Accept': 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded',
        }

        try:
            response = requests.post(url, data=payload, headers=headers, timeout=30)
            response.raise_for_status()

            data = response.json()
            access_token = data['access_token']
            expires_in = data.get('expires_in', 3600)

            # Guardar en caché con tiempo de expiración
            cache_timeout = expires_in - cls.TOKEN_EXPIRY_BUFFER
            cache.set(cls.TOKEN_CACHE_KEY, access_token, cache_timeout)

            return access_token

        except requests.exceptions.RequestException as e:
            raise Exception(f"Error al obtener token de Factus: {str(e)}")

    @classmethod
    def refrescar_token(cls, refresh_token: str) -> str:
        """
        Refresca el token de acceso usando un refresh token
        """
        url = f"{settings.FACTUS_API_URL}/oauth/token"

        payload = {
            'grant_type': 'refresh_token',
            'client_id': settings.FACTUS_CLIENT_ID,
            'client_secret': settings.FACTUS_CLIENT_SECRET,
            'refresh_token': refresh_token,
        }

        headers = {
            'Accept': 'application/json',
        }

        try:
            response = requests.post(url, data=payload, headers=headers, timeout=30)
            response.raise_for_status()

            data = response.json()
            access_token = data['access_token']
            expires_in = data.get('expires_in', 3600)

            # Actualizar caché
            cache_timeout = expires_in - cls.TOKEN_EXPIRY_BUFFER
            cache.set(cls.TOKEN_CACHE_KEY, access_token, cache_timeout)

            return access_token

        except requests.exceptions.RequestException as e:
            raise Exception(f"Error al refrescar token: {str(e)}")
```

## 2. Emisión de Facturas

### Estructura de Datos

```python
# ventas/schemas/factura_schema.py
from typing import List, Optional
from dataclasses import dataclass
from decimal import Decimal

@dataclass
class ItemFactura:
    """Representa un ítem de la factura"""
    codigo: str
    descripcion: str
    cantidad: Decimal
    precio_unitario: Decimal
    descuento: Decimal = Decimal('0')
    iva_porcentaje: Decimal = Decimal('19')

    @property
    def subtotal(self) -> Decimal:
        return self.cantidad * self.precio_unitario

    @property
    def valor_descuento(self) -> Decimal:
        return self.subtotal * (self.descuento / 100)

    @property
    def base_imponible(self) -> Decimal:
        return self.subtotal - self.valor_descuento

    @property
    def valor_iva(self) -> Decimal:
        return self.base_imponible * (self.iva_porcentaje / 100)

    @property
    def total(self) -> Decimal:
        return self.base_imponible + self.valor_iva


@dataclass
class ClienteFactura:
    """Información del cliente para la factura"""
    tipo_documento: str  # CC, NIT, CE, etc.
    numero_documento: str
    nombre: str
    email: Optional[str] = None
    telefono: Optional[str] = None
    direccion: Optional[str] = None
    ciudad: Optional[str] = None
    departamento: Optional[str] = None


@dataclass
class FacturaElectronica:
    """Estructura completa de una factura electrónica"""
    numero_factura: str
    fecha_emision: str  # Formato: YYYY-MM-DD
    cliente: ClienteFactura
    items: List[ItemFactura]
    medio_pago: str = "Efectivo"
    notas: Optional[str] = None

    @property
    def subtotal(self) -> Decimal:
        return sum(item.subtotal for item in self.items)

    @property
    def total_descuentos(self) -> Decimal:
        return sum(item.valor_descuento for item in self.items)

    @property
    def total_iva(self) -> Decimal:
        return sum(item.valor_iva for item in self.items)

    @property
    def total(self) -> Decimal:
        return sum(item.total for item in self.items)
```

### Servicio de Facturación

```python
# ventas/services/factus_facturacion.py
import requests
from django.conf import settings
from typing import Dict, Any
from decimal import Decimal

from ventas.services.factus_auth import FactusAuthService
from ventas.schemas.factura_schema import FacturaElectronica, ItemFactura, ClienteFactura


class FactusFacturacionService:
    """Servicio para emitir facturas electrónicas con Factus"""

    @classmethod
    def emitir_factura(cls, factura: FacturaElectronica) -> Dict[str, Any]:
        """
        Emite una factura electrónica a través de Factus

        Args:
            factura: Objeto FacturaElectronica con todos los datos

        Returns:
            Diccionario con la respuesta de Factus

        Raises:
            Exception: Si hay error en la emisión
        """
        # Obtener token de autenticación
        token = FactusAuthService.obtener_token()

        # Construir payload
        payload = cls._construir_payload(factura)

        # Enviar a Factus
        url = f"{settings.FACTUS_API_URL}/api/v2/facturas"

        headers = {
            'Authorization': f'Bearer {token}',
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        }

        try:
            response = requests.post(
                url,
                json=payload,
                headers=headers,
                timeout=60
            )
            response.raise_for_status()

            return response.json()

        except requests.exceptions.HTTPError as e:
            error_detail = e.response.json() if e.response else str(e)
            raise Exception(f"Error HTTP al emitir factura: {error_detail}")

        except requests.exceptions.RequestException as e:
            raise Exception(f"Error al comunicarse con Factus: {str(e)}")

    @classmethod
    def _construir_payload(cls, factura: FacturaElectronica) -> Dict[str, Any]:
        """
        Construye el payload según el formato de Factus API
        """
        return {
            'numero': factura.numero_factura,
            'fecha': factura.fecha_emision,
            'cliente': {
                'tipo_documento': factura.cliente.tipo_documento,
                'numero_documento': factura.cliente.numero_documento,
                'nombre': factura.cliente.nombre,
                'email': factura.cliente.email,
                'telefono': factura.cliente.telefono,
                'direccion': factura.cliente.direccion,
                'ciudad': factura.cliente.ciudad,
                'departamento': factura.cliente.departamento,
            },
            'items': [
                {
                    'codigo': item.codigo,
                    'descripcion': item.descripcion,
                    'cantidad': str(item.cantidad),
                    'precio_unitario': str(item.precio_unitario),
                    'descuento_porcentaje': str(item.descuento),
                    'iva_porcentaje': str(item.iva_porcentaje),
                    'subtotal': str(item.subtotal),
                    'valor_descuento': str(item.valor_descuento),
                    'base_imponible': str(item.base_imponible),
                    'valor_iva': str(item.valor_iva),
                    'total': str(item.total),
                }
                for item in factura.items
            ],
            'subtotal': str(factura.subtotal),
            'total_descuentos': str(factura.total_descuentos),
            'total_iva': str(factura.total_iva),
            'total': str(factura.total),
            'medio_pago': factura.medio_pago,
            'notas': factura.notas,
        }

    @classmethod
    def consultar_estado_factura(cls, cufe: str) -> Dict[str, Any]:
        """
        Consulta el estado de una factura por su CUFE

        Args:
            cufe: Código Único de Factura Electrónica

        Returns:
            Diccionario con el estado de la factura
        """
        token = FactusAuthService.obtener_token()

        url = f"{settings.FACTUS_API_URL}/api/v2/facturas/{cufe}"

        headers = {
            'Authorization': f'Bearer {token}',
            'Accept': 'application/json',
        }

        try:
            response = requests.get(url, headers=headers, timeout=30)
            response.raise_for_status()
            return response.json()

        except requests.exceptions.RequestException as e:
            raise Exception(f"Error al consultar estado de factura: {str(e)}")

    @classmethod
    def descargar_pdf_factura(cls, cufe: str, ruta_destino: str) -> bool:
        """
        Descarga el PDF de una factura

        Args:
            cufe: Código Único de Factura Electrónica
            ruta_destino: Ruta donde guardar el PDF

        Returns:
            True si se descargó correctamente
        """
        token = FactusAuthService.obtener_token()

        url = f"{settings.FACTUS_API_URL}/api/v2/facturas/{cufe}/pdf"

        headers = {
            'Authorization': f'Bearer {token}',
        }

        try:
            response = requests.get(url, headers=headers, timeout=60)
            response.raise_for_status()

            with open(ruta_destino, 'wb') as f:
                f.write(response.content)

            return True

        except requests.exceptions.RequestException as e:
            raise Exception(f"Error al descargar PDF: {str(e)}")
```

## 3. Integración con Django Views

```python
# ventas/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from decimal import Decimal
from datetime import datetime

from ventas.services.factus_facturacion import FactusFacturacionService
from ventas.schemas.factura_schema import (
    FacturaElectronica,
    ClienteFactura,
    ItemFactura
)
from ventas.models import Venta


class EmitirFacturaView(APIView):
    """Vista para emitir facturas electrónicas"""

    def post(self, request):
        """
        Emite una factura electrónica para una venta

        Body:
        {
            "venta_id": 123,
            "emitir_factura": true
        }
        """
        try:
            venta_id = request.data.get('venta_id')
            venta = Venta.objects.get(id=venta_id)

            # Construir datos de factura desde la venta
            factura = self._construir_factura_desde_venta(venta)

            # Emitir factura con Factus
            resultado = FactusFacturacionService.emitir_factura(factura)

            # Guardar información de factura en la venta
            venta.cufe = resultado.get('cufe')
            venta.numero_factura = resultado.get('numero')
            venta.estado_factura = 'emitida'
            venta.save()

            return Response({
                'success': True,
                'message': 'Factura emitida exitosamente',
                'data': resultado
            }, status=status.HTTP_201_CREATED)

        except Venta.DoesNotExist:
            return Response({
                'error': 'Venta no encontrada'
            }, status=status.HTTP_404_NOT_FOUND)

        except Exception as e:
            return Response({
                'error': f'Error al emitir factura: {str(e)}'
            }, status=status.HTTP_400_BAD_REQUEST)

    def _construir_factura_desde_venta(self, venta: Venta) -> FacturaElectronica:
        """Construye objeto FacturaElectronica desde una Venta"""

        # Cliente
        cliente = ClienteFactura(
            tipo_documento=venta.cliente.tipo_documento,
            numero_documento=venta.cliente.numero_documento,
            nombre=venta.cliente.nombre,
            email=venta.cliente.email,
            telefono=venta.cliente.telefono,
            direccion=venta.cliente.direccion,
            ciudad=venta.cliente.ciudad,
            departamento=venta.cliente.departamento,
        )

        # Items
        items = []
        for detalle in venta.detalles.all():
            item = ItemFactura(
                codigo=detalle.producto.codigo,
                descripcion=detalle.producto.nombre,
                cantidad=Decimal(str(detalle.cantidad)),
                precio_unitario=Decimal(str(detalle.precio_unitario)),
                descuento=Decimal(str(detalle.descuento or 0)),
                iva_porcentaje=Decimal(str(detalle.producto.iva_porcentaje)),
            )
            items.append(item)

        # Factura completa
        factura = FacturaElectronica(
            numero_factura=f"FV-{venta.id}",
            fecha_emision=datetime.now().strftime('%Y-%m-%d'),
            cliente=cliente,
            items=items,
            medio_pago=venta.medio_pago or "Efectivo",
            notas=venta.notas,
        )

        return factura
```

## 4. Manejo de Errores

```python
# ventas/exceptions.py
class FactusException(Exception):
    """Excepción base para errores de Factus"""
    pass


class FactusAuthException(FactusException):
    """Error de autenticación con Factus"""
    pass


class FactusValidacionException(FactusException):
    """Error de validación de datos"""
    pass


class FactusComunicacionException(FactusException):
    """Error de comunicación con la API"""
    pass


# Uso en el servicio
def emitir_factura_con_manejo_errores(factura: FacturaElectronica):
    try:
        return FactusFacturacionService.emitir_factura(factura)

    except requests.exceptions.HTTPError as e:
        if e.response.status_code == 401:
            raise FactusAuthException("Token inválido o expirado")
        elif e.response.status_code == 422:
            raise FactusValidacionException(f"Datos inválidos: {e.response.json()}")
        else:
            raise FactusException(f"Error HTTP: {e.response.status_code}")

    except requests.exceptions.Timeout:
        raise FactusComunicacionException("Timeout al comunicarse con Factus")

    except requests.exceptions.ConnectionError:
        raise FactusComunicacionException("No se pudo conectar con Factus API")
```

## 5. Testing con Postman MCP

Para probar la integración, usar las herramientas de Postman MCP disponibles en Cline:

```python
# Endpoints a probar:
# 1. POST /oauth/token - Autenticación
# 2. POST /api/v2/facturas - Crear factura
# 3. GET /api/v2/facturas/{cufe} - Consultar estado
# 4. GET /api/v2/facturas/{cufe}/pdf - Descargar PDF
```

## 6. Configuración de Ambiente

```python
# .env
FACTUS_API_URL=https://api.factus.com.co
FACTUS_CLIENT_ID=your_client_id
FACTUS_CLIENT_SECRET=your_client_secret
FACTUS_USERNAME=your_username
FACTUS_PASSWORD=your_password

# Para pruebas
FACTUS_API_URL=https://sandbox.factus.com.co
```

## 7. Best Practices

### ✅ Hacer

1. **Usar caché para tokens** - Evita solicitudes innecesarias
2. **Validar datos antes de enviar** - Ahorra llamadas a la API
3. **Manejar timeouts** - Las facturas pueden tardar
4. **Guardar CUFE** - Necesario para consultas posteriores
5. **Logs detallados** - Facilita debugging
6. **Reintentos con backoff** - Para errores temporales

### ❌ Evitar

1. No hardcodear credenciales
2. No enviar datos sin validar
3. No ignorar errores de validación
4. No hacer múltiples llamadas simultáneas sin control
5. No exponer tokens en logs
6. No olvidar manejar conexiones perdidas

## 8. Logging Recomendado

```python
import logging

logger = logging.getLogger('mallor.factus')

class FactusFacturacionService:

    @classmethod
    def emitir_factura(cls, factura: FacturaElectronica) -> Dict[str, Any]:
        logger.info(f"Iniciando emisión de factura: {factura.numero_factura}")

        try:
            payload = cls._construir_payload(factura)
            logger.debug(f"Payload construido: {payload}")

            # ... código de emisión ...

            logger.info(f"Factura emitida exitosamente. CUFE: {resultado.get('cufe')}")
            return resultado

        except Exception as e:
            logger.error(f"Error al emitir factura {factura.numero_factura}: {str(e)}")
            raise
```

## 9. Checklist de Implementación

- [ ] Configurar variables de entorno
- [ ] Implementar servicio de autenticación
- [ ] Implementar servicio de facturación
- [ ] Crear esquemas de datos (schemas)
- [ ] Integrar con modelos Django
- [ ] Crear vistas/endpoints
- [ ] Agregar manejo de errores
- [ ] Implementar logging
- [ ] Probar con Postman MCP
- [ ] Agregar tests unitarios
- [ ] Documentar uso interno
- [ ] Validar en ambiente de pruebas
- [ ] Desplegar a producción

## Referencias

- [Documentación Factus](https://developers.factus.com.co/)
- [OAuth 2.0 Specification](https://oauth.net/2/)
- [Django REST Framework](https://www.django-rest-framework.org/)
- [Requests Library](https://docs.python-requests.org/)

## Notas para Mallor

- **Obligatorio**: Todas las facturas deben cumplir con normativa DIAN
- **Importante**: Guardar CUFE para trazabilidad
- **Recomendado**: Implementar cola de tareas para emisión asíncrona
- **Crítico**: Manejar correctamente errores de red y timeouts
- **Sugerencia**: Implementar sistema de reintentos automáticos
