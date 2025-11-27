import { For, Show } from 'solid-js';
import type { StatefulSetDetail } from '../lib/api';
import { formatRelativeTime } from '../utils/datetime';

interface StatefulSetInfoPanelProps {
  statefulSet?: StatefulSetDetail;
  loading?: boolean;
}

const StatefulSetInfoPanel = (props: StatefulSetInfoPanelProps) => (
  <Show
    when={props.statefulSet}
    fallback={
      props.loading ? (
        <div class="flex h-48 items-center justify-center">
          <span class="loading loading-dots" />
        </div>
      ) : (
        <p class="text-sm opacity-60">Select a statefulset to inspect its metadata.</p>
      )
    }
  >
    {(statefulSet) => (
      <div class="flex flex-col gap-6">
        <div class="grid gap-3 lg:grid-cols-2">
          <div class="card bg-base-200/60">
            <div class="card-body gap-3 text-sm">
              <h3 class="text-xs uppercase tracking-wide opacity-80">Metadata</h3>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Namespace</span>
                <span class="font-mono text-xs">{statefulSet().namespace}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Service</span>
                <span class="font-mono text-xs">{statefulSet().serviceName ?? '—'}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Update Strategy</span>
                <span class="badge badge-outline badge-sm uppercase">{statefulSet().updateStrategy}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Pod Management</span>
                <span class="badge badge-outline badge-sm uppercase">{statefulSet().podManagementPolicy}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Age</span>
                <span>{formatRelativeTime(statefulSet().creationTimestamp)}</span>
              </div>
            </div>
          </div>
          <div class="card bg-base-200/60">
            <div class="card-body gap-3 text-sm">
              <h3 class="text-xs uppercase tracking-wide opacity-80">Replicas</h3>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Desired</span>
                <span class="font-semibold">{statefulSet().replicas}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Ready</span>
                <span class="font-semibold">{statefulSet().readyReplicas}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Updated</span>
                <span class="font-semibold">{statefulSet().updatedReplicas}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Current</span>
                <span class="font-semibold">{statefulSet().currentReplicas}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="card bg-base-200/60">
          <div class="card-body gap-3">
            <h3 class="text-xs uppercase tracking-wide opacity-80">Selector</h3>
            <Show when={Object.keys(statefulSet().selector).length} fallback={<p class="text-sm opacity-60">No selectors defined.</p>}>
              <div class="flex flex-wrap gap-2">
                <For each={Object.entries(statefulSet().selector)}>
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
            <h3 class="text-xs uppercase tracking-wide opacity-80">Labels</h3>
            <Show when={Object.keys(statefulSet().labels).length} fallback={<p class="text-sm opacity-60">No labels applied.</p>}>
              <div class="flex flex-wrap gap-2">
                <For each={Object.entries(statefulSet().labels)}>
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
            <Show when={Object.keys(statefulSet().annotations).length} fallback={<p class="text-sm opacity-60">No annotations set.</p>}>
              <div class="flex flex-col gap-2">
                <For each={Object.entries(statefulSet().annotations)}>
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
            <h3 class="text-xs uppercase tracking-wide opacity-80">Conditions</h3>
            <Show when={statefulSet().conditions.length} fallback={<p class="text-sm opacity-60">No conditions available.</p>}>
              <div class="overflow-x-auto">
                <table class="table table-sm">
                  <thead>
                    <tr class="text-xs uppercase tracking-wide opacity-70">
                      <th>Type</th>
                      <th>Status</th>
                      <th>Reason</th>
                      <th>Message</th>
                      <th>Last Transition</th>
                    </tr>
                  </thead>
                  <tbody>
                    <For each={statefulSet().conditions}>
                      {(condition) => (
                        <tr>
                          <td class="font-mono text-xs">{condition.type}</td>
                          <td>
                            <span class={`badge badge-xs ${condition.status === 'True' ? 'badge-success' : 'badge-secondary'}`}>
                              {condition.status}
                            </span>
                          </td>
                          <td class="text-xs">{condition.reason ?? '—'}</td>
                          <td class="text-xs opacity-80">{condition.message ?? '—'}</td>
                          <td class="text-xs opacity-70">
                            {formatRelativeTime(condition.lastTransitionTime)}
                          </td>
                        </tr>
                      )}
                    </For>
                  </tbody>
                </table>
              </div>
            </Show>
          </div>
        </div>
      </div>
    )}
  </Show>
);

export default StatefulSetInfoPanel;
