import { batch, createEffect, createSignal, Match, onCleanup, Show, Switch } from 'solid-js';
import { useNavigate, useParams } from '@solidjs/router';
import DaemonSetTable from '../components/DaemonSetTable';
import DaemonSetInfoPanel from '../components/DaemonSetInfoPanel';
import ManifestViewer from '../components/ManifestViewer';
import DaemonSetEventsPanel from '../components/DaemonSetEventsPanel';
import DaemonSetStatusPanel from '../components/DaemonSetStatusPanel';
import ResourceActions, { type ResourceAction } from '../components/ResourceActions';
import { contextStore } from '../stores/contextStore';
import {
  ApiError,
  deleteDaemonSet,
  fetchDaemonSet,
  fetchDaemonSetEvents,
  fetchDaemonSetManifest,
  fetchDaemonSetStatus,
  fetchDaemonSets,
  restartDaemonSet,
  subscribeToDaemonSetEvents,
  type DaemonSetDetail,
  type DaemonSetEvent,
  type DaemonSetListItem,
  type DaemonSetStatus,
  type DaemonSetWatchEvent
} from '../lib/api';

const applyDaemonSetWatchEvent = (daemonSets: DaemonSetListItem[], event: DaemonSetWatchEvent): DaemonSetListItem[] => {
  const { type, object } = event;
  switch (type) {
    case 'ADDED':
      return [...daemonSets.filter((item) => item.name !== object.name), object];
    case 'MODIFIED':
      return daemonSets.map((item) => (item.name === object.name ? object : item));
    case 'DELETED':
      return daemonSets.filter((item) => item.name !== object.name);
    default:
      return daemonSets;
  }
};

const sortDaemonSets = (daemonSets: DaemonSetListItem[]) =>
  [...daemonSets].sort((a, b) => a.name.localeCompare(b.name));

const DaemonSetListPage = () => {
  const params = useParams<{ context: string; namespace: string; resourceName?: string; tab?: string }>();
  const navigate = useNavigate();

  const context = () => (params.context ? decodeURIComponent(params.context) : '');
  const namespace = () => (params.namespace ? decodeURIComponent(params.namespace) : '');
  const resourceName = () => (params.resourceName ? decodeURIComponent(params.resourceName) : undefined);
  const tab = () => params.tab || 'info';

  const [daemonSets, setDaemonSets] = createSignal<DaemonSetListItem[]>([]);
  const [daemonSetsLoading, setDaemonSetsLoading] = createSignal(false);
  const [daemonSetsError, setDaemonSetsError] = createSignal<string>('');

  const [daemonSetDetail, setDaemonSetDetail] = createSignal<DaemonSetDetail | undefined>();
  const [daemonSetDetailLoading, setDaemonSetDetailLoading] = createSignal(false);
  const [manifest, setManifest] = createSignal<string>('');

  const [daemonSetEvents, setDaemonSetEvents] = createSignal<DaemonSetEvent[]>([]);
  const [daemonSetEventsLoading, setDaemonSetEventsLoading] = createSignal(false);

  const [daemonSetStatus, setDaemonSetStatus] = createSignal<DaemonSetStatus | undefined>();
  const [daemonSetStatusLoading, setDaemonSetStatusLoading] = createSignal(false);

  const [contextError, setContextError] = createSignal<string>('');

  let unsubscribeDaemonSetStream: (() => void) | undefined;

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

  const loadDaemonSets = async (ns: string) => {
    setDaemonSetsLoading(true);
    setDaemonSetsError('');
    try {
      const items = await fetchDaemonSets(ns);
      const sorted = sortDaemonSets(items);
      setDaemonSets(sorted);
    } catch (error) {
      console.error('Failed to load daemonsets', error);
      setDaemonSets([]);
      if (error instanceof ApiError) {
        setDaemonSetsError(error.message);
      } else {
        setDaemonSetsError('Failed to load daemonsets');
      }
    } finally {
      setDaemonSetsLoading(false);
    }
  };

  const loadDaemonSetDetail = async (ns: string, name: string) => {
    setDaemonSetDetailLoading(true);
    setDaemonSetEventsLoading(true);
    setDaemonSetStatusLoading(true);
    try {
      const [detail, manifestYaml, events, status] = await Promise.all([
        fetchDaemonSet(ns, name),
        fetchDaemonSetManifest(ns, name),
        fetchDaemonSetEvents(ns, name),
        fetchDaemonSetStatus(ns, name)
      ]);
      batch(() => {
        setDaemonSetDetail(detail);
        setManifest(manifestYaml);
        setDaemonSetEvents(events);
        setDaemonSetStatus(status);
      });
    } catch (error) {
      console.error('Failed to load daemonset detail', error);
      setDaemonSetDetail(undefined);
      setManifest('');
      setDaemonSetEvents([]);
      setDaemonSetStatus(undefined);
    } finally {
      setDaemonSetDetailLoading(false);
      setDaemonSetEventsLoading(false);
      setDaemonSetStatusLoading(false);
    }
  };

  createEffect(() => {
    const ns = namespace();
    const ctx = context();

    if (!ns || contextError()) return;
    if (contextStore.activeContext() !== ctx) return;

    setDaemonSetDetail(undefined);
    setManifest('');
    setDaemonSetEvents([]);
    setDaemonSetStatus(undefined);

    void loadDaemonSets(ns);

    if (unsubscribeDaemonSetStream) {
      unsubscribeDaemonSetStream();
    }

    unsubscribeDaemonSetStream = subscribeToDaemonSetEvents(
      ns,
      (event) => {
        setDaemonSets((prev) => sortDaemonSets(applyDaemonSetWatchEvent(prev, event)));
      },
      (error) => {
        console.error('DaemonSet stream error', error);
        setDaemonSetsError(error.message);
      }
    );
  });

  createEffect(() => {
    const ns = namespace();
    const name = resourceName();
    const ctx = context();

    if (!ns || !name || contextError()) return;
    if (contextStore.activeContext() !== ctx) return;

    void loadDaemonSetDetail(ns, name);
  });

  onCleanup(() => {
    unsubscribeDaemonSetStream?.();
  });

  const handleDaemonSetSelect = (daemonSet: DaemonSetListItem) => {
    const currentTab = tab();
    navigate(`/${encodeURIComponent(context())}/${encodeURIComponent(namespace())}/daemonsets/${encodeURIComponent(daemonSet.name)}/${currentTab}`);
  };

  const handleTabChange = (tabName: string) => {
    if (resourceName()) {
      navigate(`/${encodeURIComponent(context())}/${encodeURIComponent(namespace())}/daemonsets/${encodeURIComponent(resourceName()!)}/${tabName}`);
    }
  };

  const handleDeleteDaemonSet = async () => {
    const name = resourceName();
    const ns = namespace();
    if (!name || !ns) return;

    try {
      await deleteDaemonSet(ns, name);
      navigate(`/${encodeURIComponent(context())}/${encodeURIComponent(ns)}/daemonsets`);
    } catch (error) {
      console.error('Failed to delete daemonset', error);
      if (error instanceof ApiError) {
        setDaemonSetsError(error.message);
      } else {
        setDaemonSetsError('Failed to delete daemonset');
      }
    }
  };

  const handleRestartDaemonSet = async () => {
    const name = resourceName();
    const ns = namespace();
    if (!name || !ns) return;

    await restartDaemonSet(ns, name);
    await loadDaemonSetDetail(ns, name);
  };

  const daemonSetActions = (): ResourceAction[] => {
    if (!resourceName()) return [];

    return [
      {
        label: 'Restart',
        variant: 'warning',
        icon: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
        onClick: handleRestartDaemonSet,
        confirm: {
          title: 'Restart DaemonSet',
          message: `Are you sure you want to restart daemonset "${resourceName()}"? This will recreate all managed pods.`
        }
      },
      {
        label: 'Delete',
        variant: 'error',
        icon: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
        onClick: handleDeleteDaemonSet,
        confirm: {
          title: 'Delete DaemonSet',
          message: `Are you sure you want to delete daemonset "${resourceName()}"? This will delete all managed pods. This action cannot be undone.`
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
        <Show when={daemonSetsError()}>
          <div role="alert" class="alert alert-error">
            <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{daemonSetsError()}</span>
          </div>
        </Show>
        <section class="grid grid-cols-1 gap-6 xl:grid-cols-2 h-resource-panel">
          <div class="card bg-base-200/30 shadow-lg flex flex-col overflow-hidden">
            <div class="card-body flex-1 overflow-hidden">
              <div class="overflow-y-auto h-full">
                <DaemonSetTable
                  daemonSets={daemonSets()}
                  selectedDaemonSet={resourceName()}
                  loading={daemonSetsLoading()}
                  onSelect={handleDaemonSetSelect}
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
                <ResourceActions actions={daemonSetActions()} />
              </div>
              <div class="divider my-0 flex-shrink-0" />
              <div class="p-6 flex-1 overflow-y-auto">
                <Switch>
                  <Match when={tab() === 'info'}>
                    <DaemonSetInfoPanel daemonSet={daemonSetDetail()} loading={daemonSetDetailLoading()} />
                  </Match>
                  <Match when={tab() === 'manifest'}>
                    <ManifestViewer manifest={manifest()} loading={daemonSetDetailLoading()} />
                  </Match>
                  <Match when={tab() === 'events'}>
                    <DaemonSetEventsPanel events={daemonSetEvents()} loading={daemonSetEventsLoading()} />
                  </Match>
                  <Match when={tab() === 'status'}>
                    <DaemonSetStatusPanel status={daemonSetStatus()} loading={daemonSetStatusLoading()} />
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

export default DaemonSetListPage;
