# Mallor - Especificación del Producto

## Índice
- [1. Visión del Producto](#1-visión-del-producto)
- [2. Usuarios y Casos de Uso](#2-usuarios-y-casos-de-uso)
- [3. Funcionalidades](#3-funcionalidades)
- [4. Flujos de Usuario](#4-flujos-de-usuario)
- [5. Arquitectura](#5-arquitectura)
- [6. Requisitos No Funcionales](#6-requisitos-no-funcionales)

---

## 1. Visión del Producto

### Descripción General
**Mallor** es una aplicación web integrada con inteligencia artificial diseñada para la gestión contable, inventario y emisión de facturación electrónica, orientada a pequeñas y medianas empresas (PYMEs).

### Propuesta de Valor
La plataforma permite gestionar inventarios y ventas de forma intuitiva, con capacidad de generar facturación electrónica de manera ágil. Un asistente de IA conectado directamente a la base de datos facilita consultas y operaciones en lenguaje natural.

### Público Objetivo
Pequeñas y medianas empresas que desean aprovechar las últimas tecnologías para optimizar la gestión de su negocio, automatizar procesos contables y mejorar el control de inventario.

### Beneficios Clave
- Gestión simplificada de inventarios y ventas
- Facturación electrónica integrada
- Consultas inteligentes mediante asistente IA
- Interfaz intuitiva y fácil de usar
- Informes y estadísticas en tiempo real

---

## 2. Usuarios y Casos de Uso

### Perfiles de Usuario

#### Usuario Administrador
Tiene acceso completo al sistema con las siguientes capacidades:
- Gestión integral del inventario
- Administración de ventas
- Visualización de estadísticas e informes
- Creación y seguimiento de ventas
- Configuración del sistema
- Gestión de usuarios y permisos

#### Usuario Empleado
Acceso limitado a operaciones básicas:
- Creación de ventas
- Registro de facturas en el sistema
- Ingreso de productos al inventario
- Consulta de información básica

---

## 3. Funcionalidades

### 3.1 Módulo de Inventario

#### Gestión de Productos
- **Visualización**: Listado completo de productos con filtros y búsqueda
- **Creación**: Registro de nuevos productos con información detallada
- **Edición**: Actualización de datos de productos existentes
- **Historial**: Seguimiento de ventas por producto específico

#### Control de Stock
- Actualización de inventario mediante ingreso de facturas
- Asignación de productos existentes con nuevos precios y cantidades
- Gestión de historial de compras

#### Reportes
- Exportación del inventario en formato Excel
- Cálculo automático del valor total del inventario (precio de compra y venta)
- Visualización de métricas de inventario

### 3.2 Módulo de Ventas

#### Gestión de Ventas
- Creación de ventas añadiendo productos y cantidades
- Cálculo automático del total de la venta
- Selección de cliente (con opción "Consumidor Final" por defecto)
- Estados de venta: Terminada o Pendiente

#### Facturación Electrónica
- Emisión de factura electrónica (integración con DIAN)
- Impresión de facturas
- Envío automático a la autoridad fiscal

#### Reportes y Análisis
- Historial completo de ventas
- Informes de ventas con filtros por fecha
- Análisis de totales y tendencias

### 3.3 Módulo de Fabricante *(Solo Plan Premium)*

#### Gestión de Ingredientes
- Registro y administración de ingredientes
- Control de inventario de materias primas

#### Producción
- Creación de productos con recetas (ingredientes necesarios)
- Conversión automática de unidades de medida
  - *Ejemplo*: Conversión de galones a litros/mililitros con cálculo de costo unitario
- Cálculo automático de utilidad del producto
- Determinación de precio de venta óptimo

### 3.4 Módulo de Clientes

#### Administración de Clientes
- Registro de información de clientes
- Actualización de datos
- Historial de compras por cliente
- Gestión de carteras y saldos

### 3.5 Módulo de Proveedores

#### Gestión de Proveedores
- Registro y actualización de proveedores
- Historial de compras
- Seguimiento de relaciones comerciales

### 3.6 Módulo de Informes

#### Estadísticas y Reportes
- Visualización de estadísticas relacionadas con ventas
- Exportación de informes en formato PDF y Excel
- Análisis de tendencias y patrones de venta

#### Cierres de Caja
- Generación automática de cierres de caja
- División de gastos del negocio
- Clasificación de ventas por categoría
- Conciliación de ingresos y egresos

### 3.7 Módulo de Usuarios

#### Administración de Usuarios
- Creación y gestión de cuentas de usuario
- Asignación de roles y permisos
- Gestión de tokens de autenticación
- Control de acceso por niveles

### 3.8 Módulo de IA

#### Asistente Inteligente
- Chat interactivo para consultas sobre datos del negocio
- Procesamiento de preguntas en lenguaje natural
- Acceso directo a la base de datos
- Respuestas contextualizadas y precisas

### 3.9 Módulo de App Móvil

**Estado**: En desarrollo futuro

---

## 4. Flujos de Usuario

### 4.1 Flujo: Crear una Venta

1. **Acceso**: El usuario navega a "Ventas" desde el menú principal
2. **Selección**: Elige el cliente, producto(s), cantidad y estado (Terminada/Pendiente)
3. **Cálculo**: El sistema calcula automáticamente el total de la venta
4. **Facturación**: El usuario decide si emitir factura electrónica
5. **Guardado**: Se guarda la venta y se decide si imprimir la factura
6. **Envío DIAN**: Si se emite factura electrónica, el sistema la envía automáticamente a la DIAN

#### Validaciones y Excepciones
- **Sin cliente seleccionado**: El sistema asigna automáticamente "Consumidor Final"
- **Sin productos**: No se permite guardar la venta si no hay al menos un producto en la lista

### 4.2 Flujo: Agregar Productos al Inventario

#### Paso 1: Registro de Factura de Compra
1. Usuario accede a "Compras" en el menú
2. Hace clic en "Registrar nueva factura"
3. Ingresa los datos de la factura a registrar
4. El sistema guarda la factura y registra el total en "gastos"

#### Paso 2: Actualización de Inventario
5. Usuario navega a "Inventario" en el menú
6. Selecciona "Agregar productos al inventario"
7. Busca el número de factura previamente registrada
8. Agrega productos existentes con información actualizada:
   - Precio de compra
   - Porcentaje de IVA (opcional)
   - Porcentaje de transporte (opcional)
   - Cantidad
9. El sistema calcula el **Precio de Compra Final** (incluyendo IVA y transporte)
10. Usuario ingresa el precio de venta
11. Los productos se añaden a una lista de previsualización (con opción de eliminar)
12. **Opcional**: Crear nuevos productos desde el mismo módulo
13. El sistema calcula el costo total, subtotal y total de la factura
14. Usuario confirma con "Agregar productos al inventario"

#### Validaciones
- **Mínimo de productos**: Debe haber al menos un producto para proceder

### 4.3 Flujo: Crear Productos desde Módulo Fabricante

1. **Acceso**: Usuario navega al módulo "Fabricante"
2. **Creación**: Hace clic en "Crear producto"
3. **Configuración básica**: Define:
   - Nombre del producto
   - Unidad de medida
   - Cantidad producida
4. **Asignación de ingredientes**: Añade los ingredientes necesarios con sus cantidades
5. **Cálculos automáticos**: El sistema determina:
   - Costo total de producción
   - Ganancia neta (según precio de venta)
   - Porcentaje de rentabilidad

### 4.4 Flujo: Visualizar Estadísticas

1. **Acceso**: Usuario hace clic en "Estadísticas" en el menú
2. **Visualización**: El sistema muestra gráficos e informes relevantes:
   - Ventas por período
   - Productos más vendidos
   - Tendencias de crecimiento
   - Análisis de rentabilidad
3. **Filtros**: El usuario puede filtrar por:
   - Día
   - Mes
   - Año
   - Rango de años

### 4.5 Flujo: Interactuar con el Sistema mediante IA

1. **Acceso**: Usuario hace clic en "Asistente IA"
2. **Interfaz**: El sistema muestra un chat interactivo
3. **Consulta**: Usuario escribe preguntas relacionadas con datos del negocio
4. **Respuesta**: El asistente IA procesa y responde con información precisa de la base de datos

---

## 5. Arquitectura

### 5.1 Stack Tecnológico

#### Frontend
- **Framework**: React (Web)
- **Escalabilidad**: React Native (futura versión móvil)

#### Backend
- **Lenguaje**: Python 3.x
- **Framework**: Django + Django REST Framework (DRF)
- **API**: RESTful

#### Base de Datos
- **Motor**: PostgreSQL
- **ORM**: Django ORM

#### Testing
- **Frameworks**: Django Test Framework o pytest
- **Cobertura**: Tests unitarios y de integración

#### Autenticación
- **Método**: JWT (JSON Web Tokens)
- **Nota**: Implementación al final para facilitar pruebas iniciales

#### Hosting
- **Proveedor**: Hostinger

### 5.2 Integraciones

#### Inteligencia Artificial
- **Implementación**: CLI con comandos personalizados
- **API**: DeepSeek
- **Funcionalidad**: Manipulación de base de datos mediante comandos (similar a MCP)

#### Servicios Externos
- **Factus API**: Para facturación electrónica
- **Testing**: Validado con Postman MCP

#### Control de Versiones
- **Sistema**: Git
- **Repositorio**: GitHub

### 5.3 Arquitectura de Capas

```
┌─────────────────────────────────────┐
│         React Frontend              │
│      (Cliente Web/Móvil)            │
└─────────────────────────────────────┘
              ↕ API REST
┌─────────────────────────────────────┐
│     Views (Django REST Framework)   │
│      Capa de Presentación/API       │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│          Serializers                │
│   Transformación de Datos           │
│      (JSON ↔ Objetos)               │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│          Services                   │
│      Lógica de Negocio              │
│   (Reglas, Procesos, Cálculos)      │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│           Models                    │
│     Acceso a Datos (ORM)            │
│        PostgreSQL                   │
└─────────────────────────────────────┘
```

#### Componentes Adicionales
- **Utils**: Archivo para funciones reutilizables
  - Ejemplo: `convertirAPesoColombiano()`
  - Validadores
  - Helpers

### 5.4 Modelo de Datos

#### Tablas Principales
*(Estructura inicial - sujeta a mejoras según necesidad)*

- **abonos**: Registro de pagos parciales
- **categorias**: Clasificación de productos
- **clientes**: Información de clientes
- **detalle_venta**: Ítems de cada venta
- **facturas**: Facturas de compra
- **facturas_fabricacion**: Facturas de producción
- **historial**: Registro de operaciones
- **informe**: Datos de informes generados
- **ingredientes**: Materias primas
- **ingredientes_factura**: Relación ingredientes-facturas
- **ingredientes_producto**: Recetas de productos
- **inventario_ingredientes**: Stock de ingredientes
- **negocios**: Información de empresas
- **productos_fabricados**: Productos manufacturados
- **productos**: Catálogo de productos (soporte para imágenes opcional)
- **proveedor**: Información de proveedores
- **usuarios**: Cuentas de usuario
- **venta**: Registro de ventas

#### Especificación Detallada: Modelo Producto

El modelo `productos` debe incluir los siguientes campos para garantizar compatibilidad con la importación/exportación del sistema contable antiguo:

| Campo | Tipo | Descripción | Requerido |
|-------|------|-------------|-----------|
| **N°** | Integer | Número secuencial del producto | Sí (Auto) |
| **ID INTERNO** | String/UUID | Identificador único interno del producto | Sí |
| **CÓDIGO DE BARRAS** | String | Código de barras del producto (EAN, UPC, etc.) | Opcional |
| **NOMBRE** | String | Nombre comercial del producto | Sí |
| **CATEGORÍA** | ForeignKey | Relación con tabla de categorías | Opcional |
| **MARCA** | String | Marca o fabricante del producto | Opcional |
| **DESCRIPCIÓN** | Text | Descripción detallada del producto | Opcional |
| **EXISTENCIAS** | Decimal/Integer | Cantidad disponible en inventario | Sí (Default: 0) |
| **INVIMA** | String | Registro INVIMA (para productos farmacéuticos/alimentos) | Opcional |
| **PRECIO COMPRA** | Decimal | Precio de adquisición del producto | Sí |
| **PRECIO VENTA** | Decimal | Precio de venta al público | Sí |
| **IVA** | Decimal | Porcentaje de IVA aplicable | Sí (Default: 0 o 19) |
| **FECHA INGRESO** | DateTime | Fecha de ingreso del producto al inventario | Sí (Auto) |
| **FECHA CADUCIDAD** | Date | Fecha de vencimiento (para productos perecederos) | Opcional |

**Notas Importantes**:
- Esta estructura facilita la migración desde el sistema contable antiguo
- Los campos opcionales pueden quedar vacíos durante la importación
- Se debe validar la integridad de datos durante el proceso de importación/exportación
- El campo `INVIMA` es específico para productos que requieren registro sanitario en Colombia

---

## 6. Requisitos No Funcionales

### 6.1 Rendimiento
- **Carga inicial**: Menos de 3 segundos
- **Tiempo de respuesta**: Operaciones CRUD en menos de 1 segundo
- **Optimización**: Lazy loading para listas grandes

### 6.2 Seguridad
- **Privacidad**: Datos de cada usuario completamente privados e inaccesibles para otros
- **Autenticación**: Sistema JWT con tokens seguros
- **Autorización**: Control de acceso basado en roles
- **Encriptación**: Datos sensibles encriptados en tránsito y en reposo

### 6.3 Escalabilidad
- **Capacidad**: Diseñado para soportar hasta 300 usuarios en v1
- **Crecimiento**: Arquitectura preparada para escalar horizontalmente

### 6.4 Disponibilidad
- **Modo offline**: Funcionalidad básica sin conexión
  - ✅ Permitido: Creación de ventas
  - ❌ Limitado: Facturación electrónica (requiere conexión)
  - **Ventaja**: El cliente puede continuar vendiendo sin interrupciones

### 6.5 Internacionalización
- **Versión 1**: Interfaz completamente en español
- **Futuro**: Soporte multi-idioma

### 6.6 Usabilidad
- **Diseño**: Interfaz intuitiva y amigable
- **Accesibilidad**: Siguiendo estándares WCAG
- **Responsive**: Adaptable a diferentes dispositivos

---

## Anexos

### A. Recursos y Documentación

#### Buenas Prácticas

**React**:
- [vercel-react-best-practices](https://skills.sh/vercel-labs/agent-skills/vercel-react-best-practices)

**Python**:
- [PEP 8 - Guía de estilo Python](https://peps.python.org/pep-0008/)

**Principios SOLID**:
- [SOLID en Python (enfoque en S, O, L)](https://softwarecrafters.io/python/principios-solid-python)

#### Skills y Herramientas

**Skill para Diseño Frontend**:
```bash
npx skills add https://github.com/anthropics/skills --skill frontend-design
```

**Skill para UX/UI**:
```bash
npx skills add https://github.com/nextlevelbuilder/ui-ux-pro-max-skill --skill ui-ux-pro-max
```

**Extensión VS Code**:
- Context7 MCP Server (para mejor contexto de desarrollo)

#### Documentación de APIs

**Factus - Facturación Electrónica**:
- [Documentación oficial](https://developers.factus.com.co/)
- Pruebas: Postman API Tools de Cline

#### Código de Referencia

**Carpeta**: `example_code/`
- Contiene código de ejemplo para referencia del agente
- **Nota**: Solo para guía, no código de producción

---

## Control de Cambios

| Versión | Fecha | Autor | Descripción |
|---------|-------|-------|-------------|
| 1.0 | 2026-04-20 | Equipo Mallor | Documento inicial convertido a Markdown con mejoras de redacción |

---

*Documento generado para el proyecto **Mallor** - Sistema de gestión empresarial con IA*
