// ABOUTME: Displays a table of KEDA ScaledObjects with their targets, scaling ranges, and status
// ABOUTME: Supports selection highlighting and click handlers
import { For, Show } from 'solid-js';
import type { ScaledObjectListItem } from '../lib/api';
import { formatRelativeTime } from '../utils/datetime';

interface ScaledObjectTableProps {
  scaledobjects: ScaledObjectListItem[];
  selectedScaledObject?: string;
  loading?: boolean;
  onSelect?: (scaledobject: ScaledObjectListItem) => void;
}

const statusBadgeClass = (ready: boolean, active: boolean) => {
  if (ready && active) return 'badge-success';
  if (ready && !active) return 'badge-info';
  return 'badge-error';
};

const statusText = (ready: boolean, active: boolean) => {
  if (ready && active) return 'Active';
  if (ready && !active) return 'Idle';
  return 'Not Ready';
};

const ScaledObjectTable = (props: ScaledObjectTableProps) => (
  <div class="flex flex-col gap-3">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-semibold">ScaledObjects</h2>
      <Show when={props.loading}>
        <span class="loading loading-xs loading-spinner" />
      </Show>
    </div>
    <div class="overflow-x-auto rounded-lg border border-base-200/50 bg-base-200/30">
      <table class="table table-zebra table-pin-rows">
        <thead>
          <tr class="text-sm uppercase tracking-wide text-base-content/60">
            <th>Name</th>
            <th>Status</th>
            <th>Target</th>
            <th>Min</th>
            <th>Max</th>
            <th>Current</th>
            <th>Triggers</th>
            <th>Age</th>
          </tr>
        </thead>
        <tbody>
          <Show
            when={props.scaledobjects.length}
            fallback={
              <tr>
                <td colSpan={8} class="text-center text-sm opacity-70">
                  No ScaledObjects in this namespace.
                </td>
              </tr>
            }
          >
            <For each={props.scaledobjects}>
              {(scaledobject) => (
                <tr
                  class={`cursor-pointer hover:bg-base-200/50 ${props.selectedScaledObject === scaledobject.name ? 'bg-primary/20 border-l-4 border-primary' : ''}`}
                  onClick={() => props.onSelect?.(scaledobject)}
                >
                  <td class="font-mono text-sm">{scaledobject.name}</td>
                  <td>
                    <span class={`badge badge-sm ${statusBadgeClass(scaledobject.ready, scaledobject.active)}`}>
                      {statusText(scaledobject.ready, scaledobject.active)}
                    </span>
                  </td>
                  <td class="text-xs opacity-80">
                    {scaledobject.targetKind}/{scaledobject.targetName}
                  </td>
                  <td class="text-xs opacity-80">{scaledobject.minReplicas ?? '-'}</td>
                  <td class="text-xs opacity-80">{scaledobject.maxReplicas ?? '-'}</td>
                  <td class="text-xs opacity-80">{scaledobject.currentReplicas ?? '-'}</td>
                  <td class="text-xs opacity-80">{scaledobject.triggerCount}</td>
                  <td class="text-xs opacity-80">{formatRelativeTime(scaledobject.creationTimestamp)}</td>
                </tr>
              )}
            </For>
          </Show>
        </tbody>
      </table>
    </div>
  </div>
);

export default ScaledObjectTable;
