import { For, Show } from 'solid-js';
import type { ReplicaSetDetail } from '../lib/api';
import { formatRelativeTime } from '../utils/datetime';

interface ReplicaSetInfoPanelProps {
  replicaSet?: ReplicaSetDetail;
  loading?: boolean;
}

const ReplicaSetInfoPanel = (props: ReplicaSetInfoPanelProps) => (
  <Show
    when={props.replicaSet}
    fallback={
      props.loading ? (
        <div class="flex h-48 items-center justify-center">
          <span class="loading loading-dots" />
        </div>
      ) : (
        <p class="text-sm opacity-60">Select a ReplicaSet to inspect its details.</p>
      )
    }
  >
    {(rs) => (
      <div class="flex flex-col gap-6">
        <div class="grid gap-3 lg:grid-cols-2">
          <div class="card bg-base-200/60">
            <div class="card-body gap-3 text-sm">
              <h3 class="text-xs uppercase tracking-wide opacity-80">Metadata</h3>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Name</span>
                <span class="font-mono text-xs">{rs().name}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Namespace</span>
                <span class="font-mono text-xs">{rs().namespace}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Owner</span>
                <span class="font-mono text-xs">{rs().ownerReference || '—'}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Age</span>
                <span>{formatRelativeTime(rs().creationTimestamp)}</span>
              </div>
            </div>
          </div>

          <div class="card bg-base-200/60">
            <div class="card-body gap-3 text-sm">
              <h3 class="text-xs uppercase tracking-wide opacity-80">Replicas</h3>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Desired</span>
                <span class="font-semibold">{rs().desiredReplicas}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Ready</span>
                <span class={`font-semibold ${rs().readyReplicas === rs().desiredReplicas && rs().desiredReplicas > 0 ? 'text-success' : rs().readyReplicas < rs().desiredReplicas && rs().desiredReplicas > 0 ? 'text-warning' : ''}`}>
                  {rs().readyReplicas}
                </span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Available</span>
                <span class="font-semibold">{rs().availableReplicas}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="card bg-base-200/60">
          <div class="card-body gap-3">
            <h3 class="text-xs uppercase tracking-wide opacity-80">Images</h3>
            <div class="flex flex-col gap-1">
              <For each={rs().images}>
                {(image) => <span class="font-mono text-xs break-all">{image}</span>}
              </For>
            </div>
          </div>
        </div>

        <Show when={rs().selector && Object.keys(rs().selector).length}>
          <div class="card bg-base-200/60">
            <div class="card-body gap-3">
              <h3 class="text-xs uppercase tracking-wide opacity-80">Selector</h3>
              <div class="flex flex-wrap gap-2">
                <For each={Object.entries(rs().selector)}>
                  {([key, value]) => (
                    <span class="badge badge-sm font-mono">
                      {key}: {value}
                    </span>
                  )}
                </For>
              </div>
            </div>
          </div>
        </Show>

        <Show when={rs().conditions.length}>
          <div class="card bg-base-200/60">
            <div class="card-body gap-3">
              <h3 class="text-xs uppercase tracking-wide opacity-80">Conditions</h3>
              <div class="overflow-x-auto">
                <table class="table table-xs">
                  <thead>
                    <tr class="text-xs uppercase opacity-60">
                      <th>Type</th>
                      <th>Status</th>
                      <th>Reason</th>
                      <th>Last Transition</th>
                      <th>Message</th>
                    </tr>
                  </thead>
                  <tbody>
                    <For each={rs().conditions}>
                      {(cond) => (
                        <tr>
                          <td class="font-mono text-xs">{cond.type}</td>
                          <td>
                            <span class={`badge badge-xs ${cond.status === 'True' ? 'badge-success' : 'badge-warning'}`}>
                              {cond.status}
                            </span>
                          </td>
                          <td class="text-xs opacity-80">{cond.reason || '—'}</td>
                          <td class="text-xs opacity-80">{cond.lastTransitionTime ? formatRelativeTime(cond.lastTransitionTime) : '—'}</td>
                          <td class="text-xs opacity-80 max-w-xs truncate" title={cond.message}>{cond.message || '—'}</td>
                        </tr>
                      )}
                    </For>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </Show>

        <div class="card bg-base-200/60">
          <div class="card-body gap-3">
            <h3 class="text-xs uppercase tracking-wide opacity-80">Labels</h3>
            <Show
              when={Object.keys(rs().labels).length}
              fallback={<p class="text-sm opacity-60">No labels.</p>}
            >
              <div class="flex flex-wrap gap-2">
                <For each={Object.entries(rs().labels)}>
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
              when={Object.keys(rs().annotations).length}
              fallback={<p class="text-sm opacity-60">No annotations.</p>}
            >
              <div class="flex flex-col gap-2 text-sm">
                <For each={Object.entries(rs().annotations)}>
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

export default ReplicaSetInfoPanel;
