import { createSignal, createEffect, For, Show, on } from 'solid-js';
import { Portal } from 'solid-js/web';
import { contextStore } from '../stores/contextStore';
import { deleteContext, checkContextStatus, type ContextStatus } from '../lib/api';

interface ContextManageDialogProps {
  open: boolean;
  onClose: () => void;
}

const ContextManageDialog = (props: ContextManageDialogProps) => {
  const [deleting, setDeleting] = createSignal<string>('');
  const [confirmName, setConfirmName] = createSignal<string>('');
  const [error, setError] = createSignal<string>('');
  const [statuses, setStatuses] = createSignal<Record<string, ContextStatus | 'loading'>>({});

  // Check all context statuses when the dialog opens
  createEffect(on(() => props.open, (open) => {
    if (!open) return;
    const contexts = contextStore.contexts();
    const initial: Record<string, 'loading'> = {};
    for (const ctx of contexts) {
      initial[ctx.name] = 'loading';
    }
    setStatuses(initial);

    // Check at most 4 contexts concurrently to avoid overwhelming the backend
    const queue = contexts.map((ctx) => ctx.name);
    const CONCURRENCY = 4;
    let running = 0;
    let index = 0;

    const runNext = () => {
      while (running < CONCURRENCY && index < queue.length) {
        const name = queue[index++];
        running++;
        checkContextStatus(name)
          .then((status) => {
            setStatuses((prev) => ({ ...prev, [name]: status }));
          })
          .catch(() => {
            setStatuses((prev) => ({ ...prev, [name]: { reachable: false, error: 'Check failed' } }));
          })
          .finally(() => {
            running--;
            runNext();
          });
      }
    };
    runNext();
  }));

  const handleDelete = async (name: string) => {
    setDeleting(name);
    setError('');
    try {
      await deleteContext(name);
      await contextStore.loadContexts();
      setConfirmName('');
      // Remove from statuses
      setStatuses((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    } catch (err) {
      setError(`Failed to delete context: ${(err as Error).message}`);
    } finally {
      setDeleting('');
    }
  };

  const handleClose = () => {
    setConfirmName('');
    setError('');
    props.onClose();
  };

  const StatusBadge = (statusProps: { name: string }) => {
    const status = () => statuses()[statusProps.name];
    return (
      <Show when={status()}>
        <Show
          when={status() !== 'loading'}
          fallback={<span class="loading loading-xs loading-spinner opacity-50" />}
        >
          {(() => {
            const s = status() as ContextStatus;
            if (s.reachable && !s.error) {
              return (
                <span class="badge badge-xs badge-success" title="Cluster is reachable">
                  reachable
                </span>
              );
            }
            if (s.reachable && s.error) {
              return (
                <span class="badge badge-xs badge-warning" title={s.error}>
                  {s.error}
                </span>
              );
            }
            return (
              <span class="badge badge-xs badge-error" title={s.error ?? 'Unreachable'}>
                unreachable
              </span>
            );
          })()}
        </Show>
      </Show>
    );
  };

  return (
    <Show when={props.open}>
      <Portal>
        <div class="modal modal-open">
          <div class="modal-box" style="max-width: calc(100vw - 4rem);">
            <h3 class="font-bold text-lg mb-4">Manage Kubernetes Contexts</h3>

            <Show when={error()}>
              <div class="alert alert-error mb-4">
                <span>{error()}</span>
              </div>
            </Show>

            <div class="overflow-x-auto">
              <table class="table table-sm">
                <thead>
                  <tr>
                    <th>Context</th>
                    <th>Cluster</th>
                    <th>Namespace</th>
                    <th>Status</th>
                    <th class="w-24"></th>
                  </tr>
                </thead>
                <tbody>
                  <For each={contextStore.contexts()}>
                    {(ctx) => (
                      <tr class={ctx.isCurrent ? 'bg-primary/10' : ''}>
                        <td class="font-mono text-sm">
                          {ctx.name}
                          <Show when={ctx.isCurrent}>
                            <span class="badge badge-xs badge-primary ml-2">active</span>
                          </Show>
                        </td>
                        <td class="font-mono text-sm opacity-70">{ctx.cluster ?? '-'}</td>
                        <td class="font-mono text-sm opacity-70">{ctx.namespace ?? '-'}</td>
                        <td>
                          <StatusBadge name={ctx.name} />
                        </td>
                        <td>
                          <Show
                            when={confirmName() === ctx.name}
                            fallback={
                              <button
                                class="btn btn-xs btn-ghost text-error"
                                onClick={() => {
                                  setConfirmName(ctx.name);
                                  setError('');
                                }}
                                disabled={ctx.isCurrent}
                                title={ctx.isCurrent ? 'Cannot delete the active context' : `Delete context ${ctx.name}`}
                              >
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            }
                          >
                            <div class="flex gap-1">
                              <button
                                class="btn btn-xs btn-error"
                                onClick={() => handleDelete(ctx.name)}
                                disabled={deleting() === ctx.name}
                              >
                                <Show when={deleting() === ctx.name} fallback="Yes">
                                  <span class="loading loading-xs loading-spinner" />
                                </Show>
                              </button>
                              <button
                                class="btn btn-xs btn-ghost"
                                onClick={() => setConfirmName('')}
                                disabled={deleting() === ctx.name}
                              >
                                No
                              </button>
                            </div>
                          </Show>
                        </td>
                      </tr>
                    )}
                  </For>
                </tbody>
              </table>
            </div>

            <p class="text-xs opacity-50 mt-3">
              Deleting a context also removes its associated cluster and user entries from kubeconfig if they are not used by other contexts.
            </p>

            <div class="modal-action">
              <button class="btn btn-ghost" onClick={handleClose}>
                Close
              </button>
            </div>
          </div>
          <div class="modal-backdrop" onClick={handleClose} />
        </div>
      </Portal>
    </Show>
  );
};

export default ContextManageDialog;
