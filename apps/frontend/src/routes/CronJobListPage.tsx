import { batch, createEffect, createSignal, Match, onCleanup, Show, Switch } from 'solid-js';
import { useNavigate, useParams } from '@solidjs/router';
import CronJobTable from '../components/CronJobTable';
import ManifestViewer from '../components/ManifestViewer';
import ResourceActions, { type ResourceAction } from '../components/ResourceActions';
import { contextStore } from '../stores/contextStore';
import {
  ApiError,
  deleteCronJob,
  fetchCronJob,
  fetchCronJobManifest,
  fetchCronJobs,
  subscribeToCronJobEvents,
  updateCronJobSuspend,
  type CronJobDetail,
  type CronJobListItem,
  type CronJobWatchEvent
} from '../lib/api';

const applyCronJobWatchEvent = (cronjobs: CronJobListItem[], event: CronJobWatchEvent): CronJobListItem[] => {
  const { type, object } = event;
  switch (type) {
    case 'ADDED':
      return [...cronjobs.filter((cronjob) => cronjob.name !== object.name), object];
    case 'MODIFIED':
      return cronjobs.map((cronjob) => (cronjob.name === object.name ? object : cronjob));
    case 'DELETED':
      return cronjobs.filter((cronjob) => cronjob.name !== object.name);
    default:
      return cronjobs;
  }
};

const sortCronJobs = (cronjobs: CronJobListItem[]) =>
  [...cronjobs].sort((a, b) => a.name.localeCompare(b.name));

const CronJobListPage = () => {
  const params = useParams<{ context: string; namespace: string; resourceName?: string; tab?: string }>();
  const navigate = useNavigate();

  const context = () => (params.context ? decodeURIComponent(params.context) : '');
  const namespace = () => (params.namespace ? decodeURIComponent(params.namespace) : '');
  const resourceName = () => (params.resourceName ? decodeURIComponent(params.resourceName) : undefined);
  const tab = () => params.tab || 'info';

  const [cronjobs, setCronJobs] = createSignal<CronJobListItem[]>([]);
  const [cronjobsLoading, setCronJobsLoading] = createSignal(false);
  const [cronjobsError, setCronJobsError] = createSignal<string>('');

  const [cronjobDetail, setCronJobDetail] = createSignal<CronJobDetail | undefined>();
  const [cronjobDetailLoading, setCronJobDetailLoading] = createSignal(false);
  const [manifest, setManifest] = createSignal<string>('');

  const [contextError, setContextError] = createSignal<string>('');

  let unsubscribeCronJobStream: (() => void) | undefined;

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

  const loadCronJobs = async (ns: string) => {
    setCronJobsLoading(true);
    setCronJobsError('');
    try {
      const items = await fetchCronJobs(ns);
      const sorted = sortCronJobs(items);
      setCronJobs(sorted);
    } catch (error) {
      console.error('Failed to load cronjobs', error);
      setCronJobs([]);
      if (error instanceof ApiError) {
        setCronJobsError(error.message);
      } else {
        setCronJobsError('Failed to load cronjobs');
      }
    } finally {
      setCronJobsLoading(false);
    }
  };

  const loadCronJobDetail = async (ns: string, name: string) => {
    setCronJobDetailLoading(true);
    try {
      const [detail, manifestYaml] = await Promise.all([
        fetchCronJob(ns, name),
        fetchCronJobManifest(ns, name)
      ]);
      batch(() => {
        setCronJobDetail(detail);
        setManifest(manifestYaml);
      });
    } catch (error) {
      console.error('Failed to load cronjob detail', error);
      setCronJobDetail(undefined);
      setManifest('');
    } finally {
      setCronJobDetailLoading(false);
    }
  };

  createEffect(() => {
    const ns = namespace();
    const ctx = context();

    if (!ns || contextError()) return;
    if (contextStore.activeContext() !== ctx) return;

    setCronJobDetail(undefined);
    setManifest('');

    void loadCronJobs(ns);

    if (unsubscribeCronJobStream) {
      unsubscribeCronJobStream();
    }

    unsubscribeCronJobStream = subscribeToCronJobEvents(
      ns,
      (event) => {
        setCronJobs((prev) => sortCronJobs(applyCronJobWatchEvent(prev, event)));
      },
      (error) => {
        console.error('CronJob stream error', error);
        setCronJobsError(error.message);
      }
    );
  });

  createEffect(() => {
    const ns = namespace();
    const rn = resourceName();
    const ctx = context();

    if (!ns || !rn || contextError()) return;
    if (contextStore.activeContext() !== ctx) return;

    void loadCronJobDetail(ns, rn);
  });

  onCleanup(() => {
    unsubscribeCronJobStream?.();
  });

  const handleCronJobSelect = (cronjob: CronJobListItem) => {
    const currentTab = tab();
    navigate(`/${encodeURIComponent(context())}/${encodeURIComponent(namespace())}/cronjobs/${encodeURIComponent(cronjob.name)}/${currentTab}`);
  };

  const handleTabChange = (tabName: string) => {
    if (resourceName()) {
      navigate(`/${encodeURIComponent(context())}/${encodeURIComponent(namespace())}/cronjobs/${encodeURIComponent(resourceName()!)}/${tabName}`);
    }
  };

  const handleDeleteCronJob = async () => {
    const rn = resourceName();
    const ns = namespace();
    if (!rn || !ns) return;

    try {
      await deleteCronJob(ns, rn);
      navigate(`/${encodeURIComponent(context())}/${encodeURIComponent(ns)}/cronjobs`);
    } catch (error) {
      console.error('Failed to delete cronjob', error);
      if (error instanceof ApiError) {
        setCronJobsError(error.message);
      } else {
        setCronJobsError('Failed to delete cronjob');
      }
    }
  };

  const handleToggleSuspend = async () => {
    const detail = cronjobDetail();
    const rn = resourceName();
    const ns = namespace();
    if (!detail || !rn || !ns) return;

    try {
      await updateCronJobSuspend(ns, rn, !detail.suspend);
      await loadCronJobDetail(ns, rn);
    } catch (error) {
      console.error('Failed to toggle cronjob suspend', error);
      if (error instanceof ApiError) {
        setCronJobsError(error.message);
      } else {
        setCronJobsError('Failed to update cronjob');
      }
    }
  };

  const cronJobActions = (): ResourceAction[] => {
    if (!resourceName()) return [];

    const actions: ResourceAction[] = [];
    const detail = cronjobDetail();

    if (detail) {
      actions.push({
        label: detail.suspend ? 'Resume' : 'Suspend',
        variant: detail.suspend ? 'primary' : 'warning',
        icon: 'M4 4v16m16-16v16M4 12h16',
        onClick: handleToggleSuspend
      });
    }

    actions.push({
      label: 'Delete',
      variant: 'error',
      icon: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
      onClick: handleDeleteCronJob,
      confirm: {
        title: 'Delete CronJob',
        message: `Are you sure you want to delete CronJob "${resourceName()}"? This action cannot be undone.`
      }
    });

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
        <Show when={cronjobsError()}>
          <div role="alert" class="alert alert-error">
            <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{cronjobsError()}</span>
          </div>
        </Show>
        <section class="grid grid-cols-1 gap-6 xl:grid-cols-2 h-resource-panel">
          <div class="card bg-base-200/30 shadow-lg flex flex-col overflow-hidden">
            <div class="card-body flex-1 overflow-hidden">
              <div class="overflow-y-auto h-full">
                <CronJobTable
                  cronjobs={cronjobs()}
                  selectedCronJob={resourceName()}
                  loading={cronjobsLoading()}
                  onSelect={handleCronJobSelect}
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
                <ResourceActions actions={cronJobActions()} />
              </div>
              <div class="divider my-0 flex-shrink-0" />
              <div class="p-6 flex-1 overflow-y-auto">
                <Switch>
                  <Match when={tab() === 'info'}>
                    <Show when={!cronjobDetailLoading()} fallback={<span class="loading loading-dots" />}>
                      <Show
                        when={cronjobDetail()}
                        fallback={<p class="text-sm opacity-60">Select a CronJob to view details.</p>}
                      >
                        {(detail) => (
                          <div class="space-y-4">
                            <div>
                              <h3 class="text-sm font-semibold mb-2">Basic Info</h3>
                              <div class="grid grid-cols-2 gap-2 text-sm">
                                <div><span class="opacity-60">Name:</span> {detail().name}</div>
                                <div><span class="opacity-60">Namespace:</span> {detail().namespace}</div>
                                <div><span class="opacity-60">Schedule:</span> {detail().schedule}</div>
                                <div><span class="opacity-60">Status:</span> {detail().suspend ? 'Suspended' : 'Active'}</div>
                                <div><span class="opacity-60">Concurrency:</span> {detail().concurrencyPolicy || '—'}</div>
                                <div><span class="opacity-60">Active Jobs:</span> {detail().activeJobs}</div>
                                <div><span class="opacity-60">Last Run:</span> {detail().lastScheduleTime || '—'}</div>
                                <div><span class="opacity-60">Last Success:</span> {detail().lastSuccessfulTime || '—'}</div>
                              </div>
                            </div>
                            <div>
                              <h3 class="text-sm font-semibold mb-2">Execution Window</h3>
                              <div class="grid grid-cols-2 gap-2 text-sm">
                                <div><span class="opacity-60">Starting Deadline:</span> {detail().startingDeadlineSeconds ?? '—'}s</div>
                                <div><span class="opacity-60">Successful History:</span> {detail().successfulJobsHistoryLimit ?? '—'}</div>
                                <div><span class="opacity-60">Failed History:</span> {detail().failedJobsHistoryLimit ?? '—'}</div>
                                <div><span class="opacity-60">Created:</span> {detail().creationTimestamp || '—'}</div>
                              </div>
                            </div>
                            <div>
                              <h3 class="text-sm font-semibold mb-2">Job Template</h3>
                              <Show
                                when={detail().jobTemplate.containers.length}
                                fallback={<p class="text-sm opacity-60">No containers defined in the template.</p>}
                              >
                                <div class="space-y-3">
                                  {detail().jobTemplate.containers.map((container) => (
                                    <div class="rounded-lg bg-base-200/40 p-3 text-sm">
                                      <div><span class="opacity-60">Container:</span> {container.name || '—'}</div>
                                      <div><span class="opacity-60">Image:</span> {container.image || '—'}</div>
                                      <Show when={container.command?.length}>
                                        <div><span class="opacity-60">Command:</span> <span class="font-mono">{container.command?.join(' ')}</span></div>
                                      </Show>
                                      <Show when={container.args?.length}>
                                        <div><span class="opacity-60">Args:</span> <span class="font-mono">{container.args?.join(' ')}</span></div>
                                      </Show>
                                    </div>
                                  ))}
                                </div>
                              </Show>
                              <div class="mt-2 text-sm opacity-70">
                                <span class="opacity-60">Restart Policy:</span> {detail().jobTemplate.restartPolicy || '—'}
                              </div>
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
                    <ManifestViewer manifest={manifest()} loading={cronjobDetailLoading()} />
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

export default CronJobListPage;
