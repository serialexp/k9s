import { createSignal, For, Show } from 'solid-js';
import type { ServiceAccountListItem } from '../lib/api';
import { formatRelativeTime } from '../utils/datetime';

interface ServiceAccountTableProps {
  serviceAccounts: ServiceAccountListItem[];
  selectedServiceAccount?: string;
  loading?: boolean;
  onSelect?: (serviceAccount: ServiceAccountListItem) => void;
}

const ServiceAccountTable = (props: ServiceAccountTableProps) => {
  const [search, setSearch] = createSignal('');
  const filtered = () => {
    const query = search().toLowerCase().trim();
    if (!query) return props.serviceAccounts;
    return props.serviceAccounts.filter((sa) =>
      sa.name.toLowerCase().includes(query)
    );
  };
  return (
  <div class="flex flex-col gap-3">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-semibold">Service Accounts</h2>
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
            <th>Namespace</th>
            <th>Secrets</th>
            <th>Image Pull Secrets</th>
            <th>Age</th>
          </tr>
        </thead>
        <tbody>
          <Show
            when={filtered().length}
            fallback={
              <tr>
                <td colSpan={5} class="text-center text-sm opacity-70">
                  {search() ? 'No service accounts match the filter.' : 'No service accounts in this namespace.'}
                </td>
              </tr>
            }
          >
            <For each={filtered()}>
              {(serviceAccount) => (
                <tr
                  class={`cursor-pointer hover:bg-base-200/50 ${props.selectedServiceAccount === serviceAccount.name ? 'bg-primary/20 border-l-4 border-primary' : ''}`}
                  onClick={() => props.onSelect?.(serviceAccount)}
                >
                  <td class="font-mono text-sm">{serviceAccount.name}</td>
                  <td class="text-xs opacity-80">{serviceAccount.namespace}</td>
                  <td class="text-sm">{serviceAccount.secretCount}</td>
                  <td class="text-sm">{serviceAccount.imagePullSecretCount}</td>
                  <td class="text-xs opacity-80">{formatRelativeTime(serviceAccount.creationTimestamp)}</td>
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

export default ServiceAccountTable;
