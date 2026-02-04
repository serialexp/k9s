import { batch, createEffect, createSignal, Match, onCleanup, Show, Switch } from 'solid-js';
import { useNavigate, useParams } from '@solidjs/router';
import ManifestViewer from '../components/ManifestViewer';
import RolloutTable from '../components/RolloutTable';
import RolloutInfoPanel from '../components/RolloutInfoPanel';
import RolloutEventsPanel from '../components/RolloutEventsPanel';
import RolloutStatusPanel from '../components/RolloutStatusPanel';
import ResourceActions, { type ResourceAction } from '../components/ResourceActions';
import { contextStore } from '../stores/contextStore';
import {
  ApiError,
  deleteRollout,
  fetchRollout,
  fetchRolloutEvents,
  fetchRolloutManifest,
  fetchRolloutStatus,
  fetchRollouts,
  subscribeToRolloutEvents,
  type RolloutDetail,
  type RolloutEvent,
  type RolloutListItem,
  type RolloutStatus,
  type RolloutWatchEvent
} from '../lib/api';

const applyRolloutWatchEvent = (rollouts: RolloutListItem[], event: RolloutWatchEvent): RolloutListItem[] => {
  const { type, object } = event;
  switch (type) {
    case 'ADDED':
      return [...rollouts.filter((rollout) => rollout.name !== object.name), object];
    case 'MODIFIED':
      return rollouts.map((rollout) => (rollout.name === object.name ? object : rollout));
    case 'DELETED':
      return rollouts.filter((rollout) => rollout.name !== object.name);
    default:
      return rollouts;
  }
};

const sortRollouts = (rollouts: RolloutListItem[]) =>
  [...rollouts].sort((a, b) => a.name.localeCompare(b.name));

const RolloutListPage = () => {
  const params = useParams<{ context: string; namespace: string; resourceName?: string; tab?: string }>();
  const navigate = useNavigate();

  const context = () => (params.context ? decodeURIComponent(params.context) : '');
  const namespace = () => (params.namespace ? decodeURIComponent(params.namespace) : '');
  const resourceName = () => (params.resourceName ? decodeURIComponent(params.resourceName) : undefined);
  const tab = () => params.tab || 'info';

  const [rollouts, setRollouts] = createSignal<RolloutListItem[]>([]);
  const [rolloutsLoading, setRolloutsLoading] = createSignal(false);
  const [rolloutsError, setRolloutsError] = createSignal<string>('');

  const [rolloutDetail, setRolloutDetail] = createSignal<RolloutDetail | undefined>();
  const [rolloutDetailLoading, setRolloutDetailLoading] = createSignal(false);
  const [manifest, setManifest] = createSignal<string>('');

  const [rolloutEvents, setRolloutEvents] = createSignal<RolloutEvent[]>([]);
  const [rolloutEventsLoading, setRolloutEventsLoading] = createSignal(false);

  const [rolloutStatus, setRolloutStatus] = createSignal<RolloutStatus | undefined>();
  const [rolloutStatusLoading, setRolloutStatusLoading] = createSignal(false);

  const [contextError, setContextError] = createSignal<string>('');

  let unsubscribeRolloutStream: (() => void) | undefined;

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

  const loadRollouts = async (ns: string) => {
    setRolloutsLoading(true);
    setRolloutsError('');
    try {
      const items = await fetchRollouts(ns);
      setRollouts(sortRollouts(items));
    } catch (error) {
      console.error('Failed to load rollouts', error);
      setRollouts([]);
      if (error instanceof ApiError) {
        setRolloutsError(error.message);
      } else {
        setRolloutsError('Failed to load rollouts');
      }
    } finally {
      setRolloutsLoading(false);
    }
  };

  const loadRolloutDetail = async (ns: string, name: string) => {
    setRolloutDetailLoading(true);
    setRolloutEventsLoading(true);
    setRolloutStatusLoading(true);
    try {
      const [detail, manifestYaml, events, status] = await Promise.all([
        fetchRollout(ns, name),
        fetchRolloutManifest(ns, name),
        fetchRolloutEvents(ns, name),
        fetchRolloutStatus(ns, name)
      ]);
      batch(() => {
        setRolloutDetail(detail);
        setManifest(manifestYaml);
        setRolloutEvents(events);
        setRolloutStatus(status);
      });
    } catch (error) {
      console.error('Failed to load rollout detail', error);
      setRolloutDetail(undefined);
      setManifest('');
      setRolloutEvents([]);
      setRolloutStatus(undefined);
    } finally {
      setRolloutDetailLoading(false);
      setRolloutEventsLoading(false);
      setRolloutStatusLoading(false);
    }
  };

  createEffect(() => {
    const ctx = context();
    const ns = namespace();

    if (!ns || contextError()) return;
    if (contextStore.activeContext() !== ctx) return;

    setRolloutDetail(undefined);
    setManifest('');
    setRolloutEvents([]);
    setRolloutStatus(undefined);

    void loadRollouts(ns);

    if (unsubscribeRolloutStream) {
      unsubscribeRolloutStream();
    }

    unsubscribeRolloutStream = subscribeToRolloutEvents(
      ns,
      (event) => {
        setRollouts((prev) => sortRollouts(applyRolloutWatchEvent(prev, event)));
      },
      (error) => {
        console.error('Rollout stream error', error);
        setRolloutsError(error.message);
      }
    );
  });

  createEffect(() => {
    const ctx = context();
    const ns = namespace();
    const name = resourceName();

    if (!ns || !name || contextError()) return;
    if (contextStore.activeContext() !== ctx) return;

    void loadRolloutDetail(ns, name);
  });

  onCleanup(() => {
    unsubscribeRolloutStream?.();
  });

  const handleRolloutSelect = (rollout: RolloutListItem) => {
    const currentTab = tab();
    navigate(`/${encodeURIComponent(context())}/${encodeURIComponent(namespace())}/rollouts/${encodeURIComponent(rollout.name)}/${currentTab}`);
  };

  const handleTabChange = (tabName: string) => {
    if (resourceName()) {
      navigate(`/${encodeURIComponent(context())}/${encodeURIComponent(namespace())}/rollouts/${encodeURIComponent(resourceName()!)}/${tabName}`);
    }
  };

  const handleDeleteRollout = async () => {
    const name = resourceName();
    const ns = namespace();
    if (!name || !ns) return;

    await deleteRollout(ns, name);
    navigate(`/${encodeURIComponent(context())}/${encodeURIComponent(ns)}/rollouts`);
  };

  const rolloutActions = (): ResourceAction[] => {
    if (!resourceName()) return [];

    return [
      {
        label: 'Delete',
        variant: 'error',
        icon: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
        onClick: handleDeleteRollout,
        confirm: {
          title: 'Delete Rollout',
          message: `Are you sure you want to delete rollout "${resourceName()}"? This action cannot be undone.`
        }
      }
    ];
  };

  const selectedRollout = () => rollouts().find((rollout) => rollout.name === resourceName());

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
        <Show when={rolloutsError()}>
          <div role="alert" class="alert alert-error">
            <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{rolloutsError()}</span>
          </div>
        </Show>
        <section class="grid grid-cols-1 gap-6 xl:grid-cols-2 h-resource-panel">
          <div class="card bg-base-200/30 shadow-lg flex flex-col overflow-hidden">
            <div class="card-body flex-1 overflow-hidden">
              <div class="overflow-y-auto h-full">
                <RolloutTable
                  rollouts={rollouts()}
                  selectedRollout={resourceName()}
                  loading={rolloutsLoading()}
                  onSelect={handleRolloutSelect}
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
                <ResourceActions actions={rolloutActions()} />
              </div>
              <div class="divider my-0 flex-shrink-0" />
              <div class="p-6 flex-1 overflow-y-auto">
                <Switch>
                  <Match when={tab() === 'info'}>
                    <RolloutInfoPanel rollout={rolloutDetail()} loading={rolloutDetailLoading()} />
                  </Match>
                  <Match when={tab() === 'manifest'}>
                    <ManifestViewer manifest={manifest()} loading={rolloutDetailLoading()} />
                  </Match>
                  <Match when={tab() === 'events'}>
                    <RolloutEventsPanel events={rolloutEvents()} loading={rolloutEventsLoading()} />
                  </Match>
                  <Match when={tab() === 'status'}>
                    <RolloutStatusPanel status={rolloutStatus()} loading={rolloutStatusLoading()} />
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

export default RolloutListPage;
