## 1. Dependencias

- [x] 1.1 Añadir `waitress` a `requirements.txt` (después de gunicorn, comentar que es para Windows local)
- [x] 1.2 Verificar que `dj-database-url` ya está en `requirements.txt` y soporta SQLite — ya está, sin cambios

## 2. Punto de entrada del sidecar (mallor_entrypoint.py)

- [x] 2.1 Crear `mallor_entrypoint.py` en la raíz del repo con función `_get_data_dir()` que resuelve `%APPDATA%\MallorLocal\` y crea el directorio
- [x] 2.2 Implementar `_configure_env(data_dir)`: setear todas las env vars requeridas (MALLOR_MODE, MALLOR_LOCAL_SERVER, DATABASE_URL con ruta SQLite absoluta, DEBUG=false, flags de seguridad, SECRET_KEY default)
- [x] 2.3 Implementar `_setup_django()`: llamar a `django.setup()` después de configurar env vars
- [x] 2.4 Implementar `_run_migrations()`: `call_command('migrate', '--run-syncdb', verbosity=0)` con prints a stdout con flush=True
- [x] 2.5 Implementar `_seed_superuser()`: verificar `Usuario.objects.filter(is_superuser=True).exists()` y crear `admin/mallor1234` solo si no existe
- [x] 2.6 Implementar `_start_worker()`: lanzar `run_local_worker` como `threading.Thread(daemon=True)`
- [x] 2.7 Implementar `main()`: orquestar todas las fases en orden y llamar a `waitress.serve(application, host='127.0.0.1', port=8765, threads=4)`
- [x] 2.8 Verificar manualmente: `python mallor_entrypoint.py` arranca Django en local, `curl http://localhost:8765/` devuelve 200

## 3. Spec de PyInstaller (mallor-server.spec)

- [x] 3.1 Crear `mallor-server.spec` con `Analysis` apuntando a `mallor_entrypoint.py`, `pathex=['C:/laragon/www/mallor']` (o relativo con `os.getcwd()`)
- [x] 3.2 Añadir `hiddenimports` para backends SQLite de Django: `django.db.backends.sqlite3`, `django.db.backends.sqlite3.base`
- [x] 3.3 Añadir `hiddenimports` para todas las apps de INSTALLED_APPS: `empresa`, `usuario`, `offline`, `cliente`, `fabricante`, `IA`, `informes`, `inventario`, `proveedor`, `ventas`, `rest_framework`, `rest_framework_simplejwt`, `rest_framework_simplejwt.token_blacklist`, `corsheaders`
- [x] 3.4 Añadir `hiddenimports` para módulos de crypto y whitenoise: `cryptography.hazmat.primitives.asymmetric.rsa`, `cryptography.hazmat.backends.openssl`, `whitenoise.storage`
- [x] 3.5 Añadir `datas` para los directorios de migraciones de cada app (patrón `('‹app›/migrations', '‹app›/migrations')` por cada app con migraciones)
- [x] 3.6 Añadir `datas` para `staticfiles/` → destino `staticfiles` (requiere que `collectstatic` haya sido ejecutado previamente)
- [x] 3.7 Añadir `excludes` para `psycopg`, `gunicorn`, `pytest`, `pytest_django`, `factory_boy`, `faker`
- [x] 3.8 Configurar `EXE` con `console=True` (necesario para que Tauri capture stdout), `onedir=True`, `name='mallor-server'`

## 4. Script de build local

- [x] 4.1 Crear `scripts/build_sidecar.ps1` que ejecute en orden: `npm run build --prefix frontend`, `collectstatic` con env vars de modo local, `pyinstaller mallor-server.spec`, copia de `dist/mallor-server/mallor-server.exe` a `src-tauri/binaries/mallor-server-x86_64-pc-windows-msvc.exe`
- [x] 4.2 Verificar el script localmente: pyinstaller compila OK; `src-tauri/binaries/mallor-server-x86_64-pc-windows-msvc.exe` generado (13.3 MB)

## 5. Actualizar GitHub Actions

- [x] 5.1 Añadir paso `collectstatic` en Job 1 (`build-sidecar`) de `.github/workflows/release-local.yml`, después de `npm run build` del frontend y antes de `pyinstaller`, con `MALLOR_MODE=local`, `DATABASE_URL=sqlite:///tmp/build.db`, `MALLOR_LOCAL_SERVER=true`
- [x] 5.2 Verificar que el Job 1 sube el directorio completo `dist/mallor-server/` (no solo el `.exe`) como artifact — el Job 2 ya copia todo el contenido a `src-tauri/binaries/`

## 6. Verificación end-to-end del sidecar

- [x] 6.1 Compilar sidecar localmente con `scripts/build_sidecar.ps1` y ejecutar `.\dist\mallor-server\mallor-server.exe` — log `[mallor] Servidor iniciado en http://localhost:8765` ✓
- [x] 6.2 Verificar en el navegador: `http://localhost:8765/` retorna HTTP 200 con HTML del frontend React ✓
- [x] 6.3 Verificar login con `admin/mallor1234` funciona correctamente — JWT generado: `eyJhbGciOiJIUzI1NiIsInR5cCI6I...` ✓
- [x] 6.4 Verificar que `%APPDATA%\MallorLocal\db.sqlite3` fue creado correctamente (1.5 MB) ✓
- [x] 6.5 Ejecutar `mallor-server.exe` por segunda vez — datos persisten, NO se crea segundo superusuario ✓
- [x] 6.6 Compilar bundle Tauri con sidecar real: `npx @tauri-apps/cli build --no-bundle` → `mallor-local.exe` generado exitosamente ✓
