// ABOUTME: Page component for listing and viewing Kubernetes ClusterRoles
// ABOUTME: Supports real-time updates via SSE and CRUD operations
import { batch, createEffect, createSignal, For, Match, onCleanup, Show, Switch } from 'solid-js';
import { useNavigate, useParams } from '@solidjs/router';
import ClusterRoleTable from '../components/ClusterRoleTable';
import ManifestViewer from '../components/ManifestViewer';
import ResourceActions, { type ResourceAction } from '../components/ResourceActions';
import { contextStore } from '../stores/contextStore';
import {
  ApiError,
  deleteClusterRole,
  fetchClusterRole,
  fetchClusterRoleManifest,
  fetchClusterRoles,
  subscribeToClusterRoleEvents,
  type ClusterRoleDetail,
  type ClusterRoleListItem,
  type ClusterRoleWatchEvent
} from '../lib/api';

const applyClusterRoleWatchEvent = (clusterRoles: ClusterRoleListItem[], event: ClusterRoleWatchEvent): ClusterRoleListItem[] => {
  const { type, object } = event;
  switch (type) {
    case 'ADDED':
      return [...clusterRoles.filter((cr) => cr.name !== object.name), object];
    case 'MODIFIED':
      return clusterRoles.map((cr) => (cr.name === object.name ? object : cr));
    case 'DELETED':
      return clusterRoles.filter((cr) => cr.name !== object.name);
    default:
      return clusterRoles;
  }
};

const sortClusterRoles = (clusterRoles: ClusterRoleListItem[]) =>
  [...clusterRoles].sort((a, b) => a.name.localeCompare(b.name));

const ClusterRoleListPage = () => {
  const params = useParams<{ context: string; namespace: string; resourceName?: string; tab?: string }>();
  const navigate = useNavigate();

  const context = () => (params.context ? decodeURIComponent(params.context) : '');
  const namespace = () => (params.namespace ? decodeURIComponent(params.namespace) : '');
  const resourceName = () => (params.resourceName ? decodeURIComponent(params.resourceName) : undefined);
  const tab = () => params.tab || 'info';

  const [clusterRoles, setClusterRoles] = createSignal<ClusterRoleListItem[]>([]);
  const [clusterRolesLoading, setClusterRolesLoading] = createSignal(false);
  const [clusterRolesError, setClusterRolesError] = createSignal<string>('');

  const [clusterRoleDetail, setClusterRoleDetail] = createSignal<ClusterRoleDetail | undefined>();
  const [clusterRoleDetailLoading, setClusterRoleDetailLoading] = createSignal(false);
  const [manifest, setManifest] = createSignal<string>('');

  const [contextError, setContextError] = createSignal<string>('');

  let unsubscribeClusterRoleStream: (() => void) | undefined;

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

  const loadClusterRoles = async () => {
    setClusterRolesLoading(true);
    setClusterRolesError('');
    try {
      const items = await fetchClusterRoles();
      setClusterRoles(sortClusterRoles(items));
    } catch (error) {
      console.error('Failed to load cluster roles', error);
      setClusterRoles([]);
      if (error instanceof ApiError) {
        setClusterRolesError(error.message);
      } else {
        setClusterRolesError('Failed to load cluster roles');
      }
    } finally {
      setClusterRolesLoading(false);
    }
  };

  const loadClusterRoleDetail = async (name: string) => {
    setClusterRoleDetailLoading(true);
    try {
      const [detail, manifestYaml] = await Promise.all([
        fetchClusterRole(name),
        fetchClusterRoleManifest(name)
      ]);
      batch(() => {
        setClusterRoleDetail(detail);
        setManifest(manifestYaml);
      });
    } catch (error) {
      console.error('Failed to load cluster role detail', error);
      setClusterRoleDetail(undefined);
      setManifest('');
    } finally {
      setClusterRoleDetailLoading(false);
    }
  };

  createEffect(() => {
    const ctx = context();

    if (!ctx || contextError()) return;
    if (contextStore.activeContext() !== ctx) return;

    setClusterRoleDetail(undefined);
    setManifest('');

    void loadClusterRoles();

    if (unsubscribeClusterRoleStream) {
      unsubscribeClusterRoleStream();
    }

    unsubscribeClusterRoleStream = subscribeToClusterRoleEvents(
      (event) => {
        setClusterRoles((prev) => sortClusterRoles(applyClusterRoleWatchEvent(prev, event)));
      },
      (error) => {
        console.error('ClusterRole stream error', error);
        setClusterRolesError(error.message);
      }
    );
  });

  createEffect(() => {
    const ctx = context();
    const name = resourceName();

    if (!name || contextError()) return;
    if (contextStore.activeContext() !== ctx) return;

    void loadClusterRoleDetail(name);
  });

  onCleanup(() => {
    unsubscribeClusterRoleStream?.();
  });

  const handleClusterRoleSelect = (clusterRole: ClusterRoleListItem) => {
    const currentTab = tab();
    navigate(`/${encodeURIComponent(context())}/${encodeURIComponent(namespace())}/clusterroles/${encodeURIComponent(clusterRole.name)}/${currentTab}`);
  };

  const handleTabChange = (tabName: string) => {
    if (resourceName()) {
      navigate(`/${encodeURIComponent(context())}/${encodeURIComponent(namespace())}/clusterroles/${encodeURIComponent(resourceName()!)}/${tabName}`);
    }
  };

  const handleDeleteClusterRole = async () => {
    const name = resourceName();
    if (!name) return;

    try {
      await deleteClusterRole(name);
      navigate(`/${encodeURIComponent(context())}/${encodeURIComponent(namespace())}/clusterroles`);
    } catch (error) {
      console.error('Failed to delete cluster role', error);
      if (error instanceof ApiError) {
        setClusterRolesError(error.message);
      } else {
        setClusterRolesError('Failed to delete cluster role');
      }
    }
  };

  const clusterRoleActions = (): ResourceAction[] => {
    if (!resourceName()) return [];

    return [
      {
        label: 'Delete',
        variant: 'error',
        icon: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
        onClick: handleDeleteClusterRole,
        confirm: {
          title: 'Delete ClusterRole',
          message: `Are you sure you want to delete ClusterRole "${resourceName()}"? This action cannot be undone.`
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
        <Show when={clusterRolesError()}>
          <div role="alert" class="alert alert-error">
            <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{clusterRolesError()}</span>
          </div>
        </Show>
        <section class="grid grid-cols-1 gap-6 xl:grid-cols-2 h-resource-panel">
          <div class="card bg-base-200/30 shadow-lg flex flex-col overflow-hidden">
            <div class="card-body flex-1 overflow-hidden">
              <div class="overflow-y-auto h-full">
                <ClusterRoleTable
                  clusterRoles={clusterRoles()}
                  selectedClusterRole={resourceName()}
                  loading={clusterRolesLoading()}
                  onSelect={handleClusterRoleSelect}
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
                <ResourceActions actions={clusterRoleActions()} />
              </div>
              <div class="divider my-0 flex-shrink-0" />
              <div class="p-6 flex-1 overflow-y-auto">
                <Switch>
                  <Match when={tab() === 'info'}>
                    <Show when={!clusterRoleDetailLoading()} fallback={<span class="loading loading-dots" />}>
                      <Show
                        when={clusterRoleDetail()}
                        fallback={<p class="text-sm opacity-60">Select a ClusterRole to view details.</p>}
                      >
                        {(detail) => (
                          <div class="space-y-4">
                            <div>
                              <h3 class="text-sm font-semibold mb-2">Basic Info</h3>
                              <div class="grid grid-cols-2 gap-2 text-sm">
                                <div><span class="opacity-60">Name:</span> {detail().name}</div>
                                <div><span class="opacity-60">Rules:</span> {detail().ruleCount}</div>
                                <div><span class="opacity-60">Aggregation:</span> {detail().aggregationRule ? 'Yes' : 'No'}</div>
                                <div><span class="opacity-60">Created:</span> {detail().creationTimestamp || '—'}</div>
                              </div>
                            </div>
                            <Show when={detail().aggregationRule}>
                              <div>
                                <h3 class="text-sm font-semibold mb-2">Aggregation Rule</h3>
                                <div class="rounded-lg bg-base-200/40 p-3 text-xs">
                                  <Show
                                    when={detail().aggregationRule?.clusterRoleSelectors?.length}
                                    fallback={<span class="opacity-60">No selectors defined.</span>}
                                  >
                                    <For each={detail().aggregationRule?.clusterRoleSelectors}>
                                      {(selector) => (
                                        <div class="mb-2">
                                          <Show when={selector.matchLabels}>
                                            <div>
                                              <span class="opacity-60">Match Labels:</span>
                                              <div class="font-mono mt-1">
                                                <For each={Object.entries(selector.matchLabels || {})}>
                                                  {([key, value]) => <div>{key}: {value}</div>}
                                                </For>
                                              </div>
                                            </div>
                                          </Show>
                                        </div>
                                      )}
                                    </For>
                                  </Show>
                                </div>
                              </div>
                            </Show>
                            <div>
                              <h3 class="text-sm font-semibold mb-2">Rules</h3>
                              <Show
                                when={detail().rules.length}
                                fallback={<p class="text-sm opacity-60">No rules defined.</p>}
                              >
                                <div class="space-y-3">
                                  <For each={detail().rules}>
                                    {(rule) => (
                                      <div class="rounded-lg bg-base-200/40 p-3 text-xs">
                                        <div class="grid grid-cols-2 gap-2">
                                          <div>
                                            <span class="opacity-60">API Groups:</span>
                                            <div class="font-mono mt-1">{rule.apiGroups.length ? rule.apiGroups.join(', ') : '""'}</div>
                                          </div>
                                          <div>
                                            <span class="opacity-60">Resources:</span>
                                            <div class="font-mono mt-1">{rule.resources.join(', ') || '—'}</div>
                                          </div>
                                          <div>
                                            <span class="opacity-60">Verbs:</span>
                                            <div class="font-mono mt-1">{rule.verbs.join(', ')}</div>
                                          </div>
                                          <Show when={rule.resourceNames?.length}>
                                            <div>
                                              <span class="opacity-60">Resource Names:</span>
                                              <div class="font-mono mt-1">{rule.resourceNames?.join(', ')}</div>
                                            </div>
                                          </Show>
                                          <Show when={rule.nonResourceURLs?.length}>
                                            <div>
                                              <span class="opacity-60">Non-Resource URLs:</span>
                                              <div class="font-mono mt-1">{rule.nonResourceURLs?.join(', ')}</div>
                                            </div>
                                          </Show>
                                        </div>
                                      </div>
                                    )}
                                  </For>
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
                                      <For each={Object.entries(detail().labels)}>
                                        {([key, value]) => (
                                          <div class="text-xs opacity-80">
                                            <span class="font-mono">{key}:</span> {value}
                                          </div>
                                        )}
                                      </For>
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
                                      <For each={Object.entries(detail().annotations)}>
                                        {([key, value]) => (
                                          <div class="text-xs opacity-80">
                                            <span class="font-mono">{key}:</span> {value}
                                          </div>
                                        )}
                                      </For>
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
                    <ManifestViewer manifest={manifest()} loading={clusterRoleDetailLoading()} />
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

export default ClusterRoleListPage;
