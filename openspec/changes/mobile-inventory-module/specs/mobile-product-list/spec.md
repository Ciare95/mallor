## ADDED Requirements

### Requirement: Listado de productos de inventario
La app mobile SHALL mostrar una lista paginada de productos del inventario de la empresa activa, consumiendo el endpoint `GET /api/inventario/productos/`.

#### Scenario: Carga inicial del listado
- **WHEN** el usuario abre la pestaña Inventario
- **THEN** el sistema muestra un indicador de carga y luego lista los primeros 20 productos ordenados por nombre

#### Scenario: Producto con stock normal
- **WHEN** un producto tiene `existencias > stock_minimo`
- **THEN** se muestra un badge verde o sin alerta

#### Scenario: Producto con bajo stock
- **WHEN** un producto tiene `0 < existencias <= stock_minimo`
- **THEN** se muestra un badge naranja con la etiqueta "Bajo stock"

#### Scenario: Producto sin stock
- **WHEN** un producto tiene `existencias === 0` o `existencias < 0`
- **THEN** se muestra un badge rojo con la etiqueta "Sin stock"

### Requirement: Búsqueda de productos
La app mobile SHALL permitir buscar productos por nombre, código interno o código de barras usando el parámetro `search` del endpoint.

#### Scenario: Búsqueda con resultados
- **WHEN** el usuario escribe en el campo de búsqueda y espera 400ms (debounce)
- **THEN** el sistema consulta el endpoint con `?search=<término>` y muestra los resultados filtrados

#### Scenario: Búsqueda sin resultados
- **WHEN** la búsqueda no encuentra productos
- **THEN** se muestra un mensaje "No se encontraron productos"

#### Scenario: Limpiar búsqueda
- **WHEN** el usuario borra el texto de búsqueda
- **THEN** se muestra el listado completo sin filtros

### Requirement: Carga de más productos (paginación)
La app mobile SHALL permitir cargar más productos cuando existen páginas adicionales.

#### Scenario: Cargar más productos
- **WHEN** el usuario llega al final de la lista y existen más páginas (`next` no es null en la respuesta)
- **THEN** se muestra un botón "Cargar más" o se activa carga automática al llegar al final del scroll

#### Scenario: No hay más páginas
- **WHEN** `next` es null en la respuesta del API
- **THEN** no se muestra el botón de carga adicional

### Requirement: Filtro por categoría
La app mobile SHALL permitir filtrar productos por categoría seleccionada.

#### Scenario: Filtrar por categoría
- **WHEN** el usuario selecciona una categoría desde un selector
- **THEN** el sistema consulta `?categoria=<id>` y muestra solo los productos de esa categoría

#### Scenario: Limpiar filtro de categoría
- **WHEN** el usuario selecciona "Todas las categorías"
- **THEN** se muestra el listado sin filtro de categoría

### Requirement: Estado de error en carga
La app mobile SHALL mostrar un mensaje de error y opción de reintento cuando falla la carga del inventario.

#### Scenario: Error de red al cargar
- **WHEN** el request al API falla por error de red o respuesta no-2xx
- **THEN** se muestra un mensaje de error con botón "Reintentar"

#### Scenario: Reintento exitoso
- **WHEN** el usuario presiona "Reintentar" y el API responde correctamente
- **THEN** se oculta el error y se muestra el listado
