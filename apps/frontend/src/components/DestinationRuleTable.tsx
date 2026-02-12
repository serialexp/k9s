// ABOUTME: Displays a table of Istio DestinationRules with traffic policy summary
// ABOUTME: Supports selection highlighting and click handlers
import { createSignal, For, Show } from 'solid-js';
import type { DestinationRuleListItem } from '../lib/api';
import { formatRelativeTime } from '../utils/datetime';

interface DestinationRuleTableProps {
  destinationrules: DestinationRuleListItem[];
  selectedDestinationRule?: string;
  loading?: boolean;
  onSelect?: (destinationrule: DestinationRuleListItem) => void;
}

const DestinationRuleTable = (props: DestinationRuleTableProps) => {
  const [search, setSearch] = createSignal('');
  const filtered = () => {
    const query = search().toLowerCase().trim();
    if (!query) return props.destinationrules;
    return props.destinationrules.filter((dr) =>
      dr.name.toLowerCase().includes(query) ||
      dr.host?.toLowerCase().includes(query)
    );
  };
  return (
  <div class="flex flex-col gap-3">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-semibold">DestinationRules</h2>
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
            <th>Host</th>
            <th>Subsets</th>
            <th>LB Policy</th>
            <th>TLS Mode</th>
            <th>Age</th>
          </tr>
        </thead>
        <tbody>
          <Show
            when={filtered().length}
            fallback={
              <tr>
                <td colSpan={6} class="text-center text-sm opacity-70">
                  {search() ? 'No DestinationRules match the filter.' : 'No DestinationRules in this namespace.'}
                </td>
              </tr>
            }
          >
            <For each={filtered()}>
              {(dr) => (
                <tr
                  class={`cursor-pointer hover:bg-base-200/50 ${props.selectedDestinationRule === dr.name ? 'bg-primary/20 border-l-4 border-primary' : ''}`}
                  onClick={() => props.onSelect?.(dr)}
                >
                  <td class="font-mono text-sm">{dr.name}</td>
                  <td class="text-xs opacity-80">{dr.host || '—'}</td>
                  <td class="text-xs opacity-80">{dr.subsetCount}</td>
                  <td class="text-xs opacity-80">{dr.loadBalancer ?? '—'}</td>
                  <td class="text-xs opacity-80">{dr.tlsMode ?? '—'}</td>
                  <td class="text-xs opacity-80">{formatRelativeTime(dr.creationTimestamp)}</td>
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

export default DestinationRuleTable;
