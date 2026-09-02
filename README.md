# Mallor

**Mallor** es una aplicación web integrada con inteligencia artificial diseñada para la gestión contable, inventario y emisión de facturación electrónica, orientada a pequeñas y medianas empresas (PYMEs) en Colombia.

> Gestión simplificada de inventarios, ventas y facturación electrónica, con un asistente IA conectado directamente a la base de datos para consultas en lenguaje natural.

---

## Tabla de Contenidos

- [Características Principales](#características-principales)
- [Tecnologías Utilizadas](#tecnologías-utilizadas)
- [Requisitos Previos](#requisitos-previos)
- [Instalación Rápida](#instalación-rápida)
- [Comandos Útiles](#comandos-útiles)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Documentación](#documentación)
- [Contribución](#contribución)
- [Licencia](#licencia)

---

## Características Principales

- 📦 **Gestión de Inventario**: CRUD de productos y categorías, control de stock, ingreso por facturas de compra y exportación a Excel.
- 🛒 **Ventas y Abonos**: Punto de venta, gestión de pagos parciales, cuentas por cobrar y estados de venta.
- 👥 **Clientes y Proveedores**: Administración completa con historial de compras y gestión de cartera.
- 🏭 **Módulo Fabricante** *(Premium)*: Recetas, conversión de unidades y cálculo de rentabilidad.
- 📊 **Informes y Estadísticas**: Cierres de caja, reportes en PDF/Excel y análisis de tendencias.
- 🤖 **Asistente IA**: Chat interactivo sobre datos del negocio usando DeepSeek.
- 🧾 **Facturación Electrónica**: Integración con la API de Factus para emisión ante la DIAN.
- 🔐 **Roles y Permisos**: Administrador y Empleado con accesos diferenciados.

---

## Tecnologías Utilizadas

### Backend
- **Python** 3.11+
- **Django** 4.2
- **Django REST Framework** 3.14
- **PostgreSQL** 14+
- **python-decouple** (variables de entorno)
- **openpyxl** (exportación Excel)

### Frontend
- **React** 18 + **Vite**
- **React Router** 6
- **TanStack Query** (React Query)
- **Zustand** (gestión de estado)
- **Tailwind CSS**
- **Axios**
- **Lucide React** (iconos)

### Integraciones
- **Factus API** — Facturación electrónica DIAN
- **DeepSeek API** — Asistente IA

### DevOps
- **Git** + **GitHub**
- **Hostinger** (hosting futuro)

---

## Requisitos Previos

Antes de empezar, asegúrate de tener instalado:

| Herramienta | Versión mínima |
|-------------|----------------|
| Python      | 3.11           |
| Node.js     | 18             |
| npm         | 9              |
| PostgreSQL  | 14             |
| Git         | 2.x            |

---

## Instalación Rápida

Para una guía detallada paso a paso, consulta [**INSTALL.md**](./INSTALL.md).

### 1. Clonar el repositorio

```bash
git clone https://github.com/<usuario>/mallor.git
cd mallor
```

### 2. Backend (Django)

```bash
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # Linux/macOS

pip install -r requirements.txt
copy .env.example .env         # configurar credenciales
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

El backend estará disponible en `http://localhost:8000`.

### 3. Frontend (React)

```bash
cd frontend
npm install
npm run dev
```

El frontend estará disponible en `http://localhost:5173`.

---

## Comandos Útiles

### Backend

```bash
python manage.py runserver              # Iniciar servidor de desarrollo
python manage.py makemigrations         # Crear migraciones
python manage.py migrate                # Aplicar migraciones
python manage.py createsuperuser        # Crear superusuario
python manage.py shell                  # Shell interactivo
python manage.py test                   # Ejecutar tests
pip freeze > requirements.txt           # Actualizar dependencias
```

### Frontend

```bash
npm run dev         # Servidor de desarrollo
npm run build       # Build de producción
npm run preview     # Previsualizar build
npm run lint        # Linter
```

### Git

```bash
git checkout develop                    # Cambiar a rama desarrollo
git checkout -b feature/nueva-tarea     # Nueva rama de feature
git add .
git commit -m "feat: descripción"
git push origin feature/nueva-tarea
```

---

## Estructura del Proyecto

```
mallor/
├── config/                    # Configuración principal de Django
│   ├── settings.py
│   ├── urls.py
│   └── wsgi.py
├── usuario/                   # App: gestión de usuarios y roles
├── inventario/                # App: productos, categorías, stock
├── ventas/                    # App: ventas y abonos
├── cliente/                   # App: gestión de clientes
├── proveedor/                 # App: gestión de proveedores
├── fabricante/                # App: recetas y producción (Premium)
├── informes/                  # App: reportes y estadísticas
├── IA/                        # App: asistente IA (DeepSeek)
├── frontend/                  # Aplicación React + Vite
│   ├── src/
│   │   ├── components/        # Componentes reutilizables
│   │   ├── pages/             # Páginas/vistas
│   │   ├── services/          # Llamadas API
│   │   ├── hooks/             # Custom hooks
│   │   ├── store/             # Estado global (Zustand)
│   │   ├── utils/             # Utilidades
│   │   └── assets/            # Imágenes e iconos
│   └── package.json
├── docs/                      # Documentación extendida
│   └── ARCHITECTURE.md
├── venv/                      # Entorno virtual Python (no versionado)
├── manage.py
├── requirements.txt
├── .env                       # Variables de entorno (no versionado)
├── .gitignore
├── README.md                  # Este archivo
├── INSTALL.md                 # Guía de instalación detallada
├── CONTRIBUTING.md            # Guía de contribución
├── DOCUMENTACION_REQUISITOS.md
└── tareas.md                  # Plan de tareas Kanban
```

Cada app Django sigue la **arquitectura de capas**:

```
app/
├── models.py         # Acceso a datos (ORM)
├── serializers.py    # Transformación JSON ↔ Objetos
├── services.py       # Lógica de negocio
├── views.py          # Endpoints API (DRF)
├── urls.py           # Rutas
└── utils.py          # Funciones auxiliares
```

---

## Documentación

- 📖 [**DOCUMENTACION_REQUISITOS.md**](./DOCUMENTACION_REQUISITOS.md) — Especificación completa del producto
- 📋 [**tareas.md**](./tareas.md) — Plan de tareas Kanban (épicas y sprints)
- ⚙️ [**INSTALL.md**](./INSTALL.md) — Guía de instalación detallada
- 🤝 [**CONTRIBUTING.md**](./CONTRIBUTING.md) — Guía de contribución y estilo
- 🏛️ [**docs/ARCHITECTURE.md**](./docs/ARCHITECTURE.md) — Arquitectura técnica

---

## Despliegue con Docker (VPS)

Mallor se despliega en un VPS con **Docker** + **CloudPanel** (proxy/SSL). Todo vive en la imagen Docker: no se instala Python, Node ni MySQL en el host.

### 1. Preparar el VPS (una sola vez)

1. Instalar **Docker Engine** + **Docker Compose plugin** y **CloudPanel**.
2. Clonar el repo en `/opt/mallor`:

   ```bash
   git clone https://github.com/Ciare95/mallor.git /opt/mallor
   cd /opt/mallor
   ```

3. Crear el entorno de producción a partir de la plantilla y rellenar los valores reales:

   ```bash
   cp .env.production.example .env
   # edita .env con SECRET_KEY, MYSQL_PASSWORD, MYSQL_ROOT_PASSWORD, FACTUS_*, etc.
   ```

4. Construir y levantar el stack:

   ```bash
   docker compose build
   docker compose up -d
   ```

5. En **CloudPanel**: crear el sitio, reverse proxy a `http://127.0.0.1:8000`, activar SSL (Let's Encrypt) y, para servir los archivos subidos, añadir un `location /media/` que apunte a `/opt/mallor/media`.

### 2. CI/CD (deploy con `git push`)

El workflow `.github/workflows/deploy.yml` despliega a producción al hacer push a `main`. Configura estos **GitHub Secrets** en el repo (`Settings → Secrets and variables → Actions`):

| Secret     | Descripción                            |
|------------|----------------------------------------|
| `SSH_HOST` | IP o dominio del VPS                   |
| `SSH_USER` | Usuario SSH del servidor               |
| `SSH_KEY`  | Clave privada SSH del usuario deploy   |
| `SSH_PORT` | (Opcional) Puerto SSH, por defecto 22  |

Tras configurarlos, `git push origin main` ejecuta en el servidor: `git pull` → `docker compose build` → `docker compose up -d` → `migrate` → `restart`.

### Seguridad

- Los secretos viven solo en el `.env` del servidor y en GitHub Secrets; nunca se versionan.
- `.dockerignore` excluye `media/`, `*.sqlite3`, `.env*`, `api-factus-*.json`, etc., del contexto de build.
- `SECRET_KEY` es obligatoria por entorno en producción (`DEBUG=False`).


## Licencia

Proyecto privado — © Equipo Mallor. Todos los derechos reservados.

---

*Sistema de gestión empresarial con IA — desarrollado para PYMEs colombianas.*
