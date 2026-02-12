// ABOUTME: Table component for displaying Kubernetes namespaces with resource metrics
// ABOUTME: Shows name, status, pod count, CPU/memory requests and usage, and age

import { createSignal, For, Show } from 'solid-js';
import type { NamespaceListItem } from '../lib/api';
import { formatRelativeTime } from '../utils/datetime';
import { formatCpuComparison, formatMemoryComparison, formatPercent } from '../utils/resources';

interface NamespaceTableProps {
  namespaces: NamespaceListItem[];
  selectedNamespace?: string;
  loading?: boolean;
  onSelect?: (namespace: NamespaceListItem) => void;
}

const getUtilizationColor = (utilization?: number): string => {
  if (utilization === undefined || utilization === null) return '';
  if (utilization < 0.25) return 'bg-error/20';
  if (utilization < 0.60) return 'bg-warning/20';
  return '';
};

const NamespaceTable = (props: NamespaceTableProps) => {
  const [search, setSearch] = createSignal('');
  const filtered = () => {
    const query = search().toLowerCase().trim();
    if (!query) return props.namespaces;
    return props.namespaces.filter((ns) =>
      ns.name.toLowerCase().includes(query)
    );
  };
  return (
  <div class="flex flex-col gap-3">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-semibold">Namespaces</h2>
      <div class="flex items-center gap-2">
        <input
          type="text"
          placeholder="Filter by name..."
          class="input input-bordered input-sm w-64"
          value={search()}
          onInput={(e) => setSearch(e.currentTarget.value)}
        />
        <Show when={props.loading}>
          <span class="loading loading-xs loading-spinner" />
        </Show>
      </div>
    </div>
    <div class="overflow-x-auto rounded-lg border border-base-200/50 bg-base-200/30">
      <table class="table table-zebra table-pin-rows">
        <thead>
          <tr class="text-sm uppercase tracking-wide text-base-content/60">
            <th>Name</th>
            <th>Status</th>
            <th>Pods</th>
            <th>CPU Requests</th>
            <th>CPU Used</th>
            <th>Memory Requests</th>
            <th>Memory Used</th>
            <th>Age</th>
          </tr>
        </thead>
        <tbody>
          <Show
            when={filtered().length}
            fallback={
              <tr>
                <td colSpan={8} class="text-center text-sm opacity-70">
                  {search() ? 'No namespaces match the filter.' : 'No namespaces found.'}
                </td>
              </tr>
            }
          >
            <For each={filtered()}>
              {(ns) => (
                <tr
                  class={`cursor-pointer hover:bg-base-200/50 ${props.selectedNamespace === ns.name ? 'bg-primary/20 border-l-4 border-primary' : ''}`}
                  onClick={() => props.onSelect?.(ns)}
                >
                  <td class="font-mono text-sm">{ns.name}</td>
                  <td>
                    <span class={`badge badge-sm ${ns.status === 'Active' ? 'badge-success' : 'badge-warning'}`}>
                      {ns.status}
                    </span>
                  </td>
                  <td class="text-sm">{ns.podCount}</td>
                  <td class="font-mono text-xs opacity-80">{ns.cpuRequests ?? '—'}</td>
                  <td class={`font-mono text-xs ${getUtilizationColor(ns.cpuUsageUtilization)}`}>
                    <div class="flex flex-col">
                      <div>{formatCpuComparison(ns.cpuUsage, ns.cpuRequests)}</div>
                      <div class="text-xs opacity-60">{formatPercent(ns.cpuUsageUtilization)}</div>
                    </div>
                  </td>
                  <td class="font-mono text-xs opacity-80">{ns.memoryRequests ?? '—'}</td>
                  <td class={`font-mono text-xs ${getUtilizationColor(ns.memoryUsageUtilization)}`}>
                    <div class="flex flex-col">
                      <div>{formatMemoryComparison(ns.memoryUsage, ns.memoryRequests)}</div>
                      <div class="text-xs opacity-60">{formatPercent(ns.memoryUsageUtilization)}</div>
                    </div>
                  </td>
                  <td class="text-xs opacity-80">{formatRelativeTime(ns.creationTimestamp)}</td>
                </tr>
              )}
            </For>
          </Show>
        </tbody>
      </table>
    </div>
  </div>
  );
};

export default NamespaceTable;
