import { createSignal, Show } from 'solid-js';

interface ScaleDialogProps {
  open: boolean;
  resourceName: string;
  resourceKind?: string;
  currentReplicas: number;
  onClose: () => void;
  onScale: (replicas: number) => Promise<void>;
}

const ScaleDialog = (props: ScaleDialogProps) => {
  const [replicas, setReplicas] = createSignal(props.currentReplicas);
  const [scaling, setScaling] = createSignal(false);
  const kind = () => props.resourceKind ?? 'Workload';

  const handleScale = async () => {
    setScaling(true);
    try {
      await props.onScale(replicas());
      props.onClose();
    } catch (error) {
      console.error('Scale failed:', error);
    } finally {
      setScaling(false);
    }
  };

  // Reset replicas when dialog opens
  const updateReplicas = () => {
    if (props.open) {
      setReplicas(props.currentReplicas);
    }
  };

  // Watch for dialog opening
  createSignal(() => {
    updateReplicas();
  });

  return (
    <Show when={props.open}>
      <div class="modal modal-open">
        <div class="modal-box">
          <h3 class="font-bold text-lg">Scale {kind()}</h3>
          <p class="py-2 text-sm opacity-70">
            Scale {kind().toLowerCase()} <strong>{props.resourceName}</strong>
          </p>
          <div class="form-control">
            <label class="label">
              <span class="label-text">Replicas</span>
              <span class="label-text-alt text-xs opacity-60">Current: {props.currentReplicas}</span>
            </label>
            <input
              type="number"
              min="0"
              class="input input-bordered"
              value={replicas()}
              onInput={(e) => setReplicas(parseInt(e.currentTarget.value) || 0)}
              disabled={scaling()}
            />
          </div>
          <div class="modal-action">
            <button
              type="button"
              class="btn btn-ghost"
              onClick={() => props.onClose()}
              disabled={scaling()}
            >
              Cancel
            </button>
            <button
              type="button"
              class="btn btn-primary"
              onClick={handleScale}
              disabled={scaling() || replicas() < 0}
            >
              <Show when={scaling()}>
                <span class="loading loading-spinner loading-xs" />
              </Show>
              Scale
            </button>
          </div>
        </div>
        <div class="modal-backdrop" onClick={() => props.onClose()} />
      </div>
    </Show>
  );
};

export default ScaleDialog;
