import { createSignal, For, Show } from 'solid-js';
import type { ExternalSecretListItem } from '../lib/api';
import { formatRelativeTime } from '../utils/datetime';

interface ExternalSecretTableProps {
  externalsecrets: ExternalSecretListItem[];
  selectedExternalSecret?: string;
  loading?: boolean;
  onSelect?: (externalsecret: ExternalSecretListItem) => void;
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

const ExternalSecretTable = (props: ExternalSecretTableProps) => {
  const [search, setSearch] = createSignal('');
  const filtered = () => {
    const query = search().toLowerCase().trim();
    if (!query) return props.externalsecrets;
    return props.externalsecrets.filter((es) =>
      es.name.toLowerCase().includes(query) ||
      es.secretName?.toLowerCase().includes(query) ||
      es.storeName?.toLowerCase().includes(query)
    );
  };
  return (
  <div class="flex flex-col gap-3">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-semibold">External Secrets</h2>
      <div class="flex items-center gap-2">
        <input
          type="text"
          placeholder="Filter by name or store..."
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
            <th>Secret</th>
            <th>Store</th>
            <th>Ready</th>
            <th>Synced</th>
            <th>Age</th>
          </tr>
        </thead>
        <tbody>
          <Show
            when={filtered().length}
            fallback={
              <tr>
                <td colSpan={6} class="text-center text-sm opacity-70">
                  {search() ? 'No external secrets match the filter.' : 'No external secrets in this namespace.'}
                </td>
              </tr>
            }
          >
            <For each={filtered()}>
              {(externalsecret) => (
                <tr
                  class={`cursor-pointer hover:bg-base-200/50 ${props.selectedExternalSecret === externalsecret.name ? 'bg-primary/20 border-l-4 border-primary' : ''}`}
                  onClick={() => props.onSelect?.(externalsecret)}
                >
                  <td class="font-mono text-sm">{externalsecret.name}</td>
                  <td class="text-xs opacity-80">{externalsecret.secretName ?? '—'}</td>
                  <td class="text-xs opacity-80">
                    {externalsecret.storeName
                      ? `${externalsecret.storeKind ?? 'Store'} / ${externalsecret.storeName}`
                      : '—'}
                  </td>
                  <td>
                    <span class={`badge badge-sm ${getReadyBadgeClass(externalsecret.readyStatus)}`}>
                      {externalsecret.readyStatus ?? 'Unknown'}
                    </span>
                  </td>
                  <td class="text-xs opacity-80">
                    {externalsecret.syncedAt ? formatRelativeTime(externalsecret.syncedAt) : '—'}
                  </td>
                  <td class="text-xs opacity-80">{formatRelativeTime(externalsecret.creationTimestamp)}</td>
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

export default ExternalSecretTable;
