import { batch, createEffect, createSignal, Match, onCleanup, Switch } from 'solid-js';
import { useNavigate, useParams } from '@solidjs/router';
import ExternalSecretTable from '../components/ExternalSecretTable';
import ExternalSecretInfoPanel from '../components/ExternalSecretInfoPanel';
import ManifestViewer from '../components/ManifestViewer';
import ExternalSecretStatusPanel from '../components/ExternalSecretStatusPanel';
import ExternalSecretEventsPanel from '../components/ExternalSecretEventsPanel';
import ResourceActions, { type ResourceAction } from '../components/ResourceActions';
import { contextStore } from '../stores/contextStore';
import {
  ApiError,
  deleteExternalSecret,
  fetchExternalSecret,
  fetchExternalSecretEvents,
  fetchExternalSecretManifest,
  fetchExternalSecretStatus,
  fetchExternalSecrets,
  subscribeToExternalSecretEvents,
  type ExternalSecretDetail,
  type ExternalSecretEvent,
  type ExternalSecretListItem,
  type ExternalSecretStatus,
  type ExternalSecretWatchEvent
} from '../lib/api';
import ResourceListLayout from '../components/ResourceListLayout';

const applyExternalSecretWatchEvent = (externalsecrets: ExternalSecretListItem[], event: ExternalSecretWatchEvent): ExternalSecretListItem[] => {
  const { type, object } = event;
  switch (type) {
    case 'ADDED':
      return [...externalsecrets.filter((item) => item.name !== object.name), object];
    case 'MODIFIED':
      return externalsecrets.map((item) => (item.name === object.name ? object : item));
    case 'DELETED':
      return externalsecrets.filter((item) => item.name !== object.name);
    default:
      return externalsecrets;
  }
};

const sortExternalSecrets = (externalsecrets: ExternalSecretListItem[]) =>
  [...externalsecrets].sort((a, b) => a.name.localeCompare(b.name));

const ExternalSecretListPage = () => {
  const params = useParams<{ context: string; namespace: string; resourceName?: string; tab?: string }>();
  const navigate = useNavigate();

  const context = () => (params.context ? decodeURIComponent(params.context) : '');
  const namespace = () => (params.namespace ? decodeURIComponent(params.namespace) : '');
  const resourceName = () => (params.resourceName ? decodeURIComponent(params.resourceName) : undefined);
  const tab = () => params.tab || 'info';

  const [externalsecrets, setExternalSecrets] = createSignal<ExternalSecretListItem[]>([]);
  const [externalsecretsLoading, setExternalSecretsLoading] = createSignal(false);
  const [externalsecretsError, setExternalSecretsError] = createSignal<string>('');

  const [externalsecretDetail, setExternalSecretDetail] = createSignal<ExternalSecretDetail | undefined>();
  const [externalsecretDetailLoading, setExternalSecretDetailLoading] = createSignal(false);
  const [manifest, setManifest] = createSignal<string>('');

  const [externalsecretEvents, setExternalSecretEvents] = createSignal<ExternalSecretEvent[]>([]);
  const [externalsecretEventsLoading, setExternalSecretEventsLoading] = createSignal(false);

  const [externalsecretStatus, setExternalSecretStatus] = createSignal<ExternalSecretStatus | undefined>();
  const [externalsecretStatusLoading, setExternalSecretStatusLoading] = createSignal(false);

  const [contextError, setContextError] = createSignal<string>('');

  let unsubscribeExternalSecretStream: (() => void) | undefined;

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

  const loadExternalSecrets = async (ns: string) => {
    setExternalSecretsLoading(true);
    setExternalSecretsError('');
    try {
      const items = await fetchExternalSecrets(ns);
      setExternalSecrets(sortExternalSecrets(items));
    } catch (error) {
      console.error('Failed to load external secrets', error);
      setExternalSecrets([]);
      if (error instanceof ApiError) {
        setExternalSecretsError(error.message);
      } else {
        setExternalSecretsError('Failed to load external secrets');
      }
    } finally {
      setExternalSecretsLoading(false);
    }
  };

  const loadExternalSecretDetail = async (ns: string, name: string) => {
    setExternalSecretDetailLoading(true);
    setExternalSecretEventsLoading(true);
    setExternalSecretStatusLoading(true);
    try {
      const [detail, manifestYaml, events, status] = await Promise.all([
        fetchExternalSecret(ns, name),
        fetchExternalSecretManifest(ns, name),
        fetchExternalSecretEvents(ns, name),
        fetchExternalSecretStatus(ns, name)
      ]);
      batch(() => {
        setExternalSecretDetail(detail);
        setManifest(manifestYaml);
        setExternalSecretEvents(events);
        setExternalSecretStatus(status);
      });
    } catch (error) {
      console.error('Failed to load external secret detail', error);
      setExternalSecretDetail(undefined);
      setManifest('');
      setExternalSecretEvents([]);
      setExternalSecretStatus(undefined);
    } finally {
      setExternalSecretDetailLoading(false);
      setExternalSecretEventsLoading(false);
      setExternalSecretStatusLoading(false);
    }
  };

  createEffect(() => {
    const ctx = context();
    const ns = namespace();

    if (!ns || contextError()) return;
    if (contextStore.activeContext() !== ctx) return;

    setExternalSecretDetail(undefined);
    setManifest('');
    setExternalSecretEvents([]);
    setExternalSecretStatus(undefined);

    void loadExternalSecrets(ns);

    if (unsubscribeExternalSecretStream) {
      unsubscribeExternalSecretStream();
    }

    unsubscribeExternalSecretStream = subscribeToExternalSecretEvents(
      ns,
      (event) => {
        setExternalSecrets((prev) => sortExternalSecrets(applyExternalSecretWatchEvent(prev, event)));
      },
      (error) => {
        if (error) console.error('ExternalSecret stream error', error);
        setExternalSecretsError(error?.message ?? '');
      }
    );
  });

  createEffect(() => {
    const ctx = context();
    const ns = namespace();
    const name = resourceName();

    if (!ns || !name || contextError()) return;
    if (contextStore.activeContext() !== ctx) return;

    void loadExternalSecretDetail(ns, name);
  });

  onCleanup(() => {
    unsubscribeExternalSecretStream?.();
  });

  const handleExternalSecretSelect = (externalsecret: ExternalSecretListItem) => {
    const currentTab = tab();
    navigate(`/${encodeURIComponent(context())}/${encodeURIComponent(namespace())}/externalsecrets/${encodeURIComponent(externalsecret.name)}/${currentTab}`);
  };

  const handleTabChange = (tabName: string) => {
    if (resourceName()) {
      navigate(`/${encodeURIComponent(context())}/${encodeURIComponent(namespace())}/externalsecrets/${encodeURIComponent(resourceName()!)}/${tabName}`);
    }
  };

  const handleDeleteExternalSecret = async () => {
    const name = resourceName();
    const ns = namespace();
    if (!name || !ns) return;

    await deleteExternalSecret(ns, name);
    navigate(`/${encodeURIComponent(context())}/${encodeURIComponent(ns)}/externalsecrets`);
  };

  const externalsecretActions = (): ResourceAction[] => {
    if (!resourceName()) return [];

    return [
      {
        label: 'Delete',
        variant: 'error',
        icon: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
        onClick: handleDeleteExternalSecret,
        confirm: {
          title: 'Delete External Secret',
          message: `Are you sure you want to delete external secret "${resourceName()}"? This action cannot be undone.`
        }
      }
    ];
  };

  return (
    <ResourceListLayout contextError={contextError()} error={externalsecretsError()}>
          <div class="card bg-base-200/30 shadow-lg flex flex-col overflow-hidden">
            <div class="card-body flex-1 overflow-hidden">
              <div class="overflow-y-auto h-full">
                <ExternalSecretTable
                  externalsecrets={externalsecrets()}
                  selectedExternalSecret={resourceName()}
                  loading={externalsecretsLoading()}
                  onSelect={handleExternalSecretSelect}
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
                <ResourceActions actions={externalsecretActions()} />
              </div>
              <div class="divider my-0 flex-shrink-0" />
              <div class="p-6 flex-1 overflow-y-auto">
                <Switch>
                  <Match when={tab() === 'info'}>
                    <ExternalSecretInfoPanel externalsecret={externalsecretDetail()} loading={externalsecretDetailLoading()} />
                  </Match>
                  <Match when={tab() === 'manifest'}>
                    <ManifestViewer manifest={manifest()} loading={externalsecretDetailLoading()} />
                  </Match>
                  <Match when={tab() === 'events'}>
                    <ExternalSecretEventsPanel events={externalsecretEvents()} loading={externalsecretEventsLoading()} />
                  </Match>
                  <Match when={tab() === 'status'}>
                    <ExternalSecretStatusPanel status={externalsecretStatus()} loading={externalsecretStatusLoading()} />
                  </Match>
                </Switch>
              </div>
            </div>
          </div>
    </ResourceListLayout>
  );
};

export default ExternalSecretListPage;
