import { For, Show } from 'solid-js';
import type { DaemonSetStatus } from '../lib/api';
import { formatRelativeTime } from '../utils/datetime';

interface DaemonSetStatusPanelProps {
  status?: DaemonSetStatus;
  loading?: boolean;
}

const DaemonSetStatusPanel = (props: DaemonSetStatusPanelProps) => (
  <Show
    when={props.status}
    fallback={
      props.loading ? (
        <div class="flex h-48 items-center justify-center">
          <span class="loading loading-dots" />
        </div>
      ) : (
        <p class="text-sm opacity-60">Select a daemonset to view its status.</p>
      )
    }
  >
    {(status) => (
      <div class="flex flex-col gap-6">
        <div class="grid gap-3 lg:grid-cols-2">
          <div class="card bg-base-200/60">
            <div class="card-body gap-3 text-sm">
              <h3 class="text-xs uppercase tracking-wide opacity-80">Scheduling Status</h3>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Desired</span>
                <span class="font-semibold">{status().desiredNumberScheduled}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Current</span>
                <span class="font-semibold">{status().currentNumberScheduled}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Updated</span>
                <span class="font-semibold">{status().updatedNumberScheduled}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Ready</span>
                <span class="font-semibold">{status().numberReady}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Available</span>
                <span class="font-semibold">{status().numberAvailable}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Unavailable</span>
                <span class="font-semibold">{status().numberUnavailable}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Misscheduled</span>
                <span class="font-semibold">{status().numberMisscheduled}</span>
              </div>
            </div>
          </div>
          <div class="card bg-base-200/60">
            <div class="card-body gap-3 text-sm">
              <h3 class="text-xs uppercase tracking-wide opacity-80">Metadata</h3>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Observed Generation</span>
                <span class="font-mono text-xs">{status().observedGeneration ?? '—'}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Collision Count</span>
                <span class="font-mono text-xs">{status().collisionCount ?? '—'}</span>
              </div>
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

export default DaemonSetStatusPanel;
