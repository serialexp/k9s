# k9s Dashboard — Desktop (Tauri)

Wraps the existing web app as a desktop application. The SolidJS frontend runs in
the Tauri webview; the existing Fastify backend is shipped as a **sidecar** binary
(compiled with `bun build --compile`) that the app spawns on launch. The web build
is unaffected — `apps/frontend/src/lib/api.ts` resolves the backend origin at
runtime (relative paths in a browser, `http://127.0.0.1:3140` inside Tauri).

## Ports

The desktop app uses its own `314x` block so it can run alongside the web app
(`313x`) without collisions:

| | Web | Desktop |
| --- | --- | --- |
| Frontend (Vite dev) | 3131 | 3141 |
| Backend | 3130 | 3140 |

The bundled app spawns its sidecar on **3140**, so it also won't fight a local
`bun run dev` backend on 3130.

## Requirements

- **Bun ≥ 1.3.14** — earlier versions crash the whole process on the websocket
  stream-teardown used by `@kubernetes/client-node` exec/port-forward. The build
  script enforces this minimum.
- Rust toolchain + the Tauri 2 system deps for your OS.

## Develop

The dev loop does **not** use the compiled sidecar — it runs the fast `tsx watch`
backend on port 3140 and a dedicated Vite dev server on 3141:

```bash
bun run desktop:dev   # tsx backend (:3140) + `tauri dev` (Vite :3141 + webview)
```

`tauri dev` builds nothing in Rust's release mode, so the sidecar spawn in
`src-tauri/src/lib.rs` is compiled out (`#[cfg(not(debug_assertions))]`). The
webview detects Tauri and talks to the `:3140` backend directly (the Vite proxy
is bypassed), so this runs cleanly alongside a web `bun run dev` on 3130/3131.

## Build a bundled app

```bash
bun run desktop:build # frontend build + sidecar compile + `tauri build`
```

This produces, under `src-tauri/target/release/bundle/`:
- `macos/k9s-dashboard.app` — the standalone app (sidecar embedded in `Contents/MacOS/k9s-backend`)
- `dmg/k9s-dashboard_<version>_<arch>.dmg`

The release build spawns the embedded sidecar on `PORT=3140` and reaps it on exit.

## How the sidecar is built

`scripts/build-sidecar.mjs` (run via `bun run sidecar:build`):
1. resolves the Rust host target triple from `rustc -Vv`,
2. runs `bun build apps/backend/src/index.ts --compile`,
3. writes `src-tauri/binaries/k9s-backend-<triple>[.exe]` (the name Tauri's
   `externalBin` requires).

It is idempotent — it skips the compile when the binary is newer than the backend
sources. Force a rebuild with `node scripts/build-sidecar.mjs --force`.

## Deferred (not yet done)

Code signing / notarization · auto-update · multi-platform CI sidecar matrix
(only the host triple is built today) · dynamic free-port selection (port is fixed
at 3140) · CSP hardening (`csp: null`) · dropping `NODE_TLS_REJECT_UNAUTHORIZED=0`.
