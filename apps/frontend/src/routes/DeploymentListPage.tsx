import { batch, createEffect, createSignal, Match, onCleanup, Show, Switch } from 'solid-js';
import { useParams, useNavigate } from '@solidjs/router';
import DeploymentTable from '../components/DeploymentTable';
import DeploymentInfoPanel from '../components/DeploymentInfoPanel';
import DeploymentEventsPanel from '../components/DeploymentEventsPanel';
import DeploymentStatusPanel from '../components/DeploymentStatusPanel';
import DeploymentHistoryPanel from '../components/DeploymentHistoryPanel';
import ScaleDialog from '../components/ScaleDialog';
import ResourceActions, { type ResourceAction } from '../components/ResourceActions';
import { contextStore } from '../stores/contextStore';
import {
  ApiError,
  deleteDeployment,
  fetchDeployment,
  fetchDeploymentEvents,
  fetchDeploymentHistory,
  fetchDeploymentManifest,
  fetchDeployments,
  fetchDeploymentStatus,
  restartDeployment,
  rollbackDeployment,
  scaleDeployment,
  subscribeToDeploymentEvents,
  type DeploymentDetail,
  type DeploymentEvent,
  type DeploymentListItem,
  type DeploymentRevision,
  type DeploymentStatus,
  type DeploymentWatchEvent
} from '../lib/api';

const applyDeploymentWatchEvent = (deployments: DeploymentListItem[], event: DeploymentWatchEvent): DeploymentListItem[] => {
  const { type, object } = event;
  switch (type) {
    case 'ADDED':
      return [...deployments.filter((deployment) => deployment.name !== object.name), object];
    case 'MODIFIED':
      return deployments.map((deployment) => (deployment.name === object.name ? object : deployment));
    case 'DELETED':
      return deployments.filter((deployment) => deployment.name !== object.name);
    default:
      return deployments;
  }
};

const sortDeployments = (deployments: DeploymentListItem[]) =>
  [...deployments].sort((a, b) => a.name.localeCompare(b.name));

const DeploymentListPage = () => {
  const params = useParams<{ context: string; namespace: string; resourceName?: string; tab?: string }>();
  const navigate = useNavigate();

  // Decode URL params
  const context = () => params.context ? decodeURIComponent(params.context) : '';
  const namespace = () => params.namespace ? decodeURIComponent(params.namespace) : '';
  const resourceName = () => params.resourceName ? decodeURIComponent(params.resourceName) : undefined;
  const tab = () => params.tab || 'info';

  const [deployments, setDeployments] = createSignal<DeploymentListItem[]>([]);
  const [deploymentsLoading, setDeploymentsLoading] = createSignal(false);
  const [deploymentsError, setDeploymentsError] = createSignal<string>('');

  const [deploymentDetail, setDeploymentDetail] = createSignal<DeploymentDetail | undefined>();
  const [deploymentDetailLoading, setDeploymentDetailLoading] = createSignal(false);
  const [manifest, setManifest] = createSignal<string>('');

  const [deploymentEvents, setDeploymentEvents] = createSignal<DeploymentEvent[]>([]);
  const [deploymentEventsLoading, setDeploymentEventsLoading] = createSignal(false);

  const [deploymentStatus, setDeploymentStatus] = createSignal<DeploymentStatus | undefined>();
  const [deploymentStatusLoading, setDeploymentStatusLoading] = createSignal(false);

  const [deploymentHistory, setDeploymentHistory] = createSignal<DeploymentRevision[]>([]);
  const [deploymentHistoryLoading, setDeploymentHistoryLoading] = createSignal(false);

  const [contextError, setContextError] = createSignal<string>('');
  const [scaleDialogOpen, setScaleDialogOpen] = createSignal(false);

  let unsubscribeDeploymentStream: (() => void) | undefined;

  // Validate context and namespace
  createEffect(() => {
    const ctx = context();
    const ns = namespace();

    if (!ctx || !ns) return;

    // Only validate if contexts/namespaces have been loaded
    const contexts = contextStore.contexts();
    const namespaces = contextStore.namespaces();

    // Skip validation if still loading
    if (contextStore.contextsLoading() || contextStore.namespacesLoading()) {
      setContextError('');
      return;
    }

    // Only validate once we have data
    if (contexts.length > 0) {
      const validContext = contexts.find(c => c.name === ctx);
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

    // Wait until backend context matches the route context
    if (contextStore.activeContext() !== ctx) {
      return;
    }
  });

  const loadDeployments = async (namespace: string) => {
    setDeploymentsLoading(true);
    setDeploymentsError('');
    try {
      const items = await fetchDeployments(namespace);
      const sorted = sortDeployments(items);
      setDeployments(sorted);
    } catch (error) {
      console.error('Failed to load deployments', error);
      setDeployments([]);
      if (error instanceof ApiError) {
        setDeploymentsError(error.message);
      } else {
        setDeploymentsError('Failed to load deployments');
      }
    } finally {
      setDeploymentsLoading(false);
    }
  };

  const loadDeploymentDetail = async (namespace: string, deploymentName: string) => {
    setDeploymentDetailLoading(true);
    setDeploymentEventsLoading(true);
    setDeploymentStatusLoading(true);
    setDeploymentHistoryLoading(true);
    try {
      const [detail, manifestYaml, events, status, history] = await Promise.all([
        fetchDeployment(namespace, deploymentName),
        fetchDeploymentManifest(namespace, deploymentName),
        fetchDeploymentEvents(namespace, deploymentName),
        fetchDeploymentStatus(namespace, deploymentName),
        fetchDeploymentHistory(namespace, deploymentName)
      ]);
      batch(() => {
        setDeploymentDetail(detail);
        setManifest(manifestYaml);
        setDeploymentEvents(events);
        setDeploymentStatus(status);
        setDeploymentHistory(history);
      });
    } catch (error) {
      console.error('Failed to load deployment detail', error);
      setDeploymentDetail(undefined);
      setManifest('');
      setDeploymentEvents([]);
      setDeploymentStatus(undefined);
      setDeploymentHistory([]);
    } finally {
      setDeploymentDetailLoading(false);
      setDeploymentEventsLoading(false);
      setDeploymentStatusLoading(false);
      setDeploymentHistoryLoading(false);
    }
  };

  // Load deployments when namespace changes
  createEffect(() => {
    const ns = namespace();

    const ctx = context();
    if (!ns || contextError()) return;
    if (contextStore.activeContext() !== ctx) return;

    setDeploymentDetail(undefined);
    setManifest('');
    setDeploymentEvents([]);
    setDeploymentStatus(undefined);

    void loadDeployments(ns);

    if (unsubscribeDeploymentStream) {
      unsubscribeDeploymentStream();
    }

    unsubscribeDeploymentStream = subscribeToDeploymentEvents(
      ns,
      (event) => {
        setDeployments((prev) => sortDeployments(applyDeploymentWatchEvent(prev, event)));
      },
      (error) => {
        console.error('Deployment stream error', error);
        setDeploymentsError(error.message);
      }
    );
  });

  // Load deployment detail when resourceName changes
  createEffect(() => {
    const ns = namespace();
    const rn = resourceName();

    const ctx = context();
    if (!ns || !rn || contextError()) return;
    if (contextStore.activeContext() !== ctx) return;

    void loadDeploymentDetail(ns, rn);
  });

  onCleanup(() => {
    unsubscribeDeploymentStream?.();
  });

  const handleDeploymentSelect = (deployment: DeploymentListItem) => {
    const currentTab = tab();
    navigate(`/${encodeURIComponent(context())}/${encodeURIComponent(namespace())}/deployments/${encodeURIComponent(deployment.name)}/${currentTab}`);
  };

  const handleTabChange = (tabName: string) => {
    if (resourceName()) {
      navigate(`/${encodeURIComponent(context())}/${encodeURIComponent(namespace())}/deployments/${encodeURIComponent(resourceName()!)}/${tabName}`);
    }
  };

  const handleDeleteDeployment = async () => {
    const rn = resourceName();
    const ns = namespace();
    if (!rn || !ns) return;

    try {
      await deleteDeployment(ns, rn);
      // Navigate back to deployment list after delete
      navigate(`/${encodeURIComponent(context())}/${encodeURIComponent(ns)}/deployments`);
    } catch (error) {
      console.error('Failed to delete deployment', error);
      if (error instanceof ApiError) {
        setDeploymentsError(error.message);
      } else {
        setDeploymentsError('Failed to delete deployment');
      }
    }
  };

  const handleRestartDeployment = async () => {
    const rn = resourceName();
    const ns = namespace();
    if (!rn || !ns) return;

    await restartDeployment(ns, rn);
    // Reload deployment detail to show updated restart annotation
    await loadDeploymentDetail(ns, rn);
  };

  const handleScaleDeployment = async (replicas: number) => {
    const rn = resourceName();
    const ns = namespace();
    if (!rn || !ns) return;

    await scaleDeployment(ns, rn, replicas);
    // Reload deployment detail to show updated replica count
    await loadDeploymentDetail(ns, rn);
  };

  const handleRollbackDeployment = async (toRevision?: number) => {
    const rn = resourceName();
    const ns = namespace();
    if (!rn || !ns) return;

    await rollbackDeployment(ns, rn, toRevision);
    // Reload deployment detail to show rollback
    await loadDeploymentDetail(ns, rn);
  };

  const deploymentActions = (): ResourceAction[] => {
    if (!resourceName()) return [];

    return [
      {
        label: 'Scale',
        variant: 'primary',
        icon: 'M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4',
        onClick: () => { setScaleDialogOpen(true); }
      },
      {
        label: 'Rollback',
        variant: 'warning',
        icon: 'M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6',
        onClick: () => handleRollbackDeployment(),
        confirm: {
          title: 'Rollback Deployment',
          message: `Are you sure you want to rollback deployment "${resourceName()}" to the previous revision?`
        }
      },
      {
        label: 'Restart',
        variant: 'warning',
        icon: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
        onClick: handleRestartDeployment,
        confirm: {
          title: 'Restart Deployment',
          message: `Are you sure you want to restart deployment "${resourceName()}"? This will trigger a rolling restart of all pods.`
        }
      },
      {
        label: 'Delete',
        variant: 'error',
        icon: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
        onClick: handleDeleteDeployment,
        confirm: {
          title: 'Delete Deployment',
          message: `Are you sure you want to delete deployment "${resourceName()}"? This will delete all associated pods. This action cannot be undone.`
        }
      }
    ];
  };

  // Show error if context/namespace is invalid
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
        <Show when={deploymentsError()}>
          <div role="alert" class="alert alert-error">
            <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{deploymentsError()}</span>
          </div>
        </Show>
        <section class="grid grid-cols-1 gap-6 xl:grid-cols-2 h-resource-panel">
        <div class="card bg-base-200/30 shadow-lg flex flex-col overflow-hidden">
          <div class="card-body flex-1 overflow-hidden">
            <div class="overflow-y-auto h-full">
              <DeploymentTable
                deployments={deployments()}
                selectedDeployment={resourceName()}
                loading={deploymentsLoading()}
                onSelect={handleDeploymentSelect}
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
              <button
                type="button"
                class={`tab ${tab() === 'status' ? 'tab-active' : ''}`}
                onClick={() => handleTabChange('status')}
              >
                Status
              </button>
              <button
                type="button"
                class={`tab ${tab() === 'history' ? 'tab-active' : ''}`}
                onClick={() => handleTabChange('history')}
              >
                History
              </button>
              </div>
              <ResourceActions actions={deploymentActions()} />
            </div>
            <div class="divider my-0 flex-shrink-0" />
            <div class="p-6 flex-1 overflow-y-auto">
              <Switch>
                <Match when={tab() === 'info'}>
                  <DeploymentInfoPanel deployment={deploymentDetail()} loading={deploymentDetailLoading()} />
                </Match>
                <Match when={tab() === 'manifest'}>
                  <Show
                    when={!deploymentDetailLoading()}
                    fallback={<span class="loading loading-dots" />}
                  >
                    <Show
                      when={manifest()}
                      fallback={<p class="text-sm opacity-60">Manifest unavailable.</p>}
                    >
                      <pre class="overflow-auto rounded-lg bg-base-300/60 p-4 text-xs">
                        {manifest()}
                      </pre>
                    </Show>
                  </Show>
                </Match>
                <Match when={tab() === 'events'}>
                  <DeploymentEventsPanel events={deploymentEvents()} loading={deploymentEventsLoading()} />
                </Match>
                <Match when={tab() === 'status'}>
                  <DeploymentStatusPanel status={deploymentStatus()} loading={deploymentStatusLoading()} />
                </Match>
                <Match when={tab() === 'history'}>
                  <DeploymentHistoryPanel
                    revisions={deploymentHistory()}
                    loading={deploymentHistoryLoading()}
                    onRollback={(revision) => handleRollbackDeployment(revision)}
                  />
                </Match>
              </Switch>
            </div>
          </div>
        </div>
      </section>
      </div>

      <ScaleDialog
        open={scaleDialogOpen()}
        resourceName={resourceName() ?? ''}
        resourceKind="Deployment"
        currentReplicas={deploymentDetail()?.replicas ?? 0}
        onClose={() => setScaleDialogOpen(false)}
        onScale={handleScaleDeployment}
      />
    </main>
  );
};

export default DeploymentListPage;
