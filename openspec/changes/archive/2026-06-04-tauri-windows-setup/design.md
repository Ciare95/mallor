## Context

El proyecto ya tiene toda la infraestructura de modo local implementada en Django (`offline` app, `MALLOR_MODE`, `MALLOR_SERVE_FRONTEND`, `run_local_worker`). Este cambio añade únicamente la cáscara nativa de Windows: el proyecto Tauri 2.0 en `src-tauri/` que gestiona el ciclo de vida del sidecar Django, expone el WebView, y conecta con GitHub Releases para auto-actualización.

La comunicación entre Tauri (Rust) y Django es exclusivamente HTTP a `localhost:8765`. No se usa IPC de Tauri ni canales de mensajería — Django es un servidor HTTP completo y el WebView lo consume como lo haría un navegador.

## Goals / Non-Goals

**Goals:**
- Proyecto Tauri 2.0 funcional en `src-tauri/` que compila a `.msi` en Windows
- Gestión del ciclo de vida del sidecar: inicio al abrir la app, cierre al cerrarla
- WebView que carga `http://localhost:8765` con manejo del arranque en frío
- Plugin `single-instance`: una sola ventana, la segunda apertura enfoca la primera
- Plugin `updater`: verifica GitHub Releases al arrancar, descarga e instala silenciosamente
- Pipeline de GitHub Actions que construye y publica el release completo

**Non-Goals:**
- Firma Microsoft del `.msi` (SmartScreen warning aceptado en v1)
- Soporte macOS o Linux en este cambio
- Tray icon o menú de sistema (se puede añadir después)
- Cambios en Django, React, o el despliegue cloud de Render

## Decisions

### D1 — Puerto: fijo 8765 sin detección dinámica

**Decisión:** Puerto fijo `127.0.0.1:8765`. Si está ocupado al arrancar, la app muestra un dialog de error y sale.

**Rationale:** La detección dinámica requiere que el sidecar comunique el puerto elegido a Tauri (stdout parsing o archivo temporal), lo que complica el entrypoint y el WebView URL. En v1, con un solo usuario local, la colisión de puertos es un caso extremadamente raro. Si ocurre, el mensaje de error es suficiente.

**Alternativa descartada:** Puerto dinámico vía `0.0.0.0:0` + IPC de Tauri. Agrega complejidad sin beneficio real en el escenario de uso (un equipo, un usuario).

---

### D2 — Superusuario inicial: credenciales seed en primer arranque

**Decisión:** Si no existe ningún usuario en la base de datos SQLite, el entrypoint crea automáticamente un superusuario con credenciales por defecto (`admin` / `mallor1234`). La app React muestra un banner de "Cambia tu contraseña" en el primer login.

**Rationale:** Un wizard de configuración inicial en Tauri requiere una pantalla adicional pre-WebView (Rust) o una ruta especial en React (`/setup`). Para v1, las credenciales seed son la ruta más rápida hacia un sistema funcional. El riesgo de seguridad es bajo porque la app escucha solo en `127.0.0.1` (no expuesto en red).

**Alternativa descartada:** Wizard de setup con campo de contraseña en Tauri antes de cargar el WebView. Agrega ~2 semanas de trabajo Rust/UI sin impacto en la funcionalidad central.

**Pendiente en otro cambio:** `mallor-local-firstrun` gestionará la lógica de primer arranque, migrations automáticas, y el banner de cambio de contraseña.

---

### D3 — Arranque en frío: React spinner, sin splash screen nativa

**Decisión:** El WebView carga inmediatamente `http://localhost:8765`. Si Django no ha terminado de arrancar, React muestra un spinner/loading. Axios reintenta la primera llamada API hasta que responde (máximo 30s, luego error).

**Rationale:** Una splash screen nativa (Rust) requiere polling de puerto en el thread de Tauri y gestión de visibilidad de ventana. El spinner de React ya existe en la app y reutiliza el mismo patrón de loading. El usuario ve respuesta visual inmediata.

**Alternativa descartada:** `window.hide()` hasta que el sidecar responda en puerto 8765. Complica `main.rs` y el tiempo de espera es invisible para el usuario.

---

### D4 — Updater: GitHub Releases como endpoint, keypair Tauri

**Decisión:** Tauri updater plugin con endpoint `https://github.com/[org]/mallor/releases/latest/download/latest.json`. El keypair de firma se genera una vez con `tauri signer generate` y la clave privada se guarda como GitHub Actions secret (`TAURI_SIGNING_PRIVATE_KEY`).

**Rationale:** GitHub Releases es el storage de distribución ya decidido. Tauri 2.0 soporta GitHub Releases nativamente como fuente de updates. No se necesita servidor de updates propio.

**Flujo de update:**
```
App arranca → updater verifica latest.json en GitHub
→ si versión nueva: dialog "Nueva versión disponible"
→ usuario acepta → descarga .msi.zip en background
→ instala y reinicia automáticamente
```

---

### D5 — Estructura del proyecto Tauri

```
src-tauri/
├── Cargo.toml                  # dependencias Rust + plugins
├── tauri.conf.json             # config principal: bundle, sidecar, updater
├── src/
│   └── main.rs                 # entrypoint: spawn sidecar, ventana, plugins
├── icons/                      # iconos generados para Windows (.ico, .png)
├── capabilities/
│   └── default.json            # permisos Tauri 2.0
└── gen/schemas/                # generado por Tauri CLI, no editar
```

`package.json` raíz (no el de `frontend/`) gestionará los scripts de Tauri:
```json
"scripts": {
  "tauri": "tauri",
  "tauri:dev": "tauri dev",
  "tauri:build": "tauri build"
}
```

---

### D6 — GitHub Actions: dos jobs encadenados

```
Job 1: build-sidecar (windows-latest)
  → Produce: mallor-server.exe (PyInstaller)
  → Upload como artifact de Actions

Job 2: build-tauri (windows-latest, necesita Job 1)
  → Download mallor-server artifact
  → Copia a src-tauri/binaries/mallor-server-x86_64-pc-windows-msvc.exe
  → npm install + frontend build
  → cargo tauri build --bundles msi
  → gh release create v$VERSION con .msi + .msi.sig + latest.json
```

El nombre del binario en `src-tauri/binaries/` sigue la convención de Tauri para sidecars: `{name}-{target-triple}{ext}`.

## Risks / Trade-offs

**[Riesgo] Edge WebView2 no instalado** → En Windows 10 (pre-20H2) o Windows Server puede no estar disponible. Mitigación: `tauri.conf.json` configura `webviewInstallMode: downloadBootstrapper` — Tauri descarga e instala el runtime si no está presente.

**[Riesgo] PyInstaller oculta errores de import** → Django tiene muchos módulos con imports condicionales que PyInstaller puede no detectar. Mitigación: se crea una `--collect-all` exhaustiva en el `.spec` y se prueba el binario en una VM limpia sin Python instalado antes del primer release.

**[Riesgo] SmartScreen warning en instalación** → Sin firma MS, Windows muestra "Publisher desconocido". Mitigación aceptada: los clientes piloto son de confianza. Se documenta el workaround (clic en "Más información → Ejecutar"). La firma MS se añade en v2.

**[Riesgo] Puerto 8765 ocupado** → Otro proceso usa el puerto. Mitigación: el error message dice explícitamente "El puerto 8765 está en uso. Cierra otras instancias de Mallor Local o reinicia el equipo."

**[Trade-off] Tamaño del instalador** → El sidecar PyInstaller pesa ~80-130 MB. El `.msi` final será ~90-140 MB. Aceptable para distribución via descarga, pero lento en conexiones lentas. La actualización incremental de Tauri descarga solo el delta.

## Open Questions

*(ninguna — las dos preguntas abiertas de la exploración se resolvieron en D1 y D2)*
