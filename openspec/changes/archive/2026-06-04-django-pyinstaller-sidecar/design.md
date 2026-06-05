## Context

El backend Django 6.0.4 se ejecuta actualmente via gunicorn en Render (cloud) o en local con `manage.py runserver`. Para Mallor Local necesitamos un `.exe` standalone que Tauri pueda lanzar como proceso hijo en Windows sin que Python esté instalado.

`config/settings.py` ya soporta `MALLOR_MODE=local`, `MALLOR_LOCAL_SERVER=true`, y acepta `DATABASE_URL` para SQLite via `dj_database_url`. Whitenoise sirve el build de React desde `STATIC_ROOT`. El `run_local_worker` corre como management command de Django.

Restricción principal: SQLite tiene concurrencia limitada, pero Mallor Local es single-user (una sesión de caja a la vez), por lo que no es un problema real.

## Goals / Non-Goals

**Goals:**
- Producir `dist/mallor-server/mallor-server.exe` standalone (sin Python en el equipo del usuario)
- Primer arranque automático: crear directorio APPDATA, correr migraciones, crear superusuario semilla `admin/mallor1234`
- Cero cambios en `config/settings.py` ni en apps Django existentes
- El sidecar solo requiere que Tauri lo inicie como proceso hijo; comunicación vía HTTP en `localhost:8765`

**Non-Goals:**
- Soporte multiplataforma (Windows únicamente en v1)
- Múltiples bases de datos de usuario en el mismo equipo
- Backup automático de la base de datos local
- Migración de datos desde una instalación previa de Mallor Local

## Decisions

### D1: PyInstaller modo one-dir (no one-file)

**Elegido**: `--onedir` (directorio `dist/mallor-server/` con `mallor-server.exe` + dependencias).

**Descartado**: `--onefile` (un solo `.exe` que extrae a `%TEMP%` en cada arranque).

**Razón**: One-file tiene cold start de 10–20 segundos por la extracción; antivirus Windows frecuentemente bloquean ejecutables que se auto-extraen a `%TEMP%`. One-dir arranca en <2 segundos y Tauri lo gestiona como un directorio de sidecar, lo cual ya espera (el bundle de Tauri puede incluir subdirectorios en `externalBin`).

### D2: SQLite en `%APPDATA%\MallorLocal\db.sqlite3`

El entrypoint calcula `os.environ['APPDATA']` (garantizado en Windows) y crea `%APPDATA%\MallorLocal\`. La base de datos persiste entre actualizaciones del instalador `.msi` porque `APPDATA` nunca es tocado por el instalador WiX de Tauri.

`DATABASE_URL=sqlite:///C:/Users/.../AppData/Roaming/MallorLocal/db.sqlite3` es interpretado por `dj_database_url.parse()` que ya está en `settings.py`. Cero cambios en settings.

### D3: `collectstatic` en tiempo de build, `staticfiles/` embebido en el bundle

El flujo de CI (Job 1 en GitHub Actions) es:
1. `npm run build` → `frontend/dist/`
2. `python manage.py collectstatic --noinput` → `staticfiles/` (con `MALLOR_MODE=local`, `DATABASE_URL=sqlite:///temp.db`)
3. `pyinstaller mallor-server.spec` → incluye `staticfiles/` → `staticfiles` en el bundle

En el bundle, `STATIC_ROOT = BASE_DIR / 'staticfiles'` apunta a `_MEIPASS/staticfiles/` que existe. Whitenoise (`CompressedManifestStaticFilesStorage`) sirve directamente desde ahí, con compresión y hashing ya calculados.

`frontend/dist/` no necesita estar en el bundle (solo se usa como fuente para `collectstatic`).

**Descartado**: Correr `collectstatic` en el primer arranque del sidecar → requeriría acceso de escritura a `_MEIPASS` (solo lectura) o una ruta configurable extra.

### D4: Waitress con 4 threads

Waitress es el único servidor WSGI para Windows (gunicorn no soporta Windows). 4 threads es suficiente para uso single-user LAN: peticiones API de React → Django son síncronas y cortas. No hay riesgo de saturación.

### D5: `run_local_worker` como hilo daemon

```python
threading.Thread(target=call_command, args=('run_local_worker',), daemon=True).start()
```

`daemon=True` garantiza que el hilo muere cuando Waitress (el hilo principal) termina. Tauri mata el proceso via `sidecar_child.kill()` al cerrar la app; el OS termina todos los threads del proceso. No se necesita cleanup explícito.

### D6: `SECRET_KEY` local hardcodeado como default

Para v1, el entrypoint usa `os.environ.setdefault('SECRET_KEY', '<valor-fijo>')`. Los JWT generados solo son válidos en `localhost:8765` — un atacante local que tenga acceso al equipo ya tiene acceso a la base de datos SQLite igualmente. Riesgo aceptado para v1 de uso single-tenant.

## Risks / Trade-offs

| Riesgo | Mitigación |
|--------|------------|
| PyInstaller no detecta hidden imports de Django (apps dinámicas, backends de DB) | Lista explícita de `hiddenimports` en `mallor-server.spec` copiando todos los módulos de INSTALLED_APPS |
| `psycopg[binary]` incluido en el bundle aunque no se necesita para SQLite | Excluir `psycopg` de `excludes` en la spec; reduce tamaño del bundle ~15MB |
| Antivirus detecta el `.exe` generado por PyInstaller como falso positivo | Esperado en v1 sin firma Microsoft; SmartScreen ya está documentado en el instalador Tauri |
| Primera migración puede tardar >5s en equipos lentos | El sidecar imprime logs a stdout; Tauri ya tiene un spinner React que espera el 200 de `localhost:8765` |
| `collectstatic` en CI necesita una base de datos activa para cargar apps con migraciones | Usar `DATABASE_URL=sqlite:///tmp/build.db` en el paso de CI; Django no necesita datos reales para collectstatic |

## Migration Plan

1. Crear `mallor_entrypoint.py` en raíz del repo
2. Crear `mallor-server.spec` en raíz del repo
3. Añadir `waitress` a `requirements.txt`
4. Actualizar `.github/workflows/release-local.yml` Job 1: añadir paso `collectstatic` antes de PyInstaller
5. Crear `scripts/build_sidecar.ps1` para desarrollo local
6. Verificar localmente: `pip install waitress pyinstaller && pyinstaller mallor-server.spec`

**Rollback**: Si el sidecar no arranca, Tauri muestra el dialog de error y sale (ya implementado en `src-tauri/src/lib.rs`). No hay datos en riesgo — la base de datos SQLite en APPDATA no es tocada por el rollback.

## Open Questions

- *(ninguna — todas las decisiones están tomadas)*
