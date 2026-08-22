## ADDED Requirements

### Requirement: Stack de servicios de producción

El despliegue SHALL definirse con un `docker-compose.yml` que orqueste dos servicios: `web` (Django + Gunicorn) y `db` (MySQL 8), en una red interna.

#### Scenario: Composición del stack
- **WHEN** se ejecuta `docker compose up -d` en el VPS
- **THEN** se levantan los servicios `web` y `db` en la misma red interna, y `web` es el único servicio expuesto al host

#### Scenario: Comunicación web-db
- **WHEN** el servicio `web` inicia
- **THEN** se conecta al servicio `db` usando el hostname interno del compose (no la IP del host)

### Requirement: Persistencia de datos

Los datos de la base de datos y los archivos subidos (media) SHALL persistir en volúmenes con nombre, independientes del ciclo de vida del contenedor.

#### Scenario: Reinicio sin pérdida de datos
- **WHEN** los contenedores se recrean o se actualiza la imagen (`docker compose up -d --build`)
- **THEN** los datos de MySQL y los archivos de `media` se conservan en los volúmenes `mysql_data` y `media_data`

#### Scenario: Backup de volúmenes
- **WHEN** se realiza un respaldo del VPS
- **THEN** los volúmenes `mysql_data` y `media_data` pueden respaldarse de forma independiente

### Requirement: Salud y reinicio automático

Los servicios SHALL declarar un healthcheck y una política de reinicio para recuperarse de fallos.

#### Scenario: Contenedor web no saludable
- **WHEN** el healthcheck del servicio `web` falla de forma sostenida
- **THEN** Docker reinicia el contenedor según la política `restart: unless-stopped`

#### Scenario: Orden de arranque
- **WHEN** se levanta el stack por primera vez
- **THEN** `web` espera a que `db` esté saludable antes de ejecutar migraciones
