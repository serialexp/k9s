// ABOUTME: List page for Istio Gateway resources
// ABOUTME: Shows table with real-time updates and detail panel with Info/Definition tabs
import { batch, createEffect, createSignal, Match, onCleanup, Show, Switch } from 'solid-js';
import { useNavigate, useParams } from '@solidjs/router';
import GatewayTable from '../components/GatewayTable';
import GatewayInfoPanel from '../components/GatewayInfoPanel';
import ManifestViewer from '../components/ManifestViewer';
import ResourceActions, { type ResourceAction } from '../components/ResourceActions';
import { contextStore } from '../stores/contextStore';
import {
  ApiError,
  deleteGateway,
  fetchGateway,
  fetchGatewayManifest,
  fetchGateways,
  subscribeToGatewayEvents,
  type GatewayDetail,
  type GatewayListItem,
  type GatewayWatchEvent
} from '../lib/api';

const applyGatewayWatchEvent = (items: GatewayListItem[], event: GatewayWatchEvent): GatewayListItem[] => {
  const { type, object } = event;
  switch (type) {
    case 'ADDED':
      return [...items.filter((item) => item.name !== object.name), object];
    case 'MODIFIED':
      return items.map((item) => (item.name === object.name ? object : item));
    case 'DELETED':
      return items.filter((item) => item.name !== object.name);
    default:
      return items;
  }
};

const sortGateways = (items: GatewayListItem[]) =>
  [...items].sort((a, b) => a.name.localeCompare(b.name));

const GatewayListPage = () => {
  const params = useParams<{ context: string; namespace: string; resourceName?: string; tab?: string }>();
  const navigate = useNavigate();

  const context = () => (params.context ? decodeURIComponent(params.context) : '');
  const namespace = () => (params.namespace ? decodeURIComponent(params.namespace) : '');
  const resourceName = () => (params.resourceName ? decodeURIComponent(params.resourceName) : undefined);
  const tab = () => params.tab || 'info';

  const [gateways, setGateways] = createSignal<GatewayListItem[]>([]);
  const [gatewaysLoading, setGatewaysLoading] = createSignal(false);
  const [gatewaysError, setGatewaysError] = createSignal<string>('');

  const [gatewayDetail, setGatewayDetail] = createSignal<GatewayDetail | undefined>();
  const [gatewayDetailLoading, setGatewayDetailLoading] = createSignal(false);
  const [manifest, setManifest] = createSignal<string>('');

  const [contextError, setContextError] = createSignal<string>('');

  let unsubscribeStream: (() => void) | undefined;

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

  const loadGateways = async (ns: string) => {
    setGatewaysLoading(true);
    setGatewaysError('');
    try {
      const items = await fetchGateways(ns);
      setGateways(sortGateways(items));
    } catch (error) {
      console.error('Failed to load gateways', error);
      setGateways([]);
      if (error instanceof ApiError) {
        setGatewaysError(error.message);
      } else {
        setGatewaysError('Failed to load gateways');
      }
    } finally {
      setGatewaysLoading(false);
    }
  };

  const loadGatewayDetail = async (ns: string, name: string) => {
    setGatewayDetailLoading(true);
    try {
      const [detail, manifestYaml] = await Promise.all([
        fetchGateway(ns, name),
        fetchGatewayManifest(ns, name)
      ]);
      batch(() => {
        setGatewayDetail(detail);
        setManifest(manifestYaml);
      });
    } catch (error) {
      console.error('Failed to load gateway detail', error);
      setGatewayDetail(undefined);
      setManifest('');
    } finally {
      setGatewayDetailLoading(false);
    }
  };

  createEffect(() => {
    const ns = namespace();
    const ctx = context();

    if (!ns || contextError()) return;
    if (contextStore.activeContext() !== ctx) return;

    setGatewayDetail(undefined);
    setManifest('');

    void loadGateways(ns);

    if (unsubscribeStream) {
      unsubscribeStream();
    }

    unsubscribeStream = subscribeToGatewayEvents(
      ns,
      (event) => {
        setGateways((prev) => sortGateways(applyGatewayWatchEvent(prev, event)));
      },
      (error) => {
        console.error('Gateway stream error', error);
        setGatewaysError(error.message);
      }
    );
  });

  createEffect(() => {
    const ns = namespace();
    const rn = resourceName();
    const ctx = context();

    if (!ns || !rn || contextError()) return;
    if (contextStore.activeContext() !== ctx) return;

    void loadGatewayDetail(ns, rn);
  });

  onCleanup(() => {
    unsubscribeStream?.();
  });

  const handleSelect = (gw: GatewayListItem) => {
    const currentTab = tab();
    navigate(`/${encodeURIComponent(context())}/${encodeURIComponent(namespace())}/gateways/${encodeURIComponent(gw.name)}/${currentTab}`);
  };

  const handleTabChange = (tabName: string) => {
    if (resourceName()) {
      navigate(`/${encodeURIComponent(context())}/${encodeURIComponent(namespace())}/gateways/${encodeURIComponent(resourceName()!)}/${tabName}`);
    }
  };

  const handleDelete = async () => {
    const rn = resourceName();
    const ns = namespace();
    if (!rn || !ns) return;

    try {
      await deleteGateway(ns, rn);
      navigate(`/${encodeURIComponent(context())}/${encodeURIComponent(ns)}/gateways`);
    } catch (error) {
      console.error('Failed to delete gateway', error);
      if (error instanceof ApiError) {
        setGatewaysError(error.message);
      } else {
        setGatewaysError('Failed to delete gateway');
      }
    }
  };

  const actions = (): ResourceAction[] => {
    if (!resourceName()) return [];

    return [
      {
        label: 'Delete',
        variant: 'error',
        icon: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
        onClick: handleDelete,
        confirm: {
          title: 'Delete Gateway',
          message: `Are you sure you want to delete Gateway "${resourceName()}"? This action cannot be undone.`
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
        <Show when={gatewaysError()}>
          <div role="alert" class="alert alert-error">
            <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{gatewaysError()}</span>
          </div>
        </Show>
        <section class="grid grid-cols-1 gap-6 xl:grid-cols-2 h-resource-panel">
          <div class="card bg-base-200/30 shadow-lg flex flex-col overflow-hidden">
            <div class="card-body flex-1 overflow-hidden">
              <div class="overflow-y-auto h-full">
                <GatewayTable
                  gateways={gateways()}
                  selectedGateway={resourceName()}
                  loading={gatewaysLoading()}
                  onSelect={handleSelect}
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
                <ResourceActions actions={actions()} />
              </div>
              <div class="divider my-0 flex-shrink-0" />
              <div class="p-6 flex-1 overflow-y-auto">
                <Switch>
                  <Match when={tab() === 'info'}>
                    <GatewayInfoPanel gateway={gatewayDetail()} loading={gatewayDetailLoading()} />
                  </Match>
                  <Match when={tab() === 'manifest'}>
                    <ManifestViewer manifest={manifest()} loading={gatewayDetailLoading()} />
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

export default GatewayListPage;
