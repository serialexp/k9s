import { batch, createEffect, createSignal, Match, onCleanup, Show, Switch, For } from 'solid-js';
import { useNavigate, useParams } from '@solidjs/router';
import ManifestViewer from '../components/ManifestViewer';
import NodePoolTable from '../components/NodePoolTable';
import ResourceActions, { type ResourceAction } from '../components/ResourceActions';
import { contextStore } from '../stores/contextStore';
import {
  ApiError,
  deleteNodePool,
  fetchNodePool,
  fetchNodePoolManifest,
  fetchNodePools,
  subscribeToNodePoolEvents,
  type NodePoolDetail,
  type NodePoolListItem,
  type NodePoolWatchEvent
} from '../lib/api';

const applyNodePoolWatchEvent = (nodePools: NodePoolListItem[], event: NodePoolWatchEvent): NodePoolListItem[] => {
  const { type, object } = event;
  switch (type) {
    case 'ADDED':
      return [...nodePools.filter((np) => np.name !== object.name), object];
    case 'MODIFIED':
      return nodePools.map((np) => (np.name === object.name ? object : np));
    case 'DELETED':
      return nodePools.filter((np) => np.name !== object.name);
    default:
      return nodePools;
  }
};

const sortNodePools = (nodePools: NodePoolListItem[]) =>
  [...nodePools].sort((a, b) => a.name.localeCompare(b.name));

const NodePoolListPage = () => {
  const params = useParams<{ context: string; namespace: string; resourceName?: string; tab?: string }>();
  const navigate = useNavigate();

  const context = () => (params.context ? decodeURIComponent(params.context) : '');
  const namespace = () => (params.namespace ? decodeURIComponent(params.namespace) : '');
  const resourceName = () => (params.resourceName ? decodeURIComponent(params.resourceName) : undefined);
  const tab = () => params.tab || 'info';

  const [nodePools, setNodePools] = createSignal<NodePoolListItem[]>([]);
  const [nodePoolsLoading, setNodePoolsLoading] = createSignal(false);
  const [nodePoolsError, setNodePoolsError] = createSignal<string>('');

  const [nodePoolDetail, setNodePoolDetail] = createSignal<NodePoolDetail | undefined>();
  const [nodePoolDetailLoading, setNodePoolDetailLoading] = createSignal(false);
  const [manifest, setManifest] = createSignal<string>('');

  const [contextError, setContextError] = createSignal<string>('');

  let unsubscribeNodePoolStream: (() => void) | undefined;

  createEffect(() => {
    const ctx = context();
    const ns = namespace();

    if (!ctx || !ns) return;

    const contexts = contextStore.contexts();
    const namespaces = contextStore.namespaces();

    if (contextStore.contextsLoading() || contextStore.namespacesLoading()) {
      setContextError('');
      return;
    }

    if (contexts.length > 0) {
      const validContext = contexts.find((c) => c.name === ctx);
      if (!validContext) {
        setContextError(`Context "${ctx}" not found`);
        return;
      }
    }

    if (namespaces.length > 0) {
      const validNamespace = namespaces.includes(ns);
      if (!validNamespace) {
        setContextError(`Namespace "${ns}" not found in context "${ctx}"`);
        return;
      }
    }

    setContextError('');

    if (contextStore.activeContext() !== ctx) {
      return;
    }
  });

  const loadNodePools = async () => {
    setNodePoolsLoading(true);
    setNodePoolsError('');
    try {
      const items = await fetchNodePools();
      setNodePools(sortNodePools(items));
    } catch (error) {
      console.error('Failed to load node pools', error);
      setNodePools([]);
      if (error instanceof ApiError) {
        setNodePoolsError(error.message);
      } else {
        setNodePoolsError('Failed to load node pools');
      }
    } finally {
      setNodePoolsLoading(false);
    }
  };

  const loadNodePoolDetail = async (name: string) => {
    setNodePoolDetailLoading(true);
    try {
      const [detail, manifestYaml] = await Promise.all([
        fetchNodePool(name),
        fetchNodePoolManifest(name)
      ]);
      batch(() => {
        setNodePoolDetail(detail);
        setManifest(manifestYaml);
      });
    } catch (error) {
      console.error('Failed to load node pool detail', error);
      setNodePoolDetail(undefined);
      setManifest('');
    } finally {
      setNodePoolDetailLoading(false);
    }
  };

  createEffect(() => {
    const ctx = context();

    if (!ctx || contextError()) return;
    if (contextStore.activeContext() !== ctx) return;

    setNodePoolDetail(undefined);
    setManifest('');

    void loadNodePools();

    if (unsubscribeNodePoolStream) {
      unsubscribeNodePoolStream();
    }

    unsubscribeNodePoolStream = subscribeToNodePoolEvents(
      (event) => {
        setNodePools((prev) => sortNodePools(applyNodePoolWatchEvent(prev, event)));
      },
      (error) => {
        console.error('NodePool stream error', error);
        setNodePoolsError(error.message);
      }
    );
  });

  createEffect(() => {
    const ctx = context();
    const name = resourceName();

    if (!name || contextError()) return;
    if (contextStore.activeContext() !== ctx) return;

    void loadNodePoolDetail(name);
  });

  onCleanup(() => {
    unsubscribeNodePoolStream?.();
  });

  const handleNodePoolSelect = (np: NodePoolListItem) => {
    const currentTab = tab();
    navigate(`/${encodeURIComponent(context())}/${encodeURIComponent(namespace())}/nodepools/${encodeURIComponent(np.name)}/${currentTab}`);
  };

  const handleTabChange = (tabName: string) => {
    if (resourceName()) {
      navigate(`/${encodeURIComponent(context())}/${encodeURIComponent(namespace())}/nodepools/${encodeURIComponent(resourceName()!)}/${tabName}`);
    }
  };

  const handleDeleteNodePool = async () => {
    const name = resourceName();
    if (!name) return;

    try {
      await deleteNodePool(name);
      navigate(`/${encodeURIComponent(context())}/${encodeURIComponent(namespace())}/nodepools`);
    } catch (error) {
      console.error('Failed to delete node pool', error);
      if (error instanceof ApiError) {
        setNodePoolsError(error.message);
      } else {
        setNodePoolsError('Failed to delete node pool');
      }
    }
  };

  const nodePoolActions = (): ResourceAction[] => {
    if (!resourceName()) return [];

    return [
      {
        label: 'Delete',
        variant: 'error',
        icon: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
        onClick: handleDeleteNodePool,
        confirm: {
          title: 'Delete NodePool',
          message: `Are you sure you want to delete NodePool "${resourceName()}"? This action cannot be undone.`
        }
      }
    ];
  };

  if (contextError()) {
    return (
      <main class="p-6">
        <div class="flex items-center justify-center min-h-[50vh]">
          <div class="card bg-base-200 shadow-xl max-w-md">
            <div class="card-body text-center">
              <h2 class="card-title justify-center text-error">Route Not Found</h2>
              <p class="opacity-70">{contextError()}</p>
              <div class="card-actions justify-center mt-4">
                <button
                  class="btn btn-primary"
                  onClick={() => navigate('/', { replace: true })}
                >
                  Go to Default View
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main class="p-6">
      <div class="flex flex-col gap-6">
        <Show when={nodePoolsError()}>
          <div role="alert" class="alert alert-error">
            <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{nodePoolsError()}</span>
          </div>
        </Show>
        <section class="grid grid-cols-1 gap-6 xl:grid-cols-2 h-resource-panel">
          <div class="card bg-base-200/30 shadow-lg flex flex-col overflow-hidden">
            <div class="card-body flex-1 overflow-hidden">
              <div class="overflow-y-auto h-full">
                <NodePoolTable
                  nodePools={nodePools()}
                  selectedNodePool={resourceName()}
                  loading={nodePoolsLoading()}
                  onSelect={handleNodePoolSelect}
                />
              </div>
            </div>
          </div>

          <div class="card bg-base-200/30 shadow-lg flex flex-col overflow-hidden">
            <div class="card-body gap-0 p-0 flex-1 overflow-hidden flex flex-col">
              <div class="flex items-center justify-between px-4 pt-4 flex-shrink-0">
                <div class="tabs tabs-boxed">
                  <button
                    type="button"
                    class={`tab ${tab() === 'info' ? 'tab-active' : ''}`}
                    onClick={() => handleTabChange('info')}
                  >
                    Info
                  </button>
                  <button
                    type="button"
                    class={`tab ${tab() === 'manifest' ? 'tab-active' : ''}`}
                    onClick={() => handleTabChange('manifest')}
                  >
                    Definition
                  </button>
                </div>
                <ResourceActions actions={nodePoolActions()} />
              </div>
              <div class="divider my-0 flex-shrink-0" />
              <div class="p-6 flex-1 overflow-y-auto">
                <Switch>
                  <Match when={tab() === 'info'}>
                    <Show when={!nodePoolDetailLoading()} fallback={<span class="loading loading-dots" />}>
                      <Show
                        when={nodePoolDetail()}
                        fallback={<p class="text-sm opacity-60">Select a NodePool to view details.</p>}
                      >
                        {(detail) => (
                          <div class="space-y-4">
                            <div>
                              <h3 class="text-sm font-semibold mb-2">Basic Info</h3>
                              <div class="grid grid-cols-2 gap-2 text-sm">
                                <div><span class="opacity-60">Name:</span> {detail().name}</div>
                                <div><span class="opacity-60">Weight:</span> {detail().weight ?? '—'}</div>
                                <div><span class="opacity-60">Status:</span> {detail().readyStatus ?? 'Unknown'}</div>
                                <div><span class="opacity-60">Created:</span> {detail().creationTimestamp || '—'}</div>
                              </div>
                            </div>
                            <Show when={detail().limits && Object.keys(detail().limits!).length > 0}>
                              <div>
                                <h3 class="text-sm font-semibold mb-2">Limits</h3>
                                <div class="grid grid-cols-2 gap-2 text-sm">
                                  {Object.entries(detail().limits!).map(([key, value]) => (
                                    <div><span class="opacity-60">{key}:</span> {value}</div>
                                  ))}
                                </div>
                              </div>
                            </Show>
                            <Show when={detail().template?.spec?.nodeClassRef}>
                              <div>
                                <h3 class="text-sm font-semibold mb-2">Node Class Reference</h3>
                                <div class="grid grid-cols-2 gap-2 text-sm">
                                  <div><span class="opacity-60">Kind:</span> {detail().template?.spec?.nodeClassRef?.kind ?? '—'}</div>
                                  <div><span class="opacity-60">Name:</span> {detail().template?.spec?.nodeClassRef?.name ?? '—'}</div>
                                </div>
                              </div>
                            </Show>
                            <Show when={detail().disruption}>
                              <div>
                                <h3 class="text-sm font-semibold mb-2">Disruption</h3>
                                <div class="grid grid-cols-2 gap-2 text-sm">
                                  <div><span class="opacity-60">Policy:</span> {detail().disruption?.consolidationPolicy ?? '—'}</div>
                                  <div><span class="opacity-60">Consolidate After:</span> {detail().disruption?.consolidateAfter ?? '—'}</div>
                                </div>
                              </div>
                            </Show>
                            <Show when={detail().template?.spec?.taints?.length}>
                              <div>
                                <h3 class="text-sm font-semibold mb-2">Taints</h3>
                                <div class="space-y-2">
                                  <For each={detail().template?.spec?.taints ?? []}>
                                    {(taint) => (
                                      <div class="rounded-lg bg-base-200/40 p-3 text-sm">
                                        <div><span class="opacity-60">Key:</span> {taint.key}</div>
                                        <div><span class="opacity-60">Value:</span> {taint.value ?? '—'}</div>
                                        <div><span class="opacity-60">Effect:</span> {taint.effect}</div>
                                      </div>
                                    )}
                                  </For>
                                </div>
                              </div>
                            </Show>
                            <div>
                              <h3 class="text-sm font-semibold mb-2">Metadata</h3>
                              <div class="grid grid-cols-2 gap-2 text-sm">
                                <div>
                                  <div class="opacity-60">Labels</div>
                                  <Show
                                    when={Object.keys(detail().labels).length}
                                    fallback={<div class="text-xs opacity-50 mt-1">None</div>}
                                  >
                                    <div class="mt-1 space-y-1">
                                      {Object.entries(detail().labels).map(([key, value]) => (
                                        <div class="text-xs opacity-80">
                                          <span class="font-mono">{key}:</span> {value}
                                        </div>
                                      ))}
                                    </div>
                                  </Show>
                                </div>
                                <div>
                                  <div class="opacity-60">Annotations</div>
                                  <Show
                                    when={Object.keys(detail().annotations).length}
                                    fallback={<div class="text-xs opacity-50 mt-1">None</div>}
                                  >
                                    <div class="mt-1 space-y-1">
                                      {Object.entries(detail().annotations).map(([key, value]) => (
                                        <div class="text-xs opacity-80">
                                          <span class="font-mono">{key}:</span> {value}
                                        </div>
                                      ))}
                                    </div>
                                  </Show>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </Show>
                    </Show>
                  </Match>
                  <Match when={tab() === 'manifest'}>
                    <ManifestViewer manifest={manifest()} loading={nodePoolDetailLoading()} />
                  </Match>
                </Switch>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
};

export default NodePoolListPage;
