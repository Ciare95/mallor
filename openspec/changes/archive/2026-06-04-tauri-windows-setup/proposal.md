## Why

Mallor necesita una versión de escritorio para Windows que funcione en red local sin depender de conectividad a Render. La infraestructura de modo local ya existe en el backend (`offline` app, `MALLOR_MODE`, `run_local_worker`); lo que falta es la cáscara de aplicación nativa que empaquete y distribuya ese backend a los clientes.

## What Changes

- Nueva carpeta `src-tauri/` con la configuración completa de Tauri 2.0
- Tauri gestiona el ciclo de vida del sidecar `mallor-server.exe` (inicio/cierre)
- WebView (Edge en Windows) carga `http://localhost:8765` donde Django sirve React
- Plugin `single-instance` previene abrir múltiples ventanas de la app
- Plugin `updater` verifica GitHub Releases al arrancar y ofrece actualización
- GitHub Actions workflow `.github/workflows/release-local.yml` que construye el `.msi` y crea el Release
- Archivo `latest.json` generado en el release como endpoint del updater

**Afecta:** Solo modo local. Sin impacto en el despliegue cloud (Render). Requiere recompilar bundle de Tauri ante cualquier cambio en `src-tauri/`.

## Capabilities

### New Capabilities

- `tauri-shell`: Shell de aplicación Tauri 2.0 para Windows — ventana principal, ciclo de vida del sidecar, WebView apuntando a localhost:8765, icono y metadatos de la app
- `tauri-updater`: Auto-actualización via GitHub Releases con Tauri updater plugin — verifica `latest.json` al arrancar, descarga e instala en background
- `tauri-single-instance`: Plugin que garantiza una sola instancia activa — si el usuario intenta abrir la app dos veces, enfoca la ventana existente

### Modified Capabilities

*(ninguna — este cambio no modifica requisitos existentes, solo agrega infraestructura de empaquetado)*

## Impact

**Archivos nuevos:**
- `src-tauri/` — proyecto Rust completo de Tauri
- `src-tauri/tauri.conf.json` — configuración principal (sidecar, updater, bundle)
- `src-tauri/src/main.rs` — entrypoint Rust
- `src-tauri/Cargo.toml` — dependencias Rust
- `src-tauri/icons/` — iconos de la app para Windows
- `.github/workflows/release-local.yml` — pipeline de build y release
- `src-tauri/gen/schemas/` — schemas generados por Tauri CLI

**Dependencias nuevas:**
- Rust toolchain + `cargo-tauri` (solo en CI y máquina de desarrollo)
- Tauri CLI: `npm install --save-dev @tauri-apps/cli`
- Tauri API: `npm install @tauri-apps/api`
- Tauri plugins: `tauri-plugin-updater`, `tauri-plugin-single-instance`

**Sin cambios en:**
- Django (ningún archivo Python modificado)
- React/frontend (ningún componente modificado)
- `requirements.txt` (el sidecar Python es un cambio separado)
- Despliegue cloud en Render
