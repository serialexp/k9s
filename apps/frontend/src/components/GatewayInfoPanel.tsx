// ABOUTME: Displays detailed information about an Istio Gateway
// ABOUTME: Shows selector, servers with port/hosts/TLS details, labels, and annotations
import { For, Show } from 'solid-js';
import type { GatewayDetail } from '../lib/api';
import { formatRelativeTime } from '../utils/datetime';

interface GatewayInfoPanelProps {
  gateway?: GatewayDetail;
  loading?: boolean;
}

const GatewayInfoPanel = (props: GatewayInfoPanelProps) => (
  <Show
    when={props.gateway}
    fallback={
      props.loading ? (
        <div class="flex h-48 items-center justify-center">
          <span class="loading loading-dots" />
        </div>
      ) : (
        <p class="text-sm opacity-60">Select a Gateway to inspect its metadata.</p>
      )
    }
  >
    {(gw) => (
      <div class="flex flex-col gap-6">
        <div class="grid gap-3 lg:grid-cols-2">
          <div class="card bg-base-200/60">
            <div class="card-body gap-3 text-sm">
              <h3 class="text-xs uppercase tracking-wide opacity-80">Metadata</h3>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Namespace</span>
                <span class="font-mono text-xs">{gw().namespace}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Servers</span>
                <span class="font-mono text-xs">{gw().serverCount}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Age</span>
                <span>{formatRelativeTime(gw().creationTimestamp)}</span>
              </div>
            </div>
          </div>
          <div class="card bg-base-200/60">
            <div class="card-body gap-3 text-sm">
              <h3 class="text-xs uppercase tracking-wide opacity-80">Selector</h3>
              <Show when={Object.keys(gw().selector).length} fallback={<p class="text-sm opacity-60">No selector defined.</p>}>
                <div class="flex flex-wrap gap-2">
                  <For each={Object.entries(gw().selector)}>
                    {([key, value]) => (
                      <span class="badge badge-outline badge-sm font-mono">{key}={value}</span>
                    )}
                  </For>
                </div>
              </Show>
            </div>
          </div>
        </div>

        <div class="card bg-base-200/60">
          <div class="card-body gap-3">
            <h3 class="text-xs uppercase tracking-wide opacity-80">Servers</h3>
            <Show when={gw().servers.length} fallback={<p class="text-sm opacity-60">No servers configured.</p>}>
              <div class="flex flex-col gap-2">
                <For each={gw().servers}>
                  {(server, index) => (
                    <div class="rounded-lg bg-base-300/40 p-3 text-xs">
                      <div class="text-[0.7rem] uppercase tracking-wide opacity-70 mb-2">Server #{index() + 1}</div>
                      <div class="grid gap-2 sm:grid-cols-2">
                        <div>
                          <span class="opacity-70">Port: </span>
                          <span class="font-mono">{server.port.number}</span>
                          <Show when={server.port.name}> ({server.port.name})</Show>
                          <Show when={server.port.protocol}> — {server.port.protocol}</Show>
                        </div>
                      </div>
                      <div class="mt-2">
                        <span class="opacity-70">Hosts: </span>
                        <span class="font-mono">{server.hosts.join(', ')}</span>
                      </div>
                      <Show when={server.tls}>
                        <div class="mt-2">
                          <span class="opacity-70">TLS: </span>
                          <pre class="mt-1 overflow-auto rounded bg-base-300/60 p-2">
                            {JSON.stringify(server.tls, null, 2)}
                          </pre>
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
            <Show when={Object.keys(gw().labels).length} fallback={<p class="text-sm opacity-60">No labels applied.</p>}>
              <div class="flex flex-wrap gap-2">
                <For each={Object.entries(gw().labels)}>
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
            <Show when={Object.keys(gw().annotations).length} fallback={<p class="text-sm opacity-60">No annotations set.</p>}>
              <div class="flex flex-col gap-2">
                <For each={Object.entries(gw().annotations)}>
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

export default GatewayInfoPanel;
