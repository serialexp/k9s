// ABOUTME: Page for listing and viewing PodDisruptionBudget details
// ABOUTME: Includes info panel, manifest viewer, and events tab
import { batch, createEffect, createSignal, Match, onCleanup, Show, Switch, For } from 'solid-js';
import { useNavigate, useParams } from '@solidjs/router';
import PdbEventsPanel from '../components/PdbEventsPanel';
import PdbTable from '../components/PdbTable';
import ManifestViewer from '../components/ManifestViewer';
import ResourceActions, { type ResourceAction } from '../components/ResourceActions';
import { contextStore } from '../stores/contextStore';
import {
  ApiError,
  deletePdb,
  fetchPdb,
  fetchPdbEvents,
  fetchPdbManifest,
  fetchPdbs,
  subscribeToPdbEvents,
  type PdbDetail,
  type PdbEvent,
  type PdbListItem,
  type PdbWatchEvent
} from '../lib/api';
import { formatRelativeTime } from '../utils/datetime';

const applyPdbWatchEvent = (pdbs: PdbListItem[], event: PdbWatchEvent): PdbListItem[] => {
  const { type, object } = event;
  switch (type) {
    case 'ADDED':
      return [...pdbs.filter((pdb) => pdb.name !== object.name), object];
    case 'MODIFIED':
      return pdbs.map((pdb) => (pdb.name === object.name ? object : pdb));
    case 'DELETED':
      return pdbs.filter((pdb) => pdb.name !== object.name);
    default:
      return pdbs;
  }
};

const sortPdbs = (pdbs: PdbListItem[]) =>
  [...pdbs].sort((a, b) => a.name.localeCompare(b.name));

const PdbListPage = () => {
  const params = useParams<{ context: string; namespace: string; resourceName?: string; tab?: string }>();
  const navigate = useNavigate();

  const context = () => (params.context ? decodeURIComponent(params.context) : '');
  const namespace = () => (params.namespace ? decodeURIComponent(params.namespace) : '');
  const resourceName = () => (params.resourceName ? decodeURIComponent(params.resourceName) : undefined);
  const tab = () => params.tab || 'info';

  const [pdbs, setPdbs] = createSignal<PdbListItem[]>([]);
  const [pdbsLoading, setPdbsLoading] = createSignal(false);
  const [pdbsError, setPdbsError] = createSignal<string>('');

  const [pdbDetail, setPdbDetail] = createSignal<PdbDetail | undefined>();
  const [pdbDetailLoading, setPdbDetailLoading] = createSignal(false);
  const [manifest, setManifest] = createSignal<string>('');

  const [contextError, setContextError] = createSignal<string>('');
  const [pdbEvents, setPdbEvents] = createSignal<PdbEvent[]>([]);
  const [pdbEventsLoading, setPdbEventsLoading] = createSignal(false);

  let unsubscribePdbStream: (() => void) | undefined;

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

  const loadPdbs = async (ns: string) => {
    setPdbsLoading(true);
    setPdbsError('');
    try {
      const items = await fetchPdbs(ns);
      const sorted = sortPdbs(items);
      setPdbs(sorted);
    } catch (error) {
      console.error('Failed to load PDBs', error);
      setPdbs([]);
      if (error instanceof ApiError) {
        setPdbsError(error.message);
      } else {
        setPdbsError('Failed to load PodDisruptionBudgets');
      }
    } finally {
      setPdbsLoading(false);
    }
  };

  const loadPdbDetail = async (ns: string, name: string) => {
    setPdbDetailLoading(true);
    setPdbEventsLoading(true);
    try {
      const [detail, manifestYaml, events] = await Promise.all([
        fetchPdb(ns, name),
        fetchPdbManifest(ns, name),
        fetchPdbEvents(ns, name)
      ]);
      batch(() => {
        setPdbDetail(detail);
        setManifest(manifestYaml);
        setPdbEvents(events);
      });
    } catch (error) {
      console.error('Failed to load PDB detail', error);
      setPdbDetail(undefined);
      setManifest('');
      setPdbEvents([]);
    } finally {
      setPdbDetailLoading(false);
      setPdbEventsLoading(false);
    }
  };

  createEffect(() => {
    const ns = namespace();
    const ctx = context();

    if (!ns || contextError()) return;
    if (contextStore.activeContext() !== ctx) return;

    setPdbDetail(undefined);
    setManifest('');
    setPdbEvents([]);

    void loadPdbs(ns);

    if (unsubscribePdbStream) {
      unsubscribePdbStream();
    }

    unsubscribePdbStream = subscribeToPdbEvents(
      ns,
      (event) => {
        setPdbs((prev) => sortPdbs(applyPdbWatchEvent(prev, event)));
      },
      (error) => {
        console.error('PDB stream error', error);
        setPdbsError(error.message);
      }
    );
  });

  createEffect(() => {
    const ns = namespace();
    const rn = resourceName();
    const ctx = context();

    if (!ns || !rn || contextError()) return;
    if (contextStore.activeContext() !== ctx) return;

    void loadPdbDetail(ns, rn);
  });

  onCleanup(() => {
    unsubscribePdbStream?.();
  });

  const handlePdbSelect = (pdb: PdbListItem) => {
    const currentTab = tab();
    navigate(`/${encodeURIComponent(context())}/${encodeURIComponent(namespace())}/pdbs/${encodeURIComponent(pdb.name)}/${currentTab}`);
  };

  const handleTabChange = (tabName: string) => {
    if (resourceName()) {
      navigate(`/${encodeURIComponent(context())}/${encodeURIComponent(namespace())}/pdbs/${encodeURIComponent(resourceName()!)}/${tabName}`);
    }
  };

  const handleDeletePdb = async () => {
    const rn = resourceName();
    const ns = namespace();
    if (!rn || !ns) return;

    try {
      await deletePdb(ns, rn);
      navigate(`/${encodeURIComponent(context())}/${encodeURIComponent(ns)}/pdbs`);
    } catch (error) {
      console.error('Failed to delete PDB', error);
      if (error instanceof ApiError) {
        setPdbsError(error.message);
      } else {
        setPdbsError('Failed to delete PodDisruptionBudget');
      }
    }
  };

  const pdbActions = (): ResourceAction[] => {
    if (!resourceName()) return [];

    return [
      {
        label: 'Delete',
        variant: 'error',
        icon: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
        onClick: handleDeletePdb,
        confirm: {
          title: 'Delete PodDisruptionBudget',
          message: `Are you sure you want to delete PDB "${resourceName()}"? This action cannot be undone.`
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
        <Show when={pdbsError()}>
          <div role="alert" class="alert alert-error">
            <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{pdbsError()}</span>
          </div>
        </Show>
        <section class="grid grid-cols-1 gap-6 xl:grid-cols-2 h-resource-panel">
          <div class="card bg-base-200/30 shadow-lg flex flex-col overflow-hidden">
            <div class="card-body flex-1 overflow-hidden">
              <div class="overflow-y-auto h-full">
                <PdbTable
                  pdbs={pdbs()}
                  selectedPdb={resourceName()}
                  loading={pdbsLoading()}
                  onSelect={handlePdbSelect}
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
                    class={`tab ${tab() === 'events' ? 'tab-active' : ''}`}
                    onClick={() => handleTabChange('events')}
                  >
                    Events
                  </button>
                </div>
                <ResourceActions actions={pdbActions()} />
              </div>
              <div class="divider my-0 flex-shrink-0" />
              <div class="p-6 flex-1 overflow-y-auto">
                <Switch>
                  <Match when={tab() === 'info'}>
                    <Show when={!pdbDetailLoading()} fallback={<span class="loading loading-dots" />}>
                      <Show
                        when={pdbDetail()}
                        fallback={<p class="text-sm opacity-60">Select a PodDisruptionBudget to view details.</p>}
                      >
                        {(detail) => (
                          <div class="space-y-4">
                            <div>
                              <h3 class="text-sm font-semibold mb-2">Basic Info</h3>
                              <div class="grid grid-cols-2 gap-2 text-sm">
                                <div><span class="opacity-60">Name:</span> {detail().name}</div>
                                <div><span class="opacity-60">Namespace:</span> {detail().namespace}</div>
                                <div><span class="opacity-60">Min Available:</span> {detail().minAvailable ?? '—'}</div>
                                <div><span class="opacity-60">Max Unavailable:</span> {detail().maxUnavailable ?? '—'}</div>
                                <div><span class="opacity-60">Current Healthy:</span> {detail().currentHealthy ?? '—'}</div>
                                <div><span class="opacity-60">Desired Healthy:</span> {detail().desiredHealthy ?? '—'}</div>
                                <div><span class="opacity-60">Expected Pods:</span> {detail().expectedPods ?? '—'}</div>
                                <div>
                                  <span class="opacity-60">Disruptions Allowed:</span>{' '}
                                  <span class={detail().disruptionsAllowed === 0 ? 'text-error font-semibold' : ''}>
                                    {detail().disruptionsAllowed ?? '—'}
                                  </span>
                                </div>
                                <div><span class="opacity-60">Created:</span> {formatRelativeTime(detail().creationTimestamp)}</div>
                              </div>
                            </div>
                            <Show when={detail().selector && Object.keys(detail().selector!).length > 0}>
                              <div>
                                <h3 class="text-sm font-semibold mb-2">Selector</h3>
                                <div class="space-y-1">
                                  <For each={Object.entries(detail().selector!)}>
                                    {([key, value]) => (
                                      <div class="text-xs opacity-80">
                                        <span class="font-mono">{key}:</span> {value}
                                      </div>
                                    )}
                                  </For>
                                </div>
                              </div>
                            </Show>
                            <Show when={detail().conditions && detail().conditions!.length > 0}>
                              <div>
                                <h3 class="text-sm font-semibold mb-2">Conditions</h3>
                                <div class="space-y-2">
                                  <For each={detail().conditions}>
                                    {(condition) => (
                                      <div class="rounded-lg bg-base-200/40 p-3">
                                        <div class="flex items-center justify-between text-sm mb-1">
                                          <span class="font-semibold">{condition.type}</span>
                                          <span class={`badge badge-sm ${condition.status === 'True' ? 'badge-success' : 'badge-warning'}`}>
                                            {condition.status}
                                          </span>
                                        </div>
                                        <Show when={condition.reason}>
                                          <div class="text-xs opacity-60">Reason: {condition.reason}</div>
                                        </Show>
                                        <Show when={condition.message}>
                                          <div class="text-xs opacity-60 mt-1">{condition.message}</div>
                                        </Show>
                                        <Show when={condition.lastTransitionTime}>
                                          <div class="text-xs opacity-40 mt-1">{formatRelativeTime(condition.lastTransitionTime)}</div>
                                        </Show>
                                      </div>
                                    )}
                                  </For>
                                </div>
                              </div>
                            </Show>
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
                    <ManifestViewer manifest={manifest()} loading={pdbDetailLoading()} />
                  </Match>
                  <Match when={tab() === 'events'}>
                    <PdbEventsPanel events={pdbEvents()} loading={pdbEventsLoading()} />
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

export default PdbListPage;
