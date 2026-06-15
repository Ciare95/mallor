## ADDED Requirements

### Requirement: Login mobile sin Turnstile
El sistema SHALL exponer `POST /api/auth/mobile/login/` que acepta `username` y `password` en el body, aplica rate limiting por IP/username, y retorna access token, refresh token y payload de sesión sin verificar Cloudflare Turnstile.

#### Scenario: Login exitoso
- **WHEN** un usuario envía credenciales válidas a `/api/auth/mobile/login/`
- **THEN** el sistema retorna HTTP 200 con `access`, `refresh`, `user`, `empresas` y `empresa_activa` en el body

#### Scenario: Credenciales inválidas
- **WHEN** el usuario envía credenciales incorrectas
- **THEN** el sistema retorna HTTP 400 con `detail` de error y registra el intento fallido en el rate limiter

#### Scenario: Rate limit excedido
- **WHEN** el usuario supera 5 intentos fallidos en 15 minutos desde la misma IP
- **THEN** el sistema retorna HTTP 400 con mensaje de bloqueo temporal

### Requirement: Refresh de token sin cookie
El sistema SHALL aceptar el refresh token en el body de `POST /api/auth/refresh/` (campo `refresh`) además de la cookie httpOnly existente, sin cambios al comportamiento actual del web.

#### Scenario: Refresh exitoso vía body
- **WHEN** la app mobile envía `{ "refresh": "<token>" }` a `/api/auth/refresh/`
- **THEN** el sistema retorna un nuevo access token y un nuevo refresh token en el body

#### Scenario: Refresh token expirado o inválido
- **WHEN** la app envía un refresh token inválido o ya usado (blacklisted)
- **THEN** el sistema retorna HTTP 401 y la app redirige al login

### Requirement: Almacenamiento seguro de tokens en mobile
La app mobile SHALL almacenar el access token y el refresh token en `expo-secure-store` (Keystore de Android), nunca en AsyncStorage ni en memoria no persistente.

#### Scenario: Token guardado tras login
- **WHEN** el login es exitoso
- **THEN** el access token y el refresh token quedan en SecureStore antes de navegar al home

#### Scenario: Logout limpia los tokens
- **WHEN** el usuario hace logout
- **THEN** SecureStore borra ambos tokens y la app redirige al login

### Requirement: Renovación automática de access token
La app mobile SHALL renovar el access token automáticamente cuando recibe HTTP 401, usando el refresh token almacenado, sin interrumpir la petición original.

#### Scenario: Renovación transparente
- **WHEN** una petición a la API retorna 401 y hay refresh token válido en SecureStore
- **THEN** la app obtiene un nuevo access token, reintenta la petición original y el usuario no ve ningún error

#### Scenario: Refresh también falla
- **WHEN** el refresh retorna 401
- **THEN** la app limpia SecureStore, resetea el store de Zustand y navega al login
