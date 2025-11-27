import { batch, createEffect, createSignal, Match, onCleanup, Show, Switch } from 'solid-js';
import { useNavigate, useParams } from '@solidjs/router';
import CustomResourceDefinitionTable from '../components/CustomResourceDefinitionTable';
import CustomResourceDefinitionInfoPanel from '../components/CustomResourceDefinitionInfoPanel';
import CustomResourceDefinitionVersionsPanel from '../components/CustomResourceDefinitionVersionsPanel';
import ResourceActions, { type ResourceAction } from '../components/ResourceActions';
import { contextStore } from '../stores/contextStore';
import {
  ApiError,
  deleteCustomResourceDefinition,
  fetchCustomResourceDefinition,
  fetchCustomResourceDefinitionManifest,
  fetchCustomResourceDefinitions,
  subscribeToCustomResourceDefinitionEvents,
  type CustomResourceDefinitionDetail,
  type CustomResourceDefinitionListItem,
  type CustomResourceDefinitionWatchEvent
} from '../lib/api';

const applyCrdWatchEvent = (crds: CustomResourceDefinitionListItem[], event: CustomResourceDefinitionWatchEvent): CustomResourceDefinitionListItem[] => {
  const { type, object } = event;
  switch (type) {
    case 'ADDED':
      return [...crds.filter((crd) => crd.name !== object.name), object];
    case 'MODIFIED':
      return crds.map((crd) => (crd.name === object.name ? object : crd));
    case 'DELETED':
      return crds.filter((crd) => crd.name !== object.name);
    default:
      return crds;
  }
};

const sortCrds = (crds: CustomResourceDefinitionListItem[]) =>
  [...crds].sort((a, b) => a.name.localeCompare(b.name));

const CustomResourceDefinitionListPage = () => {
  const params = useParams<{ context: string; namespace: string; resourceName?: string; tab?: string }>();
  const navigate = useNavigate();

  const context = () => (params.context ? decodeURIComponent(params.context) : '');
  const namespace = () => (params.namespace ? decodeURIComponent(params.namespace) : '');
  const resourceName = () => (params.resourceName ? decodeURIComponent(params.resourceName) : undefined);
  const tab = () => params.tab || 'info';

  const [crds, setCrds] = createSignal<CustomResourceDefinitionListItem[]>([]);
  const [crdsLoading, setCrdsLoading] = createSignal(false);
  const [crdsError, setCrdsError] = createSignal<string>('');

  const [crdDetail, setCrdDetail] = createSignal<CustomResourceDefinitionDetail | undefined>();
  const [crdDetailLoading, setCrdDetailLoading] = createSignal(false);
  const [manifest, setManifest] = createSignal<string>('');

  const [contextError, setContextError] = createSignal<string>('');

  let unsubscribeCrdStream: (() => void) | undefined;

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

  const loadCrds = async () => {
    setCrdsLoading(true);
    setCrdsError('');
    try {
      const items = await fetchCustomResourceDefinitions();
      setCrds(sortCrds(items));
    } catch (error) {
      console.error('Failed to load CRDs', error);
      setCrds([]);
      if (error instanceof ApiError) {
        setCrdsError(error.message);
      } else {
        setCrdsError('Failed to load CRDs');
      }
    } finally {
      setCrdsLoading(false);
    }
  };

  const loadCrdDetail = async (name: string) => {
    setCrdDetailLoading(true);
    try {
      const [detail, manifestYaml] = await Promise.all([
        fetchCustomResourceDefinition(name),
        fetchCustomResourceDefinitionManifest(name)
      ]);
      batch(() => {
        setCrdDetail(detail);
        setManifest(manifestYaml);
      });
    } catch (error) {
      console.error('Failed to load CRD detail', error);
      setCrdDetail(undefined);
      setManifest('');
    } finally {
      setCrdDetailLoading(false);
    }
  };

  createEffect(() => {
    const ctx = context();

    if (!ctx || contextError()) return;
    if (contextStore.activeContext() !== ctx) return;

    setCrdDetail(undefined);
    setManifest('');

    void loadCrds();

    if (unsubscribeCrdStream) {
      unsubscribeCrdStream();
    }

    unsubscribeCrdStream = subscribeToCustomResourceDefinitionEvents(
      (event) => {
        setCrds((prev) => sortCrds(applyCrdWatchEvent(prev, event)));
      },
      (error) => {
        console.error('CRD stream error', error);
        setCrdsError(error.message);
      }
    );
  });

  createEffect(() => {
    const ctx = context();
    const name = resourceName();

    if (!name || contextError()) return;
    if (contextStore.activeContext() !== ctx) return;

    void loadCrdDetail(name);
  });

  onCleanup(() => {
    unsubscribeCrdStream?.();
  });

  const handleCrdSelect = (crd: CustomResourceDefinitionListItem) => {
    const currentTab = tab();
    navigate(`/${encodeURIComponent(context())}/${encodeURIComponent(namespace())}/crds/${encodeURIComponent(crd.name)}/${currentTab}`);
  };

  const handleTabChange = (tabName: string) => {
    if (resourceName()) {
      navigate(`/${encodeURIComponent(context())}/${encodeURIComponent(namespace())}/crds/${encodeURIComponent(resourceName()!)}/${tabName}`);
    }
  };

  const handleDeleteCrd = async () => {
    const name = resourceName();
    if (!name) return;

    await deleteCustomResourceDefinition(name);
    navigate(`/${encodeURIComponent(context())}/${encodeURIComponent(namespace())}/crds`);
  };

  const crdActions = (): ResourceAction[] => {
    if (!resourceName()) return [];

    return [
      {
        label: 'Delete',
        variant: 'error',
        icon: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
        onClick: handleDeleteCrd,
        confirm: {
          title: 'Delete CRD',
          message: `Are you sure you want to delete CRD "${resourceName()}"? This action removes the definition from the cluster.`
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
        <Show when={crdsError()}>
          <div role="alert" class="alert alert-error">
            <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{crdsError()}</span>
          </div>
        </Show>
        <section class="grid grid-cols-1 gap-6 xl:grid-cols-2 h-resource-panel">
          <div class="card bg-base-200/30 shadow-lg flex flex-col overflow-hidden">
            <div class="card-body flex-1 overflow-hidden">
              <div class="overflow-y-auto h-full">
                <CustomResourceDefinitionTable
                  crds={crds()}
                  selectedCrd={resourceName()}
                  loading={crdsLoading()}
                  onSelect={handleCrdSelect}
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
                    class={`tab ${tab() === 'versions' ? 'tab-active' : ''}`}
                    onClick={() => handleTabChange('versions')}
                  >
                    Versions
                  </button>
                </div>
                <ResourceActions actions={crdActions()} />
              </div>
              <div class="divider my-0 flex-shrink-0" />
              <div class="p-6 flex-1 overflow-y-auto">
                <Switch>
                  <Match when={tab() === 'info'}>
                    <CustomResourceDefinitionInfoPanel crd={crdDetail()} loading={crdDetailLoading()} />
                  </Match>
                  <Match when={tab() === 'manifest'}>
                    <Show
                      when={!crdDetailLoading()}
                      fallback={<span class="loading loading-dots" />}
                    >
                      <Show when={manifest()} fallback={<p class="text-sm opacity-60">Manifest unavailable.</p>}>
                        <pre class="overflow-auto rounded-lg bg-base-300/60 p-4 text-xs">
                          {manifest()}
                        </pre>
                      </Show>
                    </Show>
                  </Match>
                  <Match when={tab() === 'versions'}>
                    <CustomResourceDefinitionVersionsPanel crd={crdDetail()} loading={crdDetailLoading()} />
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

export default CustomResourceDefinitionListPage;
