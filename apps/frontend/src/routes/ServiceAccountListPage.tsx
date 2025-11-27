import { batch, createEffect, createSignal, Match, onCleanup, Show, Switch } from 'solid-js';
import { useNavigate, useParams } from '@solidjs/router';
import ServiceAccountTable from '../components/ServiceAccountTable';
import ServiceAccountInfoPanel from '../components/ServiceAccountInfoPanel';
import ResourceActions, { type ResourceAction } from '../components/ResourceActions';
import { contextStore } from '../stores/contextStore';
import {
  ApiError,
  deleteServiceAccount,
  fetchServiceAccount,
  fetchServiceAccountManifest,
  fetchServiceAccounts,
  subscribeToServiceAccountEvents,
  type ServiceAccountDetail,
  type ServiceAccountListItem,
  type ServiceAccountWatchEvent
} from '../lib/api';

const applyServiceAccountWatchEvent = (serviceAccounts: ServiceAccountListItem[], event: ServiceAccountWatchEvent): ServiceAccountListItem[] => {
  const { type, object } = event;
  switch (type) {
    case 'ADDED':
      return [...serviceAccounts.filter((item) => item.name !== object.name), object];
    case 'MODIFIED':
      return serviceAccounts.map((item) => (item.name === object.name ? object : item));
    case 'DELETED':
      return serviceAccounts.filter((item) => item.name !== object.name);
    default:
      return serviceAccounts;
  }
};

const sortServiceAccounts = (serviceAccounts: ServiceAccountListItem[]) =>
  [...serviceAccounts].sort((a, b) => a.name.localeCompare(b.name));

const ServiceAccountListPage = () => {
  const params = useParams<{ context: string; namespace: string; resourceName?: string; tab?: string }>();
  const navigate = useNavigate();

  const context = () => (params.context ? decodeURIComponent(params.context) : '');
  const namespace = () => (params.namespace ? decodeURIComponent(params.namespace) : '');
  const resourceName = () => (params.resourceName ? decodeURIComponent(params.resourceName) : undefined);
  const tab = () => params.tab || 'info';

  const [serviceAccounts, setServiceAccounts] = createSignal<ServiceAccountListItem[]>([]);
  const [serviceAccountsLoading, setServiceAccountsLoading] = createSignal(false);
  const [serviceAccountsError, setServiceAccountsError] = createSignal<string>('');

  const [serviceAccountDetail, setServiceAccountDetail] = createSignal<ServiceAccountDetail | undefined>();
  const [serviceAccountDetailLoading, setServiceAccountDetailLoading] = createSignal(false);
  const [manifest, setManifest] = createSignal<string>('');

  const [contextError, setContextError] = createSignal<string>('');

  let unsubscribeServiceAccountStream: (() => void) | undefined;

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

  const loadServiceAccounts = async (ns: string) => {
    setServiceAccountsLoading(true);
    setServiceAccountsError('');
    try {
      const items = await fetchServiceAccounts(ns);
      const sorted = sortServiceAccounts(items);
      setServiceAccounts(sorted);
    } catch (error) {
      console.error('Failed to load service accounts', error);
      setServiceAccounts([]);
      if (error instanceof ApiError) {
        setServiceAccountsError(error.message);
      } else {
        setServiceAccountsError('Failed to load service accounts');
      }
    } finally {
      setServiceAccountsLoading(false);
    }
  };

  const loadServiceAccountDetail = async (ns: string, name: string) => {
    setServiceAccountDetailLoading(true);
    try {
      const [detail, manifestYaml] = await Promise.all([
        fetchServiceAccount(ns, name),
        fetchServiceAccountManifest(ns, name)
      ]);
      batch(() => {
        setServiceAccountDetail(detail);
        setManifest(manifestYaml);
      });
    } catch (error) {
      console.error('Failed to load service account detail', error);
      setServiceAccountDetail(undefined);
      setManifest('');
    } finally {
      setServiceAccountDetailLoading(false);
    }
  };

  createEffect(() => {
    const ns = namespace();
    const ctx = context();

    if (!ns || contextError()) return;
    if (contextStore.activeContext() !== ctx) return;

    setServiceAccountDetail(undefined);
    setManifest('');

    void loadServiceAccounts(ns);

    if (unsubscribeServiceAccountStream) {
      unsubscribeServiceAccountStream();
    }

    unsubscribeServiceAccountStream = subscribeToServiceAccountEvents(
      ns,
      (event) => {
        setServiceAccounts((prev) => sortServiceAccounts(applyServiceAccountWatchEvent(prev, event)));
      },
      (error) => {
        console.error('ServiceAccount stream error', error);
        setServiceAccountsError(error.message);
      }
    );
  });

  createEffect(() => {
    const ns = namespace();
    const name = resourceName();
    const ctx = context();

    if (!ns || !name || contextError()) return;
    if (contextStore.activeContext() !== ctx) return;

    void loadServiceAccountDetail(ns, name);
  });

  onCleanup(() => {
    unsubscribeServiceAccountStream?.();
  });

  const handleServiceAccountSelect = (serviceAccount: ServiceAccountListItem) => {
    const currentTab = tab();
    navigate(`/${encodeURIComponent(context())}/${encodeURIComponent(namespace())}/serviceaccounts/${encodeURIComponent(serviceAccount.name)}/${currentTab}`);
  };

  const handleTabChange = (tabName: string) => {
    if (resourceName()) {
      navigate(`/${encodeURIComponent(context())}/${encodeURIComponent(namespace())}/serviceaccounts/${encodeURIComponent(resourceName()!)}/${tabName}`);
    }
  };

  const handleDeleteServiceAccount = async () => {
    const name = resourceName();
    const ns = namespace();
    if (!name || !ns) return;

    try {
      await deleteServiceAccount(ns, name);
      navigate(`/${encodeURIComponent(context())}/${encodeURIComponent(ns)}/serviceaccounts`);
    } catch (error) {
      console.error('Failed to delete service account', error);
      if (error instanceof ApiError) {
        setServiceAccountsError(error.message);
      } else {
        setServiceAccountsError('Failed to delete service account');
      }
    }
  };

  const serviceAccountActions = (): ResourceAction[] => {
    if (!resourceName()) return [];

    return [
      {
        label: 'Delete',
        variant: 'error',
        icon: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
        onClick: handleDeleteServiceAccount,
        confirm: {
          title: 'Delete Service Account',
          message: `Are you sure you want to delete service account "${resourceName()}"? This action cannot be undone.`
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
        <Show when={serviceAccountsError()}>
          <div role="alert" class="alert alert-error">
            <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{serviceAccountsError()}</span>
          </div>
        </Show>
        <section class="grid grid-cols-1 gap-6 xl:grid-cols-2 h-resource-panel">
          <div class="card bg-base-200/30 shadow-lg flex flex-col overflow-hidden">
            <div class="card-body flex-1 overflow-hidden">
              <div class="overflow-y-auto h-full">
                <ServiceAccountTable
                  serviceAccounts={serviceAccounts()}
                  selectedServiceAccount={resourceName()}
                  loading={serviceAccountsLoading()}
                  onSelect={handleServiceAccountSelect}
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
                <ResourceActions actions={serviceAccountActions()} />
              </div>
              <div class="divider my-0 flex-shrink-0" />
              <div class="p-6 flex-1 overflow-y-auto">
                <Switch>
                  <Match when={tab() === 'info'}>
                    <ServiceAccountInfoPanel serviceAccount={serviceAccountDetail()} loading={serviceAccountDetailLoading()} />
                  </Match>
                  <Match when={tab() === 'manifest'}>
                    <Show
                      when={!serviceAccountDetailLoading()}
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
                </Switch>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
};

export default ServiceAccountListPage;
