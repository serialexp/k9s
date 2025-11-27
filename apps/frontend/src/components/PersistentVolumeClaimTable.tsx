// ABOUTME: Displays a table of PersistentVolumeClaims with status and capacity info
// ABOUTME: Supports selection highlighting and click handlers
import { For, Show } from 'solid-js';
import type { PersistentVolumeClaimListItem } from '../lib/api';
import { formatRelativeTime } from '../utils/datetime';

interface PersistentVolumeClaimTableProps {
  pvcs: PersistentVolumeClaimListItem[];
  selectedPvc?: string;
  loading?: boolean;
  onSelect?: (pvc: PersistentVolumeClaimListItem) => void;
}

const statusBadgeClass = (status: string) => {
  switch (status) {
    case 'Bound':
      return 'badge-success';
    case 'Pending':
      return 'badge-warning';
    case 'Lost':
      return 'badge-error';
    default:
      return 'badge-ghost';
  }
};

const PersistentVolumeClaimTable = (props: PersistentVolumeClaimTableProps) => (
  <div class="flex flex-col gap-3">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-semibold">PersistentVolumeClaims</h2>
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
            <th>StorageClass</th>
            <th>Requested</th>
            <th>Capacity</th>
            <th>Access Modes</th>
            <th>Volume</th>
            <th>Age</th>
          </tr>
        </thead>
        <tbody>
          <Show
            when={props.pvcs.length}
            fallback={
              <tr>
                <td colSpan={8} class="text-center text-sm opacity-70">
                  No PersistentVolumeClaims in this namespace.
                </td>
              </tr>
            }
          >
            <For each={props.pvcs}>
              {(pvc) => (
                <tr
                  class={`cursor-pointer hover:bg-base-200/50 ${props.selectedPvc === pvc.name ? 'bg-primary/20 border-l-4 border-primary' : ''}`}
                  onClick={() => props.onSelect?.(pvc)}
                >
                  <td class="font-mono text-sm">{pvc.name}</td>
                  <td>
                    <span class={`badge badge-sm ${statusBadgeClass(pvc.status)}`}>{pvc.status}</span>
                  </td>
                  <td class="text-xs opacity-80">{pvc.storageClass || '—'}</td>
                  <td class="text-xs opacity-80">{pvc.requestedStorage || '—'}</td>
                  <td class="text-xs opacity-80">{pvc.capacity || '—'}</td>
                  <td class="text-xs opacity-80">{pvc.accessModes.join(', ') || '—'}</td>
                  <td class="text-xs opacity-80">{pvc.volumeName || '—'}</td>
                  <td class="text-xs opacity-80">{formatRelativeTime(pvc.creationTimestamp)}</td>
                </tr>
              )}
            </For>
          </Show>
        </tbody>
      </table>
    </div>
  </div>
);

export default PersistentVolumeClaimTable;
