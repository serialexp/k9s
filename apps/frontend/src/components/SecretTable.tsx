// ABOUTME: Displays a table of Kubernetes Secrets with type and key counts
// ABOUTME: Supports selection highlighting and click handlers
import { For, Show } from 'solid-js';
import type { SecretListItem } from '../lib/api';
import { formatRelativeTime } from '../utils/datetime';

interface SecretTableProps {
  secrets: SecretListItem[];
  selectedSecret?: string;
  loading?: boolean;
  onSelect?: (secret: SecretListItem) => void;
}

const SecretTable = (props: SecretTableProps) => (
  <div class="flex flex-col gap-3">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-semibold">Secrets</h2>
      <Show when={props.loading}>
        <span class="loading loading-xs loading-spinner" />
      </Show>
    </div>
    <div class="overflow-x-auto rounded-lg border border-base-200/50 bg-base-200/30">
      <table class="table table-zebra table-pin-rows">
        <thead>
          <tr class="text-sm uppercase tracking-wide text-base-content/60">
            <th>Name</th>
            <th>Type</th>
            <th>Data Keys</th>
            <th>Age</th>
          </tr>
        </thead>
        <tbody>
          <Show
            when={props.secrets.length}
            fallback={
              <tr>
                <td colSpan={4} class="text-center text-sm opacity-70">
                  No Secrets in this namespace.
                </td>
              </tr>
            }
          >
            <For each={props.secrets}>
              {(secret) => (
                <tr
                  class={`cursor-pointer hover:bg-base-200/50 ${props.selectedSecret === secret.name ? 'bg-primary/20 border-l-4 border-primary' : ''}`}
                  onClick={() => props.onSelect?.(secret)}
                >
                  <td class="font-mono text-sm">{secret.name}</td>
                  <td class="text-xs opacity-80">{secret.type || '—'}</td>
                  <td class="text-xs opacity-80">{secret.dataCount}</td>
                  <td class="text-xs opacity-80">{formatRelativeTime(secret.creationTimestamp)}</td>
                </tr>
              )}
            </For>
          </Show>
        </tbody>
      </table>
    </div>
  </div>
);

export default SecretTable;
