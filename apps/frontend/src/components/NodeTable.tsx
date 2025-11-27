import { For, Show } from 'solid-js';
import type { NodeListItem } from '../lib/api';
import { formatRelativeTime } from '../utils/datetime';
import { formatCpuQuantity, formatMemoryQuantity, formatResourceLine } from '../utils/resources';

interface NodeTableProps {
  nodes: NodeListItem[];
  loading?: boolean;
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

const NodeTable = (props: NodeTableProps) => (
  <div class="flex flex-col gap-3">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-semibold">Nodes</h2>
      <Show when={props.loading}>
        <span class="loading loading-xs loading-spinner" />
      </Show>
    </div>
    <div class="overflow-x-auto rounded-lg border border-base-200/50 bg-base-200/30">
      <table class="table table-zebra table-pin-rows">
        <thead>
          <tr class="text-sm uppercase tracking-wide text-base-content/60">
            <th>Name</th>
            <th>Status</th>
            <th>Roles</th>
            <th>Pool</th>
            <th>Version</th>
            <th>CPU</th>
            <th>Memory</th>
            <th>Pods</th>
            <th>Pod IPs</th>
            <th>Largest Pods</th>
            <th>Age</th>
            <th>Internal IP</th>
          </tr>
        </thead>
        <tbody>
          <Show
            when={props.nodes.length}
            fallback={
              <tr>
                <td colSpan={12} class="text-center text-sm opacity-70">
                  No nodes available.
                </td>
              </tr>
            }
          >
            <For each={props.nodes}>
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
                return (
                  <tr>
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
                    <td class="text-xs opacity-80">
                      {podIpLine}
                    </td>
                    <td class="text-xs opacity-80">
                      <Show when={node.largestPods.length} fallback={<span class="opacity-60">—</span>}>
                        <div class="flex flex-col gap-0.5">
                          <For each={node.largestPods}>
                            {(pod) => (
                              <div>
                                <span class="font-mono">{`${pod.namespace}/${pod.name}`}</span>
                                <Show when={pod.cpuRequests || pod.memoryRequests}>
                                  <span class="opacity-60 ml-1">
                                    {formatResourceLine(pod.cpuRequests, pod.memoryRequests)}
                                  </span>
                                </Show>
                              </div>
                            )}
                          </For>
                        </div>
                      </Show>
                      <Show when={node.blockers && node.blockers.length}>
                        <div class="mt-2 border-t border-base-300/40 pt-2 text-[11px] leading-snug opacity-70">
                          <div class="uppercase tracking-wide">Blockers</div>
                          <For each={node.blockers?.slice(0, 2) ?? []}>
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
                                <div>
                                  <span class="font-mono">{podLabel()}</span>
                                  <span class="ml-1">{blocker.reasons.join(', ')}</span>
                                </div>
                              );
                            }}
                          </For>
                          <Show when={(node.blockers?.length ?? 0) > 2}>
                            <div>+ {(node.blockers?.length ?? 0) - 2} more</div>
                          </Show>
                        </div>
                      </Show>
                    </td>
                    <td class="text-xs opacity-80">{formatRelativeTime(node.creationTimestamp)}</td>
                    <td class="text-xs opacity-80 font-mono">{node.internalIP ?? '—'}</td>
                  </tr>
                );
              }}
            </For>
          </Show>
        </tbody>
      </table>
    </div>
  </div>
);

export default NodeTable;
