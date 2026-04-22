# Guía de Instalación — Mallor

Esta guía te lleva paso a paso por la instalación y configuración completa del proyecto **Mallor** en un entorno de desarrollo local.

## Tabla de Contenidos

- [1. Requisitos del Sistema](#1-requisitos-del-sistema)
- [2. Instalación de Dependencias del Sistema](#2-instalación-de-dependencias-del-sistema)
- [3. Clonar el Repositorio](#3-clonar-el-repositorio)
- [4. Configuración del Backend (Django)](#4-configuración-del-backend-django)
- [5. Configuración de PostgreSQL](#5-configuración-de-postgresql)
- [6. Variables de Entorno](#6-variables-de-entorno)
- [7. Migraciones y Superusuario](#7-migraciones-y-superusuario)
- [8. Configuración del Frontend (React)](#8-configuración-del-frontend-react)
- [9. Ejecutar el Proyecto](#9-ejecutar-el-proyecto)
- [10. Verificación de la Instalación](#10-verificación-de-la-instalación)
- [11. Solución de Problemas](#11-solución-de-problemas)

---

## 1. Requisitos del Sistema

| Componente   | Versión mínima | Recomendada |
|--------------|----------------|-------------|
| Python       | 3.11           | 3.12        |
| Node.js      | 18.x           | 20.x LTS    |
| npm          | 9.x            | 10.x        |
| PostgreSQL   | 14             | 16          |
| Git          | 2.30           | última      |
| Sistema Op.  | Windows 10+, macOS 12+, Ubuntu 20.04+ | — |

---

## 2. Instalación de Dependencias del Sistema

### Windows

**Python**: descargar desde [python.org](https://www.python.org/downloads/). Durante la instalación marca ✅ *Add Python to PATH*.

**Node.js**: descargar LTS desde [nodejs.org](https://nodejs.org/).

**PostgreSQL**: descargar desde [postgresql.org](https://www.postgresql.org/download/windows/). Anota la contraseña del usuario `postgres`.

**Git**: descargar desde [git-scm.com](https://git-scm.com/download/win).

Verifica las instalaciones:

```powershell
python --version
node --version
npm --version
psql --version
git --version
```

### macOS (con Homebrew)

```bash
brew install python@3.12 node postgresql@16 git
brew services start postgresql@16
```

### Ubuntu / Debian

```bash
sudo apt update
sudo apt install python3.12 python3.12-venv python3-pip nodejs npm postgresql postgresql-contrib git libpq-dev build-essential
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

---

## 3. Clonar el Repositorio

```bash
git clone https://github.com/<usuario>/mallor.git
cd mallor
```

> Reemplaza `<usuario>` por el propietario real del repositorio.

---

## 4. Configuración del Backend (Django)

### 4.1 Crear entorno virtual

**Windows (PowerShell):**

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

**Windows (CMD):**

```cmd
python -m venv venv
venv\Scripts\activate.bat
```

**Linux / macOS:**

```bash
python3 -m venv venv
source venv/bin/activate
```

Al activarse verás `(venv)` al inicio del prompt.

### 4.2 Instalar dependencias

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

Si `requirements.txt` aún no existe o está desactualizado:

```bash
pip install django==4.2 djangorestframework==3.14.0 psycopg2-binary==2.9.9 django-cors-headers==4.3.0 python-decouple==3.8 openpyxl==3.1.2
pip freeze > requirements.txt
```

---

## 5. Configuración de PostgreSQL

### 5.1 Crear usuario y base de datos

Accede a la consola de PostgreSQL:

```bash
psql -U postgres
```

Ejecuta:

```sql
CREATE DATABASE mallor_db;
CREATE USER mallor_user WITH PASSWORD 'tu_password_seguro';

ALTER ROLE mallor_user SET client_encoding TO 'utf8';
ALTER ROLE mallor_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE mallor_user SET timezone TO 'America/Bogota';

GRANT ALL PRIVILEGES ON DATABASE mallor_db TO mallor_user;
ALTER DATABASE mallor_db OWNER TO mallor_user;

\q
```

### 5.2 Probar conexión

```bash
psql -U mallor_user -d mallor_db -h localhost
```

---

## 6. Variables de Entorno

En la raíz del proyecto, crea un archivo `.env` (o copia desde `.env.example` si existe):

```env
# Django
SECRET_KEY=cambia-esto-por-una-clave-aleatoria-larga
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Base de datos PostgreSQL
DB_NAME=mallor_db
DB_USER=mallor_user
DB_PASSWORD=tu_password_seguro
DB_HOST=localhost
DB_PORT=5432

# CORS (frontend)
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173

# Integraciones (opcionales hasta su módulo)
FACTUS_API_URL=
FACTUS_CLIENT_ID=
FACTUS_CLIENT_SECRET=
DEEPSEEK_API_KEY=
```

> ⚠️ **Nunca** subas el archivo `.env` al repositorio. Ya está incluido en `.gitignore`.

Para generar un `SECRET_KEY` seguro:

```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

---

## 7. Migraciones y Superusuario

Con el entorno virtual activo y el `.env` configurado:

```bash
python manage.py makemigrations
python manage.py migrate
python manage.py createsuperuser
```

Introduce username, email y contraseña para el superusuario.

---

## 8. Configuración del Frontend (React)

```bash
cd frontend
npm install
```

Si necesitas variables de entorno para el frontend, crea `frontend/.env.local`:

```env
VITE_API_URL=http://localhost:8000/api
```

---

## 9. Ejecutar el Proyecto

Necesitas **dos terminales** abiertas simultáneamente.

### Terminal 1 — Backend

Desde la raíz, con el venv activado:

```bash
python manage.py runserver
```

Disponible en: `http://localhost:8000`

- Admin de Django: `http://localhost:8000/admin/`
- API base: `http://localhost:8000/api/`

### Terminal 2 — Frontend

```bash
cd frontend
npm run dev
```

Disponible en: `http://localhost:5173`

---

## 10. Verificación de la Instalación

Checklist de verificación:

- [ ] `python manage.py runserver` arranca sin errores
- [ ] Puedes acceder a `http://localhost:8000/admin/` e iniciar sesión con el superusuario
- [ ] `npm run dev` arranca el frontend sin errores
- [ ] Puedes acceder a `http://localhost:5173` desde el navegador
- [ ] El frontend se comunica con el backend (revisa la consola del navegador, sin errores CORS)
- [ ] Base de datos accesible: `psql -U mallor_user -d mallor_db`

---

## 11. Solución de Problemas

### ❌ `psycopg2` falla al instalar

**Linux**: instala los headers de PostgreSQL:
```bash
sudo apt install libpq-dev python3-dev
```

**Windows**: asegúrate de usar `psycopg2-binary` (no `psycopg2`).

### ❌ `FATAL: password authentication failed for user "mallor_user"`

- Verifica las credenciales en `.env`
- En Linux, puede que debas editar `pg_hba.conf` y cambiar `peer` por `md5` para conexiones locales.

### ❌ CORS error en el navegador

Asegúrate de que `CORS_ALLOWED_ORIGINS` en `.env` incluya la URL exacta del frontend (`http://localhost:5173`) y que `corsheaders` esté en `INSTALLED_APPS` y `MIDDLEWARE`.

### ❌ `ModuleNotFoundError` al ejecutar Django

Confirma que el entorno virtual está activado (`(venv)` en el prompt) y que ejecutaste `pip install -r requirements.txt`.

### ❌ Puerto 8000 o 5173 ocupado

```bash
# Backend en otro puerto
python manage.py runserver 8001

# Frontend en otro puerto
npm run dev -- --port 5174
```

### ❌ Migraciones con conflicto

```bash
python manage.py migrate --fake-initial
# o, como último recurso en desarrollo:
python manage.py migrate <app> zero
python manage.py migrate
```

---

## Próximos Pasos

Una vez instalado, revisa:

- [README.md](./README.md) — Visión general
- [CONTRIBUTING.md](./CONTRIBUTING.md) — Cómo contribuir
- [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) — Arquitectura técnica
- [tareas.md](./tareas.md) — Plan de tareas

---

*¿Problemas no cubiertos aquí? Abre un issue en el repositorio.*
