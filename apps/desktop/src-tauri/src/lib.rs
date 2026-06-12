// ABOUTME: Tauri desktop entry point for the k9s dashboard.
// ABOUTME: Spawns the bundled Node backend as a sidecar and exposes its port to the webview.

use std::sync::Mutex;

use tauri::{State, WebviewUrl, WebviewWindowBuilder};

#[cfg(not(debug_assertions))]
use tauri_plugin_shell::{process::CommandEvent, ShellExt};

/// The localhost port the backend sidecar listens on. Deliberately offset from
/// the web app's backend (3130) so the desktop app can run alongside a local
/// `bun run dev`. Fixed for now; a future change can allocate a free port here and
/// inject it into the webview.
const BACKEND_PORT: u16 = 3140;

/// In release builds the frontend assets are served over a real `http://localhost`
/// server (tauri-plugin-localhost) instead of the default `tauri://` custom
/// protocol. WKWebView treats the custom protocol as a *secure* context, which
/// makes plain-`http://` calls to the sidecar (fetch AND EventSource/SSE) fail as
/// mixed content. Serving the UI over http restores same-scheme http→http access.
/// Dev is unaffected: Vite already serves the UI over http://localhost:3141.
#[cfg(not(debug_assertions))]
const UI_PORT: u16 = 3150;

struct BackendPort(Mutex<u16>);

/// Exposed to the frontend so it can target the sidecar without hard-coding the
/// port. The web build ignores this and uses relative paths instead.
#[tauri::command]
fn backend_port(state: State<BackendPort>) -> u16 {
    *state.0.lock().unwrap()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    #[allow(unused_mut)]
    let mut builder = tauri::Builder::default().plugin(tauri_plugin_shell::init());

    // Serve the bundled frontend over http://localhost in release so the webview
    // is an http origin and can reach the http sidecar without mixed-content
    // blocking. Not used in dev (the window loads the Vite devUrl directly).
    #[cfg(not(debug_assertions))]
    {
        builder = builder.plugin(tauri_plugin_localhost::Builder::new(UI_PORT).build());
    }

    builder
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

            // Create the main window programmatically so we can point release
            // builds at the localhost asset server (External URL) while dev loads
            // the Vite devUrl via the default app URL. Label "main" matches the
            // capabilities file.
            #[cfg(not(debug_assertions))]
            let url = WebviewUrl::External(
                format!("http://localhost:{UI_PORT}")
                    .parse()
                    .expect("valid localhost URL"),
            );
            #[cfg(debug_assertions)]
            let url = WebviewUrl::App("index.html".into());

            WebviewWindowBuilder::new(app, "main", url)
                .title("k9s Dashboard")
                .inner_size(1400.0, 900.0)
                .resizable(true)
                .build()?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

/// Build a PATH that includes the common dirs where CLI auth helpers live
/// (Homebrew on Apple silicon and Intel, the official AWS CLI installer's
/// /usr/local/bin, ~/.local/bin), prepended to whatever PATH we inherited, with
/// duplicates removed while preserving order. Covers the overwhelming majority
/// of setups; users with asdf/mise/custom dirs are the follow-up (see TODO.md).
#[cfg(all(not(debug_assertions), unix))]
fn enriched_unix_path() -> String {
    let mut dirs: Vec<String> = Vec::new();

    if let Ok(home) = std::env::var("HOME") {
        dirs.push(format!("{home}/.local/bin"));
    }
    for d in [
        "/opt/homebrew/bin",
        "/opt/homebrew/sbin",
        "/usr/local/bin",
        "/usr/bin",
        "/bin",
        "/usr/sbin",
        "/sbin",
    ] {
        dirs.push(d.to_string());
    }
    if let Ok(existing) = std::env::var("PATH") {
        dirs.extend(existing.split(':').map(str::to_string));
    }

    let mut seen = std::collections::HashSet::new();
    dirs.into_iter()
        .filter(|d| !d.is_empty() && seen.insert(d.clone()))
        .collect::<Vec<_>>()
        .join(":")
}

#[cfg(not(debug_assertions))]
fn spawn_backend_sidecar(handle: &tauri::AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    #[allow(unused_mut)]
    let mut sidecar = handle
        .shell()
        .sidecar("k9s-backend")?
        .env("PORT", BACKEND_PORT.to_string())
        // Parity with the dev backend's TLS posture for EKS exec-credential
        // and self-signed endpoints. Revisit before shipping a signed product.
        .env("NODE_TLS_REJECT_UNAUTHORIZED", "0");

    // A macOS app launched from Finder/Spotlight/dock inherits a minimal PATH
    // (/usr/bin:/bin:/usr/sbin:/sbin) that omits Homebrew and other common
    // install dirs. The kubeconfig exec credential plugins this app relies on
    // (`aws eks get-token`, `gke-gcloud-auth-plugin`, `kubelogin`, ...) then
    // can't be found, so every cluster call fails with `ENOENT: "aws"` and the
    // UI shows "Failed to load nodes". Hand the sidecar an enriched PATH so the
    // plugin (and anything it shells out to) resolves. The child still inherits
    // HOME/etc., so ~/.kube and ~/.aws are read normally.
    #[cfg(unix)]
    {
        sidecar = sidecar.env("PATH", enriched_unix_path());
    }

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
