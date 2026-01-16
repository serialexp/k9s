// ABOUTME: Dialog for starting a port forward to a Kubernetes pod
// ABOUTME: Allows user to specify local and target ports with quick-select from container ports

import { createSignal, Show, createEffect, For } from 'solid-js';

interface ContainerPort {
  containerName: string;
  name?: string;
  containerPort: number;
  protocol?: string;
}

interface PortForwardDialogProps {
  open: boolean;
  namespace: string;
  pod: string;
  containerPorts?: ContainerPort[];
  onClose: () => void;
  onStart: (localPort: number, targetPort: number) => Promise<void>;
}

const PortForwardDialog = (props: PortForwardDialogProps) => {
  const [localPort, setLocalPort] = createSignal(8080);
  const [targetPort, setTargetPort] = createSignal(80);
  const [starting, setStarting] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  createEffect(() => {
    if (props.open) {
      setError(null);
      const ports = props.containerPorts ?? [];
      if (ports.length > 0) {
        const firstPort = ports[0].containerPort;
        setTargetPort(firstPort);
        setLocalPort(firstPort >= 1024 ? firstPort : 8080);
      } else {
        setTargetPort(80);
        setLocalPort(8080);
      }
    }
  });

  const selectPort = (port: ContainerPort) => {
    setTargetPort(port.containerPort);
    setLocalPort(port.containerPort >= 1024 ? port.containerPort : 8080);
  };

  const handleStart = async () => {
    setStarting(true);
    setError(null);
    try {
      await props.onStart(localPort(), targetPort());
      props.onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setStarting(false);
    }
  };

  const isValidPort = (port: number) => port >= 1024 && port <= 65535;
  const isValidTargetPort = (port: number) => port >= 1 && port <= 65535;

  const portLabel = (port: ContainerPort) => {
    if (port.name) {
      return `${port.containerPort} (${port.name})`;
    }
    return `${port.containerPort}`;
  };

  return (
    <Show when={props.open}>
      <div class="modal modal-open">
        <div class="modal-box">
          <h3 class="font-bold text-lg">Port Forward</h3>
          <p class="py-2 text-sm opacity-70">
            Forward local port to <strong>{props.namespace}/{props.pod}</strong>
          </p>

          <Show when={error()}>
            <div class="alert alert-error mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error()}</span>
            </div>
          </Show>

          <Show when={(props.containerPorts ?? []).length > 0}>
            <div class="form-control">
              <label class="label">
                <span class="label-text">Container Ports</span>
              </label>
              <div class="flex flex-wrap gap-2">
                <For each={props.containerPorts}>
                  {(port) => (
                    <button
                      type="button"
                      class={`btn btn-sm ${targetPort() === port.containerPort ? 'btn-primary' : 'btn-outline'}`}
                      onClick={() => selectPort(port)}
                      disabled={starting()}
                    >
                      {portLabel(port)}
                    </button>
                  )}
                </For>
              </div>
            </div>
          </Show>

          <div class="form-control mt-4">
            <label class="label">
              <span class="label-text">Target Port (in pod)</span>
              <span class="label-text-alt text-xs opacity-60">1-65535</span>
            </label>
            <input
              type="number"
              min="1"
              max="65535"
              class="input input-bordered"
              value={targetPort()}
              onInput={(e) => setTargetPort(parseInt(e.currentTarget.value) || 0)}
              disabled={starting()}
            />
          </div>

          <div class="form-control mt-4">
            <label class="label">
              <span class="label-text">Local Port</span>
              <span class="label-text-alt text-xs opacity-60">1024-65535</span>
            </label>
            <input
              type="number"
              min="1024"
              max="65535"
              class="input input-bordered"
              value={localPort()}
              onInput={(e) => setLocalPort(parseInt(e.currentTarget.value) || 0)}
              disabled={starting()}
            />
          </div>

          <p class="text-xs opacity-60 mt-4">
            After starting, access the pod at <code class="bg-base-300 px-1 rounded">localhost:{localPort()}</code>
          </p>

          <div class="modal-action">
            <button
              type="button"
              class="btn btn-ghost"
              onClick={() => props.onClose()}
              disabled={starting()}
            >
              Cancel
            </button>
            <button
              type="button"
              class="btn btn-primary"
              onClick={handleStart}
              disabled={starting() || !isValidPort(localPort()) || !isValidTargetPort(targetPort())}
            >
              <Show when={starting()}>
                <span class="loading loading-spinner loading-xs" />
              </Show>
              Start
            </button>
          </div>
        </div>
        <div class="modal-backdrop" onClick={() => props.onClose()} />
      </div>
    </Show>
  );
};

export default PortForwardDialog;
