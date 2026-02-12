// ABOUTME: Displays a table of Kubernetes PodDisruptionBudgets with health metrics
// ABOUTME: Supports selection highlighting and click handlers
import { createSignal, For, Show } from 'solid-js';
import type { PdbListItem } from '../lib/api';
import { formatRelativeTime } from '../utils/datetime';

interface PdbTableProps {
  pdbs: PdbListItem[];
  selectedPdb?: string;
  loading?: boolean;
  onSelect?: (pdb: PdbListItem) => void;
}

const PdbTable = (props: PdbTableProps) => {
  const [search, setSearch] = createSignal('');
  const filtered = () => {
    const query = search().toLowerCase().trim();
    if (!query) return props.pdbs;
    return props.pdbs.filter((p) =>
      p.name.toLowerCase().includes(query)
    );
  };
  return (
  <div class="flex flex-col gap-3">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-semibold">PodDisruptionBudgets</h2>
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
            <th>Min/Max</th>
            <th>Healthy</th>
            <th>Allowed</th>
            <th>Age</th>
          </tr>
        </thead>
        <tbody>
          <Show
            when={filtered().length}
            fallback={
              <tr>
                <td colSpan={5} class="text-center text-sm opacity-70">
                  {search() ? 'No PodDisruptionBudgets match the filter.' : 'No PodDisruptionBudgets in this namespace.'}
                </td>
              </tr>
            }
          >
            <For each={filtered()}>
              {(pdb) => (
                <tr
                  class={`cursor-pointer hover:bg-base-200/50 ${props.selectedPdb === pdb.name ? 'bg-primary/20 border-l-4 border-primary' : ''}`}
                  onClick={() => props.onSelect?.(pdb)}
                >
                  <td class="font-mono text-sm">{pdb.name}</td>
                  <td class="text-xs opacity-80">
                    {pdb.minAvailable != null ? `min: ${pdb.minAvailable}` : ''}
                    {pdb.maxUnavailable != null ? `max: ${pdb.maxUnavailable}` : ''}
                  </td>
                  <td class="text-xs opacity-80">
                    <span class={pdb.currentHealthy !== undefined && pdb.desiredHealthy !== undefined && pdb.currentHealthy >= pdb.desiredHealthy ? 'text-success' : 'text-warning'}>
                      {pdb.currentHealthy ?? '—'}
                    </span>
                    /{pdb.desiredHealthy ?? '—'}
                  </td>
                  <td class="text-xs opacity-80">
                    <span class={pdb.disruptionsAllowed === 0 ? 'text-error font-semibold' : ''}>
                      {pdb.disruptionsAllowed ?? '—'}
                    </span>
                  </td>
                  <td class="text-xs opacity-80">{formatRelativeTime(pdb.creationTimestamp)}</td>
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

export default PdbTable;
