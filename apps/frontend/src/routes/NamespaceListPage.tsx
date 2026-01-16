// ABOUTME: Displays namespace resource consumption and usage statistics
// ABOUTME: Shows CPU/memory requests and actual usage per namespace
import { createSignal, createEffect, For, Show } from 'solid-js';
import { ApiError, fetchNamespaceSummaries, createNamespace, type NamespaceSummary } from '../lib/api';
import { contextStore } from '../stores/contextStore';
import { formatCpuComparison, formatMemoryComparison, formatPercent } from '../utils/resources';
import CreateNamespaceDialog from '../components/CreateNamespaceDialog';

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
  const [createDialogOpen, setCreateDialogOpen] = createSignal(false);

  let requestId = 0;

  const loadNamespaces = async () => {
    const context = contextStore.activeContext();
    if (!context) return;

    const currentRequestId = ++requestId;
    setLoading(true);
    setError('');

    try {
      const data = await fetchNamespaceSummaries();
      if (currentRequestId !== requestId) return;
      setNamespaces(data);
      setError('');
    } catch (err) {
      if (currentRequestId !== requestId) return;
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to load namespaces');
      }
    } finally {
      if (currentRequestId !== requestId) return;
      setLoading(false);
    }
  };

  createEffect(() => {
    contextStore.activeContext();
    loadNamespaces();
  });

  const handleCreate = async (name: string) => {
    await createNamespace(name);
    await loadNamespaces();
  };

  return (
    <div class="p-4">
      <div class="flex items-center gap-2 mb-4">
        <h1 class="text-2xl font-bold">Namespaces</h1>
        <button
          type="button"
          class="btn btn-sm btn-ghost btn-square"
          title="Create namespace"
          onClick={() => setCreateDialogOpen(true)}
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
          </svg>
        </button>
      </div>

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

      <CreateNamespaceDialog
        open={createDialogOpen()}
        onClose={() => setCreateDialogOpen(false)}
        onCreate={handleCreate}
      />
    </div>
  );
};

export default NamespaceListPage;
