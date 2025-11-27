import { For, Show } from 'solid-js';
import type { ServiceAccountDetail } from '../lib/api';
import { formatRelativeTime } from '../utils/datetime';

interface ServiceAccountInfoPanelProps {
  serviceAccount?: ServiceAccountDetail;
  loading?: boolean;
}

const ServiceAccountInfoPanel = (props: ServiceAccountInfoPanelProps) => (
  <Show
    when={props.serviceAccount}
    fallback={
      props.loading ? (
        <div class="flex h-48 items-center justify-center">
          <span class="loading loading-dots" />
        </div>
      ) : (
        <p class="text-sm opacity-60">Select a service account to inspect it.</p>
      )
    }
  >
    {(serviceAccount) => (
      <div class="flex flex-col gap-6">
        <div class="card bg-base-200/60">
          <div class="card-body gap-3 text-sm">
            <h3 class="text-xs uppercase tracking-wide opacity-80">Metadata</h3>
            <div class="flex items-center justify-between gap-3">
              <span class="opacity-70">Namespace</span>
              <span class="font-mono text-xs">{serviceAccount().namespace}</span>
            </div>
            <div class="flex items-center justify-between gap-3">
              <span class="opacity-70">Secrets</span>
              <span class="font-semibold">{serviceAccount().secretCount}</span>
            </div>
            <div class="flex items-center justify-between gap-3">
              <span class="opacity-70">Image Pull Secrets</span>
              <span class="font-semibold">{serviceAccount().imagePullSecretCount}</span>
            </div>
            <div class="flex items-center justify-between gap-3">
              <span class="opacity-70">Created</span>
              <span>{formatRelativeTime(serviceAccount().creationTimestamp)}</span>
            </div>
          </div>
        </div>

        <div class="card bg-base-200/60">
          <div class="card-body gap-3">
            <h3 class="text-xs uppercase tracking-wide opacity-80">Labels</h3>
            <Show when={Object.keys(serviceAccount().labels).length} fallback={<p class="text-sm opacity-60">No labels applied.</p>}>
              <div class="flex flex-wrap gap-2">
                <For each={Object.entries(serviceAccount().labels)}>
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
            <Show when={Object.keys(serviceAccount().annotations).length} fallback={<p class="text-sm opacity-60">No annotations set.</p>}>
              <div class="flex flex-col gap-2">
                <For each={Object.entries(serviceAccount().annotations)}>
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
            <h3 class="text-xs uppercase tracking-wide opacity-80">Secrets</h3>
            <Show when={serviceAccount().secrets.length} fallback={<p class="text-sm opacity-60">No secrets referenced.</p>}>
              <div class="flex flex-wrap gap-2">
                <For each={serviceAccount().secrets}>
                  {(secret) => (
                    <span class="badge badge-outline badge-sm font-mono">{secret.name}</span>
                  )}
                </For>
              </div>
            </Show>
          </div>
        </div>

        <div class="card bg-base-200/60">
          <div class="card-body gap-3">
            <h3 class="text-xs uppercase tracking-wide opacity-80">Image Pull Secrets</h3>
            <Show when={serviceAccount().imagePullSecrets.length} fallback={<p class="text-sm opacity-60">No image pull secrets configured.</p>}>
              <div class="flex flex-wrap gap-2">
                <For each={serviceAccount().imagePullSecrets}>
                  {(secret) => (
                    <span class="badge badge-outline badge-sm font-mono">{secret.name}</span>
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

export default ServiceAccountInfoPanel;
