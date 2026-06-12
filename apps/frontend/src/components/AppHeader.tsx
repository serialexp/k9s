import { createSignal, For, Show, onMount, onCleanup } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { contextStore } from '../stores/contextStore';
import { portForwardStore } from '../stores/portForwardStore';
import PortForwardModal from './PortForwardModal';
import ContextManageDialog from './ContextManageDialog';

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
  const [manageDialogOpen, setManageDialogOpen] = createSignal(false);

  onMount(() => {
    portForwardStore.startPolling();
  });

  onCleanup(() => {
    portForwardStore.stopPolling();
  });

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

  const resourceGroups = [
    {
      label: 'core',
      resources: [
        { value: 'pods', label: 'Pods' },
        { value: 'deployments', label: 'Deployments' },
        { value: 'replicasets', label: 'ReplicaSets' },
        { value: 'statefulsets', label: 'StatefulSets' },
        { value: 'daemonsets', label: 'DaemonSets' },
        { value: 'jobs', label: 'Jobs' },
        { value: 'cronjobs', label: 'CronJobs' },
        { value: 'services', label: 'Services' },
        { value: 'ingresses', label: 'Ingresses' },
        { value: 'configmaps', label: 'ConfigMaps' },
        { value: 'secrets', label: 'Secrets' },
        { value: 'persistentvolumeclaims', label: 'PVCs', title: 'PersistentVolumeClaims' },
        { value: 'serviceaccounts', label: 'ServiceAccounts' },
        { value: 'roles', label: 'Roles' },
        { value: 'hpas', label: 'HPAs', title: 'HorizontalPodAutoscalers' },
        { value: 'pdbs', label: 'PDBs', title: 'PodDisruptionBudgets' },
      ],
    },
    {
      label: 'helm',
      resources: [
        { value: 'helmreleases', label: 'Releases' },
      ],
    },
    {
      label: 'argo',
      resources: [
        { value: 'rollouts', label: 'Rollouts' },
        { value: 'applications', label: 'Apps', title: 'Argo Applications' },
      ],
    },
    {
      label: 'istio',
      resources: [
        { value: 'virtualservices', label: 'VirtualServices' },
        { value: 'gateways', label: 'Gateways' },
        { value: 'destinationrules', label: 'DestinationRules' },
      ],
    },
    {
      label: 'ext-secrets',
      resources: [
        { value: 'externalsecrets', label: 'External Secrets' },
        { value: 'secretstores', label: 'Secret Stores' },
      ],
    },
    {
      label: 'keda',
      resources: [
        { value: 'scaledobjects', label: 'ScaledObjects' },
      ],
    },
  ];

  return (
    <header class="bg-base-200/60 backdrop-blur-md shrink-0 z-30 border-b border-base-300/50">
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
          <button
            class="btn btn-xs btn-outline"
            onClick={() => setManageDialogOpen(true)}
            title="Manage contexts"
          >
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Manage
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
              onClick={() => handleResourceTypeChange('node-events')}
            >
              Node Events
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
              onClick={() => handleResourceTypeChange('crds')}
              title="CustomResourceDefinitions"
            >
              CRDs
            </button>
            <button
              type="button"
              class="btn btn-xs btn-outline"
              onClick={() => handleResourceTypeChange('storageclasses')}
            >
              StorageClasses
            </button>
            <button
              type="button"
              class="btn btn-xs btn-outline"
              onClick={() => handleResourceTypeChange('ingressclasses')}
            >
              IngressClasses
            </button>
            <button
              type="button"
              class="btn btn-xs btn-outline"
              onClick={() => handleResourceTypeChange('clusterroles')}
            >
              ClusterRoles
            </button>
            <div class="flex items-center gap-2 ml-2">
              <span class="text-xs uppercase opacity-60">Karpenter</span>
              <button
                type="button"
                class="btn btn-xs btn-outline"
                onClick={() => handleResourceTypeChange('nodeclasses')}
              >
                NodeClasses
              </button>
              <button
                type="button"
                class="btn btn-xs btn-outline"
                onClick={() => handleResourceTypeChange('nodepools')}
              >
                NodePools
              </button>
            </div>
            <div class="flex items-center gap-2 ml-2">
              <span class="text-xs uppercase opacity-60">System</span>
              <button
                type="button"
                class="btn btn-xs btn-outline"
                onClick={() => handleResourceTypeChange('installed-apps')}
              >
                Apps
              </button>
              <button
                type="button"
                class={`btn btn-xs ${portForwardStore.count() > 0 ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => portForwardStore.openModal()}
            >
              Port Forwards
              <Show when={portForwardStore.count() > 0}>
                <span class="badge badge-xs">{portForwardStore.count()}</span>
              </Show>
            </button>
            </div>
          </div>
        </div>
        <div class="flex flex-wrap gap-1 items-center">
          <For each={resourceGroups}>
            {(group) => (
              <div class="flex items-center gap-1">
                <span class="text-[0.6rem] uppercase opacity-40">{group.label}</span>
                <For each={group.resources}>
                  {(resourceType) => (
                    <button
                      type="button"
                      class={`btn btn-xs ${props.currentResourceType === resourceType.value ? 'btn-primary' : 'btn-ghost'}`}
                      onClick={() => handleResourceTypeChange(resourceType.value)}
                      title={resourceType.title}
                    >
                      {resourceType.label}
                    </button>
                  )}
                </For>
              </div>
            )}
          </For>
        </div>
      </div>
      <PortForwardModal />
      <ContextManageDialog
        open={manageDialogOpen()}
        onClose={() => setManageDialogOpen(false)}
      />
    </header>
  );
};

export default AppHeader;
