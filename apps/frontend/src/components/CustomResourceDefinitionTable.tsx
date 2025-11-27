import { For, Show } from 'solid-js';
import type { CustomResourceDefinitionListItem } from '../lib/api';
import { formatRelativeTime } from '../utils/datetime';

interface CustomResourceDefinitionTableProps {
  crds: CustomResourceDefinitionListItem[];
  selectedCrd?: string;
  loading?: boolean;
  onSelect?: (crd: CustomResourceDefinitionListItem) => void;
}

const getEstablishedBadge = (established: boolean, terminating: boolean) => {
  if (terminating) return 'badge-warning';
  return established ? 'badge-success' : 'badge-error';
};

const CustomResourceDefinitionTable = (props: CustomResourceDefinitionTableProps) => (
  <div class="flex flex-col gap-3">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-semibold">Custom Resource Definitions</h2>
      <Show when={props.loading}>
        <span class="loading loading-xs loading-spinner" />
      </Show>
    </div>
    <div class="overflow-x-auto rounded-lg border border-base-200/50 bg-base-200/30">
      <table class="table table-zebra table-pin-rows">
        <thead>
          <tr class="text-sm uppercase tracking-wide text-base-content/60">
            <th>Name</th>
            <th>Group / Version</th>
            <th>Kind</th>
            <th>Scope</th>
            <th>Status</th>
            <th>Age</th>
          </tr>
        </thead>
        <tbody>
          <Show
            when={props.crds.length}
            fallback={
              <tr>
                <td colSpan={6} class="text-center text-sm opacity-70">
                  No custom resource definitions found.
                </td>
              </tr>
            }
          >
            <For each={props.crds}>
              {(crd) => (
                <tr
                  class={`cursor-pointer hover:bg-base-200/50 ${props.selectedCrd === crd.name ? 'bg-primary/20 border-l-4 border-primary' : ''}`}
                  onClick={() => props.onSelect?.(crd)}
                >
                  <td class="font-mono text-sm">{crd.name}</td>
                  <td class="text-xs opacity-80">
                    {crd.group}/{crd.version}
                  </td>
                  <td class="text-xs opacity-80">{crd.kind}</td>
                  <td class="text-xs uppercase opacity-80">{crd.scope}</td>
                  <td>
                    <span class={`badge badge-sm ${getEstablishedBadge(crd.established, crd.terminating)}`}>
                      {crd.terminating ? 'Terminating' : crd.established ? 'Established' : 'Unestablished'}
                    </span>
                  </td>
                  <td class="text-xs opacity-80">{formatRelativeTime(crd.creationTimestamp)}</td>
                </tr>
              )}
            </For>
          </Show>
        </tbody>
      </table>
    </div>
  </div>
);

export default CustomResourceDefinitionTable;
