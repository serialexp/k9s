import { createSignal, For, Show } from 'solid-js';
import type { PodListItem } from '../lib/api';
import { formatRelativeTime } from '../utils/datetime';
import { formatResourceLine } from '../utils/resources';
import { portForwardStore } from '../stores/portForwardStore';

const generateMarkdownTable = (pods: PodListItem[]): string => {
  const headers = ['Name', 'Namespace', 'Status', 'Usage', 'Requests', 'Age'];
  const separator = headers.map(() => '---');

  const rows = pods.map((pod) => {
    const status = pod.restarts > 0 ? `${pod.phase ?? 'Unknown'} (${pod.restarts} restarts)` : (pod.phase ?? 'Unknown');
    const usage = formatResourceLine(pod.cpuUsage, pod.memoryUsage);
    const requests = formatResourceLine(pod.cpuRequests, pod.memoryRequests);
    const age = formatRelativeTime(pod.creationTimestamp);

    return [pod.name, pod.namespace, status, usage, requests, age];
  });

  const lines = [
    `| ${headers.join(' | ')} |`,
    `| ${separator.join(' | ')} |`,
    ...rows.map((row) => `| ${row.join(' | ')} |`),
  ];

  return lines.join('\n');
};

interface PodTableProps {
  pods: PodListItem[];
  selectedPod?: string;
  loading?: boolean;
  onSelect?: (pod: PodListItem) => void;
}

const phaseBadgeClass = (phase?: string) => {
  switch (phase) {
    case 'Running':
      return 'badge-success';
    case 'Pending':
      return 'badge-warning';
    case 'Failed':
      return 'badge-error';
    case 'Succeeded':
      return 'badge-info';
    default:
      return 'badge-ghost';
  }
};

const PodTable = (props: PodTableProps) => {
  const [copied, setCopied] = createSignal(false);

  const handleCopy = async () => {
    const markdown = generateMarkdownTable(props.pods);
    await navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
  <div class="flex flex-col gap-3">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-semibold">Pods</h2>
      <div class="flex items-center gap-2">
        <Show when={props.pods.length > 0}>
          <button
            type="button"
            class="btn btn-ghost btn-xs"
            onClick={handleCopy}
            title="Copy table as markdown"
          >
            <Show when={copied()} fallback={
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            }>
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
            </Show>
          </button>
        </Show>
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
            <th>Namespace</th>
            <th>Status</th>
            <th>Resources</th>
            <th>Age</th>
          </tr>
        </thead>
        <tbody>
          <Show
            when={props.pods.length}
            fallback={
              <tr>
                <td colSpan={5} class="text-center text-sm opacity-70">
                  No pods in this namespace.
                </td>
              </tr>
            }
          >
            <For each={props.pods}>
              {(pod) => (
                <tr
                  class={`cursor-pointer hover:bg-base-200/50 ${props.selectedPod === pod.name ? 'bg-primary/20 border-l-4 border-primary' : ''}`}
                  onClick={() => props.onSelect?.(pod)}
                >
                  <td class="font-mono text-sm">
                    <div class="flex items-center gap-1">
                      {pod.name}
                      <Show when={portForwardStore.hasForwardForPod(pod.namespace, pod.name)}>
                        <span class="badge badge-xs badge-primary" title="Port forward active">
                          <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                        </span>
                      </Show>
                    </div>
                  </td>
                  <td class="text-xs opacity-80">{pod.namespace}</td>
                  <td class="flex items-center gap-1">
                    <span class={`badge badge-sm ${phaseBadgeClass(pod.phase)}`}>{pod.phase ?? 'Unknown'}</span>
                    <Show when={pod.restarts > 0}>
                      <span class="badge badge-outline badge-xs">{pod.restarts}</span>
                    </Show>
                  </td>
                  <td class="text-xs opacity-80">
                    <div class="flex flex-col leading-tight">
                      <span>{formatResourceLine(pod.cpuUsage, pod.memoryUsage)}</span>
                      <span class="opacity-60">{formatResourceLine(pod.cpuRequests, pod.memoryRequests)}</span>
                    </div>
                  </td>
                  <td class="text-xs opacity-80">{formatRelativeTime(pod.creationTimestamp)}</td>
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

export default PodTable;
