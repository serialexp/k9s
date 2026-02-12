import { createSignal, For, Show } from 'solid-js';
import type { StatefulSetListItem } from '../lib/api';
import { formatRelativeTime } from '../utils/datetime';

interface StatefulSetTableProps {
  statefulSets: StatefulSetListItem[];
  selectedStatefulSet?: string;
  loading?: boolean;
  onSelect?: (statefulSet: StatefulSetListItem) => void;
}

const getReplicaBadge = (statefulSet: StatefulSetListItem) => {
  const { readyReplicas, replicas } = statefulSet;
  if (!replicas) {
    return 'badge-secondary';
  }
  if (readyReplicas === replicas) {
    return 'badge-success';
  }
  if (readyReplicas === 0) {
    return 'badge-error';
  }
  return 'badge-warning';
};

const StatefulSetTable = (props: StatefulSetTableProps) => {
  const [search, setSearch] = createSignal('');
  const filtered = () => {
    const query = search().toLowerCase().trim();
    if (!query) return props.statefulSets;
    return props.statefulSets.filter((s) =>
      s.name.toLowerCase().includes(query)
    );
  };
  return (
  <div class="flex flex-col gap-3">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-semibold">StatefulSets</h2>
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
            <th>Namespace</th>
            <th>Ready</th>
            <th>Updated</th>
            <th>Current</th>
            <th>Age</th>
          </tr>
        </thead>
        <tbody>
          <Show
            when={filtered().length}
            fallback={
              <tr>
                <td colSpan={6} class="text-center text-sm opacity-70">
                  {search() ? 'No statefulsets match the filter.' : 'No statefulsets in this namespace.'}
                </td>
              </tr>
            }
          >
            <For each={filtered()}>
              {(statefulSet) => (
                <tr
                  class={`cursor-pointer hover:bg-base-200/50 ${props.selectedStatefulSet === statefulSet.name ? 'bg-primary/20 border-l-4 border-primary' : ''}`}
                  onClick={() => props.onSelect?.(statefulSet)}
                >
                  <td class="font-mono text-sm">{statefulSet.name}</td>
                  <td class="text-xs opacity-80">{statefulSet.namespace}</td>
                  <td>
                    <span class={`badge badge-sm ${getReplicaBadge(statefulSet)}`}>
                      {statefulSet.readyReplicas}/{statefulSet.replicas}
                    </span>
                  </td>
                  <td class="text-sm">{statefulSet.updatedReplicas}</td>
                  <td class="text-sm">{statefulSet.currentReplicas}</td>
                  <td class="text-xs opacity-80">{formatRelativeTime(statefulSet.creationTimestamp)}</td>
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

export default StatefulSetTable;
