// ABOUTME: Displays a table of Kubernetes CronJobs with schedule and status information
// ABOUTME: Supports selection highlighting and click handlers
import { createSignal, For, Show } from 'solid-js';
import type { CronJobListItem } from '../lib/api';
import { formatRelativeTime } from '../utils/datetime';

interface CronJobTableProps {
  cronjobs: CronJobListItem[];
  selectedCronJob?: string;
  loading?: boolean;
  onSelect?: (cronjob: CronJobListItem) => void;
}

const CronJobTable = (props: CronJobTableProps) => {
  const [search, setSearch] = createSignal('');
  const filtered = () => {
    const query = search().toLowerCase().trim();
    if (!query) return props.cronjobs;
    return props.cronjobs.filter((c) =>
      c.name.toLowerCase().includes(query) ||
      c.schedule?.toLowerCase().includes(query)
    );
  };
  return (
  <div class="flex flex-col gap-3">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-semibold">CronJobs</h2>
      <div class="flex items-center gap-2">
        <input
          type="text"
          placeholder="Filter by name or schedule..."
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
            <th>Schedule</th>
            <th>Status</th>
            <th>Active</th>
            <th>Last Run</th>
            <th>Last Success</th>
            <th>Age</th>
          </tr>
        </thead>
        <tbody>
          <Show
            when={filtered().length}
            fallback={
              <tr>
                <td colSpan={7} class="text-center text-sm opacity-70">
                  {search() ? 'No CronJobs match the filter.' : 'No CronJobs in this namespace.'}
                </td>
              </tr>
            }
          >
            <For each={filtered()}>
              {(cronjob) => (
                <tr
                  class={`cursor-pointer hover:bg-base-200/50 ${props.selectedCronJob === cronjob.name ? 'bg-primary/20 border-l-4 border-primary' : ''}`}
                  onClick={() => props.onSelect?.(cronjob)}
                >
                  <td class="font-mono text-sm">{cronjob.name}</td>
                  <td class="text-xs opacity-80">{cronjob.schedule}</td>
                  <td>
                    <span class={`badge badge-sm ${cronjob.suspend ? 'badge-warning' : 'badge-success'}`}>
                      {cronjob.suspend ? 'Suspended' : 'Active'}
                    </span>
                  </td>
                  <td class="text-xs opacity-80">{cronjob.activeJobs}</td>
                  <td class="text-xs opacity-80">{formatRelativeTime(cronjob.lastScheduleTime)}</td>
                  <td class="text-xs opacity-80">{formatRelativeTime(cronjob.lastSuccessfulTime)}</td>
                  <td class="text-xs opacity-80">{formatRelativeTime(cronjob.creationTimestamp)}</td>
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

export default CronJobTable;
