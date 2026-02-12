// ABOUTME: Displays a table of Kubernetes Roles with rule counts and metadata
// ABOUTME: Supports selection highlighting and click handlers
import { createSignal, For, Show } from 'solid-js';
import type { RoleListItem } from '../lib/api';
import { formatRelativeTime } from '../utils/datetime';

interface RoleTableProps {
  roles: RoleListItem[];
  selectedRole?: string;
  loading?: boolean;
  onSelect?: (role: RoleListItem) => void;
}

const RoleTable = (props: RoleTableProps) => {
  const [search, setSearch] = createSignal('');
  const filtered = () => {
    const query = search().toLowerCase().trim();
    if (!query) return props.roles;
    return props.roles.filter((r) =>
      r.name.toLowerCase().includes(query)
    );
  };
  return (
  <div class="flex flex-col gap-3">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-semibold">Roles</h2>
      <div class="flex items-center gap-2">
        <input
          type="text"
          placeholder="Filter by name..."
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
            <th>Name</th>
            <th>Rules</th>
            <th>Age</th>
          </tr>
        </thead>
        <tbody>
          <Show
            when={filtered().length}
            fallback={
              <tr>
                <td colSpan={3} class="text-center text-sm opacity-70">
                  {search() ? 'No Roles match the filter.' : 'No Roles in this namespace.'}
                </td>
              </tr>
            }
          >
            <For each={filtered()}>
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
};

export default RoleTable;
