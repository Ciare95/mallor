### Requirement: Configurar entorno Django antes del setup

`mallor_entrypoint.py` SHALL configurar todas las variables de entorno necesarias para modo local **antes** de llamar a `django.setup()`.

Variables mínimas a establecer:
- `DJANGO_SETTINGS_MODULE=config.settings`
- `MALLOR_MODE=local`
- `MALLOR_LOCAL_SERVER=true`
- `DATABASE_URL=sqlite:///‹ruta-absoluta-a-db.sqlite3›`
- `MEDIA_ROOT=‹APPDATA›\MallorLocal\media`
- `DEBUG=false`
- `DB_SSL_REQUIRE=false` (evita que dj_database_url añada sslmode a SQLite)
- `SECURE_SSL_REDIRECT=false`
- `SESSION_COOKIE_SECURE=false`
- `CSRF_COOKIE_SECURE=false`
- `SECRET_KEY` con valor por defecto si no está en el entorno

#### Scenario: Arranque en equipo sin variables de entorno previas

- **WHEN** Tauri lanza `mallor-server.exe` sin variables de entorno especiales
- **THEN** el entrypoint configura todas las variables requeridas y Django arranca sin `ImproperlyConfigured`

#### Scenario: SECRET_KEY no definido externamente

- **WHEN** `SECRET_KEY` no está en el entorno del sistema
- **THEN** el entrypoint usa `os.environ.setdefault` con un valor fijo hardcodeado
- **THEN** Django arranca y genera tokens JWT válidos

---

### Requirement: Crear directorio de datos en APPDATA

El entrypoint SHALL crear `%APPDATA%\MallorLocal\` (y `media\` dentro) si no existen, antes de configurar `DATABASE_URL`.

#### Scenario: Primera instalación en equipo limpio

- **WHEN** `%APPDATA%\MallorLocal\` no existe
- **THEN** el directorio es creado con `os.makedirs(..., exist_ok=True)`
- **THEN** `DATABASE_URL` apunta a `%APPDATA%\MallorLocal\db.sqlite3`

#### Scenario: Instalación existente (segunda vez)

- **WHEN** `%APPDATA%\MallorLocal\db.sqlite3` ya existe
- **THEN** el directorio no es recreado y la base de datos existente es reutilizada

---

### Requirement: Ejecutar migraciones en cada arranque

El entrypoint SHALL llamar a `migrate --run-syncdb` vía `django.core.management.call_command` tras `django.setup()`, antes de iniciar Waitress.

#### Scenario: Primera ejecución sin base de datos

- **WHEN** `db.sqlite3` no existe todavía
- **THEN** se crean todas las tablas de todas las apps en INSTALLED_APPS
- **THEN** el log muestra `[mallor] Migraciones completadas.`

#### Scenario: Versión actualizada con nuevas migraciones

- **WHEN** el `.msi` actualizado instala una versión con nuevas migraciones de Django
- **THEN** `migrate` aplica solo las migraciones pendientes
- **THEN** los datos existentes en la base de datos se preservan

---

### Requirement: Crear superusuario semilla en primer arranque

Tras las migraciones, el entrypoint SHALL verificar si existe algún superusuario. Si no existe, SHALL crear uno con credenciales `admin` / `mallor1234` usando el modelo de usuario personalizado `usuario.Usuario`.

#### Scenario: Primera ejecución en equipo limpio

- **WHEN** no existe ningún superusuario en la base de datos
- **THEN** se crea `Usuario(username='admin', is_superuser=True)` con contraseña `mallor1234`
- **THEN** el log muestra `[mallor] Superusuario creado.`

#### Scenario: Ejecuciones posteriores

- **WHEN** ya existe al menos un superusuario
- **THEN** no se crea ningún usuario nuevo
- **THEN** el log no muestra mensaje de creación de superusuario

---

### Requirement: Iniciar run_local_worker como hilo daemon

El entrypoint SHALL lanzar `run_local_worker` como `threading.Thread(daemon=True)` antes de que Waitress empiece a atender peticiones.

#### Scenario: Arranque normal

- **WHEN** Waitress arranca exitosamente
- **THEN** `run_local_worker` ya está corriendo en background, verificando conectividad y procesando outbox

#### Scenario: Cierre de la app

- **WHEN** Tauri termina el proceso del sidecar (SIGTERM / TerminateProcess)
- **THEN** el hilo daemon muere automáticamente junto con el proceso principal

---

### Requirement: Servir peticiones con Waitress en localhost:8765

El entrypoint SHALL llamar a `waitress.serve(application, host='127.0.0.1', port=8765, threads=4)`, donde `application` es el WSGI callable de `config.wsgi`.

`waitress.serve` es bloqueante y actúa como el loop principal del proceso.

#### Scenario: Arranque exitoso

- **WHEN** el puerto 8765 está libre
- **THEN** Waitress empieza a atender peticiones
- **THEN** el log muestra `[mallor] Servidor iniciado en http://localhost:8765`
- **THEN** `GET http://localhost:8765/` retorna HTTP 200 (HTML del frontend React)

#### Scenario: Puerto 8765 ocupado

- **WHEN** otro proceso ya ocupa el puerto 8765
- **THEN** Waitress falla con `OSError: [WinError 10048]`
- **THEN** el proceso termina con código de salida distinto de 0
- **THEN** Tauri muestra su dialog de error estándar y cierra la app

---

### Requirement: Registrar progreso en stdout

Cada fase del arranque SHALL emitir un mensaje a `stdout` (con `flush=True`) para que Tauri pueda capturarlo en los logs del sidecar.

Mensajes mínimos requeridos:
- `[mallor] Directorio de datos: ‹ruta›`
- `[mallor] Ejecutando migraciones...`
- `[mallor] Migraciones completadas.`
- `[mallor] Servidor iniciado en http://localhost:8765`

#### Scenario: Lectura de logs por Tauri

- **WHEN** Tauri captura stdout del sidecar
- **THEN** cada mensaje está terminado con `\n` y visible en los logs del proceso hijo
