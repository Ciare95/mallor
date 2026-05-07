# Mallor - Plan de Tareas Kanban

## Tabla de Contenidos
- [ÉPICA 1: Configuración Inicial y Setup del Proyecto](#épica-1-configuración-inicial-y-setup-del-proyecto)
- [ÉPICA 2: Módulo de Usuarios (Sin JWT)](#épica-2-módulo-de-usuarios-sin-jwt)
- [ÉPICA 3: Módulo de Inventario](#épica-3-módulo-de-inventario)
- [ÉPICA 4: Módulo de Ventas y Abonos](#épica-4-módulo-de-ventas-y-abonos)
- [ÉPICA 5: Módulo de Clientes](#épica-5-módulo-de-clientes)
- [ÉPICA 6: Módulo de Proveedores](#épica-6-módulo-de-proveedores)
- [ÉPICA 7: Módulo de Fabricante (Plan Premium)](#épica-7-módulo-de-fabricante-plan-premium)
- [ÉPICA 8: Módulo de Informes y Estadísticas](#épica-8-módulo-de-informes-y-estadísticas)
- [ÉPICA 9: Integración Facturación Electrónica (Factus)](#épica-9-integración-facturación-electrónica-factus)
- [EPICA 9.5: Cierre Multitenant SaaS](#epica-95-cierre-multitenant-saas)
- [ÉPICA 10: Módulo de IA](#épica-10-módulo-de-ia)
- [ÉPICA 11: Testing y Calidad](#épica-11-testing-y-calidad)
- [ÉPICA 12: Autenticación JWT](#épica-12-autenticación-jwt)
- [ÉPICA 13: Deployment y Producción](#épica-13-deployment-y-producción)

---

## ÉPICA 1: Configuración Inicial y Setup del Proyecto

### 📋 Descripción de la Épica
Establecer la base técnica del proyecto, configurando el entorno de desarrollo completo para el backend (Django) y frontend (React), base de datos PostgreSQL, control de versiones con Git/GitHub y la estructura de carpetas según arquitectura de capas.

### 🎯 Objetivos
- Entorno de desarrollo completamente funcional
- Base de datos PostgreSQL configurada
- Repositorio Git inicializado
- Estructura de carpetas según arquitectura definida
- Documentación básica del proyecto

---

#### Tarea 1.1: Configuración del Backend - Django
**Prioridad:** Alta | **Estimación:** 3 Story Points | **Etiquetas:** Backend, DevOps

**Descripción:**
Configurar el proyecto Django con todas las dependencias necesarias, estructura de apps según arquitectura de capas y configuración de PostgreSQL.

**Dependencias técnicas:**
```bash
pip install django==4.2
pip install djangorestframework==3.14.0
pip install psycopg2-binary==2.9.9
pip install django-cors-headers==4.3.0
pip install python-decouple==3.8
```

**Pasos de implementación:**
1. Crear entorno virtual: `python -m venv venv`
2. Activar entorno virtual
3. Instalar Django y dependencias básicas
4. Crear proyecto: `django-admin startproject config .`
5. Configurar `settings.py`:
   - Agregar INSTALLED_APPS: `rest_framework`, `corsheaders`
   - Configurar MIDDLEWARE para CORS
   - Configurar DATABASES para PostgreSQL
   - Configurar variables de entorno con `python-decouple`
6. Crear archivo `.env` con variables de configuración
7. Crear archivo `requirements.txt`

**Criterios de aceptación:**
- [ ] Django instalado correctamente
- [ ] Servidor de desarrollo funcional (`python manage.py runserver`)
- [ ] Settings.py configurado con PostgreSQL
- [ ] CORS configurado correctamente
- [ ] Variables de entorno funcionando
- [ ] requirements.txt actualizado

---

#### Tarea 1.2: Creación de Apps Django según Módulos
**Prioridad:** Alta | **Estimación:** 2 Story Points | **Etiquetas:** Backend

**Descripción:**
Crear todas las aplicaciones Django correspondientes a los módulos del sistema siguiendo la estructura definida.

**Apps a crear:**
- inventario
- ventas
- cliente
- proveedor
- fabricante
- informes
- usuario
- IA

**Pasos de implementación:**
1. Crear cada app: `python manage.py startapp <nombre_app>`
2. Registrar cada app en `INSTALLED_APPS` del settings.py
3. Crear en cada app:
   - `models.py` (modelos)
   - `serializers.py` (transformación de datos)
   - `services.py` (lógica de negocio)
   - `views.py` (API endpoints)
   - `urls.py` (rutas)
   - `utils.py` (funciones auxiliares)
4. Configurar routing principal en `config/urls.py`

**Criterios de aceptación:**
- [ ] Todas las apps creadas
- [ ] Apps registradas en settings
- [ ] Estructura de archivos completa en cada app
- [ ] Routing básico configurado
- [ ] Servidor funciona sin errores

---

#### Tarea 1.3: Configuración de PostgreSQL
**Prioridad:** Alta | **Estimación:** 2 Story Points | **Etiquetas:** Backend, Database

**Descripción:**
Instalar y configurar PostgreSQL, crear la base de datos del proyecto y establecer la conexión con Django.

**Dependencias técnicas:**
- PostgreSQL 14 o superior
- psycopg2-binary

**Pasos de implementación:**
1. Instalar PostgreSQL en el sistema
2. Crear usuario para el proyecto
3. Crear base de datos `mallor_db`
4. Configurar `settings.py` con credenciales:
```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': config('DB_NAME'),
        'USER': config('DB_USER'),
        'PASSWORD': config('DB_PASSWORD'),
        'HOST': config('DB_HOST', default='localhost'),
        'PORT': config('DB_PORT', default='5432'),
    }
}
```
5. Agregar credenciales al archivo `.env`
6. Probar conexión: `python manage.py migrate`

**Criterios de aceptación:**
- [ ] PostgreSQL instalado y corriendo
- [ ] Base de datos creada
- [ ] Usuario con permisos correctos
- [ ] Django conecta exitosamente
- [ ] Migraciones iniciales aplicadas
- [ ] Credenciales en .env funcionando

---

#### Tarea 1.4: Configuración del Frontend - React
**Prioridad:** Alta | **Estimación:** 3 Story Points | **Etiquetas:** Frontend, DevOps

**Descripción:**
Configurar el proyecto React con Vite, estructura de carpetas, dependencias necesarias y configuración inicial.

**Dependencias técnicas:**
```bash
npm create vite@latest frontend -- --template react
cd frontend
npm install react-router-dom@6
npm install axios
npm install @tanstack/react-query
npm install zustand
npm install tailwindcss postcss autoprefixer
npm install lucide-react
```

**Pasos de implementación:**
1. Crear proyecto React con Vite
2. Instalar dependencias base
3. Configurar Tailwind CSS
4. Crear estructura de carpetas:
   - `/src/components` (componentes reutilizables)
   - `/src/pages` (páginas/vistas)
   - `/src/services` (llamadas API)
   - `/src/hooks` (custom hooks)
   - `/src/store` (gestión de estado)
   - `/src/utils` (utilidades)
   - `/src/assets` (imágenes, iconos)
5. Configurar axios con baseURL
6. Configurar React Router
7. Crear componente Layout base

**Criterios de aceptación:**
- [ ] Proyecto React creado y funcional
- [ ] Todas las dependencias instaladas
- [ ] Tailwind CSS configurado
- [ ] Estructura de carpetas creada
- [ ] Axios configurado con baseURL
- [ ] Router configurado
- [ ] Servidor de desarrollo funcional (`npm run dev`)

---

#### Tarea 1.5: Configuración de Git y GitHub
**Prioridad:** Alta | **Estimación:** 1 Story Point | **Etiquetas:** DevOps

**Descripción:**
Inicializar repositorio Git, crear repositorio en GitHub, configurar .gitignore y realizar el primer commit.

**Pasos de implementación:**
1. Inicializar Git: `git init`
2. Crear archivo `.gitignore`:
```
# Python
*.pyc
__pycache__/
venv/
.env
db.sqlite3

# React
node_modules/
dist/
build/
.env.local

# IDE
.vscode/
.idea/
*.swp
```
3. Crear repositorio en GitHub
4. Agregar remote: `git remote add origin <url>`
5. Crear rama principal: `git checkout -b main`
6. Primer commit: `git add .` y `git commit -m "Initial setup"`
7. Push: `git push -u origin main`
8. Crear rama de desarrollo: `git checkout -b develop`

**Criterios de aceptación:**
- [ ] Repositorio Git inicializado
- [ ] .gitignore configurado correctamente
- [ ] Repositorio GitHub creado
- [ ] Primer commit realizado
- [ ] Código subido a GitHub
- [ ] Rama develop creada

---

#### Tarea 1.6: Documentación Inicial del Proyecto
**Prioridad:** Media | **Estimación:** 2 Story Points | **Etiquetas:** Documentación

**Descripción:**
Crear documentación básica del proyecto incluyendo README.md, guía de instalación y estructura del proyecto.

**Archivos a crear:**
- `README.md` (descripción del proyecto)
- `INSTALL.md` (guía de instalación)
- `CONTRIBUTING.md` (guía de contribución)
- `docs/ARCHITECTURE.md` (arquitectura del proyecto)

**Contenido del README.md:**
1. Descripción del proyecto
2. Tecnologías utilizadas
3. Requisitos previos
4. Instrucciones de instalación rápida
5. Comandos útiles
6. Estructura del proyecto
7. Enlace a documentación completa

**Criterios de aceptación:**
- [ ] README.md creado con información completa
- [ ] INSTALL.md con pasos detallados
- [ ] CONTRIBUTING.md con guías de estilo
- [ ] Documentación de arquitectura
- [ ] Enlaces funcionando correctamente

---

## ÉPICA 2: Módulo de Usuarios (Sin JWT)

### 📋 Descripción de la Épica
Implementar el sistema de gestión de usuarios con roles (Administrador/Empleado), CRUD completo y control de permisos básico, sin implementar autenticación JWT para facilitar el testing inicial.

### 🎯 Objetivos
- CRUD completo de usuarios
- Sistema de roles y permisos
- Gestión de tokens (para uso posterior con JWT)
- Validaciones de datos

---

#### Tarea 2.1: Modelo de Usuario
**Prioridad:** Alta | **Estimación:** 3 Story Points | **Etiquetas:** Backend, Models

**Descripción:**
Crear el modelo de Usuario extendiendo AbstractUser de Django con campos personalizados, roles y relaciones necesarias.

**Dependencias técnicas:**
```python
from django.contrib.auth.models import AbstractUser
from django.db import models
```

**Campos del modelo:**
- email (EmailField, unique)
- username (CharField, unique)
- first_name (CharField)
- last_name (CharField)
- role (CharField, choices=['ADMIN', 'EMPLEADO'])
- is_active (BooleanField)
- phone (CharField, opcional)
- created_at (DateTimeField, auto_now_add)
- updated_at (DateTimeField, auto_now)

**Pasos de implementación:**
1. Crear modelo Usuario en `usuario/models.py`
2. Extender AbstractUser
3. Definir campos personalizados
4. Definir choices para roles
5. Agregar método `__str__`
6. Agregar Meta class
7. Configurar AUTH_USER_MODEL en settings.py
8. Crear y aplicar migraciones

**Criterios de aceptación:**
- [ ] Modelo Usuario creado correctamente
- [ ] Campos obligatorios definidos
- [ ] Roles configurados
- [ ] AUTH_USER_MODEL configurado
- [ ] Migraciones aplicadas sin errores
- [ ] Modelo accesible desde Django admin

---

#### Tarea 2.2: Serializers de Usuario
**Prioridad:** Alta | **Estimación:** 2 Story Points | **Etiquetas:** Backend, Serializers

**Descripción:**
Crear serializers para transformación de datos del modelo Usuario, incluyendo validaciones personalizadas.

**Dependencias técnicas:**
```python
from rest_framework import serializers
from django.contrib.auth.hashers import make_password
```

**Serializers a crear:**
1. **UsuarioSerializer** (completo, para lectura)
2. **UsuarioCreateSerializer** (para creación, con validación de password)
3. **UsuarioUpdateSerializer** (para actualización)
4. **UsuarioListSerializer** (simplificado, para listados)

**Validaciones:**
- Email único
- Username único
- Password mínimo 8 caracteres
- Teléfono formato válido (opcional)
- Role válido

**Criterios de aceptación:**
- [ ] Todos los serializers creados
- [ ] Validaciones implementadas
- [ ] Password hasheado correctamente
- [ ] Serializers probados en shell Django
- [ ] Campos sensibles excluidos en respuestas

---

#### Tarea 2.3: Services de Usuario (Lógica de Negocio)
**Prioridad:** Alta | **Estimación:** 3 Story Points | **Etiquetas:** Backend, Business Logic

**Descripción:**
Implementar la capa de servicios con toda la lógica de negocio para gestión de usuarios.

**Archivo:** `usuario/services.py`

**Métodos a implementar:**
1. `crear_usuario(data)` - Crear nuevo usuario
2. `obtener_usuario(user_id)` - Obtener usuario por ID
3. `listar_usuarios(filtros)` - Listar con filtros opcionales
4. `actualizar_usuario(user_id, data)` - Actualizar usuario
5. `eliminar_usuario(user_id)` - Soft delete
6. `cambiar_password(user_id, old_password, new_password)`
7. `validar_permisos(user, action)` - Validar permisos por rol

**Lógica de negocio:**
- Solo administradores pueden crear otros administradores
- No se puede eliminar el último administrador
- Validar que email y username sean únicos
- Password debe cumplir requisitos de seguridad

**Criterios de aceptación:**
- [ ] Todos los métodos implementados
- [ ] Lógica de negocio aplicada correctamente
- [ ] Manejo de excepciones adecuado
- [ ] Validaciones de permisos funcionando
- [ ] Código documentado

---

#### Tarea 2.4: Views y Endpoints de Usuario
**Prioridad:** Alta | **Estimación:** 3 Story Points | **Etiquetas:** Backend, API

**Descripción:**
Crear las vistas y endpoints REST para el módulo de usuarios usando ViewSets de DRF.

**Endpoints a implementar:**
- `GET /api/usuarios/` - Listar usuarios
- `POST /api/usuarios/` - Crear usuario
- `GET /api/usuarios/{id}/` - Obtener usuario
- `PUT /api/usuarios/{id}/` - Actualizar usuario completo
- `PATCH /api/usuarios/{id}/` - Actualizar parcial
- `DELETE /api/usuarios/{id}/` - Eliminar usuario
- `POST /api/usuarios/{id}/cambiar-password/` - Cambiar contraseña
- `GET /api/usuarios/me/` - Obtener usuario actual

**Pasos de implementación:**
1. Crear ViewSet en `usuario/views.py`
2. Implementar métodos del ViewSet
3. Configurar rutas en `usuario/urls.py`
4. Incluir rutas en `config/urls.py`
5. Agregar filtros y búsqueda
6. Implementar paginación

**Criterios de aceptación:**
- [ ] Todos los endpoints creados
- [ ] CRUD completo funcional
- [ ] Respuestas en formato JSON correcto
- [ ] Códigos HTTP apropiados
- [ ] Paginación implementada
- [ ] Filtros funcionando

---

#### Tarea 2.5: Gestión de Roles y Permisos
**Prioridad:** Media | **Estimación:** 2 Story Points | **Etiquetas:** Backend, Security

**Descripción:**
Implementar sistema de permisos basado en roles para controlar acceso a funcionalidades según tipo de usuario.

**Permisos por Rol:**

**Administrador:**
- Acceso completo al sistema
- Gestión de usuarios
- Gestión de inventario completa
- Visualización de informes y estadísticas
- Configuración del sistema

**Empleado:**
- Creación de ventas
- Registro de facturas
- Ingreso de productos
- Consulta de información básica
- Sin acceso a informes financieros

**Pasos de implementación:**
1. Crear decorador `@role_required(['ADMIN'])` en `utils.py`
2. Crear mixin `RolePermissionMixin`
3. Implementar validación de permisos en services
4. Aplicar decoradores/mixins en views
5. Crear sistema de mensajes de error para permisos

**Criterios de aceptación:**
- [ ] Decorador de permisos creado
- [ ] Permisos aplicados en endpoints críticos
- [ ] Validaciones en capa de servicios
- [ ] Mensajes de error claros
- [ ] Documentación de permisos

---

#### Tarea 2.6: Frontend - Interfaz de Gestión de Usuarios
**Prioridad:** Media | **Estimación:** 5 Story Points | **Etiquetas:** Frontend, React

**Descripción:**
Crear las interfaces de usuario para gestión de usuarios (listado, creación, edición, eliminación).

**Componentes a crear:**
1. **UsuariosPage** - Página principal
2. **UsuariosList** - Lista de usuarios con tabla
3. **UsuarioForm** - Formulario crear/editar
4. **UsuarioDetail** - Vista detalle de usuario
5. **ConfirmDelete** - Modal de confirmación

**Funcionalidades:**
- Listado con búsqueda y filtros
- Paginación
- Crear nuevo usuario
- Editar usuario existente
- Eliminar usuario (con confirmación)
- Cambiar contraseña
- Validaciones en tiempo real

**Pasos de implementación:**
1. Crear servicio API en `services/usuarios.service.js`
2. Crear componentes en `components/usuarios/`
3. Crear páginas en `pages/usuarios/`
4. Implementar formularios con validación
5. Agregar rutas en router
6. Implementar gestión de estado (Zustand)
7. Agregar feedback visual (toasts)

**Criterios de aceptación:**
- [ ] Todos los componentes creados
- [ ] CRUD completo desde UI
- [ ] Validaciones funcionando
- [ ] Feedback visual implementado
- [ ] Responsive design
- [ ] Manejo de errores adecuado

---

## ÉPICA 3: Módulo de Inventario

### 📋 Descripción de la Épica
Implementar el sistema completo de gestión de inventario con productos, categorías, control de stock, ingreso mediante facturas y generación de reportes en Excel.

### 🎯 Objetivos
- CRUD completo de productos y categorías
- Sistema de control de stock
- Ingreso de productos mediante facturas
- Cálculo automático de precios (con IVA y transporte)
- Exportación a Excel
- Historial de movimientos

---

#### Tarea 3.1: Modelo de Categorías
**Prioridad:** Alta | **Estimación:** 1 Story Point | **Etiquetas:** Backend, Models

**Descripción:**
Crear el modelo de Categorías para clasificar productos.

**Campos del modelo:**
- id (AutoField, PK)
- nombre (CharField, max_length=100, unique)
- descripcion (TextField, blank=True)
- created_at (DateTimeField, auto_now_add)
- updated_at (DateTimeField, auto_now)

**Pasos de implementación:**
1. Crear modelo en `inventario/models.py`
2. Definir campos
3. Agregar método `__str__`
4. Crear migraciones
5. Aplicar migraciones
6. Registrar en admin

**Criterios de aceptación:**
- [ ] Modelo Categoria creado
- [ ] Migraciones aplicadas
- [ ] Modelo visible en admin
- [ ] Método __str__ funcional

---

#### Tarea 3.2: Modelo de Productos
**Prioridad:** Alta | **Estimación:** 4 Story Points | **Etiquetas:** Backend, Models

**Descripción:**
Crear el modelo completo de Productos con todos los campos requeridos según especificación, incluyendo soporte para importación/exportación del sistema antiguo.

**Campos del modelo:**
- id (AutoField, PK) - N°
- codigo_interno (CharField, unique) - ID INTERNO
- codigo_barras (CharField, blank=True) - CÓDIGO DE BARRAS
- nombre (CharField) - NOMBRE
- categoria (ForeignKey a Categoria, null=True) - CATEGORÍA
- marca (CharField, blank=True) - MARCA
- descripcion (TextField, blank=True) - DESCRIPCIÓN
- existencias (DecimalField, default=0) - EXISTENCIAS
- invima (CharField, blank=True) - INVIMA
- precio_compra (DecimalField) - PRECIO COMPRA
- precio_venta (DecimalField) - PRECIO VENTA
- iva (DecimalField, default=0) - IVA
- imagen (ImageField, blank=True, null=True)
- fecha_ingreso (DateTimeField, auto_now_add) - FECHA INGRESO
- fecha_caducidad (DateField, blank=True, null=True) - FECHA CADUCIDAD
- created_at (DateTimeField, auto_now_add)
- updated_at (DateTimeField, auto_now)

**Métodos del modelo:**
- `calcular_valor_inventario()` - Valor total (precio_compra * existencias)
- `calcular_valor_venta()` - Valor total de venta
- `actualizar_stock(cantidad)` - Actualizar existencias
- `validar_stock(cantidad)` - Verificar disponibilidad

**Pasos de implementación:**
1. Crear modelo Producto en `inventario/models.py`
2. Definir todos los campos según especificación
3. Configurar relación con Categoria
4. Implementar métodos de cálculo
5. Agregar validaciones
6. Configurar upload de imágenes
7. Crear y aplicar migraciones

**Criterios de aceptación:**
- [ ] Modelo Producto creado con todos los campos
- [ ] Relación con Categoria funcionando
- [ ] Métodos de cálculo implementados
- [ ] Validaciones funcionando
- [ ] Migraciones aplicadas
- [ ] Soporte para imágenes configurado
- [ ] Compatible con importación de sistema antiguo

---

#### Tarea 3.3: Modelo de Facturas de Compra
**Prioridad:** Alta | **Estimación:** 3 Story Points | **Etiquetas:** Backend, Models

**Descripción:**
Crear el modelo de Facturas de Compra para registrar las compras realizadas a proveedores.

**Campos del modelo:**
- id (AutoField, PK)
- numero_factura (CharField, unique)
- proveedor (ForeignKey a Proveedor, null=True)
- fecha_factura (DateField)
- fecha_registro (DateTimeField, auto_now_add)
- subtotal (DecimalField)
- iva (DecimalField)
- descuento (DecimalField, default=0)
- total (DecimalField)
- observaciones (TextField, blank=True)
- usuario_registro (ForeignKey a Usuario)
- estado (CharField, choices=['PENDIENTE', 'PROCESADA'])

**Métodos:**
- `calcular_totales()` - Calcular subtotal, IVA y total
- `marcar_como_procesada()` - Cambiar estado

**Criterios de aceptación:**
- [ ] Modelo FacturaCompra creado
- [ ] Relaciones configuradas
- [ ] Métodos de cálculo implementados
- [ ] Migraciones aplicadas

---

#### Tarea 3.4: Modelo de Historial de Inventario
**Prioridad:** Media | **Estimación:** 2 Story Points | **Etiquetas:** Backend, Models

**Descripción:**
Crear modelo para registrar todos los movimientos de inventario (entradas, salidas, ajustes).

**Campos del modelo:**
- id (AutoField, PK)
- producto (ForeignKey a Producto)
- tipo_movimiento (CharField, choices=['ENTRADA', 'SALIDA', 'AJUSTE'])
- cantidad (DecimalField)
- precio_unitario (DecimalField)
- factura (ForeignKey a FacturaCompra, null=True)
- venta (ForeignKey a Venta, null=True)
- motivo (CharField)
- usuario (ForeignKey a Usuario)
- fecha (DateTimeField, auto_now_add)
- observaciones (TextField, blank=True)

**Criterios de aceptación:**
- [ ] Modelo HistorialInventario creado
- [ ] Relaciones configuradas
- [ ] Choices definidos
- [ ] Migraciones aplicadas

---

#### Tarea 3.5: Serializers de Inventario
**Prioridad:** Alta | **Estimación:** 3 Story Points | **Etiquetas:** Backend, Serializers

**Descripción:**
Crear todos los serializers necesarios para el módulo de inventario.

**Serializers a crear:**
1. **CategoriaSerializer** - CRUD de categorías
2. **ProductoSerializer** - Completo con relaciones
3. **ProductoListSerializer** - Simplificado para listados
4. **ProductoCreateSerializer** - Para creación
5. **ProductoUpdateSerializer** - Para actualización
6. **FacturaCompraSerializer** - CRUD de facturas
7. **HistorialInventarioSerializer** - Lectura de historial
8. **InventarioExportSerializer** - Para exportación Excel

**Validaciones:**
- Código interno único
- Código de barras único si se proporciona
- Precio compra > 0
- Precio venta > precio compra (warning)
- Existencias >= 0
- IVA entre 0 y 100

**Criterios de aceptación:**
- [ ] Todos los serializers creados
- [ ] Validaciones implementadas
- [ ] Relaciones anidadas funcionando
- [ ] Campos calculados incluidos
- [ ] Probados en Django shell

---

#### Tarea 3.6: Services de Inventario (Lógica de Negocio)
**Prioridad:** Alta | **Estimación:** 5 Story Points | **Etiquetas:** Backend, Business Logic

**Descripción:**
Implementar toda la lógica de negocio del módulo de inventario.

**Archivo:** `inventario/services.py`

**Servicios a implementar:**

**Productos:**
1. `crear_producto(data)` - Crear producto con validaciones
2. `obtener_producto(producto_id)` - Obtener con relaciones
3. `listar_productos(filtros)` - Listar con filtros múltiples
4. `actualizar_producto(producto_id, data)` - Actualizar
5. `eliminar_producto(producto_id)` - Soft delete si no tiene movimientos
6. `buscar_producto(query)` - Búsqueda avanzada

**Stock:**
7. `actualizar_stock(producto_id, cantidad, tipo, motivo, usuario)` - Actualizar stock
8. `validar_disponibilidad(producto_id, cantidad)` - Verificar disponibilidad
9. `ajustar_inventario(producto_id, nueva_cantidad, motivo, usuario)` - Ajuste manual

**Facturas:**
10. `registrar_factura_compra(data)` - Registrar factura
11. `procesar_factura(factura_id, items)` - Procesar factura y actualizar inventario
12. `obtener_factura(factura_id)` - Obtener factura con detalles

**Reportes:**
13. `calcular_valor_total_inventario()` - Valor total del inventario
14. `productos_bajo_stock(minimo)` - Productos con stock bajo
15. `productos_mas_vendidos(fecha_inicio, fecha_fin)` - Top productos

**Historial:**
16. `obtener_historial_producto(producto_id)` - Movimientos de un producto
17. `obtener_historial_general(filtros)` - Historial completo con filtros

**Lógica de negocio crítica:**
- Actualizar stock automáticamente al procesar factura
- Registrar todos los movimientos en historial
- Validar stock antes de ventas
- Calcular precio final con IVA y transporte
- No permitir eliminar productos con movimientos

**Criterios de aceptación:**
- [ ] Todos los métodos implementados
- [ ] Lógica de negocio aplicada
- [ ] Transacciones atómicas en operaciones críticas
- [ ] Manejo de excepciones robusto
- [ ] Historial registrado correctamente
- [ ] Código bien documentado

---

#### Tarea 3.7: Views y Endpoints de Inventario
**Prioridad:** Alta | **Estimación:** 4 Story Points | **Etiquetas:** Backend, API

**Descripción:**
Crear todos los endpoints REST para el módulo de inventario.

**Endpoints - Categorías:**
- `GET /api/inventario/categorias/` - Listar
- `POST /api/inventario/categorias/` - Crear
- `GET /api/inventario/categorias/{id}/` - Detalle
- `PUT/PATCH /api/inventario/categorias/{id}/` - Actualizar
- `DELETE /api/inventario/categorias/{id}/` - Eliminar

**Endpoints - Productos:**
- `GET /api/inventario/productos/` - Listar con filtros
- `POST /api/inventario/productos/` - Crear
- `GET /api/inventario/productos/{id}/` - Detalle
- `PUT/PATCH /api/inventario/productos/{id}/` - Actualizar
- `DELETE /api/inventario/productos/{id}/` - Eliminar
- `GET /api/inventario/productos/buscar/?q=` - Búsqueda
- `GET /api/inventario/productos/{id}/historial/` - Historial de producto
- `POST /api/inventario/productos/{id}/ajustar-stock/` - Ajuste manual

**Endpoints - Facturas:**
- `GET /api/inventario/facturas/` - Listar facturas
- `POST /api/inventario/facturas/` - Registrar factura
- `GET /api/inventario/facturas/{id}/` - Detalle
- `POST /api/inventario/facturas/{id}/procesar/` - Procesar factura

**Endpoints - Reportes:**
- `GET /api/inventario/reportes/valor-total/` - Valor total
- `GET /api/inventario/reportes/bajo-stock/` - Productos bajo stock
- `GET /api/inventario/reportes/mas-vendidos/` - Top productos
- `GET /api/inventario/exportar/excel/` - Exportar a Excel

**Criterios de aceptación:**
- [ ] Todos los endpoints creados
- [ ] Filtros y búsqueda funcionando
- [ ] Paginación implementada
- [ ] Permisos aplicados correctamente
- [ ] Respuestas HTTP apropiadas
- [ ] Documentación de API

---

#### Tarea 3.8: Exportación a Excel
**Prioridad:** Media | **Estimación:** 2 Story Points | **Etiquetas:** Backend, Reports

**Descripción:**
Implementar funcionalidad de exportación del inventario a formato Excel.

**Dependencias técnicas:**
```bash
pip install openpyxl==3.1.2
```

**Funcionalidades:**
- Exportar inventario completo


**Columnas del Excel:**
- N°
- Código Interno
- Código de Barras
- Nombre
- Categoría
- Marca
- Descripción
- Existencias
- Invima
- Precio Compra
- Precio Venta
- IVA
- Fecha Ingreso
- Fecha Caducidad

**Pasos de implementación:**
1. Instalar openpyxl
2. Crear utilidad `generar_excel_inventario()` en `utils.py`
3. Configurar estilos de Excel
4. Crear endpoint de exportación
5. Implementar descarga de archivo

**Criterios de aceptación:**
- [ ] Excel se genera correctamente
- [ ] Descarga funciona en navegador

---

#### Tarea 3.9: Frontend - Gestión de Productos
**Prioridad:** Alta | **Estimación:** 8 Story Points | **Etiquetas:** Frontend, React

**Descripción:**
Crear todas las interfaces para gestión completa de productos e inventario.

**Páginas y componentes a crear:**

1. **ProductosPage** - Página principal de inventario
2. **ProductosList** - Tabla de productos con filtros
3. **ProductoForm** - Formulario crear/editar producto
4. **ProductoDetail** - Vista detallada de producto
5. **ProductoHistorial** - Historial de movimientos
6. **CategoriaManager** - Gestión de categorías
7. **FacturaCompraForm** - Registro de facturas
8. **ProcesarFacturaForm** - Procesar factura y agregar productos
9. **AjusteStockModal** - Modal para ajustes manuales
10. **ExportarInventario** - Botón y funcionalidad de exportación

**Funcionalidades principales:**

**Lista de Productos:**
- Tabla con todas las columnas
- Búsqueda por nombre, código, código de barras
- Filtros por categoría, marca, stock bajo
- Ordenamiento por columnas
- Paginación
- Acciones rápidas (editar, ver, eliminar)
- Vista de tarjetas alternativa

**Formulario de Producto:**
- Todos los campos del modelo
- Upload de imagen con preview
- Validaciones en tiempo real
- Cálculo automático de margen
- Sugerencia de precio de venta
- Scan de código de barras (opcional)

**Procesar Factura:**
- Buscar número de factura
- Agregar productos a lista
- Calcular precio final (compra + IVA + transporte)
- Sugerir precio de venta
- Preview antes de confirmar
- Crear nuevos productos desde el modal

**Reportes:**
- Valor total del inventario
- Productos bajo stock (alertas)
- Productos más vendidos
- Botón de exportar a Excel

**Pasos de implementación:**
1. Crear servicios API en `services/inventario.service.js`
2. Crear store de inventario (Zustand)
3. Crear todos los componentes
4. Implementar formularios con validación
5. Agregar upload de imágenes
6. Implementar búsqueda y filtros
7. Agregar exportación Excel
8. Implementar responsive design
9. Agregar animaciones y transiciones
10. Testing de componentes

**Criterios de aceptación:**
- [ ] Todas las páginas creadas
- [ ] CRUD completo funcional
- [ ] Filtros y búsqueda funcionando
- [ ] Upload de imágenes operativo
- [ ] Formulario de procesar factura funcional
- [ ] Exportación a Excel funciona
- [ ] Responsive en móvil y tablet
- [ ] Validaciones en tiempo real
- [ ] Feedback visual apropiado
- [ ] Performance optimizado

---

## ÉPICA 4: Módulo de Ventas y Abonos

### 📋 Descripción de la Épica
Implementar el sistema completo de gestión de ventas incluyendo CRUD de ventas, detalle de ventas, gestión de abonos (pagos parciales), estados de venta, historial y reportes.

### 🎯 Objetivos
- CRUD completo de ventas
- Sistema de detalles de venta
- Gestión completa de abonos
- Control de estados (Terminada/Pendiente)
- Cálculo automático de totales y saldos
- Historial de ventas y pagos
- Reportes con filtros

---

#### Tarea 4.1: Modelo de Ventas
**Prioridad:** Alta | **Estimación:** 4 Story Points | **Etiquetas:** Backend, Models

**Descripción:**
Crear el modelo de Ventas con todos los campos necesarios y relaciones.

**Campos del modelo:**
- id (AutoField, PK)
- numero_venta (CharField, unique, auto-generado)
- cliente (ForeignKey a Cliente, null=True) - default "Consumidor Final"
- fecha_venta (DateTimeField, auto_now_add)
- subtotal (DecimalField)
- descuento (DecimalField, default=0)
- impuestos (DecimalField)
- total (DecimalField)
- estado (CharField, choices=['PENDIENTE', 'TERMINADA', 'CANCELADA'])
- estado_pago (CharField, choices=['PENDIENTE', 'PARCIAL', 'PAGADA'])
- total_abonado (DecimalField, default=0)
- saldo_pendiente (DecimalField)
- metodo_pago (CharField, choices=['EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'CREDITO'])
- factura_electronica (BooleanField, default=False)
- numero_factura_electronica (CharField, blank=True)
- fecha_facturacion (DateTimeField, null=True)
- observaciones (TextField, blank=True)
- usuario_registro (ForeignKey a Usuario)
- created_at (DateTimeField, auto_now_add)
- updated_at (DateTimeField, auto_now)

**Métodos del modelo:**
- `generar_numero_venta()` - Genera número consecutivo
- `calcular_totales()` - Calcula subtotal, impuestos y total
- `actualizar_estado_pago()` - Actualiza estado según abonos
- `calcular_saldo_pendiente()` - Calcula saldo restante
- `puede_facturar()` - Valida si puede emitir factura

**Criterios de aceptación:**
- [ ] Modelo Venta creado con todos los campos
- [ ] Relaciones configuradas correctamente
- [ ] Métodos de cálculo implementados
- [ ] Choices definidos
- [ ] Migraciones aplicadas
- [ ] Signals configurados (si aplican)

---

#### Tarea 4.2: Modelo de Detalle de Venta
**Prioridad:** Alta | **Estimación:** 2 Story Points | **Etiquetas:** Backend, Models

**Descripción:**
Crear el modelo para almacenar los productos vendidos en cada venta.

**Campos del modelo:**
- id (AutoField, PK)
- venta (ForeignKey a Venta, related_name='detalles')
- producto (ForeignKey a Producto)
- cantidad (DecimalField)
- precio_unitario (DecimalField) - precio al momento de la venta
- subtotal (DecimalField)
- descuento (DecimalField, default=0)
- iva (DecimalField)
- total (DecimalField)

**Métodos del modelo:**
- `calcular_subtotal()` - Calcula cantidad * precio_unitario
- `calcular_total()` - Calcula total con IVA y descuento

**Signals:**
- `post_save` - Actualizar stock del producto
- `post_save` - Recalcular totales de la venta
- `post_delete` - Restaurar stock al eliminar

**Criterios de aceptación:**
- [ ] Modelo DetalleVenta creado
- [ ] Relaciones configuradas
- [ ] Métodos de cálculo implementados
- [ ] Signals funcionando correctamente
- [ ] Migraciones aplicadas

---

#### Tarea 4.3: Modelo de Abonos
**Prioridad:** Alta | **Estimación:** 3 Story Points | **Etiquetas:** Backend, Models

**Descripción:**
Crear el modelo de Abonos para registrar pagos parciales a ventas.

**Campos del modelo:**
- id (AutoField, PK)
- venta (ForeignKey a Venta, related_name='abonos')
- monto_abonado (DecimalField)
- fecha_abono (DateTimeField, auto_now_add)
- metodo_pago (CharField, choices=['EFECTIVO', 'TARJETA', 'TRANSFERENCIA'])
- referencia_pago (CharField, blank=True) - número de transacción
- observaciones (TextField, blank=True)
- usuario_registro (ForeignKey a Usuario)
- created_at (DateTimeField, auto_now_add)

**Métodos del modelo:**
- `validar_monto()` - Validar que no exceda saldo pendiente

**Signals:**
- `post_save` - Actualizar total_abonado y estado_pago de la venta
- `post_save` - Recalcular saldo_pendiente

**Validaciones:**
- Monto debe ser > 0
- Monto no puede exceder saldo pendiente
- Solo se puede abonar a ventas TERMINADAS
- No se puede abonar a ventas CANCELADAS

**Criterios de aceptación:**
- [ ] Modelo Abono creado
- [ ] Relaciones configuradas
- [ ] Validaciones implementadas
- [ ] Signals funcionando
- [ ] Migraciones aplicadas

---

#### Tarea 4.4: Serializers de Ventas y Abonos
**Prioridad:** Alta | **Estimación:** 4 Story Points | **Etiquetas:** Backend, Serializers

**Descripción:**
Crear todos los serializers necesarios para ventas, detalles y abonos.

**Serializers a crear:**

**Ventas:**
1. **DetalleVentaSerializer** - Detalle completo con info de producto
2. **VentaSerializer** - Venta completa con detalles anidados
3. **VentaListSerializer** - Simplificado para listados
4. **VentaCreateSerializer** - Para creación con validaciones
5. **VentaUpdateSerializer** - Para actualización

**Abonos:**
6. **AbonoSerializer** - Completo con info de venta
7. **AbonoCreateSerializer** - Para registrar abonos
8. **AbonoListSerializer** - Para listados

**Validaciones:**

**Ventas:**
- Debe tener al menos un producto
- Cliente por defecto "Consumidor Final"
- Validar stock disponible
- Calcular totales automáticamente

**Abonos:**
- Monto > 0
- Monto <= saldo_pendiente
- Venta debe estar TERMINADA
- Método de pago válido

**Criterios de aceptación:**
- [ ] Todos los serializers creados
- [ ] Validaciones implementadas
- [ ] Serialización anidada funcionando
- [ ] Campos calculados incluidos
- [ ] Probados en Django shell

---

#### Tarea 4.5: Services de Ventas (Lógica de Negocio)
**Prioridad:** Alta | **Estimación:** 6 Story Points | **Etiquetas:** Backend, Business Logic

**Descripción:**
Implementar toda la lógica de negocio del módulo de ventas y abonos.

**Archivo:** `ventas/services.py`

**Servicios de Ventas:**

1. `crear_venta(data)` - Crear venta con detalles
   - Validar stock de productos
   - Calcular totales
   - Actualizar inventario
   - Generar número de venta
   - Registrar en historial

2. `obtener_venta(venta_id)` - Obtener con detalles y abonos

3. `listar_ventas(filtros)` - Listar con múltiples filtros
   - Por fecha
   - Por cliente
   - Por estado
   - Por estado de pago
   - Por usuario

4. `actualizar_venta(venta_id, data)` - Actualizar
   - Validar si puede actualizar
   - Recalcular totales
   - Actualizar inventario

5. `cancelar_venta(venta_id, motivo)` - Cancelar venta
   - Validar si puede cancelar
   - Restaurar stock
   - Cambiar estado
   - Registrar en historial

6. `cambiar_estado(venta_id, nuevo_estado)` - Cambiar estado

**Servicios de Abonos:**

7. `registrar_abono(venta_id, data)` - Registrar pago parcial
   - Validar venta y monto
   - Registrar abono
   - Actualizar totales de venta
   - Actualizar estado de pago
   - Registrar en historial

8. `obtener_abonos_venta(venta_id)` - Historial de abonos

9. `obtener_cuentas_por_cobrar(filtros)` - Ventas con saldo pendiente

10. `calcular_total_por_cobrar()` - Total de cuentas por cobrar

**Servicios de Reportes:**

11. `ventas_por_periodo(fecha_inicio, fecha_fin)` - Ventas en rango
12. `ventas_por_producto(producto_id, fecha_inicio, fecha_fin)` - Historial de producto
13. `ventas_por_cliente(cliente_id)` - Historial de cliente
14. `calcular_estadisticas_ventas(periodo)` - Estadísticas generales

**Lógica de negocio crítica:**
- Usar transacciones atómicas en creación/cancelación
- Validar stock antes de crear venta
- Actualizar inventario automáticamente
- Calcular estado de pago basado en abonos
- No permitir modificar ventas facturadas
- No permitir abonar más del saldo pendiente
- Registrar todos los movimientos en historial

**Criterios de aceptación:**
- [ ] Todos los métodos implementados
- [ ] Lógica de negocio aplicada correctamente
- [ ] Transacciones atómicas en operaciones críticas
- [ ] Validaciones robustas
- [ ] Manejo de excepciones adecuado
- [ ] Historial registrado correctamente
- [ ] Código bien documentado

---

#### Tarea 4.6: Views y Endpoints de Ventas
**Prioridad:** Alta | **Estimación:** 5 Story Points | **Etiquetas:** Backend, API

**Descripción:**
Crear todos los endpoints REST para ventas y abonos.

**Endpoints - Ventas:**
- `GET /api/ventas/` - Listar con filtros
- `POST /api/ventas/` - Crear venta
- `GET /api/ventas/{id}/` - Detalle de venta
- `PUT/PATCH /api/ventas/{id}/` - Actualizar venta
- `DELETE /api/ventas/{id}/` - Eliminar venta
- `POST /api/ventas/{id}/cancelar/` - Cancelar venta
- `POST /api/ventas/{id}/cambiar-estado/` - Cambiar estado
- `GET /api/ventas/{id}/historial/` - Historial de la venta
- `GET /api/ventas/buscar/?q=` - Búsqueda

**Endpoints - Abonos:**
- `GET /api/ventas/{id}/abonos/` - Listar abonos de venta
- `POST /api/ventas/{id}/abonos/` - Registrar abono
- `GET /api/abonos/` - Listar todos los abonos
- `GET /api/abonos/{id}/` - Detalle de abono

**Endpoints - Reportes:**
- `GET /api/ventas/reportes/periodo/` - Ventas por período
- `GET /api/ventas/reportes/cliente/{id}/` - Ventas por cliente
- `GET /api/ventas/reportes/producto/{id}/` - Ventas por producto
- `GET /api/ventas/reportes/cuentas-por-cobrar/` - Ventas con saldo
- `GET /api/ventas/reportes/estadisticas/` - Estadísticas generales

**Parámetros de filtrado:**
- fecha_inicio, fecha_fin
- cliente_id
- estado
- estado_pago
- usuario_id
- metodo_pago

**Criterios de aceptación:**
- [ ] Todos los endpoints creados
- [ ] CRUD completo funcional
- [ ] Endpoints de abonos funcionando
- [ ] Filtros implementados
- [ ] Paginación funcionando
- [ ] Permisos aplicados
- [ ] Respuestas HTTP apropiadas

---

#### Tarea 4.7: Frontend - Gestión de Ventas
**Prioridad:** Alta | **Estimación:** 10 Story Points | **Etiquetas:** Frontend, React

**Descripción:**
Crear todas las interfaces para gestión completa de ventas.

**Páginas y componentes principales:**

1. **VentasPage** - Página principal de ventas
2. **VentasList** - Lista de ventas con filtros
3. **VentaForm** - Formulario crear venta (punto de venta)
4. **VentaDetail** - Vista detallada de venta
5. **VentaHistorial** - Historial de la venta
6. **AbonosManager** - Gestión de abonos de una venta
7. **AbonoForm** - Formulario registrar abono
8. **CuentasPorCobrar** - Vista de ventas con saldo pendiente
9. **ReportesVentas** - Dashboard de reportes

**Funcionalidades del Punto de Venta (VentaForm):**

**Selección de Cliente:**
- Búsqueda rápida de clientes
- Cliente por defecto "Consumidor Final"
- Crear cliente nuevo desde el modal

**Agregar Productos:**
- Búsqueda de productos (nombre, código, código de barras)
- Scan de código de barras
- Agregar cantidad
- Mostrar precio unitario
- Calcular subtotal por línea
- Lista de productos agregados
- Eliminar producto de la lista
- Editar cantidad

**Cálculos Automáticos:**
- Subtotal
- Descuento (opcional)
- Impuestos (IVA)
- Total a pagar
- Cambio (si pago en efectivo)

**Opciones de Pago:**
- Método de pago (Efectivo, Tarjeta, Transferencia, Crédito)
- Si es crédito, permitir pago parcial (abono)
- Calculadora de pago

**Finalización:**
- Estado: Terminada o Pendiente
- Opción de facturar electrónicamente
- Opción de imprimir ticket
- Limpiar formulario para nueva venta

**Funcionalidades de Lista de Ventas:**
- Tabla con todas las ventas
- Filtros por fecha, cliente, estado, estado de pago
- Búsqueda por número de venta
- Badges de estado visual
- Acciones: Ver detalle, Abonar, Cancelar, Facturar
- Exportar a Excel/PDF

**Gestión de Abonos:**
- Ver historial de abonos de una venta
- Registrar nuevo abono
- Validación de monto
- Calcular saldo pendiente
- Mostrar progreso de pago visual
- Marcar como pagada completamente

**Cuentas por Cobrar:**
- Lista de ventas con saldo pendiente
- Total por cobrar
- Filtros por cliente y antigüedad
- Opción de abonar directamente
- Alertas de vencimiento (si aplica)

**Reportes:**
- Gráfico de ventas por período
- Ventas por cliente
- Productos más vendidos
- Métodos de pago utilizados
- Estado de cuentas por cobrar

**Pasos de implementación:**
1. Crear servicios API en `services/ventas.service.js`
2. Crear servicios API en `services/abonos.service.js`
3. Crear store de ventas (Zustand)
4. Crear componentes de punto de venta
5. Implementar búsqueda de productos
6. Implementar calculadora de totales
7. Crear componentes de abonos
8. Crear vista de cuentas por cobrar
9. Implementar reportes visuales
10. Agregar validaciones en tiempo real
11. Implementar responsive design
12. Testing de componentes

**Criterios de aceptación:**
- [ ] Punto de venta completamente funcional
- [ ] Búsqueda de productos rápida
- [ ] Cálculos automáticos correctos
- [ ] Gestión de abonos operativa
- [ ] Lista de ventas con filtros funcionando
- [ ] Cuentas por cobrar implementadas
- [ ] Reportes visuales funcionando
- [ ] Validaciones en tiempo real
- [ ] Responsive en tablet (especialmente punto de venta)
- [ ] Performance optimizado
- [ ] Feedback visual apropiado

---

## ÉPICA 5: Módulo de Clientes

### 📋 Descripción de la Épica
Implementar el sistema completo de gestión de clientes con CRUD, historial de compras, gestión de cartera y análisis de clientes.

### 🎯 Objetivos
- CRUD completo de clientes
- Historial de compras por cliente
- Gestión de cartera (cuentas por cobrar)
- Análisis de clientes (mejores clientes)
- Exportación de datos

---

#### Tarea 5.1: Modelo de Clientes
**Prioridad:** Alta | **Estimación:** 3 Story Points | **Etiquetas:** Backend, Models

**Descripción:**
Crear el modelo de Clientes con todos los campos necesarios para gestión completa.

**Campos del modelo:**
- id (AutoField, PK)
- tipo_documento (CharField, choices=['CC', 'NIT', 'CE', 'PASAPORTE'])
- numero_documento (CharField, unique)
- nombre (CharField) - para personas naturales
- razon_social (CharField, blank=True) - para empresas
- nombre_comercial (CharField, blank=True)
- email (EmailField, blank=True)
- telefono (CharField)
- celular (CharField, blank=True)
- direccion (TextField)
- ciudad (CharField)
- departamento (CharField)
- codigo_postal (CharField, blank=True)
- tipo_cliente (CharField, choices=['NATURAL', 'JURIDICO'])
- regimen_tributario (CharField, choices=['SIMPLIFICADO', 'COMUN'], blank=True)
- responsable_iva (BooleanField, default=False)
- credito_disponible (DecimalField, default=0)
- limite_credito (DecimalField, default=0)
- dias_plazo (IntegerField, default=0)
- observaciones (TextField, blank=True)
- activo (BooleanField, default=True)
- created_at (DateTimeField, auto_now_add)
- updated_at (DateTimeField, auto_now)

**Métodos del modelo:**
- `get_nombre_completo()` - Retorna nombre o razón social
- `calcular_saldo_pendiente()` - Suma de saldos de ventas pendientes
- `tiene_credito_disponible(monto)` - Valida si puede comprar a crédito
- `calcular_total_compras()` - Total histórico de compras

**Validaciones:**
- Documento único por tipo
- Email válido (si se proporciona)
- Límite de crédito >= 0
- Días plazo >= 0

**Criterios de aceptación:**
- [ ] Modelo Cliente creado con todos los campos
- [ ] Choices definidos correctamente
- [ ] Métodos de cálculo implementados
- [ ] Validaciones funcionando
- [ ] Migraciones aplicadas

---

#### Tarea 5.2: Serializers de Clientes
**Prioridad:** Alta | **Estimación:** 2 Story Points | **Etiquetas:** Backend, Serializers

**Descripción:**
Crear serializers para el modelo de clientes con validaciones.

**Serializers a crear:**
1. **ClienteSerializer** - Completo con campos calculados
2. **ClienteListSerializer** - Simplificado para listados
3. **ClienteCreateSerializer** - Para creación con validaciones
4. **ClienteUpdateSerializer** - Para actualización
5. **ClienteDetailSerializer** - Con estadísticas de compras

**Campos calculados a incluir:**
- saldo_pendiente
- total_compras
- ultima_compra
- cantidad_compras

**Validaciones:**
- Documento único según tipo
- Email válido
- Teléfono requerido
- Límite crédito >= saldo pendiente

**Criterios de aceptación:**
- [ ] Todos los serializers creados
- [ ] Validaciones implementadas
- [ ] Campos calculados funcionando
- [ ] Probados en Django shell

---

#### Tarea 5.3: Services de Clientes (Lógica de Negocio)
**Prioridad:** Alta | **Estimación:** 4 Story Points | **Etiquetas:** Backend, Business Logic

**Descripción:**
Implementar la lógica de negocio del módulo de clientes.

**Archivo:** `cliente/services.py`

**Métodos a implementar:**

**CRUD Básico:**
1. `crear_cliente(data)` - Crear con validaciones
2. `obtener_cliente(cliente_id)` - Obtener con estadísticas
3. `listar_clientes(filtros)` - Listar con filtros
4. `actualizar_cliente(cliente_id, data)` - Actualizar
5. `eliminar_cliente(cliente_id)` - Soft delete
6. `activar_desactivar_cliente(cliente_id, activo)` - Cambiar estado

**Historial y Cartera:**
7. `obtener_historial_compras(cliente_id, filtros)` - Historial de ventas
8. `obtener_cartera_cliente(cliente_id)` - Ventas con saldo pendiente
9. `calcular_estadisticas_cliente(cliente_id)` - Estadísticas completas

**Validaciones:**
10. `validar_credito_disponible(cliente_id, monto)` - Validar crédito
11. `validar_documento_unico(tipo, numero, cliente_id)` - Documento único

**Reportes:**
12. `obtener_mejores_clientes(limite)` - Top clientes por compras
13. `obtener_clientes_morosos()` - Clientes con saldos vencidos
14. `obtener_clientes_nuevos(dias)` - Clientes recientes

**Lógica de negocio:**
- Documento único por tipo
- No eliminar clientes con ventas
- Validar crédito antes de venta
- Calcular saldo pendiente en tiempo real

**Criterios de aceptación:**
- [ ] Todos los métodos implementados
- [ ] Lógica de negocio aplicada
- [ ] Validaciones funcionando
- [ ] Manejo de excepciones
- [ ] Código documentado

---

#### Tarea 5.4: Views y Endpoints de Clientes
**Prioridad:** Alta | **Estimación:** 3 Story Points | **Etiquetas:** Backend, API

**Descripción:**
Crear endpoints REST para el módulo de clientes.

**Endpoints:**
- `GET /api/clientes/` - Listar con filtros
- `POST /api/clientes/` - Crear cliente
- `GET /api/clientes/{id}/` - Detalle de cliente
- `PUT/PATCH /api/clientes/{id}/` - Actualizar
- `DELETE /api/clientes/{id}/` - Eliminar
- `GET /api/clientes/{id}/historial/` - Historial de compras
- `GET /api/clientes/{id}/cartera/` - Cartera del cliente
- `GET /api/clientes/{id}/estadisticas/` - Estadísticas
- `GET /api/clientes/buscar/?q=` - Búsqueda
- `GET /api/clientes/mejores/` - Mejores clientes
- `GET /api/clientes/morosos/` - Clientes morosos

**Filtros:**
- tipo_cliente
- ciudad
- activo
- con_saldo_pendiente

**Criterios de aceptación:**
- [ ] Todos los endpoints creados
- [ ] CRUD funcional
- [ ] Filtros implementados
- [ ] Búsqueda funcionando
- [ ] Paginación implementada
- [ ] Permisos aplicados

---

#### Tarea 5.5: Frontend - Gestión de Clientes
**Prioridad:** Alta | **Estimación:** 6 Story Points | **Etiquetas:** Frontend, React

**Descripción:**
Crear interfaces completas para gestión de clientes.

**Componentes a crear:**
1. **ClientesPage** - Página principal
2. **ClientesList** - Lista de clientes
3. **ClienteForm** - Formulario crear/editar
4. **ClienteDetail** - Vista detallada
5. **ClienteHistorial** - Historial de compras
6. **ClienteCartera** - Estado de cuenta
7. **MejoresClientes** - Dashboard de mejores clientes

**Funcionalidades:**

**Lista de Clientes:**
- Tabla con información principal
- Filtros por tipo, ciudad, estado
- Búsqueda por documento o nombre
- Badges de estado (moroso, buen cliente)
- Acciones rápidas

**Formulario:**
- Campos según tipo de cliente
- Validación de documento único
- Configuración de crédito
- Información de contacto

**Detalle:**
- Información completa
- Estadísticas de compras
- Gráfico de compras en el tiempo
- Estado de cuenta

**Historial:**
- Lista de todas las compras
- Filtros por fecha y estado
- Total comprado
- Frecuencia de compra

**Cartera:**
- Ventas con saldo pendiente
- Total por cobrar
- Días de mora
- Opción de abonar

**Criterios de aceptación:**
- [ ] Todas las páginas creadas
- [ ] CRUD completo funcional
- [ ] Filtros y búsqueda funcionando
- [ ] Historial visible
- [ ] Cartera calculada correctamente
- [ ] Responsive design
- [ ] Validaciones en tiempo real

---

## ÉPICA 6: Módulo de Proveedores

### 📋 Descripción de la Épica
Implementar sistema de gestión de proveedores con CRUD, registro de facturas de compra e historial de compras.

### 🎯 Objetivos
- CRUD completo de proveedores
- Registro de facturas de compra
- Historial de compras a proveedores
- Análisis de proveedores

---

#### Tarea 6.1: Modelo de Proveedores
**Prioridad:** Alta | **Estimación:** 2 Story Points | **Etiquetas:** Backend, Models

**Descripción:**
Crear modelo de Proveedores similar a clientes pero orientado a compras.

**Campos del modelo:**
- id (AutoField, PK)
- tipo_documento (CharField, choices=['NIT', 'CC', 'CE'])
- numero_documento (CharField, unique)
- razon_social (CharField)
- nombre_comercial (CharField, blank=True)
- nombre_contacto (CharField)
- email (EmailField)
- telefono (CharField)
- celular (CharField, blank=True)
- direccion (TextField)
- ciudad (CharField)
- departamento (CharField)
- tipo_productos (TextField) - productos que suministra
- forma_pago (CharField, choices=['CONTADO', 'CREDITO_15', 'CREDITO_30', 'CREDITO_60'])
- cuenta_bancaria (CharField, blank=True)
- banco (CharField, blank=True)
- observaciones (TextField, blank=True)
- activo (BooleanField, default=True)
- created_at (DateTimeField, auto_now_add)
- updated_at (DateTimeField, auto_now)

**Métodos:**
- `calcular_total_compras()` - Total de compras realizadas
- `obtener_ultima_compra()` - Fecha de última compra

**Criterios de aceptación:**
- [ ] Modelo Proveedor creado
- [ ] Campos y validaciones
- [ ] Métodos implementados
- [ ] Migraciones aplicadas

---

#### Tarea 6.2: Serializers, Services y Views de Proveedores
**Prioridad:** Alta | **Estimación:** 4 Story Points | **Etiquetas:** Backend

**Descripción:**
Implementar serializers, lógica de negocio y endpoints para proveedores.

**Serializers:**
- ProveedorSerializer (completo)
- ProveedorListSerializer (listado)
- ProveedorCreateSerializer (creación)
- ProveedorUpdateSerializer (actualización)

**Services principales:**
- CRUD completo
- Historial de compras
- Estadísticas de proveedor
- Validaciones

**Endpoints:**
- `GET/POST /api/proveedores/`
- `GET/PUT/DELETE /api/proveedores/{id}/`
- `GET /api/proveedores/{id}/historial/`
- `GET /api/proveedores/{id}/estadisticas/`
- `GET /api/proveedores/buscar/`

**Criterios de aceptación:**
- [ ] Serializers creados
- [ ] Services implementados
- [ ] Endpoints funcionando
- [ ] CRUD completo
- [ ] Historial visible

---

#### Tarea 6.3: Frontend - Gestión de Proveedores
**Prioridad:** Media | **Estimación:** 5 Story Points | **Etiquetas:** Frontend

**Descripción:**
Crear interfaces para gestión de proveedores.

**Componentes:**
1. ProveedoresPage
2. ProveedoresList
3. ProveedorForm
4. ProveedorDetail
5. ProveedorHistorial

**Funcionalidades:**
- CRUD completo
- Historial de compras
- Estadísticas de proveedor
- Búsqueda y filtros

**Criterios de aceptación:**
- [ ] Componentes creados
- [ ] CRUD funcional
- [ ] Historial visible
- [ ] Responsive design

---

## ÉPICA 7: Módulo de Fabricante (Plan Premium)

### 📋 Descripción de la Épica
Implementar módulo avanzado para fabricantes que permite gestionar ingredientes, crear productos con recetas, conversión de unidades y cálculo automático de costos y utilidades.

### 🎯 Objetivos
- Gestión de ingredientes (materias primas)
- Inventario de ingredientes
- Creación de productos con recetas
- Conversión automática de unidades
- Cálculo de costos de producción
- Determinación de precio de venta óptimo

---

#### Tarea 7.1: Modelos de Ingredientes
**Prioridad:** Media | **Estimación:** 3 Story Points | **Etiquetas:** Backend, Models

**Descripción:**
Crear modelos para gestión de ingredientes e inventario.

**Modelo Ingrediente:**
- id (AutoField, PK)
- nombre (CharField)
- descripcion (TextField, blank=True)
- unidad_medida (CharField, choices=['LITROS', 'MILILITROS', 'KILOGRAMOS', 'GRAMOS', 'UNIDADES'])
- precio_por_unidad (DecimalField)
- proveedor (ForeignKey a Proveedor, null=True)
- stock_actual (DecimalField, default=0)
- stock_minimo (DecimalField, default=0)
- created_at (DateTimeField)
- updated_at (DateTimeField)

**Modelo InventarioIngredientes:**
- id (AutoField, PK)
- ingrediente (ForeignKey)
- cantidad (DecimalField)
- precio_unitario (DecimalField)
- fecha_ingreso (DateTimeField)
- factura (ForeignKey a FacturaCompra, null=True)
- usuario (ForeignKey a Usuario)

**Criterios de aceptación:**
- [ ] Modelos creados
- [ ] Relaciones configuradas
- [ ] Migraciones aplicadas

---

#### Tarea 7.2: Modelos de Productos Fabricados
**Prioridad:** Media | **Estimación:** 4 Story Points | **Etiquetas:** Backend, Models

**Descripción:**
Crear modelos para productos fabricados con recetas.

**Modelo ProductoFabricado:**
- id (AutoField, PK)
- nombre (CharField)
- descripcion (TextField)
- unidad_medida (CharField)
- cantidad_producida (DecimalField) - por lote
- costo_produccion (DecimalField) - calculado
- costo_unitario (DecimalField) - calculado
- precio_venta_sugerido (DecimalField)
- precio_venta (DecimalField)
- margen_utilidad (DecimalField) - calculado
- porcentaje_utilidad (DecimalField) - calculado
- tiempo_produccion (IntegerField) - en minutos
- producto_final (ForeignKey a Producto, null=True)
- created_at (DateTimeField)
- updated_at (DateTimeField)

**Modelo IngredientesProducto (Receta):**
- id (AutoField, PK)
- producto_fabricado (ForeignKey)
- ingrediente (ForeignKey)
- cantidad_necesaria (DecimalField)
- unidad_medida (CharField)
- costo_ingrediente (DecimalField) - calculado

**Métodos ProductoFabricado:**
- `calcular_costo_produccion()` - Suma costos de ingredientes
- `calcular_costo_unitario()` - costo_produccion / cantidad_producida
- `calcular_margen_utilidad()` - precio_venta - costo_unitario
- `calcular_porcentaje_utilidad()` - (margen/costo) * 100
- `validar_disponibilidad_ingredientes()` - Verificar stock

**Criterios de aceptación:**
- [ ] Modelos creados
- [ ] Métodos de cálculo implementados
- [ ] Relaciones configuradas
- [ ] Migraciones aplicadas

---

#### Tarea 7.3: Sistema de Conversión de Unidades
**Prioridad:** Media | **Estimación:** 3 Story Points | **Etiquetas:** Backend, Utils

**Descripción:**
Implementar sistema de conversión automática de unidades de medida.

**Archivo:** `fabricante/utils.py`

**Conversiones a implementar:**

**Volumen:**
- Galones ↔ Litros
- Litros ↔ Mililitros
- Onzas líquidas ↔ Mililitros

**Masa:**
- Kilogramos ↔ Gramos
- Libras ↔ Kilogramos
- Onzas ↔ Gramos

**Funciones:**
```python
def convertir_unidad(cantidad, unidad_origen, unidad_destino):
    """Convierte cantidad de una unidad a otra"""
    pass

def calcular_costo_por_unidad_destino(costo_origen, unidad_origen, unidad_destino):
    """Calcula el costo en la unidad de destino"""
    pass

def validar_compatibilidad_unidades(unidad1, unidad2):
    """Valida si dos unidades son compatibles (mismo tipo)"""
    pass
```

**Ejemplo de uso:**
```python
# Ingrediente: Leche - 1 galón = $10,000
# Receta necesita: 500 ml de leche
# Sistema calcula: 1 galón = 3.785 litros = 3785 ml
# Costo de 500ml = ($10,000 / 3785) * 500 = $1,320
```

**Criterios de aceptación:**
- [ ] Funciones de conversión creadas
- [ ] Todas las unidades soportadas
- [ ] Validaciones implementadas
- [ ] Tests unitarios pasando
- [ ] Documentación completa

---

#### Tarea 7.4: Serializers y Services de Fabricante
**Prioridad:** Media | **Estimación:** 5 Story Points | **Etiquetas:** Backend

**Descripción:**
Implementar serializers y lógica de negocio del módulo fabricante.

**Serializers:**
1. IngredienteSerializer
2. InventarioIngredientesSerializer
3. IngredientesProductoSerializer (Receta)
4. ProductoFabricadoSerializer
5. ProductoFabricadoDetailSerializer (con receta completa)

**Services principales:**

**Ingredientes:**
- `crear_ingrediente(data)`
- `listar_ingredientes(filtros)`
- `actualizar_stock_ingrediente(ingrediente_id, cantidad)`
- `ingredientes_bajo_stock()`

**Productos Fabricados:**
- `crear_producto_fabricado(data, receta)` - Crear con receta
- `calcular_costos_producto(producto_id)` - Calcular todos los costos
- `sugerir_precio_venta(producto_id, margen_deseado)` - Sugerir precio
- `validar_produccion(producto_id, cantidad_lotes)` - Validar ingredientes
- `producir_lote(producto_id, cantidad_lotes)` - Producir y descontar ingredientes
- `convertir_a_producto_inventario(producto_fabricado_id)` - Pasar a inventario

**Lógica de negocio:**
- Calcular costos con conversión de unidades
- Validar disponibilidad de ingredientes
- Descontar ingredientes al producir
- Sugerir precio basado en margen objetivo
- Crear producto en inventario general

**Criterios de aceptación:**
- [ ] Todos los serializers creados
- [ ] Services implementados
- [ ] Cálculos funcionando correctamente
- [ ] Conversión de unidades integrada
- [ ] Validaciones robustas

---

#### Tarea 7.5: Views y Endpoints de Fabricante
**Prioridad:** Media | **Estimación:** 4 Story Points | **Etiquetas:** Backend, API

**Descripción:**
Crear endpoints para módulo fabricante.

**Endpoints - Ingredientes:**
- `GET/POST /api/fabricante/ingredientes/`
- `GET/PUT/DELETE /api/fabricante/ingredientes/{id}/`
- `POST /api/fabricante/ingredientes/{id}/actualizar-stock/`
- `GET /api/fabricante/ingredientes/bajo-stock/`

**Endpoints - Productos Fabricados:**
- `GET/POST /api/fabricante/productos/`
- `GET/PUT/DELETE /api/fabricante/productos/{id}/`
- `GET /api/fabricante/productos/{id}/costos/` - Ver cálculo detallado
- `POST /api/fabricante/productos/{id}/calcular-precio/` - Calcular precio
- `POST /api/fabricante/productos/{id}/producir/` - Producir lote
- `POST /api/fabricante/productos/{id}/convertir-inventario/` - Pasar a inventario

**Endpoints - Recetas:**
- `GET /api/fabricante/productos/{id}/receta/`
- `POST /api/fabricante/productos/{id}/receta/` - Agregar ingrediente
- `DELETE /api/fabricante/productos/{id}/receta/{ingrediente_id}/`

**Criterios de aceptación:**
- [ ] Todos los endpoints creados
- [ ] CRUD funcional
- [ ] Cálculos correctos
- [ ] Permisos aplicados (solo ADMIN)

---

#### Tarea 7.6: Frontend - Módulo Fabricante
**Prioridad:** Media | **Estimación:** 8 Story Points | **Etiquetas:** Frontend

**Descripción:**
Crear interfaces completas para módulo fabricante.

**Componentes principales:**

1. **FabricantePage** - Dashboard del módulo
2. **IngredientesList** - Gestión de ingredientes
3. **IngredienteForm** - Crear/editar ingrediente
4. **InventarioIngredientes** - Stock de ingredientes
5. **ProductoFabricadoForm** - Crear producto con receta
6. **RecetaBuilder** - Constructor de receta visual
7. **CalculadoraCostos** - Vista de cálculos
8. **ProduccionForm** - Formulario producir lote

**Funcionalidades ProductoFabricadoForm:**

**Información Básica:**
- Nombre del producto
- Descripción
- Unidad de medida
- Cantidad producida por lote

**Constructor de Receta (RecetaBuilder):**
- Buscar ingredientes
- Seleccionar ingrediente
- Ingresar cantidad necesaria
- Seleccionar unidad de medida
- Conversión automática si difiere del ingrediente
- Cálculo automático de costo
- Lista de ingredientes agregados
- Eliminar ingrediente de receta

**Cálculos en Tiempo Real:**
- Costo total de producción
- Costo unitario
- Precio de venta sugerido (según margen)
- Margen de utilidad
- Porcentaje de rentabilidad
- Gráfico visual de composición de costos

**Calculadora de Precio:**
- Slider de margen de utilidad deseado
- Cálculo automático de precio de venta
- Comparación con competencia (opcional)

**Validaciones:**
- Verificar disponibilidad de ingredientes
- Alertas de ingredientes faltantes
- Sugerencias de optimización

**Formulario de Producción:**
- Seleccionar producto fabricado
- Cantidad de lotes a producir
- Verificación de ingredientes
- Confirmación de producción
- Descuento automático de ingredientes
- Opción de pasar a inventario general

**Criterios de aceptación:**
- [ ] Todos los componentes creados
- [ ] Constructor de receta funcional
- [ ] Cálculos en tiempo real
- [ ] Conversión de unidades automática
- [ ] Validaciones funcionando
- [ ] Interfaz intuitiva y visual
- [ ] Responsive design

---

## ÉPICA 8: Módulo de Informes y Estadísticas

### 📋 Descripción de la Épica
Implementar sistema completo de informes, estadísticas, cierres de caja y análisis de datos del negocio.

### 🎯 Objetivos
- Dashboard de estadísticas en tiempo real
- Cierres de caja automáticos
- Reportes en PDF y Excel
- Análisis de ventas y tendencias
- Filtros por períodos
- Visualización con gráficos

---

#### Tarea 8.1: Modelo de Cierres de Caja
**Prioridad:** Alta | **Estimación:** 3 Story Points | **Etiquetas:** Backend, Models

**Descripción:**
Crear modelo para registrar cierres de caja diarios.

**Campos del modelo:**
- id (AutoField, PK)
- fecha_cierre (DateField)
- fecha_registro (DateTimeField, auto_now_add)
- total_ventas (DecimalField)
- total_efectivo (DecimalField)
- total_tarjeta (DecimalField)
- total_transferencia (DecimalField)
- total_credito (DecimalField)
- total_abonos (DecimalField)
- total_gastos (DecimalField)
- gastos_operativos (JSONField) - desglose de gastos
- ventas_por_categoria (JSONField)
- efectivo_esperado (DecimalField)
- efectivo_real (DecimalField)
- diferencia (DecimalField)
- observaciones (TextField, blank=True)
- usuario_cierre (ForeignKey a Usuario)

**Métodos:**
- `calcular_totales()` - Calcular todos los totales
- `calcular_diferencia()` - Diferencia entre esperado y real
- `generar_resumen()` - Resumen del cierre

**Criterios de aceptación:**
- [ ] Modelo CierreCaja creado
- [ ] Campos calculados implementados
- [ ] JSONFields configurados
- [ ] Migraciones aplicadas

---

#### Tarea 8.2: Modelo de Informes
**Prioridad:** Media | **Estimación:** 2 Story Points | **Etiquetas:** Backend, Models

**Descripción:**
Crear modelo para almacenar informes generados.

**Campos del modelo:**
- id (AutoField, PK)
- tipo_informe (CharField, choices)
- fecha_generacion (DateTimeField)
- fecha_inicio (DateField)
- fecha_fin (DateField)
- datos (JSONField) - datos del informe
- archivo_pdf (FileField, blank=True)
- archivo_excel (FileField, blank=True)
- usuario_genero (ForeignKey)

**Tipos de informes:**
- VENTAS_PERIODO
- PRODUCTOS_MAS_VENDIDOS
- CLIENTES_TOP
- INVENTARIO_VALORIZADO
- CUENTAS_POR_COBRAR
- CIERRE_CAJA

**Criterios de aceptación:**
- [ ] Modelo Informe creado
- [ ] Tipos definidos
- [ ] Archivos configurados
- [ ] Migraciones aplicadas

---

#### Tarea 8.3: Services de Cierres de Caja
**Prioridad:** Alta | **Estimación:** 5 Story Points | **Etiquetas:** Backend, Business Logic

**Descripción:**
Implementar lógica para generación automática de cierres de caja.

**Archivo:** `informes/services.py`

**Métodos principales:**

1. `generar_cierre_caja(fecha, efectivo_real)` - Genera cierre del día
   - Calcular ventas del día por método de pago
   - Calcular abonos recibidos
   - Obtener gastos del día
   - Clasificar ventas por categoría
   - Calcular diferencia de efectivo
   - Generar resumen

2. `obtener_cierres(filtros)` - Listar cierres con filtros

3. `obtener_detalle_cierre(cierre_id)` - Detalle completo

4. `modificar_cierre(cierre_id, data)` - Ajustar cierre

5. `calcular_gastos_periodo(fecha_inicio, fecha_fin)` - Gastos por período

**Cálculos del cierre:**
```python
total_ventas = sum(ventas_del_dia.total)
total_efectivo = sum(ventas where metodo_pago='EFECTIVO')
total_tarjeta = sum(ventas where metodo_pago='TARJETA')
total_transferencia = sum(ventas where metodo_pago='TRANSFERENCIA')
total_credito = sum(ventas where metodo_pago='CREDITO')
total_abonos = sum(abonos where metodo='EFECTIVO')
efectivo_esperado = total_efectivo + total_abonos
diferencia = efectivo_real - efectivo_esperado
```

**Desglose de gastos:**
- Compras de mercancía (facturas del día)
- Servicios públicos
- Arriendos
- Salarios
- Otros gastos

**Criterios de aceptación:**
- [ ] Métodos implementados
- [ ] Cálculos correctos
- [ ] Desglose detallado
- [ ] Manejo de errores

---

#### Tarea 8.4: Services de Estadísticas y Reportes
**Prioridad:** Alta | **Estimación:** 6 Story Points | **Etiquetas:** Backend, Business Logic

**Descripción:**
Implementar lógica para generación de estadísticas y reportes.

**Métodos de estadísticas:**

**Ventas:**
1. `estadisticas_ventas_periodo(fecha_inicio, fecha_fin)` - Estadísticas generales
   - Total ventas
   - Cantidad de ventas
   - Ticket promedio
   - Comparación con período anterior
   - Gráfico de tendencia

2. `ventas_por_dia(fecha_inicio, fecha_fin)` - Serie temporal diaria

3. `ventas_por_mes(año)` - Serie temporal mensual

4. `ventas_por_categoria(fecha_inicio, fecha_fin)` - Distribución por categoría

5. `ventas_por_metodo_pago(fecha_inicio, fecha_fin)` - Métodos de pago utilizados

**Productos:**
6. `productos_mas_vendidos(fecha_inicio, fecha_fin, limite)` - Top productos
   - Cantidad vendida
   - Total vendido
   - Margen generado

7. `productos_menos_vendidos(limite)` - Productos con baja rotación

8. `productos_sin_movimiento(dias)` - Productos sin ventas

**Clientes:**
9. `mejores_clientes(fecha_inicio, fecha_fin, limite)` - Top clientes
   - Total comprado
   - Cantidad de compras
   - Ticket promedio

10. `analisis_recurrencia_clientes()` - Clientes nuevos vs recurrentes

**Inventario:**
11. `valor_total_inventario()` - Valorización del inventario

12. `rotacion_inventario(fecha_inicio, fecha_fin)` - Índice de rotación

**Financiero:**
13. `total_cuentas_por_cobrar()` - Total de cartera

14. `antigüedad_cartera()` - Análisis de antigüedad

15. `proyeccion_ingresos(dias)` - Proyección basada en histórico

**Criterios de aceptación:**
- [ ] Todos los métodos implementados
- [ ] Cálculos correctos y optimizados
- [ ] Datos listos para gráficos
- [ ] Performance adecuado con datos grandes
- [ ] Código documentado

---

#### Tarea 8.5: Generación de PDF y Excel
**Prioridad:** Media | **Estimación:** 4 Story Points | **Etiquetas:** Backend, Reports

**Descripción:**
Implementar generación de reportes en PDF y Excel.

**Dependencias técnicas:**
```bash
pip install reportlab==4.0.4
pip install openpyxl==3.1.2
```

**Archivo:** `informes/generators.py`

**Generadores a crear:**

**PDF:**
1. `generar_pdf_ventas_periodo(datos, fecha_inicio, fecha_fin)`
2. `generar_pdf_cierre_caja(cierre_id)`
3. `generar_pdf_inventario_valorizado()`
4. `generar_pdf_cuentas_por_cobrar()`

**Excel:**
5. `generar_excel_ventas_detallado(fecha_inicio, fecha_fin)`
6. `generar_excel_productos_vendidos()`
7. `generar_excel_clientes_cartera()`

**Características de los PDF:**
- Encabezado con logo del negocio
- Fecha de generación
- Filtros aplicados
- Tablas con datos
- Gráficos (si aplica)
- Totales y resúmenes
- Pie de página con numeración

**Características de los Excel:**
- Formato profesional
- Fórmulas automáticas
- Filtros en encabezados
- Formato condicional
- Gráficos embebidos

**Criterios de aceptación:**
- [ ] PDFs generándose correctamente
- [ ] Excel generándose correctamente
- [ ] Formato profesional
- [ ] Datos completos y correctos
- [ ] Descarga funcionando

---

#### Tarea 8.6: Views y Endpoints de Informes
**Prioridad:** Alta | **Estimación:** 4 Story Points | **Etiquetas:** Backend, API

**Descripción:**
Crear endpoints para informes y estadísticas.

**Endpoints - Estadísticas:**
- `GET /api/informes/estadisticas/dashboard/` - Dashboard general
- `GET /api/informes/estadisticas/ventas/` - Stats de ventas
- `GET /api/informes/estadisticas/productos/` - Stats de productos
- `GET /api/informes/estadisticas/clientes/` - Stats de clientes
- `GET /api/informes/estadisticas/financiero/` - Stats financieras

**Endpoints - Cierres de Caja:**
- `GET/POST /api/informes/cierres/`
- `GET /api/informes/cierres/{id}/`
- `PUT /api/informes/cierres/{id}/`
- `POST /api/informes/cierres/generar/` - Generar cierre

**Endpoints - Reportes:**
- `GET /api/informes/reportes/`
- `POST /api/informes/reportes/generar/` - Generar reporte
- `GET /api/informes/reportes/{id}/descargar-pdf/`
- `GET /api/informes/reportes/{id}/descargar-excel/`

**Parámetros comunes:**
- fecha_inicio
- fecha_fin
- tipo_reporte
- formato (pdf/excel)

**Criterios de aceptación:**
- [ ] Todos los endpoints creados
- [ ] Estadísticas calculándose
- [ ] Cierres generándose
- [ ] Reportes descargándose
- [ ] Filtros funcionando
- [ ] Permisos aplicados (solo ADMIN)

---

#### Tarea 8.7: Frontend - Dashboard de Estadísticas
**Prioridad:** Alta | **Estimación:** 10 Story Points | **Etiquetas:** Frontend, React

**Descripción:**
Crear dashboard completo con estadísticas visuales.

**Dependencias frontend:**
```bash
npm install recharts
npm install date-fns
npm install react-to-print
```

**Componentes principales:**

1. **DashboardPage** - Página principal de estadísticas
2. **EstadisticasGenerales** - Cards con métricas principales
3. **GraficoVentas** - Gráfico de líneas de ventas
4. **GraficoProductos** - Gráfico de barras productos más vendidos
5. **GraficoCategorias** - Gráfico de torta por categorías
6. **GraficoMetodosPago** - Distribución de métodos de pago
7. **TablaTopClientes** - Tabla de mejores clientes
8. **FiltrosFecha** - Selector de períodos

**Métricas del Dashboard:**

**Cards Principales:**
- Total ventas del período (con % cambio)
- Cantidad de ventas (con % cambio)
- Ticket promedio (con % cambio)
- Total productos vendidos
- Valor del inventario
- Cuentas por cobrar
- Utilidad estimada

**Gráficos:**
1. **Ventas en el Tiempo:**
   - Gráfico de líneas
   - Por día/semana/mes
   - Comparación con período anterior

2. **Productos Más Vendidos:**
   - Gráfico de barras horizontal
   - Top 10 productos
   - Cantidad y valor

3. **Ventas por Categoría:**
   - Gráfico de torta/dona
   - Porcentaje por categoría
   - Valor total

4. **Métodos de Pago:**
   - Gráfico de barras
   - Distribución porcentual

5. **Tendencia Semanal:**
   - Gráfico de barras
   - Ventas por día de la semana

**Filtros:**
- Hoy
- Ayer
- Últimos 7 días
- Últimos 30 días
- Este mes
- Mes anterior
- Este año
- Rango personalizado

**Criterios de aceptación:**
- [ ] Dashboard completamente funcional
- [ ] Todos los gráficos renderizando
- [ ] Filtros aplicándose correctamente
- [ ] Datos actualizándose en tiempo real
- [ ] Cards con métricas animadas
- [ ] Comparación con períodos anteriores
- [ ] Responsive design
- [ ] Performance optimizado

---

#### Tarea 8.8: Frontend - Cierres de Caja
**Prioridad:** Alta | **Estimación:** 6 Story Points | **Etiquetas:** Frontend

**Descripción:**
Crear interfaces para gestión de cierres de caja.

**Componentes:**
1. **CierresCajaPage** - Página principal
2. **CierresList** - Historial de cierres
3. **GenerarCierreForm** - Formulario generar cierre
4. **DetalleCierre** - Vista detallada del cierre
5. **ImprimirCierre** - Template de impresión

**Funcionalidades:**

**Generar Cierre:**
- Seleccionar fecha
- Ver resumen automático:
  - Total de ventas
  - Desglose por método de pago
  - Abonos recibidos
  - Gastos del día
- Ingresar efectivo real en caja
- Cálculo automático de diferencia
- Campo de observaciones
- Confirmar y generar

**Detalle de Cierre:**
- Información general
- Totales por método de pago
- Desglose de gastos
- Ventas por categoría
- Diferencia de efectivo
- Observaciones
- Opción de imprimir
- Opción de ajustar (si se permite)

**Historial:**
- Lista de cierres anteriores
- Filtros por fecha
- Búsqueda por usuario
- Acciones: Ver, Imprimir, Descargar PDF

**Criterios de aceptación:**
- [ ] Componentes creados
- [ ] Generación de cierre funcional
- [ ] Cálculos automáticos correctos
- [ ] Historial visible
- [ ] Impresión funcionando
- [ ] Validaciones implementadas

---

#### Tarea 8.9: Frontend - Generación de Reportes
**Prioridad:** Media | **Estimación:** 5 Story Points | **Etiquetas:** Frontend

**Descripción:**
Crear interfaz para generación y descarga de reportes.

**Componentes:**
1. **ReportesPage** - Página de reportes
2. **GenerarReporteForm** - Formulario generación
3. **HistorialReportes** - Reportes generados
4. **PreviewReporte** - Vista previa

**Tipos de reportes a generar:**
- Ventas por período
- Productos más vendidos
- Clientes top
- Inventario valorizado
- Cuentas por cobrar
- Cierres de caja
- Análisis financiero

**Funcionalidades:**
- Seleccionar tipo de reporte
- Configurar parámetros (fechas, filtros)
- Elegir formato (PDF/Excel)
- Vista previa de datos
- Generar y descargar
- Historial de reportes generados

**Criterios de aceptación:**
- [ ] Formulario de generación funcional
- [ ] Descarga de PDF funcionando
- [ ] Descarga de Excel funcionando
- [ ] Vista previa implementada
- [ ] Historial visible
- [ ] Validaciones de fechas

---

## ÉPICA 9: Integración Facturación Electrónica (Factus)

### 📋 Descripción de la Épica
Integrar el sistema con Factus API para emisión de facturación electrónica, envío automático a la DIAN y gestión de documentos electrónicos.

### 🎯 Objetivos
- Integración completa con Factus API
- Emisión de facturas electrónicas
- Envío automático a DIAN
- Impresión de facturas
- Gestión de numeración DIAN
- Manejo de errores y reintentos

---

#### Tarea 9.1: Configuración de Factus API
**Prioridad:** Alta | **Estimación:** 3 Story Points | **Etiquetas:** Backend, Integration

**Descripción:**
Configurar integración con Factus API y crear cliente HTTP.

**Dependencias técnicas:**
```bash
pip install requests==2.31.0
```

**Configuración en settings.py:**
```python
FACTUS_API = {
    'BASE_URL': config('FACTUS_BASE_URL'),
    'API_KEY': config('FACTUS_API_KEY'),
    'COMPANY_ID': config('FACTUS_COMPANY_ID'),
    'TIMEOUT': 30,
    'MAX_RETRIES': 3,
}
```

**Archivo:** `ventas/factus_client.py`

**Clase FactusClient:**
```python
class FactusClient:
    def __init__(self):
        self.base_url = settings.FACTUS_API['BASE_URL']
        self.api_key = settings.FACTUS_API['API_KEY']
        self.headers = {
            'Authorization': f'Bearer {self.api_key}',
            'Content-Type': 'application/json'
        }

    def emitir_factura(self, data):
        """Emite factura electrónica"""
        pass

    def consultar_factura(self, numero_factura):
        """Consulta estado de factura"""
        pass

    def descargar_pdf(self, numero_factura):
        """Descarga PDF de factura"""
        pass

    def enviar_email(self, numero_factura, email):
        """Envía factura por email"""
        pass
```

**Criterios de aceptación:**
- [ ] Cliente HTTP creado
- [ ] Configuración en settings
- [ ] Variables de entorno configuradas
- [ ] Manejo de errores implementado
- [ ] Logging configurado

---

#### Tarea 9.2: Modelo de Configuración DIAN
**Prioridad:** Alta | **Estimación:** 2 Story Points | **Etiquetas:** Backend, Models

**Descripción:**
Crear modelo para almacenar configuración de facturación electrónica.

**Modelo ConfiguracionDIAN:**
- id (AutoField, PK)
- empresa_nit (CharField)
- empresa_nombre (CharField)
- empresa_direccion (TextField)
- empresa_telefono (CharField)
- empresa_email (EmailField)
- regimen_tributario (CharField)
- responsable_iva (BooleanField)
- resolucion_dian_numero (CharField)
- resolucion_dian_fecha (DateField)
- resolucion_prefijo (CharField)
- resolucion_desde (IntegerField)
- resolucion_hasta (IntegerField)
- resolucion_vigencia_desde (DateField)
- resolucion_vigencia_hasta (DateField)
- consecutivo_actual (IntegerField)
- ambiente (CharField, choices=['PRODUCCION', 'PRUEBAS'])
- activo (BooleanField)

**Métodos:**
- `obtener_siguiente_consecutivo()` - Obtiene y actualiza consecutivo
- `validar_vigencia_resolucion()` - Verifica vigencia
- `validar_rango_numeracion()` - Verifica rango disponible

**Criterios de aceptación:**
- [ ] Modelo creado
- [ ] Métodos implementados
- [ ] Migraciones aplicadas
- [ ] Solo puede haber una config activa

---

#### Tarea 9.3: Transformación de Datos para Factus
**Prioridad:** Alta | **Estimación:** 4 Story Points | **Etiquetas:** Backend, Integration

**Descripción:**
Crear transformadores de datos desde el modelo de Venta al formato requerido por Factus API.

**Archivo:** `ventas/factus_transformers.py`

**Funciones principales:**

1. `transformar_venta_a_factura(venta)` - Transforma Venta a formato Factus
```python
{
    "invoice": {
        "number": "SETP1",
        "issue_date": "2023-07-20",
        "payment_date": "2023-07-20",
        "payment_method": "CONTADO",
        "payment_mean": "EFECTIVO",
        "notes": "Observaciones",
        "customer": {
            "identification_number": "123456789",
            "name": "Cliente Nombre",
            "phone": "3001234567",
            "address": "Dirección",
            "email": "cliente@email.com",
            "merchant_registration": "No obligado"
        },
        "legal_monetary_totals": {
            "line_extension_amount": 100000,
            "tax_exclusive_amount": 100000,
            "tax_inclusive_amount": 119000,
            "payable_amount": 119000
        },
        "items": [
            {
                "description": "Producto 1",
                "quantity": 2,
                "price": 50000,
                "tax_totals": [{
                    "tax_amount": 9500,
                    "taxable_amount": 50000,
                    "percent": 19
                }]
            }
        ]
    }
}
```

2. `validar_datos_factura(data)` - Valida estructura antes de enviar

3. `extraer_datos_respuesta_factus(response)` - Extrae info de respuesta

**Criterios de aceptación:**
- [ ] Transformadores creados
- [ ] Mapeo completo de campos
- [ ] Validaciones implementadas
- [ ] Tests unitarios pasando
- [ ] Documentación completa

---

#### Tarea 9.4: Service de Facturación Electrónica
**Prioridad:** Alta | **Estimación:** 5 Story Points | **Etiquetas:** Backend, Business Logic

**Descripción:**
Implementar lógica de negocio para facturación electrónica.

**Archivo:** `ventas/facturacion_service.py`

**Métodos principales:**

1. `emitir_factura_electronica(venta_id)` - Emite factura de una venta
   - Validar que la venta pueda facturarse
   - Obtener configuración DIAN activa
   - Generar número de factura con consecutivo
   - Transformar datos a formato Factus
   - Llamar API de Factus
   - Guardar respuesta en venta
   - Actualizar consecutivo
   - Registrar en historial

2. `consultar_estado_factura(venta_id)` - Consulta estado en DIAN

3. `reenviar_factura(venta_id)` - Reintenta emisión fallida

4. `descargar_pdf_factura(venta_id)` - Descarga PDF desde Factus

5. `enviar_factura_email(venta_id, email)` - Envía por correo

6. `anular_factura(venta_id, motivo)` - Anula factura (nota crédito)

**Validaciones:**
- Venta debe estar TERMINADA
- Cliente debe tener datos completos
- No debe estar ya facturada
- Configuración DIAN debe estar activa
- Debe haber consecutivos disponibles
- Resolución debe estar vigente

**Manejo de errores:**
- Reintentos automáticos (3 intentos)
- Log de errores detallado
- Notificación al usuario
- Marcado de facturas pendientes

**Criterios de aceptación:**
- [ ] Todos los métodos implementados
- [ ] Validaciones robustas
- [ ] Manejo de errores completo
- [ ] Reintentos implementados
- [ ] Transacciones atómicas
- [ ] Logging detallado

---

#### Tarea 9.5: Endpoints de Facturación
**Prioridad:** Alta | **Estimación:** 3 Story Points | **Etiquetas:** Backend, API

**Descripción:**
Crear endpoints para facturación electrónica.

**Endpoints:**
- `POST /api/ventas/{id}/facturar/` - Emitir factura
- `GET /api/ventas/{id}/factura/estado/` - Consultar estado
- `POST /api/ventas/{id}/factura/reenviar/` - Reintentar
- `GET /api/ventas/{id}/factura/pdf/` - Descargar PDF
- `POST /api/ventas/{id}/factura/email/` - Enviar por email
- `POST /api/ventas/{id}/factura/anular/` - Anular factura

**Endpoints - Configuración:**
- `GET /api/facturacion/configuracion/` - Ver configuración
- `PUT /api/facturacion/configuracion/` - Actualizar configuración
- `POST /api/facturacion/validar-conexion/` - Probar conexión Factus

**Criterios de aceptación:**
- [ ] Todos los endpoints creados
- [ ] Facturación funcionando
- [ ] PDF descargándose
- [ ] Email enviándose
- [ ] Permisos aplicados
- [ ] Manejo de errores apropiado

---

#### Tarea 9.6: Frontend - Configuración DIAN
**Prioridad:** Media | **Estimación:** 4 Story Points | **Etiquetas:** Frontend

**Descripción:**
Crear interfaz para configuración de facturación electrónica.

**Componentes:**
1. **ConfiguracionDIANPage** - Página de configuración
2. **ConfiguracionEmpresaForm** - Datos de la empresa
3. **ConfiguracionResolucionForm** - Datos de resolución DIAN
4. **ConfiguracionFactusForm** - Credenciales Factus
5. **TestConexion** - Probar conexión

**Formulario de Configuración:**

**Datos de la Empresa:**
- NIT
- Nombre o Razón Social
- Dirección
- Teléfono
- Email
- Régimen Tributario
- Responsable de IVA

**Resolución DIAN:**
- Número de resolución
- Fecha de resolución
- Prefijo
- Rango desde - hasta
- Vigencia desde - hasta
- Consecutivo actual

**Credenciales Factus:**
- API Key
- Company ID
- Ambiente (Pruebas/Producción)

**Funcionalidades:**
- Validaciones en tiempo real
- Probar conexión con Factus
- Ver consecutivo disponible
- Alertas de vigencia y rango
- Guardar configuración

**Criterios de aceptación:**
- [ ] Formularios creados
- [ ] Validaciones funcionando
- [ ] Test de conexión operativo
- [ ] Guardado exitoso
- [ ] Alertas implementadas

---

#### Tarea 9.7: Frontend - Facturación en Punto de Venta
**Prioridad:** Alta | **Estimación:** 5 Story Points | **Etiquetas:** Frontend

**Descripción:**
Integrar facturación electrónica en el flujo de ventas.

**Modificaciones al VentaForm:**

**Opción de Facturar:**
- Checkbox "Emitir factura electrónica"
- Validación de datos del cliente
- Preview de factura antes de emitir

**Al finalizar venta:**
- Si está marcado "Facturar"
- Mostrar modal de confirmación
- Emitir factura automáticamente
- Mostrar resultado (éxito/error)
- Opciones: Imprimir, Enviar por email, Descargar PDF

**En VentaDetail:**
- Badge de estado de facturación
- Número de factura electrónica
- Botones de acción:
  - Descargar PDF
  - Enviar por email
  - Reimprimir
  - Ver estado DIAN
  - Reintentar (si falló)

**Componentes nuevos:**
1. **FacturarVentaModal** - Modal para facturar venta existente
2. **EstadoFacturaCard** - Card con info de factura
3. **ReintentarFacturacionButton** - Botón con lógica de reintento

**Criterios de aceptación:**
- [ ] Facturación integrada en punto de venta
- [ ] Modal de confirmación funcional
- [ ] Descarga de PDF funcionando
- [ ] Envío de email operativo
- [ ] Reintento funcionando
- [ ] Feedback visual apropiado
- [ ] Manejo de errores claro

---

## EPICA 9.5: Cierre Multitenant SaaS

### Descripcion de la Epica
Cerrar el modulo multitenant antes de iniciar la Epica 10 de IA. Mallor debe permitir operar como SaaS multiempresa en una sola base de datos, donde cada empresa tiene usuarios, datos fiscales, clientes, inventario, ventas, documentos electronicos, rangos Factus y permisos aislados.

Esta epica intermedia deja claro como se da de alta una nueva empresa, como se administra su informacion y como se garantiza que la IA futura consulte solo el contexto de la empresa activa.

### Objetivos
- Definir y construir el flujo de alta de nuevas empresas SaaS.
- Permitir que cada empresa administre su informacion fiscal y comercial.
- Gestionar usuarios, membresias y roles por empresa.
- Validar que el encabezado de documentos locales use los datos de la empresa activa.
- Consolidar reglas de aislamiento antes de conectar IA a los datos del negocio.
- Documentar el procedimiento operativo para onboarding de clientes.

---

#### Tarea 9.5.1: Definir Politica de Onboarding SaaS
**Prioridad:** Alta | **Estimacion:** 2 Story Points | **Etiquetas:** Producto, Requisitos, SaaS

**Decision recomendada:**
Para esta fase se adopta onboarding administrado por Mallor. Un administrador interno crea la empresa y el primer usuario propietario. El autoregistro publico queda diferido hasta que existan verificacion de correo, recuperacion de cuenta, control de planes, pagos, auditoria y reglas de abuso.

**Flujo operativo inicial:**
1. Cliente solicita acceso a Mallor.
2. Administrador interno crea la empresa.
3. Administrador interno crea el primer usuario.
4. El usuario queda asociado a la empresa como `PROPIETARIO`.
5. El usuario inicia sesion y completa configuracion.
6. La empresa configura Factus, rangos, clientes, productos y ventas.

**Criterios de aceptacion:**
- [x] Documento de decision creado o actualizado.
- [x] Queda claro si el alta de empresa es manual o por autoregistro.
- [x] Queda definido quien crea el primer usuario.
- [x] Queda definido que rol inicial recibe el primer usuario.
- [x] Queda documentado que el autoregistro queda fuera de alcance de esta fase.

---

#### Tarea 9.5.2: Administracion Interna de Empresas
**Prioridad:** Alta | **Estimacion:** 4 Story Points | **Etiquetas:** Backend, Frontend, SaaS

**Descripcion:**
Crear una vista administrativa para que un superadmin o administrador interno de Mallor pueda crear y gestionar empresas cliente.

**Campos minimos de Empresa:**
- NIT
- Digito de verificacion
- Razon social
- Nombre comercial
- Email
- Telefono
- Direccion
- Codigo de municipio
- Ambiente de facturacion
- Estado activo/inactivo

**Funcionalidades:**
- Crear empresa.
- Editar empresa.
- Activar/inactivar empresa.
- Ver usuarios asociados.
- Ver estado de configuracion Factus.
- Crear primer usuario propietario.

**Criterios de aceptacion:**
- [x] Existe pantalla o endpoint administrativo para crear empresas.
- [x] Solo un usuario autorizado de Mallor puede crear empresas.
- [x] No se permite duplicar NIT.
- [x] Al crear empresa se puede crear o asociar un usuario propietario.
- [x] Una empresa inactiva no puede operar ventas ni facturacion.

---

#### Tarea 9.5.3: Gestion de Usuarios por Empresa
**Prioridad:** Alta | **Estimacion:** 5 Story Points | **Etiquetas:** Backend, Frontend, Seguridad

**Descripcion:**
Permitir que un propietario o administrador de empresa gestione usuarios dentro de su propia empresa sin poder afectar empresas ajenas.

**Roles por empresa:**
- `PROPIETARIO`: controla empresa, usuarios, Factus y datos fiscales.
- `ADMIN`: gestiona operacion y configuracion, excepto transferencia de propiedad.
- `EMPLEADO`: opera ventas, inventario y consultas segun permisos.

**Funcionalidades:**
- Listar usuarios de la empresa activa.
- Crear usuario dentro de la empresa activa.
- Editar rol dentro de la empresa.
- Activar/inactivar membresia.
- Evitar eliminar o degradar al ultimo propietario.
- Permitir que un usuario pertenezca a varias empresas.

**Criterios de aceptacion:**
- [x] Un propietario puede crear empleados para su empresa.
- [x] Un administrador no puede editar usuarios de otra empresa.
- [x] Un empleado no puede gestionar usuarios ni Factus.
- [x] No se puede dejar una empresa sin propietario activo.
- [x] El selector de empresa sigue funcionando para usuarios multiempresa.

---

#### Tarea 9.5.4: Pantalla Mi Empresa
**Prioridad:** Alta | **Estimacion:** 4 Story Points | **Etiquetas:** Frontend, Backend, UX

**Descripcion:**
Crear una pantalla de configuracion para que cada empresa edite su informacion comercial y fiscal.

**Ruta sugerida:**
`Configuracion > Mi empresa`

**Campos editables por propietario/admin:**
- Razon social
- Nombre comercial
- Email
- Telefono
- Direccion
- Codigo de municipio
- Digito de verificacion
- Ambiente de facturacion

**Reglas:**
- El NIT debe requerir cuidado especial: permitir edicion solo a `PROPIETARIO` o superadmin.
- Los datos deben usarse en encabezados de documentos locales, reportes y vistas operativas.
- La informacion debe coincidir con RUT/DIAN/Factus cuando se use facturacion electronica.

**Criterios de aceptacion:**
- [x] La empresa puede ver sus datos actuales.
- [x] Propietario/admin puede editar informacion permitida.
- [x] Empleado solo puede consultar o no acceder, segun permisos.
- [x] Cambios quedan asociados solo a la empresa activa.
- [x] Los formularios muestran validaciones claras.

---

#### Tarea 9.5.5: Encabezados y Datos de Empresa en Documentos
**Prioridad:** Media | **Estimacion:** 3 Story Points | **Etiquetas:** Backend, Frontend, Reportes

**Descripcion:**
Asegurar que los documentos generados por Mallor usen los datos de la empresa activa como encabezado.

**Documentos afectados:**
- Recibos POS.
- Reportes PDF/Excel.
- Comprobantes internos.
- Vistas imprimibles.
- Documentos locales que no sean el PDF oficial generado por Factus.

**Nota fiscal:**
El PDF oficial de factura electronica viene de Factus y debe reflejar los datos registrados ante Factus/DIAN. Mallor debe usar los datos de `Empresa` para documentos propios y para validar consistencia operativa.

**Criterios de aceptacion:**
- [x] Recibos y reportes muestran razon social o nombre comercial de la empresa activa.
- [x] Se muestra NIT y datos de contacto cuando aplique.
- [x] Una empresa no puede generar documentos con datos de otra.
- [x] Las descargas respetan `empresa_id`.

---

#### Tarea 9.5.6: Endurecimiento de Permisos Multitenant
**Prioridad:** Alta | **Estimacion:** 4 Story Points | **Etiquetas:** Backend, Seguridad, Testing

**Descripcion:**
Completar pruebas y reglas de seguridad para confirmar que ningun endpoint permita acceso cruzado entre empresas.

**Escenarios minimos:**
- Usuario de Empresa A no consulta cliente de Empresa B.
- Usuario de Empresa A no consulta venta de Empresa B.
- Usuario de Empresa A no descarga PDF/XML de Empresa B.
- Usuario de Empresa A no modifica productos de Empresa B.
- Usuario de Empresa A no ve configuracion Factus de Empresa B.
- Usuario sin membresia no puede seleccionar Empresa B via `X-Empresa-Id`.

**Criterios de aceptacion:**
- [x] Pruebas de acceso cruzado agregadas para endpoints criticos.
- [x] Todos los querysets operativos filtran por empresa activa.
- [x] Los errores devuelven 403 o 404 segun corresponda.
- [x] No se filtran datos sensibles en mensajes de error.

---

#### Tarea 9.5.7: Documentacion Operativa Multitenant
**Prioridad:** Media | **Estimacion:** 2 Story Points | **Etiquetas:** Documentacion, Operaciones

**Descripcion:**
Actualizar la documentacion para que cualquier desarrollador o administrador entienda como dar de alta y operar una nueva empresa.

**Documentos a actualizar o crear:**
- `docs/MULTITENANT_FACTUS.md`
- Guia de alta de cliente SaaS
- Checklist de cierre de Epica 9

**Contenido minimo:**
- Modelo de datos: `Empresa` y `EmpresaUsuario`.
- Roles por empresa.
- Flujo de seleccion de empresa activa.
- Alta manual de nueva empresa.
- Configuracion Factus por empresa.
- Pruebas obligatorias antes de pasar a Epica 10.

**Criterios de aceptacion:**
- [x] Documentacion actualizada con estado real del modulo.
- [x] Ya no aparecen como pendientes tareas implementadas.
- [x] Existe checklist claro para alta de nueva empresa.
- [x] Existe checklist para validar aislamiento antes de IA.

---

#### Tarea 9.5.8: Criterio de Cierre Antes de Epica 10
**Prioridad:** Alta | **Estimacion:** 1 Story Point | **Etiquetas:** QA, Producto

**Criterio final de aceptacion:**
Antes de iniciar la Epica 10, Mallor debe demostrar el siguiente flujo completo:

1. Crear empresa nueva.
2. Crear usuario propietario para esa empresa.
3. Iniciar sesion con ese usuario.
4. Ver solo los datos de esa empresa.
5. Editar informacion fiscal/comercial de la empresa.
6. Configurar credenciales Factus sandbox.
7. Sincronizar rango.
8. Crear cliente, producto y venta.
9. Emitir factura electronica.
10. Confirmar que otra empresa no puede ver venta, cliente, producto, PDF/XML ni configuracion Factus.

**Motivo de bloqueo para Epica 10:**
La IA consultara datos del negocio. Si el contexto de empresa y permisos no esta cerrado, la IA podria mezclar o exponer informacion entre empresas.

---

## ÉPICA 10: Módulo de IA

### 📋 Descripción de la Épica
Implementar asistente de inteligencia artificial con DeepSeek API para consultas en lenguaje natural sobre datos del negocio mediante CLI y chat interactivo.

### 🎯 Objetivos
- Integración con DeepSeek API
- CLI personalizado para comandos IA
- Chat interactivo en frontend
- Consultas en lenguaje natural
- Acceso directo a base de datos (lectura)
- Respuestas contextualizadas

---

#### Tarea 10.1: Configuración de DeepSeek API
**Prioridad:** Media | **Estimación:** 2 Story Points | **Etiquetas:** Backend, Integration

**Descripción:**
Configurar integración con DeepSeek API.

**Dependencias técnicas:**
```bash
pip install openai==1.3.0  # DeepSeek es compatible con OpenAI SDK
```

**Configuración en settings.py:**
```python
DEEPSEEK_API = {
    'API_KEY': config('DEEPSEEK_API_KEY'),
    'BASE_URL': 'https://api.deepseek.com/v1',
    'MODEL': 'deepseek-chat',
    'MAX_TOKENS': 2000,
    'TEMPERATURE': 0.7,
}
```

**Archivo:** `IA/deepseek_client.py`

**Clase DeepSeekClient:**
```python
class DeepSeekClient:
    def __init__(self):
        self.client = OpenAI(
            api_key=settings.DEEPSEEK_API['API_KEY'],
            base_url=settings.DEEPSEEK_API['BASE_URL']
        )

    def chat_completion(self, messages, system_prompt=None):
        """Llama a DeepSeek API"""
        pass

    def stream_completion(self, messages, system_prompt=None):
        """Streaming de respuesta"""
        pass
```

**Criterios de aceptación:**
- [ ] Cliente API configurado
- [ ] Credenciales en .env
- [ ] Conexión funcionando
- [ ] Manejo de errores
- [ ] Límites de rate implementados

---

#### Tarea 10.2: Sistema de Contexto de Base de Datos
**Prioridad:** Alta | **Estimación:** 5 Story Points | **Etiquetas:** Backend, AI

**Descripción:**
Crear sistema que permite a la IA acceder a información de la base de datos de forma segura.

**Archivo:** `IA/database_context.py`

**Funciones de contexto:**

1. `obtener_esquema_base_datos()` - Retorna esquema de las tablas
```python
{
    "productos": {
        "descripcion": "Tabla de productos del inventario",
        "campos": ["nombre", "precio_venta", "existencias", ...],
        "relaciones": ["categoria"]
    },
    "ventas": {...},
    ...
}
```

2. `ejecutar_consulta_segura(query)` - Ejecuta queries de lectura
   - Solo permite SELECT
   - Previene SQL injection
   - Limita resultados
   - Timeout configurado

3. `obtener_estadisticas_rapidas()` - Stats frecuentes precalculadas

4. `buscar_productos(query)` - Búsqueda de productos

5. `buscar_clientes(query)` - Búsqueda de clientes

6. `obtener_ventas_periodo(fecha_inicio, fecha_fin)` - Ventas

**Sistema de Prompts:**

**Archivo:** `IA/prompts.py`

**System Prompt para la IA:**
```python
SYSTEM_PROMPT = """
Eres un asistente inteligente de Mallor, un sistema de gestión empresarial.
Tienes acceso a la base de datos del negocio y puedes responder preguntas sobre:
- Inventario y productos
- Ventas realizadas
- Clientes y proveedores
- Estadísticas del negocio

Esquema de la base de datos:
{esquema}

Instrucciones:
- Responde en español de forma clara y concisa
- Si necesitas consultar la base de datos, genera un query SQL válido
- Solo usa SELECT queries
- Presenta datos en formato legible
- Si no tienes información suficiente, pide aclaración
"""
```

**Criterios de aceptación:**
- [ ] Sistema de contexto creado
- [ ] Queries seguras implementadas
- [ ] Esquema generándose correctamente
- [ ] Prompts definidos
- [ ] Validaciones de seguridad

---

#### Tarea 10.3: CLI Personalizado para IA
**Prioridad:** Media | **Estimación:** 4 Story Points | **Etiquetas:** Backend, CLI

**Descripción:**
Crear comandos Django personalizados para interactuar con la IA desde terminal.

**Archivo:** `IA/management/commands/ia_chat.py`

**Comando:** `python manage.py ia_chat`

**Funcionalidades del CLI:**
- Modo interactivo (chat continuo)
- Modo de consulta única
- Historial de conversación
- Comandos especiales:
  - `/help` - Ayuda
  - `/clear` - Limpiar pantalla
  - `/history` - Ver historial
  - `/stats` - Estadísticas rápidas
  - `/exit` - Salir

**Ejemplo de uso:**
```bash
python manage.py ia_chat

> ¿Cuántos productos tengo en inventario?
🤖 Tienes 245 productos en tu inventario actual.

> ¿Cuáles son los 5 productos más vendidos este mes?
🤖 Los productos más vendidos este mes son:
1. Producto A - 120 unidades
2. Producto B - 98 unidades
...

> /stats
📊 Estadísticas Rápidas:
- Ventas hoy: $1,250,000
- Productos en inventario: 245
- Clientes registrados: 89
...
```

**Criterios de aceptación:**
- [ ] Comando CLI creado
- [ ] Modo interactivo funcional
- [ ] Comandos especiales implementados
- [ ] Historial funcionando
- [ ] Colores y formato en terminal
- [ ] Manejo de errores

---

#### Tarea 10.4: Service de IA
**Prioridad:** Alta | **Estimación:** 6 Story Points | **Etiquetas:** Backend, AI

**Descripción:**
Implementar lógica de negocio del asistente IA.

**Archivo:** `IA/services.py`

**Métodos principales:**

1. `procesar_consulta(texto, usuario, contexto_conversacion)` - Procesa consulta
   - Analizar intención
   - Determinar si necesita datos
   - Ejecutar query si aplica
   - Generar respuesta con IA
   - Guardar en historial

2. `generar_sql_desde_lenguaje_natural(texto)` - NL to SQL
   - Usar IA para generar SQL
   - Validar sintaxis
   - Validar permisos
   - Ejecutar y retornar resultados

3. `formatear_respuesta(datos)` - Formatea datos para presentación

4. `obtener_historial_conversacion(usuario, limite)` - Historial

5. `limpiar_historial_usuario(usuario)` - Limpiar historial

**Tipos de consultas soportadas:**

**Inventario:**
- "¿Cuántos productos tengo?"
- "¿Cuál es el valor de mi inventario?"
- "¿Qué productos están bajo en stock?"
- "Muéstrame los productos de la categoría X"

**Ventas:**
- "¿Cuánto vendí hoy?"
- "¿Cuáles son las ventas de esta semana?"
- "¿Quién es mi mejor cliente?"
- "¿Cuánto he vendido del producto X?"

**Clientes:**
- "¿Cuántos clientes tengo?"
- "¿Quiénes son mis mejores clientes?"
- "¿Cuánto me debe el cliente X?"

**Estadísticas:**
- "Muéstrame las estadísticas del mes"
- "¿Cuál es mi producto más vendido?"
- "¿Cuánto gané esta semana?"

**Lógica de procesamiento:**
1. Recibir consulta del usuario
2. Agregar al contexto de conversación
3. Construir prompt con:
   - System prompt
   - Esquema de BD
   - Historial de conversación
   - Consulta actual
4. Llamar a DeepSeek API
5. Si la IA sugiere un query SQL:
   - Validar query
   - Ejecutar
   - Incluir resultados en contexto
   - Llamar IA nuevamente para formatear
6. Retornar respuesta formateada
7. Guardar en historial

**Criterios de aceptación:**
- [ ] Todos los métodos implementados
- [ ] NL to SQL funcionando
- [ ] Consultas comunes soportadas
- [ ] Historial guardándose
- [ ] Respuestas contextualizadas
- [ ] Manejo de errores robusto

---

#### Tarea 10.5: Modelo de Historial de Conversaciones
**Prioridad:** Baja | **Estimación:** 2 Story Points | **Etiquetas:** Backend, Models

**Descripción:**
Crear modelo para almacenar historial de conversaciones con la IA.

**Modelo ConversacionIA:**
- id (AutoField, PK)
- usuario (ForeignKey a Usuario)
- sesion_id (UUIDField) - para agrupar conversaciones
- consulta (TextField)
- respuesta (TextField)
- query_sql (TextField, blank=True) - si se ejecutó query
- datos_retornados (JSONField, blank=True)
- tiempo_respuesta (FloatField) - en segundos
- fecha (DateTimeField, auto_now_add)

**Métodos:**
- `obtener_contexto_sesion(sesion_id, limite)` - Últimas N conversaciones

**Criterios de aceptación:**
- [ ] Modelo creado
- [ ] Migraciones aplicadas
- [ ] Índices optimizados

---

#### Tarea 10.6: Endpoints de IA
**Prioridad:** Alta | **Estimación:** 3 Story Points | **Etiquetas:** Backend, API

**Descripción:**
Crear endpoints para el asistente IA.

**Endpoints:**
- `POST /api/ia/chat/` - Enviar consulta
- `POST /api/ia/chat/stream/` - Respuesta streaming (WebSocket)
- `GET /api/ia/historial/` - Obtener historial
- `DELETE /api/ia/historial/` - Limpiar historial
- `GET /api/ia/sugerencias/` - Consultas sugeridas
- `POST /api/ia/feedback/` - Feedback sobre respuesta

**Request - Chat:**
```json
{
    "consulta": "¿Cuánto vendí hoy?",
    "sesion_id": "uuid-opcional"
}
```

**Response - Chat:**
```json
{
    "respuesta": "Hoy has vendido un total de $1,250,000...",
    "sesion_id": "uuid",
    "tiempo_respuesta": 2.5,
    "query_ejecutado": "SELECT SUM(total)...",
    "datos": {...}
}
```

**Criterios de aceptación:**
- [ ] Endpoints creados
- [ ] Chat funcionando
- [ ] Streaming implementado (opcional)
- [ ] Historial accesible
- [ ] Feedback registrándose

---

#### Tarea 10.7: Frontend - Chat IA
**Prioridad:** Alta | **Estimación:** 8 Story Points | **Etiquetas:** Frontend

**Descripción:**
Crear interfaz de chat interactivo con la IA.

**Componentes:**
1. **IAPage** - Página del asistente
2. **ChatContainer** - Contenedor del chat
3. **MessageList** - Lista de mensajes
4. **Message** - Componente mensaje individual
5. **ChatInput** - Input con envío
6. **SugerenciasRapidas** - Botones de consultas comunes
7. **HistorialSidebar** - Sidebar con historial

**Diseño del Chat:**

**Layout:**
- Sidebar izquierdo con historial de sesiones
- Área principal de chat
- Input fijo en la parte inferior

**Mensajes:**
- Mensajes del usuario (derecha, color primario)
- Mensajes de la IA (izquierda, color secundario)
- Timestamp
- Avatar/icono
- Indicador de "escribiendo..." (typing)

**Input:**
- Textarea autoexpandible
- Botón de enviar
- Contador de caracteres
- Soporte para Enter (enviar) y Shift+Enter (nueva línea)

**Sugerencias Rápidas:**
Botones con consultas comunes:
- "¿Cuánto vendí hoy?"
- "Productos más vendidos"
- "Valor del inventario"
- "Mejores clientes"
- "Estadísticas del mes"

**Funcionalidades:**

**Chat:**
- Enviar consulta al backend
- Mostrar indicador de carga
- Renderizar respuesta
- Scroll automático al último mensaje
- Copiar respuesta
- Compartir conversación

**Formato de Respuestas:**
- Texto plano
- Listas numeradas/con viñetas
- Tablas de datos
- Links
- Código SQL (con syntax highlight)

**Historial:**
- Lista de sesiones anteriores
- Cargar sesión al hacer clic
- Crear nueva sesión
- Eliminar sesión

**Criterios de aceptación:**
- [ ] Chat completamente funcional
- [ ] Mensajes renderizando correctamente
- [ ] Typing indicator funcionando
- [ ] Sugerencias implementadas
- [ ] Historial funcionando
- [ ] Formato de respuestas rico
- [ ] Responsive design
- [ ] Scroll automático
- [ ] Performance optimizado

---

## ÉPICA 11: Testing y Calidad

### 📋 Descripción de la Épica
Implementar suite completa de pruebas para garantizar calidad del código y funcionamiento correcto de todas las funcionalidades.

### 🎯 Objetivos
- Tests unitarios del backend (Django)
- Tests de integración de API
- Tests de servicios y lógica de negocio
- Tests frontend (React)
- Cobertura mínima del 80%
- CI/CD con tests automatizados

---

#### Tarea 11.1: Configuración de Testing Backend
**Prioridad:** Alta | **Estimación:** 2 Story Points | **Etiquetas:** Backend, Testing

**Descripción:**
Configurar entorno de testing para Django.

**Dependencias técnicas:**
```bash
pip install pytest==7.4.3
pip install pytest-django==4.7.0
pip install pytest-cov==4.1.0
pip install factory-boy==3.3.0
pip install faker==20.1.0
```

**Configuración:**

**Archivo:** `pytest.ini`
```ini
[pytest]
DJANGO_SETTINGS_MODULE = config.settings
python_files = tests.py test_*.py *_tests.py
addopts = --cov=. --cov-report=html --cov-report=term
```

**Archivo:** `conftest.py` (root del proyecto)
- Configurar fixtures globales
- Base de datos de test
- Usuarios de test
- Factories

**Criterios de aceptación:**
- [ ] Pytest configurado
- [ ] Base de datos de test funcionando
- [ ] Fixtures básicas creadas
- [ ] Cobertura configurada

---

#### Tarea 11.2: Factories y Fixtures
**Prioridad:** Alta | **Estimación:** 3 Story Points | **Etiquetas:** Backend, Testing

**Descripción:**
Crear factories para generación de datos de prueba.

**Archivo:** `tests/factories.py`

**Factories a crear:**
1. **UserFactory** - Usuarios
2. **CategoriaFactory** - Categorías
3. **ProductoFactory** - Productos
4. **ClienteFactory** - Clientes
5. **ProveedorFactory** - Proveedores
6. **VentaFactory** - Ventas
7. **DetalleVentaFactory** - Detalles de venta
8. **AbonoFactory** - Abonos
9. **FacturaCompraFactory** - Facturas

**Ejemplo:**
```python
class ProductoFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Producto

    nombre = factory.Faker('word')
    codigo_interno = factory.Sequence(lambda n: f'PROD{n:05d}')
    precio_compra = factory.Faker('pydecimal', left_digits=5, right_digits=2, positive=True)
    precio_venta = factory.Faker('pydecimal', left_digits=5, right_digits=2, positive=True)
    existencias = factory.Faker('pyint', min_value=0, max_value=1000)
```

**Criterios de aceptación:**
- [ ] Todas las factories creadas
- [ ] Datos realistas generándose
- [ ] Relaciones funcionando

---

#### Tarea 11.3: Tests de Modelos
**Prioridad:** Alta | **Estimación:** 5 Story Points | **Etiquetas:** Backend, Testing

**Descripción:**
Crear tests unitarios para todos los modelos.

**Tests a implementar por modelo:**
- Creación básica
- Validaciones de campos
- Métodos del modelo
- Relaciones
- Signals (si aplican)

**Ejemplo - test_producto.py:**
```python
def test_crear_producto():
    """Test crear producto básico"""
    producto = ProductoFactory()
    assert producto.id is not None
    assert producto.nombre

def test_calcular_valor_inventario():
    """Test método calcular_valor_inventario"""
    producto = ProductoFactory(precio_compra=100, existencias=10)
    assert producto.calcular_valor_inventario() == 1000

def test_actualizar_stock():
    """Test actualizar stock correctamente"""
    producto = ProductoFactory(existencias=10)
    producto.actualizar_stock(5)
    assert producto.existencias == 15
```

**Archivos de test:**
- `tests/inventario/test_models.py`
- `tests/ventas/test_models.py`
- `tests/cliente/test_models.py`
- etc.

**Criterios de aceptación:**
- [ ] Tests para todos los modelos
- [ ] Validaciones probadas
- [ ] Métodos probados
- [ ] Relaciones probadas
- [ ] Todos los tests pasando

---

#### Tarea 11.4: Tests de Serializers
**Prioridad:** Alta | **Estimación:** 4 Story Points | **Etiquetas:** Backend, Testing

**Descripción:**
Crear tests para todos los serializers.

**Tests por serializer:**
- Serialización (model → JSON)
- Deserialización (JSON → model)
- Validaciones custom
- Campos calculados

**Ejemplo:**
```python
def test_producto_serializer():
    """Test serialización de producto"""
    producto = ProductoFactory()
    serializer = ProductoSerializer(producto)
    data = serializer.data

    assert data['nombre'] == producto.nombre
    assert data['precio_venta'] == str(producto.precio_venta)

def test_producto_create_serializer_validacion():
    """Test validación de datos al crear"""
    data = {
        'nombre': 'Producto Test',
        'precio_compra': -100,  # Precio negativo (inválido)
    }
    serializer = ProductoCreateSerializer(data=data)
    assert not serializer.is_valid()
    assert 'precio_compra' in serializer.errors
```

**Criterios de aceptación:**
- [ ] Tests para todos los serializers
- [ ] Validaciones probadas
- [ ] Campos calculados verificados
- [ ] Todos los tests pasando

---

#### Tarea 11.5: Tests de Services (Lógica de Negocio)
**Prioridad:** Alta | **Estimación:** 8 Story Points | **Etiquetas:** Backend, Testing

**Descripción:**
Crear tests exhaustivos para toda la lógica de negocio.

**Tests críticos por módulo:**

**Inventario:**
- Crear producto
- Actualizar stock
- Procesar factura de compra
- Validar disponibilidad
- Calcular valor de inventario

**Ventas:**
- Crear venta con detalles
- Actualizar inventario al vender
- Calcular totales correctamente
- Cancelar venta
- Registrar abono
- Actualizar estado de pago

**Clientes:**
- Crear cliente
- Validar crédito disponible
- Calcular saldo pendiente

**Ejemplo - test_ventas_service.py:**
```python
@pytest.mark.django_db
def test_crear_venta_actualiza_inventario():
    """Test que crear venta reduce el stock"""
    producto = ProductoFactory(existencias=100)
    cliente = ClienteFactory()

    venta_data = {
        'cliente': cliente.id,
        'detalles': [
            {'producto': producto.id, 'cantidad': 10}
        ]
    }

    venta = crear_venta(venta_data)

    producto.refresh_from_db()
    assert producto.existencias == 90
    assert venta.estado == 'TERMINADA'

@pytest.mark.django_db
def test_registrar_abono_actualiza_estado():
    """Test que registrar abono actualiza estado de pago"""
    venta = VentaFactory(total=100000, total_abonado=0, estado_pago='PENDIENTE')

    registrar_abono(venta.id, {'monto_abonado': 50000})

    venta.refresh_from_db()
    assert venta.total_abonado == 50000
    assert venta.estado_pago == 'PARCIAL'
    assert venta.saldo_pendiente == 50000
```

**Criterios de aceptación:**
- [ ] Tests para todos los services críticos
- [ ] Casos positivos y negativos
- [ ] Validaciones probadas
- [ ] Transacciones probadas
- [ ] Todos los tests pasando
- [ ] Cobertura > 80%

---

#### Tarea 11.6: Tests de API Endpoints
**Prioridad:** Alta | **Estimación:** 6 Story Points | **Etiquetas:** Backend, Testing

**Descripción:**
Crear tests de integración para todos los endpoints.

**Tests por endpoint:**
- GET (list y detail)
- POST (create)
- PUT/PATCH (update)
- DELETE
- Permisos
- Filtros
- Paginación
- Códigos HTTP

**Ejemplo:**
```python
@pytest.mark.django_db
def test_listar_productos(api_client, user):
    """Test listar productos"""
    ProductoFactory.create_batch(5)
    api_client.force_authenticate(user=user)

    response = api_client.get('/api/inventario/productos/')

    assert response.status_code == 200
    assert len(response.data['results']) == 5

@pytest.mark.django_db
def test_crear_producto_sin_permiso(api_client, user_empleado):
    """Test que empleado no puede crear productos"""
    api_client.force_authenticate(user=user_empleado)

    data = {'nombre': 'Test', 'precio_venta': 1000}
    response = api_client.post('/api/inventario/productos/', data)

    assert response.status_code == 403
```

**Criterios de aceptación:**
- [ ] Tests para todos los endpoints
- [ ] CRUD completo probado
- [ ] Permisos validados
- [ ] Filtros probados
- [ ] Todos los tests pasando

---

#### Tarea 11.7: Configuración de Testing Frontend
**Prioridad:** Media | **Estimación:** 2 Story Points | **Etiquetas:** Frontend, Testing

**Descripción:**
Configurar entorno de testing para React.

**Dependencias:**
```bash
npm install --save-dev @testing-library/react
npm install --save-dev @testing-library/jest-dom
npm install --save-dev @testing-library/user-event
npm install --save-dev vitest
npm install --save-dev jsdom
```

**Configuración:**

**Archivo:** `vite.config.js`
```javascript
export default {
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/tests/setup.js',
  },
}
```

**Criterios de aceptación:**
- [ ] Vitest configurado
- [ ] Testing Library instalado
- [ ] Setup completado
- [ ] Tests de ejemplo pasando

---

#### Tarea 11.8: Tests de Componentes React
**Prioridad:** Media | **Estimación:** 6 Story Points | **Etiquetas:** Frontend, Testing

**Descripción:**
Crear tests para componentes críticos de React.

**Componentes a testear:**
- Formularios (ProductoForm, VentaForm, etc.)
- Listas (ProductosList, VentasList, etc.)
- Componentes de negocio (PuntoVenta, GestionAbonos, etc.)

**Tests por componente:**
- Renderizado correcto
- Interacciones del usuario
- Validaciones de formularios
- Llamadas a API
- Estados y props

**Ejemplo:**
```javascript
import { render, screen, fireEvent } from '@testing-library/react';
import { ProductoForm } from './ProductoForm';

test('renderiza formulario de producto', () => {
  render(<ProductoForm />);
  expect(screen.getByLabelText(/nombre/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/precio/i)).toBeInTheDocument();
});

test('valida campos requeridos', async () => {
  render(<ProductoForm />);
  const submitButton = screen.getByText(/guardar/i);

  fireEvent.click(submitButton);

  expect(await screen.findByText(/nombre es requerido/i)).toBeInTheDocument();
});
```

**Criterios de aceptación:**
- [ ] Tests para componentes críticos
- [ ] Renderizado probado
- [ ] Interacciones probadas
- [ ] Todos los tests pasando

---

#### Tarea 11.9: Tests E2E (Opcional)
**Prioridad:** Baja | **Estimación:** 4 Story Points | **Etiquetas:** Testing, E2E

**Descripción:**
Crear tests end-to-end para flujos críticos.

**Dependencias:**
```bash
npm install --save-dev @playwright/test
```

**Flujos a testear:**
1. Login y navegación
2. Crear una venta completa
3. Agregar producto al inventario
4. Registrar abono
5. Emitir factura electrónica

**Criterios de aceptación:**
- [ ] Playwright configurado
- [ ] Flujos críticos probados
- [ ] Tests pasando en CI

---

#### Tarea 11.10: Configuración de CI/CD con GitHub Actions
**Prioridad:** Media | **Estimación:** 3 Story Points | **Etiquetas:** DevOps, CI/CD

**Descripción:**
Configurar pipeline de CI/CD con tests automatizados.

**Archivo:** `.github/workflows/tests.yml`

```yaml
name: Tests

on: [push, pull_request]

jobs:
  backend-tests:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - name: Install dependencies
        run: |
          pip install -r requirements.txt
      - name: Run tests
        run: |
          pytest --cov
      - name: Upload coverage
        uses: codecov/codecov-action@v3

  frontend-tests:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3
      - name: Set up Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: |
          cd frontend
          npm ci
      - name: Run tests
        run: |
          cd frontend
          npm test
```

**Criterios de aceptación:**
- [ ] GitHub Actions configurado
- [ ] Tests corriendo automáticamente
- [ ] Cobertura reportándose
- [ ] Badges en README

---

## ÉPICA 12: Autenticación JWT

### 📋 Descripción de la Épica
Implementar sistema de autenticación seguro con JWT, incluyendo login, logout, refresh tokens y protección de endpoints. Se implementa después de testing para facilitar desarrollo inicial.

### 🎯 Objetivos
- Sistema de autenticación con JWT
- Login y logout
- Refresh tokens
- Middleware de autenticación
- Protección de endpoints
- Manejo de expiración de tokens

---

#### Tarea 12.1: Instalación y Configuración de JWT
**Prioridad:** Alta | **Estimación:** 2 Story Points | **Etiquetas:** Backend, Security

**Descripción:**
Instalar y configurar djangorestframework-simplejwt.

**Dependencias técnicas:**
```bash
pip install djangorestframework-simplejwt==5.3.1
```

**Configuración en settings.py:**
```python
INSTALLED_APPS = [
    ...
    'rest_framework_simplejwt',
]

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'AUTH_HEADER_TYPES': ('Bearer',),
}
```

**Criterios de aceptación:**
- [ ] SimpleJWT instalado
- [ ] Configuración en settings
- [ ] Variables configuradas
- [ ] Migraciones aplicadas

---

#### Tarea 12.2: Endpoints de Autenticación
**Prioridad:** Alta | **Estimación:** 3 Story Points | **Etiquetas:** Backend, API

**Descripción:**
Crear endpoints para login, refresh y logout.

**Endpoints:**
- `POST /api/auth/login/` - Login con credenciales
- `POST /api/auth/refresh/` - Refrescar access token
- `POST /api/auth/logout/` - Logout (blacklist token)
- `GET /api/auth/me/` - Obtener usuario actual

**Request - Login:**
```json
{
    "username": "usuario",
    "password": "contraseña"
}
```

**Response - Login:**
```json
{
    "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
    "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc...",
    "user": {
        "id": 1,
        "username": "usuario",
        "email": "usuario@email.com",
        "role": "ADMIN"
    }
}
```

**Implementación:**

**Archivo:** `usuario/views.py`

```python
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken

class LoginView(TokenObtainPairView):
    """Vista personalizada de login"""
    serializer_class = CustomTokenObtainPairSerializer

class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data["refresh"]
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response(status=status.HTTP_205_RESET_CONTENT)
        except Exception:
            return Response(status=status.HTTP_400_BAD_REQUEST)
```

**Criterios de aceptación:**
- [ ] Endpoints de auth creados
- [ ] Login funcionando
- [ ] Refresh funcionando
- [ ] Logout funcionando
- [ ] Tokens generándose correctamente

---

#### Tarea 12.3: Serializers de Autenticación
**Prioridad:** Alta | **Estimación:** 2 Story Points | **Etiquetas:** Backend

**Descripción:**
Crear serializers personalizados para autenticación.

**Serializers:**

1. **CustomTokenObtainPairSerializer** - Login con info adicional
```python
class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)

        # Agregar info del usuario
        data['user'] = {
            'id': self.user.id,
            'username': self.user.username,
            'email': self.user.email,
            'role': self.user.role,
            'first_name': self.user.first_name,
            'last_name': self.user.last_name,
        }

        return data
```

2. **ChangePasswordSerializer** - Cambiar contraseña
3. **ResetPasswordSerializer** - Resetear contraseña

**Criterios de aceptación:**
- [ ] Serializers creados
- [ ] Validaciones implementadas
- [ ] Info adicional incluida

---

#### Tarea 12.4: Middleware y Permisos
**Prioridad:** Alta | **Estimación:** 3 Story Points | **Etiquetas:** Backend, Security

**Descripción:**
Implementar middleware de autenticación y sistema de permisos.

**Permisos personalizados:**

**Archivo:** `usuario/permissions.py`

```python
class IsAdmin(BasePermission):
    """Solo administradores"""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'ADMIN'

class IsAdminOrReadOnly(BasePermission):
    """Admin puede todo, otros solo lectura"""
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return request.user.is_authenticated
        return request.user.is_authenticated and request.user.role == 'ADMIN'

class IsOwnerOrAdmin(BasePermission):
    """Dueño del recurso o admin"""
    def has_object_permission(self, request, view, obj):
        if request.user.role == 'ADMIN':
            return True
        return obj.usuario == request.user
```

**Aplicar permisos en views:**
```python
class ProductoViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsAdminOrReadOnly]
```

**Criterios de aceptación:**
- [ ] Permisos personalizados creados
- [ ] Permisos aplicados en endpoints
- [ ] Validaciones funcionando
- [ ] Solo usuarios autenticados acceden

---

#### Tarea 12.5: Actualizar Endpoints con Autenticación
**Prioridad:** Alta | **Estimación:** 4 Story Points | **Etiquetas:** Backend

**Descripción:**
Actualizar todos los endpoints para requerir autenticación.

**Tareas:**
1. Agregar `permission_classes` a todas las vistas
2. Aplicar permisos según rol
3. Validar usuario en servicios
4. Registrar usuario en operaciones

**Permisos por módulo:**

**Inventario:**
- Listar/Ver: Autenticado
- Crear/Editar: Admin
- Eliminar: Admin

**Ventas:**
- Listar/Ver: Autenticado
- Crear: Autenticado
- Editar: Admin
- Eliminar: Admin
- Facturar: Admin

**Clientes/Proveedores:**
- Todo: Autenticado
- Eliminar: Admin

**Informes:**
- Todo: Admin

**Configuración:**
- Todo: Admin

**Criterios de aceptación:**
- [ ] Todos los endpoints protegidos
- [ ] Permisos aplicados correctamente
- [ ] Tests actualizados
- [ ] Usuario registrado en operaciones

---

#### Tarea 12.6: Frontend - Sistema de Autenticación
**Prioridad:** Alta | **Estimación:** 6 Story Points | **Etiquetas:** Frontend

**Descripción:**
Implementar sistema completo de autenticación en frontend.

**Componentes:**
1. **LoginPage** - Página de login
2. **ProtectedRoute** - Componente para rutas protegidas
3. **AuthProvider** - Context de autenticación
4. **useAuth** - Hook personalizado

**Funcionalidades:**

**AuthProvider (Context):**
```javascript
const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const login = async (username, password) => {
    const response = await api.post('/auth/login/', { username, password });
    const { access, refresh, user } = response.data;

    localStorage.setItem('accessToken', access);
    localStorage.setItem('refreshToken', refresh);
    setUser(user);
  };

  const logout = async () => {
    const refresh = localStorage.getItem('refreshToken');
    await api.post('/auth/logout/', { refresh });
    localStorage.clear();
    setUser(null);
  };

  const refreshToken = async () => {
    // Lógica de refresh
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
```

**Interceptor de Axios:**
```javascript
// Agregar token a requests
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Manejar 401 y refrescar token
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Intentar refrescar token
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        // Llamar endpoint refresh
        // Reintentar request original
      } else {
        // Redirect a login
      }
    }
    return Promise.reject(error);
  }
);
```

**LoginPage:**
- Formulario de login
- Validaciones
- Manejo de errores
- Redirect después de login
- Opción "Recordarme"

**ProtectedRoute:**
```javascript
const ProtectedRoute = ({ children, requiredRole }) => {
  const { user, loading } = useAuth();

  if (loading) return <Loader />;

  if (!user) return <Navigate to="/login" />;

  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/unauthorized" />;
  }

  return children;
};
```

**Criterios de aceptación:**
- [ ] Sistema de auth implementado
- [ ] Login funcionando
- [ ] Logout funcionando
- [ ] Tokens guardándose
- [ ] Refresh automático funcionando
- [ ] Rutas protegidas
- [ ] Manejo de roles
- [ ] Redirect apropiados

---

#### Tarea 12.7: Actualizar Tests con Autenticación
**Prioridad:** Alta | **Estimación:** 3 Story Points | **Etiquetas:** Testing

**Descripción:**
Actualizar todos los tests para incluir autenticación.

**Cambios necesarios:**

**Backend:**
```python
@pytest.fixture
def authenticated_client(api_client, user):
    """Cliente autenticado con JWT"""
    refresh = RefreshToken.for_user(user)
    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
    return api_client

@pytest.mark.django_db
def test_listar_productos_autenticado(authenticated_client):
    response = authenticated_client.get('/api/inventario/productos/')
    assert response.status_code == 200
```

**Frontend:**
```javascript
test('login exitoso', async () => {
  const { result } = renderHook(() => useAuth());

  await act(async () => {
    await result.current.login('usuario', 'password');
  });

  expect(result.current.user).toBeDefined();
  expect(localStorage.getItem('accessToken')).toBeTruthy();
});
```

**Criterios de aceptación:**
- [ ] Fixtures de auth creadas
- [ ] Tests backend actualizados
- [ ] Tests frontend actualizados
- [ ] Todos los tests pasando

---

## ÉPICA 13: Deployment y Producción

### 📋 Descripción de la Épica
Preparar y desplegar la aplicación a producción en Hostinger, configurar CI/CD, variables de entorno, monitoreo y backups.

### 🎯 Objetivos
- Configuración de servidor en Hostinger
- Variables de entorno de producción
- Base de datos en producción
- Deploy de backend y frontend
- CI/CD automatizado
- SSL/HTTPS configurado
- Monitoreo y logs
- Sistema de backups

---

#### Tarea 13.1: Preparación para Producción - Backend
**Prioridad:** Alta | **Estimación:** 3 Story Points | **Etiquetas:** Backend, DevOps

**Descripción:**
Configurar Django para producción.

**Cambios en settings.py:**

```python
# settings/production.py
from .base import *

DEBUG = False

ALLOWED_HOSTS = [
    'mallor.tudominio.com',
    'www.mallor.tudominio.com',
]

# Base de datos de producción
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': config('DB_NAME'),
        'USER': config('DB_USER'),
        'PASSWORD': config('DB_PASSWORD'),
        'HOST': config('DB_HOST'),
        'PORT': config('DB_PORT', default='5432'),
    }
}

# Seguridad
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'

# Static y Media files
STATIC_ROOT = BASE_DIR / 'staticfiles'
MEDIA_ROOT = BASE_DIR / 'mediafiles'

# CORS
CORS_ALLOWED_ORIGINS = [
    'https://mallor.tudominio.com',
]

# Logging
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'file': {
            'level': 'ERROR',
            'class': 'logging.FileHandler',
            'filename': BASE_DIR / 'logs/django.log',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['file'],
            'level': 'ERROR',
            'propagate': True,
        },
    },
}
```

**Dependencias de producción:**
```bash
pip install gunicorn==21.2.0
pip install whitenoise==6.6.0  # Para servir archivos estáticos
```

**Criterios de aceptación:**
- [ ] Settings de producción creado
- [ ] Variables de seguridad configuradas
- [ ] Logging configurado
- [ ] Static files configurados
- [ ] Gunicorn instalado

---

#### Tarea 13.2: Preparación para Producción - Frontend
**Prioridad:** Alta | **Estimación:** 2 Story Points | **Etiquetas:** Frontend, DevOps

**Descripción:**
Configurar React para producción.

**Variables de entorno:**

**Archivo:** `.env.production`
```env
VITE_API_BASE_URL=https://api.mallor.tudominio.com
VITE_ENVIRONMENT=production
```

**Optimizaciones:**

**vite.config.js:**
```javascript
export default {
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ui: ['lucide-react'],
        },
      },
    },
  },
};
```

**Build:**
```bash
npm run build
```

**Criterios de aceptación:**
- [ ] Variables de producción configuradas
- [ ] Build optimizado
- [ ] Sourcemaps deshabilitados
- [ ] Chunks configurados

---

#### Tarea 13.3: Configuración de Servidor Hostinger
**Prioridad:** Alta | **Estimación:** 5 Story Points | **Etiquetas:** DevOps

**Descripción:**
Configurar servidor en Hostinger para alojar la aplicación.

**Pasos:**

1. **Contratar hosting:**
   - VPS o Cloud Hosting
   - Recomendado: 2 CPU, 4GB RAM, 80GB SSD

2. **Configurar servidor (Ubuntu 22.04):**
```bash
# Actualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar dependencias
sudo apt install python3.11 python3-pip python3-venv
sudo apt install postgresql postgresql-contrib
sudo apt install nginx
sudo apt install certbot python3-certbot-nginx
```

3. **Configurar PostgreSQL:**
```bash
sudo -u postgres psql
CREATE DATABASE mallor_db;
CREATE USER mallor_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE mallor_db TO mallor_user;
\q
```

4. **Configurar Nginx:**

**Archivo:** `/etc/nginx/sites-available/mallor`
```nginx
# Backend API
server {
    listen 80;
    server_name api.mallor.tudominio.com;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /static/ {
        alias /var/www/mallor/staticfiles/;
    }

    location /media/ {
        alias /var/www/mallor/mediafiles/;
    }
}

# Frontend
server {
    listen 80;
    server_name mallor.tudominio.com www.mallor.tudominio.com;

    root /var/www/mallor/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

5. **Habilitar sitio:**
```bash
sudo ln -s /etc/nginx/sites-available/mallor /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

6. **Configurar SSL con Let's Encrypt:**
```bash
sudo certbot --nginx -d mallor.tudominio.com -d www.mallor.tudominio.com
sudo certbot --nginx -d api.mallor.tudominio.com
```

7. **Configurar systemd para Django:**

**Archivo:** `/etc/systemd/system/mallor.service`
```ini
[Unit]
Description=Mallor Django Application
After=network.target

[Service]
Type=notify
User=www-data
Group=www-data
WorkingDirectory=/var/www/mallor
Environment="PATH=/var/www/mallor/venv/bin"
ExecStart=/var/www/mallor/venv/bin/gunicorn config.wsgi:application --bind 127.0.0.1:8000 --workers 3

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl start mallor
sudo systemctl enable mallor
```

**Criterios de aceptación:**
- [ ] Servidor configurado
- [ ] PostgreSQL funcionando
- [ ] Nginx configurado
- [ ] SSL instalado
- [ ] Django corriendo con systemd
- [ ] Frontend servido correctamente

---

#### Tarea 13.4: Deploy Inicial
**Prioridad:** Alta | **Estimación:** 4 Story Points | **Etiquetas:** DevOps

**Descripción:**
Realizar el primer deploy a producción.

**Pasos:**

1. **Clonar repositorio en servidor:**
```bash
cd /var/www
sudo git clone https://github.com/tu-usuario/mallor.git
cd mallor
```

2. **Configurar entorno virtual y dependencias:**
```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

3. **Configurar variables de entorno:**
```bash
# Crear archivo .env
sudo nano .env

# Agregar variables
DEBUG=False
SECRET_KEY=tu_secret_key_super_seguro
DB_NAME=mallor_db
DB_USER=mallor_user
DB_PASSWORD=secure_password
DB_HOST=localhost
DB_PORT=5432
FACTUS_API_KEY=tu_api_key
DEEPSEEK_API_KEY=tu_api_key
```

4. **Ejecutar migraciones:**
```bash
python manage.py migrate
python manage.py collectstatic --no-input
```

5. **Crear superusuario:**
```bash
python manage.py createsuperuser
```

6. **Build del frontend:**
```bash
cd frontend
npm install
npm run build
```

7. **Configurar permisos:**
```bash
sudo chown -R www-data:www-data /var/www/mallor
sudo chmod -R 755 /var/www/mallor
```

8. **Reiniciar servicios:**
```bash
sudo systemctl restart mallor
sudo systemctl restart nginx
```

9. **Verificar:**
```bash
# Backend
curl https://api.mallor.tudominio.com/api/health/

# Frontend
curl https://mallor.tudominio.com
```

**Criterios de aceptación:**
- [ ] Código desplegado en servidor
- [ ] Migraciones aplicadas
- [ ] Static files servidos
- [ ] Backend accesible
- [ ] Frontend accesible
- [ ] SSL funcionando
- [ ] Sin errores en logs

---

#### Tarea 13.5: CI/CD con GitHub Actions
**Prioridad:** Media | **Estimación:** 4 Story Points | **Etiquetas:** DevOps, CI/CD

**Descripción:**
Configurar pipeline de CI/CD para deploy automático.

**Archivo:** `.github/workflows/deploy.yml`

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'

      - name: Install dependencies
        run: |
          pip install -r requirements.txt

      - name: Run tests
        run: |
          pytest

      - name: Build frontend
        run: |
          cd frontend
          npm ci
          npm run build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'

    steps:
      - name: Deploy to server
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /var/www/mallor
            git pull origin main
            source venv/bin/activate
            pip install -r requirements.txt
            python manage.py migrate
            python manage.py collectstatic --no-input
            cd frontend
            npm install
            npm run build
            cd ..
            sudo systemctl restart mallor
            sudo systemctl restart nginx
```

**Configurar secrets en GitHub:**
- `SERVER_HOST`
- `SERVER_USER`
- `SSH_PRIVATE_KEY`

**Criterios de aceptación:**
- [ ] GitHub Actions configurado
- [ ] Pipeline de tests funcionando
- [ ] Deploy automático funcionando
- [ ] Secrets configurados
- [ ] Notificaciones de deploy

---

#### Tarea 13.6: Monitoreo y Logging
**Prioridad:** Media | **Estimación:** 3 Story Points | **Etiquetas:** DevOps

**Descripción:**
Configurar sistema de monitoreo y logs.

**1. Configurar logs:**

```python
# settings/production.py
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'file': {
            'level': 'ERROR',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': BASE_DIR / 'logs/django.log',
            'maxBytes': 1024 * 1024 * 15,  # 15MB
            'backupCount': 10,
            'formatter': 'verbose',
        },
        'api_file': {
            'level': 'INFO',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': BASE_DIR / 'logs/api.log',
            'maxBytes': 1024 * 1024 * 15,
            'backupCount': 10,
            'formatter': 'verbose',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['file'],
            'level': 'ERROR',
            'propagate': True,
        },
        'api': {
            'handlers': ['api_file'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}
```

**2. Endpoint de health check:**

```python
# views.py
class HealthCheckView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return Response({
            'status': 'ok',
            'database': self.check_database(),
            'cache': self.check_cache(),
        })

    def check_database(self):
        try:
            from django.db import connection
            connection.ensure_connection()
            return 'ok'
        except:
            return 'error'
```

**3. Monitoreo con script:**

```bash
#!/bin/bash
# monitor.sh

# Verificar si la aplicación está corriendo
if ! systemctl is-active --quiet mallor; then
    echo "Mallor no está corriendo, reiniciando..."
    systemctl restart mallor
    # Enviar notificación
fi

# Verificar espacio en disco
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 80 ]; then
    echo "Espacio en disco bajo: ${DISK_USAGE}%"
    # Enviar alerta
fi

# Verificar memoria
MEM_USAGE=$(free | grep Mem | awk '{print ($3/$2) * 100.0}' | cut -d. -f1)
if [ $MEM_USAGE -gt 80 ]; then
    echo "Uso de memoria alto: ${MEM_USAGE}%"
    # Enviar alerta
fi
```

**Configurar cron:**
```bash
# Ejecutar monitor cada 5 minutos
*/5 * * * * /var/www/mallor/monitor.sh
```

**Criterios de aceptación:**
- [ ] Logs configurados
- [ ] Rotación de logs funcionando
- [ ] Health check endpoint creado
- [ ] Script de monitoreo funcionando
- [ ] Alertas configuradas

---

#### Tarea 13.7: Sistema de Backups
**Prioridad:** Alta | **Estimación:** 3 Story Points | **Etiquetas:** DevOps

**Descripción:**
Configurar sistema automático de backups.

**Script de backup:**

**Archivo:** `/var/www/mallor/backup.sh`

```bash
#!/bin/bash

# Configuración
BACKUP_DIR="/var/backups/mallor"
DB_NAME="mallor_db"
DB_USER="mallor_user"
DATE=$(date +%Y%m%d_%H%M%S)

# Crear directorio si no existe
mkdir -p $BACKUP_DIR

# Backup de base de datos
pg_dump -U $DB_USER $DB_NAME | gzip > $BACKUP_DIR/db_backup_$DATE.sql.gz

# Backup de archivos media
tar -czf $BACKUP_DIR/media_backup_$DATE.tar.gz /var/www/mallor/mediafiles/

# Eliminar backups antiguos (mantener últimos 30 días)
find $BACKUP_DIR -name "db_backup_*.sql.gz" -mtime +30 -delete
find $BACKUP_DIR -name "media_backup_*.tar.gz" -mtime +30 -delete

echo "Backup completado: $DATE"
```

**Configurar cron:**
```bash
# Backup diario a las 2 AM
0 2 * * * /var/www/mallor/backup.sh
```

**Restauración:**

```bash
#!/bin/bash
# restore.sh

# Restaurar base de datos
gunzip -c /var/backups/mallor/db_backup_YYYYMMDD_HHMMSS.sql.gz | psql -U mallor_user mallor_db

# Restaurar archivos media
tar -xzf /var/backups/mallor/media_backup_YYYYMMDD_HHMMSS.tar.gz -C /
```

**Criterios de aceptación:**
- [ ] Script de backup creado
- [ ] Backups automáticos configurados
- [ ] Script de restauración creado
- [ ] Backups antiguos eliminándose
- [ ] Backups probados y funcionando

---

#### Tarea 13.8: Documentación de Producción
**Prioridad:** Media | **Estimación:** 2 Story Points | **Etiquetas:** Documentación

**Descripción:**
Crear documentación completa para producción.

**Documentos a crear:**

1. **DEPLOYMENT.md** - Guía de deploy
   - Requisitos del servidor
   - Pasos de instalación
   - Configuración de servicios
   - Troubleshooting

2. **PRODUCTION_CHECKLIST.md** - Checklist pre-deploy
   - Variables de entorno
   - Configuraciones de seguridad
   - Tests a ejecutar
   - Verificaciones post-deploy

3. **OPERATIONS.md** - Guía de operaciones
   - Cómo hacer deploy
   - Cómo verificar logs
   - Cómo hacer backup/restore
   - Cómo reiniciar servicios
   - Procedimientos de emergencia

4. **MONITORING.md** - Guía de monitoreo
   - Métricas a vigilar
   - Interpretación de logs
   - Alertas configuradas
   - Respuesta a incidentes

**Criterios de aceptación:**
- [ ] Todos los documentos creados
- [ ] Información completa y clara
- [ ] Comandos y ejemplos incluidos
- [ ] Troubleshooting documentado

---

#### Tarea 13.9: Optimización de Performance
**Prioridad:** Baja | **Estimación:** 3 Story Points | **Etiquetas:** Performance

**Descripción:**
Optimizar la aplicación para mejor rendimiento en producción.

**Optimizaciones:**

**Backend:**
1. **Caching:**
```python
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.redis.RedisCache',
        'LOCATION': 'redis://127.0.0.1:6379/1',
    }
}

# Usar cache en views
from django.views.decorators.cache import cache_page

@cache_page(60 * 15)  # 15 minutos
def estadisticas_view(request):
    ...
```

2. **Database query optimization:**
```python
# Usar select_related y prefetch_related
productos = Producto.objects.select_related('categoria').all()
ventas = Venta.objects.prefetch_related('detalles__producto').all()
```

3. **Índices en base de datos:**
```python
class Meta:
    indexes = [
        models.Index(fields=['codigo_interno']),
        models.Index(fields=['fecha_venta', 'cliente']),
    ]
```

**Frontend:**
1. **Code splitting:**
```javascript
const ProductosPage = lazy(() => import('./pages/ProductosPage'));
```

2. **Image optimization:**
```javascript
// Usar WebP
// Lazy loading de imágenes
```

3. **Bundle size reduction:**
```bash
npm install --save-dev vite-plugin-compression
```

**Criterios de aceptación:**
- [ ] Caching implementado
- [ ] Queries optimizadas
- [ ] Índices agregados
- [ ] Code splitting implementado
- [ ] Bundle optimizado
- [ ] Performance mejorado mediblemente

---

## Resumen de Épicas

### Total de Story Points: ~226 SP

1. **ÉPICA 1: Configuración Inicial** - 16 SP
2. **ÉPICA 2: Módulo de Usuarios** - 17 SP
3. **ÉPICA 3: Módulo de Inventario** - 28 SP
4. **ÉPICA 4: Módulo de Ventas y Abonos** - 38 SP
5. **ÉPICA 5: Módulo de Clientes** - 18 SP
6. **ÉPICA 6: Módulo de Proveedores** - 11 SP
7. **ÉPICA 7: Módulo de Fabricante** - 27 SP
8. **ÉPICA 8: Módulo de Informes** - 41 SP
9. **ÉPICA 9: Integración Factus** - 29 SP
10. **EPICA 9.5: Cierre Multitenant SaaS** - 25 SP
11. **ÉPICA 10: Módulo de IA** - 34 SP
12. **ÉPICA 11: Testing y Calidad** - 39 SP
13. **ÉPICA 12: Autenticación JWT** - 23 SP
14. **ÉPICA 13: Deployment** - 32 SP

### Estimación de Tiempo
- Con un equipo de 2-3 desarrolladores
- Velocidad de ~20 SP por sprint (2 semanas)
- **Duración estimada: 5-6 meses**

---

## Notas Finales

### Priorización
Las épicas están ordenadas según dependencias y prioridad de negocio.

### Flexibilidad
Este plan es una guía. Las tareas pueden ajustarse según:
- Feedback del equipo
- Cambios en requisitos
- Descubrimientos durante desarrollo

### Siguiente Paso
Importar estas tareas a Jira y comenzar con la **ÉPICA 1: Configuración Inicial**.

---

*Documento generado para Mallor - Sistema de Gestión Empresarial con IA*
*Fecha: 2026-04-20*
