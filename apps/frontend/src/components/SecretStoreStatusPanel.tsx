import { For, Show } from 'solid-js';
import type { SecretStoreStatus } from '../lib/api';
import { formatRelativeTime } from '../utils/datetime';

interface SecretStoreStatusPanelProps {
  status?: SecretStoreStatus;
  loading?: boolean;
}

const getBadgeClass = (status?: string) => {
  switch ((status ?? '').toLowerCase()) {
    case 'true':
      return 'badge-success';
    case 'false':
      return 'badge-error';
    default:
      return 'badge-warning';
  }
};

const SecretStoreStatusPanel = (props: SecretStoreStatusPanelProps) => (
  <Show
    when={props.status}
    fallback={
      props.loading ? (
        <div class="flex h-48 items-center justify-center">
          <span class="loading loading-dots" />
        </div>
      ) : (
        <p class="text-sm opacity-60">Select a secret store to view its status.</p>
      )
    }
  >
    {(status) => (
      <div class="flex flex-col gap-6">
        <div class="card bg-base-200/60">
          <div class="card-body gap-3 text-sm">
            <h3 class="text-xs uppercase tracking-wide opacity-80">Overall</h3>
            <div class="flex items-center justify-between gap-3">
              <span class="opacity-70">Ready Status</span>
              <span class={`badge badge-sm ${getBadgeClass(status().readyStatus)}`}>
                {status().readyStatus ?? 'Unknown'}
              </span>
            </div>
            <Show when={status().readyMessage}>
              <div class="rounded-lg bg-base-300/40 p-3 text-xs">
                <span class="text-[0.7rem] uppercase tracking-wide opacity-60">Message</span>
                <div>{status().readyMessage}</div>
              </div>
            </Show>
            <div class="flex items-center justify-between gap-3">
              <span class="opacity-70">Observed Generation</span>
              <span class="font-mono text-xs">{status().observedGeneration ?? '—'}</span>
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
                    </tr>
                  </thead>
                  <tbody>
                    <For each={status().conditions}>
                      {(condition) => (
                        <tr>
                          <td class="font-mono text-xs">{condition.type}</td>
                          <td>
                            <span class={`badge badge-xs ${getBadgeClass(condition.status)}`}>
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

export default SecretStoreStatusPanel;
