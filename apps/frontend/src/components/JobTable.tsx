import { createSignal, For, Show } from 'solid-js';
import type { JobListItem } from '../lib/api';
import { formatRelativeTime } from '../utils/datetime';

interface JobTableProps {
  jobs: JobListItem[];
  selectedJob?: string;
  loading?: boolean;
  onSelect?: (job: JobListItem) => void;
}

const getCompletionBadge = (job: JobListItem) => {
  if (job.succeeded && job.completions && job.succeeded >= job.completions) {
    return 'badge-success';
  }
  if (job.failed && job.failed > 0) {
    return 'badge-error';
  }
  if (job.active && job.active > 0) {
    return 'badge-warning';
  }
  return 'badge-secondary';
};

const JobTable = (props: JobTableProps) => {
  const [search, setSearch] = createSignal('');
  const filtered = () => {
    const query = search().toLowerCase().trim();
    if (!query) return props.jobs;
    return props.jobs.filter((j) =>
      j.name.toLowerCase().includes(query)
    );
  };
  return (
  <div class="flex flex-col gap-3">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-semibold">Jobs</h2>
      <div class="flex items-center gap-2">
        <input
          type="text"
          placeholder="Filter by name..."
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
            <th>Namespace</th>
            <th>Active</th>
            <th>Succeeded</th>
            <th>Failed</th>
            <th>Age</th>
          </tr>
        </thead>
        <tbody>
          <Show
            when={filtered().length}
            fallback={
              <tr>
                <td colSpan={6} class="text-center text-sm opacity-70">
                  {search() ? 'No jobs match the filter.' : 'No jobs in this namespace.'}
                </td>
              </tr>
            }
          >
            <For each={filtered()}>
              {(job) => (
                <tr
                  class={`cursor-pointer hover:bg-base-200/50 ${props.selectedJob === job.name ? 'bg-primary/20 border-l-4 border-primary' : ''}`}
                  onClick={() => props.onSelect?.(job)}
                >
                  <td class="font-mono text-sm">{job.name}</td>
                  <td class="text-xs opacity-80">{job.namespace}</td>
                  <td>
                    <span class={`badge badge-sm ${getCompletionBadge(job)}`}>
                      {job.active ?? 0}
                    </span>
                  </td>
                  <td class="text-sm">{job.succeeded ?? 0}/{job.completions ?? '∞'}</td>
                  <td class="text-sm">{job.failed ?? 0}</td>
                  <td class="text-xs opacity-80">{formatRelativeTime(job.creationTimestamp)}</td>
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

export default JobTable;
