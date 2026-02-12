import { createSignal, For, Show } from 'solid-js';
import type { ArgoApplicationListItem } from '../lib/api';
import { formatRelativeTime } from '../utils/datetime';

interface ArgoApplicationTableProps {
  applications: ArgoApplicationListItem[];
  selectedApplication?: string;
  loading?: boolean;
  onSelect?: (application: ArgoApplicationListItem) => void;
}

const statusBadgeClass = (status?: string) => {
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

const ArgoApplicationTable = (props: ArgoApplicationTableProps) => {
  const [search, setSearch] = createSignal('');
  const filtered = () => {
    const query = search().toLowerCase().trim();
    if (!query) return props.applications;
    return props.applications.filter((a) =>
      a.name.toLowerCase().includes(query) ||
      a.project?.toLowerCase().includes(query) ||
      a.syncStatus?.toLowerCase().includes(query) ||
      a.healthStatus?.toLowerCase().includes(query)
    );
  };
  return (
  <div class="flex flex-col gap-3">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-semibold">Argo CD Applications</h2>
      <div class="flex items-center gap-2">
        <input
          type="text"
          placeholder="Filter by name, project, or status..."
          class="input input-bordered input-sm w-64"
          value={search()}
          onInput={(e) => setSearch(e.currentTarget.value)}
        />
        <Show when={props.loading}>
          <span class="loading loading-xs loading-spinner" />
        </Show>
      </div>
    </div>
    <div class="overflow-x-auto rounded-lg border border-base-200/50 bg-base-200/30">
      <table class="table table-zebra table-pin-rows">
        <thead>
          <tr class="text-sm uppercase tracking-wide text-base-content/60">
            <th>Name</th>
            <th>Project</th>
            <th>Sync</th>
            <th>Health</th>
            <th>Revision</th>
            <th>Destination</th>
            <th>Age</th>
          </tr>
        </thead>
        <tbody>
          <Show
            when={filtered().length}
            fallback={
              <tr>
                <td colSpan={7} class="text-center text-sm opacity-70">
                  {search() ? 'No applications match the filter.' : 'No Argo CD applications in this namespace.'}
                </td>
              </tr>
            }
          >
            <For each={filtered()}>
              {(application) => (
                <tr
                  class={`cursor-pointer hover:bg-base-200/50 ${props.selectedApplication === application.name ? 'bg-primary/20 border-l-4 border-primary' : ''}`}
                  onClick={() => props.onSelect?.(application)}
                >
                  <td class="font-mono text-sm">{application.name}</td>
                  <td class="text-xs opacity-80">{application.project ?? 'default'}</td>
                  <td>
                    <span class={`badge badge-sm ${statusBadgeClass(application.syncStatus)}`}>
                      {application.syncStatus ?? 'Unknown'}
                    </span>
                  </td>
                  <td>
                    <span class={`badge badge-sm ${statusBadgeClass(application.healthStatus)}`}>
                      {application.healthStatus ?? 'Unknown'}
                    </span>
                  </td>
                  <td class="text-xs font-mono">{application.revision ?? '—'}</td>
                  <td class="text-xs opacity-80">
                    {application.destinationNamespace ?? '—'}
                    <Show when={application.destinationServer}>
                      <span class="opacity-60">@{application.destinationServer}</span>
                    </Show>
                  </td>
                  <td class="text-xs opacity-80">{formatRelativeTime(application.creationTimestamp)}</td>
                </tr>
              )}
            </For>
          </Show>
        </tbody>
      </table>
    </div>
  </div>
  );
};

export default ArgoApplicationTable;
