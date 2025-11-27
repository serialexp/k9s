import { For, Show } from 'solid-js';
import type { StorageClassDetail } from '../lib/api';
import { formatRelativeTime } from '../utils/datetime';

interface StorageClassInfoPanelProps {
  storageClass?: StorageClassDetail;
  loading?: boolean;
}

const StorageClassInfoPanel = (props: StorageClassInfoPanelProps) => (
  <Show
    when={props.storageClass}
    fallback={
      props.loading ? (
        <div class="flex h-48 items-center justify-center">
          <span class="loading loading-dots" />
        </div>
      ) : (
        <p class="text-sm opacity-60">Select a storage class to inspect its details.</p>
      )
    }
  >
    {(sc) => (
      <div class="flex flex-col gap-6">
        <div class="grid gap-3 lg:grid-cols-2">
          <div class="card bg-base-200/60">
            <div class="card-body gap-3 text-sm">
              <h3 class="text-xs uppercase tracking-wide opacity-80">Metadata</h3>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Name</span>
                <span class="font-mono text-xs">{sc().name}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Provisioner</span>
                <span class="font-mono text-xs">{sc().provisioner}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Reclaim Policy</span>
                <span class="font-mono text-xs">{sc().reclaimPolicy || 'Delete'}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Volume Binding Mode</span>
                <span class="font-mono text-xs">{sc().volumeBindingMode || 'Immediate'}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Allow Volume Expansion</span>
                <span class="font-semibold">{sc().allowVolumeExpansion ? 'Yes' : 'No'}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Age</span>
                <span>{formatRelativeTime(sc().creationTimestamp)}</span>
              </div>
            </div>
          </div>

          <div class="card bg-base-200/60">
            <div class="card-body gap-3">
              <h3 class="text-xs uppercase tracking-wide opacity-80">Parameters</h3>
              <Show
                when={Object.keys(sc().parameters).length}
                fallback={<p class="text-sm opacity-60">No parameters defined.</p>}
              >
                <div class="flex flex-col gap-2 text-sm">
                  <For each={Object.entries(sc().parameters)}>
                    {([key, value]) => (
                      <div class="flex items-start justify-between gap-3">
                        <span class="font-mono text-xs opacity-70">{key}</span>
                        <span class="break-all font-mono text-xs text-right">{value}</span>
                      </div>
                    )}
                  </For>
                </div>
              </Show>
            </div>
          </div>
        </div>

        <Show when={sc().mountOptions && sc().mountOptions!.length}>
          <div class="card bg-base-200/60">
            <div class="card-body gap-3">
              <h3 class="text-xs uppercase tracking-wide opacity-80">Mount Options</h3>
              <div class="flex flex-wrap gap-2">
                <For each={sc().mountOptions}>
                  {(option) => <span class="badge badge-sm font-mono">{option}</span>}
                </For>
              </div>
            </div>
          </div>
        </Show>

        <Show when={sc().allowedTopologies && sc().allowedTopologies!.length}>
          <div class="card bg-base-200/60">
            <div class="card-body gap-3">
              <h3 class="text-xs uppercase tracking-wide opacity-80">Allowed Topologies</h3>
              <pre class="overflow-auto rounded-lg bg-base-300/40 p-3 text-xs">
                {JSON.stringify(sc().allowedTopologies, null, 2)}
              </pre>
            </div>
          </div>
        </Show>

        <div class="card bg-base-200/60">
          <div class="card-body gap-3">
            <h3 class="text-xs uppercase tracking-wide opacity-80">Labels</h3>
            <Show
              when={Object.keys(sc().labels).length}
              fallback={<p class="text-sm opacity-60">No labels.</p>}
            >
              <div class="flex flex-wrap gap-2">
                <For each={Object.entries(sc().labels)}>
                  {([key, value]) => (
                    <span class="badge badge-sm font-mono">
                      {key}: {value}
                    </span>
                  )}
                </For>
              </div>
            </Show>
          </div>
        </div>

        <div class="card bg-base-200/60">
          <div class="card-body gap-3">
            <h3 class="text-xs uppercase tracking-wide opacity-80">Annotations</h3>
            <Show
              when={Object.keys(sc().annotations).length}
              fallback={<p class="text-sm opacity-60">No annotations.</p>}
            >
              <div class="flex flex-col gap-2 text-sm">
                <For each={Object.entries(sc().annotations)}>
                  {([key, value]) => (
                    <div class="flex items-start justify-between gap-3">
                      <span class="font-mono text-xs opacity-70">{key}</span>
                      <span class="break-all font-mono text-xs text-right">{value}</span>
                    </div>
                  )}
                </For>
              </div>
            </Show>
          </div>
        </div>
      </div>
    )}
  </Show>
);

export default StorageClassInfoPanel;
