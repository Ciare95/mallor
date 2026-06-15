## ADDED Requirements

### Requirement: Listado de ventas propias
La app SHALL mostrar la lista de ventas del usuario autenticado, ordenadas por fecha descendente, con filtro por estado (TODAS, TERMINADA, PENDIENTE, CANCELADA) y paginación infinita.

#### Scenario: Carga inicial
- **WHEN** el usuario navega a la pantalla de ventas
- **THEN** se muestra la lista con fecha, cliente, total y badge de estado. Sin texto introductorio ni cards explicativas.

#### Scenario: Filtro por estado
- **WHEN** el usuario selecciona un estado en el selector
- **THEN** la lista se actualiza mostrando solo ventas de ese estado

#### Scenario: Paginación infinita
- **WHEN** el usuario llega al final de la lista
- **THEN** se cargan automáticamente las siguientes ventas sin acción explícita

### Requirement: Detalle de venta
La app SHALL mostrar el detalle de una venta: cliente, productos, cantidades, precios, subtotal, impuestos, total, método de pago y estado de factura electrónica.

#### Scenario: Acceso al detalle
- **WHEN** el usuario toca una venta en la lista
- **THEN** se navega al detalle mostrando todos los campos de la venta

#### Scenario: Cancelar venta
- **WHEN** el usuario toca "Cancelar venta" en el detalle y confirma el motivo
- **THEN** la venta cambia a estado CANCELADA y la lista se actualiza

### Requirement: Nueva venta en tres pasos
La app SHALL guiar la creación de una venta completa mediante un flujo de tres pasos secuenciales: (1) cliente, (2) productos, (3) pago. El usuario puede retroceder entre pasos sin perder datos.

#### Scenario: Paso 1 — seleccionar o crear cliente
- **WHEN** el usuario inicia una nueva venta
- **THEN** ve un buscador de clientes. Puede seleccionar uno existente o crear uno nuevo en el momento. También puede continuar con "Consumidor Final" sin seleccionar cliente.

#### Scenario: Paso 2 — agregar productos
- **WHEN** el usuario avanza al paso 2
- **THEN** puede buscar productos por nombre o código, seleccionar cantidad y ver el subtotal acumulado en tiempo real

#### Scenario: Al menos un producto requerido
- **WHEN** el usuario intenta avanzar del paso 2 al paso 3 sin productos
- **THEN** se muestra un error inline y el avance es bloqueado

#### Scenario: Paso 3 — resumen y pago
- **WHEN** el usuario llega al paso 3
- **THEN** ve el resumen (cliente, productos, total) y selecciona método de pago (EFECTIVO o CRÉDITO). Para CRÉDITO puede registrar un abono inicial.

#### Scenario: Confirmar venta con factura electrónica
- **WHEN** el usuario activa "Factura electrónica" y confirma
- **THEN** la venta se crea con `factura_electronica: true` y el sistema inicia el proceso de emisión vía Factus

#### Scenario: Confirmar venta sin factura
- **WHEN** el usuario confirma sin activar factura electrónica
- **THEN** la venta se crea con estado TERMINADA y se navega al detalle de la venta creada

#### Scenario: Error de red al confirmar
- **WHEN** la petición falla por error de red o del servidor
- **THEN** se muestra un mensaje de error y el usuario puede reintentar sin perder los datos del formulario
