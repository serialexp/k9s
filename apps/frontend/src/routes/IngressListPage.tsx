import { batch, createEffect, createSignal, Match, onCleanup, Show, Switch } from 'solid-js';
import { useNavigate, useParams } from '@solidjs/router';
import IngressTable from '../components/IngressTable';
import ManifestViewer from '../components/ManifestViewer';
import ResourceActions, { type ResourceAction } from '../components/ResourceActions';
import { contextStore } from '../stores/contextStore';
import {
  ApiError,
  deleteIngress,
  fetchIngress,
  fetchIngressManifest,
  fetchIngresses,
  subscribeToIngressEvents,
  type IngressDetail,
  type IngressListItem,
  type IngressWatchEvent
} from '../lib/api';

const applyIngressWatchEvent = (ingresses: IngressListItem[], event: IngressWatchEvent): IngressListItem[] => {
  const { type, object } = event;
  switch (type) {
    case 'ADDED':
      return [...ingresses.filter((ing) => ing.name !== object.name), object];
    case 'MODIFIED':
      return ingresses.map((ing) => (ing.name === object.name ? object : ing));
    case 'DELETED':
      return ingresses.filter((ing) => ing.name !== object.name);
    default:
      return ingresses;
  }
};

const sortIngresses = (ingresses: IngressListItem[]) =>
  [...ingresses].sort((a, b) => a.name.localeCompare(b.name));

const IngressListPage = () => {
  const params = useParams<{ context: string; namespace: string; resourceName?: string; tab?: string }>();
  const navigate = useNavigate();

  const context = () => (params.context ? decodeURIComponent(params.context) : '');
  const namespace = () => (params.namespace ? decodeURIComponent(params.namespace) : '');
  const resourceName = () => (params.resourceName ? decodeURIComponent(params.resourceName) : undefined);
  const tab = () => params.tab || 'info';

  const [ingresses, setIngresses] = createSignal<IngressListItem[]>([]);
  const [ingressesLoading, setIngressesLoading] = createSignal(false);
  const [ingressesError, setIngressesError] = createSignal<string>('');

  const [ingressDetail, setIngressDetail] = createSignal<IngressDetail | undefined>();
  const [ingressDetailLoading, setIngressDetailLoading] = createSignal(false);
  const [manifest, setManifest] = createSignal<string>('');

  const [contextError, setContextError] = createSignal<string>('');

  let unsubscribeIngressStream: (() => void) | undefined;

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

  const loadIngresses = async (ns: string) => {
    setIngressesLoading(true);
    setIngressesError('');
    try {
      const items = await fetchIngresses(ns);
      const sorted = sortIngresses(items);
      setIngresses(sorted);
    } catch (error) {
      console.error('Failed to load ingresses', error);
      setIngresses([]);
      if (error instanceof ApiError) {
        setIngressesError(error.message);
      } else {
        setIngressesError('Failed to load ingresses');
      }
    } finally {
      setIngressesLoading(false);
    }
  };

  const loadIngressDetail = async (ns: string, name: string) => {
    setIngressDetailLoading(true);
    try {
      const [detail, manifestYaml] = await Promise.all([
        fetchIngress(ns, name),
        fetchIngressManifest(ns, name)
      ]);
      batch(() => {
        setIngressDetail(detail);
        setManifest(manifestYaml);
      });
    } catch (error) {
      console.error('Failed to load ingress detail', error);
      setIngressDetail(undefined);
      setManifest('');
    } finally {
      setIngressDetailLoading(false);
    }
  };

  createEffect(() => {
    const ns = namespace();

    const ctx = context();
    if (!ns || contextError()) return;
    if (contextStore.activeContext() !== ctx) return;

    setIngressDetail(undefined);
    setManifest('');

    void loadIngresses(ns);

    if (unsubscribeIngressStream) {
      unsubscribeIngressStream();
    }

    unsubscribeIngressStream = subscribeToIngressEvents(
      ns,
      (event) => {
        setIngresses((prev) => sortIngresses(applyIngressWatchEvent(prev, event)));
      },
      (error) => {
        console.error('Ingress stream error', error);
        setIngressesError(error.message);
      }
    );
  });

  createEffect(() => {
    const ns = namespace();
    const rn = resourceName();

    const ctx = context();
    if (!ns || !rn || contextError()) return;
    if (contextStore.activeContext() !== ctx) return;

    void loadIngressDetail(ns, rn);
  });

  onCleanup(() => {
    unsubscribeIngressStream?.();
  });

  const handleIngressSelect = (ingress: IngressListItem) => {
    const currentTab = tab();
    navigate(`/${encodeURIComponent(context())}/${encodeURIComponent(namespace())}/ingresses/${encodeURIComponent(ingress.name)}/${currentTab}`);
  };

  const handleTabChange = (tabName: string) => {
    if (resourceName()) {
      navigate(`/${encodeURIComponent(context())}/${encodeURIComponent(namespace())}/ingresses/${encodeURIComponent(resourceName()!)}/${tabName}`);
    }
  };

  const handleDeleteIngress = async () => {
    const rn = resourceName();
    const ns = namespace();
    if (!rn || !ns) return;

    try {
      await deleteIngress(ns, rn);
      navigate(`/${encodeURIComponent(context())}/${encodeURIComponent(ns)}/ingresses`);
    } catch (error) {
      console.error('Failed to delete ingress', error);
      if (error instanceof ApiError) {
        setIngressesError(error.message);
      } else {
        setIngressesError('Failed to delete ingress');
      }
    }
  };

  const ingressActions = (): ResourceAction[] => {
    if (!resourceName()) return [];

    return [
      {
        label: 'Delete',
        variant: 'error',
        icon: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
        onClick: handleDeleteIngress,
        confirm: {
          title: 'Delete Ingress',
          message: `Are you sure you want to delete Ingress "${resourceName()}"? This action cannot be undone.`
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
        <Show when={ingressesError()}>
          <div role="alert" class="alert alert-error">
            <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{ingressesError()}</span>
          </div>
        </Show>
        <section class="grid grid-cols-1 gap-6 xl:grid-cols-2 h-resource-panel">
          <div class="card bg-base-200/30 shadow-lg flex flex-col overflow-hidden">
            <div class="card-body flex-1 overflow-hidden">
              <div class="overflow-y-auto h-full">
                <IngressTable
                  ingresses={ingresses()}
                  selectedIngress={resourceName()}
                  loading={ingressesLoading()}
                  onSelect={handleIngressSelect}
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
                <ResourceActions actions={ingressActions()} />
              </div>
              <div class="divider my-0 flex-shrink-0" />
              <div class="p-6 flex-1 overflow-y-auto">
                <Switch>
                  <Match when={tab() === 'info'}>
                    <Show when={!ingressDetailLoading()} fallback={<span class="loading loading-dots" />}>
                      <Show
                        when={ingressDetail()}
                        fallback={<p class="text-sm opacity-60">Select an Ingress to view details.</p>}
                      >
                        {(detail) => (
                          <div class="space-y-4">
                            <div>
                              <h3 class="text-sm font-semibold mb-2">Basic Info</h3>
                              <div class="grid grid-cols-2 gap-2 text-sm">
                                <div><span class="opacity-60">Name:</span> {detail().name}</div>
                                <div><span class="opacity-60">Namespace:</span> {detail().namespace}</div>
                                <div><span class="opacity-60">Class:</span> {detail().className || '—'}</div>
                                <div><span class="opacity-60">Routes:</span> {detail().serviceCount}</div>
                                <div><span class="opacity-60">Hosts:</span> {detail().hosts.length ? detail().hosts.join(', ') : '—'}</div>
                                <div><span class="opacity-60">TLS Hosts:</span> {detail().tlsHosts.length ? detail().tlsHosts.join(', ') : '—'}</div>
                              </div>
                            </div>
                            <div>
                              <h3 class="text-sm font-semibold mb-2">Rules</h3>
                              <Show
                                when={detail().rules.length}
                                fallback={<p class="text-sm opacity-60">No rules configured.</p>}
                              >
                                <div class="space-y-3">
                                  {detail().rules.map((rule) => (
                                    <div class="rounded-lg bg-base-200/40 p-3 text-sm">
                                      <div><span class="opacity-60">Host:</span> {rule.host || '—'}</div>
                                      <div class="mt-2 space-y-1">
                                        {rule.paths.map((path) => (
                                          <div class="grid grid-cols-2 gap-2 text-xs opacity-80">
                                            <div><span class="opacity-60">Path:</span> {path.path || '/'}</div>
                                            <div><span class="opacity-60">Type:</span> {path.pathType || '—'}</div>
                                            <div><span class="opacity-60">Service:</span> {path.serviceName || '—'}</div>
                                            <div><span class="opacity-60">Port:</span> {path.servicePort ?? '—'}</div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </Show>
                            </div>
                            <div>
                              <h3 class="text-sm font-semibold mb-2">TLS</h3>
                              <Show
                                when={detail().tls.length}
                                fallback={<p class="text-sm opacity-60">No TLS configuration.</p>}
                              >
                                <div class="space-y-2">
                                  {detail().tls.map((tls) => (
                                    <div class="rounded-lg bg-base-200/40 p-3 text-sm">
                                      <div><span class="opacity-60">Secret:</span> {tls.secretName || '—'}</div>
                                      <div class="mt-1 text-xs opacity-80">
                                        <span class="opacity-60">Hosts:</span> {tls.hosts.length ? tls.hosts.join(', ') : '—'}
                                      </div>
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
                    <ManifestViewer manifest={manifest()} loading={ingressDetailLoading()} />
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

export default IngressListPage;
