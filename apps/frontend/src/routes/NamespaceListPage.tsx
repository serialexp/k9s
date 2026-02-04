// ABOUTME: Namespace resource list page with detail panel
// ABOUTME: Shows namespaces with metrics, events, and manifest viewing

import { batch, createEffect, createSignal, Match, onCleanup, Show, Switch } from 'solid-js';
import { useNavigate, useParams } from '@solidjs/router';
import ManifestViewer from '../components/ManifestViewer';
import NamespaceTable from '../components/NamespaceTable';
import NamespaceInfoPanel from '../components/NamespaceInfoPanel';
import NamespaceEventsPanel from '../components/NamespaceEventsPanel';
import ResourceActions, { type ResourceAction } from '../components/ResourceActions';
import CreateNamespaceDialog from '../components/CreateNamespaceDialog';
import { contextStore } from '../stores/contextStore';
import {
  ApiError,
  createNamespace,
  deleteNamespace,
  fetchNamespace,
  fetchNamespaceManifest,
  fetchNamespacesFull,
  fetchNamespaceEvents,
  subscribeToNamespaceFullEvents,
  type NamespaceDetail,
  type NamespaceEvent,
  type NamespaceListItem,
  type NamespaceFullWatchEvent
} from '../lib/api';

const applyNamespaceWatchEvent = (namespaces: NamespaceListItem[], event: NamespaceFullWatchEvent): NamespaceListItem[] => {
  const { type, object } = event;
  switch (type) {
    case 'ADDED':
      return [...namespaces.filter((ns) => ns.name !== object.name), object];
    case 'MODIFIED':
      return namespaces.map((ns) => (ns.name === object.name ? { ...ns, ...object } : ns));
    case 'DELETED':
      return namespaces.filter((ns) => ns.name !== object.name);
    default:
      return namespaces;
  }
};

const sortNamespaces = (namespaces: NamespaceListItem[]) =>
  [...namespaces].sort((a, b) => {
    const aTotal = (a.cpuRequests ? 1 : 0) + (a.memoryRequests ? 1 : 0);
    const bTotal = (b.cpuRequests ? 1 : 0) + (b.memoryRequests ? 1 : 0);
    if (aTotal !== bTotal) return bTotal - aTotal;
    return a.name.localeCompare(b.name);
  });

const NamespaceListPage = () => {
  const params = useParams<{ context: string; namespace: string; resourceName?: string; tab?: string }>();
  const navigate = useNavigate();

  const context = () => (params.context ? decodeURIComponent(params.context) : '');
  const namespace = () => (params.namespace ? decodeURIComponent(params.namespace) : '');
  const resourceName = () => (params.resourceName ? decodeURIComponent(params.resourceName) : undefined);
  const tab = () => params.tab || 'info';

  const [namespaces, setNamespaces] = createSignal<NamespaceListItem[]>([]);
  const [namespacesLoading, setNamespacesLoading] = createSignal(false);
  const [namespacesError, setNamespacesError] = createSignal<string>('');

  const [namespaceDetail, setNamespaceDetail] = createSignal<NamespaceDetail | undefined>();
  const [namespaceDetailLoading, setNamespaceDetailLoading] = createSignal(false);
  const [manifest, setManifest] = createSignal<string>('');
  const [events, setEvents] = createSignal<NamespaceEvent[]>([]);
  const [eventsLoading, setEventsLoading] = createSignal(false);

  const [contextError, setContextError] = createSignal<string>('');
  const [createDialogOpen, setCreateDialogOpen] = createSignal(false);

  let unsubscribeNamespaceStream: (() => void) | undefined;

  createEffect(() => {
    const ctx = context();
    const ns = namespace();

    if (!ctx || !ns) return;

    const contexts = contextStore.contexts();
    const contextNamespaces = contextStore.namespaces();

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

    if (contextNamespaces.length > 0) {
      const validNamespace = contextNamespaces.includes(ns);
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

  const loadNamespaces = async () => {
    setNamespacesLoading(true);
    setNamespacesError('');
    try {
      const items = await fetchNamespacesFull();
      setNamespaces(sortNamespaces(items));
    } catch (error) {
      console.error('Failed to load namespaces', error);
      setNamespaces([]);
      if (error instanceof ApiError) {
        setNamespacesError(error.message);
      } else {
        setNamespacesError('Failed to load namespaces');
      }
    } finally {
      setNamespacesLoading(false);
    }
  };

  const loadNamespaceDetail = async (name: string) => {
    setNamespaceDetailLoading(true);
    setEventsLoading(true);
    try {
      const [detail, manifestYaml, eventsList] = await Promise.all([
        fetchNamespace(name),
        fetchNamespaceManifest(name),
        fetchNamespaceEvents(name)
      ]);
      batch(() => {
        setNamespaceDetail(detail);
        setManifest(manifestYaml);
        setEvents(eventsList);
      });
    } catch (error) {
      console.error('Failed to load namespace detail', error);
      setNamespaceDetail(undefined);
      setManifest('');
      setEvents([]);
    } finally {
      setNamespaceDetailLoading(false);
      setEventsLoading(false);
    }
  };

  createEffect(() => {
    const ctx = context();

    if (!ctx || contextError()) return;
    if (contextStore.activeContext() !== ctx) return;

    setNamespaceDetail(undefined);
    setManifest('');
    setEvents([]);

    void loadNamespaces();

    if (unsubscribeNamespaceStream) {
      unsubscribeNamespaceStream();
    }

    unsubscribeNamespaceStream = subscribeToNamespaceFullEvents(
      (event) => {
        setNamespaces((prev) => sortNamespaces(applyNamespaceWatchEvent(prev, event)));
      },
      (error) => {
        console.error('Namespace stream error', error);
        setNamespacesError(error.message);
      }
    );
  });

  createEffect(() => {
    const ctx = context();
    const name = resourceName();

    if (!name || contextError()) return;
    if (contextStore.activeContext() !== ctx) return;

    void loadNamespaceDetail(name);
  });

  onCleanup(() => {
    unsubscribeNamespaceStream?.();
  });

  const handleNamespaceSelect = (ns: NamespaceListItem) => {
    const currentTab = tab();
    navigate(`/${encodeURIComponent(context())}/${encodeURIComponent(namespace())}/namespaces/${encodeURIComponent(ns.name)}/${currentTab}`);
  };

  const handleTabChange = (tabName: string) => {
    if (resourceName()) {
      navigate(`/${encodeURIComponent(context())}/${encodeURIComponent(namespace())}/namespaces/${encodeURIComponent(resourceName()!)}/${tabName}`);
    }
  };

  const handleDeleteNamespace = async () => {
    const name = resourceName();
    if (!name) return;

    await deleteNamespace(name);
    navigate(`/${encodeURIComponent(context())}/${encodeURIComponent(namespace())}/namespaces`);
  };

  const handleCreateNamespace = async (name: string) => {
    await createNamespace(name);
    await loadNamespaces();
  };

  const namespaceActions = (): ResourceAction[] => {
    const actions: ResourceAction[] = [];

    if (!resourceName()) {
      actions.push({
        label: 'Create',
        variant: 'primary',
        icon: 'M12 4v16m8-8H4',
        onClick: () => { setCreateDialogOpen(true); }
      });
    } else {
      actions.push({
        label: 'Delete',
        variant: 'error',
        icon: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
        onClick: handleDeleteNamespace,
        confirm: {
          title: 'Delete Namespace',
          message: `Are you sure you want to delete namespace "${resourceName()}"? This will delete all resources in the namespace and cannot be undone.`
        }
      });
    }

    return actions;
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
        <Show when={namespacesError()}>
          <div role="alert" class="alert alert-error">
            <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{namespacesError()}</span>
          </div>
        </Show>
        <section class="grid grid-cols-1 gap-6 xl:grid-cols-2 h-resource-panel">
          <div class="card bg-base-200/30 shadow-lg flex flex-col overflow-hidden">
            <div class="card-body flex-1 overflow-hidden">
              <div class="flex items-center justify-between mb-4">
                <div />
                <ResourceActions actions={namespaceActions().filter(a => a.label === 'Create')} />
              </div>
              <div class="overflow-y-auto h-full">
                <NamespaceTable
                  namespaces={namespaces()}
                  selectedNamespace={resourceName()}
                  loading={namespacesLoading()}
                  onSelect={handleNamespaceSelect}
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
                    class={`tab ${tab() === 'events' ? 'tab-active' : ''}`}
                    onClick={() => handleTabChange('events')}
                  >
                    Events
                  </button>
                  <button
                    type="button"
                    class={`tab ${tab() === 'manifest' ? 'tab-active' : ''}`}
                    onClick={() => handleTabChange('manifest')}
                  >
                    Definition
                  </button>
                </div>
                <ResourceActions actions={namespaceActions().filter(a => a.label !== 'Create')} />
              </div>
              <div class="divider my-0 flex-shrink-0" />
              <div class="p-6 flex-1 overflow-y-auto">
                <Switch>
                  <Match when={tab() === 'info'}>
                    <NamespaceInfoPanel namespace={namespaceDetail()} loading={namespaceDetailLoading()} />
                  </Match>
                  <Match when={tab() === 'events'}>
                    <NamespaceEventsPanel events={events()} loading={eventsLoading()} />
                  </Match>
                  <Match when={tab() === 'manifest'}>
                    <ManifestViewer manifest={manifest()} loading={namespaceDetailLoading()} />
                  </Match>
                </Switch>
              </div>
            </div>
          </div>
        </section>
      </div>

      <CreateNamespaceDialog
        open={createDialogOpen()}
        onClose={() => setCreateDialogOpen(false)}
        onCreate={handleCreateNamespace}
      />
    </main>
  );
};

export default NamespaceListPage;
