import { createSignal, For, Show } from 'solid-js';
import type { IngressClassListItem } from '../lib/api';
import { formatRelativeTime } from '../utils/datetime';

interface IngressClassTableProps {
  ingressClasses: IngressClassListItem[];
  selectedIngressClass?: string;
  loading?: boolean;
  onSelect?: (ingressClass: IngressClassListItem) => void;
}

const IngressClassTable = (props: IngressClassTableProps) => {
  const [search, setSearch] = createSignal('');
  const filtered = () => {
    const query = search().toLowerCase().trim();
    if (!query) return props.ingressClasses;
    return props.ingressClasses.filter((ic) =>
      ic.name.toLowerCase().includes(query) ||
      (ic.controller ?? '').toLowerCase().includes(query)
    );
  };
  return (
  <div class="flex flex-col gap-3">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-semibold">Ingress Classes</h2>
      <div class="flex items-center gap-2">
        <input
          type="text"
          placeholder="Filter by name or controller..."
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
            <th>Controller</th>
            <th>Default</th>
            <th>Age</th>
          </tr>
        </thead>
        <tbody>
          <Show
            when={filtered().length}
            fallback={
              <tr>
                <td colSpan={4} class="text-center text-sm opacity-70">
                  {search() ? 'No ingress classes match the filter.' : 'No ingress classes found.'}
                </td>
              </tr>
            }
          >
            <For each={filtered()}>
              {(ic) => (
                <tr
                  class={`cursor-pointer hover:bg-base-200/50 ${props.selectedIngressClass === ic.name ? 'bg-primary/20 border-l-4 border-primary' : ''}`}
                  onClick={() => props.onSelect?.(ic)}
                >
                  <td class="font-mono text-sm">{ic.name}</td>
                  <td class="text-xs opacity-80">{ic.controller || '—'}</td>
                  <td>
                    <span class={`badge badge-sm ${ic.isDefault ? 'badge-success' : 'badge-ghost'}`}>
                      {ic.isDefault ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td class="text-xs opacity-80">{formatRelativeTime(ic.creationTimestamp)}</td>
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

export default IngressClassTable;
