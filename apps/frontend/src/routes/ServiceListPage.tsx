// ABOUTME: Main page for viewing Kubernetes services with real-time updates
// ABOUTME: Supports viewing service details, manifests, and deletion
import { batch, createEffect, createSignal, Match, onCleanup, Show, Switch } from 'solid-js';
import { useParams, useNavigate } from '@solidjs/router';
import ServiceTable from '../components/ServiceTable';
import ResourceActions, { type ResourceAction } from '../components/ResourceActions';
import { contextStore } from '../stores/contextStore';
import {
  ApiError,
  deleteService,
  fetchService,
  fetchServiceEndpoints,
  fetchServiceManifest,
  fetchServicePods,
  fetchServices,
  subscribeToServiceEvents,
  type PodListItem,
  type ServiceDetail,
  type ServiceEndpoint,
  type ServiceListItem,
  type ServiceWatchEvent
} from '../lib/api';

const applyServiceWatchEvent = (services: ServiceListItem[], event: ServiceWatchEvent): ServiceListItem[] => {
  const { type, object } = event;
  switch (type) {
    case 'ADDED':
      return [...services.filter((service) => service.name !== object.name), object];
    case 'MODIFIED':
      return services.map((service) => (service.name === object.name ? object : service));
    case 'DELETED':
      return services.filter((service) => service.name !== object.name);
    default:
      return services;
  }
};

const sortServices = (services: ServiceListItem[]) =>
  [...services].sort((a, b) => a.name.localeCompare(b.name));

const ServiceListPage = () => {
  const params = useParams<{ context: string; namespace: string; resourceName?: string; tab?: string }>();
  const navigate = useNavigate();

  const context = () => params.context ? decodeURIComponent(params.context) : '';
  const namespace = () => params.namespace ? decodeURIComponent(params.namespace) : '';
  const resourceName = () => params.resourceName ? decodeURIComponent(params.resourceName) : undefined;
  const tab = () => params.tab || 'info';

  const [services, setServices] = createSignal<ServiceListItem[]>([]);
  const [servicesLoading, setServicesLoading] = createSignal(false);
  const [servicesError, setServicesError] = createSignal<string>('');

  const [serviceDetail, setServiceDetail] = createSignal<ServiceDetail | undefined>();
  const [serviceDetailLoading, setServiceDetailLoading] = createSignal(false);
  const [manifest, setManifest] = createSignal<string>('');
  const [matchingPods, setMatchingPods] = createSignal<PodListItem[]>([]);
  const [actualEndpoints, setActualEndpoints] = createSignal<ServiceEndpoint[]>([]);
  const [endpointsFromAPI, setEndpointsFromAPI] = createSignal<boolean>(false);

  const [contextError, setContextError] = createSignal<string>('');

  let unsubscribeServiceStream: (() => void) | undefined;

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

  const loadServices = async (namespace: string) => {
    setServicesLoading(true);
    setServicesError('');
    try {
      const items = await fetchServices(namespace);
      const sorted = sortServices(items);
      setServices(sorted);
    } catch (error) {
      console.error('Failed to load services', error);
      setServices([]);
      if (error instanceof ApiError) {
        setServicesError(error.message);
      } else {
        setServicesError('Failed to load services');
      }
    } finally {
      setServicesLoading(false);
    }
  };

  const loadServiceDetail = async (namespace: string, serviceName: string) => {
    setServiceDetailLoading(true);
    try {
      const [detail, manifestYaml, pods, endpointsData] = await Promise.all([
        fetchService(namespace, serviceName),
        fetchServiceManifest(namespace, serviceName),
        fetchServicePods(namespace, serviceName),
        fetchServiceEndpoints(namespace, serviceName)
      ]);
      batch(() => {
        setServiceDetail(detail);
        setManifest(manifestYaml);
        setMatchingPods(pods);
        setActualEndpoints(endpointsData.endpoints);
        setEndpointsFromAPI(endpointsData.fromEndpointsAPI);
      });
    } catch (error) {
      console.error('Failed to load service detail', error);
      setServiceDetail(undefined);
      setManifest('');
      setMatchingPods([]);
      setActualEndpoints([]);
      setEndpointsFromAPI(false);
    } finally {
      setServiceDetailLoading(false);
    }
  };

  createEffect(() => {
    const ns = namespace();

    const ctx = context();
    if (!ns || contextError()) return;
    if (contextStore.activeContext() !== ctx) return;

    setServiceDetail(undefined);
    setManifest('');
    setMatchingPods([]);
    setActualEndpoints([]);
    setEndpointsFromAPI(false);

    void loadServices(ns);

    if (unsubscribeServiceStream) {
      unsubscribeServiceStream();
    }

    unsubscribeServiceStream = subscribeToServiceEvents(
      ns,
      (event) => {
        setServices((prev) => sortServices(applyServiceWatchEvent(prev, event)));
      },
      (error) => {
        console.error('Service stream error', error);
        setServicesError(error.message);
      }
    );
  });

  createEffect(() => {
    const ns = namespace();
    const rn = resourceName();

    const ctx = context();
    if (!ns || !rn || contextError()) return;
    if (contextStore.activeContext() !== ctx) return;

    void loadServiceDetail(ns, rn);
  });

  onCleanup(() => {
    unsubscribeServiceStream?.();
  });

  const handleServiceSelect = (service: ServiceListItem) => {
    const currentTab = tab();
    navigate(`/${encodeURIComponent(context())}/${encodeURIComponent(namespace())}/services/${encodeURIComponent(service.name)}/${currentTab}`);
  };

  const handleTabChange = (tabName: string) => {
    if (resourceName()) {
      navigate(`/${encodeURIComponent(context())}/${encodeURIComponent(namespace())}/services/${encodeURIComponent(resourceName()!)}/${tabName}`);
    }
  };

  const handleDeleteService = async () => {
    const rn = resourceName();
    const ns = namespace();
    if (!rn || !ns) return;

    try {
      await deleteService(ns, rn);
      navigate(`/${encodeURIComponent(context())}/${encodeURIComponent(ns)}/services`);
    } catch (error) {
      console.error('Failed to delete service', error);
      if (error instanceof ApiError) {
        setServicesError(error.message);
      } else {
        setServicesError('Failed to delete service');
      }
    }
  };

  const serviceActions = (): ResourceAction[] => {
    if (!resourceName()) return [];

    return [
      {
        label: 'Delete',
        variant: 'error',
        icon: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
        onClick: handleDeleteService,
        confirm: {
          title: 'Delete Service',
          message: `Are you sure you want to delete service "${resourceName()}"? This action cannot be undone.`
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
        <Show when={servicesError()}>
          <div role="alert" class="alert alert-error">
            <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{servicesError()}</span>
          </div>
        </Show>
        <section class="grid grid-cols-1 gap-6 xl:grid-cols-2 h-resource-panel">
        <div class="card bg-base-200/30 shadow-lg flex flex-col overflow-hidden">
          <div class="card-body flex-1 overflow-hidden">
            <div class="overflow-y-auto h-full">
              <ServiceTable
                services={services()}
                selectedService={resourceName()}
                loading={servicesLoading()}
                onSelect={handleServiceSelect}
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
              <ResourceActions actions={serviceActions()} />
            </div>
            <div class="divider my-0 flex-shrink-0" />
            <div class="p-6 flex-1 overflow-y-auto">
              <Switch>
                <Match when={tab() === 'info'}>
                  <Show
                    when={!serviceDetailLoading()}
                    fallback={<span class="loading loading-dots" />}
                  >
                    <Show
                      when={serviceDetail()}
                      fallback={<p class="text-sm opacity-60">Select a service to view details.</p>}
                    >
                      {(detail) => (
                        <div class="space-y-4">
                          <div>
                            <h3 class="text-sm font-semibold mb-2">Basic Info</h3>
                            <div class="grid grid-cols-2 gap-2 text-sm">
                              <div><span class="opacity-60">Name:</span> {detail().name}</div>
                              <div><span class="opacity-60">Namespace:</span> {detail().namespace}</div>
                              <div><span class="opacity-60">Type:</span> {detail().type}</div>
                              <div><span class="opacity-60">Cluster IP:</span> {detail().clusterIP || '-'}</div>
                              <div><span class="opacity-60">External IP:</span> {detail().externalIP || '-'}</div>
                              <div><span class="opacity-60">Session Affinity:</span> {detail().sessionAffinity || '-'}</div>
                            </div>
                          </div>
                          <div>
                            <h3 class="text-sm font-semibold mb-2">Ports</h3>
                            <div class="space-y-1">
                              {detail().ports.map(port => (
                                <div class="text-sm opacity-80">
                                  {port.name ? `${port.name}: ` : ''}{port.port} → {port.targetPort} ({port.protocol})
                                </div>
                              ))}
                            </div>
                          </div>
                          <div>
                            <h3 class="text-sm font-semibold mb-2">Selector</h3>
                            <div class="space-y-1">
                              {Object.entries(detail().selector).map(([key, value]) => (
                                <div class="text-sm opacity-80">
                                  <span class="font-mono">{key}:</span> {value}
                                </div>
                              ))}
                            </div>
                          </div>
                          <div>
                            <h3 class="text-sm font-semibold mb-2">
                              Matching Pods ({matchingPods().length})
                            </h3>
                            <Show when={matchingPods().length > 0} fallback={
                              <div class="text-sm opacity-60 italic">
                                No pods match this service's selector
                              </div>
                            }>
                              <div class="space-y-1 max-h-48 overflow-y-auto">
                                {matchingPods().map(pod => (
                                  <div class="text-sm opacity-80 flex justify-between items-center gap-2">
                                    <span class="font-mono">{pod.name}</span>
                                    <span class={`badge badge-sm ${
                                      pod.phase === 'Running' ? 'badge-success' :
                                      pod.phase === 'Pending' ? 'badge-warning' :
                                      pod.phase === 'Failed' ? 'badge-error' :
                                      'badge-ghost'
                                    }`}>
                                      {pod.phase}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </Show>
                          </div>
                          <Show when={endpointsFromAPI()}>
                            <div>
                              <h3 class="text-sm font-semibold mb-2">
                                Actual Endpoints ({actualEndpoints().length})
                              </h3>
                              <Show when={actualEndpoints().length > 0} fallback={
                                <div class="text-sm opacity-60 italic">
                                  No endpoints registered by Kubernetes
                                </div>
                              }>
                                <div class="space-y-1 max-h-48 overflow-y-auto">
                                  {actualEndpoints().map(endpoint => (
                                    <div class="text-sm opacity-80 flex justify-between items-center gap-2">
                                      <div class="flex flex-col">
                                        <span class="font-mono">{endpoint.podName || endpoint.ip}</span>
                                        {endpoint.podName && (
                                          <span class="text-xs opacity-60">{endpoint.ip}</span>
                                        )}
                                      </div>
                                      <span class={`badge badge-sm ${
                                        endpoint.ready ? 'badge-success' : 'badge-warning'
                                      }`}>
                                        {endpoint.ready ? 'Ready' : 'Not Ready'}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </Show>
                            </div>
                          </Show>
                        </div>
                      )}
                    </Show>
                  </Show>
                </Match>
                <Match when={tab() === 'manifest'}>
                  <Show
                    when={!serviceDetailLoading()}
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

export default ServiceListPage;
