## Context

Mallor es un ERP/POS híbrido: backend Django 6 + DRF, frontend React 19 (Vite) servido por whitenoise, y una app mobile Expo independiente. Hoy el cloud corre en Render (`render.yaml`, `Procfile`, `build.sh`) y el desarrollo local depende de Laragon. La base de datos real en `config/settings.py` es **MySQL** (`django.db.backends.mysql`, con `DATABASE_URL` opcional vía `dj-database-url`), no PostgreSQL como indica documentación antigua.

Se requiere mover el despliegue a un VPS propio, de forma reproducible (todo en imagen Docker, sin instalar Python/Node/MySQL en el host) y con CI/CD: `git push main` → deploy automático. El proxy y SSL los gestiona **CloudPanel** en el servidor, por lo que el stack Docker no necesita nginx propio.

## Goals / Non-Goals

**Goals:**
- Imagen Docker reproducible (builds idénticos a partir del repo).
- Stack `docker-compose` con `web` (Django/Gunicorn) y `db` (MySQL 8), con volúmenes persistentes.
- CI/CD con GitHub Actions que despliega por SSH sin entrar al servidor.
- Proxy/SSL delegado a CloudPanel.
- Cero secretos en el repo y en la imagen.

**Non-Goals:**
- No se dockeriza la app mobile (Expo) ni el empaquetado Tauri/sidecar de escritorio.
- No se migra la lógica de negocio ni se cambian endpoints.
- No se migra a PostgreSQL (se mantiene MySQL, que es lo que usa el código).
- No se implementa orquestación compleja (K8s, Swarm) ni `nginx` propio en el stack.

## Decisions

### 1. Multi-stage build con bases fijadas
**Decisión**: Etapa `build` (Node 22, instala con `npm ci` y compila `frontend` → `dist`) y etapa `runtime` (Python 3.12 slim) que copia `frontend/dist` + backend, instala `requirements-prod.txt` y corre `collectstatic`. Bases con tag exacto (p.ej. `python:3.12.8-slim`, `node:22.16.0-slim`), nunca `latest`.
**Alternativa**: una sola etapa con Node+Python (imagen `python` con Node instalado) → más pesada y con más superficie de ataque.
**Razón**: imágenes pequeñas, build reproducible y estáticos embebidos en la imagen (coherente con `MALLOR_SERVE_FRONTEND=True`).

### 2. Usar `requirements-prod.txt` (PyMySQL) en lugar de `requirements.txt`
**Decisión**: la imagen instala `requirements-prod.txt`, que usa `PyMySQL` en lugar de `mysqlclient`.
**Alternativa**: `requirements.txt` con `mysqlclient`, que exige `libmysqlclient-dev`/`build-essential` en la imagen.
**Razón**: `PyMySQL` es 100% Python, evita dependencias de sistema y hace el build reproducible sin compilar extensiones C. Ya existe y está en uso para producción (Render).

### 3. MySQL 8 como base de datos
**Decisión**: `db` usa `mysql:8.4` (tag fijo). El backend se conecta vía `DATABASE_URL=mysql://...` o variables `DB_*`, ambas ya soportadas por `settings.py`.
**Alternativa**: PostgreSQL. **Razón de descarte**: el código usa `django.db.backends.mysql` y `mysqlclient/PyMySQL`; migrar el motor de BD sería otro proyecto.

### 4. Stack sin nginx; CloudPanel como proxy + SSL
**Decisión**: `docker-compose.yml` expone solo `web` (Gunicorn en `127.0.0.1:8000`). CloudPanel crea el sitio y un reverse proxy hacia `127.0.0.1:8000` con Let's Encrypt.
**Alternativa**: contenedor `nginx` interno en el stack. **Razón de descarte**: el usuario quiere que CloudPanel se encargue de los proxys; un nginx interno duplicaría la capa de proxy y complica SSL.

### 5. Servido de estáticos y media
**Decisión**: estáticos servidos por **whitenoise** desde el contenedor (ya embebidos en build). `media/` se sirve por **CloudPanel** con un `location /media/` que apunta a un bind mount del host (p.ej. `/opt/mallor/media`). En el compose, `media` se monta como **bind mount** a esa ruta, no como volumen con nombre.
**Alternativa**: volumen con nombre para media. **Razón de descarte**: CloudPanel/Nginx no puede apuntar fácilmente al path interno de un volumen de Docker (`/var/lib/docker/volumes/...`); un bind mount lo hace servible directamente.

### 6. Volumen con nombre para MySQL
**Decisión**: los datos de MySQL persisten en un volumen con nombre `mysql_data`, gestionado por Docker (más portable y con backups simples).
**Razón**: no es necesario que Nginx/CloudPanel acceda a los datos de MySQL directamente.

### 7. Entrypoint: migrate + gunicorn, usuario no-root
**Decisión**: un `entrypoint.sh` que ejecuta `python manage.py migrate --noinput` y luego `gunicorn config.wsgi:application` (bind `0.0.0.0:8000`). La etapa runtime crea un usuario sin privilegios (`mallor`) y `USER mallor`.
**Razón**: la BD siempre queda al día al arrancar y se reduce la superficie de ataque. `collectstatic` va en build (no en el entrypoint) para que la imagen sea inmutable.

### 8. CI/CD con GitHub Actions + SSH
**Decisión**: workflow `deploy.yml` disparado por `push` a `main` (no `develop`). Usa la acción `appleboy/ssh-action` para ejecutar en el VPS:
```
cd /opt/mallor && git pull origin main
docker compose build
docker compose up -d
docker compose exec -T web python manage.py migrate
docker compose restart web
```
**Secretos** (`SSH_HOST`, `SSH_USER`, `SSH_KEY`, opcionalmente `SSH_PORT`) desde `GitHub Secrets`. El `.env` de producción vive en el servidor (fuera del repo), referenciado por compose.
**Alternativa**: webhook/deploy keys en el servidor. **Razón de descarte**: SSH-action es estándar, auditable y no deja credenciales en el servidor.

### 9. Higiene de secretos y build context
**Decisión**: `.dockerignore` excluye `media/`, `*.sqlite3`, `.env*`, `api-factus-*.json`, `node_modules/`, `frontend/dist/`, `.git/`, `.coverage`, artefactos Tauri/PyInstaller. Se remueve `api-factus-v2.json` del control de versiones (`git rm --cached`) y se rota la credencial de Factus expuesta. `SECRET_KEY` en producción debe proveerse por entorno; se valida su presencia cuando `DEBUG=False` (cambio mínimo en `settings.py`).
**Razón**: evitar que secretos o datos lleguen al repo/registro de imagen o al historial de Git.

## Risks / Trade-offs

- **`api-factus-v2.json` ya versionado**: quitarlo de HEAD no lo borra del historial de Git. → Mitigación: rotar credenciales de Factus y documentar que el historial queda comprometido.
- **`SECRET_KEY` con valor por defecto en `settings.py`**: riesgo de producción sin clave. → Mitigación: fallar el arranque si `DEBUG=False` y `SECRET_KEY` no viene de entorno.
- **Migraciones en cada arranque**: `migrate` en el entrypoint puede retrasar el arranque si hay muchas migraciones. → Mitigación: `--noinput` y migraciones ya aplicadas en la mayoría de deploys; se mantiene fuera de `collectstatic`.
- **Bind mount de media**: si CloudPanel se configura mal, `/media/` podría no servirse. → Mitigación: documentar el `location` de CloudPanel y validar en la tarea de verificación.
- **Cierre de puerto 8000 expuesto al exterior**: el compose publica `8000` solo en `127.0.0.1`. → Mitigación: bind a loopback para que solo CloudPanel lo alcance.
- **Builds no bit-reproducibles al 100%** (timestamps de capas, `npm ci` depende del registry). → Mitigación: fijar versiones de bases y de dependencias; reproducibilidad funcional, no a nivel de hash de imagen.

## Migration Plan

1. Agregar `Dockerfile`, `.dockerignore`, `docker-compose.yml`, `.env.production.example`, `entrypoint.sh` y `.github/workflows/deploy.yml`.
2. Endurecer `.gitignore` y retirar `api-factus-v2.json` (`git rm --cached`); rotar credencial Factus.
3. En el VPS: instalar solo Docker Engine + Docker Compose plugin y CloudPanel. Clonar el repo en `/opt/mallor`, crear `.env` de producción y `docker compose build && docker compose up -d`.
4. Configurar en CloudPanel el sitio con reverse proxy a `127.0.0.1:8000` y `location /media/` al bind mount; SSL con Let's Encrypt.
5. Configurar GitHub Secrets (`SSH_HOST`, `SSH_USER`, `SSH_KEY`) y verificar `git push main` → deploy.
6. **Rollback**: `git revert` + `git push` (el pipeline redeploya) o, en el servidor, `docker compose up -d --no-deps` con la imagen anterior vía `docker compose pull` de un tag anterior.

## Open Questions

- ¿Ruta definitiva en el VPS: `/opt/mallor` u otra? (asumido `/opt/mallor`).
- ¿MySQL en contenedor propio del stack o usar un MySQL gestionado/instancia externa del VPS? (asumido: contenedor propio por simplicidad).
- ¿Se mantiene Render como respaldo durante la transición, o se apaga al validar el VPS?
- ¿El `location /media/` de CloudPanel usará `alias` al bind mount exacto o se servirá media desde Django en una primera fase?
