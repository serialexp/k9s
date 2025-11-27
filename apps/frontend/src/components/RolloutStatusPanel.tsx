import { For, Show } from 'solid-js';
import type { RolloutStatus } from '../lib/api';
import { formatRelativeTime } from '../utils/datetime';

interface RolloutStatusPanelProps {
  status?: RolloutStatus;
  loading?: boolean;
}

const RolloutStatusPanel = (props: RolloutStatusPanelProps) => (
  <Show
    when={props.status}
    fallback={
      props.loading ? (
        <div class="flex h-48 items-center justify-center">
          <span class="loading loading-dots" />
        </div>
      ) : (
        <p class="text-sm opacity-60">Select a rollout to view its status.</p>
      )
    }
  >
    {(status) => (
      <div class="flex flex-col gap-6">
        <div class="grid gap-3 lg:grid-cols-2">
          <div class="card bg-base-200/60">
            <div class="card-body gap-3 text-sm">
              <h3 class="text-xs uppercase tracking-wide opacity-80">Replica Status</h3>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Replicas</span>
                <span class="font-semibold">{status().replicas}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Ready Replicas</span>
                <span class="font-semibold">{status().readyReplicas}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Updated Replicas</span>
                <span class="font-semibold">{status().updatedReplicas}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Available Replicas</span>
                <span class="font-semibold">{status().availableReplicas}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Unavailable Replicas</span>
                <span class="font-semibold">{status().unavailableReplicas}</span>
              </div>
            </div>
          </div>
          <div class="card bg-base-200/60">
            <div class="card-body gap-3 text-sm">
              <h3 class="text-xs uppercase tracking-wide opacity-80">Rollout State</h3>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Phase</span>
                <span class="font-semibold">{status().phase ?? 'Unknown'}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Current Step</span>
                <span class="font-semibold">{status().currentStepIndex ?? '—'}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Current Pod Hash</span>
                <span class="font-mono text-xs">{status().currentPodHash ?? '—'}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Stable ReplicaSet</span>
                <span class="font-mono text-xs">{status().stableRS ?? '—'}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Canary ReplicaSet</span>
                <span class="font-mono text-xs">{status().canaryRS ?? '—'}</span>
              </div>
              <Show when={status().message}>
                <div class="flex flex-col gap-1 rounded-lg bg-base-300/40 p-2 text-xs">
                  <span class="text-[0.65rem] uppercase tracking-wide opacity-60">Message</span>
                  <span>{status().message}</span>
                </div>
              </Show>
              <Show when={status().pauseStartTime}>
                <div class="flex items-center justify-between gap-3">
                  <span class="opacity-70">Paused Since</span>
                  <span class="font-mono text-xs">{formatRelativeTime(status().pauseStartTime)}</span>
                </div>
              </Show>
              <Show when={status().abortedAt}>
                <div class="flex items-center justify-between gap-3 text-error">
                  <span class="font-semibold">Aborted At</span>
                  <span class="font-mono text-xs">{formatRelativeTime(status().abortedAt)}</span>
                </div>
              </Show>
            </div>
          </div>
        </div>

        <div class="card bg-base-200/60">
          <div class="card-body gap-3">
            <h3 class="text-xs uppercase tracking-wide opacity-80">Conditions</h3>
            <Show when={status().conditions.length} fallback={<p class="text-sm opacity-60">No conditions available.</p>}>
              <div class="overflow-x-auto">
                <table class="table table-sm">
                  <thead>
                    <tr class="text-xs uppercase tracking-wide opacity-70">
                      <th>Type</th>
                      <th>Status</th>
                      <th>Reason</th>
                      <th>Message</th>
                      <th>Last Transition</th>
                      <th>Last Update</th>
                    </tr>
                  </thead>
                  <tbody>
                    <For each={status().conditions}>
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
                          <td class="text-xs opacity-70">
                            {formatRelativeTime(condition.lastUpdateTime)}
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

export default RolloutStatusPanel;
