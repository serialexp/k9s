import { For, Show, createSignal } from 'solid-js';

export interface ResourceAction {
  label: string;
  onClick: () => void | Promise<void>;
  variant?: 'primary' | 'secondary' | 'error' | 'warning';
  icon?: string;
  confirm?: {
    title: string;
    message: string;
  };
}

interface ResourceActionsProps {
  actions: ResourceAction[];
  disabled?: boolean;
}

const ResourceActions = (props: ResourceActionsProps) => {
  const [confirmAction, setConfirmAction] = createSignal<ResourceAction | null>(null);
  const [actionInProgress, setActionInProgress] = createSignal<string | null>(null);

  const handleActionClick = async (action: ResourceAction) => {
    if (action.confirm) {
      setConfirmAction(action);
    } else {
      await executeAction(action);
    }
  };

  const executeAction = async (action: ResourceAction) => {
    setActionInProgress(action.label);
    try {
      await action.onClick();
    } catch (error) {
      console.error(`Action "${action.label}" failed:`, error);
    } finally {
      setActionInProgress(null);
      setConfirmAction(null);
    }
  };

  const getButtonClass = (variant?: string) => {
    switch (variant) {
      case 'error':
        return 'btn-error';
      case 'warning':
        return 'btn-warning';
      case 'primary':
        return 'btn-primary';
      case 'secondary':
        return 'btn-secondary';
      default:
        return 'btn-ghost';
    }
  };

  return (
    <>
      <div class="flex items-center gap-2">
        <For each={props.actions}>
          {(action) => (
            <button
              type="button"
              class={`btn btn-sm ${getButtonClass(action.variant)}`}
              onClick={() => handleActionClick(action)}
              disabled={props.disabled || actionInProgress() !== null}
            >
              <Show when={actionInProgress() === action.label}>
                <span class="loading loading-spinner loading-xs" />
              </Show>
              <Show when={action.icon}>
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={action.icon} />
                </svg>
              </Show>
              {action.label}
            </button>
          )}
        </For>
      </div>

      {/* Confirmation Modal */}
      <Show when={confirmAction()}>
        {(action) => (
          <div class="modal modal-open">
            <div class="modal-box">
              <h3 class="font-bold text-lg">{action().confirm!.title}</h3>
              <p class="py-4">{action().confirm!.message}</p>
              <div class="modal-action">
                <button
                  type="button"
                  class="btn btn-ghost"
                  onClick={() => setConfirmAction(null)}
                  disabled={actionInProgress() !== null}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  class={`btn ${getButtonClass(action().variant)}`}
                  onClick={() => executeAction(action())}
                  disabled={actionInProgress() !== null}
                >
                  <Show when={actionInProgress() !== null}>
                    <span class="loading loading-spinner loading-xs" />
                  </Show>
                  Confirm
                </button>
              </div>
            </div>
            <div class="modal-backdrop" onClick={() => setConfirmAction(null)} />
          </div>
        )}
      </Show>
    </>
  );
};

export default ResourceActions;
