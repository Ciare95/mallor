use tauri::Manager;
use tauri_plugin_shell::ShellExt;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // Una sola instancia: si ya hay una ventana, la trae al frente
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
            // Arrancar sidecar Django
            let sidecar_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                if let Err(e) = start_sidecar(&sidecar_handle).await {
                    eprintln!("[mallor] error fatal del sidecar: {e}");
                    sidecar_handle.exit(1);
                }
            });

            // Esperar a que el sidecar esté listo y navegar la ventana
            let nav_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                wait_for_sidecar_and_navigate(nav_handle).await;
            });

            // Verificar actualizaciones en paralelo (no bloquea el arranque)
            let updater_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                check_for_updates(&updater_handle).await;
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error al ejecutar la aplicación Tauri");
}

async fn wait_for_sidecar_and_navigate(app: tauri::AppHandle) {
    use std::net::TcpStream;
    use std::time::Duration;

    eprintln!("[mallor] esperando que el servidor esté listo en localhost:8765...");

    for attempt in 0u32..120 {
        // Espera 2 segundos e intenta conectar por TCP (sin bloquear el executor)
        let ready = tauri::async_runtime::spawn_blocking(|| {
            std::thread::sleep(Duration::from_secs(2));
            TcpStream::connect_timeout(
                &"127.0.0.1:8765".parse().unwrap(),
                Duration::from_secs(1),
            )
            .is_ok()
        })
        .await
        .unwrap_or(false);

        if ready {
            eprintln!("[mallor] servidor listo tras {}s — navegando", attempt * 2);
            if let Some(window) = app.get_webview_window("main") {
                let url = tauri::Url::parse("http://localhost:8765/").unwrap();
                let _ = window.navigate(url);
            }
            return;
        }
    }

    eprintln!("[mallor] timeout: el sidecar no arrancó en 4 minutos");
}

async fn start_sidecar(
    app: &tauri::AppHandle,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    use tauri_plugin_shell::process::CommandEvent;

    let (mut rx, _child) = app.shell().sidecar("mallor-server")?.spawn()?;

    while let Some(event) = rx.recv().await {
        match event {
            CommandEvent::Stderr(line) => {
                eprintln!("[mallor-server] {}", String::from_utf8_lossy(&line));
            }
            CommandEvent::Error(err) => {
                eprintln!("[mallor-server] error: {err}");
                break;
            }
            CommandEvent::Terminated(payload) => {
                eprintln!(
                    "[mallor-server] terminado con código: {:?}",
                    payload.code
                );
                break;
            }
            _ => {}
        }
    }

    Ok(())
}

async fn check_for_updates(app: &tauri::AppHandle) {
    use tauri_plugin_dialog::{DialogExt, MessageDialogButtons, MessageDialogKind};
    use tauri_plugin_updater::UpdaterExt;

    let updater = match app.updater() {
        Ok(u) => u,
        Err(e) => {
            eprintln!("[updater] no configurado: {e}");
            return;
        }
    };

    match updater.check().await {
        Ok(Some(update)) => {
            let version = update.version.clone();
            let confirmed = app
                .dialog()
                .message(format!(
                    "Nueva versión {version} disponible.\n\n\
                    ¿Deseas instalarla ahora?\n\
                    La aplicación se reiniciará automáticamente.",
                ))
                .title("Actualización disponible")
                .kind(MessageDialogKind::Info)
                .buttons(MessageDialogButtons::OkCancelCustom(
                    "Instalar ahora".into(),
                    "Después".into(),
                ))
                .blocking_show();

            if confirmed {
                if let Err(e) = update
                    .download_and_install(|_chunk, _total| {}, || {})
                    .await
                {
                    eprintln!("[updater] error al instalar: {e}");
                    return;
                }
                app.restart();
            }
        }
        Ok(None) => {
            eprintln!("[updater] versión actual al día");
        }
        Err(e) => {
            // Fallo silencioso: sin internet o GitHub no accesible
            eprintln!("[updater] error al verificar: {e}");
        }
    }
}
