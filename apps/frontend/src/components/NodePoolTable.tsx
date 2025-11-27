// ABOUTME: Displays a table of Karpenter NodePools with weight and limits
// ABOUTME: Supports selection highlighting and click handlers
import { For, Show } from 'solid-js';
import type { NodePoolListItem } from '../lib/api';
import { formatRelativeTime } from '../utils/datetime';

interface NodePoolTableProps {
  nodePools: NodePoolListItem[];
  selectedNodePool?: string;
  loading?: boolean;
  onSelect?: (nodePool: NodePoolListItem) => void;
}

const NodePoolTable = (props: NodePoolTableProps) => (
  <div class="flex flex-col gap-3">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-semibold">NodePools</h2>
      <Show when={props.loading}>
        <span class="loading loading-xs loading-spinner" />
      </Show>
    </div>
    <div class="overflow-x-auto rounded-lg border border-base-200/50 bg-base-200/30">
      <table class="table table-zebra table-pin-rows">
        <thead>
          <tr class="text-sm uppercase tracking-wide text-base-content/60">
            <th>Name</th>
            <th>Weight</th>
            <th>Limits</th>
            <th>Status</th>
            <th>Age</th>
          </tr>
        </thead>
        <tbody>
          <Show
            when={props.nodePools.length}
            fallback={
              <tr>
                <td colSpan={5} class="text-center text-sm opacity-70">
                  No node pools found.
                </td>
              </tr>
            }
          >
            <For each={props.nodePools}>
              {(np) => (
                <tr
                  class={`cursor-pointer hover:bg-base-200/50 ${props.selectedNodePool === np.name ? 'bg-primary/20 border-l-4 border-primary' : ''}`}
                  onClick={() => props.onSelect?.(np)}
                >
                  <td class="font-mono text-sm">{np.name}</td>
                  <td class="text-xs opacity-80">{np.weight ?? '—'}</td>
                  <td class="text-xs opacity-80">
                    {np.limits && Object.keys(np.limits).length > 0
                      ? Object.entries(np.limits).map(([key, value]) => `${key}: ${value}`).join(', ')
                      : '—'}
                  </td>
                  <td>
                    <span class={`badge badge-sm ${np.readyStatus === 'True' ? 'badge-success' : np.readyStatus === 'False' ? 'badge-error' : 'badge-ghost'}`}>
                      {np.readyStatus === 'True' ? 'Ready' : np.readyStatus === 'False' ? 'Not Ready' : 'Unknown'}
                    </span>
                  </td>
                  <td class="text-xs opacity-80">{formatRelativeTime(np.creationTimestamp)}</td>
                </tr>
              )}
            </For>
          </Show>
        </tbody>
      </table>
    </div>
  </div>
);

export default NodePoolTable;
