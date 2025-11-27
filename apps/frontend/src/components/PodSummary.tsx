import { Show, For } from 'solid-js';
import type { PodDetail, PodListItem } from '../lib/api';
import { formatRelativeTime } from '../utils/datetime';

interface PodSummaryProps {
  pod?: PodListItem;
  detail?: PodDetail;
  loading?: boolean;
}

const PodSummary = (props: PodSummaryProps) => (
  <div class="card bg-base-200/60">
    <div class="card-body gap-4">
      <div class="flex items-center justify-between">
        <div>
          <h3 class="card-title text-base">Selected Pod</h3>
          <p class="text-sm opacity-70">Quick overview of the active pod.</p>
        </div>
        <Show when={props.loading}>
          <span class="loading loading-xs loading-spinner" />
        </Show>
      </div>
      <Show
        when={props.pod}
        fallback={<p class="text-sm opacity-60">Choose a pod on the left to view its summary.</p>}
      >
        {(pod) => (
          <div class="flex flex-col gap-4">
            <div class="flex flex-wrap items-center gap-3">
              <span class="badge badge-primary badge-sm uppercase">{pod().phase ?? 'Unknown'}</span>
              <span class="badge badge-outline badge-sm font-mono">{pod().name}</span>
            </div>
            <div class="grid gap-3 text-sm sm:grid-cols-2">
              <div class="flex items-center justify-between gap-3 rounded-lg bg-base-300/40 px-3 py-2">
                <span class="opacity-70">Namespace</span>
                <span class="font-mono text-xs">{pod().namespace}</span>
              </div>
              <div class="flex items-center justify-between gap-3 rounded-lg bg-base-300/40 px-3 py-2">
                <span class="opacity-70">Restarts</span>
                <span class="font-semibold">{pod().restarts}</span>
              </div>
              <div class="flex items-center justify-between gap-3 rounded-lg bg-base-300/40 px-3 py-2">
                <span class="opacity-70">Node</span>
                <span class="font-mono text-xs">{pod().nodeName ?? '—'}</span>
              </div>
              <div class="flex items-center justify-between gap-3 rounded-lg bg-base-300/40 px-3 py-2">
                <span class="opacity-70">Age</span>
                <span>{formatRelativeTime(pod().creationTimestamp)}</span>
              </div>
            </div>
            <div>
              <p class="mb-2 text-xs uppercase tracking-wide opacity-70">Containers</p>
              <div class="flex flex-wrap gap-2">
                <For each={props.detail?.containers ?? pod().containers}>
                  {(containerName) => (
                    <span class="badge badge-outline badge-sm font-mono">{containerName}</span>
                  )}
                </For>
              </div>
            </div>
          </div>
        )}
      </Show>
    </div>
  </div>
);

export default PodSummary;
