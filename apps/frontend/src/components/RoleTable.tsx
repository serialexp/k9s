// ABOUTME: Displays a table of Kubernetes Roles with rule counts and metadata
// ABOUTME: Supports selection highlighting and click handlers
import { For, Show } from 'solid-js';
import type { RoleListItem } from '../lib/api';
import { formatRelativeTime } from '../utils/datetime';

interface RoleTableProps {
  roles: RoleListItem[];
  selectedRole?: string;
  loading?: boolean;
  onSelect?: (role: RoleListItem) => void;
}

const RoleTable = (props: RoleTableProps) => (
  <div class="flex flex-col gap-3">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-semibold">Roles</h2>
      <Show when={props.loading}>
        <span class="loading loading-xs loading-spinner" />
      </Show>
    </div>
    <div class="overflow-x-auto rounded-lg border border-base-200/50 bg-base-200/30">
      <table class="table table-zebra table-pin-rows">
        <thead>
          <tr class="text-sm uppercase tracking-wide text-base-content/60">
            <th>Name</th>
            <th>Rules</th>
            <th>Age</th>
          </tr>
        </thead>
        <tbody>
          <Show
            when={props.roles.length}
            fallback={
              <tr>
                <td colSpan={3} class="text-center text-sm opacity-70">
                  No Roles in this namespace.
                </td>
              </tr>
            }
          >
            <For each={props.roles}>
              {(role) => (
                <tr
                  class={`cursor-pointer hover:bg-base-200/50 ${props.selectedRole === role.name ? 'bg-primary/20 border-l-4 border-primary' : ''}`}
                  onClick={() => props.onSelect?.(role)}
                >
                  <td class="font-mono text-sm">{role.name}</td>
                  <td class="text-xs opacity-80">{role.ruleCount}</td>
                  <td class="text-xs opacity-80">{formatRelativeTime(role.creationTimestamp)}</td>
                </tr>
              )}
            </For>
          </Show>
        </tbody>
      </table>
    </div>
  </div>
);

export default RoleTable;
