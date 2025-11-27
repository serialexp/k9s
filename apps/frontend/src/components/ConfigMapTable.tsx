// ABOUTME: Displays a table of Kubernetes ConfigMaps with counts and metadata
// ABOUTME: Supports selection highlighting and click handlers
import { For, Show } from 'solid-js';
import type { ConfigMapListItem } from '../lib/api';
import { formatRelativeTime } from '../utils/datetime';

interface ConfigMapTableProps {
  configmaps: ConfigMapListItem[];
  selectedConfigMap?: string;
  loading?: boolean;
  onSelect?: (configmap: ConfigMapListItem) => void;
}

const ConfigMapTable = (props: ConfigMapTableProps) => (
  <div class="flex flex-col gap-3">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-semibold">ConfigMaps</h2>
      <Show when={props.loading}>
        <span class="loading loading-xs loading-spinner" />
      </Show>
    </div>
    <div class="overflow-x-auto rounded-lg border border-base-200/50 bg-base-200/30">
      <table class="table table-zebra table-pin-rows">
        <thead>
          <tr class="text-sm uppercase tracking-wide text-base-content/60">
            <th>Name</th>
            <th>Data Keys</th>
            <th>Binary Keys</th>
            <th>Age</th>
          </tr>
        </thead>
        <tbody>
          <Show
            when={props.configmaps.length}
            fallback={
              <tr>
                <td colSpan={4} class="text-center text-sm opacity-70">
                  No ConfigMaps in this namespace.
                </td>
              </tr>
            }
          >
            <For each={props.configmaps}>
              {(configmap) => (
                <tr
                  class={`cursor-pointer hover:bg-base-200/50 ${props.selectedConfigMap === configmap.name ? 'bg-primary/20 border-l-4 border-primary' : ''}`}
                  onClick={() => props.onSelect?.(configmap)}
                >
                  <td class="font-mono text-sm">{configmap.name}</td>
                  <td class="text-xs opacity-80">{configmap.dataCount}</td>
                  <td class="text-xs opacity-80">{configmap.binaryDataCount}</td>
                  <td class="text-xs opacity-80">{formatRelativeTime(configmap.creationTimestamp)}</td>
                </tr>
              )}
            </For>
          </Show>
        </tbody>
      </table>
    </div>
  </div>
);

export default ConfigMapTable;
