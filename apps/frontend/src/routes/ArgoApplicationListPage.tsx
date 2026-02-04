import { batch, createEffect, createSignal, Match, onCleanup, Show, Switch } from 'solid-js';
import { useNavigate, useParams } from '@solidjs/router';
import ArgoApplicationTable from '../components/ArgoApplicationTable';
import ArgoApplicationInfoPanel from '../components/ArgoApplicationInfoPanel';
import ManifestViewer from '../components/ManifestViewer';
import ArgoApplicationStatusPanel from '../components/ArgoApplicationStatusPanel';
import ResourceActions, { type ResourceAction } from '../components/ResourceActions';
import { contextStore } from '../stores/contextStore';
import {
  ApiError,
  deleteArgoApplication,
  fetchArgoApplication,
  fetchArgoApplicationManifest,
  fetchArgoApplicationStatus,
  fetchArgoApplications,
  subscribeToArgoApplicationEvents,
  type ArgoApplicationDetail,
  type ArgoApplicationListItem,
  type ArgoApplicationStatus,
  type ArgoApplicationWatchEvent
} from '../lib/api';

const applyArgoApplicationWatchEvent = (applications: ArgoApplicationListItem[], event: ArgoApplicationWatchEvent): ArgoApplicationListItem[] => {
  const { type, object } = event;
  switch (type) {
    case 'ADDED':
      return [...applications.filter((item) => item.name !== object.name), object];
    case 'MODIFIED':
      return applications.map((item) => (item.name === object.name ? object : item));
    case 'DELETED':
      return applications.filter((item) => item.name !== object.name);
    default:
      return applications;
  }
};

const sortArgoApplications = (applications: ArgoApplicationListItem[]) =>
  [...applications].sort((a, b) => a.name.localeCompare(b.name));

const ArgoApplicationListPage = () => {
  const params = useParams<{ context: string; namespace: string; resourceName?: string; tab?: string }>();
  const navigate = useNavigate();

  const context = () => (params.context ? decodeURIComponent(params.context) : '');
  const namespace = () => (params.namespace ? decodeURIComponent(params.namespace) : '');
  const resourceName = () => (params.resourceName ? decodeURIComponent(params.resourceName) : undefined);
  const tab = () => params.tab || 'info';

  const [applications, setApplications] = createSignal<ArgoApplicationListItem[]>([]);
  const [applicationsLoading, setApplicationsLoading] = createSignal(false);
  const [applicationsError, setApplicationsError] = createSignal<string>('');

  const [applicationDetail, setApplicationDetail] = createSignal<ArgoApplicationDetail | undefined>();
  const [applicationDetailLoading, setApplicationDetailLoading] = createSignal(false);
  const [manifest, setManifest] = createSignal<string>('');

  const [applicationStatus, setApplicationStatus] = createSignal<ArgoApplicationStatus | undefined>();
  const [applicationStatusLoading, setApplicationStatusLoading] = createSignal(false);

  const [contextError, setContextError] = createSignal<string>('');

  let unsubscribeApplicationStream: (() => void) | undefined;

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

  const loadApplications = async (ns: string) => {
    setApplicationsLoading(true);
    setApplicationsError('');
    try {
      const items = await fetchArgoApplications(ns);
      setApplications(sortArgoApplications(items));
    } catch (error) {
      console.error('Failed to load Argo CD applications', error);
      setApplications([]);
      if (error instanceof ApiError) {
        setApplicationsError(error.message);
      } else {
        setApplicationsError('Failed to load Argo CD applications');
      }
    } finally {
      setApplicationsLoading(false);
    }
  };

  const loadApplicationDetail = async (ns: string, name: string) => {
    setApplicationDetailLoading(true);
    setApplicationStatusLoading(true);
    try {
      const [detail, manifestYaml, status] = await Promise.all([
        fetchArgoApplication(ns, name),
        fetchArgoApplicationManifest(ns, name),
        fetchArgoApplicationStatus(ns, name)
      ]);
      batch(() => {
        setApplicationDetail(detail);
        setManifest(manifestYaml);
        setApplicationStatus(status);
      });
    } catch (error) {
      console.error('Failed to load Argo CD application detail', error);
      setApplicationDetail(undefined);
      setManifest('');
      setApplicationStatus(undefined);
    } finally {
      setApplicationDetailLoading(false);
      setApplicationStatusLoading(false);
    }
  };

  createEffect(() => {
    const ns = namespace();
    const ctx = context();

    if (!ns || contextError()) return;
    if (contextStore.activeContext() !== ctx) return;

    setApplicationDetail(undefined);
    setManifest('');
    setApplicationStatus(undefined);

    void loadApplications(ns);

    if (unsubscribeApplicationStream) {
      unsubscribeApplicationStream();
    }

    unsubscribeApplicationStream = subscribeToArgoApplicationEvents(
      ns,
      (event) => {
        setApplications((prev) => sortArgoApplications(applyArgoApplicationWatchEvent(prev, event)));
      },
      (error) => {
        console.error('Argo application stream error', error);
        setApplicationsError(error.message);
      }
    );
  });

  createEffect(() => {
    const ns = namespace();
    const name = resourceName();
    const ctx = context();

    if (!ns || !name || contextError()) return;
    if (contextStore.activeContext() !== ctx) return;

    void loadApplicationDetail(ns, name);
  });

  onCleanup(() => {
    unsubscribeApplicationStream?.();
  });

  const handleApplicationSelect = (application: ArgoApplicationListItem) => {
    const currentTab = tab();
    navigate(`/${encodeURIComponent(context())}/${encodeURIComponent(namespace())}/applications/${encodeURIComponent(application.name)}/${currentTab}`);
  };

  const handleTabChange = (tabName: string) => {
    if (resourceName()) {
      navigate(`/${encodeURIComponent(context())}/${encodeURIComponent(namespace())}/applications/${encodeURIComponent(resourceName()!)}/${tabName}`);
    }
  };

  const handleDeleteApplication = async () => {
    const name = resourceName();
    const ns = namespace();
    if (!name || !ns) return;

    try {
      await deleteArgoApplication(ns, name);
      navigate(`/${encodeURIComponent(context())}/${encodeURIComponent(ns)}/applications`);
    } catch (error) {
      console.error('Failed to delete Argo CD application', error);
      if (error instanceof ApiError) {
        setApplicationsError(error.message);
      } else {
        setApplicationsError('Failed to delete Argo CD application');
      }
    }
  };

  const applicationActions = (): ResourceAction[] => {
    if (!resourceName()) return [];

    return [
      {
        label: 'Delete',
        variant: 'error',
        icon: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
        onClick: handleDeleteApplication,
        confirm: {
          title: 'Delete Argo CD Application',
          message: `Are you sure you want to delete application "${resourceName()}"? This action cannot be undone.`
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
        <Show when={applicationsError()}>
          <div role="alert" class="alert alert-error">
            <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{applicationsError()}</span>
          </div>
        </Show>
        <section class="grid grid-cols-1 gap-6 xl:grid-cols-2 h-resource-panel">
          <div class="card bg-base-200/30 shadow-lg flex flex-col overflow-hidden">
            <div class="card-body flex-1 overflow-hidden">
              <div class="overflow-y-auto h-full">
                <ArgoApplicationTable
                  applications={applications()}
                  selectedApplication={resourceName()}
                  loading={applicationsLoading()}
                  onSelect={handleApplicationSelect}
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
                    class={`tab ${tab() === 'status' ? 'tab-active' : ''}`}
                    onClick={() => handleTabChange('status')}
                  >
                    Status
                  </button>
                </div>
                <ResourceActions actions={applicationActions()} />
              </div>
              <div class="divider my-0 flex-shrink-0" />
              <div class="p-6 flex-1 overflow-y-auto">
                <Switch>
                  <Match when={tab() === 'info'}>
                    <ArgoApplicationInfoPanel application={applicationDetail()} loading={applicationDetailLoading()} />
                  </Match>
                  <Match when={tab() === 'manifest'}>
                    <ManifestViewer manifest={manifest()} loading={applicationDetailLoading()} />
                  </Match>
                  <Match when={tab() === 'status'}>
                    <ArgoApplicationStatusPanel status={applicationStatus()} loading={applicationStatusLoading()} />
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

export default ArgoApplicationListPage;
