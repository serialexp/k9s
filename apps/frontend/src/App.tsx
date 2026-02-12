import { Router, Route } from '@solidjs/router';
import { onMount, Show } from 'solid-js';
import { contextStore } from './stores/contextStore';
import LayoutWrapper from './components/LayoutWrapper';
import RootRedirect from './routes/RootRedirect';
import ImportPage from './routes/ImportPage';
import ResourceListPage from './routes/ResourceListPage';
import DeploymentListPage from './routes/DeploymentListPage';
import ServiceListPage from './routes/ServiceListPage';
import ScaledObjectListPage from './routes/ScaledObjectListPage';
import CronJobListPage from './routes/CronJobListPage';
import IngressListPage from './routes/IngressListPage';
import DaemonSetListPage from './routes/DaemonSetListPage';
import ConfigMapListPage from './routes/ConfigMapListPage';
import SecretListPage from './routes/SecretListPage';
import HpaListPage from './routes/HpaListPage';
import PdbListPage from './routes/PdbListPage';
import ExternalSecretListPage from './routes/ExternalSecretListPage';
import SecretStoreListPage from './routes/SecretStoreListPage';
import CustomResourceDefinitionListPage from './routes/CustomResourceDefinitionListPage';
import PersistentVolumeClaimListPage from './routes/PersistentVolumeClaimListPage';
import StorageClassListPage from './routes/StorageClassListPage';
import NodeClassListPage from './routes/NodeClassListPage';
import NodePoolListPage from './routes/NodePoolListPage';
import NodePoolSummaryPage from './routes/NodePoolSummaryPage';
import NotFound from './routes/NotFound';
import NodeEventsPage from './routes/NodeEventsPage';
import NodeListPage from './routes/NodeListPage';
import NamespaceListPage from './routes/NamespaceListPage';
import StatefulSetListPage from './routes/StatefulSetListPage';
import JobListPage from './routes/JobListPage';
import ServiceAccountListPage from './routes/ServiceAccountListPage';
import RoleListPage from './routes/RoleListPage';
import ClusterRoleListPage from './routes/ClusterRoleListPage';
import ArgoApplicationListPage from './routes/ArgoApplicationListPage';
import RolloutListPage from './routes/RolloutListPage';
import VirtualServiceListPage from './routes/VirtualServiceListPage';
import GatewayListPage from './routes/GatewayListPage';
import DestinationRuleListPage from './routes/DestinationRuleListPage';
import ApplicationsPage from './routes/ApplicationsPage';

const App = () => {
  onMount(() => {
    contextStore.initializeStore();
  });

  return (
    <div class="min-h-screen bg-backdrop text-base-content">
      <Show
        when={contextStore.appInitialized()}
        fallback={
          <div class="min-h-screen flex items-center justify-center">
            <div class="text-center">
              <Show when={contextStore.initializationError()}>
                <div class="alert alert-error mb-4 max-w-md">
                  <span>{contextStore.initializationError()}</span>
                  <button
                    class="btn btn-sm btn-ghost"
                    onClick={() => {
                      contextStore.initializeStore();
                    }}
                  >
                    Retry
                  </button>
                </div>
              </Show>
              <Show when={!contextStore.initializationError()}>
                <div class="flex flex-col items-center gap-4">
                  <span class="loading loading-lg loading-spinner text-primary" />
                  <div class="text-lg font-semibold">Connecting to Kubernetes</div>
                  <div class="text-sm opacity-70">Loading contexts and namespaces...</div>
                </div>
              </Show>
            </div>
          </div>
        }
      >
        <Router>
          <Route path="/" component={() => (
            <LayoutWrapper>
              <RootRedirect />
            </LayoutWrapper>
          )} />

          {/* Import route */}
          <Route path="/import" component={() => (
            <LayoutWrapper>
              <ImportPage />
            </LayoutWrapper>
          )} />

          {/* Node routes */}
          <Route path="/:context/:namespace/nodes" component={() => (
            <LayoutWrapper>
              <NodeListPage />
            </LayoutWrapper>
          )} />
          <Route path="/:context/:namespace/nodes/:resourceName" component={() => (
            <LayoutWrapper>
              <NodeListPage />
            </LayoutWrapper>
          )} />
          <Route path="/:context/:namespace/nodes/:resourceName/:tab" component={() => (
            <LayoutWrapper>
              <NodeListPage />
            </LayoutWrapper>
          )} />

          {/* Node Events route */}
          <Route path="/:context/:namespace/node-events" component={() => (
            <LayoutWrapper>
              <NodeEventsPage />
            </LayoutWrapper>
          )} />

          {/* Node Pool Summary route */}
          <Route path="/:context/:namespace/node-pool-summary" component={() => (
            <LayoutWrapper>
              <NodePoolSummaryPage />
            </LayoutWrapper>
          )} />

          {/* Namespace routes */}
          <Route path="/:context/:namespace/namespaces" component={() => (
            <LayoutWrapper>
              <NamespaceListPage />
            </LayoutWrapper>
          )} />
          <Route path="/:context/:namespace/namespaces/:resourceName" component={() => (
            <LayoutWrapper>
              <NamespaceListPage />
            </LayoutWrapper>
          )} />
          <Route path="/:context/:namespace/namespaces/:resourceName/:tab" component={() => (
            <LayoutWrapper>
              <NamespaceListPage />
            </LayoutWrapper>
          )} />

          {/* Installed Applications Overview */}
          <Route path="/:context/:namespace/installed-apps" component={() => (
            <LayoutWrapper>
              <ApplicationsPage />
            </LayoutWrapper>
          )} />

          {/* Pods routes */}
          <Route path="/:context/:namespace/pods" component={() => (
            <LayoutWrapper>
              <ResourceListPage />
            </LayoutWrapper>
          )} />
          <Route path="/:context/:namespace/pods/:resourceName" component={() => (
            <LayoutWrapper>
              <ResourceListPage />
            </LayoutWrapper>
          )} />
          <Route path="/:context/:namespace/pods/:resourceName/:tab" component={() => (
            <LayoutWrapper>
              <ResourceListPage />
            </LayoutWrapper>
          )} />

          {/* Other workload resources */}
          <Route path="/:context/:namespace/applications" component={() => (
            <LayoutWrapper>
              <ArgoApplicationListPage />
            </LayoutWrapper>
          )} />
          <Route path="/:context/:namespace/applications/:resourceName" component={() => (
            <LayoutWrapper>
              <ArgoApplicationListPage />
            </LayoutWrapper>
          )} />
          <Route path="/:context/:namespace/applications/:resourceName/:tab" component={() => (
            <LayoutWrapper>
              <ArgoApplicationListPage />
            </LayoutWrapper>
          )} />
          <Route path="/:context/:namespace/deployments" component={() => (
            <LayoutWrapper>
              <DeploymentListPage />
            </LayoutWrapper>
          )} />
          <Route path="/:context/:namespace/deployments/:resourceName" component={() => (
            <LayoutWrapper>
              <DeploymentListPage />
            </LayoutWrapper>
          )} />
          <Route path="/:context/:namespace/deployments/:resourceName/:tab" component={() => (
            <LayoutWrapper>
              <DeploymentListPage />
            </LayoutWrapper>
          )} />

          {/* Argo Rollouts */}
          <Route path="/:context/:namespace/rollouts" component={() => (
            <LayoutWrapper>
              <RolloutListPage />
            </LayoutWrapper>
          )} />
          <Route path="/:context/:namespace/rollouts/:resourceName" component={() => (
            <LayoutWrapper>
              <RolloutListPage />
            </LayoutWrapper>
          )} />
          <Route path="/:context/:namespace/rollouts/:resourceName/:tab" component={() => (
            <LayoutWrapper>
              <RolloutListPage />
            </LayoutWrapper>
          )} />
          <Route path="/:context/:namespace/statefulsets" component={() => (
            <LayoutWrapper>
              <StatefulSetListPage />
            </LayoutWrapper>
          )} />
          <Route path="/:context/:namespace/statefulsets/:resourceName" component={() => (
            <LayoutWrapper>
              <StatefulSetListPage />
            </LayoutWrapper>
          )} />
          <Route path="/:context/:namespace/statefulsets/:resourceName/:tab" component={() => (
            <LayoutWrapper>
              <StatefulSetListPage />
            </LayoutWrapper>
          )} />
          <Route path="/:context/:namespace/daemonsets" component={() => (
            <LayoutWrapper>
              <DaemonSetListPage />
            </LayoutWrapper>
          )} />
          <Route path="/:context/:namespace/daemonsets/:resourceName" component={() => (
            <LayoutWrapper>
              <DaemonSetListPage />
            </LayoutWrapper>
          )} />
          <Route path="/:context/:namespace/daemonsets/:resourceName/:tab" component={() => (
            <LayoutWrapper>
              <DaemonSetListPage />
            </LayoutWrapper>
          )} />
          <Route path="/:context/:namespace/jobs" component={() => (
            <LayoutWrapper>
              <JobListPage />
            </LayoutWrapper>
          )} />
          <Route path="/:context/:namespace/jobs/:resourceName" component={() => (
            <LayoutWrapper>
              <JobListPage />
            </LayoutWrapper>
          )} />
          <Route path="/:context/:namespace/jobs/:resourceName/:tab" component={() => (
            <LayoutWrapper>
              <JobListPage />
            </LayoutWrapper>
          )} />
          <Route path="/:context/:namespace/cronjobs" component={() => (
            <LayoutWrapper>
              <CronJobListPage />
            </LayoutWrapper>
          )} />
          <Route path="/:context/:namespace/cronjobs/:resourceName" component={() => (
            <LayoutWrapper>
              <CronJobListPage />
            </LayoutWrapper>
          )} />
          <Route path="/:context/:namespace/cronjobs/:resourceName/:tab" component={() => (
            <LayoutWrapper>
              <CronJobListPage />
            </LayoutWrapper>
          )} />

          {/* Network resources */}
          <Route path="/:context/:namespace/services" component={() => (
            <LayoutWrapper>
              <ServiceListPage />
            </LayoutWrapper>
          )} />
          <Route path="/:context/:namespace/services/:resourceName" component={() => (
            <LayoutWrapper>
              <ServiceListPage />
            </LayoutWrapper>
          )} />
          <Route path="/:context/:namespace/services/:resourceName/:tab" component={() => (
            <LayoutWrapper>
              <ServiceListPage />
            </LayoutWrapper>
          )} />
          <Route path="/:context/:namespace/ingresses" component={() => (
            <LayoutWrapper>
              <IngressListPage />
            </LayoutWrapper>
          )} />
          <Route path="/:context/:namespace/ingresses/:resourceName" component={() => (
            <LayoutWrapper>
              <IngressListPage />
            </LayoutWrapper>
          )} />
          <Route path="/:context/:namespace/ingresses/:resourceName/:tab" component={() => (
            <LayoutWrapper>
              <IngressListPage />
            </LayoutWrapper>
          )} />
          <Route path="/:context/:namespace/virtualservices" component={() => (
            <LayoutWrapper>
              <VirtualServiceListPage />
            </LayoutWrapper>
          )} />
          <Route path="/:context/:namespace/virtualservices/:resourceName" component={() => (
            <LayoutWrapper>
              <VirtualServiceListPage />
            </LayoutWrapper>
          )} />
          <Route path="/:context/:namespace/virtualservices/:resourceName/:tab" component={() => (
            <LayoutWrapper>
              <VirtualServiceListPage />
            </LayoutWrapper>
          )} />
          <Route path="/:context/:namespace/gateways" component={() => (
            <LayoutWrapper>
              <GatewayListPage />
            </LayoutWrapper>
          )} />
          <Route path="/:context/:namespace/gateways/:resourceName" component={() => (
            <LayoutWrapper>
              <GatewayListPage />
            </LayoutWrapper>
          )} />
          <Route path="/:context/:namespace/gateways/:resourceName/:tab" component={() => (
            <LayoutWrapper>
              <GatewayListPage />
            </LayoutWrapper>
          )} />
          <Route path="/:context/:namespace/destinationrules" component={() => (
            <LayoutWrapper>
              <DestinationRuleListPage />
            </LayoutWrapper>
          )} />
          <Route path="/:context/:namespace/destinationrules/:resourceName" component={() => (
            <LayoutWrapper>
              <DestinationRuleListPage />
            </LayoutWrapper>
          )} />
          <Route path="/:context/:namespace/destinationrules/:resourceName/:tab" component={() => (
            <LayoutWrapper>
              <DestinationRuleListPage />
            </LayoutWrapper>
          )} />

          {/* Config & Storage resources */}
          <Route path="/:context/:namespace/configmaps" component={() => (
            <LayoutWrapper>
              <ConfigMapListPage />
            </LayoutWrapper>
          )} />
          <Route path="/:context/:namespace/configmaps/:resourceName" component={() => (
            <LayoutWrapper>
              <ConfigMapListPage />
            </LayoutWrapper>
          )} />
          <Route path="/:context/:namespace/configmaps/:resourceName/:tab" component={() => (
            <LayoutWrapper>
              <ConfigMapListPage />
            </LayoutWrapper>
          )} />
          <Route path="/:context/:namespace/secrets" component={() => (
            <LayoutWrapper>
              <SecretListPage />
            </LayoutWrapper>
          )} />
          <Route path="/:context/:namespace/secrets/:resourceName" component={() => (
            <LayoutWrapper>
              <SecretListPage />
            </LayoutWrapper>
          )} />
          <Route path="/:context/:namespace/secrets/:resourceName/:tab" component={() => (
            <LayoutWrapper>
              <SecretListPage />
            </LayoutWrapper>
          )} />
          <Route path="/:context/:namespace/hpas" component={() => (
            <LayoutWrapper>
              <HpaListPage />
            </LayoutWrapper>
          )} />
          <Route path="/:context/:namespace/hpas/:resourceName" component={() => (
            <LayoutWrapper>
              <HpaListPage />
            </LayoutWrapper>
          )} />
          <Route path="/:context/:namespace/hpas/:resourceName/:tab" component={() => (
            <LayoutWrapper>
              <HpaListPage />
            </LayoutWrapper>
          )} />
          <Route path="/:context/:namespace/pdbs" component={() => (
            <LayoutWrapper>
              <PdbListPage />
            </LayoutWrapper>
          )} />
          <Route path="/:context/:namespace/pdbs/:resourceName" component={() => (
            <LayoutWrapper>
              <PdbListPage />
            </LayoutWrapper>
          )} />
          <Route path="/:context/:namespace/pdbs/:resourceName/:tab" component={() => (
            <LayoutWrapper>
              <PdbListPage />
            </LayoutWrapper>
          )} />
          <Route path="/:context/:namespace/externalsecrets" component={() => (
            <LayoutWrapper>
              <ExternalSecretListPage />
            </LayoutWrapper>
          )} />
          <Route path="/:context/:namespace/externalsecrets/:resourceName" component={() => (
            <LayoutWrapper>
              <ExternalSecretListPage />
            </LayoutWrapper>
          )} />
          <Route path="/:context/:namespace/externalsecrets/:resourceName/:tab" component={() => (
            <LayoutWrapper>
              <ExternalSecretListPage />
            </LayoutWrapper>
          )} />
          <Route path="/:context/:namespace/secretstores" component={() => (
            <LayoutWrapper>
              <SecretStoreListPage />
            </LayoutWrapper>
          )} />
          <Route path="/:context/:namespace/secretstores/:resourceName" component={() => (
            <LayoutWrapper>
              <SecretStoreListPage />
            </LayoutWrapper>
          )} />
          <Route path="/:context/:namespace/secretstores/:resourceName/:tab" component={() => (
            <LayoutWrapper>
              <SecretStoreListPage />
            </LayoutWrapper>
          )} />
          <Route path="/:context/:namespace/crds" component={() => (
            <LayoutWrapper>
              <CustomResourceDefinitionListPage />
            </LayoutWrapper>
          )} />
          <Route path="/:context/:namespace/crds/:resourceName" component={() => (
            <LayoutWrapper>
              <CustomResourceDefinitionListPage />
            </LayoutWrapper>
          )} />
          <Route path="/:context/:namespace/crds/:resourceName/:tab" component={() => (
            <LayoutWrapper>
              <CustomResourceDefinitionListPage />
            </LayoutWrapper>
          )} />
          <Route path="/:context/:namespace/persistentvolumeclaims" component={() => (
            <LayoutWrapper>
              <PersistentVolumeClaimListPage />
            </LayoutWrapper>
          )} />
          <Route path="/:context/:namespace/persistentvolumeclaims/:resourceName" component={() => (
            <LayoutWrapper>
              <PersistentVolumeClaimListPage />
            </LayoutWrapper>
          )} />
          <Route path="/:context/:namespace/persistentvolumeclaims/:resourceName/:tab" component={() => (
            <LayoutWrapper>
              <PersistentVolumeClaimListPage />
            </LayoutWrapper>
          )} />
          <Route path="/:context/:namespace/storageclasses" component={() => (
            <LayoutWrapper>
              <StorageClassListPage />
            </LayoutWrapper>
          )} />
          <Route path="/:context/:namespace/storageclasses/:resourceName" component={() => (
            <LayoutWrapper>
              <StorageClassListPage />
            </LayoutWrapper>
          )} />
          <Route path="/:context/:namespace/storageclasses/:resourceName/:tab" component={() => (
            <LayoutWrapper>
              <StorageClassListPage />
            </LayoutWrapper>
          )} />

          {/* Cluster resources */}
          <Route path="/:context/:namespace/nodeclasses" component={() => (
            <LayoutWrapper>
              <NodeClassListPage />
            </LayoutWrapper>
          )} />
          <Route path="/:context/:namespace/nodeclasses/:resourceName" component={() => (
            <LayoutWrapper>
              <NodeClassListPage />
            </LayoutWrapper>
          )} />
          <Route path="/:context/:namespace/nodeclasses/:resourceName/:tab" component={() => (
            <LayoutWrapper>
              <NodeClassListPage />
            </LayoutWrapper>
          )} />
          <Route path="/:context/:namespace/nodepools" component={() => (
            <LayoutWrapper>
              <NodePoolListPage />
            </LayoutWrapper>
          )} />
          <Route path="/:context/:namespace/nodepools/:resourceName" component={() => (
            <LayoutWrapper>
              <NodePoolListPage />
            </LayoutWrapper>
          )} />
          <Route path="/:context/:namespace/nodepools/:resourceName/:tab" component={() => (
            <LayoutWrapper>
              <NodePoolListPage />
            </LayoutWrapper>
          )} />

          {/* Access Control resources */}
          <Route path="/:context/:namespace/serviceaccounts" component={() => (
            <LayoutWrapper>
              <ServiceAccountListPage />
            </LayoutWrapper>
          )} />
          <Route path="/:context/:namespace/serviceaccounts/:resourceName" component={() => (
            <LayoutWrapper>
              <ServiceAccountListPage />
            </LayoutWrapper>
          )} />
          <Route path="/:context/:namespace/serviceaccounts/:resourceName/:tab" component={() => (
            <LayoutWrapper>
              <ServiceAccountListPage />
            </LayoutWrapper>
          )} />
          <Route path="/:context/:namespace/roles" component={() => (
            <LayoutWrapper>
              <RoleListPage />
            </LayoutWrapper>
          )} />
          <Route path="/:context/:namespace/roles/:resourceName" component={() => (
            <LayoutWrapper>
              <RoleListPage />
            </LayoutWrapper>
          )} />
          <Route path="/:context/:namespace/roles/:resourceName/:tab" component={() => (
            <LayoutWrapper>
              <RoleListPage />
            </LayoutWrapper>
          )} />
          <Route path="/:context/:namespace/clusterroles" component={() => (
            <LayoutWrapper>
              <ClusterRoleListPage />
            </LayoutWrapper>
          )} />
          <Route path="/:context/:namespace/clusterroles/:resourceName" component={() => (
            <LayoutWrapper>
              <ClusterRoleListPage />
            </LayoutWrapper>
          )} />
          <Route path="/:context/:namespace/clusterroles/:resourceName/:tab" component={() => (
            <LayoutWrapper>
              <ClusterRoleListPage />
            </LayoutWrapper>
          )} />

          {/* Autoscaling resources (KEDA) */}
          <Route path="/:context/:namespace/scaledobjects" component={() => (
            <LayoutWrapper>
              <ScaledObjectListPage />
            </LayoutWrapper>
          )} />
          <Route path="/:context/:namespace/scaledobjects/:resourceName" component={() => (
            <LayoutWrapper>
              <ScaledObjectListPage />
            </LayoutWrapper>
          )} />
          <Route path="/:context/:namespace/scaledobjects/:resourceName/:tab" component={() => (
            <LayoutWrapper>
              <ScaledObjectListPage />
            </LayoutWrapper>
          )} />

          {/* Fallback */}
          <Route path="*" component={() => (
            <LayoutWrapper>
              <NotFound />
            </LayoutWrapper>
          )} />
        </Router>
      </Show>
    </div>
  );
};

export default App;
