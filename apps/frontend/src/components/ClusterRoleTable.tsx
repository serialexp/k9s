// ABOUTME: Displays a table of Kubernetes ClusterRoles with rule counts and metadata
// ABOUTME: Supports selection highlighting and click handlers
import { createSignal, For, Show } from 'solid-js';
import type { ClusterRoleListItem } from '../lib/api';
import { formatRelativeTime } from '../utils/datetime';

interface ClusterRoleTableProps {
  clusterRoles: ClusterRoleListItem[];
  selectedClusterRole?: string;
  loading?: boolean;
  onSelect?: (clusterRole: ClusterRoleListItem) => void;
}

const ClusterRoleTable = (props: ClusterRoleTableProps) => {
  const [search, setSearch] = createSignal('');
  const filtered = () => {
    const query = search().toLowerCase().trim();
    if (!query) return props.clusterRoles;
    return props.clusterRoles.filter((cr) =>
      cr.name.toLowerCase().includes(query)
    );
  };
  return (
  <div class="flex flex-col gap-3">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-semibold">ClusterRoles</h2>
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
            <th>Rules</th>
            <th>Aggregation</th>
            <th>Age</th>
          </tr>
        </thead>
        <tbody>
          <Show
            when={filtered().length}
            fallback={
              <tr>
                <td colSpan={4} class="text-center text-sm opacity-70">
                  {search() ? 'No ClusterRoles match the filter.' : 'No ClusterRoles found.'}
                </td>
              </tr>
            }
          >
            <For each={filtered()}>
              {(clusterRole) => (
                <tr
                  class={`cursor-pointer hover:bg-base-200/50 ${props.selectedClusterRole === clusterRole.name ? 'bg-primary/20 border-l-4 border-primary' : ''}`}
                  onClick={() => props.onSelect?.(clusterRole)}
                >
                  <td class="font-mono text-sm">{clusterRole.name}</td>
                  <td class="text-xs opacity-80">{clusterRole.ruleCount}</td>
                  <td class="text-xs opacity-80">{clusterRole.aggregationRule ? 'Yes' : 'No'}</td>
                  <td class="text-xs opacity-80">{formatRelativeTime(clusterRole.creationTimestamp)}</td>
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

export default ClusterRoleTable;
