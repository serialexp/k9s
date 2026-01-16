// ABOUTME: Dialog for creating a new Kubernetes namespace
// ABOUTME: Displays a modal with a text input for the namespace name
import { createSignal, Show } from 'solid-js';

interface CreateNamespaceDialogProps {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string) => Promise<void>;
}

const CreateNamespaceDialog = (props: CreateNamespaceDialogProps) => {
  const [name, setName] = createSignal('');
  const [creating, setCreating] = createSignal(false);
  const [error, setError] = createSignal('');

  const handleCreate = async () => {
    const trimmedName = name().trim();
    if (!trimmedName) {
      setError('Namespace name is required');
      return;
    }
    if (!/^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/.test(trimmedName)) {
      setError('Name must be lowercase alphanumeric, may contain hyphens, and must start/end with alphanumeric');
      return;
    }
    setCreating(true);
    setError('');
    try {
      await props.onCreate(trimmedName);
      setName('');
      props.onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create namespace');
    } finally {
      setCreating(false);
    }
  };

  const handleClose = () => {
    setName('');
    setError('');
    props.onClose();
  };

  return (
    <Show when={props.open}>
      <div class="modal modal-open">
        <div class="modal-box">
          <h3 class="font-bold text-lg">Create Namespace</h3>
          <div class="form-control mt-4">
            <label class="label">
              <span class="label-text">Namespace Name</span>
            </label>
            <input
              type="text"
              class="input input-bordered"
              placeholder="my-namespace"
              value={name()}
              onInput={(e) => {
                setName(e.currentTarget.value);
                setError('');
              }}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !creating()) {
                  handleCreate();
                }
              }}
              disabled={creating()}
              autofocus
            />
            <Show when={error()}>
              <label class="label">
                <span class="label-text-alt text-error">{error()}</span>
              </label>
            </Show>
          </div>
          <div class="modal-action">
            <button
              type="button"
              class="btn btn-ghost"
              onClick={handleClose}
              disabled={creating()}
            >
              Cancel
            </button>
            <button
              type="button"
              class="btn btn-primary"
              onClick={handleCreate}
              disabled={creating() || !name().trim()}
            >
              <Show when={creating()}>
                <span class="loading loading-spinner loading-xs" />
              </Show>
              Create
            </button>
          </div>
        </div>
        <div class="modal-backdrop" onClick={handleClose} />
      </div>
    </Show>
  );
};

export default CreateNamespaceDialog;
