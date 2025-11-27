import { Show, For } from 'solid-js';
import type { PodDetail } from '../lib/api';

interface PodDetailPanelProps {
  pod?: PodDetail;
  manifest?: string;
  loading?: boolean;
}

const PodDetailPanel = (props: PodDetailPanelProps) => (
  <div class="flex flex-col gap-4">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-semibold">Pod Details</h2>
      <Show when={props.loading}>
        <span class="loading loading-xs loading-spinner" />
      </Show>
    </div>
    <Show
      when={props.pod}
      fallback={<p class="text-sm opacity-60">Select a pod to see details.</p>}
    >
      {(pod) => (
        <div class="flex flex-col gap-4">
          <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div class="card bg-base-200/60">
              <div class="card-body gap-2">
                <h3 class="text-sm uppercase tracking-wide opacity-70">Metadata</h3>
                <div class="flex flex-col gap-2 text-xs">
                  <div><span class="font-semibold">Namespace:</span> {pod().namespace}</div>
                  <div><span class="font-semibold">Node:</span> {pod().nodeName ?? '—'}</div>
                  <div><span class="font-semibold">Phase:</span> {pod().phase ?? 'Unknown'}</div>
                  <div><span class="font-semibold">Restarts:</span> {pod().restarts}</div>
                </div>
              </div>
            </div>
            <div class="card bg-base-200/60">
              <div class="card-body gap-2">
                <h3 class="text-sm uppercase tracking-wide opacity-70">Labels</h3>
                <Show when={Object.keys(pod().labels).length} fallback={<span class="text-xs opacity-60">None</span>}>
                  <div class="flex flex-wrap gap-2 text-xs">
                    <For each={Object.entries(pod().labels)}>
                      {([key, value]) => (
                        <span class="badge badge-sm badge-outline font-mono">{key}={value}</span>
                      )}
                    </For>
                  </div>
                </Show>
              </div>
            </div>
          </div>
          <div class="card bg-base-200/60">
            <div class="card-body gap-3">
              <h3 class="text-sm uppercase tracking-wide opacity-70">Containers</h3>
              <div class="overflow-x-auto">
                <table class="table table-sm">
                  <thead>
                    <tr class="text-xs uppercase tracking-wide opacity-60">
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
          <div class="collapse collapse-arrow border border-base-200/50 bg-base-200/60">
            <input type="checkbox" />
            <div class="collapse-title text-sm font-semibold">Manifest (YAML)</div>
            <div class="collapse-content">
              <pre class="max-h-96 overflow-auto rounded-lg bg-base-300/60 p-4 text-xs">
                {props.manifest ?? 'Loading manifest…'}
              </pre>
            </div>
          </div>
        </div>
      )}
    </Show>
  </div>
);

export default PodDetailPanel;
