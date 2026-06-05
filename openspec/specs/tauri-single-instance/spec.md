### Requirement: Una sola instancia activa

El sistema SHALL garantizar que solo una instancia de Mallor Local esté abierta a la vez en el mismo equipo.

Implementado con `tauri-plugin-single-instance` (Rust-only, sin contraparte npm).

#### Scenario: Segunda apertura con app ya abierta

- **WHEN** el usuario intenta abrir Mallor Local cuando ya hay una instancia corriendo
- **THEN** la ventana de la instancia existente se trae al frente (focus)
- **THEN** la segunda instancia se cierra inmediatamente sin iniciar un segundo sidecar

#### Scenario: Primera apertura

- **WHEN** no hay ninguna instancia de Mallor Local en ejecución
- **THEN** la app arranca normalmente con su sidecar Django
