import { createSignal, For, Show } from 'solid-js';
import type { StorageClassListItem } from '../lib/api';
import { formatRelativeTime } from '../utils/datetime';

interface StorageClassTableProps {
  storageClasses: StorageClassListItem[];
  selectedStorageClass?: string;
  loading?: boolean;
  onSelect?: (storageClass: StorageClassListItem) => void;
}

const StorageClassTable = (props: StorageClassTableProps) => {
  const [search, setSearch] = createSignal('');
  const filtered = () => {
    const query = search().toLowerCase().trim();
    if (!query) return props.storageClasses;
    return props.storageClasses.filter((sc) =>
      sc.name.toLowerCase().includes(query) ||
      sc.provisioner.toLowerCase().includes(query)
    );
  };
  return (
  <div class="flex flex-col gap-3">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-semibold">Storage Classes</h2>
      <div class="flex items-center gap-2">
        <input
          type="text"
          placeholder="Filter by name or provisioner..."
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
            <th>Provisioner</th>
            <th>Reclaim Policy</th>
            <th>Volume Binding Mode</th>
            <th>Allow Expansion</th>
            <th>Age</th>
          </tr>
        </thead>
        <tbody>
          <Show
            when={filtered().length}
            fallback={
              <tr>
                <td colSpan={6} class="text-center text-sm opacity-70">
                  {search() ? 'No storage classes match the filter.' : 'No storage classes found.'}
                </td>
              </tr>
            }
          >
            <For each={filtered()}>
              {(sc) => (
                <tr
                  class={`cursor-pointer hover:bg-base-200/50 ${props.selectedStorageClass === sc.name ? 'bg-primary/20 border-l-4 border-primary' : ''}`}
                  onClick={() => props.onSelect?.(sc)}
                >
                  <td class="font-mono text-sm">{sc.name}</td>
                  <td class="text-xs opacity-80">{sc.provisioner}</td>
                  <td class="text-xs uppercase opacity-80">{sc.reclaimPolicy || 'Delete'}</td>
                  <td class="text-xs opacity-80">{sc.volumeBindingMode || 'Immediate'}</td>
                  <td>
                    <span class={`badge badge-sm ${sc.allowVolumeExpansion ? 'badge-success' : 'badge-ghost'}`}>
                      {sc.allowVolumeExpansion ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td class="text-xs opacity-80">{formatRelativeTime(sc.creationTimestamp)}</td>
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

export default StorageClassTable;
