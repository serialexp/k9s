import { createSignal, For, Show } from 'solid-js';
import type { SecretStoreListItem } from '../lib/api';
import { formatRelativeTime } from '../utils/datetime';

interface SecretStoreTableProps {
  secretstores: SecretStoreListItem[];
  selectedSecretStore?: string;
  loading?: boolean;
  onSelect?: (secretstore: SecretStoreListItem) => void;
}

const getReadyBadgeClass = (status?: string) => {
  switch ((status ?? '').toLowerCase()) {
    case 'true':
      return 'badge-success';
    case 'false':
      return 'badge-error';
    default:
      return 'badge-warning';
  }
};

const SecretStoreTable = (props: SecretStoreTableProps) => {
  const [search, setSearch] = createSignal('');
  const filtered = () => {
    const query = search().toLowerCase().trim();
    if (!query) return props.secretstores;
    return props.secretstores.filter((ss) =>
      ss.name.toLowerCase().includes(query) ||
      ss.providerType?.toLowerCase().includes(query)
    );
  };
  return (
  <div class="flex flex-col gap-3">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-semibold">Secret Stores</h2>
      <div class="flex items-center gap-2">
        <input
          type="text"
          placeholder="Filter by name or provider..."
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
            <th>Provider</th>
            <th>Ready</th>
            <th>Refresh</th>
            <th>Age</th>
          </tr>
        </thead>
        <tbody>
          <Show
            when={filtered().length}
            fallback={
              <tr>
                <td colSpan={5} class="text-center text-sm opacity-70">
                  {search() ? 'No secret stores match the filter.' : 'No secret stores in this namespace.'}
                </td>
              </tr>
            }
          >
            <For each={filtered()}>
              {(secretstore) => (
                <tr
                  class={`cursor-pointer hover:bg-base-200/50 ${props.selectedSecretStore === secretstore.name ? 'bg-primary/20 border-l-4 border-primary' : ''}`}
                  onClick={() => props.onSelect?.(secretstore)}
                >
                  <td class="font-mono text-sm">{secretstore.name}</td>
                  <td class="text-xs opacity-80">
                    {secretstore.providerType ?? '—'}
                  </td>
                  <td>
                    <span class={`badge badge-sm ${getReadyBadgeClass(secretstore.readyStatus)}`}>
                      {secretstore.readyStatus ?? 'Unknown'}
                    </span>
                  </td>
                  <td class="text-xs opacity-80">{secretstore.refreshInterval ?? '—'}</td>
                  <td class="text-xs opacity-80">{formatRelativeTime(secretstore.creationTimestamp)}</td>
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

export default SecretStoreTable;
