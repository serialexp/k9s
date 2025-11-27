import { createEffect, createSignal, Match, Show, Switch } from 'solid-js';
import NodeTable from '../components/NodeTable';
import NodePoolList from '../components/NodePoolList';
import { ApiError, fetchNodes, type NodeListItem, type NodePoolSummary } from '../lib/api';
import { contextStore } from '../stores/contextStore';

const NodeListPage = () => {
  const [nodes, setNodes] = createSignal<NodeListItem[]>([]);
  const [nodePools, setNodePools] = createSignal<NodePoolSummary[]>([]);
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal('');
  const [activeTab, setActiveTab] = createSignal<'pools' | 'nodes'>('pools');

  let requestId = 0;

  createEffect(() => {
    const context = contextStore.activeContext();
    if (!context) return;

    const currentRequest = ++requestId;
    setLoading(true);
    setError('');

    fetchNodes()
      .then(({ items, pools }) => {
        if (currentRequest === requestId) {
          setNodes(items);
          setNodePools(pools);
        }
      })
      .catch((err) => {
        console.error('Failed to load nodes', err);
        if (currentRequest === requestId) {
          setNodes([]);
          setNodePools([]);
          if (err instanceof ApiError) {
            setError(err.message);
          } else {
            setError('Failed to load nodes');
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

        <div class="card bg-base-200/30 shadow-lg">
          <div class="card-body">
            <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p class="text-sm opacity-70">
                Nodes are cluster-scoped; namespace filters are ignored for this view.
              </p>
              <div class="tabs tabs-boxed">
                <button
                  type="button"
                  class={`tab ${activeTab() === 'pools' ? 'tab-active' : ''}`}
                  onClick={() => setActiveTab('pools')}
                >
                  Node Pools
                </button>
                <button
                  type="button"
                  class={`tab ${activeTab() === 'nodes' ? 'tab-active' : ''}`}
                  onClick={() => setActiveTab('nodes')}
                >
                  Nodes
                </button>
              </div>
            </div>

            <Switch>
              <Match when={activeTab() === 'pools'}>
                <NodePoolList pools={nodePools()} loading={loading()} />
              </Match>
              <Match when={activeTab() === 'nodes'}>
                <NodeTable nodes={nodes()} loading={loading()} />
              </Match>
            </Switch>
          </div>
        </div>
      </div>
    </main>
  );
};

export default NodeListPage;
