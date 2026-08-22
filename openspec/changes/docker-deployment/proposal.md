## Why

Hoy el despliegue cloud de Mallor está atado a Render (`render.yaml`/`Procfile`) y el entorno local depende de Laragon + instalación manual de Python/Node/MySQL. Se necesita un despliegue propio en un VPS que sea reproducible, seguro y que no requiera instalar paquetes en el servidor: todo (runtime, dependencias, frontend compilado) debe vivir dentro de una imagen Docker, con un CI/CD que despliegue con solo hacer `git push`.

## What Changes

- **Dockerfile multi-stage y reproducible**: etapa `build` que compila el frontend React (Vite) y una etapa `runtime` (Python 3.12) que instala `requirements-prod.txt`, corre `collectstatic` en build e inicia Gunicorn. Bases de imagen fijadas por versión exacta (tag, no `latest`) y dependencias fijadas por `package-lock.json` + `requirements-prod.txt`.
- **`.dockerignore`**: excluye `media/`, `*.sqlite3`, `.env*`, `api-factus-*.json`, `node_modules/`, `frontend/dist/`, `.git/`, `.coverage`, artefactos de build Tauri/PyInstaller, etc. para no contaminar la imagen ni filtrar datos.
- **`docker-compose.yml` de producción**: servicios `web` (Django + Gunicorn) y `db` (MySQL 8). Volúmenes persistentes: `media_data` (archivos subidos) y `mysql_data` (datos). Sin `nginx` propio en el stack — el proxy/SSL lo maneja **CloudPanel** en el VPS.
- **`.env.production.example`** documentado: lista completa de variables (SECRET_KEY, DATABASE, FACTUS_*, DEEPSEEK_*, etc.) con valores de ejemplo, nunca reales.
- **Pipeline GitHub Actions** (`.github/workflows/deploy.yml`): al hacer `git push` a `main`, se conecta por SSH al VPS y ejecuta `git pull` → `docker compose build` → `migrate` → `collectstatic` → `restart`, sin entrar manualmente al servidor. Secretos vía `GitHub Secrets` (`SSH_HOST`, `SSH_USER`, `SSH_KEY`).
- **Higiene de secretos**: retirar de Git `api-factus-v2.json` (colección Postman con credenciales de Factus) y cualquier credencial filtrada; endurecer `.gitignore`; garantizar que `SECRET_KEY` y llaves se inyecten solo por entorno (nunca en la imagen ni en el repo).

## Capabilities

### New Capabilities

- `docker-image`: Imagen Docker reproducible y multi-stage que empaqueta backend Django + build de React, sin secretos embebidos y con base de imagen fijada.
- `docker-compose-stack`: Orquestación de servicios de producción (web + MySQL) con volúmenes persistentes para media y datos de base de datos.
- `ci-cd-deploy`: Pipeline de GitHub Actions que despliega a un VPS por SSH (pull, build, migrate, collectstatic, restart), con CloudPanel como proxy/SSL.
- `secrets-hygiene`: Reglas para que secretos y archivos sensibles nunca se versionen ni se incluyan en la imagen Docker.

### Modified Capabilities

_(ninguna — los requerimientos funcionales del backend/frontend no cambian; esto es infraestructura de despliegue)_

## Impact

- **Afecta solo el modo cloud** (VPS). No cambia el modo local/escritorio (Tauri + sidecar) ni la app mobile.
- **Backend**: sin cambios de código de negocio. Se usa `config/settings.py` tal cual; las variables ya se leen de entorno. Se añade un comando de entrada (migrate + gunicorn) para el contenedor.
- **Frontend**: sin cambios de código; solo se compila dentro del build del Dockerfile.
- **Dependencias**: se usa `requirements-prod.txt` (usa `PyMySQL`, sin dependencias de sistema como `mysqlclient`), lo que evita instalar libs en la imagen.
- **Infra nueva**: `Dockerfile`, `.dockerignore`, `docker-compose.yml`, `.env.production.example`, `.github/workflows/deploy.yml`.
- **Base de datos**: MySQL (coincide con `settings.py` → `django.db.backends.mysql`). Migraciones se ejecutan en el contenedor `web` durante el deploy (`python manage.py migrate`), no requieren estrategia SQLite/PostgreSQL separada porque el modo cloud usa MySQL.
- **No requiere recompilar** el sidecar PyInstaller ni el bundle Tauri.
