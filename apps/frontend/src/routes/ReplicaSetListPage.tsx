import { batch, createEffect, createSignal, Match, onCleanup, Show, Switch } from 'solid-js';
import { useNavigate, useParams } from '@solidjs/router';
import ManifestViewer from '../components/ManifestViewer';
import ReplicaSetTable from '../components/ReplicaSetTable';
import ReplicaSetInfoPanel from '../components/ReplicaSetInfoPanel';
import ResourceActions, { type ResourceAction } from '../components/ResourceActions';
import { contextStore } from '../stores/contextStore';
import {
  ApiError,
  deleteReplicaSet,
  fetchReplicaSet,
  fetchReplicaSetManifest,
  fetchReplicaSets,
  subscribeToReplicaSetEvents,
  type ReplicaSetDetail,
  type ReplicaSetListItem,
  type ReplicaSetWatchEvent
} from '../lib/api';

const applyReplicaSetWatchEvent = (replicaSets: ReplicaSetListItem[], event: ReplicaSetWatchEvent): ReplicaSetListItem[] => {
  const { type, object } = event;
  switch (type) {
    case 'ADDED':
      return [...replicaSets.filter((rs) => rs.name !== object.name), object];
    case 'MODIFIED':
      return replicaSets.map((rs) => (rs.name === object.name ? object : rs));
    case 'DELETED':
      return replicaSets.filter((rs) => rs.name !== object.name);
    default:
      return replicaSets;
  }
};

const sortReplicaSets = (replicaSets: ReplicaSetListItem[]) =>
  [...replicaSets].sort((a, b) => a.name.localeCompare(b.name));

const ReplicaSetListPage = () => {
  const params = useParams<{ context: string; namespace: string; resourceName?: string; tab?: string }>();
  const navigate = useNavigate();

  const context = () => (params.context ? decodeURIComponent(params.context) : '');
  const namespace = () => (params.namespace ? decodeURIComponent(params.namespace) : '');
  const resourceName = () => (params.resourceName ? decodeURIComponent(params.resourceName) : undefined);
  const tab = () => params.tab || 'info';

  const [replicaSets, setReplicaSets] = createSignal<ReplicaSetListItem[]>([]);
  const [replicaSetsLoading, setReplicaSetsLoading] = createSignal(false);
  const [replicaSetsError, setReplicaSetsError] = createSignal<string>('');

  const [replicaSetDetail, setReplicaSetDetail] = createSignal<ReplicaSetDetail | undefined>();
  const [replicaSetDetailLoading, setReplicaSetDetailLoading] = createSignal(false);
  const [manifest, setManifest] = createSignal<string>('');

  const [contextError, setContextError] = createSignal<string>('');

  let unsubscribeReplicaSetStream: (() => void) | undefined;

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

  const loadReplicaSets = async (ns: string) => {
    setReplicaSetsLoading(true);
    setReplicaSetsError('');
    try {
      const items = await fetchReplicaSets(ns);
      setReplicaSets(sortReplicaSets(items));
    } catch (error) {
      console.error('Failed to load replicasets', error);
      setReplicaSets([]);
      if (error instanceof ApiError) {
        setReplicaSetsError(error.message);
      } else {
        setReplicaSetsError('Failed to load replicasets');
      }
    } finally {
      setReplicaSetsLoading(false);
    }
  };

  const loadReplicaSetDetail = async (ns: string, name: string) => {
    setReplicaSetDetailLoading(true);
    try {
      const [detail, manifestYaml] = await Promise.all([
        fetchReplicaSet(ns, name),
        fetchReplicaSetManifest(ns, name)
      ]);
      batch(() => {
        setReplicaSetDetail(detail);
        setManifest(manifestYaml);
      });
    } catch (error) {
      console.error('Failed to load replicaset detail', error);
      setReplicaSetDetail(undefined);
      setManifest('');
    } finally {
      setReplicaSetDetailLoading(false);
    }
  };

  createEffect(() => {
    const ns = namespace();
    const ctx = context();

    if (!ns || contextError()) return;
    if (contextStore.activeContext() !== ctx) return;

    setReplicaSetDetail(undefined);
    setManifest('');

    void loadReplicaSets(ns);

    if (unsubscribeReplicaSetStream) {
      unsubscribeReplicaSetStream();
    }

    unsubscribeReplicaSetStream = subscribeToReplicaSetEvents(
      ns,
      (event) => {
        setReplicaSets((prev) => sortReplicaSets(applyReplicaSetWatchEvent(prev, event)));
      },
      (error) => {
        if (error) console.error('ReplicaSet stream error', error);
        setReplicaSetsError(error?.message ?? '');
      }
    );
  });

  createEffect(() => {
    const ns = namespace();
    const name = resourceName();
    const ctx = context();

    if (!ns || !name || contextError()) return;
    if (contextStore.activeContext() !== ctx) return;

    void loadReplicaSetDetail(ns, name);
  });

  onCleanup(() => {
    unsubscribeReplicaSetStream?.();
  });

  const handleReplicaSetSelect = (rs: ReplicaSetListItem) => {
    const currentTab = tab();
    navigate(`/${encodeURIComponent(context())}/${encodeURIComponent(namespace())}/replicasets/${encodeURIComponent(rs.name)}/${currentTab}`);
  };

  const handleTabChange = (tabName: string) => {
    if (resourceName()) {
      navigate(`/${encodeURIComponent(context())}/${encodeURIComponent(namespace())}/replicasets/${encodeURIComponent(resourceName()!)}/${tabName}`);
    }
  };

  const handleDeleteReplicaSet = async () => {
    const name = resourceName();
    const ns = namespace();
    if (!name || !ns) return;

    try {
      await deleteReplicaSet(ns, name);
      navigate(`/${encodeURIComponent(context())}/${encodeURIComponent(ns)}/replicasets`);
    } catch (error) {
      console.error('Failed to delete replicaset', error);
      if (error instanceof ApiError) {
        setReplicaSetsError(error.message);
      } else {
        setReplicaSetsError('Failed to delete replicaset');
      }
    }
  };

  const replicaSetActions = (): ResourceAction[] => {
    if (!resourceName()) return [];

    return [
      {
        label: 'Delete',
        variant: 'error',
        icon: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
        onClick: handleDeleteReplicaSet,
        confirm: {
          title: 'Delete ReplicaSet',
          message: `Are you sure you want to delete replicaset "${resourceName()}"? This will delete all managed pods. This action cannot be undone.`
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
        <Show when={replicaSetsError()}>
          <div role="alert" class="alert alert-error">
            <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{replicaSetsError()}</span>
          </div>
        </Show>
        <section class="grid grid-cols-1 gap-6 xl:grid-cols-2 h-resource-panel">
          <div class="card bg-base-200/30 shadow-lg flex flex-col overflow-hidden">
            <div class="card-body flex-1 overflow-hidden">
              <div class="overflow-y-auto h-full">
                <ReplicaSetTable
                  replicaSets={replicaSets()}
                  selectedReplicaSet={resourceName()}
                  loading={replicaSetsLoading()}
                  onSelect={handleReplicaSetSelect}
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
                <ResourceActions actions={replicaSetActions()} />
              </div>
              <div class="divider my-0 flex-shrink-0" />
              <div class="p-6 flex-1 overflow-y-auto">
                <Switch>
                  <Match when={tab() === 'info'}>
                    <ReplicaSetInfoPanel replicaSet={replicaSetDetail()} loading={replicaSetDetailLoading()} />
                  </Match>
                  <Match when={tab() === 'manifest'}>
                    <ManifestViewer manifest={manifest()} loading={replicaSetDetailLoading()} />
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

export default ReplicaSetListPage;
