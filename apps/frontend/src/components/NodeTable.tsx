// ABOUTME: Table component displaying Kubernetes nodes with expandable pod subrows
// ABOUTME: Shows node status, resources, and all pods running on each node

import { createSignal, For, Show } from 'solid-js';
import type { NodeListItem } from '../lib/api';
import { formatRelativeTime } from '../utils/datetime';
import { formatCpuQuantity, formatMemoryQuantity } from '../utils/resources';

interface NodeTableProps {
  nodes: NodeListItem[];
  selectedNode?: string;
  loading?: boolean;
  onSelect?: (node: NodeListItem) => void;
}

const statusBadgeClass = (status?: string) => {
  switch (status) {
    case 'Ready':
      return 'badge-success';
    case 'NotReady':
      return 'badge-error';
    default:
      return 'badge-ghost';
  }
};

const formatPair = (primary?: string, secondary?: string) => {
  if (primary && secondary) return `${primary}/${secondary}`;
  return primary ?? secondary ?? '-';
};

const formatPodLine = (primary?: number, secondary?: number) => {
  const primaryStr = typeof primary === 'number' && Number.isFinite(primary) ? primary.toString() : undefined;
  const secondaryStr = typeof secondary === 'number' && Number.isFinite(secondary) ? secondary.toString() : undefined;
  if (primaryStr && secondaryStr) return `${primaryStr}/${secondaryStr}`;
  return primaryStr ?? secondaryStr ?? '—';
};

const NodeTable = (props: NodeTableProps) => {
  const [search, setSearch] = createSignal('');
  const [expandedNodes, setExpandedNodes] = createSignal<Set<string>>(new Set());

  const toggleNode = (nodeName: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeName)) {
        next.delete(nodeName);
      } else {
        next.add(nodeName);
      }
      return next;
    });
  };

  const isExpanded = (nodeName: string) => expandedNodes().has(nodeName);

  const filtered = () => {
    const query = search().toLowerCase().trim();
    if (!query) return props.nodes;
    return props.nodes.filter((n) =>
      n.name.toLowerCase().includes(query) ||
      n.nodePool?.toLowerCase().includes(query) ||
      n.internalIP?.includes(query)
    );
  };

  return (
    <div class="flex flex-col gap-3">
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-semibold">Nodes</h2>
        <div class="flex items-center gap-2">
          <input
            type="text"
            placeholder="Filter by name, pool, or IP..."
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
              <th class="w-8"></th>
              <th>Name</th>
              <th>Status</th>
              <th>Roles</th>
              <th>Pool</th>
              <th>Version</th>
              <th>CPU</th>
              <th>Memory</th>
              <th>Pods</th>
              <th>Restarts</th>
              <th>Pod IPs</th>
              <th>Age</th>
              <th>Internal IP</th>
            </tr>
          </thead>
          <tbody>
            <Show
              when={filtered().length}
              fallback={
                <tr>
                  <td colSpan={13} class="text-center text-sm opacity-70">
                    {search() ? 'No nodes match the filter.' : 'No nodes available.'}
                  </td>
                </tr>
              }
            >
              <For each={filtered()}>
                {(node) => {
                  const cpuUsageLine = formatPair(formatCpuQuantity(node.cpuUsage), formatCpuQuantity(node.cpuCapacity));
                  const cpuAllocLine = formatPair(formatCpuQuantity(node.cpuAllocatable), formatCpuQuantity(node.cpuCapacity));
                  const cpuRequestLine = formatPair(
                    formatCpuQuantity(node.cpuRequests),
                    formatCpuQuantity(node.cpuAllocatable)
                  );
                  const memoryUsageLine = formatPair(formatMemoryQuantity(node.memoryUsage), formatMemoryQuantity(node.memoryCapacity));
                  const memoryAllocLine = formatPair(
                    formatMemoryQuantity(node.memoryAllocatable),
                    formatMemoryQuantity(node.memoryCapacity)
                  );
                  const memoryRequestLine = formatPair(
                    formatMemoryQuantity(node.memoryRequests),
                    formatMemoryQuantity(node.memoryAllocatable)
                  );
                  const podUsageLine = formatPodLine(node.podCount, node.podAllocatable);
                  const podCapacityValue =
                    typeof node.podCapacity === 'number' && Number.isFinite(node.podCapacity)
                      ? node.podCapacity.toString()
                      : '—';
                  const podIpLine = (() => {
                    const allocated =
                      typeof node.podIPsAllocated === 'number' && Number.isFinite(node.podIPsAllocated)
                        ? node.podIPsAllocated
                        : undefined;
                    const capacity =
                      typeof node.podIPsCapacity === 'number' && Number.isFinite(node.podIPsCapacity)
                        ? node.podIPsCapacity
                        : undefined;
                    if (allocated !== undefined && capacity !== undefined) {
                      return `${allocated}/${capacity}`;
                    }
                    if (allocated !== undefined) {
                      return `${allocated}/?`;
                    }
                    if (capacity !== undefined) {
                      return `?/${capacity}`;
                    }
                    return '—';
                  })();

                  const expanded = () => isExpanded(node.name);
                  const isSelected = () => props.selectedNode === node.name;

                  return (
                    <>
                      <tr
                        class={`cursor-pointer hover:bg-base-300/30 ${isSelected() ? 'bg-primary/20 border-l-4 border-primary' : ''}`}
                        onClick={() => props.onSelect?.(node)}
                      >
                        <td class="w-8 text-center">
                          <button
                            type="button"
                            class={`transition-transform inline-block hover:text-primary ${expanded() ? 'rotate-90' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleNode(node.name);
                            }}
                          >
                            ▶
                          </button>
                        </td>
                        <td class="font-mono text-sm">{node.name}</td>
                        <td class="text-xs">
                          <span class={`badge badge-sm ${statusBadgeClass(node.status)}`}>{node.status || 'Unknown'}</span>
                        </td>
                        <td class="text-xs">
                          <div class="flex flex-wrap gap-1">
                            <Show when={node.roles.length} fallback={<span class="opacity-60">—</span>}>
                              <For each={node.roles}>
                                {(role) => <span class="badge badge-outline badge-xs uppercase">{role}</span>}
                              </For>
                            </Show>
                          </div>
                        </td>
                        <td class="text-xs opacity-80">{node.nodePool ?? '—'}</td>
                        <td class="text-xs opacity-80">{node.kubeletVersion ?? '—'}</td>
                        <td class="text-xs opacity-80">
                          <div class="flex flex-col leading-tight gap-0.5">
                            <span>
                              <span class="opacity-60 uppercase mr-1">Use</span>
                              {cpuUsageLine}
                            </span>
                            <span class="opacity-60">
                              <span class="uppercase mr-1">Alloc</span>
                              {cpuAllocLine}
                            </span>
                            <Show when={node.cpuRequests}>
                              <span class="opacity-60">
                                <span class="uppercase mr-1">Req</span>
                                {cpuRequestLine}
                              </span>
                            </Show>
                          </div>
                        </td>
                        <td class="text-xs opacity-80">
                          <div class="flex flex-col leading-tight gap-0.5">
                            <span>
                              <span class="opacity-60 uppercase mr-1">Use</span>
                              {memoryUsageLine}
                            </span>
                            <span class="opacity-60">
                              <span class="uppercase mr-1">Alloc</span>
                              {memoryAllocLine}
                            </span>
                            <Show when={node.memoryRequests}>
                              <span class="opacity-60">
                                <span class="uppercase mr-1">Req</span>
                                {memoryRequestLine}
                              </span>
                            </Show>
                          </div>
                        </td>
                        <td class="text-xs opacity-80">
                          <div class="flex flex-col leading-tight gap-0.5">
                            <span>
                              <span class="opacity-60 uppercase mr-1">Use</span>
                              {podUsageLine}
                            </span>
                            <span class="opacity-60">
                              <span class="uppercase mr-1">Cap</span>
                              {podCapacityValue}
                            </span>
                          </div>
                        </td>
                        <td class="text-xs">
                          <Show
                            when={node.totalRestarts > 0}
                            fallback={<span class="opacity-80">0</span>}
                          >
                            <span class={`badge badge-sm ${node.totalRestarts >= 10 ? 'badge-error' : 'badge-warning'}`}>
                              {node.totalRestarts}
                            </span>
                          </Show>
                        </td>
                        <td class="text-xs opacity-80">
                          {podIpLine}
                        </td>
                        <td class="text-xs opacity-80">{formatRelativeTime(node.creationTimestamp)}</td>
                        <td class="text-xs opacity-80 font-mono">{node.internalIP ?? '—'}</td>
                      </tr>
                      <Show when={expanded() && node.pods.length > 0}>
                        <tr class="bg-base-300/20">
                          <td colSpan={13} class="p-0">
                            <div class="overflow-x-auto">
                              <table class="table table-xs w-full">
                                <thead>
                                  <tr class="text-xs uppercase tracking-wide text-base-content/50">
                                    <th class="pl-10">Pod</th>
                                    <th>Namespace</th>
                                    <th>Restarts</th>
                                    <th>CPU Requests</th>
                                    <th>CPU Usage</th>
                                    <th>Memory Requests</th>
                                    <th>Memory Usage</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  <For each={node.pods}>
                                    {(pod) => (
                                      <tr class="hover:bg-base-300/30">
                                        <td class="pl-10 font-mono text-xs">{pod.name}</td>
                                        <td class="text-xs opacity-80">{pod.namespace}</td>
                                        <td class="text-xs">
                                          <Show
                                            when={pod.restartCount > 0}
                                            fallback={<span class="opacity-80">0</span>}
                                          >
                                            <span class={pod.restartCount >= 10 ? 'text-error font-semibold' : 'text-warning'}>
                                              {pod.restartCount}
                                            </span>
                                          </Show>
                                        </td>
                                        <td class="text-xs opacity-80 font-mono">{pod.cpuRequests ?? '—'}</td>
                                        <td class="text-xs opacity-80 font-mono">{pod.cpuUsage ?? '—'}</td>
                                        <td class="text-xs opacity-80 font-mono">{pod.memoryRequests ?? '—'}</td>
                                        <td class="text-xs opacity-80 font-mono">{pod.memoryUsage ?? '—'}</td>
                                      </tr>
                                    )}
                                  </For>
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      </Show>
                      <Show when={expanded() && node.blockers && node.blockers.length > 0}>
                        <tr class="bg-warning/10">
                          <td colSpan={13} class="p-2 pl-10">
                            <div class="text-xs">
                              <span class="font-semibold uppercase tracking-wide">Blockers:</span>
                              <For each={node.blockers}>
                                {(blocker) => {
                                  const podLabel = () => {
                                    if (blocker.namespace && blocker.podName) {
                                      return `${blocker.namespace}/${blocker.podName}`;
                                    }
                                    if (blocker.podName) {
                                      return blocker.podName;
                                    }
                                    return 'Node pool';
                                  };
                                  return (
                                    <div class="ml-2">
                                      <span class="font-mono">{podLabel()}</span>
                                      <span class="ml-1 opacity-80">{blocker.reasons.join(', ')}</span>
                                    </div>
                                  );
                                }}
                              </For>
                            </div>
                          </td>
                        </tr>
                      </Show>
                    </>
                  );
                }}
              </For>
            </Show>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default NodeTable;
