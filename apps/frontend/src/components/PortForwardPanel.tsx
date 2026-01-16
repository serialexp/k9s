// ABOUTME: Panel showing active port forwards with controls to stop them
// ABOUTME: Displays port mapping details and connection information

import { For, Show, createSignal, onCleanup, onMount } from 'solid-js';
import { fetchPortForwards, stopPortForward, type PortForward } from '../lib/api';
import { formatRelativeTime } from '../utils/datetime';

interface PortForwardPanelProps {
  onRefresh?: () => void;
}

const PortForwardPanel = (props: PortForwardPanelProps) => {
  const [forwards, setForwards] = createSignal<PortForward[]>([]);
  const [loading, setLoading] = createSignal(false);
  const [stopping, setStopping] = createSignal<string | null>(null);

  const loadForwards = async () => {
    setLoading(true);
    try {
      const items = await fetchPortForwards();
      setForwards(items);
    } catch (error) {
      console.error('Failed to load port forwards', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async (id: string) => {
    setStopping(id);
    try {
      await stopPortForward(id);
      await loadForwards();
      props.onRefresh?.();
    } catch (error) {
      console.error('Failed to stop port forward', error);
    } finally {
      setStopping(null);
    }
  };

  onMount(() => {
    void loadForwards();
  });

  let refreshInterval: ReturnType<typeof setInterval>;
  onMount(() => {
    refreshInterval = setInterval(() => {
      void loadForwards();
    }, 5000);
  });

  onCleanup(() => {
    clearInterval(refreshInterval);
  });

  return (
    <div class="card bg-base-200/60">
      <div class="card-body gap-3">
        <div class="flex items-center justify-between">
          <h3 class="text-xs uppercase tracking-wide opacity-80">Active Port Forwards</h3>
          <button
            type="button"
            class="btn btn-ghost btn-xs"
            onClick={() => loadForwards()}
            disabled={loading()}
          >
            <Show when={loading()} fallback="Refresh">
              <span class="loading loading-spinner loading-xs" />
            </Show>
          </button>
        </div>

        <Show
          when={forwards().length > 0}
          fallback={
            <p class="text-sm opacity-60">No active port forwards.</p>
          }
        >
          <div class="overflow-x-auto">
            <table class="table table-sm">
              <thead>
                <tr class="text-xs uppercase tracking-wide opacity-70">
                  <th>Pod</th>
                  <th>Ports</th>
                  <th>Started</th>
                  <th>Connections</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <For each={forwards()}>
                  {(forward) => (
                    <tr>
                      <td class="font-mono text-xs">
                        <span class="opacity-60">{forward.namespace}/</span>
                        {forward.pod}
                      </td>
                      <td class="font-mono text-xs">
                        localhost:{forward.localPort} → {forward.targetPort}
                      </td>
                      <td class="text-xs opacity-70">
                        {formatRelativeTime(forward.startedAt)}
                      </td>
                      <td class="text-xs">
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
      </div>
    </div>
  );
};

export default PortForwardPanel;
