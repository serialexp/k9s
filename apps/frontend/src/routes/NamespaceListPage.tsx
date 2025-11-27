// ABOUTME: Displays namespace resource consumption and usage statistics
// ABOUTME: Shows CPU/memory requests and actual usage per namespace
import { createSignal, createEffect, For, Show } from 'solid-js';
import { ApiError, fetchNamespaceSummaries, type NamespaceSummary } from '../lib/api';
import { contextStore } from '../stores/contextStore';
import { formatCpuComparison, formatMemoryComparison, formatPercent } from '../utils/resources';

const getUtilizationColor = (utilization?: number): string => {
  if (utilization === undefined || utilization === null) return 'bg-base-300/40';
  if (utilization < 0.25) return 'bg-error/20 border border-error/40';
  if (utilization < 0.60) return 'bg-warning/20 border border-warning/40';
  return 'bg-base-300/40';
};

const NamespaceListPage = () => {
  const [namespaces, setNamespaces] = createSignal<NamespaceSummary[]>([]);
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal('');

  let requestId = 0;

  createEffect(() => {
    const context = contextStore.activeContext();
    if (!context) return;

    const currentRequestId = ++requestId;
    setLoading(true);
    setError('');

    fetchNamespaceSummaries()
      .then((data) => {
        if (currentRequestId !== requestId) return;
        setNamespaces(data);
        setError('');
      })
      .catch((err) => {
        if (currentRequestId !== requestId) return;
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError('Failed to load namespaces');
        }
      })
      .finally(() => {
        if (currentRequestId !== requestId) return;
        setLoading(false);
      });
  });

  return (
    <div class="p-4">
      <h1 class="text-2xl font-bold mb-4">Namespaces</h1>

      <Show when={error()}>
        <div class="alert alert-error mb-4">
          <span>{error()}</span>
        </div>
      </Show>

      <Show when={loading() && namespaces().length === 0}>
        <div class="flex justify-center py-10">
          <span class="loading loading-spinner loading-md" />
        </div>
      </Show>

      <Show when={namespaces().length > 0} fallback={!loading() ? <p class="text-sm opacity-70">No namespaces found.</p> : null}>
        <div class="overflow-x-auto">
          <table class="table table-zebra">
            <thead>
              <tr>
                <th>Namespace</th>
                <th>Pods</th>
                <th>CPU Requests</th>
                <th>CPU Used</th>
                <th>Memory Requests</th>
                <th>Memory Used</th>
              </tr>
            </thead>
            <tbody>
              <For each={namespaces()}>
                {(ns) => (
                  <tr>
                    <td class="font-semibold">{ns.name}</td>
                    <td>{ns.podCount}</td>
                    <td class="font-mono text-sm">{ns.cpuRequests ?? '—'}</td>
                    <td class={`font-mono text-sm ${getUtilizationColor(ns.cpuUsageUtilization)}`}>
                      <div class="flex flex-col">
                        <div>{formatCpuComparison(ns.cpuUsage, ns.cpuRequests)}</div>
                        <div class="text-xs opacity-60">{formatPercent(ns.cpuUsageUtilization)}</div>
                      </div>
                    </td>
                    <td class="font-mono text-sm">{ns.memoryRequests ?? '—'}</td>
                    <td class={`font-mono text-sm ${getUtilizationColor(ns.memoryUsageUtilization)}`}>
                      <div class="flex flex-col">
                        <div>{formatMemoryComparison(ns.memoryUsage, ns.memoryRequests)}</div>
                        <div class="text-xs opacity-60">{formatPercent(ns.memoryUsageUtilization)}</div>
                      </div>
                    </td>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
        </div>
      </Show>
    </div>
  );
};

export default NamespaceListPage;
