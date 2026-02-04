// ABOUTME: Page component for listing and viewing Kubernetes nodes
// ABOUTME: Shows node list with expandable pods, detail panel with info/manifest/events tabs

import { batch, createEffect, createSignal, Match, Show, Switch } from 'solid-js';
import { useParams, useNavigate } from '@solidjs/router';
import ManifestViewer from '../components/ManifestViewer';
import NodeTable from '../components/NodeTable';
import NodeInfoPanel from '../components/NodeInfoPanel';
import NodeEventsPanel from '../components/NodeEventsPanel';
import NodeExecDialog from '../components/NodeExecDialog';
import ResourceActions, { type ResourceAction } from '../components/ResourceActions';
import {
  ApiError,
  fetchNodes,
  fetchNode,
  fetchNodeManifest,
  fetchNodeEvents,
  cordonNode,
  uncordonNode,
  drainNode,
  type NodeListItem,
  type NodeDetail,
  type NodeEvent,
} from '../lib/api';
import { contextStore } from '../stores/contextStore';

const NodeListPage = () => {
  const params = useParams<{ context: string; namespace: string; resourceName?: string; tab?: string }>();
  const navigate = useNavigate();

  const context = () => params.context ? decodeURIComponent(params.context) : '';
  const namespace = () => params.namespace ? decodeURIComponent(params.namespace) : '';
  const resourceName = () => params.resourceName ? decodeURIComponent(params.resourceName) : undefined;
  const tab = () => params.tab || 'info';

  const [nodes, setNodes] = createSignal<NodeListItem[]>([]);
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal('');

  const [nodeDetail, setNodeDetail] = createSignal<NodeDetail | undefined>();
  const [nodeDetailLoading, setNodeDetailLoading] = createSignal(false);
  const [manifest, setManifest] = createSignal<string>('');
  const [nodeEvents, setNodeEvents] = createSignal<NodeEvent[]>([]);
  const [nodeEventsLoading, setNodeEventsLoading] = createSignal(false);
  const [execDialogOpen, setExecDialogOpen] = createSignal(false);

  let requestId = 0;

  const loadNodes = async () => {
    const currentRequest = ++requestId;
    setLoading(true);
    setError('');

    try {
      const { items } = await fetchNodes();
      if (currentRequest === requestId) {
        setNodes(items);
      }
    } catch (err) {
      console.error('Failed to load nodes', err);
      if (currentRequest === requestId) {
        setNodes([]);
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError('Failed to load nodes');
        }
      }
    } finally {
      if (currentRequest === requestId) {
        setLoading(false);
      }
    }
  };

  const loadNodeDetail = async (nodeName: string) => {
    setNodeDetailLoading(true);
    setNodeEventsLoading(true);
    try {
      const [detail, manifestYaml, events] = await Promise.all([
        fetchNode(nodeName),
        fetchNodeManifest(nodeName),
        fetchNodeEvents(nodeName),
      ]);
      batch(() => {
        setNodeDetail(detail);
        setManifest(manifestYaml);
        setNodeEvents(events);
      });
    } catch (err) {
      console.error('Failed to load node detail', err);
      setNodeDetail(undefined);
      setManifest('');
      setNodeEvents([]);
    } finally {
      setNodeDetailLoading(false);
      setNodeEventsLoading(false);
    }
  };

  createEffect(() => {
    const ctx = context();
    if (!ctx) return;
    if (contextStore.activeContext() !== ctx) return;

    setNodeDetail(undefined);
    setManifest('');
    setNodeEvents([]);

    void loadNodes();
  });

  createEffect(() => {
    const rn = resourceName();
    const ctx = context();
    if (!rn) return;
    if (contextStore.activeContext() !== ctx) return;

    void loadNodeDetail(rn);
  });

  const handleNodeSelect = (node: NodeListItem) => {
    const currentTab = tab();
    navigate(`/${encodeURIComponent(context())}/${encodeURIComponent(namespace())}/nodes/${encodeURIComponent(node.name)}/${currentTab}`);
  };

  const handleTabChange = (tabName: string) => {
    if (resourceName()) {
      navigate(`/${encodeURIComponent(context())}/${encodeURIComponent(namespace())}/nodes/${encodeURIComponent(resourceName()!)}/${tabName}`);
    }
  };

  const refreshNodeData = async () => {
    const rn = resourceName();
    if (rn) {
      await loadNodeDetail(rn);
    }
    await loadNodes();
  };

  const handleCordonNode = async () => {
    const rn = resourceName();
    if (!rn) return;
    await cordonNode(rn);
    await refreshNodeData();
  };

  const handleUncordonNode = async () => {
    const rn = resourceName();
    if (!rn) return;
    await uncordonNode(rn);
    await refreshNodeData();
  };

  const handleDrainNode = async () => {
    const rn = resourceName();
    if (!rn) return;
    await drainNode(rn);
    await refreshNodeData();
  };

  const nodeActions = (): ResourceAction[] => {
    if (!resourceName()) return [];

    return [
      {
        label: 'Cordon',
        variant: 'warning',
        tooltip: 'Mark node as unschedulable. Existing pods keep running, but no new pods will be placed here.',
        icon: 'M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636',
        onClick: handleCordonNode,
        confirm: {
          title: 'Cordon Node',
          message: `Mark "${resourceName()}" as unschedulable? Existing pods will continue running.`,
        },
      },
      {
        label: 'Uncordon',
        variant: 'secondary',
        tooltip: 'Mark node as schedulable again. New pods can be placed here.',
        icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
        onClick: handleUncordonNode,
      },
      {
        label: 'Drain',
        variant: 'error',
        tooltip: 'Cordon + evict all pods. DaemonSet pods are skipped. Pods will be rescheduled elsewhere.',
        icon: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
        onClick: handleDrainNode,
        confirm: {
          title: 'Drain Node',
          message: `Drain "${resourceName()}"? This will cordon the node and evict all pods (except DaemonSets). Pods will be rescheduled to other nodes.`,
        },
      },
    ];
  };

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
          Nodes are cluster-scoped; namespace filters are ignored for this view.
        </p>

        <section class="grid grid-cols-1 gap-6 xl:grid-cols-2 h-resource-panel">
          <div class="card bg-base-200/30 shadow-lg flex flex-col overflow-hidden">
            <div class="card-body flex-1 overflow-hidden">
              <div class="overflow-y-auto h-full">
                <NodeTable
                  nodes={nodes()}
                  selectedNode={resourceName()}
                  loading={loading()}
                  onSelect={handleNodeSelect}
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
                    class={`tab ${tab() === 'events' ? 'tab-active' : ''}`}
                    onClick={() => handleTabChange('events')}
                  >
                    Events
                  </button>
                </div>
                <div class="flex items-center gap-2">
                  <Show when={resourceName()}>
                    <button
                      type="button"
                      class="btn btn-ghost btn-sm"
                      onClick={() => setExecDialogOpen(true)}
                    >
                      Exec
                    </button>
                  </Show>
                  <ResourceActions actions={nodeActions()} />
                </div>
              </div>
              <div class="divider my-0 flex-shrink-0" />
              <div class="p-6 flex-1 overflow-y-auto">
                <Switch>
                  <Match when={tab() === 'info'}>
                    <NodeInfoPanel node={nodeDetail()} loading={nodeDetailLoading()} />
                  </Match>
                  <Match when={tab() === 'manifest'}>
                    <ManifestViewer manifest={manifest()} loading={nodeDetailLoading()} />
                  </Match>
                  <Match when={tab() === 'events'}>
                    <NodeEventsPanel events={nodeEvents()} loading={nodeEventsLoading()} />
                  </Match>
                </Switch>
              </div>
            </div>
          </div>
        </section>
      </div>

      <Show when={resourceName()}>
        <NodeExecDialog
          open={execDialogOpen()}
          nodeName={resourceName()!}
          onClose={() => setExecDialogOpen(false)}
        />
      </Show>
    </main>
  );
};

export default NodeListPage;
