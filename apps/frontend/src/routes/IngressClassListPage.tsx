import { batch, createEffect, createSignal, Match, onCleanup, Switch } from 'solid-js';
import { useNavigate, useParams } from '@solidjs/router';
import ManifestViewer from '../components/ManifestViewer';
import IngressClassTable from '../components/IngressClassTable';
import IngressClassInfoPanel from '../components/IngressClassInfoPanel';
import ResourceActions, { type ResourceAction } from '../components/ResourceActions';
import { contextStore } from '../stores/contextStore';
import {
  ApiError,
  deleteIngressClass,
  fetchIngressClass,
  fetchIngressClassManifest,
  fetchIngressClasses,
  subscribeToIngressClassEvents,
  type IngressClassDetail,
  type IngressClassListItem,
  type IngressClassWatchEvent
} from '../lib/api';
import ResourceListLayout from '../components/ResourceListLayout';

const applyIngressClassWatchEvent = (ingressClasses: IngressClassListItem[], event: IngressClassWatchEvent): IngressClassListItem[] => {
  const { type, object } = event;
  switch (type) {
    case 'ADDED':
      return [...ingressClasses.filter((ic) => ic.name !== object.name), object];
    case 'MODIFIED':
      return ingressClasses.map((ic) => (ic.name === object.name ? object : ic));
    case 'DELETED':
      return ingressClasses.filter((ic) => ic.name !== object.name);
    default:
      return ingressClasses;
  }
};

const sortIngressClasses = (ingressClasses: IngressClassListItem[]) =>
  [...ingressClasses].sort((a, b) => a.name.localeCompare(b.name));

const IngressClassListPage = () => {
  const params = useParams<{ context: string; namespace: string; resourceName?: string; tab?: string }>();
  const navigate = useNavigate();

  const context = () => (params.context ? decodeURIComponent(params.context) : '');
  const namespace = () => (params.namespace ? decodeURIComponent(params.namespace) : '');
  const resourceName = () => (params.resourceName ? decodeURIComponent(params.resourceName) : undefined);
  const tab = () => params.tab || 'info';

  const [ingressClasses, setIngressClasses] = createSignal<IngressClassListItem[]>([]);
  const [ingressClassesLoading, setIngressClassesLoading] = createSignal(false);
  const [ingressClassesError, setIngressClassesError] = createSignal<string>('');

  const [ingressClassDetail, setIngressClassDetail] = createSignal<IngressClassDetail | undefined>();
  const [ingressClassDetailLoading, setIngressClassDetailLoading] = createSignal(false);
  const [manifest, setManifest] = createSignal<string>('');

  const [contextError, setContextError] = createSignal<string>('');

  let unsubscribeIngressClassStream: (() => void) | undefined;

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

  const loadIngressClasses = async () => {
    setIngressClassesLoading(true);
    setIngressClassesError('');
    try {
      const items = await fetchIngressClasses();
      setIngressClasses(sortIngressClasses(items));
    } catch (error) {
      console.error('Failed to load ingress classes', error);
      setIngressClasses([]);
      if (error instanceof ApiError) {
        setIngressClassesError(error.message);
      } else {
        setIngressClassesError('Failed to load ingress classes');
      }
    } finally {
      setIngressClassesLoading(false);
    }
  };

  const loadIngressClassDetail = async (name: string) => {
    setIngressClassDetailLoading(true);
    try {
      const [detail, manifestYaml] = await Promise.all([
        fetchIngressClass(name),
        fetchIngressClassManifest(name)
      ]);
      batch(() => {
        setIngressClassDetail(detail);
        setManifest(manifestYaml);
      });
    } catch (error) {
      console.error('Failed to load ingress class detail', error);
      setIngressClassDetail(undefined);
      setManifest('');
    } finally {
      setIngressClassDetailLoading(false);
    }
  };

  createEffect(() => {
    const ctx = context();

    if (!ctx || contextError()) return;
    if (contextStore.activeContext() !== ctx) return;

    setIngressClassDetail(undefined);
    setManifest('');

    void loadIngressClasses();

    if (unsubscribeIngressClassStream) {
      unsubscribeIngressClassStream();
    }

    unsubscribeIngressClassStream = subscribeToIngressClassEvents(
      (event) => {
        setIngressClasses((prev) => sortIngressClasses(applyIngressClassWatchEvent(prev, event)));
      },
      (error) => {
        if (error) console.error('IngressClass stream error', error);
        setIngressClassesError(error?.message ?? '');
      }
    );
  });

  createEffect(() => {
    const ctx = context();
    const name = resourceName();

    if (!name || contextError()) return;
    if (contextStore.activeContext() !== ctx) return;

    void loadIngressClassDetail(name);
  });

  onCleanup(() => {
    unsubscribeIngressClassStream?.();
  });

  const handleIngressClassSelect = (ic: IngressClassListItem) => {
    const currentTab = tab();
    navigate(`/${encodeURIComponent(context())}/${encodeURIComponent(namespace())}/ingressclasses/${encodeURIComponent(ic.name)}/${currentTab}`);
  };

  const handleTabChange = (tabName: string) => {
    if (resourceName()) {
      navigate(`/${encodeURIComponent(context())}/${encodeURIComponent(namespace())}/ingressclasses/${encodeURIComponent(resourceName()!)}/${tabName}`);
    }
  };

  const handleDeleteIngressClass = async () => {
    const name = resourceName();
    if (!name) return;

    await deleteIngressClass(name);
    navigate(`/${encodeURIComponent(context())}/${encodeURIComponent(namespace())}/ingressclasses`);
  };

  const ingressClassActions = (): ResourceAction[] => {
    if (!resourceName()) return [];

    return [
      {
        label: 'Delete',
        variant: 'error',
        icon: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
        onClick: handleDeleteIngressClass,
        confirm: {
          title: 'Delete Ingress Class',
          message: `Are you sure you want to delete ingress class "${resourceName()}"? This action cannot be undone.`
        }
      }
    ];
  };

  return (
    <ResourceListLayout contextError={contextError()} error={ingressClassesError()}>
          <div class="card bg-base-200/30 shadow-lg flex flex-col overflow-hidden">
            <div class="card-body flex-1 overflow-hidden">
              <div class="overflow-y-auto h-full">
                <IngressClassTable
                  ingressClasses={ingressClasses()}
                  selectedIngressClass={resourceName()}
                  loading={ingressClassesLoading()}
                  onSelect={handleIngressClassSelect}
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
                <ResourceActions actions={ingressClassActions()} />
              </div>
              <div class="divider my-0 flex-shrink-0" />
              <div class="p-6 flex-1 overflow-y-auto">
                <Switch>
                  <Match when={tab() === 'info'}>
                    <IngressClassInfoPanel ingressClass={ingressClassDetail()} loading={ingressClassDetailLoading()} />
                  </Match>
                  <Match when={tab() === 'manifest'}>
                    <ManifestViewer manifest={manifest()} loading={ingressClassDetailLoading()} />
                  </Match>
                </Switch>
              </div>
            </div>
          </div>
    </ResourceListLayout>
  );
};

export default IngressClassListPage;
