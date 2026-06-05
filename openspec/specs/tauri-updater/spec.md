### Requirement: Verificación de actualizaciones al arrancar

La aplicación SHALL verificar si hay una nueva versión disponible en GitHub Releases cada vez que arranca, una vez que Django haya respondido satisfactoriamente.

#### Scenario: Nueva versión disponible

- **WHEN** el endpoint de actualizaciones retorna una versión superior a la instalada
- **THEN** la app muestra un dialog "Nueva versión X.Y.Z disponible. ¿Deseas instalarla ahora?"
- **THEN** si el usuario acepta, la app descarga e instala la actualización en background
- **THEN** al finalizar, la app se reinicia automáticamente

#### Scenario: Sin nueva versión

- **WHEN** el endpoint retorna la misma versión que la instalada o no responde
- **THEN** la app continúa el arranque normal sin interrumpir al usuario

#### Scenario: Error al verificar actualizaciones

- **WHEN** GitHub no es accesible (sin conexión a internet)
- **THEN** la verificación falla silenciosamente
- **THEN** la app continúa el arranque normal sin mensaje de error al usuario

---

### Requirement: Endpoint de actualizaciones

El sistema SHALL usar un archivo `latest.json` alojado en GitHub Releases como fuente de verdad para las actualizaciones. El archivo MUST contener versión, URL de descarga y firma criptográfica.

La clave pública de verificación está embebida en `src-tauri/tauri.conf.json` bajo `plugins.updater.pubkey`. La clave privada se almacena como GitHub Actions secret `TAURI_SIGNING_PRIVATE_KEY`.

#### Scenario: Estructura válida de latest.json

- **WHEN** el updater descarga `latest.json`
- **THEN** el archivo contiene los campos `version`, `platforms.windows-x86_64.url` y `platforms.windows-x86_64.signature`
- **THEN** la firma se verifica con la clave pública embebida en el binario antes de instalar

#### Scenario: Firma inválida

- **WHEN** la firma del archivo de actualización no coincide con la clave pública
- **THEN** la actualización es rechazada
- **THEN** la app muestra un error "La actualización no pudo verificarse" y continúa con la versión instalada
