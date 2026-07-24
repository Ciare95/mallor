## ADDED Requirements

### Requirement: Listado de categorías de inventario
La app mobile SHALL mostrar todas las categorías del inventario de la empresa activa, consumiendo `GET /api/inventario/categorias/`.

#### Scenario: Carga de categorías
- **WHEN** el usuario accede a la pantalla de categorías
- **THEN** el sistema muestra la lista de categorías con su nombre

#### Scenario: Categoría vacía
- **WHEN** no existen categorías para la empresa
- **THEN** se muestra un mensaje "No hay categorías registradas"

### Requirement: Conteo de productos por categoría
Cada ítem de categoría SHALL mostrar el número de productos asociados.

#### Scenario: Mostrar conteo
- **WHEN** se lista una categoría
- **THEN** se muestra el número total de productos en esa categoría (obtenido del campo `productos_count` o consultando con `?categoria=<id>`)

### Requirement: Navegación desde categoría a productos filtrados
Al tocar una categoría, la app SHALL navegar al listado de productos filtrado por esa categoría.

#### Scenario: Toque en categoría
- **WHEN** el usuario toca una categoría en el listado
- **THEN** la app navega al listado de productos con el filtro de categoría preseleccionado

### Requirement: Error al cargar categorías
La app SHALL mostrar un mensaje de error con opción de reintento cuando falla la carga de categorías.

#### Scenario: Error de red al cargar categorías
- **WHEN** el request al API de categorías falla
- **THEN** se muestra un mensaje de error con botón "Reintentar"
