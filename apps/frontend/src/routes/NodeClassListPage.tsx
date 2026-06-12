import { batch, createEffect, createSignal, Match, onCleanup, Show, Switch } from 'solid-js';
import { useNavigate, useParams } from '@solidjs/router';
import ManifestViewer from '../components/ManifestViewer';
import NodeClassTable from '../components/NodeClassTable';
import NodeClassInfoPanel from '../components/NodeClassInfoPanel';
import ResourceActions, { type ResourceAction } from '../components/ResourceActions';
import { contextStore } from '../stores/contextStore';
import {
  ApiError,
  deleteNodeClass,
  fetchNodeClass,
  fetchNodeClassManifest,
  fetchNodeClassStatus,
  fetchNodeClasses,
  subscribeToNodeClassEvents,
  type NodeClassDetail,
  type NodeClassListItem,
  type NodeClassStatus,
  type NodeClassWatchEvent
} from '../lib/api';
import ResourceListLayout from '../components/ResourceListLayout';

const applyNodeClassWatchEvent = (nodeClasses: NodeClassListItem[], event: NodeClassWatchEvent): NodeClassListItem[] => {
  const { type, object } = event;
  switch (type) {
    case 'ADDED':
      return [...nodeClasses.filter((nc) => nc.name !== object.name), object];
    case 'MODIFIED':
      return nodeClasses.map((nc) => (nc.name === object.name ? object : nc));
    case 'DELETED':
      return nodeClasses.filter((nc) => nc.name !== object.name);
    default:
      return nodeClasses;
  }
};

const sortNodeClasses = (nodeClasses: NodeClassListItem[]) =>
  [...nodeClasses].sort((a, b) => a.name.localeCompare(b.name));

const NodeClassListPage = () => {
  const params = useParams<{ context: string; namespace: string; resourceName?: string; tab?: string }>();
  const navigate = useNavigate();

  const context = () => (params.context ? decodeURIComponent(params.context) : '');
  const namespace = () => (params.namespace ? decodeURIComponent(params.namespace) : '');
  const resourceName = () => (params.resourceName ? decodeURIComponent(params.resourceName) : undefined);
  const tab = () => params.tab || 'info';

  const [nodeClasses, setNodeClasses] = createSignal<NodeClassListItem[]>([]);
  const [nodeClassesLoading, setNodeClassesLoading] = createSignal(false);
  const [nodeClassesError, setNodeClassesError] = createSignal<string>('');

  const [nodeClassDetail, setNodeClassDetail] = createSignal<NodeClassDetail | undefined>();
  const [nodeClassDetailLoading, setNodeClassDetailLoading] = createSignal(false);
  const [manifest, setManifest] = createSignal<string>('');
  const [status, setStatus] = createSignal<NodeClassStatus | undefined>();

  const [contextError, setContextError] = createSignal<string>('');

  let unsubscribeNodeClassStream: (() => void) | undefined;

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

  const loadNodeClasses = async () => {
    setNodeClassesLoading(true);
    setNodeClassesError('');
    try {
      const items = await fetchNodeClasses();
      setNodeClasses(sortNodeClasses(items));
    } catch (error) {
      console.error('Failed to load node classes', error);
      setNodeClasses([]);
      if (error instanceof ApiError) {
        setNodeClassesError(error.message);
      } else {
        setNodeClassesError('Failed to load node classes');
      }
    } finally {
      setNodeClassesLoading(false);
    }
  };

  const loadNodeClassDetail = async (name: string) => {
    setNodeClassDetailLoading(true);
    try {
      const [detail, manifestYaml, statusData] = await Promise.all([
        fetchNodeClass(name),
        fetchNodeClassManifest(name),
        fetchNodeClassStatus(name)
      ]);
      batch(() => {
        setNodeClassDetail(detail);
        setManifest(manifestYaml);
        setStatus(statusData);
      });
    } catch (error) {
      console.error('Failed to load node class detail', error);
      setNodeClassDetail(undefined);
      setManifest('');
      setStatus(undefined);
    } finally {
      setNodeClassDetailLoading(false);
    }
  };

  createEffect(() => {
    const ctx = context();

    if (!ctx || contextError()) return;
    if (contextStore.activeContext() !== ctx) return;

    setNodeClassDetail(undefined);
    setManifest('');
    setStatus(undefined);

    void loadNodeClasses();

    if (unsubscribeNodeClassStream) {
      unsubscribeNodeClassStream();
    }

    unsubscribeNodeClassStream = subscribeToNodeClassEvents(
      (event) => {
        setNodeClasses((prev) => sortNodeClasses(applyNodeClassWatchEvent(prev, event)));
      },
      (error) => {
        if (error) console.error('NodeClass stream error', error);
        setNodeClassesError(error?.message ?? '');
      }
    );
  });

  createEffect(() => {
    const ctx = context();
    const name = resourceName();

    if (!name || contextError()) return;
    if (contextStore.activeContext() !== ctx) return;

    void loadNodeClassDetail(name);
  });

  onCleanup(() => {
    unsubscribeNodeClassStream?.();
  });

  const handleNodeClassSelect = (nc: NodeClassListItem) => {
    const currentTab = tab();
    navigate(`/${encodeURIComponent(context())}/${encodeURIComponent(namespace())}/nodeclasses/${encodeURIComponent(nc.name)}/${currentTab}`);
  };

  const handleTabChange = (tabName: string) => {
    if (resourceName()) {
      navigate(`/${encodeURIComponent(context())}/${encodeURIComponent(namespace())}/nodeclasses/${encodeURIComponent(resourceName()!)}/${tabName}`);
    }
  };

  const handleDeleteNodeClass = async () => {
    const name = resourceName();
    if (!name) return;

    await deleteNodeClass(name);
    navigate(`/${encodeURIComponent(context())}/${encodeURIComponent(namespace())}/nodeclasses`);
  };

  const nodeClassActions = (): ResourceAction[] => {
    if (!resourceName()) return [];

    return [
      {
        label: 'Delete',
        variant: 'error',
        icon: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
        onClick: handleDeleteNodeClass,
        confirm: {
          title: 'Delete NodeClass',
          message: `Are you sure you want to delete node class "${resourceName()}"? This action cannot be undone.`
        }
      }
    ];
  };

  return (
    <ResourceListLayout contextError={contextError()} error={nodeClassesError()}>
          <div class="card bg-base-200/30 shadow-lg flex flex-col overflow-hidden">
            <div class="card-body flex-1 overflow-hidden">
              <div class="overflow-y-auto h-full">
                <NodeClassTable
                  nodeClasses={nodeClasses()}
                  selectedNodeClass={resourceName()}
                  loading={nodeClassesLoading()}
                  onSelect={handleNodeClassSelect}
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
                  <button
                    type="button"
                    class={`tab ${tab() === 'status' ? 'tab-active' : ''}`}
                    onClick={() => handleTabChange('status')}
                  >
                    Status
                  </button>
                </div>
                <ResourceActions actions={nodeClassActions()} />
              </div>
              <div class="divider my-0 flex-shrink-0" />
              <div class="p-6 flex-1 overflow-y-auto">
                <Switch>
                  <Match when={tab() === 'info'}>
                    <NodeClassInfoPanel nodeClass={nodeClassDetail()} loading={nodeClassDetailLoading()} />
                  </Match>
                  <Match when={tab() === 'manifest'}>
                    <ManifestViewer manifest={manifest()} loading={nodeClassDetailLoading()} />
                  </Match>
                  <Match when={tab() === 'status'}>
                    <Show
                      when={!nodeClassDetailLoading()}
                      fallback={<span class="loading loading-dots" />}
                    >
                      <Show when={status()} fallback={<p class="text-sm opacity-60">Status unavailable.</p>}>
                        <div class="space-y-4">
                          <div>
                            <h3 class="text-sm font-semibold mb-2">Conditions</h3>
                            <div class="overflow-x-auto">
                              <table class="table table-sm">
                                <thead>
                                  <tr>
                                    <th>Type</th>
                                    <th>Status</th>
                                    <th>Reason</th>
                                    <th>Message</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {status()?.conditions.map((condition) => (
                                    <tr>
                                      <td>{condition.type}</td>
                                      <td>
                                        <span class={`badge ${condition.status === 'True' ? 'badge-success' : 'badge-error'}`}>
                                          {condition.status}
                                        </span>
                                      </td>
                                      <td>{condition.reason || '-'}</td>
                                      <td>{condition.message || '-'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                          <Show when={status()?.amis && status()!.amis!.length > 0}>
                            <div>
                              <h3 class="text-sm font-semibold mb-2">AMIs</h3>
                              <div class="overflow-x-auto">
                                <table class="table table-sm">
                                  <thead>
                                    <tr>
                                      <th>ID</th>
                                      <th>Name</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {status()?.amis?.map((ami) => (
                                      <tr>
                                        <td class="font-mono text-xs">{ami.id}</td>
                                        <td>{ami.name}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </Show>
                          <Show when={status()?.subnets && status()!.subnets!.length > 0}>
                            <div>
                              <h3 class="text-sm font-semibold mb-2">Subnets</h3>
                              <div class="overflow-x-auto">
                                <table class="table table-sm">
                                  <thead>
                                    <tr>
                                      <th>ID</th>
                                      <th>Zone</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {status()?.subnets?.map((subnet) => (
                                      <tr>
                                        <td class="font-mono text-xs">{subnet.id}</td>
                                        <td>{subnet.zone}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </Show>
                          <Show when={status()?.securityGroups && status()!.securityGroups!.length > 0}>
                            <div>
                              <h3 class="text-sm font-semibold mb-2">Security Groups</h3>
                              <div class="overflow-x-auto">
                                <table class="table table-sm">
                                  <thead>
                                    <tr>
                                      <th>ID</th>
                                      <th>Name</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {status()?.securityGroups?.map((sg) => (
                                      <tr>
                                        <td class="font-mono text-xs">{sg.id}</td>
                                        <td>{sg.name}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </Show>
                        </div>
                      </Show>
                    </Show>
                  </Match>
                </Switch>
              </div>
            </div>
          </div>
    </ResourceListLayout>
  );
};

export default NodeClassListPage;
