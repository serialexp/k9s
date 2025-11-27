import { batch, createEffect, createSignal, Match, onCleanup, Show, Switch } from 'solid-js';
import { useNavigate, useParams } from '@solidjs/router';
import ConfigMapTable from '../components/ConfigMapTable';
import ResourceActions, { type ResourceAction } from '../components/ResourceActions';
import { contextStore } from '../stores/contextStore';
import {
  ApiError,
  deleteConfigMap,
  fetchConfigMap,
  fetchConfigMapManifest,
  fetchConfigMaps,
  subscribeToConfigMapEvents,
  type ConfigMapDetail,
  type ConfigMapListItem,
  type ConfigMapWatchEvent
} from '../lib/api';

const applyConfigMapWatchEvent = (configmaps: ConfigMapListItem[], event: ConfigMapWatchEvent): ConfigMapListItem[] => {
  const { type, object } = event;
  switch (type) {
    case 'ADDED':
      return [...configmaps.filter((cm) => cm.name !== object.name), object];
    case 'MODIFIED':
      return configmaps.map((cm) => (cm.name === object.name ? object : cm));
    case 'DELETED':
      return configmaps.filter((cm) => cm.name !== object.name);
    default:
      return configmaps;
  }
};

const sortConfigMaps = (configmaps: ConfigMapListItem[]) =>
  [...configmaps].sort((a, b) => a.name.localeCompare(b.name));

const ConfigMapListPage = () => {
  const params = useParams<{ context: string; namespace: string; resourceName?: string; tab?: string }>();
  const navigate = useNavigate();

  const context = () => (params.context ? decodeURIComponent(params.context) : '');
  const namespace = () => (params.namespace ? decodeURIComponent(params.namespace) : '');
  const resourceName = () => (params.resourceName ? decodeURIComponent(params.resourceName) : undefined);
  const tab = () => params.tab || 'info';

  const [configmaps, setConfigMaps] = createSignal<ConfigMapListItem[]>([]);
  const [configmapsLoading, setConfigMapsLoading] = createSignal(false);
  const [configmapsError, setConfigMapsError] = createSignal<string>('');

  const [configmapDetail, setConfigMapDetail] = createSignal<ConfigMapDetail | undefined>();
  const [configmapDetailLoading, setConfigMapDetailLoading] = createSignal(false);
  const [manifest, setManifest] = createSignal<string>('');

  const [contextError, setContextError] = createSignal<string>('');

  let unsubscribeConfigMapStream: (() => void) | undefined;

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

  const loadConfigMaps = async (ns: string) => {
    setConfigMapsLoading(true);
    setConfigMapsError('');
    try {
      const items = await fetchConfigMaps(ns);
      const sorted = sortConfigMaps(items);
      setConfigMaps(sorted);
    } catch (error) {
      console.error('Failed to load configmaps', error);
      setConfigMaps([]);
      if (error instanceof ApiError) {
        setConfigMapsError(error.message);
      } else {
        setConfigMapsError('Failed to load configmaps');
      }
    } finally {
      setConfigMapsLoading(false);
    }
  };

  const loadConfigMapDetail = async (ns: string, name: string) => {
    setConfigMapDetailLoading(true);
    try {
      const [detail, manifestYaml] = await Promise.all([
        fetchConfigMap(ns, name),
        fetchConfigMapManifest(ns, name)
      ]);
      batch(() => {
        setConfigMapDetail(detail);
        setManifest(manifestYaml);
      });
    } catch (error) {
      console.error('Failed to load configmap detail', error);
      setConfigMapDetail(undefined);
      setManifest('');
    } finally {
      setConfigMapDetailLoading(false);
    }
  };

  createEffect(() => {
    const ns = namespace();
    const ctx = context();

    if (!ns || contextError()) return;
    if (contextStore.activeContext() !== ctx) return;

    setConfigMapDetail(undefined);
    setManifest('');

    void loadConfigMaps(ns);

    if (unsubscribeConfigMapStream) {
      unsubscribeConfigMapStream();
    }

    unsubscribeConfigMapStream = subscribeToConfigMapEvents(
      ns,
      (event) => {
        setConfigMaps((prev) => sortConfigMaps(applyConfigMapWatchEvent(prev, event)));
      },
      (error) => {
        console.error('ConfigMap stream error', error);
        setConfigMapsError(error.message);
      }
    );
  });

  createEffect(() => {
    const ns = namespace();
    const rn = resourceName();
    const ctx = context();

    if (!ns || !rn || contextError()) return;
    if (contextStore.activeContext() !== ctx) return;

    void loadConfigMapDetail(ns, rn);
  });

  onCleanup(() => {
    unsubscribeConfigMapStream?.();
  });

  const handleConfigMapSelect = (configmap: ConfigMapListItem) => {
    const currentTab = tab();
    navigate(`/${encodeURIComponent(context())}/${encodeURIComponent(namespace())}/configmaps/${encodeURIComponent(configmap.name)}/${currentTab}`);
  };

  const handleTabChange = (tabName: string) => {
    if (resourceName()) {
      navigate(`/${encodeURIComponent(context())}/${encodeURIComponent(namespace())}/configmaps/${encodeURIComponent(resourceName()!)}/${tabName}`);
    }
  };

  const handleDeleteConfigMap = async () => {
    const rn = resourceName();
    const ns = namespace();
    if (!rn || !ns) return;

    try {
      await deleteConfigMap(ns, rn);
      navigate(`/${encodeURIComponent(context())}/${encodeURIComponent(ns)}/configmaps`);
    } catch (error) {
      console.error('Failed to delete configmap', error);
      if (error instanceof ApiError) {
        setConfigMapsError(error.message);
      } else {
        setConfigMapsError('Failed to delete configmap');
      }
    }
  };

  const configMapActions = (): ResourceAction[] => {
    if (!resourceName()) return [];

    return [
      {
        label: 'Delete',
        variant: 'error',
        icon: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
        onClick: handleDeleteConfigMap,
        confirm: {
          title: 'Delete ConfigMap',
          message: `Are you sure you want to delete ConfigMap "${resourceName()}"? This action cannot be undone.`
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
        <Show when={configmapsError()}>
          <div role="alert" class="alert alert-error">
            <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{configmapsError()}</span>
          </div>
        </Show>
        <section class="grid grid-cols-1 gap-6 xl:grid-cols-2 h-resource-panel">
          <div class="card bg-base-200/30 shadow-lg flex flex-col overflow-hidden">
            <div class="card-body flex-1 overflow-hidden">
              <div class="overflow-y-auto h-full">
                <ConfigMapTable
                  configmaps={configmaps()}
                  selectedConfigMap={resourceName()}
                  loading={configmapsLoading()}
                  onSelect={handleConfigMapSelect}
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
                <ResourceActions actions={configMapActions()} />
              </div>
              <div class="divider my-0 flex-shrink-0" />
              <div class="p-6 flex-1 overflow-y-auto">
                <Switch>
                  <Match when={tab() === 'info'}>
                    <Show when={!configmapDetailLoading()} fallback={<span class="loading loading-dots" />}>
                      <Show
                        when={configmapDetail()}
                        fallback={<p class="text-sm opacity-60">Select a ConfigMap to view details.</p>}
                      >
                        {(detail) => (
                          <div class="space-y-4">
                            <div>
                              <h3 class="text-sm font-semibold mb-2">Basic Info</h3>
                              <div class="grid grid-cols-2 gap-2 text-sm">
                                <div><span class="opacity-60">Name:</span> {detail().name}</div>
                                <div><span class="opacity-60">Namespace:</span> {detail().namespace}</div>
                                <div><span class="opacity-60">Data Keys:</span> {detail().dataCount}</div>
                                <div><span class="opacity-60">Binary Keys:</span> {detail().binaryDataCount}</div>
                                <div><span class="opacity-60">Created:</span> {detail().creationTimestamp || '—'}</div>
                              </div>
                            </div>
                            <div>
                              <h3 class="text-sm font-semibold mb-2">Data</h3>
                              <Show
                                when={Object.keys(detail().data).length}
                                fallback={<p class="text-sm opacity-60">No data entries.</p>}
                              >
                                <div class="space-y-3">
                                  {Object.entries(detail().data).map(([key, value]) => (
                                    <div class="rounded-lg bg-base-200/40 p-3">
                                      <div class="text-xs opacity-60 font-mono">{key}</div>
                                      <pre class="mt-2 overflow-auto text-xs">{value}</pre>
                                    </div>
                                  ))}
                                </div>
                              </Show>
                            </div>
                            <div>
                              <h3 class="text-sm font-semibold mb-2">Binary Data</h3>
                              <Show
                                when={Object.keys(detail().binaryData).length}
                                fallback={<p class="text-sm opacity-60">No binary data entries.</p>}
                              >
                                <div class="space-y-3">
                                  {Object.entries(detail().binaryData).map(([key, value]) => (
                                    <div class="rounded-lg bg-base-200/40 p-3">
                                      <div class="text-xs opacity-60 font-mono">{key}</div>
                                      <pre class="mt-2 overflow-auto text-xs">{value}</pre>
                                    </div>
                                  ))}
                                </div>
                              </Show>
                            </div>
                            <div>
                              <h3 class="text-sm font-semibold mb-2">Metadata</h3>
                              <div class="grid grid-cols-2 gap-2 text-sm">
                                <div>
                                  <div class="opacity-60">Labels</div>
                                  <Show
                                    when={Object.keys(detail().labels).length}
                                    fallback={<div class="text-xs opacity-50 mt-1">None</div>}
                                  >
                                    <div class="mt-1 space-y-1">
                                      {Object.entries(detail().labels).map(([key, value]) => (
                                        <div class="text-xs opacity-80">
                                          <span class="font-mono">{key}:</span> {value}
                                        </div>
                                      ))}
                                    </div>
                                  </Show>
                                </div>
                                <div>
                                  <div class="opacity-60">Annotations</div>
                                  <Show
                                    when={Object.keys(detail().annotations).length}
                                    fallback={<div class="text-xs opacity-50 mt-1">None</div>}
                                  >
                                    <div class="mt-1 space-y-1">
                                      {Object.entries(detail().annotations).map(([key, value]) => (
                                        <div class="text-xs opacity-80">
                                          <span class="font-mono">{key}:</span> {value}
                                        </div>
                                      ))}
                                    </div>
                                  </Show>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </Show>
                    </Show>
                  </Match>
                  <Match when={tab() === 'manifest'}>
                    <Show when={!configmapDetailLoading()} fallback={<span class="loading loading-dots" />}>
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

export default ConfigMapListPage;
