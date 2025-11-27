import { For, Show } from 'solid-js';
import type { ExternalSecretDetail } from '../lib/api';
import { formatRelativeTime } from '../utils/datetime';

interface ExternalSecretInfoPanelProps {
  externalsecret?: ExternalSecretDetail;
  loading?: boolean;
}

const ExternalSecretInfoPanel = (props: ExternalSecretInfoPanelProps) => (
  <Show
    when={props.externalsecret}
    fallback={
      props.loading ? (
        <div class="flex h-48 items-center justify-center">
          <span class="loading loading-dots" />
        </div>
      ) : (
        <p class="text-sm opacity-60">Select an external secret to inspect its metadata.</p>
      )
    }
  >
    {(externalsecret) => (
      <div class="flex flex-col gap-6">
        <div class="grid gap-3 lg:grid-cols-2">
          <div class="card bg-base-200/60">
            <div class="card-body gap-3 text-sm">
              <h3 class="text-xs uppercase tracking-wide opacity-80">Metadata</h3>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Namespace</span>
                <span class="font-mono text-xs">{externalsecret().namespace}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Secret Name</span>
                <span class="font-mono text-xs">{externalsecret().secretName ?? '—'}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Refresh Interval</span>
                <span class="font-mono text-xs">{externalsecret().refreshInterval ?? '—'}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Age</span>
                <span>{formatRelativeTime(externalsecret().creationTimestamp)}</span>
              </div>
            </div>
          </div>
          <div class="card bg-base-200/60">
            <div class="card-body gap-3 text-sm">
              <h3 class="text-xs uppercase tracking-wide opacity-80">Store Reference</h3>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Kind</span>
                <span class="font-mono text-xs">{externalsecret().storeKind ?? '—'}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Name</span>
                <span class="font-mono text-xs">{externalsecret().storeName ?? '—'}</span>
              </div>
              <Show when={externalsecret().syncedAt}>
                <div class="flex items-center justify-between gap-3">
                  <span class="opacity-70">Last Synced</span>
                  <span class="font-mono text-xs">{formatRelativeTime(externalsecret().syncedAt)}</span>
                </div>
              </Show>
            </div>
          </div>
        </div>

        <div class="card bg-base-200/60">
          <div class="card-body gap-3">
            <h3 class="text-xs uppercase tracking-wide opacity-80">Target Options</h3>
            <div class="grid gap-2 sm:grid-cols-2">
              <div class="text-sm">
                <span class="opacity-70">Creation Policy</span>
                <div class="font-mono text-xs">{externalsecret().target.creationPolicy ?? '—'}</div>
              </div>
              <div class="text-sm">
                <span class="opacity-70">Deletion Policy</span>
                <div class="font-mono text-xs">{externalsecret().target.deletionPolicy ?? '—'}</div>
              </div>
            </div>
            <Show
              when={externalsecret().target.template && Object.keys(externalsecret().target.template ?? {}).length}
              fallback={<p class="text-sm opacity-60">No secret template defined.</p>}
            >
              <pre class="overflow-auto rounded-lg bg-base-300/40 p-3 text-xs">
                {JSON.stringify(externalsecret().target.template, null, 2)}
              </pre>
            </Show>
          </div>
        </div>

        <div class="card bg-base-200/60">
          <div class="card-body gap-3">
            <h3 class="text-xs uppercase tracking-wide opacity-80">Data References</h3>
            <Show when={externalsecret().data.length} fallback={<p class="text-sm opacity-60">No key-by-key data references.</p>}>
              <div class="flex flex-col gap-2">
                <For each={externalsecret().data}>
                  {(item) => (
                    <div class="rounded-lg bg-base-300/40 p-3 text-xs">
                      <div class="flex items-center justify-between gap-3">
                        <span class="text-[0.7rem] uppercase tracking-wide opacity-70">Secret Key</span>
                        <span class="font-mono">{item.secretKey ?? '—'}</span>
                      </div>
                      <Show when={item.remoteRef}>
                        <pre class="mt-2 overflow-auto rounded bg-base-300/60 p-2">
                          {JSON.stringify(item.remoteRef, null, 2)}
                        </pre>
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
            <h3 class="text-xs uppercase tracking-wide opacity-80">Data From</h3>
            <Show when={externalsecret().dataFrom.length} fallback={<p class="text-sm opacity-60">No aggregate data sources.</p>}>
              <div class="flex flex-col gap-2">
                <For each={externalsecret().dataFrom}>
                  {(item, index) => (
                    <div class="rounded-lg bg-base-300/40 p-3 text-xs">
                      <div class="text-[0.7rem] uppercase tracking-wide opacity-70">Source #{index() + 1}</div>
                      <pre class="mt-2 overflow-auto rounded bg-base-300/60 p-2">
                        {JSON.stringify(item, null, 2)}
                      </pre>
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
            <Show when={Object.keys(externalsecret().labels).length} fallback={<p class="text-sm opacity-60">No labels applied.</p>}>
              <div class="flex flex-wrap gap-2">
                <For each={Object.entries(externalsecret().labels)}>
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
            <Show when={Object.keys(externalsecret().annotations).length} fallback={<p class="text-sm opacity-60">No annotations set.</p>}>
              <div class="flex flex-col gap-2">
                <For each={Object.entries(externalsecret().annotations)}>
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

export default ExternalSecretInfoPanel;
