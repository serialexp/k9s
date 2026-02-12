// ABOUTME: Displays a table of Kubernetes Ingresses with routing summary
// ABOUTME: Supports selection highlighting and click handlers
import { createSignal, For, Show } from 'solid-js';
import type { IngressListItem } from '../lib/api';
import { formatRelativeTime } from '../utils/datetime';

interface IngressTableProps {
  ingresses: IngressListItem[];
  selectedIngress?: string;
  loading?: boolean;
  onSelect?: (ingress: IngressListItem) => void;
}

const IngressTable = (props: IngressTableProps) => {
  const [search, setSearch] = createSignal('');
  const filtered = () => {
    const query = search().toLowerCase().trim();
    if (!query) return props.ingresses;
    return props.ingresses.filter((i) =>
      i.name.toLowerCase().includes(query) ||
      i.hosts.some((h) => h.toLowerCase().includes(query))
    );
  };
  return (
  <div class="flex flex-col gap-3">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-semibold">Ingresses</h2>
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
            <th>Class</th>
            <th>Hosts</th>
            <th>Services</th>
            <th>TLS Hosts</th>
            <th>Age</th>
          </tr>
        </thead>
        <tbody>
          <Show
            when={filtered().length}
            fallback={
              <tr>
                <td colSpan={6} class="text-center text-sm opacity-70">
                  {search() ? 'No Ingresses match the filter.' : 'No Ingresses in this namespace.'}
                </td>
              </tr>
            }
          >
            <For each={filtered()}>
              {(ingress) => (
                <tr
                  class={`cursor-pointer hover:bg-base-200/50 ${props.selectedIngress === ingress.name ? 'bg-primary/20 border-l-4 border-primary' : ''}`}
                  onClick={() => props.onSelect?.(ingress)}
                >
                  <td class="font-mono text-sm">{ingress.name}</td>
                  <td class="text-xs opacity-80">{ingress.className || '—'}</td>
                  <td class="text-xs opacity-80">{ingress.hosts.length ? ingress.hosts.join(', ') : '—'}</td>
                  <td class="text-xs opacity-80">{ingress.serviceCount}</td>
                  <td class="text-xs opacity-80">{ingress.tlsHosts.length ? ingress.tlsHosts.join(', ') : '—'}</td>
                  <td class="text-xs opacity-80">{formatRelativeTime(ingress.creationTimestamp)}</td>
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

export default IngressTable;
