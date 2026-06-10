import { For, Show } from 'solid-js';
import type { IngressClassDetail } from '../lib/api';
import { formatRelativeTime } from '../utils/datetime';

interface IngressClassInfoPanelProps {
  ingressClass?: IngressClassDetail;
  loading?: boolean;
}

const IngressClassInfoPanel = (props: IngressClassInfoPanelProps) => (
  <Show
    when={props.ingressClass}
    fallback={
      props.loading ? (
        <div class="flex h-48 items-center justify-center">
          <span class="loading loading-dots" />
        </div>
      ) : (
        <p class="text-sm opacity-60">Select an ingress class to inspect its details.</p>
      )
    }
  >
    {(ic) => (
      <div class="flex flex-col gap-6">
        <div class="grid gap-3 lg:grid-cols-2">
          <div class="card bg-base-200/60">
            <div class="card-body gap-3 text-sm">
              <h3 class="text-xs uppercase tracking-wide opacity-80">Metadata</h3>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Name</span>
                <span class="font-mono text-xs">{ic().name}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Controller</span>
                <span class="font-mono text-xs">{ic().controller || '—'}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Default</span>
                <span class="font-semibold">{ic().isDefault ? 'Yes' : 'No'}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Age</span>
                <span>{formatRelativeTime(ic().creationTimestamp)}</span>
              </div>
            </div>
          </div>

          <div class="card bg-base-200/60">
            <div class="card-body gap-3">
              <h3 class="text-xs uppercase tracking-wide opacity-80">Parameters</h3>
              <Show
                when={ic().parameters}
                fallback={<p class="text-sm opacity-60">No parameters defined.</p>}
              >
                {(params) => (
                  <div class="flex flex-col gap-2 text-sm">
                    <Show when={params().apiGroup}>
                      <div class="flex items-start justify-between gap-3">
                        <span class="font-mono text-xs opacity-70">apiGroup</span>
                        <span class="font-mono text-xs text-right">{params().apiGroup}</span>
                      </div>
                    </Show>
                    <Show when={params().kind}>
                      <div class="flex items-start justify-between gap-3">
                        <span class="font-mono text-xs opacity-70">kind</span>
                        <span class="font-mono text-xs text-right">{params().kind}</span>
                      </div>
                    </Show>
                    <Show when={params().name}>
                      <div class="flex items-start justify-between gap-3">
                        <span class="font-mono text-xs opacity-70">name</span>
                        <span class="font-mono text-xs text-right">{params().name}</span>
                      </div>
                    </Show>
                    <Show when={params().namespace}>
                      <div class="flex items-start justify-between gap-3">
                        <span class="font-mono text-xs opacity-70">namespace</span>
                        <span class="font-mono text-xs text-right">{params().namespace}</span>
                      </div>
                    </Show>
                    <Show when={params().scope}>
                      <div class="flex items-start justify-between gap-3">
                        <span class="font-mono text-xs opacity-70">scope</span>
                        <span class="font-mono text-xs text-right">{params().scope}</span>
                      </div>
                    </Show>
                  </div>
                )}
              </Show>
            </div>
          </div>
        </div>

        <div class="card bg-base-200/60">
          <div class="card-body gap-3">
            <h3 class="text-xs uppercase tracking-wide opacity-80">Labels</h3>
            <Show
              when={Object.keys(ic().labels).length}
              fallback={<p class="text-sm opacity-60">No labels.</p>}
            >
              <div class="flex flex-wrap gap-2">
                <For each={Object.entries(ic().labels)}>
                  {([key, value]) => (
                    <span class="badge badge-sm font-mono">
                      {key}: {value}
                    </span>
                  )}
                </For>
              </div>
            </Show>
          </div>
        </div>

        <div class="card bg-base-200/60">
          <div class="card-body gap-3">
            <h3 class="text-xs uppercase tracking-wide opacity-80">Annotations</h3>
            <Show
              when={Object.keys(ic().annotations).length}
              fallback={<p class="text-sm opacity-60">No annotations.</p>}
            >
              <div class="flex flex-col gap-2 text-sm">
                <For each={Object.entries(ic().annotations)}>
                  {([key, value]) => (
                    <div class="flex items-start justify-between gap-3">
                      <span class="font-mono text-xs opacity-70">{key}</span>
                      <span class="break-all font-mono text-xs text-right">{value}</span>
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

export default IngressClassInfoPanel;
