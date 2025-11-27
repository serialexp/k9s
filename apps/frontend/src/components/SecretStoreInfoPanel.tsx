import { For, Show } from 'solid-js';
import type { SecretStoreDetail } from '../lib/api';
import { formatRelativeTime } from '../utils/datetime';

interface SecretStoreInfoPanelProps {
  secretstore?: SecretStoreDetail;
  loading?: boolean;
}

const SecretStoreInfoPanel = (props: SecretStoreInfoPanelProps) => (
  <Show
    when={props.secretstore}
    fallback={
      props.loading ? (
        <div class="flex h-48 items-center justify-center">
          <span class="loading loading-dots" />
        </div>
      ) : (
        <p class="text-sm opacity-60">Select a secret store to inspect its metadata.</p>
      )
    }
  >
    {(secretstore) => (
      <div class="flex flex-col gap-6">
        <div class="card bg-base-200/60">
          <div class="card-body gap-3 text-sm">
            <h3 class="text-xs uppercase tracking-wide opacity-80">Metadata</h3>
            <div class="flex items-center justify-between gap-3">
              <span class="opacity-70">Namespace</span>
              <span class="font-mono text-xs">{secretstore().namespace}</span>
            </div>
            <div class="flex items-center justify-between gap-3">
              <span class="opacity-70">Provider</span>
              <span class="font-mono text-xs">{secretstore().providerType ?? '—'}</span>
            </div>
            <div class="flex items-center justify-between gap-3">
              <span class="opacity-70">Refresh Interval</span>
              <span class="font-mono text-xs">{secretstore().refreshInterval ?? '—'}</span>
            </div>
            <div class="flex items-center justify-between gap-3">
              <span class="opacity-70">Age</span>
              <span>{formatRelativeTime(secretstore().creationTimestamp)}</span>
            </div>
          </div>
        </div>

        <div class="card bg-base-200/60">
          <div class="card-body gap-3">
            <h3 class="text-xs uppercase tracking-wide opacity-80">Provider Configuration</h3>
            <Show when={secretstore().provider} fallback={<p class="text-sm opacity-60">No provider configuration found.</p>}>
              <pre class="overflow-auto rounded-lg bg-base-300/40 p-3 text-xs">
                {JSON.stringify(secretstore().provider, null, 2)}
              </pre>
            </Show>
          </div>
        </div>

        <div class="card bg-base-200/60">
          <div class="card-body gap-3">
            <h3 class="text-xs uppercase tracking-wide opacity-80">Retry Settings</h3>
            <Show when={secretstore().retrySettings} fallback={<p class="text-sm opacity-60">No retry settings defined.</p>}>
              <pre class="overflow-auto rounded-lg bg-base-300/40 p-3 text-xs">
                {JSON.stringify(secretstore().retrySettings, null, 2)}
              </pre>
            </Show>
          </div>
        </div>

        <div class="card bg-base-200/60">
          <div class="card-body gap-3">
            <h3 class="text-xs uppercase tracking-wide opacity-80">Labels</h3>
            <Show when={Object.keys(secretstore().labels).length} fallback={<p class="text-sm opacity-60">No labels applied.</p>}>
              <div class="flex flex-wrap gap-2">
                <For each={Object.entries(secretstore().labels)}>{([key, value]) => (
                  <span class="badge badge-outline badge-sm font-mono">{key}={value}</span>
                )}</For>
              </div>
            </Show>
          </div>
        </div>

        <div class="card bg-base-200/60">
          <div class="card-body gap-3">
            <h3 class="text-xs uppercase tracking-wide opacity-80">Annotations</h3>
            <Show when={Object.keys(secretstore().annotations).length} fallback={<p class="text-sm opacity-60">No annotations set.</p>}>
              <div class="flex flex-col gap-2">
                <For each={Object.entries(secretstore().annotations)}>{([key, value]) => (
                  <div class="rounded-lg bg-base-300/40 p-3 text-xs">
                    <div class="font-mono text-[0.7rem] uppercase tracking-wide opacity-70">{key}</div>
                    <div class="font-mono break-words text-xs">{value}</div>
                  </div>
                )}</For>
              </div>
            </Show>
          </div>
        </div>
      </div>
    )}
  </Show>
);

export default SecretStoreInfoPanel;
