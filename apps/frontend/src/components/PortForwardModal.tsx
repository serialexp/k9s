// ABOUTME: Modal dialog showing all active port forwards
// ABOUTME: Accessible from the header navigation, displays forwards with stop controls

import { For, Show, createSignal } from 'solid-js';
import { Portal } from 'solid-js/web';
import { portForwardStore } from '../stores/portForwardStore';
import { formatRelativeTime } from '../utils/datetime';

const PortForwardModal = () => {
  const [stopping, setStopping] = createSignal<string | null>(null);

  const handleStop = async (id: string) => {
    setStopping(id);
    try {
      await portForwardStore.stopForward(id);
    } finally {
      setStopping(null);
    }
  };

  return (
    <Show when={portForwardStore.modalOpen()}>
      <Portal>
        <div class="modal modal-open">
        <div class="modal-box max-w-2xl">
          <h3 class="font-bold text-lg">Active Port Forwards</h3>
          <p class="py-2 text-sm opacity-70">
            Port forwards tunnel local TCP ports to pods in the cluster.
          </p>

          <Show
            when={portForwardStore.forwards().length > 0}
            fallback={
              <div class="py-8 text-center">
                <p class="text-sm opacity-60">No active port forwards.</p>
                <p class="text-xs opacity-40 mt-2">
                  Start a port forward from a pod's detail view.
                </p>
              </div>
            }
          >
            <div class="overflow-x-auto mt-4">
              <table class="table table-sm">
                <thead>
                  <tr class="text-xs uppercase tracking-wide opacity-70">
                    <th>Pod</th>
                    <th>Local Port</th>
                    <th>Target Port</th>
                    <th>Started</th>
                    <th>Connections</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  <For each={portForwardStore.forwards()}>
                    {(forward) => (
                      <tr>
                        <td class="font-mono text-xs">
                          <div class="opacity-60">{forward.namespace}</div>
                          <div>{forward.pod}</div>
                        </td>
                        <td class="font-mono text-sm">
                          <a
                            href={`http://localhost:${forward.localPort}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            class="link link-primary"
                          >
                            {forward.localPort}
                          </a>
                        </td>
                        <td class="font-mono text-sm">
                          {forward.targetPort}
                        </td>
                        <td class="text-xs opacity-70">
                          {formatRelativeTime(forward.startedAt)}
                        </td>
                        <td class="text-xs text-center">
                          {forward.connectionCount}
                        </td>
                        <td>
                          <button
                            type="button"
                            class="btn btn-ghost btn-xs text-error"
                            onClick={() => handleStop(forward.id)}
                            disabled={stopping() === forward.id}
                          >
                            <Show
                              when={stopping() === forward.id}
                              fallback="Stop"
                            >
                              <span class="loading loading-spinner loading-xs" />
                            </Show>
                          </button>
                        </td>
                      </tr>
                    )}
                  </For>
                </tbody>
              </table>
            </div>
          </Show>

          <div class="modal-action">
            <button
              type="button"
              class="btn"
              onClick={() => portForwardStore.closeModal()}
            >
              Close
            </button>
          </div>
        </div>
        <div class="modal-backdrop" onClick={() => portForwardStore.closeModal()} />
        </div>
      </Portal>
    </Show>
  );
};

export default PortForwardModal;
