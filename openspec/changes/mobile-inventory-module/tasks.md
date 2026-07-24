## 1. Servicio de inventario mobile

- [x] 1.1 Crear `mobile/src/services/inventario.service.js` con funciones: `listarProductos(filtros)`, `obtenerProducto(id)`, `listarCategorias()`
- [x] 1.2 Implementar helper `buildImageUrl(relativePath)` que concatena la base del API (sin `/api`) al path relativo de imagen

## 2. Pantalla de listado de productos

- [x] 2.1 Crear `mobile/app/(app)/inventario/index.tsx` con FlatList, búsqueda con debounce (400ms) y paginación (page_size=20)
- [x] 2.2 Implementar badge de estado de stock en cada ítem: verde (normal), naranja (bajo stock), rojo (sin stock)
- [x] 2.3 Agregar campo de búsqueda con TextInput que filtre por nombre/código vía parámetro `search`
- [x] 2.4 Agregar selector de categoría para filtrar por `categoria` (carga categorías al abrir)
- [x] 2.5 Implementar botón "Cargar más" al final de la lista cuando `next` no sea null
- [x] 2.6 Manejar estados de loading, error (con botón Reintentar) y lista vacía

## 3. Pantalla de detalle de producto

- [x] 3.1 Crear `mobile/app/(app)/inventario/[id].tsx` que carga `GET /api/inventario/productos/<id>/`
- [x] 3.2 Mostrar imagen del producto (con placeholder si `imagen` es null) usando `buildImageUrl`
- [x] 3.3 Mostrar sección de stock: existencias, stock mínimo y banner de alerta si aplica
- [x] 3.4 Mostrar sección de precios: precio_compra y precio_venta formateados en COP
- [x] 3.5 Mostrar metadatos: código interno (8 dígitos), código de barras, categoría, marca, IVA
- [x] 3.6 Manejar estados de loading y error con botón para volver al listado

## 4. Pantalla de listado de categorías

- [x] 4.1 Crear `mobile/app/(app)/inventario/categorias.tsx` con listado de categorías desde `GET /api/inventario/categorias/`
- [x] 4.2 Al tocar una categoría, navegar al índice con el filtro de categoría preseleccionado (pasar como query param o state)
- [x] 4.3 Manejar estados de loading, error y lista vacía

## 5. Integración en tab bar

- [x] 5.1 Agregar `<Tabs.Screen name="inventario" />` en `mobile/app/(app)/_layout.tsx` con ícono `cube-outline` de Ionicons y título "Inventario"
- [x] 5.2 Verificar que la navegación entre listado → detalle funcione correctamente con el botón back nativo
- [x] 5.3 Verificar que el filtro por categoría (desde categorias.tsx → index.tsx) funcione correctamente
