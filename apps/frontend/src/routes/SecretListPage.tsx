import { batch, createEffect, createSignal, Match, onCleanup, Show, Switch } from 'solid-js';
import { useNavigate, useParams } from '@solidjs/router';
import ManifestViewer from '../components/ManifestViewer';
import SecretTable from '../components/SecretTable';
import ResourceActions, { type ResourceAction } from '../components/ResourceActions';
import { contextStore } from '../stores/contextStore';
import {
  ApiError,
  deleteSecret,
  fetchSecret,
  fetchSecretManifest,
  fetchSecrets,
  subscribeToSecretEvents,
  type SecretDetail,
  type SecretListItem,
  type SecretWatchEvent
} from '../lib/api';

const applySecretWatchEvent = (secrets: SecretListItem[], event: SecretWatchEvent): SecretListItem[] => {
  const { type, object } = event;
  switch (type) {
    case 'ADDED':
      return [...secrets.filter((secret) => secret.name !== object.name), object];
    case 'MODIFIED':
      return secrets.map((secret) => (secret.name === object.name ? object : secret));
    case 'DELETED':
      return secrets.filter((secret) => secret.name !== object.name);
    default:
      return secrets;
  }
};

const sortSecrets = (secrets: SecretListItem[]) =>
  [...secrets].sort((a, b) => a.name.localeCompare(b.name));

const decodeBase64 = (value: string): string => {
  try {
    if (typeof globalThis !== 'undefined' && typeof globalThis.atob === 'function') {
      return globalThis.atob(value);
    }
  } catch (error) {
    console.error('Failed to decode base64 secret value', error);
  }
  return '[decoded unavailable]';
};

const SecretListPage = () => {
  const params = useParams<{ context: string; namespace: string; resourceName?: string; tab?: string }>();
  const navigate = useNavigate();

  const context = () => (params.context ? decodeURIComponent(params.context) : '');
  const namespace = () => (params.namespace ? decodeURIComponent(params.namespace) : '');
  const resourceName = () => (params.resourceName ? decodeURIComponent(params.resourceName) : undefined);
  const tab = () => params.tab || 'info';

  const [secrets, setSecrets] = createSignal<SecretListItem[]>([]);
  const [secretsLoading, setSecretsLoading] = createSignal(false);
  const [secretsError, setSecretsError] = createSignal<string>('');

  const [secretDetail, setSecretDetail] = createSignal<SecretDetail | undefined>();
  const [secretDetailLoading, setSecretDetailLoading] = createSignal(false);
  const [manifest, setManifest] = createSignal<string>('');
  const [decodedVisibility, setDecodedVisibility] = createSignal<Record<string, boolean>>({});

  const [contextError, setContextError] = createSignal<string>('');

  let unsubscribeSecretStream: (() => void) | undefined;

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

  const loadSecrets = async (ns: string) => {
    setSecretsLoading(true);
    setSecretsError('');
    try {
      const items = await fetchSecrets(ns);
      const sorted = sortSecrets(items);
      setSecrets(sorted);
    } catch (error) {
      console.error('Failed to load secrets', error);
      setSecrets([]);
      if (error instanceof ApiError) {
        setSecretsError(error.message);
      } else {
        setSecretsError('Failed to load secrets');
      }
    } finally {
      setSecretsLoading(false);
    }
  };

  const loadSecretDetail = async (ns: string, name: string) => {
    setSecretDetailLoading(true);
    try {
      const [detail, manifestYaml] = await Promise.all([
        fetchSecret(ns, name),
        fetchSecretManifest(ns, name)
      ]);
      batch(() => {
        setSecretDetail(detail);
        setManifest(manifestYaml);
      });
    } catch (error) {
      console.error('Failed to load secret detail', error);
      setSecretDetail(undefined);
      setManifest('');
    } finally {
      setSecretDetailLoading(false);
    }
  };

  createEffect(() => {
    const ns = namespace();
    const ctx = context();

    if (!ns || contextError()) return;
    if (contextStore.activeContext() !== ctx) return;

    setSecretDetail(undefined);
    setManifest('');

    void loadSecrets(ns);

    if (unsubscribeSecretStream) {
      unsubscribeSecretStream();
    }

    unsubscribeSecretStream = subscribeToSecretEvents(
      ns,
      (event) => {
        setSecrets((prev) => sortSecrets(applySecretWatchEvent(prev, event)));
      },
      (error) => {
        console.error('Secret stream error', error);
        setSecretsError(error.message);
      }
    );
  });

  createEffect(() => {
    const ns = namespace();
    const rn = resourceName();
    const ctx = context();

    if (!ns || !rn || contextError()) return;
    if (contextStore.activeContext() !== ctx) return;

    void loadSecretDetail(ns, rn);
  });

  createEffect(() => {
    if (secretDetail()) {
      setDecodedVisibility({});
    }
  });

  onCleanup(() => {
    unsubscribeSecretStream?.();
  });

  const handleSecretSelect = (secret: SecretListItem) => {
    const currentTab = tab();
    navigate(`/${encodeURIComponent(context())}/${encodeURIComponent(namespace())}/secrets/${encodeURIComponent(secret.name)}/${currentTab}`);
  };

  const handleTabChange = (tabName: string) => {
    if (resourceName()) {
      navigate(`/${encodeURIComponent(context())}/${encodeURIComponent(namespace())}/secrets/${encodeURIComponent(resourceName()!)}/${tabName}`);
    }
  };

  const toggleDecodedVisibility = (key: string) => {
    setDecodedVisibility((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleDeleteSecret = async () => {
    const rn = resourceName();
    const ns = namespace();
    if (!rn || !ns) return;

    try {
      await deleteSecret(ns, rn);
      navigate(`/${encodeURIComponent(context())}/${encodeURIComponent(ns)}/secrets`);
    } catch (error) {
      console.error('Failed to delete secret', error);
      if (error instanceof ApiError) {
        setSecretsError(error.message);
      } else {
        setSecretsError('Failed to delete secret');
      }
    }
  };

  const secretActions = (): ResourceAction[] => {
    if (!resourceName()) return [];

    return [
      {
        label: 'Delete',
        variant: 'error',
        icon: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
        onClick: handleDeleteSecret,
        confirm: {
          title: 'Delete Secret',
          message: `Are you sure you want to delete Secret "${resourceName()}"? This action cannot be undone.`
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
        <Show when={secretsError()}>
          <div role="alert" class="alert alert-error">
            <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{secretsError()}</span>
          </div>
        </Show>
        <section class="grid grid-cols-1 gap-6 xl:grid-cols-2 h-resource-panel">
          <div class="card bg-base-200/30 shadow-lg flex flex-col overflow-hidden">
            <div class="card-body flex-1 overflow-hidden">
              <div class="overflow-y-auto h-full">
                <SecretTable
                  secrets={secrets()}
                  selectedSecret={resourceName()}
                  loading={secretsLoading()}
                  onSelect={handleSecretSelect}
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
                <ResourceActions actions={secretActions()} />
              </div>
              <div class="divider my-0 flex-shrink-0" />
              <div class="p-6 flex-1 overflow-y-auto">
                <Switch>
                  <Match when={tab() === 'info'}>
                    <Show when={!secretDetailLoading()} fallback={<span class="loading loading-dots" />}>
                      <Show
                        when={secretDetail()}
                        fallback={<p class="text-sm opacity-60">Select a Secret to view details.</p>}
                      >
                        {(detail) => (
                          <div class="space-y-4">
                            <div>
                              <h3 class="text-sm font-semibold mb-2">Basic Info</h3>
                              <div class="grid grid-cols-2 gap-2 text-sm">
                                <div><span class="opacity-60">Name:</span> {detail().name}</div>
                                <div><span class="opacity-60">Namespace:</span> {detail().namespace}</div>
                                <div><span class="opacity-60">Type:</span> {detail().type || '—'}</div>
                                <div><span class="opacity-60">Data Keys:</span> {detail().dataCount}</div>
                                <div><span class="opacity-60">Created:</span> {detail().creationTimestamp || '—'}</div>
                              </div>
                            </div>
                            <div>
                              <h3 class="text-sm font-semibold mb-2">Data (base64)</h3>
                              <Show
                                when={Object.keys(detail().data).length}
                                fallback={<p class="text-sm opacity-60">No data entries.</p>}
                              >
                                <div class="space-y-3">
                                  {Object.entries(detail().data).map(([key, value]) => (
                                    <div class="rounded-lg bg-base-200/40 p-3">
                                      <div class="text-xs opacity-60 font-mono">{key}</div>
                                      <div class="mt-2">
                                        <div class="text-xs opacity-70">Encoded</div>
                                        <pre class="overflow-auto text-xs">{value}</pre>
                                      </div>
                                      <div class="mt-2">
                                        <div class="flex items-center justify-between text-xs opacity-70">
                                          <span>Decoded</span>
                                          <button
                                            type="button"
                                            class="btn btn-ghost btn-xs"
                                            onClick={() => toggleDecodedVisibility(key)}
                                          >
                                            {decodedVisibility()[key] ? 'Hide' : 'Show'}
                                          </button>
                                        </div>
                                        <Show when={decodedVisibility()[key]}>
                                          <pre class="mt-2 overflow-auto text-xs whitespace-pre-wrap break-words">
                                            {decodeBase64(value)}
                                          </pre>
                                        </Show>
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
                    <ManifestViewer manifest={manifest()} loading={secretDetailLoading()} />
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

export default SecretListPage;
