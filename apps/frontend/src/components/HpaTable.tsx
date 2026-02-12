// ABOUTME: Displays a table of Kubernetes HorizontalPodAutoscalers with scaling metrics
// ABOUTME: Supports selection highlighting and click handlers
import { createSignal, For, Show } from 'solid-js';
import type { HpaListItem } from '../lib/api';
import { formatRelativeTime } from '../utils/datetime';

interface HpaTableProps {
  hpas: HpaListItem[];
  selectedHpa?: string;
  loading?: boolean;
  onSelect?: (hpa: HpaListItem) => void;
}

const HpaTable = (props: HpaTableProps) => {
  const [search, setSearch] = createSignal('');
  const filtered = () => {
    const query = search().toLowerCase().trim();
    if (!query) return props.hpas;
    return props.hpas.filter((h) =>
      h.name.toLowerCase().includes(query)
    );
  };
  return (
  <div class="flex flex-col gap-3">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-semibold">HPAs</h2>
      <div class="flex items-center gap-2">
        <input
          type="text"
          placeholder="Filter by name..."
          class="input input-bordered input-sm w-64"
          value={search()}
          onInput={(e) => setSearch(e.currentTarget.value)}
        />
        <Show when={props.loading}>
          <span class="loading loading-xs loading-spinner" />
        </Show>
      </div>
    </div>
    <div class="overflow-x-auto rounded-lg border border-base-200/50 bg-base-200/30">
      <table class="table table-zebra table-pin-rows">
        <thead>
          <tr class="text-sm uppercase tracking-wide text-base-content/60">
            <th>Name</th>
            <th>Replicas</th>
            <th>CPU</th>
            <th>Memory</th>
            <th>Age</th>
          </tr>
        </thead>
        <tbody>
          <Show
            when={filtered().length}
            fallback={
              <tr>
                <td colSpan={5} class="text-center text-sm opacity-70">
                  {search() ? 'No HPAs match the filter.' : 'No HPAs in this namespace.'}
                </td>
              </tr>
            }
          >
            <For each={filtered()}>
              {(hpa) => (
                <tr
                  class={`cursor-pointer hover:bg-base-200/50 ${props.selectedHpa === hpa.name ? 'bg-primary/20 border-l-4 border-primary' : ''}`}
                  onClick={() => props.onSelect?.(hpa)}
                >
                  <td class="font-mono text-sm">{hpa.name}</td>
                  <td class="text-xs opacity-80">
                    {hpa.currentReplicas ?? '—'}/{hpa.desiredReplicas ?? '—'} ({hpa.minReplicas ?? '—'}-{hpa.maxReplicas})
                  </td>
                  <td class="text-xs opacity-80">
                    {hpa.currentCPUUtilization != null ? (
                      <span class={hpa.targetCPUUtilization != null && hpa.currentCPUUtilization < hpa.targetCPUUtilization ? 'text-success' : ''}>
                        {hpa.currentCPUUtilization}%
                      </span>
                    ) : '—'}
                    {hpa.targetCPUUtilization != null ? ` / ${hpa.targetCPUUtilization}%` : ''}
                  </td>
                  <td class="text-xs opacity-80">
                    {hpa.currentMemoryUtilization != null ? (
                      <span class={hpa.targetMemoryUtilization != null && hpa.currentMemoryUtilization < hpa.targetMemoryUtilization ? 'text-success' : ''}>
                        {hpa.currentMemoryUtilization}%
                      </span>
                    ) : '—'}
                    {hpa.targetMemoryUtilization != null ? ` / ${hpa.targetMemoryUtilization}%` : ''}
                  </td>
                  <td class="text-xs opacity-80">{formatRelativeTime(hpa.creationTimestamp)}</td>
                </tr>
              )}
            </For>
          </Show>
        </tbody>
      </table>
    </div>
  </div>
  );
};

export default HpaTable;
