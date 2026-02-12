import { createSignal, For, Show } from 'solid-js';
import type { DeploymentListItem } from '../lib/api';
import { formatRelativeTime } from '../utils/datetime';

interface DeploymentTableProps {
  deployments: DeploymentListItem[];
  selectedDeployment?: string;
  loading?: boolean;
  onSelect?: (deployment: DeploymentListItem) => void;
}

const getReplicaStatus = (deployment: DeploymentListItem) => {
  const { replicas, readyReplicas, availableReplicas } = deployment;
  if (readyReplicas === replicas && availableReplicas === replicas) {
    return 'badge-success';
  } else if (readyReplicas === 0) {
    return 'badge-error';
  } else {
    return 'badge-warning';
  }
};

const DeploymentTable = (props: DeploymentTableProps) => {
  const [search, setSearch] = createSignal('');
  const filtered = () => {
    const query = search().toLowerCase().trim();
    if (!query) return props.deployments;
    return props.deployments.filter((d) =>
      d.name.toLowerCase().includes(query)
    );
  };
  return (
  <div class="flex flex-col gap-3">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-semibold">Deployments</h2>
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
            <th>Up-to-date</th>
            <th>Available</th>
            <th>Age</th>
          </tr>
        </thead>
        <tbody>
          <Show
            when={filtered().length}
            fallback={
              <tr>
                <td colSpan={6} class="text-center text-sm opacity-70">
                  {search() ? 'No deployments match the filter.' : 'No deployments in this namespace.'}
                </td>
              </tr>
            }
          >
            <For each={filtered()}>
              {(deployment) => (
                <tr
                  class={`cursor-pointer hover:bg-base-200/50 ${props.selectedDeployment === deployment.name ? 'bg-primary/20 border-l-4 border-primary' : ''}`}
                  onClick={() => props.onSelect?.(deployment)}
                >
                  <td class="font-mono text-sm">{deployment.name}</td>
                  <td class="text-xs opacity-80">{deployment.namespace}</td>
                  <td>
                    <span class={`badge badge-sm ${getReplicaStatus(deployment)}`}>
                      {deployment.readyReplicas}/{deployment.replicas}
                    </span>
                  </td>
                  <td class="text-sm">{deployment.updatedReplicas}</td>
                  <td class="text-sm">{deployment.availableReplicas}</td>
                  <td class="text-xs opacity-80">{formatRelativeTime(deployment.creationTimestamp)}</td>
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

export default DeploymentTable;
