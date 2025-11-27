import { For, Show } from 'solid-js';
import type { DaemonSetListItem } from '../lib/api';
import { formatRelativeTime } from '../utils/datetime';

interface DaemonSetTableProps {
  daemonSets: DaemonSetListItem[];
  selectedDaemonSet?: string;
  loading?: boolean;
  onSelect?: (daemonSet: DaemonSetListItem) => void;
}

const getReadinessBadge = (daemonSet: DaemonSetListItem) => {
  const { numberReady, desiredNumberScheduled } = daemonSet;
  if (!desiredNumberScheduled) {
    return 'badge-secondary';
  }
  if (numberReady === desiredNumberScheduled) {
    return 'badge-success';
  }
  if (numberReady === 0) {
    return 'badge-error';
  }
  return 'badge-warning';
};

const DaemonSetTable = (props: DaemonSetTableProps) => (
  <div class="flex flex-col gap-3">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-semibold">DaemonSets</h2>
      <Show when={props.loading}>
        <span class="loading loading-xs loading-spinner" />
      </Show>
    </div>
    <div class="overflow-x-auto rounded-lg border border-base-200/50 bg-base-200/30">
      <table class="table table-zebra table-pin-rows">
        <thead>
          <tr class="text-sm uppercase tracking-wide text-base-content/60">
            <th>Name</th>
            <th>Namespace</th>
            <th>Ready</th>
            <th>Scheduled</th>
            <th>Available</th>
            <th>Age</th>
          </tr>
        </thead>
        <tbody>
          <Show
            when={props.daemonSets.length}
            fallback={
              <tr>
                <td colSpan={6} class="text-center text-sm opacity-70">
                  No daemonsets in this namespace.
                </td>
              </tr>
            }
          >
            <For each={props.daemonSets}>
              {(daemonSet) => (
                <tr
                  class={`cursor-pointer hover:bg-base-200/50 ${props.selectedDaemonSet === daemonSet.name ? 'bg-primary/20 border-l-4 border-primary' : ''}`}
                  onClick={() => props.onSelect?.(daemonSet)}
                >
                  <td class="font-mono text-sm">{daemonSet.name}</td>
                  <td class="text-xs opacity-80">{daemonSet.namespace}</td>
                  <td>
                    <span class={`badge badge-sm ${getReadinessBadge(daemonSet)}`}>
                      {daemonSet.numberReady}/{daemonSet.desiredNumberScheduled}
                    </span>
                  </td>
                  <td class="text-sm">{daemonSet.currentNumberScheduled}</td>
                  <td class="text-sm">{daemonSet.numberAvailable}</td>
                  <td class="text-xs opacity-80">{formatRelativeTime(daemonSet.creationTimestamp)}</td>
                </tr>
              )}
            </For>
          </Show>
        </tbody>
      </table>
    </div>
  </div>
);

export default DaemonSetTable;
