// ABOUTME: Dialog for executing commands on a Kubernetes node via a debug pod
// ABOUTME: Creates a privileged debug pod on open, cleans up on close

import { createSignal, Show, createEffect, onCleanup } from 'solid-js';
import {
  createNodeDebugSession,
  deleteNodeDebugSession,
  execOnNode,
  type DebugSession,
  type NodeExecResult
} from '../lib/api';

interface NodeExecDialogProps {
  open: boolean;
  nodeName: string;
  onClose: () => void;
}

const NodeExecDialog = (props: NodeExecDialogProps) => {
  const [session, setSession] = createSignal<DebugSession | null>(null);
  const [sessionError, setSessionError] = createSignal<string | null>(null);
  const [command, setCommand] = createSignal('');
  const [running, setRunning] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [result, setResult] = createSignal<NodeExecResult | null>(null);

  const createSession = async () => {
    setSessionError(null);
    try {
      const newSession = await createNodeDebugSession(props.nodeName);
      setSession(newSession);
    } catch (err) {
      setSessionError((err as Error).message);
    }
  };

  const cleanupSession = async () => {
    const currentSession = session();
    if (currentSession) {
      try {
        await deleteNodeDebugSession(currentSession.id);
      } catch {
        // Ignore cleanup errors
      }
      setSession(null);
    }
  };

  createEffect(() => {
    if (props.open && !session() && !sessionError()) {
      setError(null);
      setResult(null);
      setCommand('');
      createSession();
    }
  });

  createEffect(() => {
    if (!props.open) {
      cleanupSession();
      setSessionError(null);
      setError(null);
      setResult(null);
      setCommand('');
    }
  });

  onCleanup(() => {
    cleanupSession();
  });

  const parseCommand = (input: string): string[] => {
    const parts: string[] = [];
    let current = '';
    let inQuote = false;
    let quoteChar = '';

    for (const char of input) {
      if (!inQuote && (char === '"' || char === "'")) {
        inQuote = true;
        quoteChar = char;
      } else if (inQuote && char === quoteChar) {
        inQuote = false;
        quoteChar = '';
      } else if (!inQuote && char === ' ') {
        if (current) {
          parts.push(current);
          current = '';
        }
      } else {
        current += char;
      }
    }
    if (current) {
      parts.push(current);
    }
    return parts;
  };

  const handleRun = async () => {
    const currentSession = session();
    const cmd = command().trim();
    if (!currentSession || !cmd) return;

    setRunning(true);
    setError(null);
    setResult(null);

    try {
      const commandParts = parseCommand(cmd);
      const execResult = await execOnNode(currentSession.id, commandParts);
      setResult(execResult);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setRunning(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !running() && session()?.status === 'ready') {
      e.preventDefault();
      handleRun();
    }
  };

  const handleClose = () => {
    props.onClose();
  };

  const isReady = () => session()?.status === 'ready';

  return (
    <Show when={props.open}>
      <div class="modal modal-open">
        <div class="modal-box max-w-2xl">
          <h3 class="font-bold text-lg">Execute Command on Node</h3>
          <p class="py-2 text-sm opacity-70">
            Run a command on <strong>{props.nodeName}</strong>
          </p>

          <Show when={!session() && !sessionError()}>
            <div class="flex items-center gap-3 py-8 justify-center">
              <span class="loading loading-spinner loading-md" />
              <span class="text-sm">Creating debug pod on node...</span>
            </div>
          </Show>

          <Show when={sessionError()}>
            <div class="alert alert-error mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p class="font-semibold">Failed to create debug session</p>
                <p class="text-sm">{sessionError()}</p>
              </div>
            </div>
          </Show>

          <Show when={session()}>
            <div class="mb-4">
              <div class="flex items-center gap-2 text-sm">
                <span class={`badge badge-sm ${isReady() ? 'badge-success' : 'badge-warning'}`}>
                  {session()!.status}
                </span>
                <span class="opacity-60">Debug pod: {session()!.podName}</span>
              </div>
            </div>

            <Show when={error()}>
              <div class="alert alert-error mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{error()}</span>
              </div>
            </Show>

            <div class="form-control">
              <label class="label">
                <span class="label-text">Command</span>
                <span class="label-text-alt text-xs opacity-60">Enter to run</span>
              </label>
              <input
                type="text"
                class="input input-bordered font-mono"
                placeholder="ls -la /var/log"
                value={command()}
                onInput={(e) => setCommand(e.currentTarget.value)}
                onKeyDown={handleKeyDown}
                disabled={running() || !isReady()}
                autofocus
              />
            </div>

            <Show when={result()}>
              <div class="mt-4">
                <div class="flex items-center gap-2 mb-2">
                  <span class="text-sm font-semibold">Output</span>
                  <Show when={result()!.exitCode !== null}>
                    <span class={`badge badge-sm ${result()!.exitCode === 0 ? 'badge-success' : 'badge-error'}`}>
                      exit {result()!.exitCode}
                    </span>
                  </Show>
                </div>
                <div class="bg-base-300 rounded-lg p-3 max-h-64 overflow-auto">
                  <Show when={result()!.stdout}>
                    <pre class="text-sm font-mono whitespace-pre-wrap break-all">{result()!.stdout}</pre>
                  </Show>
                  <Show when={result()!.stderr}>
                    <pre class="text-sm font-mono whitespace-pre-wrap break-all text-error">{result()!.stderr}</pre>
                  </Show>
                  <Show when={!result()!.stdout && !result()!.stderr}>
                    <span class="text-sm opacity-50">(no output)</span>
                  </Show>
                </div>
              </div>
            </Show>
          </Show>

          <div class="modal-action">
            <button
              type="button"
              class="btn btn-ghost"
              onClick={handleClose}
            >
              Close
            </button>
            <Show when={session()}>
              <button
                type="button"
                class="btn btn-primary"
                onClick={handleRun}
                disabled={running() || !command().trim() || !isReady()}
              >
                <Show when={running()}>
                  <span class="loading loading-spinner loading-xs" />
                </Show>
                Run
              </button>
            </Show>
          </div>
        </div>
        <div class="modal-backdrop" onClick={handleClose} />
      </div>
    </Show>
  );
};

export default NodeExecDialog;
