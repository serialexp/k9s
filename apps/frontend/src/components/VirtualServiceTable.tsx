// ABOUTME: Displays a table of Istio VirtualServices with routing summary
// ABOUTME: Supports selection highlighting and click handlers
import { createSignal, For, Show } from 'solid-js';
import type { VirtualServiceListItem } from '../lib/api';
import { formatRelativeTime } from '../utils/datetime';

interface VirtualServiceTableProps {
  virtualservices: VirtualServiceListItem[];
  selectedVirtualService?: string;
  loading?: boolean;
  onSelect?: (virtualservice: VirtualServiceListItem) => void;
}

const VirtualServiceTable = (props: VirtualServiceTableProps) => {
  const [search, setSearch] = createSignal('');
  const filtered = () => {
    const query = search().toLowerCase().trim();
    if (!query) return props.virtualservices;
    return props.virtualservices.filter((vs) =>
      vs.name.toLowerCase().includes(query) ||
      vs.hosts.some((h) => h.toLowerCase().includes(query))
    );
  };
  return (
  <div class="flex flex-col gap-3">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-semibold">VirtualServices</h2>
      <div class="flex items-center gap-2">
        <input
          type="text"
          placeholder="Filter by name or host..."
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
            <th>Hosts</th>
            <th>Gateways</th>
            <th>HTTP Routes</th>
            <th>Age</th>
          </tr>
        </thead>
        <tbody>
          <Show
            when={filtered().length}
            fallback={
              <tr>
                <td colSpan={5} class="text-center text-sm opacity-70">
                  {search() ? 'No VirtualServices match the filter.' : 'No VirtualServices in this namespace.'}
                </td>
              </tr>
            }
          >
            <For each={filtered()}>
              {(vs) => (
                <tr
                  class={`cursor-pointer hover:bg-base-200/50 ${props.selectedVirtualService === vs.name ? 'bg-primary/20 border-l-4 border-primary' : ''}`}
                  onClick={() => props.onSelect?.(vs)}
                >
                  <td class="font-mono text-sm">{vs.name}</td>
                  <td class="text-xs opacity-80">{vs.hosts.join(', ') || '—'}</td>
                  <td class="text-xs opacity-80">{vs.gateways.join(', ') || '—'}</td>
                  <td class="text-xs opacity-80">{vs.httpRouteCount}</td>
                  <td class="text-xs opacity-80">{formatRelativeTime(vs.creationTimestamp)}</td>
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

export default VirtualServiceTable;
