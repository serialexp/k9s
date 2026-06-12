// ABOUTME: List page for Istio Gateway resources
// ABOUTME: Shows table with real-time updates and detail panel with Info/Definition tabs
import { batch, createEffect, createSignal, Match, onCleanup, Switch } from 'solid-js';
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
import ResourceListLayout from '../components/ResourceListLayout';

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
        if (error) console.error('Gateway stream error', error);
        setGatewaysError(error?.message ?? '');
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

  return (
    <ResourceListLayout contextError={contextError()} error={gatewaysError()}>
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
    </ResourceListLayout>
  );
};

export default GatewayListPage;
