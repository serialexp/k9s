#!/usr/bin/env node
// ABOUTME: Builds the backend into a single self-contained sidecar binary via `bun build --compile`.
// ABOUTME: Names the output with the Rust host target triple that Tauri's externalBin requires.

import { execFileSync } from 'node:child_process';
import { accessSync, constants, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { delimiter, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');

const BACKEND_ENTRY = join(repoRoot, 'apps/backend/src/index.ts');
const BACKEND_SRC = join(repoRoot, 'apps/backend/src');
const OUT_DIR = join(repoRoot, 'apps/desktop/src-tauri/binaries');
const OUT_BASE = 'k9s-backend';

// Bun >= 1.3.14 is required: earlier releases crash the whole process on the
// websocket stream-teardown used by @kubernetes/client-node exec/port-forward.
const MIN_BUN = [1, 3, 14];

const force = process.argv.includes('--force');

function fail(msg) {
  console.error(`\n[build-sidecar] ERROR: ${msg}\n`);
  process.exit(1);
}

function which(cmd) {
  const exts = process.platform === 'win32' ? ['.exe', '.cmd', '.bat', ''] : [''];
  for (const dir of (process.env.PATH ?? '').split(delimiter)) {
    if (!dir) continue;
    for (const ext of exts) {
      const candidate = join(dir, cmd + ext);
      try {
        accessSync(candidate, constants.X_OK);
        return candidate;
      } catch {
        // not here; keep looking
      }
    }
  }
  return null;
}

function hostTriple() {
  if (!which('rustc')) fail('`rustc` not found on PATH (needed to resolve the Tauri target triple).');
  const out = execFileSync('rustc', ['-Vv'], { encoding: 'utf8' });
  const line = out.split('\n').find((l) => l.startsWith('host:'));
  if (!line) fail('could not parse host triple from `rustc -Vv`.');
  return line.replace('host:', '').trim();
}

function checkBun() {
  if (!which('bun')) fail('`bun` not found on PATH. Install Bun >= 1.3.14 (https://bun.com).');
  const v = execFileSync('bun', ['--version'], { encoding: 'utf8' }).trim();
  const parts = v.split('.').map((n) => parseInt(n, 10));
  for (let i = 0; i < MIN_BUN.length; i++) {
    if ((parts[i] ?? 0) > MIN_BUN[i]) break;
    if ((parts[i] ?? 0) < MIN_BUN[i]) {
      fail(`bun ${v} is too old; need >= ${MIN_BUN.join('.')} (exec/port-forward crash on older releases).`);
    }
  }
  return v;
}

function newestMtime(dir) {
  let newest = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    const m = entry.isDirectory() ? newestMtime(p) : statSync(p).mtimeMs;
    if (m > newest) newest = m;
  }
  return newest;
}

const triple = hostTriple();
const ext = triple.includes('windows') ? '.exe' : '';
const outFile = join(OUT_DIR, `${OUT_BASE}-${triple}${ext}`);

// Idempotent: skip the (~8s) compile if the binary is already newer than the
// backend sources. Keeps `desktop:dev` fast on repeated launches.
if (!force && existsSync(outFile) && statSync(outFile).mtimeMs >= newestMtime(BACKEND_SRC)) {
  console.log(`[build-sidecar] up to date: ${outFile}`);
  process.exit(0);
}

const bunVersion = checkBun();
mkdirSync(OUT_DIR, { recursive: true });

console.log(`[build-sidecar] bun ${bunVersion} -> ${outFile}`);
execFileSync(
  'bun',
  ['build', BACKEND_ENTRY, '--compile', '--minify', '--sourcemap', '--outfile', outFile],
  { stdio: 'inherit', cwd: repoRoot },
);
console.log(`[build-sidecar] done: ${outFile}`);
