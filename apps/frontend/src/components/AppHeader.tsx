import { For, Show } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { contextStore } from '../stores/contextStore';

interface AppHeaderProps {
  currentContext?: string;
  currentNamespace?: string;
  currentResourceType?: string;
  onContextChange: (context: string) => void;
  onNamespaceChange: (namespace: string) => void;
  onResourceTypeChange: (resourceType: string) => void;
}

const AppHeader = (props: AppHeaderProps) => {
  const navigate = useNavigate();

  const handleContextChange = (newContext: string) => {
    props.onContextChange(newContext);
  };

  const handleNamespaceChange = (newNamespace: string) => {
    props.onNamespaceChange(newNamespace);
  };

  const handleResourceTypeChange = (newResourceType: string) => {
    props.onResourceTypeChange(newResourceType);
  };

  const handleImportClick = () => {
    navigate('/import');
  };

  const currentContext = () => props.currentContext || contextStore.selectedContext();
  const currentNamespace = () => props.currentNamespace || contextStore.selectedNamespace();

  // Available resource types
  const resourceTypes = [
    // Workloads
    { value: 'pods', label: 'Pods' },
    { value: 'deployments', label: 'Deployments' },
    { value: 'rollouts', label: 'Rollouts' },
    { value: 'applications', label: 'Argo Apps' },
    { value: 'statefulsets', label: 'StatefulSets' },
    { value: 'daemonsets', label: 'DaemonSets' },
    { value: 'jobs', label: 'Jobs' },
    { value: 'cronjobs', label: 'CronJobs' },
    // Network
    { value: 'services', label: 'Services' },
    { value: 'ingresses', label: 'Ingresses' },
    // Config & Storage
    { value: 'configmaps', label: 'ConfigMaps' },
    { value: 'secrets', label: 'Secrets' },
    { value: 'externalsecrets', label: 'External Secrets' },
    { value: 'secretstores', label: 'Secret Stores' },
    { value: 'crds', label: 'CRDs' },
    { value: 'persistentvolumeclaims', label: 'PVCs' },
    { value: 'storageclasses', label: 'StorageClasses' },
    // Access Control
    { value: 'serviceaccounts', label: 'ServiceAccounts' },
    // Autoscaling
    { value: 'scaledobjects', label: 'ScaledObjects' },
    { value: 'hpas', label: 'HPAs' },
    // Cluster
    { value: 'nodeclasses', label: 'NodeClasses' },
    { value: 'nodepools', label: 'NodePools' },
  ];

  return (
    <header class="bg-base-200/60 backdrop-blur-md sticky top-0 z-30 border-b border-base-300/50">
      <div class="flex items-center justify-between px-4 py-2">
        <div class="text-xl font-semibold">K9s Dashboard</div>
        <div class="flex items-center justify-end gap-2">
          <span class="text-sm opacity-70">Context:</span>
          <Show when={contextStore.contextsLoading()}>
            <span class="loading loading-xs loading-spinner" />
          </Show>
          <select
            class="select select-xs select-bordered font-mono text-left"
            value={currentContext()}
            onChange={(event) => handleContextChange((event.target as HTMLSelectElement).value)}
          >
            <For each={contextStore.contexts()}>
              {(ctx) => (
                <option value={ctx.name}>
                  {ctx.name}
                  {ctx.namespace ? ` (${ctx.namespace})` : ''}
                </option>
              )}
            </For>
          </select>
          <button
            class="btn btn-xs btn-outline btn-primary"
            onClick={handleImportClick}
            title="Import contexts from AWS EKS"
          >
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
            </svg>
            Import
          </button>
        </div>
      </div>
      <div class="flex flex-col gap-2 border-t border-base-300/30 px-4 py-2">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex items-center gap-2">
            <span class="text-sm opacity-70">Namespace:</span>
            <Show when={contextStore.namespacesLoading()}>
              <span class="loading loading-xs loading-spinner" />
            </Show>
            <div class="flex flex-wrap gap-1">
              <Show
                when={contextStore.namespaces().length}
                fallback={<span class="text-xs opacity-50">No namespaces</span>}
              >
                <For each={contextStore.namespaces().slice(0, 8)}>
                  {(namespace) => (
                    <button
                      type="button"
                      class={`btn btn-xs ${currentNamespace() === namespace ? 'btn-primary' : 'btn-ghost'}`}
                      onClick={() => handleNamespaceChange(namespace)}
                    >
                      {namespace}
                    </button>
                  )}
                </For>
                <Show when={contextStore.namespaces().length > 8}>
                  <select
                    class="select select-xs select-bordered font-mono"
                    value={currentNamespace()}
                    onChange={(event) => handleNamespaceChange((event.target as HTMLSelectElement).value)}
                  >
                    <option value="">More...</option>
                    <For each={contextStore.namespaces()}>
                      {(namespace) => (
                        <option value={namespace}>{namespace}</option>
                      )}
                    </For>
                  </select>
                </Show>
              </Show>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-xs uppercase opacity-60">Cluster</span>
            <button
              type="button"
              class="btn btn-xs btn-outline"
              onClick={() => handleResourceTypeChange('nodes')}
            >
              Nodes
            </button>
            <button
              type="button"
              class="btn btn-xs btn-outline"
              onClick={() => handleResourceTypeChange('node-pool-summary')}
            >
              Pools
            </button>
            <button
              type="button"
              class="btn btn-xs btn-outline"
              onClick={() => handleResourceTypeChange('namespaces')}
            >
              Namespaces
            </button>
            <button
              type="button"
              class="btn btn-xs btn-outline"
              onClick={() => handleResourceTypeChange('installed-apps')}
            >
              Apps
            </button>
          </div>
        </div>
        <div class="flex items-center">
          <span class="text-sm opacity-70 mr-2">Resource:</span>
          <div class="flex flex-wrap gap-1">
            <For each={resourceTypes}>
              {(resourceType) => (
                <button
                  type="button"
                  class={`btn btn-xs ${props.currentResourceType === resourceType.value ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => handleResourceTypeChange(resourceType.value)}
                >
                  {resourceType.label}
                </button>
              )}
            </For>
          </div>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
