// ABOUTME: Displays a table of Istio Gateways with server and host info
// ABOUTME: Supports selection highlighting and click handlers
import { createSignal, For, Show } from 'solid-js';
import type { GatewayListItem } from '../lib/api';
import { formatRelativeTime } from '../utils/datetime';

interface GatewayTableProps {
  gateways: GatewayListItem[];
  selectedGateway?: string;
  loading?: boolean;
  onSelect?: (gateway: GatewayListItem) => void;
}

const GatewayTable = (props: GatewayTableProps) => {
  const [search, setSearch] = createSignal('');
  const filtered = () => {
    const query = search().toLowerCase().trim();
    if (!query) return props.gateways;
    return props.gateways.filter((gw) =>
      gw.name.toLowerCase().includes(query) ||
      gw.hosts.some((h) => h.toLowerCase().includes(query))
    );
  };
  return (
  <div class="flex flex-col gap-3">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-semibold">Gateways</h2>
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
            <th>Servers</th>
            <th>Hosts</th>
            <th>Age</th>
          </tr>
        </thead>
        <tbody>
          <Show
            when={filtered().length}
            fallback={
              <tr>
                <td colSpan={4} class="text-center text-sm opacity-70">
                  {search() ? 'No Gateways match the filter.' : 'No Gateways in this namespace.'}
                </td>
              </tr>
            }
          >
            <For each={filtered()}>
              {(gw) => (
                <tr
                  class={`cursor-pointer hover:bg-base-200/50 ${props.selectedGateway === gw.name ? 'bg-primary/20 border-l-4 border-primary' : ''}`}
                  onClick={() => props.onSelect?.(gw)}
                >
                  <td class="font-mono text-sm">{gw.name}</td>
                  <td class="text-xs opacity-80">{gw.serverCount}</td>
                  <td class="text-xs opacity-80">{gw.hosts.join(', ') || '—'}</td>
                  <td class="text-xs opacity-80">{formatRelativeTime(gw.creationTimestamp)}</td>
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

export default GatewayTable;
