import { batch, createEffect, createSignal, Match, onCleanup, Show, Switch } from 'solid-js';
import { useNavigate, useParams } from '@solidjs/router';
import JobTable from '../components/JobTable';
import JobInfoPanel from '../components/JobInfoPanel';
import ManifestViewer from '../components/ManifestViewer';
import JobEventsPanel from '../components/JobEventsPanel';
import JobStatusPanel from '../components/JobStatusPanel';
import ResourceActions, { type ResourceAction } from '../components/ResourceActions';
import { contextStore } from '../stores/contextStore';
import {
  ApiError,
  deleteJob,
  fetchJob,
  fetchJobEvents,
  fetchJobManifest,
  fetchJobStatus,
  fetchJobs,
  subscribeToJobEvents,
  type JobDetail,
  type JobEvent,
  type JobListItem,
  type JobStatus,
  type JobWatchEvent
} from '../lib/api';

const applyJobWatchEvent = (jobs: JobListItem[], event: JobWatchEvent): JobListItem[] => {
  const { type, object } = event;
  switch (type) {
    case 'ADDED':
      return [...jobs.filter((item) => item.name !== object.name), object];
    case 'MODIFIED':
      return jobs.map((item) => (item.name === object.name ? object : item));
    case 'DELETED':
      return jobs.filter((item) => item.name !== object.name);
    default:
      return jobs;
  }
};

const sortJobs = (jobs: JobListItem[]) =>
  [...jobs].sort((a, b) => a.name.localeCompare(b.name));

const JobListPage = () => {
  const params = useParams<{ context: string; namespace: string; resourceName?: string; tab?: string }>();
  const navigate = useNavigate();

  const context = () => (params.context ? decodeURIComponent(params.context) : '');
  const namespace = () => (params.namespace ? decodeURIComponent(params.namespace) : '');
  const resourceName = () => (params.resourceName ? decodeURIComponent(params.resourceName) : undefined);
  const tab = () => params.tab || 'info';

  const [jobs, setJobs] = createSignal<JobListItem[]>([]);
  const [jobsLoading, setJobsLoading] = createSignal(false);
  const [jobsError, setJobsError] = createSignal<string>('');

  const [jobDetail, setJobDetail] = createSignal<JobDetail | undefined>();
  const [jobDetailLoading, setJobDetailLoading] = createSignal(false);
  const [manifest, setManifest] = createSignal<string>('');

  const [jobEvents, setJobEvents] = createSignal<JobEvent[]>([]);
  const [jobEventsLoading, setJobEventsLoading] = createSignal(false);

  const [jobStatus, setJobStatus] = createSignal<JobStatus | undefined>();
  const [jobStatusLoading, setJobStatusLoading] = createSignal(false);

  const [contextError, setContextError] = createSignal<string>('');

  let unsubscribeJobStream: (() => void) | undefined;

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

  const loadJobs = async (ns: string) => {
    setJobsLoading(true);
    setJobsError('');
    try {
      const items = await fetchJobs(ns);
      const sorted = sortJobs(items);
      setJobs(sorted);
    } catch (error) {
      console.error('Failed to load jobs', error);
      setJobs([]);
      if (error instanceof ApiError) {
        setJobsError(error.message);
      } else {
        setJobsError('Failed to load jobs');
      }
    } finally {
      setJobsLoading(false);
    }
  };

  const loadJobDetail = async (ns: string, name: string) => {
    setJobDetailLoading(true);
    setJobEventsLoading(true);
    setJobStatusLoading(true);
    try {
      const [detail, manifestYaml, events, status] = await Promise.all([
        fetchJob(ns, name),
        fetchJobManifest(ns, name),
        fetchJobEvents(ns, name),
        fetchJobStatus(ns, name)
      ]);
      batch(() => {
        setJobDetail(detail);
        setManifest(manifestYaml);
        setJobEvents(events);
        setJobStatus(status);
      });
    } catch (error) {
      console.error('Failed to load job detail', error);
      setJobDetail(undefined);
      setManifest('');
      setJobEvents([]);
      setJobStatus(undefined);
    } finally {
      setJobDetailLoading(false);
      setJobEventsLoading(false);
      setJobStatusLoading(false);
    }
  };

  createEffect(() => {
    const ns = namespace();
    const ctx = context();

    if (!ns || contextError()) return;
    if (contextStore.activeContext() !== ctx) return;

    setJobDetail(undefined);
    setManifest('');
    setJobEvents([]);
    setJobStatus(undefined);

    void loadJobs(ns);

    if (unsubscribeJobStream) {
      unsubscribeJobStream();
    }

    unsubscribeJobStream = subscribeToJobEvents(
      ns,
      (event) => {
        setJobs((prev) => sortJobs(applyJobWatchEvent(prev, event)));
      },
      (error) => {
        console.error('Job stream error', error);
        setJobsError(error.message);
      }
    );
  });

  createEffect(() => {
    const ns = namespace();
    const name = resourceName();
    const ctx = context();

    if (!ns || !name || contextError()) return;
    if (contextStore.activeContext() !== ctx) return;

    void loadJobDetail(ns, name);
  });

  onCleanup(() => {
    unsubscribeJobStream?.();
  });

  const handleJobSelect = (job: JobListItem) => {
    const currentTab = tab();
    navigate(`/${encodeURIComponent(context())}/${encodeURIComponent(namespace())}/jobs/${encodeURIComponent(job.name)}/${currentTab}`);
  };

  const handleTabChange = (tabName: string) => {
    if (resourceName()) {
      navigate(`/${encodeURIComponent(context())}/${encodeURIComponent(namespace())}/jobs/${encodeURIComponent(resourceName()!)}/${tabName}`);
    }
  };

  const handleDeleteJob = async () => {
    const name = resourceName();
    const ns = namespace();
    if (!name || !ns) return;

    try {
      await deleteJob(ns, name);
      navigate(`/${encodeURIComponent(context())}/${encodeURIComponent(ns)}/jobs`);
    } catch (error) {
      console.error('Failed to delete job', error);
      if (error instanceof ApiError) {
        setJobsError(error.message);
      } else {
        setJobsError('Failed to delete job');
      }
    }
  };

  const jobActions = (): ResourceAction[] => {
    if (!resourceName()) return [];

    return [
      {
        label: 'Delete',
        variant: 'error',
        icon: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
        onClick: handleDeleteJob,
        confirm: {
          title: 'Delete Job',
          message: `Are you sure you want to delete job "${resourceName()}"? This will remove the job and associated pods.`
        }
      }
    ];
  };

  if (contextError()) {
    return (
      <main class="p-6">
        <div class="alert alert-error max-w-xl">
          <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{contextError()}</span>
        </div>
      </main>
    );
  }

  return (
    <main class="p-6">
      <div class="flex flex-col gap-6">
        <Show when={jobsError()}>
          <div role="alert" class="alert alert-error">
            <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{jobsError()}</span>
          </div>
        </Show>
        <section class="grid grid-cols-1 gap-6 xl:grid-cols-2 h-resource-panel">
          <div class="card bg-base-200/30 shadow-lg flex flex-col overflow-hidden">
            <div class="card-body flex-1 overflow-hidden">
              <div class="overflow-y-auto h-full">
                <JobTable
                  jobs={jobs()}
                  selectedJob={resourceName()}
                  loading={jobsLoading()}
                  onSelect={handleJobSelect}
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
                  <button
                    type="button"
                    class={`tab ${tab() === 'status' ? 'tab-active' : ''}`}
                    onClick={() => handleTabChange('status')}
                  >
                    Status
                  </button>
                </div>
                <ResourceActions actions={jobActions()} />
              </div>
              <div class="divider my-0 flex-shrink-0" />
              <div class="p-6 flex-1 overflow-y-auto">
                <Switch>
                  <Match when={tab() === 'info'}>
                    <JobInfoPanel job={jobDetail()} loading={jobDetailLoading()} />
                  </Match>
                  <Match when={tab() === 'manifest'}>
                    <ManifestViewer manifest={manifest()} loading={jobDetailLoading()} />
                  </Match>
                  <Match when={tab() === 'events'}>
                    <JobEventsPanel events={jobEvents()} loading={jobEventsLoading()} />
                  </Match>
                  <Match when={tab() === 'status'}>
                    <JobStatusPanel status={jobStatus()} loading={jobStatusLoading()} />
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

export default JobListPage;
