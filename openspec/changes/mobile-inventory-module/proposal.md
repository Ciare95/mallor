## Why

La app mobile de Mallor ya tiene módulos de Ventas, Clientes e Informes, pero carece de acceso al inventario desde el dispositivo. Los vendedores y administradores necesitan consultar stock, buscar productos y detectar alertas de bajo inventario desde el celular sin tener que acceder al panel web — esto es especialmente crítico en el punto de venta local.

## What Changes

- Nueva pestaña **Inventario** en el tab bar de la app mobile (visible para todos los roles).
- Pantalla de listado de productos con búsqueda por nombre, código interno o código de barras.
- Pantalla de detalle de producto (stock, precios, categoría, imagen, stock mínimo).
- Pantalla de listado de categorías con conteo de productos.
- Indicadores visuales de **bajo stock** (existencias ≤ stock_mínimo) y **sin stock** (existencias = 0).
- Servicio `inventario.service.js` siguiendo el mismo patrón que `clientes.service.js`.
- Integración con los endpoints existentes del backend: `/api/inventario/productos/` y `/api/inventario/categorias/`.

## Capabilities

### New Capabilities

- `mobile-product-list`: Listado y búsqueda de productos del inventario desde mobile con indicadores de stock.
- `mobile-product-detail`: Vista de detalle de un producto con información completa (precios, existencias, imagen, categoría).
- `mobile-category-list`: Listado de categorías de inventario desde mobile.

### Modified Capabilities

_(ninguna — los endpoints del backend ya existen y no cambian sus requerimientos)_

## Impact

- **Mobile**: Nuevas pantallas en `mobile/app/(app)/inventario/`. Nueva pestaña en `mobile/app/(app)/_layout.tsx`. Nuevo servicio en `mobile/src/services/inventario.service.js`.
- **Backend**: Sin cambios — se consumen los ViewSets `ProductoViewSet` y `CategoriaViewSet` ya existentes en `inventario/views.py`.
- **Sin migraciones**: el backend no requiere cambios de base de datos.
- **Afecta solo cloud y local**: la app mobile se conecta al backend sea cual sea el modo (MALLOR_MODE).
- **No requiere recompilar sidecar Django ni bundle Tauri**: cambios son exclusivos del cliente mobile.
