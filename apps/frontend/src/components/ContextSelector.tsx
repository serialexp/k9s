import { type ContextInfo } from '../lib/api';
import { For, Show } from 'solid-js';

interface ContextSelectorProps {
  contexts: ContextInfo[];
  value?: string;
  loading?: boolean;
  onSelect?: (name: string) => void;
}

const ContextSelector = (props: ContextSelectorProps) => {
  const handleChange = (event: Event) => {
    const target = event.target as HTMLSelectElement;
    props.onSelect?.(target.value);
  };

  return (
    <label class="form-control w-full max-w-xs">
      <div class="label">
        <span class="label-text text-sm uppercase tracking-wide">Context</span>
        <Show when={props.loading}>
          <span class="loading loading-xs loading-spinner" />
        </Show>
      </div>
      <select
        class="select select-sm select-bordered"
        value={props.value || ''}
        onChange={handleChange}
      >
        <For each={props.contexts}>
          {(ctx) => (
            <option value={ctx.name}>
              {ctx.name}
              {ctx.namespace ? ` (${ctx.namespace})` : ''}
            </option>
          )}
        </For>
      </select>
    </label>
  );
};

export default ContextSelector;
