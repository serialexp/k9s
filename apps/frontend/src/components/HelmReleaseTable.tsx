// ABOUTME: Displays a table of Helm releases with chart info, status badges, and revision numbers
// ABOUTME: Supports selection highlighting, filtering by name/chart, and click handlers
import { createSignal, For, Show } from 'solid-js';
import type { HelmReleaseListItem } from '../lib/api';
import { formatRelativeTime } from '../utils/datetime';

interface HelmReleaseTableProps {
  releases: HelmReleaseListItem[];
  selectedRelease?: string;
  loading?: boolean;
  onSelect?: (release: HelmReleaseListItem) => void;
}

const statusBadgeClass = (status: string): string => {
  switch (status) {
    case 'deployed':
      return 'badge-success';
    case 'failed':
      return 'badge-error';
    case 'pending-install':
    case 'pending-upgrade':
    case 'pending-rollback':
    case 'uninstalling':
      return 'badge-warning';
    case 'superseded':
    case 'uninstalled':
      return 'badge-ghost';
    default:
      return 'badge-ghost';
  }
};

const HelmReleaseTable = (props: HelmReleaseTableProps) => {
  const [search, setSearch] = createSignal('');
  const filtered = () => {
    const query = search().toLowerCase().trim();
    if (!query) return props.releases;
    return props.releases.filter((r) =>
      r.name.toLowerCase().includes(query) ||
      r.chart.toLowerCase().includes(query)
    );
  };
  return (
  <div class="flex flex-col gap-3">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-semibold">Helm Releases</h2>
      <div class="flex items-center gap-2">
        <input
          type="text"
          placeholder="Filter by name or chart..."
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
            <th>Chart</th>
            <th>Version</th>
            <th>App Version</th>
            <th>Status</th>
            <th>Revision</th>
            <th>Age</th>
          </tr>
        </thead>
        <tbody>
          <Show
            when={filtered().length}
            fallback={
              <tr>
                <td colSpan={7} class="text-center text-sm opacity-70">
                  {search() ? 'No Helm releases match the filter.' : 'No Helm releases in this namespace.'}
                </td>
              </tr>
            }
          >
            <For each={filtered()}>
              {(release) => (
                <tr
                  class={`cursor-pointer hover:bg-base-200/50 ${props.selectedRelease === release.name ? 'bg-primary/20 border-l-4 border-primary' : ''}`}
                  onClick={() => props.onSelect?.(release)}
                >
                  <td class="font-mono text-sm">{release.name}</td>
                  <td class="text-xs opacity-80">{release.chart || '—'}</td>
                  <td class="text-xs opacity-80">{release.chartVersion || '—'}</td>
                  <td class="text-xs opacity-80">{release.appVersion || '—'}</td>
                  <td>
                    <span class={`badge badge-sm ${statusBadgeClass(release.status)}`}>
                      {release.status}
                    </span>
                  </td>
                  <td class="text-xs opacity-80">{release.revision}</td>
                  <td class="text-xs opacity-80">{formatRelativeTime(release.updated)}</td>
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

export default HelmReleaseTable;
