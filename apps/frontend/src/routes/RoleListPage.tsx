// ABOUTME: Page component for listing and viewing Kubernetes Roles
// ABOUTME: Supports real-time updates via SSE and CRUD operations
import { batch, createEffect, createSignal, For, Match, onCleanup, Show, Switch } from 'solid-js';
import { useNavigate, useParams } from '@solidjs/router';
import ManifestViewer from '../components/ManifestViewer';
import RoleTable from '../components/RoleTable';
import ResourceActions, { type ResourceAction } from '../components/ResourceActions';
import { contextStore } from '../stores/contextStore';
import {
  ApiError,
  deleteRole,
  fetchRole,
  fetchRoleManifest,
  fetchRoles,
  subscribeToRoleEvents,
  type RoleDetail,
  type RoleListItem,
  type RoleWatchEvent
} from '../lib/api';

const applyRoleWatchEvent = (roles: RoleListItem[], event: RoleWatchEvent): RoleListItem[] => {
  const { type, object } = event;
  switch (type) {
    case 'ADDED':
      return [...roles.filter((r) => r.name !== object.name), object];
    case 'MODIFIED':
      return roles.map((r) => (r.name === object.name ? object : r));
    case 'DELETED':
      return roles.filter((r) => r.name !== object.name);
    default:
      return roles;
  }
};

const sortRoles = (roles: RoleListItem[]) =>
  [...roles].sort((a, b) => a.name.localeCompare(b.name));

const RoleListPage = () => {
  const params = useParams<{ context: string; namespace: string; resourceName?: string; tab?: string }>();
  const navigate = useNavigate();

  const context = () => (params.context ? decodeURIComponent(params.context) : '');
  const namespace = () => (params.namespace ? decodeURIComponent(params.namespace) : '');
  const resourceName = () => (params.resourceName ? decodeURIComponent(params.resourceName) : undefined);
  const tab = () => params.tab || 'info';

  const [roles, setRoles] = createSignal<RoleListItem[]>([]);
  const [rolesLoading, setRolesLoading] = createSignal(false);
  const [rolesError, setRolesError] = createSignal<string>('');

  const [roleDetail, setRoleDetail] = createSignal<RoleDetail | undefined>();
  const [roleDetailLoading, setRoleDetailLoading] = createSignal(false);
  const [manifest, setManifest] = createSignal<string>('');

  const [contextError, setContextError] = createSignal<string>('');

  let unsubscribeRoleStream: (() => void) | undefined;

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

  const loadRoles = async (ns: string) => {
    setRolesLoading(true);
    setRolesError('');
    try {
      const items = await fetchRoles(ns);
      const sorted = sortRoles(items);
      setRoles(sorted);
    } catch (error) {
      console.error('Failed to load roles', error);
      setRoles([]);
      if (error instanceof ApiError) {
        setRolesError(error.message);
      } else {
        setRolesError('Failed to load roles');
      }
    } finally {
      setRolesLoading(false);
    }
  };

  const loadRoleDetail = async (ns: string, name: string) => {
    setRoleDetailLoading(true);
    try {
      const [detail, manifestYaml] = await Promise.all([
        fetchRole(ns, name),
        fetchRoleManifest(ns, name)
      ]);
      batch(() => {
        setRoleDetail(detail);
        setManifest(manifestYaml);
      });
    } catch (error) {
      console.error('Failed to load role detail', error);
      setRoleDetail(undefined);
      setManifest('');
    } finally {
      setRoleDetailLoading(false);
    }
  };

  createEffect(() => {
    const ns = namespace();
    const ctx = context();

    if (!ns || contextError()) return;
    if (contextStore.activeContext() !== ctx) return;

    setRoleDetail(undefined);
    setManifest('');

    void loadRoles(ns);

    if (unsubscribeRoleStream) {
      unsubscribeRoleStream();
    }

    unsubscribeRoleStream = subscribeToRoleEvents(
      ns,
      (event) => {
        setRoles((prev) => sortRoles(applyRoleWatchEvent(prev, event)));
      },
      (error) => {
        console.error('Role stream error', error);
        setRolesError(error.message);
      }
    );
  });

  createEffect(() => {
    const ns = namespace();
    const rn = resourceName();
    const ctx = context();

    if (!ns || !rn || contextError()) return;
    if (contextStore.activeContext() !== ctx) return;

    void loadRoleDetail(ns, rn);
  });

  onCleanup(() => {
    unsubscribeRoleStream?.();
  });

  const handleRoleSelect = (role: RoleListItem) => {
    const currentTab = tab();
    navigate(`/${encodeURIComponent(context())}/${encodeURIComponent(namespace())}/roles/${encodeURIComponent(role.name)}/${currentTab}`);
  };

  const handleTabChange = (tabName: string) => {
    if (resourceName()) {
      navigate(`/${encodeURIComponent(context())}/${encodeURIComponent(namespace())}/roles/${encodeURIComponent(resourceName()!)}/${tabName}`);
    }
  };

  const handleDeleteRole = async () => {
    const rn = resourceName();
    const ns = namespace();
    if (!rn || !ns) return;

    try {
      await deleteRole(ns, rn);
      navigate(`/${encodeURIComponent(context())}/${encodeURIComponent(ns)}/roles`);
    } catch (error) {
      console.error('Failed to delete role', error);
      if (error instanceof ApiError) {
        setRolesError(error.message);
      } else {
        setRolesError('Failed to delete role');
      }
    }
  };

  const roleActions = (): ResourceAction[] => {
    if (!resourceName()) return [];

    return [
      {
        label: 'Delete',
        variant: 'error',
        icon: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
        onClick: handleDeleteRole,
        confirm: {
          title: 'Delete Role',
          message: `Are you sure you want to delete Role "${resourceName()}"? This action cannot be undone.`
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
        <Show when={rolesError()}>
          <div role="alert" class="alert alert-error">
            <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{rolesError()}</span>
          </div>
        </Show>
        <section class="grid grid-cols-1 gap-6 xl:grid-cols-2 h-resource-panel">
          <div class="card bg-base-200/30 shadow-lg flex flex-col overflow-hidden">
            <div class="card-body flex-1 overflow-hidden">
              <div class="overflow-y-auto h-full">
                <RoleTable
                  roles={roles()}
                  selectedRole={resourceName()}
                  loading={rolesLoading()}
                  onSelect={handleRoleSelect}
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
                <ResourceActions actions={roleActions()} />
              </div>
              <div class="divider my-0 flex-shrink-0" />
              <div class="p-6 flex-1 overflow-y-auto">
                <Switch>
                  <Match when={tab() === 'info'}>
                    <Show when={!roleDetailLoading()} fallback={<span class="loading loading-dots" />}>
                      <Show
                        when={roleDetail()}
                        fallback={<p class="text-sm opacity-60">Select a Role to view details.</p>}
                      >
                        {(detail) => (
                          <div class="space-y-4">
                            <div>
                              <h3 class="text-sm font-semibold mb-2">Basic Info</h3>
                              <div class="grid grid-cols-2 gap-2 text-sm">
                                <div><span class="opacity-60">Name:</span> {detail().name}</div>
                                <div><span class="opacity-60">Namespace:</span> {detail().namespace}</div>
                                <div><span class="opacity-60">Rules:</span> {detail().ruleCount}</div>
                                <div><span class="opacity-60">Created:</span> {detail().creationTimestamp || '—'}</div>
                              </div>
                            </div>
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
                    <ManifestViewer manifest={manifest()} loading={roleDetailLoading()} />
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

export default RoleListPage;
