import { For, Show } from 'solid-js';
import type { ArgoApplicationDetail } from '../lib/api';
import { formatRelativeTime } from '../utils/datetime';

interface ArgoApplicationInfoPanelProps {
  application?: ArgoApplicationDetail;
  loading?: boolean;
}

const ArgoApplicationInfoPanel = (props: ArgoApplicationInfoPanelProps) => (
  <Show
    when={props.application}
    fallback={
      props.loading ? (
        <div class="flex h-48 items-center justify-center">
          <span class="loading loading-dots" />
        </div>
      ) : (
        <p class="text-sm opacity-60">Select an Argo CD application to inspect it.</p>
      )
    }
  >
    {(application) => (
      <div class="flex flex-col gap-6">
        <div class="grid gap-3 lg:grid-cols-2">
          <div class="card bg-base-200/60">
            <div class="card-body gap-3 text-sm">
              <h3 class="text-xs uppercase tracking-wide opacity-80">Metadata</h3>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Namespace</span>
                <span class="font-mono text-xs">{application().namespace}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Project</span>
                <span class="font-semibold">{application().project ?? 'default'}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Repository</span>
                <span class="font-mono text-xs break-all">{application().repoURL ?? '—'}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Target Revision</span>
                <span class="font-mono text-xs">{application().targetRevision ?? '—'}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Created</span>
                <span>{formatRelativeTime(application().creationTimestamp)}</span>
              </div>
            </div>
          </div>
          <div class="card bg-base-200/60">
            <div class="card-body gap-3 text-sm">
              <h3 class="text-xs uppercase tracking-wide opacity-80">Destination</h3>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Server</span>
                <span class="font-mono text-xs">{application().destination?.server ?? '—'}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Namespace</span>
                <span class="font-mono text-xs">{application().destination?.namespace ?? '—'}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Cluster</span>
                <span class="font-mono text-xs">{application().destination?.name ?? '—'}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Last Sync</span>
                <span>{formatRelativeTime(application().lastSyncedAt)}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="card bg-base-200/60">
          <div class="card-body gap-3">
            <h3 class="text-xs uppercase tracking-wide opacity-80">Sources</h3>
            <Show when={application().sources.length} fallback={<p class="text-sm opacity-60">No sources defined.</p>}>
              <div class="flex flex-col gap-3">
                <For each={application().sources}>
                  {(source, index) => (
                    <div class="rounded-lg bg-base-300/40 p-3 text-xs">
                      <div class="flex items-center justify-between">
                        <span class="font-semibold">Source #{index() + 1}</span>
                        <span class="font-mono text-[0.7rem]">{source.targetRevision ?? 'HEAD'}</span>
                      </div>
                      <div class="mt-2 grid gap-2 md:grid-cols-2">
                        <div>
                          <div class="opacity-70 uppercase text-[0.6rem] tracking-wide">Repository</div>
                          <div class="font-mono text-xs break-all">{source.repoURL ?? '—'}</div>
                        </div>
                        <div>
                          <div class="opacity-70 uppercase text-[0.6rem] tracking-wide">Path / Chart</div>
                          <div class="font-mono text-xs">{source.path ?? source.chart ?? '—'}</div>
                        </div>
                      </div>
                      <Show when={source.helm?.valueFiles?.length}>
                        <div class="mt-2">
                          <div class="opacity-70 uppercase text-[0.6rem] tracking-wide">Helm Value Files</div>
                          <div class="flex flex-wrap gap-1">
                            <For each={source.helm?.valueFiles ?? []}>
                              {(file) => <span class="badge badge-outline badge-xs font-mono">{file}</span>}
                            </For>
                          </div>
                        </div>
                      </Show>
                    </div>
                  )}
                </For>
              </div>
            </Show>
          </div>
        </div>

        <div class="card bg-base-200/60">
          <div class="card-body gap-3">
            <h3 class="text-xs uppercase tracking-wide opacity-80">Labels</h3>
            <Show when={Object.keys(application().labels).length} fallback={<p class="text-sm opacity-60">No labels applied.</p>}>
              <div class="flex flex-wrap gap-2">
                <For each={Object.entries(application().labels)}>
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
            <Show when={Object.keys(application().annotations).length} fallback={<p class="text-sm opacity-60">No annotations set.</p>}>
              <div class="flex flex-col gap-2">
                <For each={Object.entries(application().annotations)}>
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

        <div class="card bg-base-200/60">
          <div class="card-body gap-3">
            <h3 class="text-xs uppercase tracking-wide opacity-80">External URLs</h3>
            <Show when={application().externalUrls.length} fallback={<p class="text-sm opacity-60">No external URLs reported.</p>}>
              <div class="flex flex-col gap-2">
                <For each={application().externalUrls}>
                  {(url) => (
                    <a class="link link-primary text-sm break-all" href={url} target="_blank" rel="noreferrer">
                      {url}
                    </a>
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

export default ArgoApplicationInfoPanel;
