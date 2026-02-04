// ABOUTME: Info panel component for displaying Kubernetes namespace details
// ABOUTME: Shows metadata, labels, annotations, finalizers, and resource stats

import { For, Show } from 'solid-js';
import type { NamespaceDetail } from '../lib/api';
import { formatRelativeTime } from '../utils/datetime';
import { formatCpuComparison, formatMemoryComparison, formatPercent } from '../utils/resources';

interface NamespaceInfoPanelProps {
  namespace?: NamespaceDetail;
  loading?: boolean;
}

const NamespaceInfoPanel = (props: NamespaceInfoPanelProps) => (
  <Show
    when={props.namespace}
    fallback={
      props.loading ? (
        <div class="flex h-48 items-center justify-center">
          <span class="loading loading-dots" />
        </div>
      ) : (
        <p class="text-sm opacity-60">Select a namespace to inspect its details.</p>
      )
    }
  >
    {(ns) => (
      <div class="flex flex-col gap-6">
        <div class="grid gap-3 lg:grid-cols-2">
          <div class="card bg-base-200/60">
            <div class="card-body gap-3 text-sm">
              <h3 class="text-xs uppercase tracking-wide opacity-80">Metadata</h3>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Name</span>
                <span class="font-mono text-xs">{ns().name}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Status</span>
                <span class={`badge badge-sm ${ns().status === 'Active' ? 'badge-success' : 'badge-warning'}`}>
                  {ns().status}
                </span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Age</span>
                <span>{formatRelativeTime(ns().creationTimestamp)}</span>
              </div>
            </div>
          </div>

          <div class="card bg-base-200/60">
            <div class="card-body gap-3 text-sm">
              <h3 class="text-xs uppercase tracking-wide opacity-80">Resources</h3>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Pods</span>
                <span class="font-semibold">{ns().podCount}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">CPU Usage / Requests</span>
                <span class="font-mono text-xs">
                  {formatCpuComparison(ns().cpuUsage, ns().cpuRequests)}
                  {' '}
                  <span class="opacity-60">({formatPercent(ns().cpuUsageUtilization)})</span>
                </span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Memory Usage / Requests</span>
                <span class="font-mono text-xs">
                  {formatMemoryComparison(ns().memoryUsage, ns().memoryRequests)}
                  {' '}
                  <span class="opacity-60">({formatPercent(ns().memoryUsageUtilization)})</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        <Show when={ns().finalizers && ns().finalizers.length}>
          <div class="card bg-base-200/60">
            <div class="card-body gap-3">
              <h3 class="text-xs uppercase tracking-wide opacity-80">Finalizers</h3>
              <div class="flex flex-wrap gap-2">
                <For each={ns().finalizers}>
                  {(finalizer) => <span class="badge badge-sm font-mono">{finalizer}</span>}
                </For>
              </div>
            </div>
          </div>
        </Show>

        <div class="card bg-base-200/60">
          <div class="card-body gap-3">
            <h3 class="text-xs uppercase tracking-wide opacity-80">Labels</h3>
            <Show
              when={Object.keys(ns().labels).length}
              fallback={<p class="text-sm opacity-60">No labels.</p>}
            >
              <div class="flex flex-wrap gap-2">
                <For each={Object.entries(ns().labels)}>
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
              when={Object.keys(ns().annotations).length}
              fallback={<p class="text-sm opacity-60">No annotations.</p>}
            >
              <div class="flex flex-col gap-2 text-sm">
                <For each={Object.entries(ns().annotations)}>
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

export default NamespaceInfoPanel;
