import { batch, createEffect, createSignal, Match, onCleanup, Show, Switch, For } from 'solid-js';
import { useNavigate, useParams } from '@solidjs/router';
import HpaEventsPanel from '../components/HpaEventsPanel';
import HpaTable from '../components/HpaTable';
import ManifestViewer from '../components/ManifestViewer';
import ResourceActions, { type ResourceAction } from '../components/ResourceActions';
import { contextStore } from '../stores/contextStore';
import {
  ApiError,
  deleteHpa,
  fetchHpa,
  fetchHpaEvents,
  fetchHpaManifest,
  fetchHpas,
  subscribeToHpaEvents,
  type HpaDetail,
  type HpaEvent,
  type HpaListItem,
  type HpaWatchEvent
} from '../lib/api';
import { formatRelativeTime } from '../utils/datetime';

const applyHpaWatchEvent = (hpas: HpaListItem[], event: HpaWatchEvent): HpaListItem[] => {
  const { type, object } = event;
  switch (type) {
    case 'ADDED':
      return [...hpas.filter((hpa) => hpa.name !== object.name), object];
    case 'MODIFIED':
      return hpas.map((hpa) => (hpa.name === object.name ? object : hpa));
    case 'DELETED':
      return hpas.filter((hpa) => hpa.name !== object.name);
    default:
      return hpas;
  }
};

const sortHpas = (hpas: HpaListItem[]) =>
  [...hpas].sort((a, b) => a.name.localeCompare(b.name));

const HpaListPage = () => {
  const params = useParams<{ context: string; namespace: string; resourceName?: string; tab?: string }>();
  const navigate = useNavigate();

  const context = () => (params.context ? decodeURIComponent(params.context) : '');
  const namespace = () => (params.namespace ? decodeURIComponent(params.namespace) : '');
  const resourceName = () => (params.resourceName ? decodeURIComponent(params.resourceName) : undefined);
  const tab = () => params.tab || 'info';

  const [hpas, setHpas] = createSignal<HpaListItem[]>([]);
  const [hpasLoading, setHpasLoading] = createSignal(false);
  const [hpasError, setHpasError] = createSignal<string>('');

  const [hpaDetail, setHpaDetail] = createSignal<HpaDetail | undefined>();
  const [hpaDetailLoading, setHpaDetailLoading] = createSignal(false);
  const [manifest, setManifest] = createSignal<string>('');

  const [contextError, setContextError] = createSignal<string>('');
  const [hpaEvents, setHpaEvents] = createSignal<HpaEvent[]>([]);
  const [hpaEventsLoading, setHpaEventsLoading] = createSignal(false);

  let unsubscribeHpaStream: (() => void) | undefined;

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

  const loadHpas = async (ns: string) => {
    setHpasLoading(true);
    setHpasError('');
    try {
      const items = await fetchHpas(ns);
      const sorted = sortHpas(items);
      setHpas(sorted);
    } catch (error) {
      console.error('Failed to load HPAs', error);
      setHpas([]);
      if (error instanceof ApiError) {
        setHpasError(error.message);
      } else {
        setHpasError('Failed to load HPAs');
      }
    } finally {
      setHpasLoading(false);
    }
  };

  const loadHpaDetail = async (ns: string, name: string) => {
    setHpaDetailLoading(true);
    setHpaEventsLoading(true);
    try {
      const [detail, manifestYaml, events] = await Promise.all([
        fetchHpa(ns, name),
        fetchHpaManifest(ns, name),
        fetchHpaEvents(ns, name)
      ]);
      batch(() => {
        setHpaDetail(detail);
        setManifest(manifestYaml);
        setHpaEvents(events);
      });
    } catch (error) {
      console.error('Failed to load HPA detail', error);
      setHpaDetail(undefined);
      setManifest('');
      setHpaEvents([]);
    } finally {
      setHpaDetailLoading(false);
      setHpaEventsLoading(false);
    }
  };

  createEffect(() => {
    const ns = namespace();
    const ctx = context();

    if (!ns || contextError()) return;
    if (contextStore.activeContext() !== ctx) return;

    setHpaDetail(undefined);
    setManifest('');

    void loadHpas(ns);

    if (unsubscribeHpaStream) {
      unsubscribeHpaStream();
    }

    unsubscribeHpaStream = subscribeToHpaEvents(
      ns,
      (event) => {
        setHpas((prev) => sortHpas(applyHpaWatchEvent(prev, event)));
      },
      (error) => {
        console.error('HPA stream error', error);
        setHpasError(error.message);
      }
    );
  });

  createEffect(() => {
    const ns = namespace();
    const rn = resourceName();
    const ctx = context();

    if (!ns || !rn || contextError()) return;
    if (contextStore.activeContext() !== ctx) return;

    void loadHpaDetail(ns, rn);
  });

  onCleanup(() => {
    unsubscribeHpaStream?.();
  });

  const handleHpaSelect = (hpa: HpaListItem) => {
    const currentTab = tab();
    navigate(`/${encodeURIComponent(context())}/${encodeURIComponent(namespace())}/hpas/${encodeURIComponent(hpa.name)}/${currentTab}`);
  };

  const handleTabChange = (tabName: string) => {
    if (resourceName()) {
      navigate(`/${encodeURIComponent(context())}/${encodeURIComponent(namespace())}/hpas/${encodeURIComponent(resourceName()!)}/${tabName}`);
    }
  };

  const handleDeleteHpa = async () => {
    const rn = resourceName();
    const ns = namespace();
    if (!rn || !ns) return;

    try {
      await deleteHpa(ns, rn);
      navigate(`/${encodeURIComponent(context())}/${encodeURIComponent(ns)}/hpas`);
    } catch (error) {
      console.error('Failed to delete HPA', error);
      if (error instanceof ApiError) {
        setHpasError(error.message);
      } else {
        setHpasError('Failed to delete HPA');
      }
    }
  };

  const hpaActions = (): ResourceAction[] => {
    if (!resourceName()) return [];

    return [
      {
        label: 'Delete',
        variant: 'error',
        icon: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
        onClick: handleDeleteHpa,
        confirm: {
          title: 'Delete HPA',
          message: `Are you sure you want to delete HPA "${resourceName()}"? This action cannot be undone.`
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
        <Show when={hpasError()}>
          <div role="alert" class="alert alert-error">
            <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{hpasError()}</span>
          </div>
        </Show>
        <section class="grid grid-cols-1 gap-6 xl:grid-cols-2 h-resource-panel">
          <div class="card bg-base-200/30 shadow-lg flex flex-col overflow-hidden">
            <div class="card-body flex-1 overflow-hidden">
              <div class="overflow-y-auto h-full">
                <HpaTable
                  hpas={hpas()}
                  selectedHpa={resourceName()}
                  loading={hpasLoading()}
                  onSelect={handleHpaSelect}
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
                <ResourceActions actions={hpaActions()} />
              </div>
              <div class="divider my-0 flex-shrink-0" />
              <div class="p-6 flex-1 overflow-y-auto">
                <Switch>
                  <Match when={tab() === 'info'}>
                    <Show when={!hpaDetailLoading()} fallback={<span class="loading loading-dots" />}>
                      <Show
                        when={hpaDetail()}
                        fallback={<p class="text-sm opacity-60">Select an HPA to view details.</p>}
                      >
                        {(detail) => (
                          <div class="space-y-4">
                            <div>
                              <h3 class="text-sm font-semibold mb-2">Basic Info</h3>
                              <div class="grid grid-cols-2 gap-2 text-sm">
                                <div><span class="opacity-60">Name:</span> {detail().name}</div>
                                <div><span class="opacity-60">Namespace:</span> {detail().namespace}</div>
                                <div><span class="opacity-60">Min Replicas:</span> {detail().minReplicas ?? '—'}</div>
                                <div><span class="opacity-60">Max Replicas:</span> {detail().maxReplicas}</div>
                                <div><span class="opacity-60">Current Replicas:</span> {detail().currentReplicas ?? '—'}</div>
                                <div><span class="opacity-60">Desired Replicas:</span> {detail().desiredReplicas ?? '—'}</div>
                                <div><span class="opacity-60">Created:</span> {detail().creationTimestamp || '—'}</div>
                                <div><span class="opacity-60">Last Scale:</span> {detail().lastScaleTime ? formatRelativeTime(detail().lastScaleTime) : '—'}</div>
                              </div>
                            </div>
                            <Show when={detail().currentMetrics && detail().currentMetrics.length > 0}>
                              <div>
                                <h3 class="text-sm font-semibold mb-2">Current Metrics</h3>
                                <div class="space-y-2">
                                  <For each={detail().currentMetrics}>
                                    {(metric) => (
                                      <div class="rounded-lg bg-base-200/40 p-3">
                                        <div class="flex items-center justify-between text-sm mb-1">
                                          <span class="font-semibold">{metric.name}</span>
                                          <span class="badge badge-sm badge-ghost">{metric.type}</span>
                                        </div>
                                        <div class="grid grid-cols-2 gap-2 text-xs">
                                          <Show when={metric.currentAverageUtilization !== undefined || metric.targetAverageUtilization !== undefined}>
                                            <div>
                                              <span class="opacity-60">Current:</span>{' '}
                                              <span class={metric.currentAverageUtilization !== undefined && metric.targetAverageUtilization !== undefined && metric.currentAverageUtilization < metric.targetAverageUtilization ? 'text-success' : ''}>
                                                {metric.currentAverageUtilization ?? '—'}%
                                              </span>
                                            </div>
                                            <div>
                                              <span class="opacity-60">Target:</span> {metric.targetAverageUtilization ?? '—'}%
                                            </div>
                                          </Show>
                                          <Show when={metric.currentAverageValue || metric.targetAverageValue}>
                                            <div><span class="opacity-60">Current Avg:</span> {metric.currentAverageValue || '—'}</div>
                                            <div><span class="opacity-60">Target Avg:</span> {metric.targetAverageValue || '—'}</div>
                                          </Show>
                                          <Show when={metric.currentValue || metric.targetValue}>
                                            <div><span class="opacity-60">Current:</span> {metric.currentValue || '—'}</div>
                                            <div><span class="opacity-60">Target:</span> {metric.targetValue || '—'}</div>
                                          </Show>
                                        </div>
                                      </div>
                                    )}
                                  </For>
                                </div>
                              </div>
                            </Show>
                            <Show when={detail().behavior}>
                              <div>
                                <h3 class="text-sm font-semibold mb-2">Scaling Behavior</h3>
                                <div class="grid grid-cols-2 gap-4 text-sm">
                                  <Show when={detail().behavior?.scaleDown}>
                                    <div class="rounded-lg bg-base-200/40 p-3">
                                      <div class="font-semibold text-xs mb-2">Scale Down</div>
                                      <div class="text-xs space-y-1">
                                        <div>
                                          <span class="opacity-60">Stabilization:</span>{' '}
                                          {detail().behavior?.scaleDown?.stabilizationWindowSeconds ?? 300}s
                                        </div>
                                        <Show when={detail().behavior?.scaleDown?.selectPolicy}>
                                          <div>
                                            <span class="opacity-60">Policy:</span>{' '}
                                            {detail().behavior?.scaleDown?.selectPolicy}
                                          </div>
                                        </Show>
                                        <Show when={detail().behavior?.scaleDown?.policies?.length}>
                                          <div class="mt-2">
                                            <span class="opacity-60">Rules:</span>
                                            <For each={detail().behavior?.scaleDown?.policies}>
                                              {(policy) => (
                                                <div class="ml-2 opacity-80">
                                                  {policy.type}: {policy.value} per {policy.periodSeconds}s
                                                </div>
                                              )}
                                            </For>
                                          </div>
                                        </Show>
                                      </div>
                                    </div>
                                  </Show>
                                  <Show when={detail().behavior?.scaleUp}>
                                    <div class="rounded-lg bg-base-200/40 p-3">
                                      <div class="font-semibold text-xs mb-2">Scale Up</div>
                                      <div class="text-xs space-y-1">
                                        <div>
                                          <span class="opacity-60">Stabilization:</span>{' '}
                                          {detail().behavior?.scaleUp?.stabilizationWindowSeconds ?? 0}s
                                        </div>
                                        <Show when={detail().behavior?.scaleUp?.selectPolicy}>
                                          <div>
                                            <span class="opacity-60">Policy:</span>{' '}
                                            {detail().behavior?.scaleUp?.selectPolicy}
                                          </div>
                                        </Show>
                                        <Show when={detail().behavior?.scaleUp?.policies?.length}>
                                          <div class="mt-2">
                                            <span class="opacity-60">Rules:</span>
                                            <For each={detail().behavior?.scaleUp?.policies}>
                                              {(policy) => (
                                                <div class="ml-2 opacity-80">
                                                  {policy.type}: {policy.value} per {policy.periodSeconds}s
                                                </div>
                                              )}
                                            </For>
                                          </div>
                                        </Show>
                                      </div>
                                    </div>
                                  </Show>
                                </div>
                              </div>
                            </Show>
                            <div>
                              <h3 class="text-sm font-semibold mb-2">Scale Target</h3>
                              <div class="grid grid-cols-2 gap-2 text-sm">
                                <div><span class="opacity-60">API Version:</span> {detail().scaleTargetRef.apiVersion || '—'}</div>
                                <div><span class="opacity-60">Kind:</span> {detail().scaleTargetRef.kind || '—'}</div>
                                <div><span class="opacity-60">Name:</span> {detail().scaleTargetRef.name || '—'}</div>
                              </div>
                            </div>
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
                                          <div class="text-xs opacity-40 mt-1">{condition.lastTransitionTime}</div>
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
                    <ManifestViewer manifest={manifest()} loading={hpaDetailLoading()} />
                  </Match>
                  <Match when={tab() === 'events'}>
                    <HpaEventsPanel events={hpaEvents()} loading={hpaEventsLoading()} />
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

export default HpaListPage;
