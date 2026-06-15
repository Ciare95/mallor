## Context

Mallor expone una API REST con JWT que el frontend web ya consume. La app móvil es un nuevo cliente de esa misma API. El backend ya acepta el refresh token en el body del POST (`request.data.get('refresh')`), lo que elimina la dependencia de cookies httpOnly para mobile. El único gap es el Cloudflare Turnstile en el login, que requiere un widget de browser no disponible en React Native.

## Goals / Non-Goals

**Goals:**
- App Android nativa con Expo (managed workflow), sin WebView
- Autenticación JWT sin cookies ni Turnstile para mobile
- Flujo completo de venta (productos + cliente + pago + factura electrónica)
- Gestión de clientes: lista, búsqueda, crear, detalle
- Dashboard de informes para roles PROPIETARIO y ADMIN
- UI minimalista: solo elementos funcionales, sin cards o texto explicativo
- Reutilizar la capa de servicios JS existente sin modificarla

**Non-Goals:**
- Soporte offline / sync
- iOS (primera iteración)
- Módulos adicionales: inventario, proveedores, facturación, IA, usuarios
- Cierres de caja ni generación de reportes PDF desde mobile
- Modificar el frontend web existente

## Decisions

### 1. Expo managed workflow sobre bare React Native

Expo managed genera builds de Android (APK/AAB) sin necesitar Android Studio local. El SDK incluye SecureStore, Router y Camera sin configuración nativa adicional. Se sale a bare solo si se necesita un módulo nativo no soportado por Expo — no es el caso aquí.

### 2. Expo Router (file-based) sobre React Navigation

Expo Router es el estándar actual de Expo, basado en React Navigation internamente. Reduce boilerplate y permite proteger rutas con layouts anidados (`(auth)`, `(app)`), igual al patrón del web con React Router.

### 3. Endpoint `/api/auth/mobile/login/` separado

Alternativa descartada: pasar `cf_turnstile_response` vacío y detectar mobile por header. Motivo: acopla lógica de plataforma al endpoint existente. Solución limpia: nueva vista `MobileLoginView` en `usuario/auth_views.py` con rate limiting propio (mismo mecanismo que el web) sin verificación Turnstile. No requiere migración.

### 4. Tokens en `expo-secure-store` sobre AsyncStorage

AsyncStorage no cifra. SecureStore usa Keystore de Android (cifrado por hardware). El access token y el refresh token se guardan en SecureStore. No se usan cookies.

### 5. Capa de servicios compartida por copia directa

Alternativa descartada: monorepo con workspace compartido. Motivo: agrega complejidad de tooling (npm workspaces, paths aliases) para reutilizar ~5 archivos JS puros. Solución: copiar `ventas.service.js`, `clientes.service.js`, `informes.service.js`, `utils/ventas.js`, `utils/clientes.js`, `utils/roleAccess.js` a `mobile/src/services/`. Cualquier cambio de contrato de API se actualiza en ambos lugares — aceptable dado el ritmo de cambios.

### 6. Axios con instancia adaptada (sin cookies ni CSRF)

`api.js` en mobile omite `withCredentials`, `xsrfCookieName` y `xsrfHeaderName`. El interceptor de request lee el access token desde SecureStore. El interceptor de respuesta envía el refresh token en el body del POST `/api/auth/mobile/refresh/` (o reutiliza `/api/auth/refresh/` que ya acepta body).

### 7. Estado global: Zustand

TanStack Query maneja server state (queries, mutations, cache). Zustand maneja auth state (token, user, empresaActiva). Mismo patrón que el web. No se usa Redux ni Context API.

### 8. UI Design System — Minimalismo funcional para mobile

Principios:
- **Cero texto explicativo**: no hay cards de bienvenida, descripciones de módulo ni onboarding inline. La pantalla muestra datos o acciones directamente.
- **Fondo**: `#F7F6F3` (warm off-white) para el canvas; `#FFFFFF` para superficies de lista y formulario.
- **Bordes**: `#EAEAEA` (1px), sin sombras.
- **Tipografía**: System font nativa (San Francisco en iOS, Roboto en Android vía `System`). Tamaños: 24px títulos, 16px cuerpo, 13px secundario/metadata. Color primario `#111111`, secundario `#787774`.
- **Botones CTA**: fondo `#111111`, texto `#FFFFFF`, `borderRadius: 6`, sin sombra. Botón secundario: borde `#EAEAEA`, fondo transparente.
- **Badges de estado**: pill pequeño, fondo pastel, texto oscuro del mismo tono. Sin emojis.
- **Listas**: `FlatList` con separador `#EAEAEA` 1px. Sin íconos de decoración innecesarios. Cada ítem muestra solo los datos relevantes para la acción siguiente.
- **Formularios**: campos con borde inferior `#EAEAEA` (underline style), sin caja completa. Label encima del input, pequeño y gris.
- **Íconos**: Phosphor Icons (Bold) o `@expo/vector-icons` con Ionicons como fallback.

```
PALETA
  Canvas        #F7F6F3
  Surface       #FFFFFF
  Border        #EAEAEA
  Text primary  #111111
  Text muted    #787774
  CTA bg        #111111
  CTA text      #FFFFFF
  Badge verde   bg #EDF3EC  text #346538
  Badge rojo    bg #FDEBEC  text #9F2F2D
  Badge amarillo bg #FBF3DB text #956400
  Badge azul    bg #E1F3FE  text #1F6C9F
```

### 9. Navegación por roles

```
(auth)/
  login               — pública

(app)/                — requiere token válido
  ventas/
    index             — lista de ventas (todos los roles)
    nueva             — formulario nueva venta (todos los roles)
    [id]              — detalle de venta (todos los roles)
  clientes/
    index             — lista + búsqueda (todos los roles)
    nuevo             — crear cliente (todos los roles)
    [id]              — detalle de cliente (todos los roles)
  informes/
    index             — dashboard estadísticas (PROPIETARIO, ADMIN)
```

La tab bar inferior muestra:
- Ventas (siempre)
- Clientes (siempre)
- Informes (oculto si rol === 'EMPLEADO')

## Risks / Trade-offs

- **Copia de servicios** → divergencia si el contrato de API cambia. Mitigación: los servicios son delgados (solo HTTP + normalización), los cambios son raros y detectables en tests.
- **Expo managed limitations** → si en el futuro se necesita un módulo nativo no soportado (ej. impresión Bluetooth), se migra a bare workflow. El código de app no cambia, solo la configuración de build.
- **Rate limiting mobile login** → sin Turnstile, el endpoint mobile depende solo del rate limiter por IP/username del backend. Es suficiente para uso interno, pero considerar agregar certificate pinning si la app se publica en Play Store abiertamente.
- **Flujo de venta completo en pantalla pequeña** → el formulario de nueva venta es el screen más complejo. Se dividirá en pasos (stepper): 1) Buscar/crear cliente, 2) Agregar productos, 3) Resumen y pago. Reduce scroll y errores.
