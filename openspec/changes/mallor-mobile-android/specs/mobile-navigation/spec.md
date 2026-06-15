## ADDED Requirements

### Requirement: Rutas protegidas por autenticación
La app SHALL redirigir al login cualquier acceso a rutas protegidas cuando no hay token válido en SecureStore, sin mostrar flash de contenido protegido.

#### Scenario: Acceso sin token
- **WHEN** la app inicia y no hay token en SecureStore
- **THEN** el usuario ve directamente la pantalla de login

#### Scenario: Token válido al iniciar
- **WHEN** la app inicia y hay un access token válido en SecureStore
- **THEN** la app navega directamente al tab de ventas sin pasar por login

### Requirement: Tab bar inferior basada en roles
La app SHALL mostrar una barra de tabs inferior con las secciones disponibles según el rol del usuario autenticado. Sin labels descriptivos largos — solo ícono y nombre corto.

#### Scenario: Tab bar para EMPLEADO
- **WHEN** el usuario tiene rol EMPLEADO
- **THEN** la tab bar muestra únicamente: Ventas, Clientes

#### Scenario: Tab bar para PROPIETARIO o ADMIN
- **WHEN** el usuario tiene rol PROPIETARIO o ADMIN
- **THEN** la tab bar muestra: Ventas, Clientes, Informes

#### Scenario: Tab activo
- **WHEN** el usuario está en una sección
- **THEN** el tab correspondiente se muestra con color `#111111`; los inactivos en `#787774`

### Requirement: Header de pantalla
Cada pantalla SHALL tener un header mínimo con el título de la pantalla (tipografía 18px semibold, `#111111`) y botón de retroceso cuando aplique. Sin subtítulos explicativos en el header.

#### Scenario: Pantalla raíz de tab
- **WHEN** el usuario está en la pantalla raíz de un tab (ej. lista de ventas)
- **THEN** el header muestra el nombre del tab sin botón de retroceso

#### Scenario: Pantalla de detalle
- **WHEN** el usuario navega a una pantalla hija (ej. detalle de venta)
- **THEN** el header muestra el título específico (ej. "Venta #1234") y un botón de retroceso a la izquierda

### Requirement: Selección de empresa activa
Si el usuario pertenece a más de una empresa, la app SHALL permitir cambiar la empresa activa desde un selector accesible en el header o en una pantalla de perfil.

#### Scenario: Una sola empresa
- **WHEN** el usuario pertenece a una sola empresa
- **THEN** no se muestra ningún selector de empresa

#### Scenario: Múltiples empresas
- **WHEN** el usuario pertenece a más de una empresa
- **THEN** el nombre de la empresa activa es visible en el header principal y es tappable para cambiarla
