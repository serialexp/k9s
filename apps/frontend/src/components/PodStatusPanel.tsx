import { Show, For } from 'solid-js';
import type { PodStatus } from '../lib/api';

interface PodStatusPanelProps {
  status?: PodStatus;
  loading?: boolean;
}

const formatTime = (timestamp?: string) => {
  if (!timestamp) return '—';
  const date = new Date(timestamp);
  return date.toLocaleString();
};

const getStatusClass = (status: string) => {
  switch (status.toLowerCase()) {
    case 'true':
      return 'badge-success';
    case 'false':
      return 'badge-error';
    default:
      return 'badge-warning';
  }
};

const formatContainerState = (state?: Record<string, unknown>) => {
  if (!state) return '—';
  const stateType = Object.keys(state)[0];
  const stateInfo = state[stateType] as Record<string, unknown>;

  if (stateType === 'running') {
    const startedAt = stateInfo?.startedAt as string;
    return `Running (since ${formatTime(startedAt)})`;
  } else if (stateType === 'waiting') {
    const reason = stateInfo?.reason as string;
    return `Waiting (${reason || 'Unknown'})`;
  } else if (stateType === 'terminated') {
    const reason = stateInfo?.reason as string;
    const exitCode = stateInfo?.exitCode as number;
    return `Terminated (${reason}, exit ${exitCode})`;
  }

  return stateType;
};

const PodStatusPanel = (props: PodStatusPanelProps) => (
  <div class="flex flex-col gap-4">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-semibold">Pod Status</h2>
      <Show when={props.loading}>
        <span class="loading loading-xs loading-spinner" />
      </Show>
    </div>
    <Show
      when={props.status}
      fallback={<p class="text-sm opacity-60">No status information available.</p>}
    >
      {(status) => (
        <div class="flex flex-col gap-4">
          <div class="card bg-base-200/60">
            <div class="card-body gap-2">
              <h3 class="text-sm uppercase tracking-wide opacity-70">Pod Conditions</h3>
              <Show when={status().conditions.length} fallback={<span class="text-xs opacity-60">No conditions available</span>}>
                <div class="overflow-x-auto">
                  <table class="table table-sm">
                    <thead>
                      <tr class="text-xs uppercase tracking-wide opacity-60">
                        <th>Type</th>
                        <th>Status</th>
                        <th>Reason</th>
                        <th>Message</th>
                        <th>Last Transition</th>
                      </tr>
                    </thead>
                    <tbody>
                      <For each={status().conditions}>
                        {(condition) => (
                          <tr>
                            <td class="font-semibold text-xs">{condition.type}</td>
                            <td>
                              <span class={`badge badge-xs ${getStatusClass(condition.status)}`}>
                                {condition.status}
                              </span>
                            </td>
                            <td class="text-xs opacity-80">{condition.reason ?? '—'}</td>
                            <td class="text-xs opacity-70 max-w-64 truncate" title={condition.message}>
                              {condition.message ?? '—'}
                            </td>
                            <td class="text-xs opacity-60">{formatTime(condition.lastTransitionTime)}</td>
                          </tr>
                        )}
                      </For>
                    </tbody>
                  </table>
                </div>
              </Show>
            </div>
          </div>

          <div class="card bg-base-200/60">
            <div class="card-body gap-3">
              <h3 class="text-sm uppercase tracking-wide opacity-70">Container States</h3>
              <div class="overflow-x-auto">
                <table class="table table-sm">
                  <thead>
                    <tr class="text-xs uppercase tracking-wide opacity-60">
                      <th>Container</th>
                      <th>State</th>
                      <th>Last State</th>
                      <th>Ready</th>
                      <th>Container ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    <For each={status().containerStatuses}>
                      {(container) => (
                        <tr>
                          <td class="font-mono text-xs font-semibold">{container.name}</td>
                          <td class="text-xs">
                            {formatContainerState(container.state)}
                          </td>
                          <td class="text-xs opacity-80">
                            {formatContainerState(container.lastState)}
                          </td>
                          <td>
                            <span class={`badge badge-xs ${container.ready ? 'badge-success' : 'badge-error'}`}>
                              {container.ready ? 'Ready' : 'Not Ready'}
                            </span>
                          </td>
                          <td class="text-xs opacity-60 font-mono max-w-32 truncate" title={container.containerID}>
                            {container.containerID ? container.containerID.split('://')[1]?.substring(0, 12) + '...' : '—'}
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
  </div>
);

export default PodStatusPanel;