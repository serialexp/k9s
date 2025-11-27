// ABOUTME: Main page for viewing KEDA ScaledObjects with real-time updates
// ABOUTME: Supports viewing ScaledObject details, manifests, and deletion
import { batch, createEffect, createSignal, Match, onCleanup, Show, Switch } from 'solid-js';
import { useParams, useNavigate } from '@solidjs/router';
import ScaledObjectTable from '../components/ScaledObjectTable';
import ResourceActions, { type ResourceAction } from '../components/ResourceActions';
import { contextStore } from '../stores/contextStore';
import {
  ApiError,
  deleteScaledObject,
  fetchScaledObject,
  fetchScaledObjectManifest,
  fetchScaledObjects,
  subscribeToScaledObjectEvents,
  type ScaledObjectDetail,
  type ScaledObjectListItem,
  type ScaledObjectWatchEvent
} from '../lib/api';

const applyScaledObjectWatchEvent = (scaledobjects: ScaledObjectListItem[], event: ScaledObjectWatchEvent): ScaledObjectListItem[] => {
  const { type, object } = event;
  switch (type) {
    case 'ADDED':
      return [...scaledobjects.filter((so) => so.name !== object.name), object];
    case 'MODIFIED':
      return scaledobjects.map((so) => (so.name === object.name ? object : so));
    case 'DELETED':
      return scaledobjects.filter((so) => so.name !== object.name);
    default:
      return scaledobjects;
  }
};

const sortScaledObjects = (scaledobjects: ScaledObjectListItem[]) =>
  [...scaledobjects].sort((a, b) => a.name.localeCompare(b.name));

const ScaledObjectListPage = () => {
  const params = useParams<{ context: string; namespace: string; resourceName?: string; tab?: string }>();
  const navigate = useNavigate();

  const context = () => params.context ? decodeURIComponent(params.context) : '';
  const namespace = () => params.namespace ? decodeURIComponent(params.namespace) : '';
  const resourceName = () => params.resourceName ? decodeURIComponent(params.resourceName) : undefined;
  const tab = () => params.tab || 'info';

  const [scaledobjects, setScaledObjects] = createSignal<ScaledObjectListItem[]>([]);
  const [scaledobjectsLoading, setScaledObjectsLoading] = createSignal(false);
  const [scaledobjectsError, setScaledObjectsError] = createSignal<string>('');

  const [scaledobjectDetail, setScaledObjectDetail] = createSignal<ScaledObjectDetail | undefined>();
  const [scaledobjectDetailLoading, setScaledObjectDetailLoading] = createSignal(false);
  const [manifest, setManifest] = createSignal<string>('');

  const [contextError, setContextError] = createSignal<string>('');

  let unsubscribeScaledObjectStream: (() => void) | undefined;

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
      const validContext = contexts.find(c => c.name === ctx);
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

  const loadScaledObjects = async (namespace: string) => {
    setScaledObjectsLoading(true);
    setScaledObjectsError('');
    try {
      const items = await fetchScaledObjects(namespace);
      const sorted = sortScaledObjects(items);
      setScaledObjects(sorted);
    } catch (error) {
      console.error('Failed to load scaledobjects', error);
      setScaledObjects([]);
      if (error instanceof ApiError) {
        setScaledObjectsError(error.message);
      } else {
        setScaledObjectsError('Failed to load scaledobjects');
      }
    } finally {
      setScaledObjectsLoading(false);
    }
  };

  const loadScaledObjectDetail = async (namespace: string, scaledobjectName: string) => {
    setScaledObjectDetailLoading(true);
    try {
      const [detail, manifestYaml] = await Promise.all([
        fetchScaledObject(namespace, scaledobjectName),
        fetchScaledObjectManifest(namespace, scaledobjectName)
      ]);
      batch(() => {
        setScaledObjectDetail(detail);
        setManifest(manifestYaml);
      });
    } catch (error) {
      console.error('Failed to load scaledobject detail', error);
      setScaledObjectDetail(undefined);
      setManifest('');
    } finally {
      setScaledObjectDetailLoading(false);
    }
  };

  createEffect(() => {
    const ns = namespace();

    const ctx = context();
    if (!ns || contextError()) return;
    if (contextStore.activeContext() !== ctx) return;

    setScaledObjectDetail(undefined);
    setManifest('');

    void loadScaledObjects(ns);

    if (unsubscribeScaledObjectStream) {
      unsubscribeScaledObjectStream();
    }

    unsubscribeScaledObjectStream = subscribeToScaledObjectEvents(
      ns,
      (event) => {
        setScaledObjects((prev) => sortScaledObjects(applyScaledObjectWatchEvent(prev, event)));
      },
      (error) => {
        console.error('ScaledObject stream error', error);
        setScaledObjectsError(error.message);
      }
    );
  });

  createEffect(() => {
    const ns = namespace();
    const rn = resourceName();

    const ctx = context();
    if (!ns || !rn || contextError()) return;
    if (contextStore.activeContext() !== ctx) return;

    void loadScaledObjectDetail(ns, rn);
  });

  onCleanup(() => {
    unsubscribeScaledObjectStream?.();
  });

  const handleScaledObjectSelect = (scaledobject: ScaledObjectListItem) => {
    const currentTab = tab();
    navigate(`/${encodeURIComponent(context())}/${encodeURIComponent(namespace())}/scaledobjects/${encodeURIComponent(scaledobject.name)}/${currentTab}`);
  };

  const handleTabChange = (tabName: string) => {
    if (resourceName()) {
      navigate(`/${encodeURIComponent(context())}/${encodeURIComponent(namespace())}/scaledobjects/${encodeURIComponent(resourceName()!)}/${tabName}`);
    }
  };

  const handleDeleteScaledObject = async () => {
    const rn = resourceName();
    const ns = namespace();
    if (!rn || !ns) return;

    try {
      await deleteScaledObject(ns, rn);
      navigate(`/${encodeURIComponent(context())}/${encodeURIComponent(ns)}/scaledobjects`);
    } catch (error) {
      console.error('Failed to delete scaledobject', error);
      if (error instanceof ApiError) {
        setScaledObjectsError(error.message);
      } else {
        setScaledObjectsError('Failed to delete scaledobject');
      }
    }
  };

  const scaledobjectActions = (): ResourceAction[] => {
    if (!resourceName()) return [];

    return [
      {
        label: 'Delete',
        variant: 'error',
        icon: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
        onClick: handleDeleteScaledObject,
        confirm: {
          title: 'Delete ScaledObject',
          message: `Are you sure you want to delete ScaledObject "${resourceName()}"? This action cannot be undone.`
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
        <Show when={scaledobjectsError()}>
          <div role="alert" class="alert alert-error">
            <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{scaledobjectsError()}</span>
          </div>
        </Show>
        <section class="grid grid-cols-1 gap-6 xl:grid-cols-2 h-resource-panel">
        <div class="card bg-base-200/30 shadow-lg flex flex-col overflow-hidden">
          <div class="card-body flex-1 overflow-hidden">
            <div class="overflow-y-auto h-full">
              <ScaledObjectTable
                scaledobjects={scaledobjects()}
                selectedScaledObject={resourceName()}
                loading={scaledobjectsLoading()}
                onSelect={handleScaledObjectSelect}
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
              <ResourceActions actions={scaledobjectActions()} />
            </div>
            <div class="divider my-0 flex-shrink-0" />
            <div class="p-6 flex-1 overflow-y-auto">
              <Switch>
                <Match when={tab() === 'info'}>
                  <Show
                    when={!scaledobjectDetailLoading()}
                    fallback={<span class="loading loading-dots" />}
                  >
                    <Show
                      when={scaledobjectDetail()}
                      fallback={<p class="text-sm opacity-60">Select a ScaledObject to view details.</p>}
                    >
                      {(detail) => (
                        <div class="space-y-4">
                          <div>
                            <h3 class="text-sm font-semibold mb-2">Basic Info</h3>
                            <div class="grid grid-cols-2 gap-2 text-sm">
                              <div><span class="opacity-60">Name:</span> {detail().name}</div>
                              <div><span class="opacity-60">Namespace:</span> {detail().namespace}</div>
                              <div><span class="opacity-60">Target Kind:</span> {detail().targetKind}</div>
                              <div><span class="opacity-60">Target Name:</span> {detail().targetName}</div>
                              <div><span class="opacity-60">Status:</span> {detail().ready ? 'Ready' : 'Not Ready'} / {detail().active ? 'Active' : 'Idle'}</div>
                            </div>
                          </div>
                          <div>
                            <h3 class="text-sm font-semibold mb-2">Scaling Config</h3>
                            <div class="grid grid-cols-2 gap-2 text-sm">
                              <div><span class="opacity-60">Min Replicas:</span> {detail().minReplicas ?? '-'}</div>
                              <div><span class="opacity-60">Max Replicas:</span> {detail().maxReplicas ?? '-'}</div>
                              <div><span class="opacity-60">Current Replicas:</span> {detail().currentReplicas ?? '-'}</div>
                              <div><span class="opacity-60">Polling Interval:</span> {detail().pollingInterval ?? '-'}s</div>
                              <div><span class="opacity-60">Cooldown Period:</span> {detail().cooldownPeriod ?? '-'}s</div>
                              <div><span class="opacity-60">Idle Replica Count:</span> {detail().idleReplicaCount ?? '-'}</div>
                            </div>
                          </div>
                          <div>
                            <h3 class="text-sm font-semibold mb-2">Triggers ({detail().triggers.length})</h3>
                            <div class="space-y-1">
                              {detail().triggers.map(trigger => (
                                <div class="text-sm opacity-80">
                                  <span class="font-mono">{trigger.type}</span>
                                  {trigger.name ? ` (${trigger.name})` : ''}
                                </div>
                              ))}
                            </div>
                          </div>
                          <div>
                            <h3 class="text-sm font-semibold mb-2">Conditions</h3>
                            <div class="space-y-1">
                              {detail().conditions.map(condition => (
                                <div class="text-sm opacity-80">
                                  <span class="font-semibold">{condition.type}:</span> {condition.status}
                                  {condition.reason ? ` (${condition.reason})` : ''}
                                  {condition.message ? ` - ${condition.message}` : ''}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </Show>
                  </Show>
                </Match>
                <Match when={tab() === 'manifest'}>
                  <Show
                    when={!scaledobjectDetailLoading()}
                    fallback={<span class="loading loading-dots" />}
                  >
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

export default ScaledObjectListPage;
