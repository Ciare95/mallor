### Requirement: Modo one-dir con nombre de salida mallor-server

`mallor-server.spec` SHALL configurar PyInstaller en modo `onedir=True` (no `onefile`), con `name='mallor-server'`. El resultado SHALL ser un directorio `dist/mallor-server/` que contiene `mallor-server.exe` y sus dependencias (en PyInstaller 6.x las dependencias van dentro de `_internal/`).

#### Scenario: Ejecución de pyinstaller mallor-server.spec

- **WHEN** se ejecuta `pyinstaller mallor-server.spec` en la raíz del repo
- **THEN** se genera `dist/mallor-server/mallor-server.exe`
- **THEN** el directorio contiene todas las DLLs y dependencias necesarias

#### Scenario: Tauri renombra el sidecar

- **WHEN** el CI copia `dist/mallor-server/` a `src-tauri/binaries/` y renombra el `.exe` a `mallor-server-x86_64-pc-windows-msvc.exe`
- **THEN** Tauri lo reconoce como sidecar válido (`externalBin: ["binaries/mallor-server"]`)

---

### Requirement: Punto de entrada mallor_entrypoint.py

La spec SHALL definir `mallor_entrypoint.py` como el script de entrada (`Analysis.scripts`). El entrypoint SHALL ser importado como módulo con `pathex` apuntando a la raíz del repositorio.

#### Scenario: PyInstaller analiza el grafo de imports

- **WHEN** PyInstaller analiza `mallor_entrypoint.py`
- **THEN** detecta automáticamente `waitress`, `django.core.management`, `config.wsgi` como dependencias

---

### Requirement: Hidden imports para Django y sus apps

La spec SHALL declarar explícitamente en `hiddenimports` todos los módulos que Django carga dinámicamente y que PyInstaller no detecta por análisis estático.

**Django internals:**
- `django.db.backends.sqlite3` y todos sus submódulos
- `django.contrib.admin.apps`, `django.contrib.auth.backends`
- `django.template.loaders.app_directories`

**Apps de Mallor** (models, apps y submódulos de cada app en INSTALLED_APPS):
- `empresa`, `usuario`, `offline`, `cliente`, `fabricante`
- `IA`, `informes`, `inventario`, `proveedor`, `ventas`
- `rest_framework`, `corsheaders`

**rest_framework_simplejwt** (todos sus submódulos — carga dinámica al generar tokens):
- `rest_framework_simplejwt.state` (crítico — ModuleNotFoundError en login sin este import)
- `rest_framework_simplejwt.authentication`, `backends`, `exceptions`
- `rest_framework_simplejwt.serializers`, `settings`, `tokens`, `utils`, `views`
- `rest_framework_simplejwt.token_blacklist` y sus submódulos (`apps`, `admin`, `models`)

**Dependencias dinámicas:**
- `cryptography.hazmat.primitives.asymmetric.rsa`
- `cryptography.hazmat.backends.openssl`
- `whitenoise.storage`, `whitenoise.middleware`
- `waitress`, `dj_database_url`

#### Scenario: App Django se carga en runtime

- **WHEN** Django importa `empresa.apps.EmpresaConfig` al inicializarse
- **THEN** el módulo está disponible en el bundle sin `ModuleNotFoundError`

#### Scenario: JWT genera y verifica tokens

- **WHEN** un usuario hace login desde el frontend React
- **THEN** `rest_framework_simplejwt.state` está disponible y los tokens se generan sin error

---

### Requirement: Incluir archivos de migración como datos

La spec SHALL incluir los directorios de migraciones de cada app Django como datos en `datas`, usando el patrón `(‹app›/migrations, ‹app›/migrations)` para cada app con migraciones.

#### Scenario: Primer arranque ejecuta migrate

- **WHEN** el entrypoint llama a `migrate` en el primer arranque
- **THEN** Django encuentra los archivos `0001_initial.py`, `0002_...py`, etc. de cada app
- **THEN** las tablas son creadas correctamente

---

### Requirement: Incluir frontend/dist y staticfiles como datos

La spec SHALL incluir en `datas`:
- `("frontend/dist", "frontend/dist")` — `ReactAppView` necesita `FRONTEND_DIST_DIR/index.html`
- `("staticfiles", "staticfiles")` — whitenoise sirve los assets desde `STATIC_ROOT`

**Precondición**: `collectstatic` debe haberse ejecutado antes de invocar PyInstaller.

#### Scenario: Frontend React sirviéndose via whitenoise y ReactAppView

- **WHEN** Tauri WebView carga `http://localhost:8765/`
- **THEN** `ReactAppView` sirve `_internal/frontend/dist/index.html` con HTTP 200
- **THEN** los assets `.js` y `.css` son servidos por whitenoise desde `_internal/staticfiles/`

#### Scenario: collectstatic no ejecutado previamente

- **WHEN** `staticfiles/` no existe en el momento de ejecutar PyInstaller
- **THEN** el build del sidecar falla con error de ruta no encontrada

---

### Requirement: Excluir dependencias no necesarias para modo local

La spec SHALL declarar en `excludes` los paquetes que no son necesarios en el bundle local:
- `psycopg`, `psycopg2` (solo PostgreSQL cloud)
- `gunicorn` (no soportado en Windows)
- `pytest`, `pytest_django`, `factory_boy`, `faker`, `_pytest` (solo testing)

#### Scenario: Bundle generado sin psycopg

- **WHEN** PyInstaller construye el bundle con los excludes declarados
- **THEN** el directorio `dist/mallor-server/` no contiene DLLs de libpq innecesarias

---

### Requirement: Script de build local scripts/build_sidecar.ps1

SHALL existir un script PowerShell en `scripts/build_sidecar.ps1` que permita compilar el sidecar localmente reproduciendo los mismos pasos que el CI:

1. `npm run build --prefix frontend`
2. `collectstatic` con env vars de modo local (`MALLOR_MODE=local`, `DATABASE_URL=sqlite:///tmp_build.db`, `DB_SSL_REQUIRE=false`)
3. `pyinstaller mallor-server.spec --noconfirm`
4. Copia de `dist/mallor-server/*` a `src-tauri/binaries/` con renombrado a target triple

#### Scenario: Desarrollador compila el sidecar localmente

- **WHEN** el desarrollador ejecuta `.\scripts\build_sidecar.ps1` en PowerShell
- **THEN** se genera `src-tauri/binaries/mallor-server-x86_64-pc-windows-msvc.exe`
- **THEN** se puede ejecutar `npm run tauri:build` inmediatamente después sin errores de sidecar faltante
