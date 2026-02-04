import { batch, createEffect, createSignal, Match, onCleanup, Show, Switch } from 'solid-js';
import { useNavigate, useParams } from '@solidjs/router';
import ManifestViewer from '../components/ManifestViewer';
import StorageClassTable from '../components/StorageClassTable';
import StorageClassInfoPanel from '../components/StorageClassInfoPanel';
import ResourceActions, { type ResourceAction } from '../components/ResourceActions';
import { contextStore } from '../stores/contextStore';
import {
  ApiError,
  deleteStorageClass,
  fetchStorageClass,
  fetchStorageClassManifest,
  fetchStorageClasses,
  subscribeToStorageClassEvents,
  type StorageClassDetail,
  type StorageClassListItem,
  type StorageClassWatchEvent
} from '../lib/api';

const applyStorageClassWatchEvent = (storageClasses: StorageClassListItem[], event: StorageClassWatchEvent): StorageClassListItem[] => {
  const { type, object } = event;
  switch (type) {
    case 'ADDED':
      return [...storageClasses.filter((sc) => sc.name !== object.name), object];
    case 'MODIFIED':
      return storageClasses.map((sc) => (sc.name === object.name ? object : sc));
    case 'DELETED':
      return storageClasses.filter((sc) => sc.name !== object.name);
    default:
      return storageClasses;
  }
};

const sortStorageClasses = (storageClasses: StorageClassListItem[]) =>
  [...storageClasses].sort((a, b) => a.name.localeCompare(b.name));

const StorageClassListPage = () => {
  const params = useParams<{ context: string; namespace: string; resourceName?: string; tab?: string }>();
  const navigate = useNavigate();

  const context = () => (params.context ? decodeURIComponent(params.context) : '');
  const namespace = () => (params.namespace ? decodeURIComponent(params.namespace) : '');
  const resourceName = () => (params.resourceName ? decodeURIComponent(params.resourceName) : undefined);
  const tab = () => params.tab || 'info';

  const [storageClasses, setStorageClasses] = createSignal<StorageClassListItem[]>([]);
  const [storageClassesLoading, setStorageClassesLoading] = createSignal(false);
  const [storageClassesError, setStorageClassesError] = createSignal<string>('');

  const [storageClassDetail, setStorageClassDetail] = createSignal<StorageClassDetail | undefined>();
  const [storageClassDetailLoading, setStorageClassDetailLoading] = createSignal(false);
  const [manifest, setManifest] = createSignal<string>('');

  const [contextError, setContextError] = createSignal<string>('');

  let unsubscribeStorageClassStream: (() => void) | undefined;

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

  const loadStorageClasses = async () => {
    setStorageClassesLoading(true);
    setStorageClassesError('');
    try {
      const items = await fetchStorageClasses();
      setStorageClasses(sortStorageClasses(items));
    } catch (error) {
      console.error('Failed to load storage classes', error);
      setStorageClasses([]);
      if (error instanceof ApiError) {
        setStorageClassesError(error.message);
      } else {
        setStorageClassesError('Failed to load storage classes');
      }
    } finally {
      setStorageClassesLoading(false);
    }
  };

  const loadStorageClassDetail = async (name: string) => {
    setStorageClassDetailLoading(true);
    try {
      const [detail, manifestYaml] = await Promise.all([
        fetchStorageClass(name),
        fetchStorageClassManifest(name)
      ]);
      batch(() => {
        setStorageClassDetail(detail);
        setManifest(manifestYaml);
      });
    } catch (error) {
      console.error('Failed to load storage class detail', error);
      setStorageClassDetail(undefined);
      setManifest('');
    } finally {
      setStorageClassDetailLoading(false);
    }
  };

  createEffect(() => {
    const ctx = context();

    if (!ctx || contextError()) return;
    if (contextStore.activeContext() !== ctx) return;

    setStorageClassDetail(undefined);
    setManifest('');

    void loadStorageClasses();

    if (unsubscribeStorageClassStream) {
      unsubscribeStorageClassStream();
    }

    unsubscribeStorageClassStream = subscribeToStorageClassEvents(
      (event) => {
        setStorageClasses((prev) => sortStorageClasses(applyStorageClassWatchEvent(prev, event)));
      },
      (error) => {
        console.error('StorageClass stream error', error);
        setStorageClassesError(error.message);
      }
    );
  });

  createEffect(() => {
    const ctx = context();
    const name = resourceName();

    if (!name || contextError()) return;
    if (contextStore.activeContext() !== ctx) return;

    void loadStorageClassDetail(name);
  });

  onCleanup(() => {
    unsubscribeStorageClassStream?.();
  });

  const handleStorageClassSelect = (sc: StorageClassListItem) => {
    const currentTab = tab();
    navigate(`/${encodeURIComponent(context())}/${encodeURIComponent(namespace())}/storageclasses/${encodeURIComponent(sc.name)}/${currentTab}`);
  };

  const handleTabChange = (tabName: string) => {
    if (resourceName()) {
      navigate(`/${encodeURIComponent(context())}/${encodeURIComponent(namespace())}/storageclasses/${encodeURIComponent(resourceName()!)}/${tabName}`);
    }
  };

  const handleDeleteStorageClass = async () => {
    const name = resourceName();
    if (!name) return;

    await deleteStorageClass(name);
    navigate(`/${encodeURIComponent(context())}/${encodeURIComponent(namespace())}/storageclasses`);
  };

  const storageClassActions = (): ResourceAction[] => {
    if (!resourceName()) return [];

    return [
      {
        label: 'Delete',
        variant: 'error',
        icon: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
        onClick: handleDeleteStorageClass,
        confirm: {
          title: 'Delete Storage Class',
          message: `Are you sure you want to delete storage class "${resourceName()}"? This action cannot be undone.`
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
        <Show when={storageClassesError()}>
          <div role="alert" class="alert alert-error">
            <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{storageClassesError()}</span>
          </div>
        </Show>
        <section class="grid grid-cols-1 gap-6 xl:grid-cols-2 h-resource-panel">
          <div class="card bg-base-200/30 shadow-lg flex flex-col overflow-hidden">
            <div class="card-body flex-1 overflow-hidden">
              <div class="overflow-y-auto h-full">
                <StorageClassTable
                  storageClasses={storageClasses()}
                  selectedStorageClass={resourceName()}
                  loading={storageClassesLoading()}
                  onSelect={handleStorageClassSelect}
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
                <ResourceActions actions={storageClassActions()} />
              </div>
              <div class="divider my-0 flex-shrink-0" />
              <div class="p-6 flex-1 overflow-y-auto">
                <Switch>
                  <Match when={tab() === 'info'}>
                    <StorageClassInfoPanel storageClass={storageClassDetail()} loading={storageClassDetailLoading()} />
                  </Match>
                  <Match when={tab() === 'manifest'}>
                    <ManifestViewer manifest={manifest()} loading={storageClassDetailLoading()} />
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

export default StorageClassListPage;
