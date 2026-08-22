## ADDED Requirements

### Requirement: Despliegue automático con push a main

El pipeline de GitHub Actions SHALL desplegar a producción automáticamente cuando se hace `git push` a la rama `main`.

#### Scenario: Push a main dispara el deploy
- **WHEN** un cambio se fusiona o se empuja a `main`
- **THEN** se ejecuta el workflow `.github/workflows/deploy.yml` y despliega al VPS sin intervención manual

#### Scenario: Push a otras ramas no despliega
- **WHEN** se empuja a `develop` u otra rama distinta de `main`
- **THEN** el workflow de despliegue a producción NO se ejecuta

### Requirement: Deploy por SSH sin instalar paquetes en el servidor

El workflow SHALL conectarse al VPS por SSH y ejecutar la secuencia `git pull` → `docker compose build` → `migrate` → `collectstatic` → `restart`, sin instalar paquetes en el host.

#### Scenario: Secuencia de despliegue
- **WHEN** el workflow se conecta por SSH al VPS
- **THEN** ejecuta en orden `git pull`, `docker compose build`, `docker compose up -d`, y la migración corre dentro del contenedor (`docker compose exec web python manage.py migrate`)

#### Scenario: Host sin dependencias de lenguaje
- **WHEN** el despliegue ocurre en un servidor que solo tiene Docker Engine (sin Python, Node ni MySQL instalados)
- **THEN** el build y el arranque funcionan porque todo vive dentro de la imagen Docker

### Requirement: Secretos de despliegue vía GitHub Secrets

Las credenciales de SSH y las variables sensibles del servidor SHALL proveerse mediante `GitHub Secrets`, nunca hardcodeadas en el workflow ni en el repositorio.

#### Scenario: Conexión SSH autenticada
- **WHEN** el workflow se conecta al VPS
- **THEN** usa `SSH_HOST`, `SSH_USER` y `SSH_KEY` provenientes de GitHub Secrets

#### Scenario: Entorno de producción en el servidor
- **WHEN** los contenedores arrancan en el VPS
- **THEN** leen sus variables desde un archivo `.env` en el servidor (fuera del repositorio), no desde valores versionados

### Requirement: Proxy y SSL delegados a CloudPanel

El tráfico HTTPS y el proxy inverso SHALL ser gestionados por CloudPanel en el VPS, que redirige al contenedor `web`.

#### Scenario: Dominio con SSL
- **WHEN** un cliente accede al dominio de producción por HTTPS
- **THEN** CloudPanel termina el TLS (certificado Let's Encrypt) y reenvía la petición al puerto expuesto por el contenedor `web`

#### Scenario: Sin nginx en el stack
- **WHEN** se inspecciona `docker-compose.yml`
- **THEN** no existe un servicio `nginx` propio; el proxy es responsabilidad exclusiva de CloudPanel
