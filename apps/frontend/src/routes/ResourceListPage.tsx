import { batch, createEffect, createSignal, Match, onCleanup, Show, Switch } from 'solid-js';
import { useParams, useNavigate } from '@solidjs/router';
import ManifestViewer from '../components/ManifestViewer';
import PodTable from '../components/PodTable';
import PodInfoPanel from '../components/PodInfoPanel';
import PodEventsPanel from '../components/PodEventsPanel';
import PodStatusPanel from '../components/PodStatusPanel';
import LogViewer from '../components/LogViewer';
import PortForwardDialog from '../components/PortForwardDialog';
import ExecDialog from '../components/ExecDialog';
import ResourceActions, { type ResourceAction } from '../components/ResourceActions';
import { portForwardStore } from '../stores/portForwardStore';
import { contextStore } from '../stores/contextStore';
import {
  ApiError,
  deletePod,
  evictPod,
  fetchPod,
  fetchPodEvents,
  fetchPodManifest,
  fetchPods,
  fetchPodStatus,
  startPortForward,
  subscribeToPodEvents,
  type PodDetail,
  type PodEvent,
  type PodListItem,
  type PodStatus,
  type PodWatchEvent
} from '../lib/api';

const applyPodWatchEvent = (pods: PodListItem[], event: PodWatchEvent): PodListItem[] => {
  const { type, object } = event;
  switch (type) {
    case 'ADDED':
      return [...pods.filter((pod) => pod.name !== object.name), object];
    case 'MODIFIED':
      return pods.map((pod) =>
        pod.name === object.name
          ? {
              ...pod,
              ...object,
              cpuUsage: object.cpuUsage ?? pod.cpuUsage,
              memoryUsage: object.memoryUsage ?? pod.memoryUsage
            }
          : pod
      );
    case 'DELETED':
      return pods.filter((pod) => pod.name !== object.name);
    default:
      return pods;
  }
};

const sortPods = (pods: PodListItem[]) =>
  [...pods].sort((a, b) => a.name.localeCompare(b.name));

const ResourceListPage = () => {
  const params = useParams<{ context: string; namespace: string; resourceName?: string; tab?: string }>();
  const navigate = useNavigate();

  // Decode URL params
  const context = () => params.context ? decodeURIComponent(params.context) : '';
  const namespace = () => params.namespace ? decodeURIComponent(params.namespace) : '';
  const resourceName = () => params.resourceName ? decodeURIComponent(params.resourceName) : undefined;
  const tab = () => params.tab || 'info';

  const [pods, setPods] = createSignal<PodListItem[]>([]);
  const [podsLoading, setPodsLoading] = createSignal(false);
  const [podsError, setPodsError] = createSignal<string>('');

  const [podDetail, setPodDetail] = createSignal<PodDetail | undefined>();
  const [podDetailLoading, setPodDetailLoading] = createSignal(false);
  const [manifest, setManifest] = createSignal<string>('');

  const [podEvents, setPodEvents] = createSignal<PodEvent[]>([]);
  const [podEventsLoading, setPodEventsLoading] = createSignal(false);

  const [podStatus, setPodStatus] = createSignal<PodStatus | undefined>();
  const [podStatusLoading, setPodStatusLoading] = createSignal(false);

  const [contextError, setContextError] = createSignal<string>('');

  const [portForwardDialogOpen, setPortForwardDialogOpen] = createSignal(false);
  const [execDialogOpen, setExecDialogOpen] = createSignal(false);

  let unsubscribePodStream: (() => void) | undefined;

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

  const loadPods = async (namespace: string) => {
    setPodsLoading(true);
    setPodsError('');
    try {
      const items = await fetchPods(namespace);
      const sorted = sortPods(items);
      setPods(sorted);
    } catch (error) {
      console.error('Failed to load pods', error);
      setPods([]);
      if (error instanceof ApiError) {
        setPodsError(error.message);
      } else {
        setPodsError('Failed to load pods');
      }
    } finally {
      setPodsLoading(false);
    }
  };

  const loadPodDetail = async (namespace: string, podName: string) => {
    setPodDetailLoading(true);
    setPodEventsLoading(true);
    setPodStatusLoading(true);
    try {
      const [detail, manifestYaml, events, status] = await Promise.all([
        fetchPod(namespace, podName),
        fetchPodManifest(namespace, podName),
        fetchPodEvents(namespace, podName),
        fetchPodStatus(namespace, podName)
      ]);
      batch(() => {
        setPodDetail(detail);
        setManifest(manifestYaml);
        setPodEvents(events);
        setPodStatus(status);
      });
    } catch (error) {
      console.error('Failed to load pod detail', error);
      setPodDetail(undefined);
      setManifest('');
      setPodEvents([]);
      setPodStatus(undefined);
    } finally {
      setPodDetailLoading(false);
      setPodEventsLoading(false);
      setPodStatusLoading(false);
    }
  };

  // Load pods when namespace changes
  createEffect(() => {
    const ns = namespace();

    const ctx = context();
    if (!ns || contextError()) return;
    if (contextStore.activeContext() !== ctx) return;

    setPodDetail(undefined);
    setManifest('');
    setPodEvents([]);
    setPodStatus(undefined);

    void loadPods(ns);

    if (unsubscribePodStream) {
      unsubscribePodStream();
    }

    unsubscribePodStream = subscribeToPodEvents(
      ns,
      (event) => {
        setPods((prev) => sortPods(applyPodWatchEvent(prev, event)));
      },
      (error) => {
        console.error('Pod stream error', error);
        setPodsError(error.message);
      }
    );
  });

  // Load pod detail when resourceName changes
  createEffect(() => {
    const ns = namespace();
    const rn = resourceName();

    const ctx = context();
    if (!ns || !rn || contextError()) return;
    if (contextStore.activeContext() !== ctx) return;

    void loadPodDetail(ns, rn);
  });

  onCleanup(() => {
    unsubscribePodStream?.();
  });

  const handlePodSelect = (pod: PodListItem) => {
    const currentTab = tab();
    navigate(`/${encodeURIComponent(context())}/${encodeURIComponent(namespace())}/pods/${encodeURIComponent(pod.name)}/${currentTab}`);
  };

  const handleTabChange = (tabName: string) => {
    if (resourceName()) {
      navigate(`/${encodeURIComponent(context())}/${encodeURIComponent(namespace())}/pods/${encodeURIComponent(resourceName()!)}/${tabName}`);
    }
  };

  const handleDeletePod = async () => {
    const rn = resourceName();
    const ns = namespace();
    if (!rn || !ns) return;

    await deletePod(ns, rn);
    // Navigate back to pod list after delete
    navigate(`/${encodeURIComponent(context())}/${encodeURIComponent(ns)}/pods`);
  };

  const handleEvictPod = async () => {
    const rn = resourceName();
    const ns = namespace();
    if (!rn || !ns) return;

    await evictPod(ns, rn);
    // Navigate back to pod list after evict
    navigate(`/${encodeURIComponent(context())}/${encodeURIComponent(ns)}/pods`);
  };

  const handleStartPortForward = async (localPort: number, targetPort: number) => {
    const rn = resourceName();
    const ns = namespace();
    if (!rn || !ns) throw new Error('No pod selected');
    await startPortForward(ns, rn, localPort, targetPort);
    await portForwardStore.loadForwards();
  };

  const podActions = (): ResourceAction[] => {
    if (!resourceName()) return [];

    return [
      {
        label: 'Evict',
        variant: 'warning',
        icon: 'M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1',
        onClick: handleEvictPod,
        confirm: {
          title: 'Evict Pod',
          message: `Are you sure you want to evict pod "${resourceName()}"? This will safely evict the pod from its node.`
        }
      },
      {
        label: 'Delete',
        variant: 'error',
        icon: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
        onClick: handleDeletePod,
        confirm: {
          title: 'Delete Pod',
          message: `Are you sure you want to delete pod "${resourceName()}"? This action cannot be undone.`
        }
      }
    ];
  };

  const selectedPod = () => pods().find(p => p.name === resourceName());

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
        <Show when={podsError()}>
          <div role="alert" class="alert alert-error">
            <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{podsError()}</span>
          </div>
        </Show>
        <section class="grid grid-cols-1 gap-6 xl:grid-cols-2 h-resource-panel">
        <div class="card bg-base-200/30 shadow-lg flex flex-col overflow-hidden">
          <div class="card-body flex-1 overflow-hidden">
            <div class="overflow-y-auto h-full">
              <PodTable
                pods={pods()}
                selectedPod={resourceName()}
                loading={podsLoading()}
                onSelect={handlePodSelect}
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
                class={`tab ${tab() === 'logs' ? 'tab-active' : ''}`}
                onClick={() => handleTabChange('logs')}
              >
                Logs
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
                  <button
                    type="button"
                    class="btn btn-ghost btn-sm"
                    onClick={() => setPortForwardDialogOpen(true)}
                  >
                    Port Forward
                  </button>
                </Show>
                <ResourceActions actions={podActions()} />
              </div>
            </div>
            <div class="divider my-0 flex-shrink-0" />
            <div class="p-6 flex-1 overflow-y-auto">
              <Switch>
                <Match when={tab() === 'info'}>
                  <PodInfoPanel pod={podDetail()} events={podEvents()} loading={podDetailLoading()} />
                </Match>
                <Match when={tab() === 'manifest'}>
                  <ManifestViewer manifest={manifest()} loading={podDetailLoading()} />
                </Match>
                <Match when={tab() === 'events'}>
                  <PodEventsPanel events={podEvents()} loading={podEventsLoading()} />
                </Match>
                <Match when={tab() === 'status'}>
                  <PodStatusPanel status={podStatus()} loading={podStatusLoading()} />
                </Match>
                <Match when={tab() === 'logs'}>
                  <LogViewer
                    namespace={namespace()}
                    pod={resourceName()}
                    containers={selectedPod()?.containers ?? []}
                    containersStatus={podDetail()?.containersStatus}
                    active={tab() === 'logs'}
                  />
                </Match>
              </Switch>
            </div>
          </div>
        </div>
      </section>
      </div>

      <Show when={resourceName()}>
        <PortForwardDialog
          open={portForwardDialogOpen()}
          namespace={namespace()}
          pod={resourceName()!}
          containerPorts={podDetail()?.containerPorts}
          onClose={() => setPortForwardDialogOpen(false)}
          onStart={handleStartPortForward}
        />
        <ExecDialog
          open={execDialogOpen()}
          namespace={namespace()}
          pod={resourceName()!}
          containers={(selectedPod()?.containers ?? []).map(name => ({ name }))}
          onClose={() => setExecDialogOpen(false)}
        />
      </Show>
    </main>
  );
};

export default ResourceListPage;
