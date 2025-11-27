import { For, Show } from 'solid-js';
import type { JobStatus } from '../lib/api';
import { formatRelativeTime } from '../utils/datetime';

interface JobStatusPanelProps {
  status?: JobStatus;
  loading?: boolean;
}

const JobStatusPanel = (props: JobStatusPanelProps) => (
  <Show
    when={props.status}
    fallback={
      props.loading ? (
        <div class="flex h-48 items-center justify-center">
          <span class="loading loading-dots" />
        </div>
      ) : (
        <p class="text-sm opacity-60">Select a job to view its status.</p>
      )
    }
  >
    {(status) => (
      <div class="flex flex-col gap-6">
        <div class="grid gap-3 lg:grid-cols-2">
          <div class="card bg-base-200/60">
            <div class="card-body gap-3 text-sm">
              <h3 class="text-xs uppercase tracking-wide opacity-80">Execution</h3>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Active</span>
                <span class="font-semibold">{status().active ?? 0}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Succeeded</span>
                <span class="font-semibold">{status().succeeded ?? 0}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Failed</span>
                <span class="font-semibold">{status().failed ?? 0}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Start Time</span>
                <span>{formatRelativeTime(status().startTime)}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Completion Time</span>
                <span>{formatRelativeTime(status().completionTime)}</span>
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
                      <th>Last Probe</th>
                      <th>Last Transition</th>
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
                            {formatRelativeTime(condition.lastProbeTime)}
                          </td>
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

export default JobStatusPanel;
