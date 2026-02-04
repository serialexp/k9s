// ABOUTME: Dialog for executing commands in a Kubernetes pod container
// ABOUTME: Allows user to select container, enter command, and view output

import { createSignal, Show, createEffect, For } from 'solid-js';
import { execInPod, type ExecResult } from '../lib/api';

interface Container {
  name: string;
}

interface ExecDialogProps {
  open: boolean;
  namespace: string;
  pod: string;
  containers: Container[];
  onClose: () => void;
}

const ExecDialog = (props: ExecDialogProps) => {
  const [container, setContainer] = createSignal('');
  const [command, setCommand] = createSignal('');
  const [running, setRunning] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [result, setResult] = createSignal<ExecResult | null>(null);

  createEffect(() => {
    if (props.open) {
      setError(null);
      setResult(null);
      setCommand('');
      if (props.containers.length > 0) {
        setContainer(props.containers[0].name);
      }
    }
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
    const cmd = command().trim();
    if (!cmd) return;

    setRunning(true);
    setError(null);
    setResult(null);

    try {
      const commandParts = parseCommand(cmd);
      const execResult = await execInPod(
        props.namespace,
        props.pod,
        container(),
        commandParts
      );
      setResult(execResult);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setRunning(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !running()) {
      e.preventDefault();
      handleRun();
    }
  };

  return (
    <Show when={props.open}>
      <div class="modal modal-open">
        <div class="modal-box max-w-2xl">
          <h3 class="font-bold text-lg">Execute Command</h3>
          <p class="py-2 text-sm opacity-70">
            Run a command in <strong>{props.namespace}/{props.pod}</strong>
          </p>

          <Show when={error()}>
            <div class="alert alert-error mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error()}</span>
            </div>
          </Show>

          <Show when={props.containers.length > 1}>
            <div class="form-control">
              <label class="label">
                <span class="label-text">Container</span>
              </label>
              <select
                class="select select-bordered w-full"
                value={container()}
                onChange={(e) => setContainer(e.currentTarget.value)}
                disabled={running()}
              >
                <For each={props.containers}>
                  {(c) => <option value={c.name}>{c.name}</option>}
                </For>
              </select>
            </div>
          </Show>

          <Show when={props.containers.length === 1}>
            <div class="form-control">
              <label class="label">
                <span class="label-text">Container</span>
              </label>
              <input
                type="text"
                class="input input-bordered"
                value={container()}
                disabled
              />
            </div>
          </Show>

          <div class="form-control mt-4">
            <label class="label">
              <span class="label-text">Command</span>
              <span class="label-text-alt text-xs opacity-60">Enter to run</span>
            </label>
            <input
              type="text"
              class="input input-bordered font-mono"
              placeholder="ls -la"
              value={command()}
              onInput={(e) => setCommand(e.currentTarget.value)}
              onKeyDown={handleKeyDown}
              disabled={running()}
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

          <div class="modal-action">
            <button
              type="button"
              class="btn btn-ghost"
              onClick={() => props.onClose()}
            >
              Close
            </button>
            <button
              type="button"
              class="btn btn-primary"
              onClick={handleRun}
              disabled={running() || !command().trim()}
            >
              <Show when={running()}>
                <span class="loading loading-spinner loading-xs" />
              </Show>
              Run
            </button>
          </div>
        </div>
        <div class="modal-backdrop" onClick={() => props.onClose()} />
      </div>
    </Show>
  );
};

export default ExecDialog;
