# Épica 2 — Módulo de Usuarios (Sin JWT)

Bitácora técnica de la Épica 2. Documenta **qué se construyó**, **qué problemas aparecieron** y **cómo se resolvieron**, para que en épicas futuras no se repitan los mismos errores.

- **Estado**: ✅ Completada
- **Alcance**: Tareas 2.1 – 2.6 de `tareas.md`
- **Módulos tocados**: `usuario/`, `core/`, `config/`, `frontend/`

---

## Tabla de contenidos

- [1. Resumen de entregables](#1-resumen-de-entregables)
- [2. Novedades arquitectónicas](#2-novedades-arquitectónicas)
- [3. Problemas encontrados y soluciones](#3-problemas-encontrados-y-soluciones)
- [4. Decisiones tomadas](#4-decisiones-tomadas)
- [5. Lecciones aprendidas](#5-lecciones-aprendidas-para-épicas-siguientes)
- [6. Pendientes heredados](#6-pendientes-heredados)

---

## 1. Resumen de entregables

### Backend (`usuario/`)

| Archivo | Descripción |
|---|---|
| `usuario/models.py` | Modelo `Usuario` extendiendo `AbstractUser`; campos `role`, `phone`, `created_at`, `updated_at`; properties `is_admin` / `is_empleado`. |
| `usuario/serializers.py` | `UsuarioSerializer`, `UsuarioListSerializer`, `UsuarioCreateSerializer` (con `confirm_password`), `UsuarioUpdateSerializer`. |
| `usuario/services.py` | `UsuarioService` con CRUD, `cambiar_password`, `validar_permisos` y `_validar_seguridad_password`. |
| `usuario/views.py` | `UsuarioViewSet` con paginación custom, acción `@action cambiar_password` y `@action me`. |
| `usuario/urls.py` | Routing con `DefaultRouter`. |
| `usuario/utils.py` | Decorador `@role_required`, mixin `RolePermissionMixin`, catálogo `PERMISOS`. |
| `core/exceptions.py` | Jerarquía `MallorError` → `UsuarioError` → excepciones específicas. |

### Frontend (`frontend/`)

| Archivo | Descripción |
|---|---|
| `src/services/usuarios.service.js` | Cliente API con todas las operaciones CRUD. |
| `src/components/usuarios/UsuariosPage.jsx` | Orquestador (listar / crear / editar / ver / eliminar). |
| `src/components/usuarios/UsuariosList.jsx` | Tabla con búsqueda, filtros y paginación. |
| `src/components/usuarios/UsuarioForm.jsx` | Formulario con validación en tiempo real y medidor de fortaleza de contraseña. |
| `src/components/usuarios/UsuarioDetail.jsx` | Vista de detalle con banner de perfil. |
| `src/components/usuarios/ConfirmDelete.jsx` | Modal de confirmación accesible. |
| `src/components/usuarios/CambiarPasswordModal.jsx` | Modal dedicado para cambio de contraseña. |
| `src/components/ui/Toast.jsx` + `src/hooks/useToast.js` | Sistema de notificaciones. |
| `src/store/useStore.js` | Estado global Zustand (`usuarioActivo`). |

---

## 2. Novedades arquitectónicas

### 2.1 Jerarquía de excepciones de dominio (`core/exceptions.py`)

Se implementó el patrón previsto en `ARCHITECTURE.md § 13.1`:

```
MallorError
└── UsuarioError
    ├── UsuarioNoEncontradoError
    ├── UsuarioDuplicadoError
    ├── PasswordIncorrectoError
    ├── PasswordInseguroError
    ├── PermisoDenegadoError
    └── UltimoAdministradorError
```

Cada excepción expone `message` y `code`. Las views las capturan y las traducen a respuestas HTTP (`400`, `404`), y las excepciones imprevistas siguen subiendo para generar `500`.

**Regla para próximas épicas**: antes de lanzar `ValueError` / `Exception` genéricos desde un Service, **crear una excepción específica** del dominio (ej. `StockInsuficienteError`, `VentaCerradaError`).

### 2.2 Sistema de permisos granular

Se construyó el sistema completo de permisos basado en roles, con tres capas de defensa:

1. **View** — `UsuarioPermission` (DRF `BasePermission`) + mixin `RolePermissionMixin`.
2. **Service** — `UsuarioService.validar_permisos(usuario, accion, recurso)` con reglas granulares a nivel de objeto.
3. **Model** — properties `is_admin` / `is_empleado`.

El catálogo `PERMISOS` en `usuario/utils.py` centraliza todas las acciones como constantes, evitando strings mágicos.

**Regla especial implementada**: cuando no existe ningún usuario activo, `POST /api/usuarios/` permite el bootstrap sin autenticación.

### 2.3 Paginación extendida

`UsuarioViewSet` implementa una paginación con formato enriquecido que se adoptó como convención:

```json
{
  "count": 120,
  "next": "...",
  "previous": "...",
  "results": [ ... ],
  "page_size": 10,
  "current_page": 2,
  "total_pages": 12
}
```

Los campos adicionales evitan que el frontend tenga que parsear las URLs `next`/`previous` para reconstruir el paginador.

### 2.4 Base del frontend React

- Estructura `components/<modulo>/` siguiendo un patrón uniforme (`Page`, `List`, `Form`, `Detail`, `ConfirmDelete`).
- Sistema de Toast reutilizable (`ui/Toast.jsx` + `hooks/useToast.js`).
- Store Zustand minimalista con `usuarioActivo`.
- Cliente Axios único (`services/api.js`) con Basic Auth **solo en desarrollo** (pendiente reemplazar por JWT en Épica 12).

---

## 3. Problemas encontrados y soluciones

Esta sección es la más importante: **no repetir estos errores en épicas futuras**.

### 3.1 🔴 `confirm_password` llega al `Model.objects.create()`

**Síntoma**: al crear un usuario desde el frontend, se devolvía `500` con el mensaje:

```
Usuario() got unexpected keyword arguments: 'confirm_password'
```

**Causa raíz**: el `UsuarioCreateSerializer` declara `confirm_password` como campo `write_only`, pero la `View` pasaba `serializer.validated_data` (que aún contiene `confirm_password`) directamente al `UsuarioService.crear_usuario(...)`, y este a su vez lo expandía con `Usuario.objects.create(**data)`. `confirm_password` no es un campo del modelo → `TypeError`.

Solo el método `serializer.create()` hace `validated_data.pop('confirm_password')`, pero la view no usa `serializer.save()`, usa el servicio.

**Solución aplicada** (`usuario/services.py`):

```python
# Eliminar campos que no son del modelo (ej. confirm_password)
campos_modelo = {field.name for field in Usuario._meta.get_fields()}
data_filtrada = {k: v for k, v in data.items() if k in campos_modelo}
usuario = Usuario.objects.create(**data_filtrada)
```

El Service ahora filtra defensivamente cualquier campo que no pertenezca al modelo.

**Regla para próximas épicas**:

> Cuando un Serializer tiene campos `write_only` que no existen en el modelo (confirmaciones, flags de UI, datos derivados), **el Service debe filtrar** antes de `Model.objects.create(**data)`, o la View debe usar `serializer.save()` en vez de delegar al Service.

Mejor aún: el Service recibe un **DTO explícito**, no un `dict` opaco proveniente del serializer.

### 3.2 🟠 Filtros con valores vacíos causan queries incorrectas

**Síntoma**: al aplicar filtros desde `UsuariosList.jsx` (campo de búsqueda vacío, select "Todos los roles"), el backend recibía `role=''` y filtraba por rol vacío, devolviendo 0 resultados.

**Causa raíz**: el frontend enviaba strings vacíos en los query params, y el servicio los aplicaba literalmente al `queryset.filter()`.

**Solución aplicada**:

1. **Frontend** (`UsuariosList.jsx`): enviar `undefined` en vez de `''` para que Axios no serialice el parámetro.
2. **Backend** (`usuario/services.py`): en `listar_usuarios`, ignorar explícitamente valores `None` o vacíos:
   ```python
   if valor is not None and valor != '':
       filtros_aplicados[filtro_db] = valor
   ```

**Regla para próximas épicas**: **doble guardia** — sanitizar en frontend y backend. Nunca confiar en que el otro lado siempre envíe los datos bien.

### 3.3 🟠 CORS bloqueaba llamadas del frontend

**Síntoma**: durante el desarrollo, el navegador rechazaba las llamadas de `localhost:5173` → `localhost:8000` por CORS.

**Solución aplicada** (`config/settings.py`):

- Añadido `corsheaders` a `INSTALLED_APPS`.
- `CorsMiddleware` al inicio de `MIDDLEWARE`.
- `CORS_ALLOWED_ORIGINS` incluye `http://localhost:5173` y `http://127.0.0.1:5173`.

**Regla para próximas épicas**: cualquier nueva URL del frontend (mobile, staging, producción) debe agregarse explícitamente; **no usar `CORS_ALLOW_ALL_ORIGINS=True` en producción**.

### 3.4 🟡 Lint del frontend: componente definido dentro del render

**Síntoma**: ESLint fallaba con:

```
Error: Cannot create components during render
```

en `CambiarPasswordModal.jsx` porque `PasswordInput` estaba definido **dentro** del componente `CambiarPasswordModal`, lo que provocaba recreación del componente en cada render (y pérdida de estado interno).

**Solución aplicada**: extraer `PasswordInput` fuera del componente padre y pasarle `value`, `onChange` y `error` por props.

**Regla para próximas épicas**:

> **Nunca definir un componente React dentro del cuerpo de otro componente.** Si se necesita un helper cerrado sobre el estado del padre, o bien se extrae como componente con props explícitas, o se convierte en una función que **retorna JSX** (no un componente).

### 3.5 🟡 Router lib no instalada causaba `require()` en App.jsx

**Síntoma**: `App.jsx` hacía `require('react-router-dom')` dentro de un `useEffect` para detectar si la dependencia estaba instalada. ESLint se quejaba de:

- `'require' is not defined` (CommonJS en un proyecto ESM).
- `Calling setState synchronously within an effect can trigger cascading renders`.

**Causa raíz**: patrón defensivo mal implementado, heredado del scaffolding inicial.

**Pendiente**: instalar definitivamente `react-router-dom` (ya está en `package.json`) y eliminar el chequeo `require()` dinámico del `App.jsx`. Reemplazar por import estático.

### 3.6 🟡 URLs del backend: usar `DefaultRouter` desde el inicio

**Síntoma inicial**: se empezó con URLs manuales (`path('usuarios/', ...)`, `path('usuarios/<int:pk>/', ...)`), lo que duplicaba la información que ya tiene un `ViewSet`.

**Solución aplicada**: refactor a `DefaultRouter` de DRF, que genera automáticamente todas las rutas CRUD + `@action`.

**Regla para próximas épicas**: **empezar con `DefaultRouter`** cualquier módulo que use `ViewSet`. Solo usar `path()` manual para endpoints ajenos al ViewSet.

### 3.7 🟢 Autenticación temporal con Basic Auth en dev

**Decisión**: durante el desarrollo, el frontend envía `Authorization: Basic ...` codificado en `api.js`. Es cómodo para avanzar sin bloquear por falta de JWT, pero **no debe llegar a producción**.

**Pendiente Épica 12**: reemplazar por `Authorization: Bearer <jwt>` con refresh flow.

---

## 4. Decisiones tomadas

### 4.1 `ViewSet` puro en vez de `ModelViewSet`

**Decisión**: `UsuarioViewSet` hereda de `viewsets.ViewSet`, no de `ModelViewSet`.

**Justificación**: toda la lógica va por el `UsuarioService`. `ModelViewSet` implicaría tener un `queryset` + `get_queryset()` y tentaría a hacer queries en la view. Con `ViewSet` explícito, la separación de capas queda más estricta.

**Costo**: hay que implementar `paginate_queryset` / `get_paginated_response` manualmente (ya resuelto).

### 4.2 Soft delete en lugar de `DELETE` físico

**Decisión**: `destroy()` marca `is_active=False` en vez de borrar la fila.

**Justificación**: integridad referencial con ventas futuras (no se puede perder el registro del empleado que hizo una venta histórica).

**Reforzado por**: `UltimoAdministradorError` impide desactivar al último admin.

### 4.3 `confirm_password` solo en el Serializer

**Decisión**: `confirm_password` se valida en el serializer (coincide con `password`) y no llega al modelo.

**Problema**: generó el bug 3.1. **Solución definitiva aplicada**: filtro defensivo en el Service.

**Alternativa evaluada**: que el Service acepte un DTO tipado (`dataclass` o Pydantic) en vez de `dict`. Queda como mejora para una épica futura.

### 4.4 Paginación con metadatos extendidos

**Decisión**: añadir `page_size`, `current_page`, `total_pages` al response.

**Justificación**: frontend no necesita parsear URLs ni hacer una query extra para saber cuántas páginas hay.

---

## 5. Lecciones aprendidas para épicas siguientes

Resumen ejecutivo. Aplicar **siempre**:

1. **Excepciones de dominio primero**. Antes de codificar un Service, crear el árbol de errores específicos en `core/exceptions.py`. Nunca lanzar `Exception` genérica desde la capa de dominio.
2. **No pasar `validated_data` directo al ORM**. Filtrar campos que no son del modelo o usar un DTO.
3. **Sanitizar filtros en ambos extremos**. Frontend envía `undefined`, backend ignora vacíos.
4. **Componentes React fuera del render del padre**. Siempre.
5. **`DefaultRouter` para ViewSets**. Desde el día uno.
6. **Paginación con metadatos extendidos** como convención del proyecto.
7. **Permisos en tres capas** (view + service + model). Consistencia con `UsuarioPermission` + `UsuarioService.validar_permisos`.
8. **Catálogo `PERMISOS`** en lugar de strings mágicos.
9. **CORS explícito**, nunca `*`.
10. **Basic Auth solo para dev**, marcar con comentario y fecha de retiro.

---

## 6. Pendientes heredados

Cosas que se tocaron en la Épica 2 pero que quedan para cerrar en su épica correspondiente:

| Pendiente | Épica destino | Notas |
|---|---|---|
| Reemplazar Basic Auth del frontend por JWT | Épica 12 | `frontend/src/services/api.js` línea 7. |
| Eliminar `require('react-router-dom')` de `App.jsx` | Próxima épica frontend | Usar import estático y limpiar `useEffect` de chequeo. |
| `exception_handler` global de DRF | Refactor transversal | Eliminar los `try/except` repetidos en cada view. |
| Tests unitarios del módulo usuario | Épica 11 (Testing) | `usuario/tests.py` está vacío; cubrir Service y View. |
| DTO tipado en Services en vez de `dict` | Mejora continua | Evaluar `dataclass` / Pydantic. |
| Rate limiting para `cambiar_password` y `create` | Épica de seguridad | Prevenir brute force. |

---

*Documento vivo — completar al cierre de cada épica siguiendo esta misma estructura.*
