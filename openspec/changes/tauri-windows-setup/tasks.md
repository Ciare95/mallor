## 1. Dependencias y herramientas

- [x] 1.1 Instalar Rust toolchain en la máquina de desarrollo (`rustup`) y verificar con `rustc --version`
- [x] 1.2 Instalar Tauri CLI: `npm install --save-dev @tauri-apps/cli@^2` en `package.json` raíz
- [x] 1.3 Instalar Tauri API: `npm install @tauri-apps/api@^2` en `package.json` raíz
- [x] 1.4 Instalar plugins Rust: añadir `tauri-plugin-updater`, `tauri-plugin-single-instance` a `src-tauri/Cargo.toml`
- [x] 1.5 Instalar plugins npm: `npm install @tauri-apps/plugin-updater @tauri-apps/plugin-single-instance`
- [x] 1.6 Verificar que Edge WebView2 está disponible en el equipo de desarrollo (`winget show Microsoft.EdgeWebView2Runtime`)

## 2. Inicialización del proyecto Tauri

- [x] 2.1 Estructura `src-tauri/` creada manualmente (equivalente a `tauri init`) — comando interactivo omitido
- [x] 2.2 Revisar y ajustar `src-tauri/tauri.conf.json`: título de ventana "Mallor Local", tamaño mínimo 1024x768, `webviewInstallMode: downloadBootstrapper`
- [x] 2.3 Generar iconos con `npx @tauri-apps/cli icon frontend/src/assets/mallor-logo.png` — `src-tauri/icons/` contiene `.ico` y todas las variantes `.png`
- [x] 2.4 Añadir scripts al `package.json` raíz: `"tauri": "tauri"`, `"tauri:dev": "tauri dev"`, `"tauri:build": "tauri build"`

## 3. Configuración del sidecar

- [x] 3.1 Crear carpeta `src-tauri/binaries/` — aquí irá `mallor-server-x86_64-pc-windows-msvc.exe` en tiempo de build
- [x] 3.2 Declarar el sidecar en `tauri.conf.json` bajo `bundle.externalBin`: `["binaries/mallor-server"]`
- [x] 3.3 Añadir permisos del sidecar en `src-tauri/capabilities/default.json`: `shell:allow-execute` con el scope del sidecar
- [x] 3.4 Escribir `src-tauri/src/main.rs`: spawn del sidecar al arrancar, kill al cerrar la app, manejo de error si no arranca (dialog + exit)
- [x] 3.5 Verificar compile: `npx @tauri-apps/cli build --no-bundle` compila exitosamente → `src-tauri/target/release/mallor-local.exe` generado

## 4. Plugin single-instance

- [x] 4.1 Registrar `tauri-plugin-single-instance` en `src-tauri/src/main.rs` con callback que llama a `window.set_focus()`
- [x] 4.2 Añadir permiso `single-instance:allow-*` en `capabilities/default.json`
- [ ] 4.3 Test manual: abrir la app dos veces — la segunda debe cerrar y la primera debe traerse al frente

## 5. Plugin updater

- [x] 5.1 Generar keypair de firma: `npx tauri signer generate -w ~/.tauri/mallor-local.key` — guardar la clave privada como GitHub Actions secret `TAURI_SIGNING_PRIVATE_KEY`
- [x] 5.2 Añadir la clave pública (`pubkey`) al `tauri.conf.json` bajo `plugins.updater`
- [x] 5.3 Configurar el endpoint del updater en `tauri.conf.json`: `"endpoints": ["https://github.com/Ciare95/mallor/releases/latest/download/latest.json"]`
- [x] 5.4 Registrar `tauri-plugin-updater` en `main.rs` con lógica: verificar update al arrancar, mostrar dialog si hay versión nueva, instalar en background y reiniciar
- [x] 5.5 Añadir permiso `updater:allow-check` y `updater:allow-install` en `capabilities/default.json`
- [x] 5.6 Crear el template de `latest.json` en `.github/` para referencia — será generado automáticamente por el workflow en cada release

## 6. GitHub Actions — Pipeline de release

- [x] 6.1 Crear `.github/workflows/release-local.yml` con trigger en push de tags `v*.*.*`
- [x] 6.2 Implementar Job 1 `build-sidecar` (windows-latest): instalar Python, pip install pyinstaller, ejecutar `pyinstaller mallor-server.spec` (el spec se crea en el cambio `django-pyinstaller-sidecar`), upload artifact
- [x] 6.3 Implementar Job 2 `build-tauri` (windows-latest, needs build-sidecar): download artifact del sidecar, copiarlo a `src-tauri/binaries/`, instalar Node + Rust, npm install en raíz y en frontend, `npm run build` del frontend, `cargo tauri build --bundles msi`
- [x] 6.4 Añadir paso de firma en Job 2: configurar secret `TAURI_SIGNING_PRIVATE_KEY` como env var para que Tauri firme el `.msi` automáticamente
- [x] 6.5 Añadir paso de release: via tauri-action con `includeUpdaterJson: true` que genera `latest.json` automáticamente
- [ ] 6.6 Verificar el workflow en un tag de prueba `v0.1.0-test` — revisar que los 3 assets aparecen en el GitHub Release

## 7. Verificación end-to-end (requiere cambio `django-pyinstaller-sidecar` completado)

- [ ] 7.1 Copiar manualmente `mallor-server.exe` a `src-tauri/binaries/` y compilar con `npm run tauri:build`
- [ ] 7.2 Instalar el `.msi` generado en una VM de Windows limpia (sin Python, sin Node)
- [ ] 7.3 Verificar: la app abre, el sidecar arranca, React carga correctamente desde `http://localhost:8765`
- [ ] 7.4 Verificar: cerrar la app termina el proceso `mallor-server.exe` (Task Manager)
- [ ] 7.5 Verificar: abrir la app dos veces — single-instance funciona
- [ ] 7.6 Verificar updater: publicar un `latest.json` de prueba con versión superior, confirmar que la app detecta la actualización al arrancar
