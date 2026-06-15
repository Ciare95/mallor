## Why

Los vendedores de campo y gerentes de Mallor necesitan acceso móvil al sistema para crear ventas, gestionar clientes y consultar informes desde Android, sin depender de un computador. El sistema web actual no está optimizado para pantallas pequeñas ni para uso en campo.

## What Changes

- Nueva app Android con React Native + Expo (directorio `mobile/` en el repo)
- Nuevo endpoint de autenticación `/api/auth/mobile/login/` sin Cloudflare Turnstile
- Configuración CORS en el backend para aceptar peticiones desde la app móvil
- Reutilización de la capa de servicios JS existente (`ventas`, `clientes`, `informes`)
- No requiere recompilar el sidecar PyInstaller ni el bundle de Tauri (solo cloud)

## Capabilities

### New Capabilities

- `mobile-auth`: Login mobile sin Turnstile con tokens JWT almacenados en SecureStore. Refresh token enviado en el body del POST (ya soportado por el backend).
- `mobile-ventas`: Listado de ventas propias, detalle de venta y flujo completo de nueva venta (productos + cliente + método de pago + factura electrónica).
- `mobile-clientes`: Búsqueda, listado, creación y detalle de clientes desde la app móvil.
- `mobile-informes`: Dashboard de estadísticas e informes para roles PROPIETARIO y ADMIN. No disponible para EMPLEADO.
- `mobile-navigation`: Navegación basada en roles con Expo Router. EMPLEADO ve ventas + clientes; PROPIETARIO/ADMIN ve también informes.

### Modified Capabilities

- `sidecar-entrypoint`: No hay cambios de requerimientos. El backend cloud en Render ya expone la API REST que consume la app móvil.

## Impact

- **Backend**: Nueva vista `MobileLoginView` en `usuario/auth_views.py`. Sin migraciones. Solo afecta modo cloud.
- **CORS**: Añadir configuración para orígenes de la app móvil (capacitor://, exp://).
- **Frontend web**: Sin cambios.
- **Tauri / PyInstaller**: Sin cambios. No requiere recompilación.
- **Nuevo directorio**: `mobile/` con proyecto Expo independiente.
- **Dependencias nuevas**: Expo SDK, React Navigation, Expo SecureStore, Expo Router.
- **Plataforma objetivo**: Android primero. iOS en el futuro sin cambios de backend.
