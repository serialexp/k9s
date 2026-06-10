import { createSignal, For, Show } from 'solid-js';
import type { ReplicaSetListItem } from '../lib/api';
import { formatRelativeTime } from '../utils/datetime';

interface ReplicaSetTableProps {
  replicaSets: ReplicaSetListItem[];
  selectedReplicaSet?: string;
  loading?: boolean;
  onSelect?: (replicaSet: ReplicaSetListItem) => void;
}

const ReplicaSetTable = (props: ReplicaSetTableProps) => {
  const [search, setSearch] = createSignal('');
  const filtered = () => {
    const query = search().toLowerCase().trim();
    if (!query) return props.replicaSets;
    return props.replicaSets.filter((rs) =>
      rs.name.toLowerCase().includes(query) ||
      (rs.ownerReference ?? '').toLowerCase().includes(query) ||
      rs.images.some((img) => img.toLowerCase().includes(query))
    );
  };
  return (
  <div class="flex flex-col gap-3">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-semibold">ReplicaSets</h2>
      <div class="flex items-center gap-2">
        <input
          type="text"
          placeholder="Filter by name, owner, or image..."
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
            <th>Owner</th>
            <th>Desired</th>
            <th>Ready</th>
            <th>Available</th>
            <th>Images</th>
            <th>Age</th>
          </tr>
        </thead>
        <tbody>
          <Show
            when={filtered().length}
            fallback={
              <tr>
                <td colSpan={7} class="text-center text-sm opacity-70">
                  {search() ? 'No ReplicaSets match the filter.' : 'No ReplicaSets in this namespace.'}
                </td>
              </tr>
            }
          >
            <For each={filtered()}>
              {(rs) => {
                const healthy = rs.readyReplicas === rs.desiredReplicas && rs.desiredReplicas > 0;
                const degraded = rs.readyReplicas < rs.desiredReplicas && rs.desiredReplicas > 0;
                return (
                  <tr
                    class={`cursor-pointer hover:bg-base-200/50 ${props.selectedReplicaSet === rs.name ? 'bg-primary/20 border-l-4 border-primary' : ''}`}
                    onClick={() => props.onSelect?.(rs)}
                  >
                    <td class="font-mono text-sm">{rs.name}</td>
                    <td class="text-xs opacity-80">{rs.ownerReference || '—'}</td>
                    <td class="text-xs opacity-80">{rs.desiredReplicas}</td>
                    <td>
                      <span class={`text-xs font-semibold ${healthy ? 'text-success' : degraded ? 'text-warning' : 'opacity-80'}`}>
                        {rs.readyReplicas}
                      </span>
                    </td>
                    <td class="text-xs opacity-80">{rs.availableReplicas}</td>
                    <td class="text-xs opacity-80 max-w-xs truncate" title={rs.images.join(', ')}>
                      {rs.images.map((img) => img.split('/').pop()?.split(':')[0] ?? img).join(', ')}
                    </td>
                    <td class="text-xs opacity-80">{formatRelativeTime(rs.creationTimestamp)}</td>
                  </tr>
                );
              }}
            </For>
          </Show>
        </tbody>
      </table>
    </div>
  </div>
  );
};

export default ReplicaSetTable;
