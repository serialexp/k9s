// ABOUTME: Helm releases list page with real-time watch updates and detail panel
// ABOUTME: Deduplicates watch events by release name, keeping only the highest revision
import { batch, createEffect, createSignal, Match, onCleanup, Show, Switch } from 'solid-js';
import { useNavigate, useParams } from '@solidjs/router';
import ManifestViewer from '../components/ManifestViewer';
import HelmReleaseTable from '../components/HelmReleaseTable';
import { contextStore } from '../stores/contextStore';
import {
  ApiError,
  fetchHelmRelease,
  fetchHelmReleaseManifest,
  fetchHelmReleases,
  subscribeToHelmReleaseEvents,
  type HelmReleaseDetail,
  type HelmReleaseListItem,
  type HelmReleaseWatchEvent
} from '../lib/api';

const applyHelmReleaseWatchEvent = (releases: HelmReleaseListItem[], event: HelmReleaseWatchEvent): HelmReleaseListItem[] => {
  const { type, object } = event;
  switch (type) {
    case 'ADDED':
    case 'MODIFIED': {
      const existing = releases.find((r) => r.name === object.name);
      if (existing && existing.revision > object.revision) {
        return releases;
      }
      return [...releases.filter((r) => r.name !== object.name), object];
    }
    case 'DELETED': {
      const current = releases.find((r) => r.name === object.name);
      if (current && current.revision === object.revision) {
        return releases.filter((r) => r.name !== object.name);
      }
      return releases;
    }
    default:
      return releases;
  }
};

const sortReleases = (releases: HelmReleaseListItem[]) =>
  [...releases].sort((a, b) => a.name.localeCompare(b.name));

const HelmReleaseListPage = () => {
  const params = useParams<{ context: string; namespace: string; resourceName?: string; tab?: string }>();
  const navigate = useNavigate();

  const context = () => (params.context ? decodeURIComponent(params.context) : '');
  const namespace = () => (params.namespace ? decodeURIComponent(params.namespace) : '');
  const resourceName = () => (params.resourceName ? decodeURIComponent(params.resourceName) : undefined);
  const tab = () => params.tab || 'info';

  const [releases, setReleases] = createSignal<HelmReleaseListItem[]>([]);
  const [releasesLoading, setReleasesLoading] = createSignal(false);
  const [releasesError, setReleasesError] = createSignal<string>('');

  const [releaseDetail, setReleaseDetail] = createSignal<HelmReleaseDetail | undefined>();
  const [releaseDetailLoading, setReleaseDetailLoading] = createSignal(false);
  const [manifest, setManifest] = createSignal<string>('');

  const [contextError, setContextError] = createSignal<string>('');

  let unsubscribeStream: (() => void) | undefined;

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

  const loadReleases = async (ns: string) => {
    setReleasesLoading(true);
    setReleasesError('');
    try {
      const items = await fetchHelmReleases(ns);
      const sorted = sortReleases(items);
      setReleases(sorted);
    } catch (error) {
      console.error('Failed to load helm releases', error);
      setReleases([]);
      if (error instanceof ApiError) {
        setReleasesError(error.message);
      } else {
        setReleasesError('Failed to load helm releases');
      }
    } finally {
      setReleasesLoading(false);
    }
  };

  const loadReleaseDetail = async (ns: string, name: string) => {
    setReleaseDetailLoading(true);
    try {
      const [detail, manifestYaml] = await Promise.all([
        fetchHelmRelease(ns, name),
        fetchHelmReleaseManifest(ns, name)
      ]);
      batch(() => {
        setReleaseDetail(detail);
        setManifest(manifestYaml);
      });
    } catch (error) {
      console.error('Failed to load helm release detail', error);
      setReleaseDetail(undefined);
      setManifest('');
    } finally {
      setReleaseDetailLoading(false);
    }
  };

  createEffect(() => {
    const ns = namespace();
    const ctx = context();

    if (!ns || contextError()) return;
    if (contextStore.activeContext() !== ctx) return;

    setReleaseDetail(undefined);
    setManifest('');

    void loadReleases(ns);

    if (unsubscribeStream) {
      unsubscribeStream();
    }

    unsubscribeStream = subscribeToHelmReleaseEvents(
      ns,
      (event) => {
        setReleases((prev) => sortReleases(applyHelmReleaseWatchEvent(prev, event)));
      },
      (error) => {
        if (error) console.error('Helm release stream error', error);
        setReleasesError(error?.message ?? '');
      }
    );
  });

  createEffect(() => {
    const ns = namespace();
    const rn = resourceName();
    const ctx = context();

    if (!ns || !rn || contextError()) return;
    if (contextStore.activeContext() !== ctx) return;

    void loadReleaseDetail(ns, rn);
  });

  onCleanup(() => {
    unsubscribeStream?.();
  });

  const handleReleaseSelect = (release: HelmReleaseListItem) => {
    const currentTab = tab();
    navigate(`/${encodeURIComponent(context())}/${encodeURIComponent(namespace())}/helmreleases/${encodeURIComponent(release.name)}/${currentTab}`);
  };

  const handleTabChange = (tabName: string) => {
    if (resourceName()) {
      navigate(`/${encodeURIComponent(context())}/${encodeURIComponent(namespace())}/helmreleases/${encodeURIComponent(resourceName()!)}/${tabName}`);
    }
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
        <Show when={releasesError()}>
          <div role="alert" class="alert alert-error">
            <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{releasesError()}</span>
          </div>
        </Show>
        <section class="grid grid-cols-1 gap-6 xl:grid-cols-2 h-resource-panel">
          <div class="card bg-base-200/30 shadow-lg flex flex-col overflow-hidden">
            <div class="card-body flex-1 overflow-hidden">
              <div class="overflow-y-auto h-full">
                <HelmReleaseTable
                  releases={releases()}
                  selectedRelease={resourceName()}
                  loading={releasesLoading()}
                  onSelect={handleReleaseSelect}
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
              </div>
              <div class="divider my-0 flex-shrink-0" />
              <div class="p-6 flex-1 overflow-y-auto">
                <Switch>
                  <Match when={tab() === 'info'}>
                    <Show when={!releaseDetailLoading()} fallback={<span class="loading loading-dots" />}>
                      <Show
                        when={releaseDetail()}
                        fallback={<p class="text-sm opacity-60">Select a Helm release to view details.</p>}
                      >
                        {(detail) => (
                          <div class="space-y-4">
                            <div>
                              <h3 class="text-sm font-semibold mb-2">Release Info</h3>
                              <div class="grid grid-cols-2 gap-2 text-sm">
                                <div><span class="opacity-60">Name:</span> {detail().name}</div>
                                <div><span class="opacity-60">Namespace:</span> {detail().namespace}</div>
                                <div><span class="opacity-60">Chart:</span> {detail().chart || '—'}</div>
                                <div><span class="opacity-60">Chart Version:</span> {detail().chartVersion || '—'}</div>
                                <div><span class="opacity-60">App Version:</span> {detail().appVersion || '—'}</div>
                                <div>
                                  <span class="opacity-60">Status:</span>{' '}
                                  <span class={`badge badge-sm ${detail().status === 'deployed' ? 'badge-success' : detail().status === 'failed' ? 'badge-error' : 'badge-ghost'}`}>
                                    {detail().status}
                                  </span>
                                </div>
                                <div><span class="opacity-60">Revision:</span> {detail().revision}</div>
                                <div><span class="opacity-60">Updated:</span> {detail().updated || '—'}</div>
                              </div>
                            </div>
                            <Show when={detail().description}>
                              <div>
                                <h3 class="text-sm font-semibold mb-2">Description</h3>
                                <p class="text-sm opacity-80">{detail().description}</p>
                              </div>
                            </Show>
                            <Show when={detail().notes}>
                              <div>
                                <h3 class="text-sm font-semibold mb-2">Notes</h3>
                                <pre class="text-xs opacity-80 whitespace-pre-wrap break-words bg-base-200/40 p-3 rounded-lg overflow-auto max-h-48">
                                  {detail().notes}
                                </pre>
                              </div>
                            </Show>
                            <Show when={detail().values && detail().values !== '{}'}>
                              <div>
                                <h3 class="text-sm font-semibold mb-2">Values</h3>
                                <pre class="text-xs opacity-80 whitespace-pre-wrap break-words bg-base-200/40 p-3 rounded-lg overflow-auto max-h-64">
                                  {detail().values}
                                </pre>
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
                    {/* Read-only: this is Helm's internal release Secret, not a user resource. */}
                    <ManifestViewer manifest={manifest()} loading={releaseDetailLoading()} editable={false} />
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

export default HelmReleaseListPage;
