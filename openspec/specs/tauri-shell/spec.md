### Requirement: Ciclo de vida del sidecar Django

La aplicación Tauri SHALL iniciar el sidecar `mallor-server.exe` al abrirse y terminar el proceso al cerrarse. El sidecar MUST escuchar en `127.0.0.1:8765`.

#### Scenario: Arranque normal

- **WHEN** el usuario abre Mallor Local
- **THEN** Tauri inicia `mallor-server.exe` como proceso hijo
- **THEN** el WebView carga `http://localhost:8765`
- **THEN** React muestra un spinner hasta que Django responde con HTTP 200

#### Scenario: Cierre de la aplicación

- **WHEN** el usuario cierra la ventana de Mallor Local
- **THEN** Tauri envía señal de terminación al sidecar
- **THEN** el proceso `mallor-server.exe` finaliza en menos de 5 segundos

#### Scenario: Sidecar falla al iniciar

- **WHEN** `mallor-server.exe` no puede arrancar (binario corrupto o faltante)
- **THEN** Tauri muestra un dialog de error con el mensaje "No se pudo iniciar el servidor local de Mallor"
- **THEN** la aplicación se cierra con código de salida distinto de 0

#### Scenario: Puerto 8765 ocupado

- **WHEN** el puerto 8765 ya está en uso al arrancar
- **THEN** la app muestra el mensaje "El puerto 8765 está en uso. Cierra otras instancias de Mallor Local o reinicia el equipo"
- **THEN** la aplicación se cierra sin dejar procesos huérfanos

---

### Requirement: WebView principal

La ventana principal SHALL mostrar un WebView que cargue `http://localhost:8765`. El WebView MUST usar Edge WebView2 en Windows.

#### Scenario: Carga inicial exitosa

- **WHEN** Django responde en `http://localhost:8765`
- **THEN** el WebView renderiza la aplicación React correctamente
- **THEN** no se muestra barra de dirección ni controles de navegador

#### Scenario: Edge WebView2 no instalado

- **WHEN** el sistema no tiene Edge WebView2 instalado
- **THEN** Tauri descarga e instala el WebView2 bootstrapper automáticamente antes de mostrar la ventana

---

### Requirement: Configuración de la ventana

La ventana principal SHALL tener un tamaño mínimo de 1024x768 y MUST mostrar el título "Mallor Local".

#### Scenario: Tamaño de ventana respetado

- **WHEN** el usuario intenta redimensionar la ventana por debajo de 1024x768
- **THEN** la ventana no se reduce más allá del mínimo establecido
