## ADDED Requirements

### Requirement: Lista y búsqueda de clientes
La app SHALL mostrar la lista de clientes activos con búsqueda en tiempo real por nombre, número de documento o teléfono, y paginación infinita.

#### Scenario: Carga inicial
- **WHEN** el usuario navega a clientes
- **THEN** se muestra la lista de clientes con nombre, tipo/número de documento y teléfono. Sin texto introductorio.

#### Scenario: Búsqueda
- **WHEN** el usuario escribe en el buscador
- **THEN** la lista se filtra en tiempo real (debounce 300ms) contra la API

#### Scenario: Sin resultados
- **WHEN** la búsqueda no retorna resultados
- **THEN** se muestra el nombre buscado y un botón "Crear cliente" pre-llenado con ese texto

### Requirement: Detalle de cliente
La app SHALL mostrar el detalle de un cliente: nombre, documento, teléfono, email, dirección y últimas ventas asociadas.

#### Scenario: Acceso al detalle
- **WHEN** el usuario toca un cliente en la lista
- **THEN** se navega al detalle con todos sus campos y un acceso directo a "Nueva venta" con ese cliente pre-seleccionado

### Requirement: Crear cliente
La app SHALL permitir crear un cliente nuevo con los campos: tipo de documento, número de documento, nombre completo, teléfono, email (opcional) y dirección (opcional).

#### Scenario: Creación exitosa
- **WHEN** el usuario completa los campos requeridos y confirma
- **THEN** el cliente se crea en el servidor y la app navega al detalle del cliente recién creado

#### Scenario: Documento duplicado
- **WHEN** el número de documento ya existe en el sistema
- **THEN** se muestra un error inline en el campo de documento antes de enviar el formulario

#### Scenario: Autocompletar por documento
- **WHEN** el usuario ingresa un número de documento válido (RUT, NIT, CC)
- **THEN** la app consulta `/api/clientes/autocompletar/` y pre-llena nombre y razón social si hay coincidencia

### Requirement: Crear cliente rápido desde flujo de venta
La app SHALL permitir crear un cliente directamente desde el paso 1 del flujo de nueva venta sin abandonar el proceso.

#### Scenario: Crear cliente en contexto de venta
- **WHEN** el usuario toca "Crear cliente" desde el buscador de clientes en paso 1
- **THEN** se abre un formulario modal o pantalla de creación rápida; al confirmar, el cliente nuevo queda seleccionado en la venta y el flujo continúa en paso 2
