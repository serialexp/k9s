import { batch, createEffect, createSignal, Match, onCleanup, Show, Switch } from 'solid-js';
import { useNavigate, useParams } from '@solidjs/router';
import StatefulSetTable from '../components/StatefulSetTable';
import StatefulSetInfoPanel from '../components/StatefulSetInfoPanel';
import StatefulSetEventsPanel from '../components/StatefulSetEventsPanel';
import StatefulSetStatusPanel from '../components/StatefulSetStatusPanel';
import ScaleDialog from '../components/ScaleDialog';
import ResourceActions, { type ResourceAction } from '../components/ResourceActions';
import { contextStore } from '../stores/contextStore';
import {
  ApiError,
  deleteStatefulSet,
  fetchStatefulSet,
  fetchStatefulSetEvents,
  fetchStatefulSetManifest,
  fetchStatefulSetStatus,
  fetchStatefulSets,
  restartStatefulSet,
  scaleStatefulSet,
  subscribeToStatefulSetEvents,
  type StatefulSetDetail,
  type StatefulSetEvent,
  type StatefulSetListItem,
  type StatefulSetStatus,
  type StatefulSetWatchEvent
} from '../lib/api';

const applyStatefulSetWatchEvent = (statefulSets: StatefulSetListItem[], event: StatefulSetWatchEvent): StatefulSetListItem[] => {
  const { type, object } = event;
  switch (type) {
    case 'ADDED':
      return [...statefulSets.filter((item) => item.name !== object.name), object];
    case 'MODIFIED':
      return statefulSets.map((item) => (item.name === object.name ? object : item));
    case 'DELETED':
      return statefulSets.filter((item) => item.name !== object.name);
    default:
      return statefulSets;
  }
};

const sortStatefulSets = (statefulSets: StatefulSetListItem[]) =>
  [...statefulSets].sort((a, b) => a.name.localeCompare(b.name));

const StatefulSetListPage = () => {
  const params = useParams<{ context: string; namespace: string; resourceName?: string; tab?: string }>();
  const navigate = useNavigate();

  const context = () => (params.context ? decodeURIComponent(params.context) : '');
  const namespace = () => (params.namespace ? decodeURIComponent(params.namespace) : '');
  const resourceName = () => (params.resourceName ? decodeURIComponent(params.resourceName) : undefined);
  const tab = () => params.tab || 'info';

  const [statefulSets, setStatefulSets] = createSignal<StatefulSetListItem[]>([]);
  const [statefulSetsLoading, setStatefulSetsLoading] = createSignal(false);
  const [statefulSetsError, setStatefulSetsError] = createSignal<string>('');

  const [statefulSetDetail, setStatefulSetDetail] = createSignal<StatefulSetDetail | undefined>();
  const [statefulSetDetailLoading, setStatefulSetDetailLoading] = createSignal(false);
  const [manifest, setManifest] = createSignal<string>('');

  const [statefulSetEvents, setStatefulSetEvents] = createSignal<StatefulSetEvent[]>([]);
  const [statefulSetEventsLoading, setStatefulSetEventsLoading] = createSignal(false);

  const [statefulSetStatus, setStatefulSetStatus] = createSignal<StatefulSetStatus | undefined>();
  const [statefulSetStatusLoading, setStatefulSetStatusLoading] = createSignal(false);

  const [contextError, setContextError] = createSignal<string>('');
  const [scaleDialogOpen, setScaleDialogOpen] = createSignal(false);

  let unsubscribeStatefulSetStream: (() => void) | undefined;

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

  const loadStatefulSets = async (ns: string) => {
    setStatefulSetsLoading(true);
    setStatefulSetsError('');
    try {
      const items = await fetchStatefulSets(ns);
      const sorted = sortStatefulSets(items);
      setStatefulSets(sorted);
    } catch (error) {
      console.error('Failed to load statefulsets', error);
      setStatefulSets([]);
      if (error instanceof ApiError) {
        setStatefulSetsError(error.message);
      } else {
        setStatefulSetsError('Failed to load statefulsets');
      }
    } finally {
      setStatefulSetsLoading(false);
    }
  };

  const loadStatefulSetDetail = async (ns: string, name: string) => {
    setStatefulSetDetailLoading(true);
    setStatefulSetEventsLoading(true);
    setStatefulSetStatusLoading(true);
    try {
      const [detail, manifestYaml, events, status] = await Promise.all([
        fetchStatefulSet(ns, name),
        fetchStatefulSetManifest(ns, name),
        fetchStatefulSetEvents(ns, name),
        fetchStatefulSetStatus(ns, name)
      ]);
      batch(() => {
        setStatefulSetDetail(detail);
        setManifest(manifestYaml);
        setStatefulSetEvents(events);
        setStatefulSetStatus(status);
      });
    } catch (error) {
      console.error('Failed to load statefulset detail', error);
      setStatefulSetDetail(undefined);
      setManifest('');
      setStatefulSetEvents([]);
      setStatefulSetStatus(undefined);
    } finally {
      setStatefulSetDetailLoading(false);
      setStatefulSetEventsLoading(false);
      setStatefulSetStatusLoading(false);
    }
  };

  createEffect(() => {
    const ns = namespace();
    const ctx = context();

    if (!ns || contextError()) return;
    if (contextStore.activeContext() !== ctx) return;

    setStatefulSetDetail(undefined);
    setManifest('');
    setStatefulSetEvents([]);
    setStatefulSetStatus(undefined);

    void loadStatefulSets(ns);

    if (unsubscribeStatefulSetStream) {
      unsubscribeStatefulSetStream();
    }

    unsubscribeStatefulSetStream = subscribeToStatefulSetEvents(
      ns,
      (event) => {
        setStatefulSets((prev) => sortStatefulSets(applyStatefulSetWatchEvent(prev, event)));
      },
      (error) => {
        console.error('StatefulSet stream error', error);
        setStatefulSetsError(error.message);
      }
    );
  });

  createEffect(() => {
    const ns = namespace();
    const name = resourceName();
    const ctx = context();

    if (!ns || !name || contextError()) return;
    if (contextStore.activeContext() !== ctx) return;

    void loadStatefulSetDetail(ns, name);
  });

  onCleanup(() => {
    unsubscribeStatefulSetStream?.();
  });

  const handleStatefulSetSelect = (statefulSet: StatefulSetListItem) => {
    const currentTab = tab();
    navigate(`/${encodeURIComponent(context())}/${encodeURIComponent(namespace())}/statefulsets/${encodeURIComponent(statefulSet.name)}/${currentTab}`);
  };

  const handleTabChange = (tabName: string) => {
    if (resourceName()) {
      navigate(`/${encodeURIComponent(context())}/${encodeURIComponent(namespace())}/statefulsets/${encodeURIComponent(resourceName()!)}/${tabName}`);
    }
  };

  const handleDeleteStatefulSet = async () => {
    const name = resourceName();
    const ns = namespace();
    if (!name || !ns) return;

    try {
      await deleteStatefulSet(ns, name);
      navigate(`/${encodeURIComponent(context())}/${encodeURIComponent(ns)}/statefulsets`);
    } catch (error) {
      console.error('Failed to delete statefulset', error);
      if (error instanceof ApiError) {
        setStatefulSetsError(error.message);
      } else {
        setStatefulSetsError('Failed to delete statefulset');
      }
    }
  };

  const handleRestartStatefulSet = async () => {
    const name = resourceName();
    const ns = namespace();
    if (!name || !ns) return;

    await restartStatefulSet(ns, name);
    await loadStatefulSetDetail(ns, name);
  };

  const handleScaleStatefulSet = async (replicas: number) => {
    const name = resourceName();
    const ns = namespace();
    if (!name || !ns) return;

    await scaleStatefulSet(ns, name, replicas);
    await loadStatefulSetDetail(ns, name);
  };

  const statefulSetActions = (): ResourceAction[] => {
    if (!resourceName()) return [];

    return [
      {
        label: 'Scale',
        variant: 'primary',
        icon: 'M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4',
        onClick: () => { setScaleDialogOpen(true); }
      },
      {
        label: 'Restart',
        variant: 'warning',
        icon: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
        onClick: handleRestartStatefulSet,
        confirm: {
          title: 'Restart StatefulSet',
          message: `Are you sure you want to restart statefulset "${resourceName()}"? This will recreate all managed pods.`
        }
      },
      {
        label: 'Delete',
        variant: 'error',
        icon: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
        onClick: handleDeleteStatefulSet,
        confirm: {
          title: 'Delete StatefulSet',
          message: `Are you sure you want to delete statefulset "${resourceName()}"? This will delete all managed pods. This action cannot be undone.`
        }
      }
    ];
  };

  if (contextError()) {
    return (
      <main class="p-6">
        <div class="alert alert-error max-w-xl">
          <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{contextError()}</span>
        </div>
      </main>
    );
  }

  return (
    <main class="p-6">
      <div class="flex flex-col gap-6">
        <Show when={statefulSetsError()}>
          <div role="alert" class="alert alert-error">
            <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{statefulSetsError()}</span>
          </div>
        </Show>
        <section class="grid grid-cols-1 gap-6 xl:grid-cols-2 h-resource-panel">
          <div class="card bg-base-200/30 shadow-lg flex flex-col overflow-hidden">
            <div class="card-body flex-1 overflow-hidden">
              <div class="overflow-y-auto h-full">
                <StatefulSetTable
                  statefulSets={statefulSets()}
                  selectedStatefulSet={resourceName()}
                  loading={statefulSetsLoading()}
                  onSelect={handleStatefulSetSelect}
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
                </div>
                <ResourceActions actions={statefulSetActions()} />
              </div>
              <div class="divider my-0 flex-shrink-0" />
              <div class="p-6 flex-1 overflow-y-auto">
                <Switch>
                  <Match when={tab() === 'info'}>
                    <StatefulSetInfoPanel statefulSet={statefulSetDetail()} loading={statefulSetDetailLoading()} />
                  </Match>
                  <Match when={tab() === 'manifest'}>
                    <Show
                      when={!statefulSetDetailLoading()}
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
                    <StatefulSetEventsPanel events={statefulSetEvents()} loading={statefulSetEventsLoading()} />
                  </Match>
                  <Match when={tab() === 'status'}>
                    <StatefulSetStatusPanel status={statefulSetStatus()} loading={statefulSetStatusLoading()} />
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
        resourceKind="StatefulSet"
        currentReplicas={statefulSetDetail()?.replicas ?? 0}
        onClose={() => setScaleDialogOpen(false)}
        onScale={handleScaleStatefulSet}
      />
    </main>
  );
};

export default StatefulSetListPage;
