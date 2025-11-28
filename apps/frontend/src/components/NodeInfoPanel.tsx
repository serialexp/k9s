// ABOUTME: Info panel component displaying detailed Kubernetes node information
// ABOUTME: Shows metadata, resources, conditions, taints, labels and annotations

import { For, Show } from 'solid-js';
import type { NodeDetail } from '../lib/api';
import { formatRelativeTime } from '../utils/datetime';

interface NodeInfoPanelProps {
  node?: NodeDetail;
  loading?: boolean;
}

const conditionBadgeClass = (type: string, status: string) => {
  const isPressureCondition = type.endsWith('Pressure');
  const isHealthy = isPressureCondition ? status === 'False' : status === 'True';

  if (status === 'Unknown') return 'badge-warning';
  return isHealthy ? 'badge-success' : 'badge-error';
};

const NodeInfoPanel = (props: NodeInfoPanelProps) => (
  <Show
    when={props.node}
    fallback={
      props.loading ? (
        <div class="flex h-48 items-center justify-center">
          <span class="loading loading-dots" />
        </div>
      ) : (
        <p class="text-sm opacity-60">Select a node to inspect its details.</p>
      )
    }
  >
    {(node) => (
      <div class="flex flex-col gap-6">
        <div class="grid gap-3 lg:grid-cols-2">
          <div class="card bg-base-200/60">
            <div class="card-body gap-3 text-sm">
              <h3 class="text-xs uppercase tracking-wide opacity-80">Metadata</h3>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Status</span>
                <span class={`badge badge-sm ${node().status === 'Ready' ? 'badge-success' : 'badge-error'}`}>
                  {node().status}
                </span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Node Pool</span>
                <span class="font-mono text-xs">{node().nodePool ?? '—'}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Instance Type</span>
                <span class="font-mono text-xs">{node().instanceType ?? '—'}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Architecture</span>
                <span class="font-mono text-xs">{node().architecture ?? '—'}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Age</span>
                <span>{formatRelativeTime(node().creationTimestamp)}</span>
              </div>
              <Show when={node().providerID}>
                <div class="flex items-center justify-between gap-3">
                  <span class="opacity-70">Provider ID</span>
                  <span class="font-mono text-xs truncate max-w-[200px]" title={node().providerID}>
                    {node().providerID}
                  </span>
                </div>
              </Show>
            </div>
          </div>

          <div class="card bg-base-200/60">
            <div class="card-body gap-3 text-sm">
              <h3 class="text-xs uppercase tracking-wide opacity-80">Resources</h3>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">CPU</span>
                <span class="font-mono text-xs">
                  {node().cpuUsage ?? '—'} / {node().cpuAllocatable ?? '—'} / {node().cpuCapacity ?? '—'}
                </span>
              </div>
              <div class="text-[10px] opacity-50 text-right -mt-2">usage / allocatable / capacity</div>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Memory</span>
                <span class="font-mono text-xs">
                  {node().memoryUsage ?? '—'} / {node().memoryAllocatable ?? '—'} / {node().memoryCapacity ?? '—'}
                </span>
              </div>
              <div class="text-[10px] opacity-50 text-right -mt-2">usage / allocatable / capacity</div>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Pods</span>
                <span class="font-mono text-xs">
                  {node().podCount ?? 0} / {node().podAllocatable ?? '—'} / {node().podCapacity ?? '—'}
                </span>
              </div>
              <div class="text-[10px] opacity-50 text-right -mt-2">running / allocatable / capacity</div>
              <Show when={node().podCIDR}>
                <div class="flex items-center justify-between gap-3">
                  <span class="opacity-70">Pod CIDR</span>
                  <span class="font-mono text-xs">{node().podCIDR}</span>
                </div>
              </Show>
            </div>
          </div>
        </div>

        <div class="card bg-base-200/60">
          <div class="card-body gap-3">
            <h3 class="text-xs uppercase tracking-wide opacity-80">Conditions</h3>
            <div class="overflow-x-auto">
              <table class="table table-sm">
                <thead>
                  <tr class="text-xs uppercase tracking-wide opacity-70">
                    <th>Type</th>
                    <th>Status</th>
                    <th>Reason</th>
                    <th>Message</th>
                    <th>Last Transition</th>
                  </tr>
                </thead>
                <tbody>
                  <For each={node().conditions}>
                    {(condition) => (
                      <tr>
                        <td class="font-mono text-xs">{condition.type}</td>
                        <td>
                          <span class={`badge badge-xs ${conditionBadgeClass(condition.type, condition.status)}`}>
                            {condition.status}
                          </span>
                        </td>
                        <td class="text-xs opacity-80">{condition.reason ?? '—'}</td>
                        <td class="text-xs opacity-70 max-w-xs truncate" title={condition.message}>
                          {condition.message ?? '—'}
                        </td>
                        <td class="text-xs opacity-70">
                          {condition.lastTransitionTime ? formatRelativeTime(condition.lastTransitionTime) : '—'}
                        </td>
                      </tr>
                    )}
                  </For>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="card bg-base-200/60">
          <div class="card-body gap-3 text-sm">
            <h3 class="text-xs uppercase tracking-wide opacity-80">System Info</h3>
            <div class="grid gap-3 lg:grid-cols-2">
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">OS Image</span>
                <span class="font-mono text-xs">{node().nodeInfo.osImage ?? '—'}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Kernel</span>
                <span class="font-mono text-xs">{node().nodeInfo.kernelVersion ?? '—'}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Container Runtime</span>
                <span class="font-mono text-xs">{node().nodeInfo.containerRuntimeVersion ?? '—'}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Kubelet Version</span>
                <span class="font-mono text-xs">{node().nodeInfo.kubeletVersion ?? '—'}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Operating System</span>
                <span class="font-mono text-xs">{node().nodeInfo.operatingSystem ?? '—'}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Architecture</span>
                <span class="font-mono text-xs">{node().nodeInfo.architecture ?? '—'}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="card bg-base-200/60">
          <div class="card-body gap-3">
            <h3 class="text-xs uppercase tracking-wide opacity-80">Addresses</h3>
            <Show when={node().addresses.length} fallback={<p class="text-sm opacity-60">No addresses available.</p>}>
              <div class="overflow-x-auto">
                <table class="table table-sm">
                  <thead>
                    <tr class="text-xs uppercase tracking-wide opacity-70">
                      <th>Type</th>
                      <th>Address</th>
                    </tr>
                  </thead>
                  <tbody>
                    <For each={node().addresses}>
                      {(addr) => (
                        <tr>
                          <td class="text-xs">{addr.type}</td>
                          <td class="font-mono text-xs">{addr.address}</td>
                        </tr>
                      )}
                    </For>
                  </tbody>
                </table>
              </div>
            </Show>
          </div>
        </div>

        <Show when={node().taints.length > 0}>
          <div class="card bg-base-200/60">
            <div class="card-body gap-3">
              <h3 class="text-xs uppercase tracking-wide opacity-80">Taints</h3>
              <div class="flex flex-wrap gap-2">
                <For each={node().taints}>
                  {(taint) => (
                    <span class="badge badge-outline badge-sm font-mono">
                      {taint.key}={taint.value ?? ''}:{taint.effect}
                    </span>
                  )}
                </For>
              </div>
            </div>
          </div>
        </Show>

        <div class="card bg-base-200/60">
          <div class="card-body gap-3">
            <h3 class="text-xs uppercase tracking-wide opacity-80">Labels</h3>
            <Show when={Object.keys(node().labels).length} fallback={<p class="text-sm opacity-60">No labels applied.</p>}>
              <div class="flex flex-wrap gap-2">
                <For each={Object.entries(node().labels)}>
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
            <Show when={Object.keys(node().annotations).length} fallback={<p class="text-sm opacity-60">No annotations set.</p>}>
              <div class="flex flex-col gap-2">
                <For each={Object.entries(node().annotations)}>
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

export default NodeInfoPanel;
