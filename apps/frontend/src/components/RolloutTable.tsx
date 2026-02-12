import { createSignal, For, Show } from 'solid-js';
import type { RolloutListItem } from '../lib/api';
import { formatRelativeTime } from '../utils/datetime';

interface RolloutTableProps {
  rollouts: RolloutListItem[];
  selectedRollout?: string;
  loading?: boolean;
  onSelect?: (rollout: RolloutListItem) => void;
}

const getReplicaBadgeClass = (rollout: RolloutListItem) => {
  if (!rollout.replicas) {
    return 'badge-ghost';
  }
  if (rollout.readyReplicas === rollout.replicas) {
    return 'badge-success';
  }
  if (rollout.readyReplicas === 0) {
    return 'badge-error';
  }
  return 'badge-warning';
};

const getPhaseBadgeClass = (phase?: string) => {
  switch ((phase ?? '').toLowerCase()) {
    case 'healthy':
      return 'badge-success';
    case 'progressing':
    case 'paused':
      return 'badge-warning';
    case 'degraded':
    case 'aborted':
      return 'badge-error';
    default:
      return 'badge-secondary';
  }
};

const RolloutTable = (props: RolloutTableProps) => {
  const [search, setSearch] = createSignal('');
  const filtered = () => {
    const query = search().toLowerCase().trim();
    if (!query) return props.rollouts;
    return props.rollouts.filter((r) =>
      r.name.toLowerCase().includes(query) ||
      r.strategy?.toLowerCase().includes(query) ||
      r.phase?.toLowerCase().includes(query)
    );
  };
  return (
  <div class="flex flex-col gap-3">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-semibold">Argo Rollouts</h2>
      <div class="flex items-center gap-2">
        <input
          type="text"
          placeholder="Filter by name, strategy, or phase..."
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
            <th>Strategy</th>
            <th>Phase</th>
            <th>Ready</th>
            <th>Step</th>
            <th>Age</th>
          </tr>
        </thead>
        <tbody>
          <Show
            when={filtered().length}
            fallback={
              <tr>
                <td colSpan={6} class="text-center text-sm opacity-70">
                  {search() ? 'No rollouts match the filter.' : 'No rollouts in this namespace.'}
                </td>
              </tr>
            }
          >
            <For each={filtered()}>
              {(rollout) => (
                <tr
                  class={`cursor-pointer hover:bg-base-200/50 ${props.selectedRollout === rollout.name ? 'bg-primary/20 border-l-4 border-primary' : ''}`}
                  onClick={() => props.onSelect?.(rollout)}
                >
                  <td class="font-mono text-sm">{rollout.name}</td>
                  <td class="text-xs uppercase opacity-80">{rollout.strategy}</td>
                  <td>
                    <span class={`badge badge-sm ${getPhaseBadgeClass(rollout.phase)}`}>
                      {rollout.phase ?? 'Unknown'}
                    </span>
                  </td>
                  <td>
                    <span class={`badge badge-sm ${getReplicaBadgeClass(rollout)}`}>
                      {rollout.readyReplicas}/{rollout.replicas}
                    </span>
                  </td>
                  <td class="text-sm">{rollout.currentStepIndex !== undefined ? rollout.currentStepIndex : '—'}</td>
                  <td class="text-xs opacity-80">{formatRelativeTime(rollout.creationTimestamp)}</td>
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

export default RolloutTable;
