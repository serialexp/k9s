// ABOUTME: Displays detailed information about an Istio DestinationRule
// ABOUTME: Shows host, traffic policy, subsets, labels, and annotations
import { For, Show } from 'solid-js';
import type { DestinationRuleDetail } from '../lib/api';
import { formatRelativeTime } from '../utils/datetime';

interface DestinationRuleInfoPanelProps {
  destinationrule?: DestinationRuleDetail;
  loading?: boolean;
}

const DestinationRuleInfoPanel = (props: DestinationRuleInfoPanelProps) => (
  <Show
    when={props.destinationrule}
    fallback={
      props.loading ? (
        <div class="flex h-48 items-center justify-center">
          <span class="loading loading-dots" />
        </div>
      ) : (
        <p class="text-sm opacity-60">Select a DestinationRule to inspect its metadata.</p>
      )
    }
  >
    {(dr) => (
      <div class="flex flex-col gap-6">
        <div class="grid gap-3 lg:grid-cols-2">
          <div class="card bg-base-200/60">
            <div class="card-body gap-3 text-sm">
              <h3 class="text-xs uppercase tracking-wide opacity-80">Metadata</h3>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Namespace</span>
                <span class="font-mono text-xs">{dr().namespace}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Host</span>
                <span class="font-mono text-xs">{dr().host || '—'}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Subsets</span>
                <span class="font-mono text-xs">{dr().subsetCount}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Age</span>
                <span>{formatRelativeTime(dr().creationTimestamp)}</span>
              </div>
            </div>
          </div>
          <div class="card bg-base-200/60">
            <div class="card-body gap-3 text-sm">
              <h3 class="text-xs uppercase tracking-wide opacity-80">Traffic Policy</h3>
              <Show when={dr().trafficPolicy} fallback={<p class="text-sm opacity-60">No traffic policy defined.</p>}>
                <Show when={dr().loadBalancer}>
                  <div class="flex items-center justify-between gap-3">
                    <span class="opacity-70">Load Balancer</span>
                    <span class="font-mono text-xs">{dr().loadBalancer}</span>
                  </div>
                </Show>
                <Show when={dr().tlsMode}>
                  <div class="flex items-center justify-between gap-3">
                    <span class="opacity-70">TLS Mode</span>
                    <span class="font-mono text-xs">{dr().tlsMode}</span>
                  </div>
                </Show>
                <Show when={dr().trafficPolicy?.connectionPool}>
                  <div>
                    <span class="opacity-70">Connection Pool:</span>
                    <pre class="mt-1 overflow-auto rounded bg-base-300/60 p-2 text-xs">
                      {JSON.stringify(dr().trafficPolicy?.connectionPool, null, 2)}
                    </pre>
                  </div>
                </Show>
                <Show when={dr().trafficPolicy?.outlierDetection}>
                  <div>
                    <span class="opacity-70">Outlier Detection:</span>
                    <pre class="mt-1 overflow-auto rounded bg-base-300/60 p-2 text-xs">
                      {JSON.stringify(dr().trafficPolicy?.outlierDetection, null, 2)}
                    </pre>
                  </div>
                </Show>
              </Show>
            </div>
          </div>
        </div>

        <div class="card bg-base-200/60">
          <div class="card-body gap-3">
            <h3 class="text-xs uppercase tracking-wide opacity-80">Subsets</h3>
            <Show when={dr().subsets.length} fallback={<p class="text-sm opacity-60">No subsets defined.</p>}>
              <div class="flex flex-col gap-2">
                <For each={dr().subsets}>
                  {(subset) => (
                    <div class="rounded-lg bg-base-300/40 p-3 text-xs">
                      <div class="font-mono text-[0.7rem] uppercase tracking-wide opacity-70 mb-2">{subset.name}</div>
                      <Show when={Object.keys(subset.labels).length}>
                        <div class="mb-2">
                          <span class="opacity-70">Labels: </span>
                          <div class="flex flex-wrap gap-1 mt-1">
                            <For each={Object.entries(subset.labels)}>
                              {([key, value]) => (
                                <span class="badge badge-outline badge-xs font-mono">{key}={value}</span>
                              )}
                            </For>
                          </div>
                        </div>
                      </Show>
                      <Show when={subset.trafficPolicy}>
                        <div>
                          <span class="opacity-70">Traffic Policy:</span>
                          <pre class="mt-1 overflow-auto rounded bg-base-300/60 p-2">
                            {JSON.stringify(subset.trafficPolicy, null, 2)}
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

        <Show when={dr().exportTo.length}>
          <div class="card bg-base-200/60">
            <div class="card-body gap-3">
              <h3 class="text-xs uppercase tracking-wide opacity-80">Export To</h3>
              <div class="flex flex-wrap gap-2">
                <For each={dr().exportTo}>
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
            <Show when={Object.keys(dr().labels).length} fallback={<p class="text-sm opacity-60">No labels applied.</p>}>
              <div class="flex flex-wrap gap-2">
                <For each={Object.entries(dr().labels)}>
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
            <Show when={Object.keys(dr().annotations).length} fallback={<p class="text-sm opacity-60">No annotations set.</p>}>
              <div class="flex flex-col gap-2">
                <For each={Object.entries(dr().annotations)}>
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

export default DestinationRuleInfoPanel;
