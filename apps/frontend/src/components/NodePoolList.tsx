import { For, Show } from 'solid-js';
import type { NodePoolSummary } from '../lib/api';
import { formatPercent, formatCpuComparison, formatMemoryComparison } from '../utils/resources';

interface NodePoolListProps {
  pools: NodePoolSummary[];
  loading?: boolean;
}

const formatList = (values: string[]) => (values.length ? values.join(', ') : '—');

const formatPodRefs = (pods: Array<{ name: string; namespace: string }>, limit = 3) => {
  if (!pods.length) return '—';
  const display = pods.slice(0, limit).map((pod) => `${pod.namespace}/${pod.name}`);
  const remaining = pods.length - display.length;
  return remaining > 0 ? `${display.join(', ')} (+${remaining} more)` : display.join(', ');
};

const getUtilizationColor = (utilization?: number): string => {
  if (utilization === undefined || utilization === null) return 'bg-base-300/40';
  if (utilization > 1.0) return 'bg-error/20 border border-error/40';
  if (utilization < 0.60) return 'bg-warning/20 border border-warning/40';
  return 'bg-base-300/40';
};

const NodePoolList = (props: NodePoolListProps) => (
  <div class="flex flex-col gap-4">
    <Show when={props.loading && props.pools.length === 0}>
      <div class="flex justify-center py-10">
        <span class="loading loading-spinner loading-md" />
      </div>
    </Show>
    <Show when={props.pools.length > 0} fallback={!props.loading ? <p class="text-sm opacity-70">No node pools detected.</p> : null}>
      <div class="grid gap-4 lg:grid-cols-2">
        <For each={props.pools}>
          {(pool) => (
            <div class="card bg-base-200/40 border border-base-200/50">
              <div class="card-body gap-4">
                <div class="flex flex-col gap-1">
                  <div class="flex items-center justify-between gap-3">
                    <h3 class="card-title text-base">{pool.name}</h3>
                    <span class="badge badge-sm badge-outline">
                      {pool.nodeCount} node{pool.nodeCount === 1 ? '' : 's'}
                    </span>
                  </div>
                  <p class="text-xs opacity-70">
                    Zones: {formatList(pool.zones)}
                  </p>
                  <p class="text-xs opacity-70">
                    Instance Types: {formatList(pool.instanceTypes)}
                  </p>
                </div>

                <Show when={pool.instanceTypeRecommendation}>
                  <div class="alert alert-info text-xs py-2 px-3">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    <span>{pool.instanceTypeRecommendation}</span>
                  </div>
                </Show>

                <div class="flex flex-col gap-3">
                  <div class="grid gap-3 md:grid-cols-3">
                    <div class="rounded-lg bg-base-300/40 p-3 text-xs">
                      <div class="uppercase opacity-60">CPU Reserved</div>
                      <div class="font-mono text-sm">
                        {pool.cpuRequests ?? '—'} / {pool.cpuAllocatable ?? '—'}
                      </div>
                      <div class="opacity-60">Reserved: {formatPercent(pool.cpuUtilization)}</div>
                    </div>
                    <div class="rounded-lg bg-base-300/40 p-3 text-xs">
                      <div class="uppercase opacity-60">Memory Reserved</div>
                      <div class="font-mono text-sm">
                        {pool.memoryRequests ?? '—'} / {pool.memoryAllocatable ?? '—'}
                      </div>
                      <div class="opacity-60">Reserved: {formatPercent(pool.memoryUtilization)}</div>
                    </div>
                    <div class="rounded-lg bg-base-300/40 p-3 text-xs">
                      <div class="uppercase opacity-60">Pods</div>
                      <div class="font-mono text-sm">
                        {pool.podCount} / {pool.podCapacity}
                      </div>
                      <div class="opacity-60">Usage: {formatPercent(pool.podUtilization)}</div>
                    </div>
                  </div>
                  <div class="grid gap-3 md:grid-cols-3">
                    <div class={`rounded-lg p-3 text-xs ${getUtilizationColor(pool.cpuUsageUtilization)}`}>
                      <div class="uppercase opacity-60">CPU Used</div>
                      <div class="font-mono text-sm">
                        {formatCpuComparison(pool.cpuUsage, pool.cpuRequests)}
                      </div>
                      <div class="opacity-60">Used: {formatPercent(pool.cpuUsageUtilization)}</div>
                    </div>
                    <div class={`rounded-lg p-3 text-xs ${getUtilizationColor(pool.memoryUsageUtilization)}`}>
                      <div class="uppercase opacity-60">Memory Used</div>
                      <div class="font-mono text-sm">
                        {formatMemoryComparison(pool.memoryUsage, pool.memoryRequests)}
                      </div>
                      <div class="opacity-60">Used: {formatPercent(pool.memoryUsageUtilization)}</div>
                    </div>
                  </div>
                </div>

                <div class="rounded-lg border border-base-300/50 p-3">
                  <h4 class="text-xs font-semibold uppercase tracking-wide opacity-70">Scale Blockers</h4>
                  <Show when={pool.blockers.length} fallback={<p class="text-xs opacity-70 mt-1">No blockers detected.</p>}>
                    <div class="mt-2 flex flex-col gap-2 text-xs">
                      <For each={pool.blockers}>
                        {(blocker) => (
                          <div class="rounded border border-base-300/60 p-2">
                            <div class="font-semibold">{blocker.reason}</div>
                            <div class="opacity-70">Nodes: {formatList(blocker.nodes)}</div>
                            <div class="opacity-70">Pods: {formatPodRefs(blocker.pods)}</div>
                          </div>
                        )}
                      </For>
                    </div>
                  </Show>
                </div>
              </div>
            </div>
          )}
        </For>
      </div>
    </Show>
  </div>
);

export default NodePoolList;
