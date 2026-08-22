## ADDED Requirements

### Requirement: Secretos fuera del repositorio

Ningún secreto de producción (SECRET_KEY, credenciales de Factus, DeepSeek, base de datos, correo, Turnstile) SHALL estar versionado en Git.

#### Scenario: Archivo de entorno versionado
- **WHEN** se revisa el historial de Git y el árbol actual
- **THEN** no existe ningún archivo `.env` con valores reales ni credenciales en el repositorio

#### Scenario: Plantilla de ejemplo
- **WHEN** un desarrollador o el deploy necesita saber qué variables configurar
- **THEN** dispone de `.env.production.example` con nombres y valores de ejemplo, sin secretos reales

### Requirement: Archivos sensibles excluidos del contexto de build

El contexto de build de Docker SHALL excluir archivos sensibles mediante un `.dockerignore`.

#### Scenario: Build no incluye datos sensibles
- **WHEN** se ejecuta `docker build`
- **THEN** el contexto excluye `media/`, `*.sqlite3`, `.env*`, `api-factus-*.json`, `node_modules/`, `frontend/dist/`, `.git/`, `.coverage` y artefactos de build Tauri/PyInstaller

### Requirement: Remediación de credenciales ya filtradas

Las credenciales que ya fueron versionadas (por ejemplo `api-factus-v2.json`, colección Postman con variables de Factus) SHALL ser removidas del tracking de Git y rotadas.

#### Scenario: Eliminación del archivo filtrado
- **WHEN** se audita el repositorio
- **THEN** `api-factus-v2.json` deja de estar versionado y se añade a `.gitignore`

#### Scenario: Rotación de credenciales expuestas
- **WHEN** una credencial estuvo versionada en Git
- **THEN** se genera una nueva credencial en el proveedor correspondiente (Factus, etc.) y se reemplaza en todos los entornos

### Requirement: Clave secreta obligatoria en producción

En producción (DEBUG=False), `SECRET_KEY` MUST ser provisto por entorno y MUST no caer al valor por defecto inseguro.

#### Scenario: Fallo sin SECRET_KEY en producción
- **WHEN** el contenedor arranca en producción sin la variable `SECRET_KEY`
- **THEN** el arranque falla con un error claro en lugar de usar el valor por defecto de desarrollo
