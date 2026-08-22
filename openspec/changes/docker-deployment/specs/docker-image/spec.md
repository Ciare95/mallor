## ADDED Requirements

### Requirement: Imagen Docker multi-stage reproducible

La imagen de producción de Mallor SHALL construirse con un Dockerfile multi-stage: una etapa `build` que compile el frontend React (Vite) y una etapa `runtime` basada en Python 3.12 que instale `requirements-prod.txt` y ejecute `collectstatic` en tiempo de build.

#### Scenario: Build reproducible desde repo limpio
- **WHEN** se ejecuta `docker build` sobre el repositorio en `main` sin archivos locales (solo el código versionado)
- **THEN** la imagen se construye correctamente y arranca Gunicorn sin pasos manuales

#### Scenario: Dependencias fijadas
- **WHEN** se inspeccionan las bases de imagen y dependencias
- **THEN** cada imagen base usa un tag de versión exacto (nunca `latest`) y las dependencias Python se instalan desde `requirements-prod.txt` con versiones fijadas

#### Scenario: Estáticos compilados dentro de la imagen
- **WHEN** se construye la imagen
- **THEN** `collectstatic` corre en la etapa de build y los estáticos quedan embebidos (servidos por whitenoise), sin requerir `collectstatic` en el servidor en cada deploy

### Requirement: Arranque del contenedor sin superusuario

El contenedor SHALL ejecutar Gunicorn como un usuario no-root, y el proceso SHALL iniciar con las migraciones aplicadas.

#### Scenario: Usuario no-root
- **WHEN** el contenedor arranca
- **THEN** el proceso de Gunicorn corre bajo un usuario sin privilegios, no como `root`

#### Scenario: Migraciones aplicadas al iniciar
- **WHEN** el contenedor web inicia
- **THEN** el entrypoint ejecuta `python manage.py migrate` antes de levantar Gunicorn, de modo que la base de datos queda al día

### Requirement: Sin secretos ni datos sensibles en la imagen

La imagen Docker MUST no contener secretos (SECRET_KEY, credenciales Factus/DeepSeek, credenciales de DB) ni datos sensibles (media, SQLite, `.env`).

#### Scenario: Inspección de la imagen
- **WHEN** se inspeccionan las capas de la imagen final
- **THEN** no existen archivos `.env`, `*.sqlite3`, `api-factus-*.json` ni el contenido de `media/`

#### Scenario: Secretos inyectados solo en runtime
- **WHEN** el contenedor se ejecuta en producción
- **THEN** los secretos se proveen únicamente mediante variables de entorno en tiempo de ejecución, nunca embebidos en la imagen
