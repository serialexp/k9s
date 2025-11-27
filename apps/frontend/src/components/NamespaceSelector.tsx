import { For, Show } from 'solid-js';

interface NamespaceSelectorProps {
  namespaces: string[];
  value?: string;
  loading?: boolean;
  onSelect?: (namespace: string) => void;
}

const NamespaceSelector = (props: NamespaceSelectorProps) => (
  <div class="flex flex-col gap-3">
    <div class="flex items-center gap-3">
      <h2 class="text-lg font-semibold">Namespaces</h2>
      <Show when={props.loading}>
        <span class="loading loading-xs loading-spinner" />
      </Show>
    </div>
    <Show
      when={props.namespaces.length}
      fallback={<p class="text-sm opacity-60">No namespaces available.</p>}
    >
      <div class="flex flex-wrap gap-2">
        <For each={props.namespaces}>
          {(namespace) => (
            <button
              type="button"
              class={`btn btn-xs ${props.value === namespace ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => props.onSelect?.(namespace)}
            >
              {namespace}
            </button>
          )}
        </For>
      </div>
    </Show>
  </div>
);

export default NamespaceSelector;
