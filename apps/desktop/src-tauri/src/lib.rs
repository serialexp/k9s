// ABOUTME: Tauri desktop entry point for the k9s dashboard.
// ABOUTME: Spawns the bundled Node backend as a sidecar and exposes its port to the webview.

use std::sync::Mutex;

use tauri::State;

#[cfg(not(debug_assertions))]
use tauri_plugin_shell::{process::CommandEvent, ShellExt};

/// The localhost port the backend sidecar listens on. Deliberately offset from
/// the web app's backend (3130) so the desktop app can run alongside a local
/// `bun run dev`. Fixed for now; a future change can allocate a free port here and
/// inject it into the webview.
const BACKEND_PORT: u16 = 3140;

struct BackendPort(Mutex<u16>);

/// Exposed to the frontend so it can target the sidecar without hard-coding the
/// port. The web build ignores this and uses relative paths instead.
#[tauri::command]
fn backend_port(state: State<BackendPort>) -> u16 {
    *state.0.lock().unwrap()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(BackendPort(Mutex::new(BACKEND_PORT)))
        .invoke_handler(tauri::generate_handler![backend_port])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            // In dev (`tauri dev`) we do NOT spawn the compiled sidecar — the
            // developer runs the fast `tsx watch` backend on port 3140
            // (see `bun run desktop:dev`). In release/bundled builds we spawn the
            // self-contained Bun-compiled backend so the app is standalone.
            #[cfg(not(debug_assertions))]
            spawn_backend_sidecar(app.handle())?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(not(debug_assertions))]
fn spawn_backend_sidecar(handle: &tauri::AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let sidecar = handle
        .shell()
        .sidecar("k9s-backend")?
        .env("PORT", BACKEND_PORT.to_string())
        // Parity with the dev backend's TLS posture for EKS exec-credential
        // and self-signed endpoints. Revisit before shipping a signed product.
        .env("NODE_TLS_REJECT_UNAUTHORIZED", "0");

    let (mut rx, _child) = sidecar.spawn()?;

    // Tauri owns the child and reaps it on app exit. Drain its output so the
    // backend's logs surface in the app's stdout/stderr for debugging.
    tauri::async_runtime::spawn(async move {
        while let Some(event) = rx.recv().await {
            match event {
                CommandEvent::Stdout(line) => {
                    print!("[backend] {}", String::from_utf8_lossy(&line));
                }
                CommandEvent::Stderr(line) => {
                    eprint!("[backend] {}", String::from_utf8_lossy(&line));
                }
                CommandEvent::Terminated(payload) => {
                    eprintln!("[backend] terminated: {payload:?}");
                }
                _ => {}
            }
        }
    });

    Ok(())
}
