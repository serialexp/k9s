import { For, Show } from 'solid-js';
import type { NodeClassListItem } from '../lib/api';
import { formatRelativeTime } from '../utils/datetime';

interface NodeClassTableProps {
  nodeClasses: NodeClassListItem[];
  selectedNodeClass?: string;
  loading?: boolean;
  onSelect?: (nodeClass: NodeClassListItem) => void;
}

const NodeClassTable = (props: NodeClassTableProps) => (
  <div class="flex flex-col gap-3">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-semibold">NodeClasses</h2>
      <Show when={props.loading}>
        <span class="loading loading-xs loading-spinner" />
      </Show>
    </div>
    <div class="overflow-x-auto rounded-lg border border-base-200/50 bg-base-200/30">
      <table class="table table-zebra table-pin-rows">
        <thead>
          <tr class="text-sm uppercase tracking-wide text-base-content/60">
            <th>Name</th>
            <th>AMI Family</th>
            <th>Role</th>
            <th>Status</th>
            <th>Age</th>
          </tr>
        </thead>
        <tbody>
          <Show
            when={props.nodeClasses.length}
            fallback={
              <tr>
                <td colSpan={5} class="text-center text-sm opacity-70">
                  No node classes found.
                </td>
              </tr>
            }
          >
            <For each={props.nodeClasses}>
              {(nc) => (
                <tr
                  class={`cursor-pointer hover:bg-base-200/50 ${props.selectedNodeClass === nc.name ? 'bg-primary/20 border-l-4 border-primary' : ''}`}
                  onClick={() => props.onSelect?.(nc)}
                >
                  <td class="font-mono text-sm">{nc.name}</td>
                  <td class="text-xs opacity-80">{nc.amiFamily || '-'}</td>
                  <td class="text-xs opacity-80 truncate max-w-xs" title={nc.role}>
                    {nc.role ? nc.role.split('/').pop() : '-'}
                  </td>
                  <td>
                    <span class={`badge badge-sm ${nc.readyStatus === 'True' ? 'badge-success' : nc.readyStatus === 'False' ? 'badge-error' : 'badge-ghost'}`}>
                      {nc.readyStatus === 'True' ? 'Ready' : nc.readyStatus === 'False' ? 'Not Ready' : 'Unknown'}
                    </span>
                  </td>
                  <td class="text-xs opacity-80">{formatRelativeTime(nc.creationTimestamp)}</td>
                </tr>
              )}
            </For>
          </Show>
        </tbody>
      </table>
    </div>
  </div>
);

export default NodeClassTable;
