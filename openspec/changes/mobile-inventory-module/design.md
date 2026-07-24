## Context

La app mobile de Mallor (React Native/Expo) ya implementa los módulos de Ventas, Clientes e Informes usando el patrón: servicio axios → pantalla Expo Router con tab. El backend Django ya expone `ProductoViewSet` y `CategoriaViewSet` en `/api/inventario/productos/` y `/api/inventario/categorias/` con autenticación JWT.

El estado de la app mobile usa el mismo `api.ts` con interceptores para JWT y empresa (`X-Empresa-Id`), sin estado global en Zustand para datos de servidor — se usa fetch directo con `useEffect`/`useState` (patrón visto en clientes e informes).

## Goals / Non-Goals

**Goals:**
- Agregar pestaña Inventario al tab bar mobile.
- Pantalla de listado de productos con búsqueda y badge de estado de stock.
- Pantalla de detalle de producto (read-only).
- Pantalla de listado de categorías.
- Servicio `inventario.service.js` consumiendo los endpoints existentes.

**Non-Goals:**
- Edición/creación/eliminación de productos desde mobile (solo lectura en esta iteración).
- Registro de facturas de compra desde mobile.
- Historial de movimientos de inventario desde mobile.
- Modo offline/sync para inventario.
- Escaneo de código de barras (puede ser una iteración futura).

## Decisions

### 1. Solo lectura (no escritura) en esta versión
**Decisión**: Las pantallas son read-only — no habrá formularios de edición de producto ni registro de compras.  
**Alternativa considerada**: Agregar CRUD completo desde el inicio.  
**Razón**: El flujo de edición de inventario en mobile es complejo (imágenes, validaciones de precio, códigos de facturación). Entregar valor rápido con consulta primero, escritura en iteración posterior.

### 2. Fetch directo con useState (sin Zustand ni TanStack Query)
**Decisión**: Seguir el mismo patrón que las pantallas existentes de clientes e informes — `useEffect` + `useState` para loading/data/error.  
**Alternativa considerada**: Introducir TanStack Query en mobile para caché automático.  
**Razón**: El frontend web ya usa TanStack Query, pero la app mobile no lo tiene instalado. Agregar una dependencia nueva para esta feature sería over-engineering; el patrón existente es suficiente y mantiene consistencia interna.

### 3. Ruta de navegación: tab + sub-pantallas
**Decisión**: `app/(app)/inventario/index.tsx` (listado) + `app/(app)/inventario/[id].tsx` (detalle) + `app/(app)/inventario/categorias.tsx` (categorías). El tab "Inventario" apunta a `index.tsx`.  
**Alternativa considerada**: Navegación con Stack anidado dentro del tab.  
**Razón**: El router de Expo Router ya maneja el Stack automáticamente dentro de un tab cuando hay pantallas adicionales. No se necesita un layout anidado explícito.

### 4. Visibilidad por rol
**Decisión**: La pestaña Inventario es visible para todos los roles (EMPLEADO y ADMIN), igual que Ventas y Clientes.  
**Razón**: Los empleados del punto de venta necesitan consultar stock. El acceso de solo lectura no representa un riesgo.

### 5. Paginación en listado
**Decisión**: Paginación con parámetros `page` y `page_size=20`, con botón "Cargar más" (scroll-based load more). El endpoint ya soporta paginación.  
**Alternativa**: FlatList con `onEndReached` para infinite scroll automático.  
**Razón**: El patrón manual con botón es más simple y consistente con lo implementado en clientes.

### 6. Indicadores de stock
**Decisión**: Badge de color en la lista: rojo para `existencias === 0` (Sin stock), naranja para `existencias <= stock_minimo` (Bajo stock), verde para normal.  
**Razón**: Necesidad clave del negocio — identificar problemas de stock de un vistazo.

## Risks / Trade-offs

- **Imágenes de producto**: El campo `imagen` del modelo Producto es un `ImageField` relativo. La URL completa depende de `MEDIA_URL` del backend. En modo cloud (Render), las imágenes se sirven desde el servidor. En modo local (LAN), la URL base cambia. → Mitigación: construir la URL de imagen concatenando `EXPO_PUBLIC_API_BASE_URL` sin `/api` + el path relativo de imagen. Si la imagen es null/vacía, mostrar un placeholder.

- **Rendimiento en listas grandes**: Un inventario de miles de productos puede ser lento en mobile. → Mitigación: `page_size=20` + búsqueda server-side. El componente `FlatList` de RN maneja virtualización.

- **Sincronización de datos**: La app mobile no tiene caché persistente — cada apertura hace una nueva request. → Aceptado para v1; si hay problemas de latencia se puede agregar caché con AsyncStorage en v2.

## Migration Plan

- Sin cambios en backend ni base de datos.
- Se agregan archivos nuevos en `mobile/`; no se modifica código existente salvo `_layout.tsx` (agregar tab).
- Deploy: build normal de Expo; no requiere recompilar sidecar ni Tauri.

## Open Questions

- ¿Se debe ocultar la pestaña Inventario para el rol EMPLEADO? (Asumido: visible para todos — revisar con el equipo si hay requerimiento de restricción futura.)
- ¿Se habilita búsqueda por código de barras con cámara en esta iteración? (Asumido: No, texto libre solamente.)
