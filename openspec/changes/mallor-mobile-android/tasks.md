## 1. Backend — Auth mobile

- [x] 1.1 Crear `MobileLoginView` en `usuario/auth_views.py`: `POST /api/auth/mobile/login/` sin Turnstile, con rate limiting de `AuthService`
- [x] 1.2 Registrar la URL en `usuario/urls.py` bajo `/api/auth/mobile/login/`
- [x] 1.3 Ampliar CORS en `settings.py` para aceptar orígenes mobile (`exp://`, `capacitor://`)
- [x] 1.4 Tests de `MobileLoginView`: login exitoso, credenciales inválidas, rate limit (pytest)

## 2. Mobile — Setup del proyecto Expo

- [x] 2.1 Crear proyecto con `npx create-expo-app mobile --template blank-typescript` en la raíz del repo
- [x] 2.2 Instalar dependencias: `expo-router`, `expo-secure-store`, `zustand`, `@tanstack/react-query`, `axios`, `@expo/vector-icons`
- [x] 2.3 Configurar `app.json`: nombre "Mallor", bundle ID, permisos Android mínimos
- [x] 2.4 Crear estructura de directorios: `app/`, `src/services/`, `src/store/`, `src/components/`, `src/utils/`, `src/theme/`
- [x] 2.5 Definir token de diseño en `src/theme/index.ts`: colores, tipografía, radios, spacing según design.md

## 3. Mobile — Capa de autenticación

- [x] 3.1 Crear `src/services/api.ts`: instancia Axios sin cookies/CSRF, interceptor de request que lee access token de SecureStore
- [x] 3.2 Implementar interceptor de respuesta: captura 401, llama refresh vía body, reintenta petición original
- [x] 3.3 Copiar y adaptar `ventas.service.js`, `clientes.service.js`, `informes.service.js` a `src/services/`
- [x] 3.4 Copiar `utils/ventas.js`, `utils/clientes.js`, `utils/roleAccess.js` a `src/utils/`
- [x] 3.5 Crear store Zustand de auth en `src/store/useAuthStore.ts`: token, user, empresaActiva, acciones login/logout/refresh
- [x] 3.6 Crear layout `app/(auth)/_layout.tsx` y pantalla `app/(auth)/login.tsx` con formulario username/password

## 4. Mobile — Navegación y layout principal

- [x] 4.1 Crear layout raíz `app/_layout.tsx`: QueryClientProvider + Zustand provider + redirección según token
- [x] 4.2 Crear layout `app/(app)/_layout.tsx`: tab bar inferior con Ventas, Clientes, Informes (visible según rol)
- [x] 4.3 Implementar lógica de rol en tab bar: ocultar Informes si `role === 'EMPLEADO'`
- [x] 4.4 Crear componente `Header` reutilizable: título + botón retroceso condicional, sin subtítulos
- [x] 4.5 Crear selector de empresa activa (accesible desde header si el usuario tiene múltiples empresas)

## 5. Mobile — Módulo Clientes

- [x] 5.1 Crear `app/(app)/clientes/index.tsx`: FlatList con buscador debounce 300ms, paginación infinita
- [x] 5.2 Crear `app/(app)/clientes/[id].tsx`: detalle de cliente con acceso directo a "Nueva venta"
- [x] 5.3 Crear `app/(app)/clientes/nuevo.tsx`: formulario crear cliente con autocompletar por documento
- [x] 5.4 Crear componente `ClienteListItem` con nombre, documento, teléfono — sin decoración extra

## 6. Mobile — Módulo Ventas (lista y detalle)

- [x] 6.1 Crear `app/(app)/ventas/index.tsx`: FlatList con selector de estado (TODAS/TERMINADA/PENDIENTE/CANCELADA) y paginación infinita
- [x] 6.2 Crear componente `VentaListItem`: fecha, cliente, total, badge de estado con paleta pastel
- [x] 6.3 Crear `app/(app)/ventas/[id].tsx`: detalle con productos, totales, método de pago, estado factura y botón cancelar
- [x] 6.4 Implementar acción cancelar venta: modal de confirmación con campo motivo, llamada a API

## 7. Mobile — Flujo Nueva Venta (stepper 3 pasos)

- [x] 7.1 Crear `app/(app)/ventas/nueva.tsx`: stepper con indicador visual de paso (1/2/3) sin texto descriptivo
- [x] 7.2 Implementar Paso 1 — selección de cliente: buscador + opción "Consumidor Final" + trigger crear cliente rápido
- [x] 7.3 Crear componente modal `CrearClienteModal` para crear cliente sin salir del flujo de venta
- [x] 7.4 Implementar Paso 2 — agregar productos: buscador de productos, selector de cantidad, subtotal en tiempo real
- [x] 7.5 Implementar Paso 3 — resumen y pago: lista de productos, total, selector EFECTIVO/CRÉDITO, campo abono inicial condicional, toggle factura electrónica
- [x] 7.6 Llamar a `crearVentaCompleta` al confirmar, manejar error de red con posibilidad de reintento
- [x] 7.7 Navegar al detalle de la venta creada tras confirmación exitosa

## 8. Mobile — Módulo Informes

- [x] 8.1 Crear `app/(app)/informes/index.tsx`: dashboard con selector de período (Hoy / Semana / Mes / Personalizado)
- [x] 8.2 Renderizar métricas: total ventas, número de transacciones, ticket promedio, top 5 productos
- [x] 8.3 Implementar skeleton de carga con la misma estructura que el contenido (no spinner centrado)
- [x] 8.4 Implementar date picker nativo para rango personalizado

## 9. Mobile — Build y distribución

- [x] 9.1 Configurar `eas.json` con perfil `preview` (APK interno) y `production` (AAB para Play Store)
- [ ] 9.2 Generar primer APK de prueba con `eas build --platform android --profile preview`
- [ ] 9.3 Verificar login, flujo de nueva venta y dashboard en dispositivo físico Android
