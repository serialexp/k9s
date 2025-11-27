import { For, Show } from 'solid-js';
import type { ArgoApplicationStatus } from '../lib/api';
import { formatRelativeTime } from '../utils/datetime';

interface ArgoApplicationStatusPanelProps {
  status?: ArgoApplicationStatus;
  loading?: boolean;
}

const badgeForStatus = (status?: string) => {
  switch ((status ?? '').toLowerCase()) {
    case 'synced':
    case 'healthy':
      return 'badge-success';
    case 'degraded':
    case 'outofsync':
      return 'badge-error';
    case 'progressing':
    case 'syncing':
      return 'badge-warning';
    default:
      return 'badge-secondary';
  }
};

const ArgoApplicationStatusPanel = (props: ArgoApplicationStatusPanelProps) => (
  <Show
    when={props.status}
    fallback={
      props.loading ? (
        <div class="flex h-48 items-center justify-center">
          <span class="loading loading-dots" />
        </div>
      ) : (
        <p class="text-sm opacity-60">Select an Argo CD application to view its status.</p>
      )
    }
  >
    {(status) => (
      <div class="flex flex-col gap-6">
        <div class="grid gap-3 lg:grid-cols-2">
          <div class="card bg-base-200/60">
            <div class="card-body gap-3 text-sm">
              <h3 class="text-xs uppercase tracking-wide opacity-80">Current Status</h3>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Sync</span>
                <span class={`badge badge-sm ${badgeForStatus(status().syncStatus)}`}>{status().syncStatus ?? 'Unknown'}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Health</span>
                <span class={`badge badge-sm ${badgeForStatus(status().healthStatus)}`}>{status().healthStatus ?? 'Unknown'}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Revision</span>
                <span class="font-mono text-xs">{status().revision ?? '—'}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Reconciled</span>
                <span>{formatRelativeTime(status().reconciledAt)}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Observed</span>
                <span>{formatRelativeTime(status().observedAt)}</span>
              </div>
            </div>
          </div>
          <div class="card bg-base-200/60">
            <div class="card-body gap-3 text-sm">
              <h3 class="text-xs uppercase tracking-wide opacity-80">Operation</h3>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Phase</span>
                <span class={`badge badge-sm ${badgeForStatus(status().operationState?.phase)}`}>{status().operationState?.phase ?? '—'}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Started</span>
                <span>{formatRelativeTime(status().operationState?.startedAt)}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Finished</span>
                <span>{formatRelativeTime(status().operationState?.finishedAt)}</span>
              </div>
              <div class="opacity-70 text-xs">{status().operationState?.message ?? ''}</div>
            </div>
          </div>
        </div>

        <Show when={status().summary.images.length || status().summary.externalURLs.length}>
          <div class="card bg-base-200/60">
            <div class="card-body gap-3 text-sm">
              <h3 class="text-xs uppercase tracking-wide opacity-80">Summary</h3>
              <Show when={status().summary.images.length}>
                <div>
                  <div class="opacity-70 uppercase text-[0.6rem] tracking-wide">Images</div>
                  <div class="flex flex-wrap gap-2">
                    <For each={status().summary.images}>
                      {(image) => (
                        <span class="badge badge-outline badge-sm font-mono">{image}</span>
                      )}
                    </For>
                  </div>
                </div>
              </Show>
              <Show when={status().summary.externalURLs.length}>
                <div>
                  <div class="opacity-70 uppercase text-[0.6rem] tracking-wide">External URLs</div>
                  <div class="flex flex-col gap-1">
                    <For each={status().summary.externalURLs}>
                      {(url) => (
                        <a class="link link-primary text-xs break-all" href={url} target="_blank" rel="noreferrer">
                          {url}
                        </a>
                      )}
                    </For>
                  </div>
                </div>
              </Show>
            </div>
          </div>
        </Show>

        <div class="card bg-base-200/60">
          <div class="card-body gap-3">
            <h3 class="text-xs uppercase tracking-wide opacity-80">Deployment History</h3>
            <Show when={status().history.length} fallback={<p class="text-sm opacity-60">No history recorded.</p>}>
              <div class="overflow-x-auto">
                <table class="table table-sm">
                  <thead>
                    <tr class="text-xs uppercase tracking-wide opacity-70">
                      <th>ID</th>
                      <th>Revision</th>
                      <th>Started</th>
                      <th>Finished</th>
                      <th>Destination</th>
                    </tr>
                  </thead>
                  <tbody>
                    <For each={status().history}>
                      {(entry) => (
                        <tr>
                          <td class="text-xs font-mono">{entry.id ?? '–'}</td>
                          <td class="text-xs font-mono">{entry.revision ?? '—'}</td>
                          <td class="text-xs opacity-70">{formatRelativeTime(entry.deployStartedAt)}</td>
                          <td class="text-xs opacity-70">{formatRelativeTime(entry.deployFinishedAt)}</td>
                          <td class="text-xs opacity-80">
                            {entry.destNamespace ?? '—'}
                            <Show when={entry.destServer}>
                              <span class="opacity-60">@{entry.destServer}</span>
                            </Show>
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

export default ArgoApplicationStatusPanel;
