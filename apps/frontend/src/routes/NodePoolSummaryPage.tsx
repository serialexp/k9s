// ABOUTME: Page component for displaying node pool summaries
// ABOUTME: Shows aggregated resource utilization across node pools in full-width layout

import { createEffect, createSignal, Show } from 'solid-js';
import NodePoolList from '../components/NodePoolList';
import { ApiError, fetchNodes, type NodePoolSummary } from '../lib/api';
import { contextStore } from '../stores/contextStore';

const NodePoolSummaryPage = () => {
  const [nodePools, setNodePools] = createSignal<NodePoolSummary[]>([]);
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal('');

  let requestId = 0;

  createEffect(() => {
    const context = contextStore.activeContext();
    if (!context) return;

    const currentRequest = ++requestId;
    setLoading(true);
    setError('');

    fetchNodes()
      .then(({ pools }) => {
        if (currentRequest === requestId) {
          setNodePools(pools);
        }
      })
      .catch((err) => {
        console.error('Failed to load node pools', err);
        if (currentRequest === requestId) {
          setNodePools([]);
          if (err instanceof ApiError) {
            setError(err.message);
          } else {
            setError('Failed to load node pools');
          }
        }
      })
      .finally(() => {
        if (currentRequest === requestId) {
          setLoading(false);
        }
      });
  });

  return (
    <main class="p-6">
      <div class="flex flex-col gap-6">
        <Show when={error()}>
          <div role="alert" class="alert alert-error">
            <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error()}</span>
          </div>
        </Show>

        <p class="text-sm opacity-70">
          Node pool summaries are cluster-scoped; namespace filters are ignored for this view.
        </p>

        <div class="card bg-base-200/30 shadow-lg">
          <div class="card-body">
            <NodePoolList pools={nodePools()} loading={loading()} />
          </div>
        </div>
      </div>
    </main>
  );
};

export default NodePoolSummaryPage;
