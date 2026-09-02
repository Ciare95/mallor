# syntax=docker/dockerfile:1

##############################################
# Etapa 1: build del frontend React (Vite)
##############################################
FROM node:22.16.0-slim AS frontend-build

WORKDIR /app/frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

##############################################
# Etapa 2: runtime Python + Django + Gunicorn
##############################################
FROM python:3.12.8-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Dependencias de producción (PyMySQL, sin librerías de sistema)
COPY requirements-prod.txt ./
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements-prod.txt

# Código del backend
COPY . .

# Build de React compilado (servido por whitenoise con MALLOR_SERVE_FRONTEND=True)
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

# Recolectar estáticos en build para imagen inmutable
RUN python manage.py collectstatic --noinput

# Usuario no-root
RUN useradd --create-home --uid 10001 mallor \
    && chown -R mallor:mallor /app

COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

USER mallor

EXPOSE 8000

ENTRYPOINT ["/app/entrypoint.sh"]
