## Why

El sidecar de Tauri necesita un ejecutable `.exe` standalone de Django que arranque sin Python instalado en la máquina del usuario. PyInstaller compila el backend con todas sus dependencias en un único directorio distribuible, permitiendo que Tauri lo gestione como proceso hijo en Mallor Local.

Afecta: **solo modo local** (no hay impacto en el despliegue cloud en Render).

## What Changes

- **Nuevo** `mallor_entrypoint.py` en la raíz del proyecto: punto de entrada que ejecuta migraciones, crea superusuario semilla en primer arranque, lanza Waitress en `localhost:8765`, e inicia `run_local_worker` como hilo daemon.
- **Nuevo** `mallor-server.spec` en la raíz del proyecto: configuración de PyInstaller que empaqueta Django, todos sus apps, archivos de migración, estáticos del frontend y assets del proyecto en un directorio one-dir.
- **Nuevo** `scripts/build_sidecar.ps1`: script auxiliar para compilar el sidecar localmente (desarrollo/testing).
- No requiere cambios en `settings.py` ni en ningún app Django existente.
- **Requiere recompilar el sidecar** con PyInstaller tras cualquier cambio en Python/migraciones/requirements.
- **No requiere recompilar el bundle de Tauri** (el sidecar se inyecta en CI antes del build de Tauri).

## Capabilities

### New Capabilities

- `sidecar-entrypoint`: Punto de entrada Python (`mallor_entrypoint.py`) que inicializa la base de datos SQLite en `APPDATA`, ejecuta migraciones, crea superusuario semilla `admin/mallor1234` si no existe, lanza Waitress en `localhost:8765` y corre `run_local_worker` como hilo daemon.
- `pyinstaller-spec`: Spec de PyInstaller (`mallor-server.spec`) que empaqueta el entrypoint con todas las dependencias Django, archivos de migración, templates, estáticos del build React y binarios nativos necesarios para Windows.

### Modified Capabilities

*(ninguna — no cambian requisitos de specs existentes)*

## Impact

- **Archivos nuevos**: `mallor_entrypoint.py`, `mallor-server.spec`, `scripts/build_sidecar.ps1`
- **Dependencias Python añadidas a `requirements.txt`**: `waitress` (servidor WSGI para Windows), `pyinstaller` (solo dev/CI, no producción cloud)
- **GitHub Actions** (`.github/workflows/release-local.yml`): el Job 1 ya referencia `mallor-server.spec` — este cambio crea ese archivo
- **Base de datos**: SQLite creada en `%APPDATA%\MallorLocal\db.sqlite3` en el primer arranque; las migraciones corren automáticamente
- **Sin impacto cloud**: Render sigue usando `requirements.txt` sin `pyinstaller`; `mallor_entrypoint.py` solo se activa vía `MALLOR_MODE=local`
