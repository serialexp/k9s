import { batch, createEffect, createSignal, Match, onCleanup, Show, Switch } from 'solid-js';
import { useNavigate, useParams } from '@solidjs/router';
import ManifestViewer from '../components/ManifestViewer';
import PersistentVolumeClaimTable from '../components/PersistentVolumeClaimTable';
import ResourceActions, { type ResourceAction } from '../components/ResourceActions';
import { contextStore } from '../stores/contextStore';
import {
  ApiError,
  deletePersistentVolumeClaim,
  fetchPersistentVolumeClaim,
  fetchPersistentVolumeClaimManifest,
  fetchPersistentVolumeClaims,
  subscribeToPersistentVolumeClaimEvents,
  type PersistentVolumeClaimDetail,
  type PersistentVolumeClaimListItem,
  type PersistentVolumeClaimWatchEvent
} from '../lib/api';

const applyPersistentVolumeClaimWatchEvent = (pvcs: PersistentVolumeClaimListItem[], event: PersistentVolumeClaimWatchEvent): PersistentVolumeClaimListItem[] => {
  const { type, object } = event;
  switch (type) {
    case 'ADDED':
      return [...pvcs.filter((pvc) => pvc.name !== object.name), object];
    case 'MODIFIED':
      return pvcs.map((pvc) => (pvc.name === object.name ? object : pvc));
    case 'DELETED':
      return pvcs.filter((pvc) => pvc.name !== object.name);
    default:
      return pvcs;
  }
};

const sortPersistentVolumeClaims = (pvcs: PersistentVolumeClaimListItem[]) =>
  [...pvcs].sort((a, b) => a.name.localeCompare(b.name));

const PersistentVolumeClaimListPage = () => {
  const params = useParams<{ context: string; namespace: string; resourceName?: string; tab?: string }>();
  const navigate = useNavigate();

  const context = () => (params.context ? decodeURIComponent(params.context) : '');
  const namespace = () => (params.namespace ? decodeURIComponent(params.namespace) : '');
  const resourceName = () => (params.resourceName ? decodeURIComponent(params.resourceName) : undefined);
  const tab = () => params.tab || 'info';

  const [pvcs, setPvcs] = createSignal<PersistentVolumeClaimListItem[]>([]);
  const [pvcsLoading, setPvcsLoading] = createSignal(false);
  const [pvcsError, setPvcsError] = createSignal<string>('');

  const [pvcDetail, setPvcDetail] = createSignal<PersistentVolumeClaimDetail | undefined>();
  const [pvcDetailLoading, setPvcDetailLoading] = createSignal(false);
  const [manifest, setManifest] = createSignal<string>('');

  const [contextError, setContextError] = createSignal<string>('');

  let unsubscribePvcStream: (() => void) | undefined;

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

  const loadPvcs = async (ns: string) => {
    setPvcsLoading(true);
    setPvcsError('');
    try {
      const items = await fetchPersistentVolumeClaims(ns);
      const sorted = sortPersistentVolumeClaims(items);
      setPvcs(sorted);
    } catch (error) {
      console.error('Failed to load persistentvolumeclaims', error);
      setPvcs([]);
      if (error instanceof ApiError) {
        setPvcsError(error.message);
      } else {
        setPvcsError('Failed to load persistentvolumeclaims');
      }
    } finally {
      setPvcsLoading(false);
    }
  };

  const loadPvcDetail = async (ns: string, name: string) => {
    setPvcDetailLoading(true);
    try {
      const [detail, manifestYaml] = await Promise.all([
        fetchPersistentVolumeClaim(ns, name),
        fetchPersistentVolumeClaimManifest(ns, name)
      ]);
      batch(() => {
        setPvcDetail(detail);
        setManifest(manifestYaml);
      });
    } catch (error) {
      console.error('Failed to load persistentvolumeclaim detail', error);
      setPvcDetail(undefined);
      setManifest('');
    } finally {
      setPvcDetailLoading(false);
    }
  };

  createEffect(() => {
    const ns = namespace();
    const ctx = context();

    if (!ns || contextError()) return;
    if (contextStore.activeContext() !== ctx) return;

    setPvcDetail(undefined);
    setManifest('');

    void loadPvcs(ns);

    if (unsubscribePvcStream) {
      unsubscribePvcStream();
    }

    unsubscribePvcStream = subscribeToPersistentVolumeClaimEvents(
      ns,
      (event) => {
        setPvcs((prev) => sortPersistentVolumeClaims(applyPersistentVolumeClaimWatchEvent(prev, event)));
      },
      (error) => {
        console.error('PersistentVolumeClaim stream error', error);
        setPvcsError(error.message);
      }
    );
  });

  createEffect(() => {
    const ns = namespace();
    const rn = resourceName();
    const ctx = context();

    if (!ns || !rn || contextError()) return;
    if (contextStore.activeContext() !== ctx) return;

    void loadPvcDetail(ns, rn);
  });

  onCleanup(() => {
    unsubscribePvcStream?.();
  });

  const handlePvcSelect = (pvc: PersistentVolumeClaimListItem) => {
    const currentTab = tab();
    navigate(`/${encodeURIComponent(context())}/${encodeURIComponent(namespace())}/persistentvolumeclaims/${encodeURIComponent(pvc.name)}/${currentTab}`);
  };

  const handleTabChange = (tabName: string) => {
    if (resourceName()) {
      navigate(`/${encodeURIComponent(context())}/${encodeURIComponent(namespace())}/persistentvolumeclaims/${encodeURIComponent(resourceName()!)}/${tabName}`);
    }
  };

  const handleDeletePvc = async () => {
    const rn = resourceName();
    const ns = namespace();
    if (!rn || !ns) return;

    try {
      await deletePersistentVolumeClaim(ns, rn);
      navigate(`/${encodeURIComponent(context())}/${encodeURIComponent(ns)}/persistentvolumeclaims`);
    } catch (error) {
      console.error('Failed to delete persistentvolumeclaim', error);
      if (error instanceof ApiError) {
        setPvcsError(error.message);
      } else {
        setPvcsError('Failed to delete persistentvolumeclaim');
      }
    }
  };

  const pvcActions = (): ResourceAction[] => {
    if (!resourceName()) return [];

    return [
      {
        label: 'Delete',
        variant: 'error',
        icon: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
        onClick: handleDeletePvc,
        confirm: {
          title: 'Delete PersistentVolumeClaim',
          message: `Are you sure you want to delete PersistentVolumeClaim "${resourceName()}"? This action cannot be undone.`
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
        <Show when={pvcsError()}>
          <div role="alert" class="alert alert-error">
            <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{pvcsError()}</span>
          </div>
        </Show>
        <section class="grid grid-cols-1 gap-6 xl:grid-cols-2 h-resource-panel">
          <div class="card bg-base-200/30 shadow-lg flex flex-col overflow-hidden">
            <div class="card-body flex-1 overflow-hidden">
              <div class="overflow-y-auto h-full">
                <PersistentVolumeClaimTable
                  pvcs={pvcs()}
                  selectedPvc={resourceName()}
                  loading={pvcsLoading()}
                  onSelect={handlePvcSelect}
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
                <ResourceActions actions={pvcActions()} />
              </div>
              <div class="divider my-0 flex-shrink-0" />
              <div class="p-6 flex-1 overflow-y-auto">
                <Switch>
                  <Match when={tab() === 'info'}>
                    <Show when={!pvcDetailLoading()} fallback={<span class="loading loading-dots" />}>
                      <Show
                        when={pvcDetail()}
                        fallback={<p class="text-sm opacity-60">Select a PersistentVolumeClaim to view details.</p>}
                      >
                        {(detail) => (
                          <div class="space-y-4">
                            <div>
                              <h3 class="text-sm font-semibold mb-2">Basic Info</h3>
                              <div class="grid grid-cols-2 gap-2 text-sm">
                                <div><span class="opacity-60">Name:</span> {detail().name}</div>
                                <div><span class="opacity-60">Namespace:</span> {detail().namespace}</div>
                                <div><span class="opacity-60">Status:</span> {detail().status}</div>
                                <div><span class="opacity-60">StorageClass:</span> {detail().storageClass || '—'}</div>
                                <div><span class="opacity-60">Requested:</span> {detail().storageRequest || detail().requestedStorage || '—'}</div>
                                <div><span class="opacity-60">Capacity:</span> {detail().capacity || '—'}</div>
                                <div><span class="opacity-60">Access Modes:</span> {detail().accessModes.join(', ') || '—'}</div>
                                <div><span class="opacity-60">Volume:</span> {detail().volumeName || '—'}</div>
                                <div><span class="opacity-60">Volume Mode:</span> {detail().volumeMode || '—'}</div>
                                <div><span class="opacity-60">Storage Limit:</span> {detail().storageLimit || '—'}</div>
                              </div>
                            </div>
                            <div>
                              <h3 class="text-sm font-semibold mb-2">Conditions</h3>
                              <Show
                                when={detail().conditions.length}
                                fallback={<p class="text-sm opacity-60">No conditions reported.</p>}
                              >
                                <div class="space-y-2">
                                  {detail().conditions.map((condition) => (
                                    <div class="rounded-lg bg-base-200/40 p-3 text-sm">
                                      <div><span class="opacity-60">Type:</span> {condition.type || '—'}</div>
                                      <div><span class="opacity-60">Status:</span> {condition.status || '—'}</div>
                                      <div><span class="opacity-60">Reason:</span> {condition.reason || '—'}</div>
                                      <div><span class="opacity-60">Message:</span> {condition.message || '—'}</div>
                                      <div><span class="opacity-60">Last Transition:</span> {condition.lastTransitionTime || '—'}</div>
                                    </div>
                                  ))}
                                </div>
                              </Show>
                            </div>
                            <div>
                              <h3 class="text-sm font-semibold mb-2">Selector</h3>
                              <Show
                                when={detail().selector}
                                fallback={<p class="text-sm opacity-60">No selector specified.</p>}
                              >
                                <pre class="overflow-auto rounded-lg bg-base-200/40 p-3 text-xs">
                                  {JSON.stringify(detail().selector, null, 2)}
                                </pre>
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
                    <ManifestViewer manifest={manifest()} loading={pvcDetailLoading()} />
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

export default PersistentVolumeClaimListPage;
