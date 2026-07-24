## ADDED Requirements

### Requirement: Vista de detalle de producto
La app mobile SHALL mostrar la información completa de un producto al navegar desde el listado, consumiendo `GET /api/inventario/productos/<id>/`.

#### Scenario: Navegación al detalle
- **WHEN** el usuario toca un producto en el listado
- **THEN** la app navega a la pantalla de detalle del producto seleccionado

#### Scenario: Carga del detalle
- **WHEN** la pantalla de detalle se abre
- **THEN** el sistema muestra un indicador de carga y luego los datos del producto

### Requirement: Información de stock en detalle
La pantalla de detalle SHALL mostrar las existencias actuales, el stock mínimo y el indicador de estado de stock.

#### Scenario: Mostrar existencias
- **WHEN** se carga el detalle del producto
- **THEN** se muestra `existencias` y `stock_minimo` con sus unidades

#### Scenario: Indicador visual de stock en detalle
- **WHEN** `existencias <= stock_minimo`
- **THEN** se muestra un banner de alerta con el estado correspondiente (bajo stock o sin stock)

### Requirement: Información de precios en detalle
La pantalla de detalle SHALL mostrar el precio de compra y precio de venta del producto.

#### Scenario: Mostrar precios
- **WHEN** se carga el detalle del producto
- **THEN** se muestran `precio_compra` y `precio_venta` formateados como moneda (COP)

### Requirement: Imagen del producto en detalle
La pantalla de detalle SHALL mostrar la imagen del producto si está disponible, o un placeholder si no lo está.

#### Scenario: Producto con imagen
- **WHEN** el producto tiene campo `imagen` con valor
- **THEN** se muestra la imagen cargada desde la URL construida con la base del API

#### Scenario: Producto sin imagen
- **WHEN** el campo `imagen` es null o vacío
- **THEN** se muestra un ícono/placeholder genérico de producto

### Requirement: Información adicional del producto
La pantalla de detalle SHALL mostrar categoría, marca, código interno, código de barras e IVA del producto.

#### Scenario: Mostrar metadatos del producto
- **WHEN** se carga el detalle del producto
- **THEN** se muestran: nombre, categoría, marca, código interno formateado (8 dígitos), código de barras (si existe) e IVA (%)

### Requirement: Error al cargar detalle
La app SHALL mostrar un mensaje de error con opción de volver atrás cuando falla la carga del detalle.

#### Scenario: Error al cargar detalle
- **WHEN** el request `GET /api/inventario/productos/<id>/` falla
- **THEN** se muestra un mensaje de error y un botón para volver al listado
