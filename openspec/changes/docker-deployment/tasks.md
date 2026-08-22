## 1. Imagen Docker reproducible

- [ ] 1.1 Crear `Dockerfile` multi-stage: etapa `build` (Node 22 `npm ci` + `vite build`) y etapa `runtime` (Python 3.12-slim) que copia `frontend/dist`, instala `requirements-prod.txt` y corre `collectstatic`
- [ ] 1.2 Fijar bases de imagen con tag exacto (`python:3.12.8-slim`, `node:22.16.0-slim`) y dependencias desde `requirements-prod.txt` + `package-lock.json`
- [ ] 1.3 Crear `entrypoint.sh` que ejecute `python manage.py migrate --noinput` y arranque Gunicorn en `0.0.0.0:8000`
- [ ] 1.4 Crear usuario no-root (`mallor`) en la etapa runtime y definir `USER mallor`
- [ ] 1.5 Verificar build: `docker build -t mallor .` finaliza y la imagen arranca Gunicorn localmente (healthcheck HTTP 200)

## 2. Orquestación docker-compose

- [ ] 2.1 Crear `docker-compose.yml` con servicios `web` (Django/Gunicorn) y `db` (MySQL 8 con tag fijo) en red interna
- [ ] 2.2 Exponer `web` solo en `127.0.0.1:8000` para que únicamente CloudPanel lo alcance
- [ ] 2.3 Configurar volumen con nombre `mysql_data` y bind mount de `media` a una ruta del host (p.ej. `/opt/mallor/media`)
- [ ] 2.4 Añadir `healthcheck` a ambos servicios y `depends_on` con condición de salud de `db`
- [ ] 2.5 Crear `.env.production.example` con todas las variables de `settings.py` (SECRET_KEY, DATABASE_URL, FACTUS_*, DEEPSEEK_*, etc.) con valores de ejemplo
- [ ] 2.6 Verificar: `docker compose config` válido y `docker compose up -d` levanta `web` + `db` en local

## 3. Higiene de secretos

- [ ] 3.1 Crear `.dockerignore` excluyendo `media/`, `*.sqlite3`, `.env*`, `api-factus-*.json`, `node_modules/`, `frontend/dist/`, `.git/`, `.coverage`, artefactos Tauri/PyInstaller
- [ ] 3.2 Endurecer `.gitignore` para `api-factus-*.json` y cualquier credencial restante
- [ ] 3.3 Retirar `api-factus-v2.json` del tracking (`git rm --cached`) y añadir a `.gitignore`
- [ ] 3.4 Rotar la credencial de Factus expuesta en `api-factus-v2.json` (acción manual con proveedor) y actualizar entornos
- [ ] 3.5 Hacer obligatoria `SECRET_KEY` de entorno en producción: fallar arranque si `DEBUG=False` y no se provee `SECRET_KEY`
- [ ] 3.6 Test pytest para la validación de `SECRET_KEY` en producción (sin variable → error claro; con variable → arranca)
- [ ] 3.7 Verificar que el build context no incluye secretos (`docker build` y revisión de capas)

## 4. CI/CD GitHub Actions

- [ ] 4.1 Crear `.github/workflows/deploy.yml` disparado por `push` a `main` (no `develop`)
- [ ] 4.2 Configurar conexión SSH con `appleboy/ssh-action` usando `SSH_HOST`, `SSH_USER`, `SSH_KEY` desde GitHub Secrets
- [ ] 4.3 Definir secuencia en el servidor: `git pull origin main` → `docker compose build` → `docker compose up -d` → `docker compose exec -T web python manage.py migrate` → `docker compose restart web`
- [ ] 4.4 Documentar en el README la configuración de GitHub Secrets y del `.env` de producción en el servidor
- [ ] 4.5 Verificar el workflow: push a `main` despliega correctamente al VPS

## 5. Proxy CloudPanel y verificación end-to-end

- [ ] 5.1 Documentar pasos del VPS: instalar solo Docker Engine + compose plugin y CloudPanel; clonar repo en `/opt/mallor`
- [ ] 5.2 Configurar en CloudPanel el sitio con reverse proxy a `127.0.0.1:8000` y `location /media/` al bind mount; SSL Let's Encrypt
- [ ] 5.3 Verificación end-to-end: `git push main` → deploy automático → app responde por HTTPS con estáticos (whitenoise) y media (CloudPanel) funcionando
