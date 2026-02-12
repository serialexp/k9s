// ABOUTME: Displays detailed information about an Istio VirtualService
// ABOUTME: Shows hosts, gateways, HTTP route details, labels, and annotations
import { For, Show } from 'solid-js';
import type { VirtualServiceDetail } from '../lib/api';
import { formatRelativeTime } from '../utils/datetime';

interface VirtualServiceInfoPanelProps {
  virtualservice?: VirtualServiceDetail;
  loading?: boolean;
}

const VirtualServiceInfoPanel = (props: VirtualServiceInfoPanelProps) => (
  <Show
    when={props.virtualservice}
    fallback={
      props.loading ? (
        <div class="flex h-48 items-center justify-center">
          <span class="loading loading-dots" />
        </div>
      ) : (
        <p class="text-sm opacity-60">Select a VirtualService to inspect its metadata.</p>
      )
    }
  >
    {(vs) => (
      <div class="flex flex-col gap-6">
        <div class="grid gap-3 lg:grid-cols-2">
          <div class="card bg-base-200/60">
            <div class="card-body gap-3 text-sm">
              <h3 class="text-xs uppercase tracking-wide opacity-80">Metadata</h3>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Namespace</span>
                <span class="font-mono text-xs">{vs().namespace}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Age</span>
                <span>{formatRelativeTime(vs().creationTimestamp)}</span>
              </div>
            </div>
          </div>
          <div class="card bg-base-200/60">
            <div class="card-body gap-3 text-sm">
              <h3 class="text-xs uppercase tracking-wide opacity-80">Routing Summary</h3>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">HTTP Routes</span>
                <span class="font-mono text-xs">{vs().httpRouteCount}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">TLS Routes</span>
                <span class="font-mono text-xs">{vs().tlsRouteCount}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">TCP Routes</span>
                <span class="font-mono text-xs">{vs().tcpRouteCount}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="card bg-base-200/60">
          <div class="card-body gap-3">
            <h3 class="text-xs uppercase tracking-wide opacity-80">Hosts</h3>
            <Show when={vs().hosts.length} fallback={<p class="text-sm opacity-60">No hosts defined.</p>}>
              <div class="flex flex-wrap gap-2">
                <For each={vs().hosts}>
                  {(host) => (
                    <span class="badge badge-outline badge-sm font-mono">{host}</span>
                  )}
                </For>
              </div>
            </Show>
          </div>
        </div>

        <div class="card bg-base-200/60">
          <div class="card-body gap-3">
            <h3 class="text-xs uppercase tracking-wide opacity-80">Gateways</h3>
            <Show when={vs().gateways.length} fallback={<p class="text-sm opacity-60">No gateways referenced.</p>}>
              <div class="flex flex-wrap gap-2">
                <For each={vs().gateways}>
                  {(gw) => (
                    <span class="badge badge-outline badge-sm font-mono">{gw}</span>
                  )}
                </For>
              </div>
            </Show>
          </div>
        </div>

        <Show when={vs().http.length}>
          <div class="card bg-base-200/60">
            <div class="card-body gap-3">
              <h3 class="text-xs uppercase tracking-wide opacity-80">HTTP Routes</h3>
              <div class="flex flex-col gap-2">
                <For each={vs().http}>
                  {(route, index) => (
                    <div class="rounded-lg bg-base-300/40 p-3 text-xs">
                      <div class="text-[0.7rem] uppercase tracking-wide opacity-70 mb-2">Route #{index() + 1}</div>
                      <Show when={route.match}>
                        <div class="mb-2">
                          <span class="opacity-70">Match: </span>
                          <pre class="mt-1 overflow-auto rounded bg-base-300/60 p-2">
                            {JSON.stringify(route.match, null, 2)}
                          </pre>
                        </div>
                      </Show>
                      <Show when={route.route}>
                        <div class="mb-2">
                          <span class="opacity-70">Destinations:</span>
                          <For each={route.route}>
                            {(dest) => (
                              <div class="ml-2 mt-1 font-mono">
                                {dest.destination.host}
                                <Show when={dest.destination.port}>:{dest.destination.port?.number}</Show>
                                <Show when={dest.destination.subset}> ({dest.destination.subset})</Show>
                                <Show when={dest.weight != null}> — weight: {dest.weight}</Show>
                              </div>
                            )}
                          </For>
                        </div>
                      </Show>
                      <Show when={route.timeout}>
                        <div><span class="opacity-70">Timeout:</span> {route.timeout}</div>
                      </Show>
                      <Show when={route.retries}>
                        <div>
                          <span class="opacity-70">Retries: </span>
                          <span class="font-mono">{JSON.stringify(route.retries)}</span>
                        </div>
                      </Show>
                      <Show when={route.redirect}>
                        <div>
                          <span class="opacity-70">Redirect: </span>
                          <span class="font-mono">{JSON.stringify(route.redirect)}</span>
                        </div>
                      </Show>
                      <Show when={route.rewrite}>
                        <div>
                          <span class="opacity-70">Rewrite: </span>
                          <span class="font-mono">{JSON.stringify(route.rewrite)}</span>
                        </div>
                      </Show>
                    </div>
                  )}
                </For>
              </div>
            </div>
          </div>
        </Show>

        <Show when={vs().exportTo.length}>
          <div class="card bg-base-200/60">
            <div class="card-body gap-3">
              <h3 class="text-xs uppercase tracking-wide opacity-80">Export To</h3>
              <div class="flex flex-wrap gap-2">
                <For each={vs().exportTo}>
                  {(ns) => (
                    <span class="badge badge-outline badge-sm font-mono">{ns}</span>
                  )}
                </For>
              </div>
            </div>
          </div>
        </Show>

        <div class="card bg-base-200/60">
          <div class="card-body gap-3">
            <h3 class="text-xs uppercase tracking-wide opacity-80">Labels</h3>
            <Show when={Object.keys(vs().labels).length} fallback={<p class="text-sm opacity-60">No labels applied.</p>}>
              <div class="flex flex-wrap gap-2">
                <For each={Object.entries(vs().labels)}>
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
            <Show when={Object.keys(vs().annotations).length} fallback={<p class="text-sm opacity-60">No annotations set.</p>}>
              <div class="flex flex-col gap-2">
                <For each={Object.entries(vs().annotations)}>
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

export default VirtualServiceInfoPanel;
