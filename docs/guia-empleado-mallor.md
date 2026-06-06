# Guía de instalación y entrega — Equipo Mallor

Este documento describe el proceso completo que debe seguir un empleado de Mallor para instalar, configurar y entregar cada uno de los planes al cliente.

---

## Tabla de contenidos

1. [Plan Cloud (solo web)](#1-plan-cloud-solo-web)
2. [Plan Local (offline, sin sync)](#2-plan-local-offline-sin-sync)
3. [Plan Híbrido (local + cloud)](#3-plan-híbrido-local--cloud)
4. [Checklist de entrega](#4-checklist-de-entrega)
5. [Cambio de contraseña por defecto](#5-cambio-de-contraseña-por-defecto)
6. [Troubleshooting](#6-troubleshooting)

---

## 1. Plan Cloud (solo web)

El cliente accede a Mallor únicamente a través del navegador. No se instala nada en su equipo.

### Pasos

**En el servidor cloud (mallor.com):**

1. Inicia sesión como superusuario en `https://mallor.com/admin/` o en la app con tu cuenta staff.
2. Ve a **Admin → Empresas SaaS** (`/empresas-admin`).
3. Crea la empresa del cliente:
   - **NIT / Razón social** del cliente.
   - **Ambiente de facturación:** `SANDBOX` para pruebas, `PRODUCCIÓN` al activar.
4. Crea el usuario propietario del cliente:
   - Ve a **Usuarios** dentro de la empresa recién creada.
   - Crea el usuario con email y contraseña temporal.
   - Rol: `PROPIETARIO`.
5. Configura los datos básicos del cliente:
   - Productos iniciales (opcional, el cliente puede ingresarlos).
   - Credenciales de Factus si va a facturar (sección Facturación → Credenciales).

**Entrega al cliente:**

- URL de acceso: `https://mallor.com`
- Usuario y contraseña temporales.
- Instrucciones para cambiar la contraseña en el primer inicio de sesión.

> No se genera `LocalLicense` para este plan.

---

## 2. Plan Local (offline, sin sync)

El cliente trabaja 100% sin internet. Los datos se guardan solo en su equipo.

### Requisitos

- Windows 10/11 en el equipo del cliente.
- El instalador MSI (`mallor-local-x.x.x.msi`).

### Pasos

**En el equipo del cliente:**

1. Ejecuta el instalador MSI como administrador.
2. Sigue el asistente de instalación → finaliza → abre **Mallor Local** desde el escritorio.
3. La aplicación inicia automáticamente el servidor local (puede tardar 15-30 seg la primera vez).
4. El navegador interno cargará la pantalla de login.

**Configuración inicial:**

5. Inicia sesión con las credenciales por defecto:
   - **Usuario:** `admin`
   - **Contraseña:** `mallor1234`
6. El wizard de activación preguntará si tienes clave de activación. Selecciona **"No, usar solo en modo local"**.
7. La app queda lista en modo offline.
8. **Cambia la contraseña del admin** (ver sección 5).
9. Configura la empresa del cliente:
   - Ve a **Mi empresa** → edita nombre, NIT, teléfono, logo.
10. Crea los usuarios que necesite el cliente (vendedores, administrador, etc.).
11. Carga el inventario inicial (productos, categorías).

**Entrega al cliente:**

- Credenciales de acceso del usuario que creaste para el cliente.
- Confirmar que el modo local aparece correctamente (indicador "Local" en la app).

> No se genera `LocalLicense` para este plan (el campo queda vacío).  
> No hay sync con cloud.

---

## 3. Plan Híbrido (local + cloud)

El cliente trabaja en la app desktop y sus datos se sincronizan automáticamente con Mallor Cloud cuando hay internet.

### Pasos

**Parte A — En el servidor cloud (mallor.com):**

1. Inicia sesión como staff en la app cloud.
2. Crea la empresa del cliente en **Admin → Empresas SaaS** (igual que Plan Cloud).
3. Crea el usuario propietario del cliente en cloud.
4. Ve a **Admin → Licencias** (`/admin/licencias`).
5. Haz clic en **"Nueva licencia"**:
   - Selecciona la empresa del cliente.
   - Plan: **Híbrido (Local + Cloud)**.
   - Fecha de soporte: fecha hasta la que aplica el soporte (ej. 1 año desde hoy).
6. El sistema genera automáticamente una clave única como:
   ```
   MALLOR-HYB-A1B2C3D4-E5F6
   ```
7. Haz clic en el botón **copiar** junto a la clave y guárdala.

**Parte B — En el equipo del cliente:**

8. Instala el MSI e inicia la app (igual que en Plan Local, pasos 1-4).
9. Inicia sesión con `admin` / `mallor1234`.
10. En el wizard de activación, selecciona **"Sí, tengo mi clave"**.
11. Ingresa la clave generada en el paso 6:
    ```
    MALLOR-HYB-A1B2C3D4-E5F6
    ```
12. La app se conecta a Mallor Cloud, valida la clave y configura automáticamente:
    - `cloud_api_url = https://mallor.com`
    - `sync_enabled = True`
    - `LocalLicense` guardada localmente.
13. El wizard muestra confirmación con el nombre de la empresa y fecha de soporte.
14. Haz clic en **"Continuar a Mallor"**.
15. **Cambia la contraseña del admin** (ver sección 5).
16. Configura empresa local: **Mi empresa** → NIT, nombre, logo.
17. Crea los usuarios locales.
18. Carga el inventario.

**Verificación de sync:**

19. Crea una venta de prueba en la app desktop.
20. Espera hasta 60 segundos (el worker corre cada 30 seg).
21. Abre `https://mallor.com` en el navegador → verifica que la venta aparece en Ventas.
22. El indicador de licencia en el sidebar de la app desktop debe mostrar un escudo verde ✓.

**Entrega al cliente:**

- App desktop funciona como punto principal de trabajo.
- Cloud accesible desde `https://mallor.com` para consultas remotas.
- La sincronización es automática — no requiere acción del cliente.

---

## 4. Checklist de entrega

Usa esta tabla para verificar que cada plan está correctamente configurado antes de entregar al cliente.

### Plan Cloud

| # | Verificación | Ok |
|---|---|---|
| 1 | Empresa creada en cloud con NIT y razón social correctos | ☐ |
| 2 | Usuario propietario creado con email del cliente | ☐ |
| 3 | Cliente puede iniciar sesión en `mallor.com` | ☐ |
| 4 | Contraseña cambiada por el cliente | ☐ |
| 5 | Ambiente de facturación configurado (SANDBOX/PRODUCCIÓN) | ☐ |

### Plan Local

| # | Verificación | Ok |
|---|---|---|
| 1 | MSI instalado correctamente | ☐ |
| 2 | App abre sin errores | ☐ |
| 3 | Wizard completado en modo "sin sync" | ☐ |
| 4 | Contraseña `admin/mallor1234` cambiada | ☐ |
| 5 | NIT y nombre de empresa configurados en "Mi empresa" | ☐ |
| 6 | Usuarios del cliente creados | ☐ |
| 7 | Inventario inicial cargado | ☐ |

### Plan Híbrido

| # | Verificación | Ok |
|---|---|---|
| 1 | Empresa creada en cloud | ☐ |
| 2 | Licencia generada en panel admin cloud | ☐ |
| 3 | Clave de activación copiada y guardada | ☐ |
| 4 | MSI instalado en equipo del cliente | ☐ |
| 5 | Wizard completado con clave de activación | ☐ |
| 6 | Wizard muestra confirmación "Mallor Híbrido activado" | ☐ |
| 7 | Contraseña `admin/mallor1234` cambiada | ☐ |
| 8 | Empresa local configurada (NIT, nombre) | ☐ |
| 9 | Venta de prueba sincronizada en cloud ✓ | ☐ |
| 10 | Escudo verde de licencia visible en sidebar | ☐ |

---

## 5. Cambio de contraseña por defecto

**Siempre** cambia la contraseña `mallor1234` antes de entregar al cliente.

1. En la app (local o cloud), inicia sesión con `admin` / `mallor1234`.
2. Ve a **Usuarios** → selecciona el usuario `admin`.
3. Haz clic en **"Cambiar contraseña"**.
4. Ingresa una contraseña segura (mínimo 8 caracteres, mezcla letras y números).
5. Entrega al cliente la nueva contraseña por un canal seguro (no por WhatsApp en texto plano).

> Si el cliente va a crear sus propios usuarios, puedes también crear un usuario `propietario` separado y deshabilitar o eliminar el usuario `admin` genérico.

---

## 6. Troubleshooting

### La app desktop no carga (pantalla en blanco o "Conectando...")

**Causa:** El servidor local (Django) tardó más de 4 minutos en iniciar.

**Solución:**
1. Cierra la app completamente desde la barra de tareas (clic derecho → cerrar).
2. Vuelve a abrir.
3. Si persiste: revisa si hay otro proceso usando el puerto 8765 (ejecuta `netstat -ano | findstr 8765` en PowerShell y cierra el proceso si existe).

---

### El wizard de activación da error "Clave de activación inválida"

**Causas posibles:**
- La clave fue copiada con espacios o caracteres extra.
- La clave está revocada o expirada en el panel cloud.
- El equipo del cliente no tiene internet para conectar a `mallor.com`.

**Solución:**
1. Verifica en `/admin/licencias` que la licencia tiene estado **Activa**.
2. Copia la clave directamente con el botón de copiar (no tipearla).
3. Verifica que el equipo puede navegar a `https://mallor.com`.

---

### La sincronización no ocurre (ventas no aparecen en cloud)

**Causas posibles:**
- `sync_enabled = False` (la licencia fue revocada o expirada).
- No hay internet en el equipo del cliente.
- `cloud_api_url` está vacío o incorrecto.

**Verificación (en la app local, como admin):**
1. Ve a la consola Django: `GET /api/offline/status/` — verifica `sync_enabled`, `online`, `connectivity_status`.
2. Verifica el `SyncOutbox` en `/api/offline/sync/outbox/` — si hay eventos en estado `ERROR`, usa `/api/offline/sync/retry/`.

---

### El escudo de licencia muestra rojo en el sidebar

**Causa:** La licencia fue marcada como `REVOKED` o `EXPIRED` en el servidor cloud.

**Solución:**
1. Entra al panel `/admin/licencias` en cloud.
2. Si la licencia expiró por soporte, actualiza la fecha `support_until` con `PATCH`.
3. Si fue revocada por error, cambia el `status` a `ACTIVE` directamente desde el Django admin: `http://mallor.com/admin/offline/locallicense/`.
4. En la app local, la próxima validación del worker (máx 60 min) actualizará el estado. Para forzar: reiniciar la app.

---

### El cliente no recibe las facturas electrónicas

**Causa:** Las facturas quedan en `PENDIENTE_FACTURACION` porque la app estaba offline cuando se crearon.

**Solución:**
1. El worker local reintenta automáticamente las facturas cuando vuelve internet.
2. Para forzar el reintento: `POST /api/offline/facturacion/retry/` desde la app.
3. Verifica que las credenciales de Factus están configuradas en **Facturación → Credenciales**.

---

*Versión del documento: 2026-06-05*  
*Soporte interno: equipo@mallor.com*
