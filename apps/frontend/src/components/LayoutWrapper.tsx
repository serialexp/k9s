import { useNavigate, useParams, useLocation } from '@solidjs/router';
import { createEffect, on } from 'solid-js';
import Layout from './Layout';
import { contextStore } from '../stores/contextStore';

interface LayoutWrapperProps {
  children: any;
}

const LayoutWrapper = (props: LayoutWrapperProps) => {
  const navigate = useNavigate();
  const params = useParams<{ context?: string; namespace?: string }>();
  const location = useLocation();

  // Decode URL params since they come encoded from the URL
  const decodedContext = () => params.context ? decodeURIComponent(params.context) : undefined;
  const decodedNamespace = () => params.namespace ? decodeURIComponent(params.namespace) : undefined;
  const decodedContextOrStore = () => decodedContext() ?? contextStore.selectedContext();
  const decodedNamespaceOrStore = () => decodedNamespace() ?? contextStore.selectedNamespace();

  // Extract resource type from current path (reactive!)
  const currentResourceType = () => {
    const path = location.pathname;
    // Check each resource type in order (most specific first)
    if (path.includes('/installed-apps')) return 'installed-apps';
    if (path.includes('/namespaces')) return 'namespaces';
    if (path.includes('/nodes')) return 'nodes';
    if (path.includes('/nodepools')) return 'nodepools';
    if (path.includes('/scaledobjects')) return 'scaledobjects';
    if (path.includes('/persistentvolumeclaims')) return 'persistentvolumeclaims';
    if (path.includes('/storageclasses')) return 'storageclasses';
    if (path.includes('/serviceaccounts')) return 'serviceaccounts';
    if (path.includes('/externalsecrets')) return 'externalsecrets';
    if (path.includes('/secretstores')) return 'secretstores';
    if (path.includes('/crds')) return 'crds';
    if (path.includes('/rollouts')) return 'rollouts';
    if (path.includes('/applications')) return 'applications';
    if (path.includes('/statefulsets')) return 'statefulsets';
    if (path.includes('/daemonsets')) return 'daemonsets';
    if (path.includes('/deployments')) return 'deployments';
    if (path.includes('/configmaps')) return 'configmaps';
    if (path.includes('/cronjobs')) return 'cronjobs';
    if (path.includes('/ingresses')) return 'ingresses';
    if (path.includes('/services')) return 'services';
    if (path.includes('/secrets')) return 'secrets';
    if (path.includes('/hpas')) return 'hpas';
    if (path.includes('/jobs')) return 'jobs';
    if (path.includes('/pods')) return 'pods';
    return 'pods';
  };

  // Sync store with URL when URL changes (e.g., browser back/forward, direct navigation)
  // Using on() to explicitly track only URL params, preventing interference when
  // handleContextChange updates the store before navigating
  createEffect(on(
    () => [decodedContext(), decodedNamespace()] as const,
    ([contextFromUrl, namespaceFromUrl]) => {
      if (contextFromUrl && contextStore.selectedContext() !== contextFromUrl) {
        contextStore.setSelectedContext(contextFromUrl);
      }

      if (namespaceFromUrl && contextStore.selectedNamespace() !== namespaceFromUrl) {
        contextStore.setSelectedNamespace(namespaceFromUrl);
      }

      if (contextFromUrl && contextStore.activeContext() !== contextFromUrl) {
        void contextStore.changeContext(contextFromUrl, namespaceFromUrl);
      }
    }
  ));

  const handleContextChange = async (newContext: string) => {
    // Switch context on backend first
    await contextStore.changeContext(newContext);

    // After context switch, namespaces will be loaded for the new context
    // Use the first available namespace from the new context
    const namespaces = contextStore.namespaces();
    const newNamespace = namespaces[0] || 'default';
    const resourceType = currentResourceType();

    navigate(`/${encodeURIComponent(newContext)}/${encodeURIComponent(newNamespace)}/${resourceType}`);
  };

  const handleNamespaceChange = (newNamespace: string) => {
    const context = decodedContextOrStore();
    const resourceType = currentResourceType();
    navigate(`/${encodeURIComponent(context)}/${encodeURIComponent(newNamespace)}/${resourceType}`);
  };

  const handleResourceTypeChange = (newResourceType: string) => {
    const context = decodedContextOrStore();
    const namespace = decodedNamespaceOrStore() || contextStore.namespaces()[0] || 'default';
    navigate(`/${encodeURIComponent(context)}/${encodeURIComponent(namespace)}/${newResourceType}`);
  };

  return (
    <Layout
      currentContext={decodedContext()}
      currentNamespace={decodedNamespace()}
      currentResourceType={currentResourceType()}
      onContextChange={handleContextChange}
      onNamespaceChange={handleNamespaceChange}
      onResourceTypeChange={handleResourceTypeChange}
    >
      {props.children}
    </Layout>
  );
};

export default LayoutWrapper;
