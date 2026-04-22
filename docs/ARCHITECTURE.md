# Arquitectura del Proyecto — Mallor

Documento técnico de alto nivel que describe la arquitectura, componentes, patrones y decisiones de diseño del sistema **Mallor**.

## Tabla de Contenidos

- [1. Visión General](#1-visión-general)
- [2. Stack Tecnológico](#2-stack-tecnológico)
- [3. Arquitectura de Alto Nivel](#3-arquitectura-de-alto-nivel)
- [4. Arquitectura de Capas (Backend)](#4-arquitectura-de-capas-backend)
- [5. Arquitectura del Frontend](#5-arquitectura-del-frontend)
- [6. Estructura de Módulos](#6-estructura-de-módulos)
- [7. Modelo de Datos](#7-modelo-de-datos)
- [8. API REST](#8-api-rest)
- [9. Seguridad y Autenticación](#9-seguridad-y-autenticación)
- [10. Integraciones Externas](#10-integraciones-externas)
- [11. Principios de Diseño](#11-principios-de-diseño)
- [12. Decisiones de Arquitectura](#12-decisiones-de-arquitectura)
- [13. Deuda Técnica y Mejoras Pendientes](#13-deuda-técnica-y-mejoras-pendientes)

---

## 1. Visión General

**Mallor** es una aplicación web **cliente-servidor** con arquitectura **desacoplada**:

- **Frontend** (React SPA) — consume la API REST del backend.
- **Backend** (Django + DRF) — expone endpoints REST, gestiona lógica de negocio y persistencia.
- **Base de datos** (PostgreSQL) — almacenamiento relacional.
- **Integraciones** — Factus (facturación electrónica DIAN) y DeepSeek (asistente IA).

### Características arquitectónicas

- 🏛️ **Arquitectura de capas** en el backend (clean architecture simplificada).
- 🔄 **API RESTful** sin estado (stateless).
- 🧩 **Organización modular** por dominio de negocio (apps Django).
- 🔐 **Autenticación por JWT** (implementación diferida).
- 📦 **Desacoplamiento Front/Back** — permite futura app móvil (React Native).

---

## 2. Stack Tecnológico

### Backend

| Componente              | Tecnología                   | Versión |
|-------------------------|------------------------------|---------|
| Lenguaje                | Python                       | 3.11+   |
| Framework web           | Django                       | 4.2     |
| Framework API           | Django REST Framework        | 3.14    |
| ORM                     | Django ORM                   | —       |
| Base de datos           | PostgreSQL                   | 14+     |
| Driver BD               | psycopg2-binary              | 2.9.9   |
| Variables de entorno    | python-decouple              | 3.8     |
| CORS                    | django-cors-headers          | 4.3     |
| Exportación Excel       | openpyxl                     | 3.1.2   |
| Autenticación (futuro)  | djangorestframework-simplejwt| —       |

### Frontend

| Componente           | Tecnología              |
|----------------------|-------------------------|
| Librería UI          | React 18                |
| Build tool           | Vite                    |
| Routing              | React Router 6          |
| Cliente HTTP         | Axios                   |
| Server state         | TanStack Query          |
| Estado global        | Zustand                 |
| Estilos              | Tailwind CSS            |
| Iconos               | Lucide React            |

### Infraestructura

- **Control de versiones**: Git + GitHub
- **Hosting**: Hostinger (producción)
- **Testing**: Django Test Framework / pytest

---

## 3. Arquitectura de Alto Nivel

```
┌──────────────────────────────────────────────────────────────┐
│                      CLIENTES                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │  Navegador   │  │   Tablet     │  │  Móvil (f)   │       │
│  │  (React SPA) │  │              │  │ React Native │       │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘       │
└─────────┼──────────────────┼──────────────────┼──────────────┘
          │                  │                  │
          └──────────────────┴──────────────────┘
                             │
                     HTTPS / REST / JSON
                             │
┌────────────────────────────▼─────────────────────────────────┐
│                   BACKEND (Django + DRF)                     │
│  ┌────────────────────────────────────────────────────────┐  │
│  │           Capa de Presentación (Views DRF)             │  │
│  ├────────────────────────────────────────────────────────┤  │
│  │              Capa de Serialización                     │  │
│  ├────────────────────────────────────────────────────────┤  │
│  │         Capa de Servicios (Lógica de Negocio)          │  │
│  ├────────────────────────────────────────────────────────┤  │
│  │           Capa de Modelos (Django ORM)                 │  │
│  └────────────────────────────────────────────────────────┘  │
└───────────────────┬──────────────────────────┬───────────────┘
                    │                          │
           ┌────────▼────────┐     ┌───────────▼──────────┐
           │   PostgreSQL    │     │   Servicios Externos │
           │  (mallor_db)    │     │  • Factus (DIAN)     │
           └─────────────────┘     │  • DeepSeek (IA)     │
                                   └──────────────────────┘
```

---

## 4. Arquitectura de Capas (Backend)

El backend implementa una **arquitectura de capas estricta** donde el flujo de dependencias es unidireccional:

```
Request ──▶ Views ──▶ Serializers ──▶ Services ──▶ Models ──▶ DB
                                         │
                                         ▼
                                       Utils
```

### 4.1 Capa de Presentación — `views.py`

**Responsabilidad**: punto de entrada HTTP, manejo de request/response.

- Recibe peticiones HTTP.
- Valida autenticación y permisos.
- Deserializa input con Serializers.
- Delega lógica a Services.
- Serializa output y retorna response.

**No debe**: contener lógica de negocio, cálculos, ni acceso directo a models.

```python
# ventas/views.py
class VentaViewSet(viewsets.ModelViewSet):
    serializer_class = VentaSerializer
    permission_classes = [IsAuthenticated]

    def create(self, request, *args, **kwargs):
        serializer = VentaCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        venta = VentaService.crear_venta(serializer.validated_data, request.user)
        return Response(VentaSerializer(venta).data, status=201)
```

### 4.2 Capa de Serialización — `serializers.py`

**Responsabilidad**: transformar entre JSON y objetos Python, validaciones de formato.

- Conversión bidireccional JSON ↔ instancias.
- Validación de tipos, formatos, unicidad.
- Campos calculados simples.

**No debe**: ejecutar reglas de negocio complejas (eso va en Services).

### 4.3 Capa de Servicios — `services.py`

**Responsabilidad**: lógica de negocio del dominio.

- Reglas de negocio, cálculos, procesos.
- Transacciones atómicas.
- Orquestación entre múltiples models.
- Validaciones de dominio.

**No debe**: acceder a `request`/`response` ni a objetos HTTP.

```python
# ventas/services.py
class VentaService:
    @staticmethod
    @transaction.atomic
    def crear_venta(data: dict, usuario) -> Venta:
        detalles_data = data.pop('detalles')
        for item in detalles_data:
            InventarioService.validar_disponibilidad(item['producto'].id, item['cantidad'])

        venta = Venta.objects.create(**data, usuario_registro=usuario)
        for item in detalles_data:
            DetalleVenta.objects.create(venta=venta, **item)
            InventarioService.actualizar_stock(
                item['producto'].id, -item['cantidad'], 'SALIDA', f"Venta {venta.numero_venta}", usuario
            )
        venta.calcular_totales()
        return venta
```

### 4.4 Capa de Modelos — `models.py`

**Responsabilidad**: definición de datos y métodos de dominio.

- Schema de base de datos.
- Métodos de instancia relacionados con el objeto.
- Queries específicas vía managers personalizados.

### 4.5 Utilidades — `utils.py`

Funciones auxiliares reutilizables, independientes del dominio específico.

- Formateadores: `convertir_a_peso_colombiano()`
- Validadores: `validar_nit_colombiano()`
- Decoradores: `@role_required(['ADMIN'])`
- Helpers de fecha, exportación, etc.

---

## 5. Arquitectura del Frontend

### 5.1 Estructura de carpetas

```
frontend/src/
├── components/           # Componentes reutilizables (UI)
│   ├── common/          # Button, Modal, Input, Table...
│   ├── layout/          # Sidebar, Navbar, Layout
│   ├── usuarios/
│   ├── inventario/
│   └── ventas/
├── pages/               # Vistas/páginas enrutadas
│   ├── usuarios/
│   ├── inventario/
│   └── ventas/
├── services/            # Cliente API (Axios)
│   ├── api.js          # Instancia axios + interceptors
│   ├── usuarios.service.js
│   ├── inventario.service.js
│   └── ventas.service.js
├── hooks/               # Custom hooks (useAuth, useDebounce...)
├── store/               # Estado global (Zustand)
│   ├── authStore.js
│   └── uiStore.js
├── utils/               # formatters, validators
├── assets/              # imágenes, iconos
├── App.jsx
└── main.jsx
```

### 5.2 Flujo de datos

```
  Usuario interactúa
        │
        ▼
  ┌──────────┐     ┌─────────────┐     ┌──────────┐
  │Componente├────▶│ Custom Hook ├────▶│ Service  │
  └──────────┘     │ (useQuery)  │     │ (Axios)  │
        ▲          └─────────────┘     └────┬─────┘
        │                ▲                   │
        │                │                   ▼
        │         ┌──────┴──────┐      ┌──────────┐
        └─────────┤   Cache     │◀─────┤ Backend  │
                  │(React Query)│      │  API     │
                  └─────────────┘      └──────────┘
```

### 5.3 Gestión de estado

- **Server state**: TanStack Query (cache, invalidación, sincronización).
- **Client state global**: Zustand (auth, UI preferences, tema).
- **Client state local**: `useState` / `useReducer`.

---

## 6. Estructura de Módulos

Cada módulo de negocio es una **app Django independiente**:

| App          | Dominio                                    |
|--------------|--------------------------------------------|
| `usuario`    | Usuarios, roles, permisos                  |
| `inventario` | Productos, categorías, stock, facturas compra |
| `ventas`     | Ventas, detalle de venta, abonos           |
| `cliente`    | Clientes, cartera                          |
| `proveedor`  | Proveedores                                |
| `fabricante` | Recetas, ingredientes (Plan Premium)       |
| `informes`   | Reportes, estadísticas, cierres de caja    |
| `IA`         | Integración con DeepSeek                   |

### Estructura interna uniforme

```
<app>/
├── __init__.py
├── admin.py
├── apps.py
├── models.py          # Modelos de datos
├── serializers.py     # Serializers DRF
├── services.py        # Lógica de negocio
├── views.py           # ViewSets / APIViews
├── urls.py            # Rutas del módulo
├── utils.py           # Helpers específicos del módulo
├── signals.py         # (opcional) signals Django
├── migrations/
└── tests/
    ├── test_models.py
    ├── test_services.py
    └── test_views.py
```

---

## 7. Modelo de Datos

### 7.1 Entidades principales

```
┌────────────┐       ┌─────────────┐       ┌────────────┐
│  Usuario   │       │   Cliente   │       │ Proveedor  │
└─────┬──────┘       └──────┬──────┘       └─────┬──────┘
      │                     │                    │
      │ registra            │ compra             │ suministra
      ▼                     ▼                    ▼
┌────────────────────────────────────────────────────────┐
│                      Venta                             │
│  ┌──────────────────┐         ┌────────────────────┐   │
│  │  DetalleVenta    │         │      Abono         │   │
│  └────────┬─────────┘         └────────────────────┘   │
└───────────┼────────────────────────────────────────────┘
            │
            ▼
      ┌───────────┐         ┌──────────────┐
      │ Producto  │◀────────┤  Categoria   │
      └─────┬─────┘         └──────────────┘
            │
            ▼
      ┌───────────────────────┐      ┌──────────────────┐
      │ HistorialInventario   │◀─────┤ FacturaCompra    │
      └───────────────────────┘      └──────────────────┘
```

### 7.2 Relaciones clave

- `Venta` **1—N** `DetalleVenta` **N—1** `Producto`
- `Venta` **1—N** `Abono`
- `Venta` **N—1** `Cliente` (nullable → "Consumidor Final")
- `Producto` **N—1** `Categoria`
- `FacturaCompra` **N—1** `Proveedor`
- `HistorialInventario` **N—1** `Producto`, optional FKs a `FacturaCompra` y `Venta`

### 7.3 Convenciones

- **PK**: `id` autoincremental (AutoField).
- **Timestamps**: `created_at` (auto_now_add), `updated_at` (auto_now) en modelos mutables.
- **Soft delete**: campo `activo` (Boolean) en lugar de DELETE físico cuando hay integridad referencial crítica.
- **Estados**: `CharField` con `choices` declarados como constantes de clase.
- **Decimales monetarios**: `DecimalField(max_digits=12, decimal_places=2)`.

Para el detalle de campos del modelo `Producto`, ver [DOCUMENTACION_REQUISITOS.md § 5.4](../DOCUMENTACION_REQUISITOS.md#especificación-detallada-modelo-producto).

---

## 8. API REST

### 8.1 Convenciones

- **Versionado**: prefijo `/api/` (versionado por URL si se requiere: `/api/v2/`).
- **Recursos en plural**: `/api/productos/`, `/api/ventas/`.
- **Snake_case** en payloads JSON.
- **Códigos HTTP estándar**:
  - `200 OK` — lectura exitosa
  - `201 Created` — creación exitosa
  - `204 No Content` — eliminación exitosa
  - `400 Bad Request` — validación fallida
  - `401 Unauthorized` — falta autenticación
  - `403 Forbidden` — sin permisos
  - `404 Not Found` — recurso no existe
  - `500 Internal Server Error` — error no controlado

### 8.2 Paginación

Paginación estándar de DRF con `PageNumberPagination`:

```json
{
  "count": 120,
  "next": "http://api/productos/?page=3",
  "previous": "http://api/productos/?page=1",
  "results": [ ... ]
}
```

### 8.3 Filtrado y búsqueda

- Query params para filtros: `?categoria=3&activo=true`
- Búsqueda: `?q=termino` o `?search=termino`
- Ordenamiento: `?ordering=-fecha_venta`

### 8.4 Estructura de respuesta de error

```json
{
  "detail": "Mensaje general del error.",
  "errors": {
    "campo": ["Descripción del error en este campo"]
  }
}
```

---

## 9. Seguridad y Autenticación

### 9.1 Autenticación

- **Fase inicial**: autenticación de sesión (Django) para facilitar testing.
- **Fase final**: **JWT** mediante `djangorestframework-simplejwt`.
  - Access token: 15 min
  - Refresh token: 7 días
  - Endpoints: `/api/auth/login/`, `/api/auth/refresh/`, `/api/auth/logout/`

### 9.2 Autorización

Sistema de roles con dos niveles:

| Rol         | Permisos                                                |
|-------------|---------------------------------------------------------|
| `ADMIN`     | Acceso total: usuarios, inventario, informes, config    |
| `EMPLEADO`  | Ventas, registro de facturas, consulta; sin informes financieros |

Implementación:
- Decorador `@role_required(['ADMIN'])` en views o services.
- Mixin `RolePermissionMixin` para ViewSets.
- Validación también en capa de servicios (defense in depth).

### 9.3 Seguridad general

- Passwords hasheados con PBKDF2 (default Django).
- CORS restringido a orígenes configurados en `.env`.
- `SECRET_KEY` nunca en el repositorio.
- Variables sensibles en `.env` (ignored por git).
- HTTPS obligatorio en producción.
- Validación de inputs en Serializers + Services.
- Queries parametrizadas (ORM previene SQL injection).

---

## 10. Integraciones Externas

### 10.1 Factus — Facturación Electrónica

- **Propósito**: emitir facturas electrónicas ante la DIAN (Colombia).
- **Protocolo**: REST HTTPS con autenticación OAuth2.
- **Módulo**: `ventas/services.py` → `FactusService`.
- **Documentación**: [developers.factus.com.co](https://developers.factus.com.co/).
- **Manejo de errores**: reintentos con backoff, cola de pendientes para modo offline.

### 10.2 DeepSeek — Asistente IA

- **Propósito**: chat en lenguaje natural conectado a la BD.
- **Implementación**: CLI con comandos personalizados (similar a MCP).
- **Módulo**: app `IA`.
- **Seguridad**: filtrado de queries, sin exposición de credenciales, permisos por rol sobre qué datos puede consultar.

### 10.3 Consideraciones de integración

- Todas las integraciones externas se encapsulan en **adaptadores** dentro de `services.py`.
- Uso de **variables de entorno** para credenciales.
- **Timeout** y manejo de errores en todas las llamadas HTTP.
- **Logging** de interacciones con servicios externos.

---

## 11. Principios de Diseño

### 11.1 SOLID

- **S** — Single Responsibility: cada módulo/clase tiene una única razón de cambio.
- **O** — Open/Closed: extensible vía nuevas clases/funciones, no modificando código existente.
- **L** — Liskov Substitution: subclases intercambiables con su base.
- **I** — Interface Segregation: interfaces específicas por cliente.
- **D** — Dependency Inversion: depender de abstracciones, no de implementaciones concretas.

### 11.2 DRY (Don't Repeat Yourself)

- Lógica compartida en `utils.py` o mixins.
- Serializers reutilizables.

### 11.3 KISS (Keep It Simple, Stupid)

- Preferir soluciones simples antes que arquitecturas sobre-diseñadas.
- Introducir complejidad solo cuando el dominio lo requiera.

### 11.4 Separation of Concerns

- Frontend ≠ Backend ≠ Base de datos.
- Views ≠ Lógica de negocio ≠ Acceso a datos.

### 11.5 Convention over Configuration

- Seguir convenciones de Django/DRF antes de configurar manualmente.

---

## 12. Decisiones de Arquitectura

### ADR-001: Django + DRF como backend

**Contexto**: Necesidad de un backend robusto con ORM, admin, autenticación y API REST.
**Decisión**: Django 4.2 + DRF 3.14.
**Justificación**: Ecosistema maduro, productividad alta, batteries included, excelente para CRUD complejo.
**Alternativas consideradas**: FastAPI, Flask.

### ADR-002: PostgreSQL como base de datos

**Contexto**: Datos relacionales con integridad referencial (ventas, abonos, inventario).
**Decisión**: PostgreSQL 14+.
**Justificación**: ACID completo, JSON fields, rendimiento, soporte para futuras features (full-text search, geospatial).

### ADR-003: Arquitectura de capas con Services

**Contexto**: Evitar "fat views" y "fat models" típicos en Django.
**Decisión**: Capa explícita de `services.py` para lógica de negocio.
**Justificación**: Testabilidad, reutilización entre views/management commands/signals, claridad de responsabilidades.

### ADR-004: React + Vite (no Next.js)

**Contexto**: Frontend desacoplado, SPA pura.
**Decisión**: React 18 + Vite.
**Justificación**: SPA simple, sin necesidad de SSR en v1, build rápido, menor curva de aprendizaje.
**Revisión futura**: considerar Next.js si se requiere SEO/SSR.

### ADR-005: Zustand + TanStack Query (no Redux)

**Contexto**: Gestión de estado del frontend.
**Decisión**: TanStack Query para server state, Zustand para client state.
**Justificación**: Menos boilerplate que Redux, separación clara entre cache de API y estado de UI.

### ADR-006: JWT diferido a fase final

**Contexto**: Acelerar desarrollo inicial de funcionalidades core.
**Decisión**: Autenticación de sesión Django en fases tempranas, JWT al final.
**Justificación**: Permite testing ágil durante desarrollo; JWT se integrará como capa añadida sin romper la API.

---

## 13. Deuda Técnica y Mejoras Pendientes

Esta sección documenta las áreas de la arquitectura que requieren atención antes o durante la entrada a producción. Se clasifican por prioridad.

### 13.1 🔴 Estandarización de errores en Services

**Problema actual**: las validaciones de formato se realizan en los Serializers, pero la capa de Services puede romper el flujo de ejecución lanzando excepciones genéricas de Python/Django sin un contrato de error definido. Esto hace que los errores de dominio sean difíciles de capturar, traducir al cliente y loguear de forma uniforme.

**Mejora propuesta**: definir excepciones de dominio personalizadas y usarlas de forma consistente en toda la capa de servicios.

```python
# core/exceptions.py
class DomainError(Exception):
    """Error de regla de negocio controlado."""
    def __init__(self, message: str, code: str = "domain_error"):
        self.message = message
        self.code = code
        super().__init__(message)

class StockInsuficienteError(DomainError): ...
class VentaCerradaError(DomainError): ...
class FacturacionError(DomainError): ...
```

- Los Services lanzan `DomainError` (o subclases) ante violaciones de reglas de negocio.
- Las Views capturan `DomainError` y retornan `400` con el mensaje estructurado.
- Las excepciones inesperadas siguen subiendo para ser capturadas por el handler global (`500`).

**Archivos a crear/modificar**: `core/exceptions.py`, handler global en `core/views.py` o `settings.py`, cada `services.py` existente.

---

### 13.2 🟡 Interfaces/Adaptadores formales en Services

**Problema actual**: toda la lógica de negocio y las llamadas a servicios externos (Factus, DeepSeek) están implementadas directamente en las clases `*Service`. Esto acopla el dominio a implementaciones concretas: si se cambia Factus por otro proveedor de facturación, hay que modificar código de negocio.

**Mejora propuesta**: introducir interfaces (clases abstractas o protocolos) que definan el contrato de cada integración, e inyectar la implementación concreta como dependencia.

```python
# ventas/ports.py
from abc import ABC, abstractmethod

class FacturacionPort(ABC):
    @abstractmethod
    def emitir_factura(self, venta) -> dict: ...

    @abstractmethod
    def anular_factura(self, numero: str) -> bool: ...

# ventas/adapters/factus_adapter.py
class FactusAdapter(FacturacionPort):
    def emitir_factura(self, venta) -> dict:
        # implementación real con Factus
        ...
```

- Los Services dependen de `FacturacionPort`, no de `FactusAdapter` directamente (Dependency Inversion — SOLID D).
- En tests se puede inyectar un `MockFacturacionAdapter` sin levantar HTTP.
- Cambiar de proveedor implica crear un nuevo adaptador, no tocar el dominio.

**Archivos a crear**: `ventas/ports.py`, `ventas/adapters/factus_adapter.py`, `IA/ports.py`, `IA/adapters/deepseek_adapter.py`.

---

### 13.3 🟡 Seguridad estricta en el Asistente IA (DeepSeek)

**Problema actual**: el módulo `IA` conecta el chat de lenguaje natural directamente con la base de datos. Aunque se planificó filtrado de queries y permisos por rol, un modelo de lenguaje puede generar consultas destructivas (`DELETE`, `UPDATE`, `DROP`) o exponer datos sensibles si la capa de autorización no es suficientemente estricta.

**Riesgos identificados**:

| Riesgo | Impacto |
|---|---|
| Queries destructivas generadas por el LLM | Pérdida de datos irreversible |
| Exposición de datos de usuarios/clientes | Violación de privacidad / GDPR |
| Prompt injection para eludir restricciones | Acceso no autorizado |

**Medidas de mitigación requeridas**:

1. **Capa de autorización por rol**: el asistente solo puede ejecutar consultas de lectura (`SELECT`) para el rol `EMPLEADO`; el rol `ADMIN` puede tener acceso ampliado pero auditado.
2. **Lista blanca de tablas/campos**: definir explícitamente qué tablas y columnas son consultables por el LLM. Nunca exponer `usuario.password`, tokens, credenciales.
3. **Query sanitization**: parsear la consulta generada antes de ejecutarla; rechazar cualquier sentencia que no sea `SELECT`.
4. **Rate limiting**: limitar el número de consultas por sesión/usuario para evitar exfiltración masiva de datos.
5. **Auditoría**: registrar todas las consultas ejecutadas por el LLM con el usuario que las originó.

```python
# IA/services.py — ejemplo de guardrail
TABLAS_PERMITIDAS = {'producto', 'venta', 'cliente', 'historialinventario'}
CAMPOS_BLOQUEADOS = {'password', 'token', 'secret', 'credencial'}

def ejecutar_query_ia(query_sql: str, rol: str) -> list:
    validar_query_segura(query_sql, TABLAS_PERMITIDAS, CAMPOS_BLOQUEADOS)
    if rol != 'ADMIN':
        validar_solo_lectura(query_sql)
    return ejecutar_con_timeout(query_sql, timeout_ms=3000)
```

---

### 13.4 🟢 Logging centralizado

**Problema actual**: no existe una estrategia de logging unificada. En producción esto impide diagnosticar errores, auditar integraciones y monitorear el comportamiento del sistema.

**Mejora propuesta**: configurar Django `LOGGING` con handlers diferenciados por nivel y destino.

```python
# settings.py
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'file_errors': {
            'level': 'ERROR',
            'class': 'logging.FileHandler',
            'filename': BASE_DIR / 'logs/errors.log',
            'formatter': 'verbose',
        },
        'file_integraciones': {
            'level': 'INFO',
            'class': 'logging.FileHandler',
            'filename': BASE_DIR / 'logs/integraciones.log',
            'formatter': 'verbose',
        },
    },
    'loggers': {
        'mallor.errors': {
            'handlers': ['file_errors'],
            'level': 'ERROR',
            'propagate': False,
        },
        'mallor.factus': {
            'handlers': ['file_integraciones'],
            'level': 'INFO',
            'propagate': False,
        },
        'mallor.ia': {
            'handlers': ['file_integraciones'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}
```

**Uso en código**:

```python
import logging
logger = logging.getLogger('mallor.factus')

class FactusService:
    def emitir_factura(self, venta):
        logger.info("Emitiendo factura para venta %s", venta.id)
        try:
            resultado = self._llamar_api(venta)
            logger.info("Factura emitida: %s", resultado.get('numero'))
            return resultado
        except Exception as exc:
            logger.error("Error al emitir factura venta %s: %s", venta.id, exc, exc_info=True)
            raise
```

**Consideraciones para producción**:

- Rotar logs con `RotatingFileHandler` (evitar archivos de log sin límite de tamaño).
- Considerar integración con Sentry o similar para alertas en tiempo real.
- Nunca loguear datos sensibles (passwords, tokens, datos personales).
- Añadir directorio `logs/` al `.gitignore`.

---

## Referencias

- [DOCUMENTACION_REQUISITOS.md](../DOCUMENTACION_REQUISITOS.md) — Especificación funcional
- [tareas.md](../tareas.md) — Plan de implementación
- [README.md](../README.md) — Visión general
- [CONTRIBUTING.md](../CONTRIBUTING.md) — Estándares de contribución
- [INSTALL.md](../INSTALL.md) — Guía de instalación

### Documentación oficial

- [Django Documentation](https://docs.djangoproject.com/)
- [Django REST Framework](https://www.django-rest-framework.org/)
- [PostgreSQL](https://www.postgresql.org/docs/)
- [React](https://react.dev/)
- [TanStack Query](https://tanstack.com/query)
- [Factus API](https://developers.factus.com.co/)

---

*Documento vivo — actualizar conforme evolucione la arquitectura del proyecto.*
