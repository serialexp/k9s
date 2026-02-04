import { batch, createEffect, createSignal, Match, onCleanup, Show, Switch } from 'solid-js';
import { useNavigate, useParams } from '@solidjs/router';
import ManifestViewer from '../components/ManifestViewer';
import SecretStoreTable from '../components/SecretStoreTable';
import SecretStoreInfoPanel from '../components/SecretStoreInfoPanel';
import SecretStoreStatusPanel from '../components/SecretStoreStatusPanel';
import SecretStoreEventsPanel from '../components/SecretStoreEventsPanel';
import ResourceActions, { type ResourceAction } from '../components/ResourceActions';
import { contextStore } from '../stores/contextStore';
import {
  ApiError,
  deleteSecretStore,
  fetchSecretStore,
  fetchSecretStoreEvents,
  fetchSecretStoreManifest,
  fetchSecretStoreStatus,
  fetchSecretStores,
  subscribeToSecretStoreEvents,
  type SecretStoreDetail,
  type SecretStoreEvent,
  type SecretStoreListItem,
  type SecretStoreStatus,
  type SecretStoreWatchEvent
} from '../lib/api';

const applySecretStoreWatchEvent = (secretstores: SecretStoreListItem[], event: SecretStoreWatchEvent): SecretStoreListItem[] => {
  const { type, object } = event;
  switch (type) {
    case 'ADDED':
      return [...secretstores.filter((item) => item.name !== object.name), object];
    case 'MODIFIED':
      return secretstores.map((item) => (item.name === object.name ? object : item));
    case 'DELETED':
      return secretstores.filter((item) => item.name !== object.name);
    default:
      return secretstores;
  }
};

const sortSecretStores = (secretstores: SecretStoreListItem[]) =>
  [...secretstores].sort((a, b) => a.name.localeCompare(b.name));

const SecretStoreListPage = () => {
  const params = useParams<{ context: string; namespace: string; resourceName?: string; tab?: string }>();
  const navigate = useNavigate();

  const context = () => (params.context ? decodeURIComponent(params.context) : '');
  const namespace = () => (params.namespace ? decodeURIComponent(params.namespace) : '');
  const resourceName = () => (params.resourceName ? decodeURIComponent(params.resourceName) : undefined);
  const tab = () => params.tab || 'info';

  const [secretstores, setSecretStores] = createSignal<SecretStoreListItem[]>([]);
  const [secretstoresLoading, setSecretStoresLoading] = createSignal(false);
  const [secretstoresError, setSecretStoresError] = createSignal<string>('');

  const [secretstoreDetail, setSecretStoreDetail] = createSignal<SecretStoreDetail | undefined>();
  const [secretstoreDetailLoading, setSecretStoreDetailLoading] = createSignal(false);
  const [manifest, setManifest] = createSignal<string>('');

  const [secretstoreEvents, setSecretStoreEvents] = createSignal<SecretStoreEvent[]>([]);
  const [secretstoreEventsLoading, setSecretStoreEventsLoading] = createSignal(false);

  const [secretstoreStatus, setSecretStoreStatus] = createSignal<SecretStoreStatus | undefined>();
  const [secretstoreStatusLoading, setSecretStoreStatusLoading] = createSignal(false);

  const [contextError, setContextError] = createSignal<string>('');

  let unsubscribeSecretStoreStream: (() => void) | undefined;

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

  const loadSecretStores = async (ns: string) => {
    setSecretStoresLoading(true);
    setSecretStoresError('');
    try {
      const items = await fetchSecretStores(ns);
      setSecretStores(sortSecretStores(items));
    } catch (error) {
      console.error('Failed to load secret stores', error);
      setSecretStores([]);
      if (error instanceof ApiError) {
        setSecretStoresError(error.message);
      } else {
        setSecretStoresError('Failed to load secret stores');
      }
    } finally {
      setSecretStoresLoading(false);
    }
  };

  const loadSecretStoreDetail = async (ns: string, name: string) => {
    setSecretStoreDetailLoading(true);
    setSecretStoreEventsLoading(true);
    setSecretStoreStatusLoading(true);
    try {
      const [detail, manifestYaml, events, status] = await Promise.all([
        fetchSecretStore(ns, name),
        fetchSecretStoreManifest(ns, name),
        fetchSecretStoreEvents(ns, name),
        fetchSecretStoreStatus(ns, name)
      ]);
      batch(() => {
        setSecretStoreDetail(detail);
        setManifest(manifestYaml);
        setSecretStoreEvents(events);
        setSecretStoreStatus(status);
      });
    } catch (error) {
      console.error('Failed to load secret store detail', error);
      setSecretStoreDetail(undefined);
      setManifest('');
      setSecretStoreEvents([]);
      setSecretStoreStatus(undefined);
    } finally {
      setSecretStoreDetailLoading(false);
      setSecretStoreEventsLoading(false);
      setSecretStoreStatusLoading(false);
    }
  };

  createEffect(() => {
    const ctx = context();
    const ns = namespace();

    if (!ns || contextError()) return;
    if (contextStore.activeContext() !== ctx) return;

    setSecretStoreDetail(undefined);
    setManifest('');
    setSecretStoreEvents([]);
    setSecretStoreStatus(undefined);

    void loadSecretStores(ns);

    if (unsubscribeSecretStoreStream) {
      unsubscribeSecretStoreStream();
    }

    unsubscribeSecretStoreStream = subscribeToSecretStoreEvents(
      ns,
      (event) => {
        setSecretStores((prev) => sortSecretStores(applySecretStoreWatchEvent(prev, event)));
      },
      (error) => {
        console.error('SecretStore stream error', error);
        setSecretStoresError(error.message);
      }
    );
  });

  createEffect(() => {
    const ctx = context();
    const ns = namespace();
    const name = resourceName();

    if (!ns || !name || contextError()) return;
    if (contextStore.activeContext() !== ctx) return;

    void loadSecretStoreDetail(ns, name);
  });

  onCleanup(() => {
    unsubscribeSecretStoreStream?.();
  });

  const handleSecretStoreSelect = (secretstore: SecretStoreListItem) => {
    const currentTab = tab();
    navigate(`/${encodeURIComponent(context())}/${encodeURIComponent(namespace())}/secretstores/${encodeURIComponent(secretstore.name)}/${currentTab}`);
  };

  const handleTabChange = (tabName: string) => {
    if (resourceName()) {
      navigate(`/${encodeURIComponent(context())}/${encodeURIComponent(namespace())}/secretstores/${encodeURIComponent(resourceName()!)}/${tabName}`);
    }
  };

  const handleDeleteSecretStore = async () => {
    const name = resourceName();
    const ns = namespace();
    if (!name || !ns) return;

    await deleteSecretStore(ns, name);
    navigate(`/${encodeURIComponent(context())}/${encodeURIComponent(ns)}/secretstores`);
  };

  const secretstoreActions = (): ResourceAction[] => {
    if (!resourceName()) return [];

    return [
      {
        label: 'Delete',
        variant: 'error',
        icon: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
        onClick: handleDeleteSecretStore,
        confirm: {
          title: 'Delete Secret Store',
          message: `Are you sure you want to delete secret store "${resourceName()}"? This action cannot be undone.`
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
        <Show when={secretstoresError()}>
          <div role="alert" class="alert alert-error">
            <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{secretstoresError()}</span>
          </div>
        </Show>
        <section class="grid grid-cols-1 gap-6 xl:grid-cols-2 h-resource-panel">
          <div class="card bg-base-200/30 shadow-lg flex flex-col overflow-hidden">
            <div class="card-body flex-1 overflow-hidden">
              <div class="overflow-y-auto h-full">
                <SecretStoreTable
                  secretstores={secretstores()}
                  selectedSecretStore={resourceName()}
                  loading={secretstoresLoading()}
                  onSelect={handleSecretStoreSelect}
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
                <ResourceActions actions={secretstoreActions()} />
              </div>
              <div class="divider my-0 flex-shrink-0" />
              <div class="p-6 flex-1 overflow-y-auto">
                <Switch>
                  <Match when={tab() === 'info'}>
                    <SecretStoreInfoPanel secretstore={secretstoreDetail()} loading={secretstoreDetailLoading()} />
                  </Match>
                  <Match when={tab() === 'manifest'}>
                    <ManifestViewer manifest={manifest()} loading={secretstoreDetailLoading()} />
                  </Match>
                  <Match when={tab() === 'events'}>
                    <SecretStoreEventsPanel events={secretstoreEvents()} loading={secretstoreEventsLoading()} />
                  </Match>
                  <Match when={tab() === 'status'}>
                    <SecretStoreStatusPanel status={secretstoreStatus()} loading={secretstoreStatusLoading()} />
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

export default SecretStoreListPage;
