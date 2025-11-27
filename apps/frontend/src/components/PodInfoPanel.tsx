import { For, Show } from 'solid-js';
import type { PodDetail } from '../lib/api';
import { formatRelativeTime } from '../utils/datetime';

interface PodInfoPanelProps {
  pod?: PodDetail;
  loading?: boolean;
}

const PodInfoPanel = (props: PodInfoPanelProps) => (
  <Show
    when={props.pod}
    fallback={
      props.loading ? (
        <div class="flex h-48 items-center justify-center">
          <span class="loading loading-dots" />
        </div>
      ) : (
        <p class="text-sm opacity-60">Select a pod to inspect its metadata.</p>
      )
    }
  >
    {(pod) => (
      <div class="flex flex-col gap-6">
        <div class="grid gap-3 lg:grid-cols-2">
          <div class="card bg-base-200/60">
            <div class="card-body gap-3 text-sm">
              <h3 class="text-xs uppercase tracking-wide opacity-80">Metadata</h3>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Namespace</span>
                <span class="font-mono text-xs">{pod().namespace}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Phase</span>
                <span class="badge badge-outline badge-sm uppercase">{pod().phase ?? 'Unknown'}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Node</span>
                <span class="font-mono text-xs">{pod().nodeName ?? '—'}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Age</span>
                <span>{formatRelativeTime(pod().creationTimestamp)}</span>
              </div>
            </div>
          </div>
          <div class="card bg-base-200/60">
            <div class="card-body gap-3 text-sm">
              <h3 class="text-xs uppercase tracking-wide opacity-80">Status</h3>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Restarts</span>
                <span class="font-semibold">{pod().restarts}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Containers</span>
                <span>{pod().containers.length}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="card bg-base-200/60">
          <div class="card-body gap-3">
            <h3 class="text-xs uppercase tracking-wide opacity-80">Labels</h3>
            <Show when={Object.keys(pod().labels).length} fallback={<p class="text-sm opacity-60">No labels applied.</p>}>
              <div class="flex flex-wrap gap-2">
                <For each={Object.entries(pod().labels)}>
                  {([key, value]) => (
                    <span class="badge badge-outline badge-sm font-mono">{key}={value}</span>
                  )}
                </For>
              </div>
            </Show>
          </div>
        </div>

        <div class="card bg-base-200/60">
          <div class="card-body gap-3">
            <h3 class="text-xs uppercase tracking-wide opacity-80">Annotations</h3>
            <Show when={Object.keys(pod().annotations).length} fallback={<p class="text-sm opacity-60">No annotations set.</p>}>
              <div class="flex flex-col gap-2">
                <For each={Object.entries(pod().annotations)}>
                  {([key, value]) => (
                    <div class="rounded-lg bg-base-300/40 p-3 text-xs">
                      <div class="font-mono text-[0.7rem] uppercase tracking-wide opacity-70">{key}</div>
                      <div class="font-mono break-words text-xs">{value}</div>
                    </div>
                  )}
                </For>
              </div>
            </Show>
          </div>
        </div>

        <div class="card bg-base-200/60">
          <div class="card-body gap-3">
            <h3 class="text-xs uppercase tracking-wide opacity-80">Containers</h3>
            <div class="overflow-x-auto">
              <table class="table table-sm">
                <thead>
                  <tr class="text-xs uppercase tracking-wide opacity-70">
                    <th>Name</th>
                    <th>Ready</th>
                    <th>Restarts</th>
                    <th>Image</th>
                    <th>State</th>
                  </tr>
                </thead>
                <tbody>
                  <For each={pod().containersStatus}>
                    {(container) => (
                      <tr>
                        <td class="font-mono text-xs">{container.name}</td>
                        <td>
                          <span class={`badge badge-xs ${container.ready ? 'badge-success' : 'badge-secondary'}`}>
                            {container.ready ? 'Yes' : 'No'}
                          </span>
                        </td>
                        <td class="text-xs">{container.restartCount}</td>
                        <td class="text-xs opacity-80">{container.image}</td>
                        <td class="text-xs opacity-70">
                          {container.state ? Object.keys(container.state).join(', ') : '—'}
                        </td>
                      </tr>
                    )}
                  </For>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    )}
  </Show>
);

export default PodInfoPanel;
