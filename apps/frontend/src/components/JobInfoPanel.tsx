import { For, Show } from 'solid-js';
import type { JobDetail } from '../lib/api';
import { formatRelativeTime } from '../utils/datetime';

interface JobInfoPanelProps {
  job?: JobDetail;
  loading?: boolean;
}

const JobInfoPanel = (props: JobInfoPanelProps) => (
  <Show
    when={props.job}
    fallback={
      props.loading ? (
        <div class="flex h-48 items-center justify-center">
          <span class="loading loading-dots" />
        </div>
      ) : (
        <p class="text-sm opacity-60">Select a job to inspect its metadata.</p>
      )
    }
  >
    {(job) => (
      <div class="flex flex-col gap-6">
        <div class="grid gap-3 lg:grid-cols-2">
          <div class="card bg-base-200/60">
            <div class="card-body gap-3 text-sm">
              <h3 class="text-xs uppercase tracking-wide opacity-80">Metadata</h3>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Namespace</span>
                <span class="font-mono text-xs">{job().namespace}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Parallelism</span>
                <span class="font-semibold">{job().parallelism ?? '—'}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Backoff Limit</span>
                <span class="font-semibold">{job().backoffLimit ?? '—'}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">TTL After Finish</span>
                <span class="font-semibold">{job().ttlSecondsAfterFinished ?? '—'}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Created</span>
                <span>{formatRelativeTime(job().creationTimestamp)}</span>
              </div>
            </div>
          </div>
          <div class="card bg-base-200/60">
            <div class="card-body gap-3 text-sm">
              <h3 class="text-xs uppercase tracking-wide opacity-80">Execution</h3>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Active</span>
                <span class="font-semibold">{job().active ?? 0}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Succeeded</span>
                <span class="font-semibold">{job().succeeded ?? 0}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Failed</span>
                <span class="font-semibold">{job().failed ?? 0}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Start Time</span>
                <span>{formatRelativeTime(job().startTime)}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Completion Time</span>
                <span>{formatRelativeTime(job().completionTime)}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="card bg-base-200/60">
          <div class="card-body gap-3">
            <h3 class="text-xs uppercase tracking-wide opacity-80">Selector</h3>
            <Show when={Object.keys(job().selector).length} fallback={<p class="text-sm opacity-60">No selectors defined.</p>}>
              <div class="flex flex-wrap gap-2">
                <For each={Object.entries(job().selector)}>
                  {([key, value]) => (
                    <span class="badge badge-outline badge-sm font-mono">{key}={value}</span>
                  )}
                </For>
              </div>
            </Show>
          </div>
        </div>

        <div class="card bg-base-200/60">
          <div class="card-body gap-3">
            <h3 class="text-xs uppercase tracking-wide opacity-80">Labels</h3>
            <Show when={Object.keys(job().labels).length} fallback={<p class="text-sm opacity-60">No labels applied.</p>}>
              <div class="flex flex-wrap gap-2">
                <For each={Object.entries(job().labels)}>
                  {([key, value]) => (
                    <span class="badge badge-outline badge-sm font-mono">{key}={value}</span>
                  )}
                </For>
              </div>
            </Show>
          </div>
        </div>

        <div class="card bg-base-200/60">
          <div class="card-body gap-3">
            <h3 class="text-xs uppercase tracking-wide opacity-80">Annotations</h3>
            <Show when={Object.keys(job().annotations).length} fallback={<p class="text-sm opacity-60">No annotations set.</p>}>
              <div class="flex flex-col gap-2">
                <For each={Object.entries(job().annotations)}>
                  {([key, value]) => (
                    <div class="rounded-lg bg-base-300/40 p-3 text-xs">
                      <div class="font-mono text-[0.7rem] uppercase tracking-wide opacity-70">{key}</div>
                      <div class="font-mono break-words text-xs">{value}</div>
                    </div>
                  )}
                </For>
              </div>
            </Show>
          </div>
        </div>
      </div>
    )}
  </Show>
);

export default JobInfoPanel;
