import { FastifyPluginAsync } from 'fastify';
import { KubeService, CRDNotInstalledError } from '../services/kube.js';
import { AwsService } from '../services/aws.js';
import yaml from 'yaml';

export interface ApiPluginOptions {
  kube: KubeService;
  aws: AwsService;
}

export const apiPlugin: FastifyPluginAsync<ApiPluginOptions> = async (fastify, opts) => {
  const { kube, aws } = opts;

  fastify.get('/health', async () => ({ status: 'ok' }));

  fastify.get('/contexts', async () => ({ contexts: kube.getContexts() }));

  fastify.get('/contexts/current', async () => ({ name: kube.getCurrentContext() }));

  fastify.post<{ Body: { name: string } }>('/contexts/select', async (request, reply) => {
    const { name } = request.body;
    try {
      kube.setCurrentContext(name);
      reply.code(204);
      return null;
    } catch (error) {
      request.log.error(error);
      reply.code(400);
      return { error: (error as Error).message };
    }
  });

  fastify.get('/namespaces', async (request, reply) => {
    try {
      const namespaces = await kube.listNamespaces();
      return { items: namespaces };
    } catch (error) {
      const err = error as { statusCode?: number; body?: { message?: string }; message?: string };
      if (err.statusCode === 401) {
        reply.code(401);
        return { error: err.body?.message || err.message || 'Authentication failed. Please check your Kubernetes credentials.' };
      }
      throw error;
    }
  });

  fastify.get('/nodes', async (request, reply) => {
    try {
      const { nodes, pools } = await kube.listNodes();
      return { items: nodes, pools };
    } catch (error) {
      const err = error as { statusCode?: number; body?: { message?: string }; message?: string };
      if (err.statusCode === 401) {
        reply.code(401);
        return { error: err.body?.message || err.message || 'Authentication failed. Please check your Kubernetes credentials.' };
      }
      throw error;
    }
  });

  fastify.get<{ Params: { node: string } }>('/nodes/:node', async (request, reply) => {
    const { node } = request.params;
    if (!node) {
      reply.code(400);
      return { error: 'node name is required' };
    }
    const detail = await kube.getNode(node);
    return detail;
  });

  fastify.get<{ Params: { node: string } }>('/nodes/:node/manifest', async (request, reply) => {
    const { node } = request.params;
    const manifest = await kube.getNodeManifest(node);
    reply.header('content-type', 'application/yaml');
    return yaml.stringify(JSON.parse(manifest));
  });

  fastify.get<{ Params: { node: string } }>('/nodes/:node/events', async (request, reply) => {
    const { node } = request.params;
    if (!node) {
      reply.code(400);
      return { error: 'node name is required' };
    }
    const events = await kube.getNodeEvents(node);
    return { events };
  });

  fastify.post<{ Params: { node: string } }>('/nodes/:node/cordon', async (request, reply) => {
    const { node } = request.params;
    if (!node) {
      reply.code(400);
      return { error: 'node name is required' };
    }
    await kube.cordonNode(node);
    reply.code(204);
    return null;
  });

  fastify.post<{ Params: { node: string } }>('/nodes/:node/uncordon', async (request, reply) => {
    const { node } = request.params;
    if (!node) {
      reply.code(400);
      return { error: 'node name is required' };
    }
    await kube.uncordonNode(node);
    reply.code(204);
    return null;
  });

  fastify.post<{ Params: { node: string } }>('/nodes/:node/drain', async (request, reply) => {
    const { node } = request.params;
    if (!node) {
      reply.code(400);
      return { error: 'node name is required' };
    }
    const result = await kube.drainNode(node);
    return result;
  });

  fastify.get('/namespace-summaries', async (request, reply) => {
    try {
      const namespaces = await kube.listNamespaceSummaries();
      return { items: namespaces };
    } catch (error) {
      const err = error as { statusCode?: number; body?: { message?: string }; message?: string };
      if (err.statusCode === 401) {
        reply.code(401);
        return { error: err.body?.message || err.message || 'Authentication failed. Please check your Kubernetes credentials.' };
      }
      throw error;
    }
  });

  fastify.get<{ Params: { namespace: string } }>('/namespaces/:namespace/pods', async (request, reply) => {
    const { namespace } = request.params;
    if (!namespace) {
      reply.code(400);
      return { error: 'namespace is required' };
    }
    try {
      const pods = await kube.listPods(namespace);
      return { items: pods };
    } catch (error) {
      const err = error as { statusCode?: number; body?: { message?: string }; message?: string };
      if (err.statusCode === 401) {
        reply.code(401);
        return { error: err.body?.message || err.message || 'Authentication failed. Please check your Kubernetes credentials.' };
      }
      throw error;
    }
  });

  fastify.get<{ Params: { namespace: string; pod: string } }>('/namespaces/:namespace/pods/:pod', async (request, reply) => {
    const { namespace, pod } = request.params;
    if (!namespace || !pod) {
      reply.code(400);
      return { error: 'namespace and pod are required' };
    }
    const detail = await kube.getPod(namespace, pod);
    return detail;
  });

  fastify.get<{ Params: { namespace: string; pod: string } }>('/namespaces/:namespace/pods/:pod/manifest', async (request, reply) => {
    const { namespace, pod } = request.params;
    const manifest = await kube.getPodManifest(namespace, pod);
    reply.header('content-type', 'application/yaml');
    return yaml.stringify(JSON.parse(manifest));
  });

  fastify.get<{ Params: { namespace: string; pod: string } }>('/namespaces/:namespace/pods/:pod/events', async (request, reply) => {
    const { namespace, pod } = request.params;
    if (!namespace || !pod) {
      reply.code(400);
      return { error: 'namespace and pod are required' };
    }
    const events = await kube.getPodEvents(namespace, pod);
    return { events };
  });

  fastify.get<{ Params: { namespace: string; pod: string } }>('/namespaces/:namespace/pods/:pod/status', async (request, reply) => {
    const { namespace, pod } = request.params;
    if (!namespace || !pod) {
      reply.code(400);
      return { error: 'namespace and pod are required' };
    }
    const status = await kube.getPodStatus(namespace, pod);
    return status;
  });

  fastify.delete<{ Params: { namespace: string; pod: string } }>('/namespaces/:namespace/pods/:pod', async (request, reply) => {
    const { namespace, pod } = request.params;
    if (!namespace || !pod) {
      reply.code(400);
      return { error: 'namespace and pod are required' };
    }
    await kube.deletePod(namespace, pod);
    reply.code(204);
    return null;
  });

  fastify.post<{ Params: { namespace: string; pod: string } }>('/namespaces/:namespace/pods/:pod/evict', async (request, reply) => {
    const { namespace, pod } = request.params;
    if (!namespace || !pod) {
      reply.code(400);
      return { error: 'namespace and pod are required' };
    }
    await kube.evictPod(namespace, pod);
    reply.code(204);
    return null;
  });

  // Deployment routes
  fastify.get<{ Params: { namespace: string } }>('/namespaces/:namespace/deployments', async (request, reply) => {
    const { namespace } = request.params;
    if (!namespace) {
      reply.code(400);
      return { error: 'namespace is required' };
    }
    try {
      const deployments = await kube.listDeployments(namespace);
      return { items: deployments };
    } catch (error) {
      const err = error as { statusCode?: number; body?: { message?: string }; message?: string };
      if (err.statusCode === 401) {
        reply.code(401);
        return { error: err.body?.message || err.message || 'Authentication failed. Please check your Kubernetes credentials.' };
      }
      throw error;
    }
  });

  fastify.get<{ Params: { namespace: string; deployment: string } }>('/namespaces/:namespace/deployments/:deployment', async (request, reply) => {
    const { namespace, deployment } = request.params;
    if (!namespace || !deployment) {
      reply.code(400);
      return { error: 'namespace and deployment are required' };
    }
    const detail = await kube.getDeployment(namespace, deployment);
    return detail;
  });

  fastify.get<{ Params: { namespace: string; deployment: string } }>('/namespaces/:namespace/deployments/:deployment/manifest', async (request, reply) => {
    const { namespace, deployment } = request.params;
    const manifest = await kube.getDeploymentManifest(namespace, deployment);
    reply.header('content-type', 'application/yaml');
    return yaml.stringify(JSON.parse(manifest));
  });

  fastify.get<{ Params: { namespace: string; deployment: string } }>('/namespaces/:namespace/deployments/:deployment/events', async (request, reply) => {
    const { namespace, deployment } = request.params;
    if (!namespace || !deployment) {
      reply.code(400);
      return { error: 'namespace and deployment are required' };
    }
    const events = await kube.getDeploymentEvents(namespace, deployment);
    return { events };
  });

  fastify.get<{ Params: { namespace: string; deployment: string } }>('/namespaces/:namespace/deployments/:deployment/status', async (request, reply) => {
    const { namespace, deployment } = request.params;
    if (!namespace || !deployment) {
      reply.code(400);
      return { error: 'namespace and deployment are required' };
    }
    const status = await kube.getDeploymentStatus(namespace, deployment);
    return status;
  });

  fastify.delete<{ Params: { namespace: string; deployment: string } }>('/namespaces/:namespace/deployments/:deployment', async (request, reply) => {
    const { namespace, deployment } = request.params;
    if (!namespace || !deployment) {
      reply.code(400);
      return { error: 'namespace and deployment are required' };
    }
    await kube.deleteDeployment(namespace, deployment);
    reply.code(204);
    return null;
  });

  fastify.post<{ Params: { namespace: string; deployment: string } }>('/namespaces/:namespace/deployments/:deployment/restart', async (request, reply) => {
    const { namespace, deployment } = request.params;
    if (!namespace || !deployment) {
      reply.code(400);
      return { error: 'namespace and deployment are required' };
    }
    await kube.restartDeployment(namespace, deployment);
    reply.code(204);
    return null;
  });

  fastify.post<{ Params: { namespace: string; deployment: string }; Body: { replicas: number } }>('/namespaces/:namespace/deployments/:deployment/scale', async (request, reply) => {
    const { namespace, deployment } = request.params;
    const { replicas } = request.body;
    if (!namespace || !deployment) {
      reply.code(400);
      return { error: 'namespace and deployment are required' };
    }
    if (typeof replicas !== 'number' || replicas < 0) {
      reply.code(400);
      return { error: 'replicas must be a non-negative number' };
    }
    await kube.scaleDeployment(namespace, deployment, replicas);
    reply.code(204);
    return null;
  });

  fastify.post<{ Params: { namespace: string; deployment: string }; Body: { toRevision?: number } }>('/namespaces/:namespace/deployments/:deployment/rollback', async (request, reply) => {
    const { namespace, deployment } = request.params;
    const { toRevision } = request.body || {};
    if (!namespace || !deployment) {
      reply.code(400);
      return { error: 'namespace and deployment are required' };
    }
    await kube.rollbackDeployment(namespace, deployment, toRevision);
    reply.code(204);
    return null;
  });

  fastify.get<{ Params: { namespace: string; deployment: string } }>('/namespaces/:namespace/deployments/:deployment/history', async (request, reply) => {
    const { namespace, deployment } = request.params;
    if (!namespace || !deployment) {
      reply.code(400);
      return { error: 'namespace and deployment are required' };
    }
    const history = await kube.getDeploymentHistory(namespace, deployment);
    return { revisions: history };
  });

  // Argo Rollout routes
  fastify.get<{ Params: { namespace: string } }>('/namespaces/:namespace/rollouts', async (request, reply) => {
    const { namespace } = request.params;
    if (!namespace) {
      reply.code(400);
      return { error: 'namespace is required' };
    }
    try {
      const rollouts = await kube.listRollouts(namespace);
      return { items: rollouts };
    } catch (error) {
      if (error instanceof CRDNotInstalledError) {
        reply.code(503);
        return { error: error.message };
      }
      const err = error as { statusCode?: number; body?: { message?: string }; message?: string };
      if (err.statusCode === 401) {
        reply.code(401);
        return { error: err.body?.message || err.message || 'Authentication failed. Please check your Kubernetes credentials.' };
      }
      throw error;
    }
  });

  fastify.get<{ Params: { namespace: string; rollout: string } }>('/namespaces/:namespace/rollouts/:rollout', async (request, reply) => {
    const { namespace, rollout } = request.params;
    if (!namespace || !rollout) {
      reply.code(400);
      return { error: 'namespace and rollout are required' };
    }
    const detail = await kube.getRollout(namespace, rollout);
    return detail;
  });

  fastify.get<{ Params: { namespace: string; rollout: string } }>('/namespaces/:namespace/rollouts/:rollout/manifest', async (request, reply) => {
    const { namespace, rollout } = request.params;
    const manifest = await kube.getRolloutManifest(namespace, rollout);
    reply.header('content-type', 'application/yaml');
    return yaml.stringify(JSON.parse(manifest));
  });

  fastify.get<{ Params: { namespace: string; rollout: string } }>('/namespaces/:namespace/rollouts/:rollout/events', async (request, reply) => {
    const { namespace, rollout } = request.params;
    if (!namespace || !rollout) {
      reply.code(400);
      return { error: 'namespace and rollout are required' };
    }
    const events = await kube.getRolloutEvents(namespace, rollout);
    return { events };
  });

  fastify.get<{ Params: { namespace: string; rollout: string } }>('/namespaces/:namespace/rollouts/:rollout/status', async (request, reply) => {
    const { namespace, rollout } = request.params;
    if (!namespace || !rollout) {
      reply.code(400);
      return { error: 'namespace and rollout are required' };
    }
    const status = await kube.getRolloutStatus(namespace, rollout);
    return status;
  });

  fastify.delete<{ Params: { namespace: string; rollout: string } }>('/namespaces/:namespace/rollouts/:rollout', async (request, reply) => {
    const { namespace, rollout } = request.params;
    if (!namespace || !rollout) {
      reply.code(400);
      return { error: 'namespace and rollout are required' };
    }
    await kube.deleteRollout(namespace, rollout);
    reply.code(204);
    return null;
  });

  // DaemonSet routes
  fastify.get<{ Params: { namespace: string } }>('/namespaces/:namespace/daemonsets', async (request, reply) => {
    const { namespace } = request.params;
    if (!namespace) {
      reply.code(400);
      return { error: 'namespace is required' };
    }
    try {
      const daemonSets = await kube.listDaemonSets(namespace);
      return { items: daemonSets };
    } catch (error) {
      const err = error as { statusCode?: number; body?: { message?: string }; message?: string };
      if (err.statusCode === 401) {
        reply.code(401);
        return { error: err.body?.message || err.message || 'Authentication failed. Please check your Kubernetes credentials.' };
      }
      throw error;
    }
  });

  fastify.get<{ Params: { namespace: string; daemonset: string } }>('/namespaces/:namespace/daemonsets/:daemonset', async (request, reply) => {
    const { namespace, daemonset } = request.params;
    if (!namespace || !daemonset) {
      reply.code(400);
      return { error: 'namespace and daemonset are required' };
    }
    const detail = await kube.getDaemonSet(namespace, daemonset);
    return detail;
  });

  fastify.get<{ Params: { namespace: string; daemonset: string } }>('/namespaces/:namespace/daemonsets/:daemonset/manifest', async (request, reply) => {
    const { namespace, daemonset } = request.params;
    const manifest = await kube.getDaemonSetManifest(namespace, daemonset);
    reply.header('content-type', 'application/yaml');
    return yaml.stringify(JSON.parse(manifest));
  });

  fastify.get<{ Params: { namespace: string; daemonset: string } }>('/namespaces/:namespace/daemonsets/:daemonset/events', async (request, reply) => {
    const { namespace, daemonset } = request.params;
    if (!namespace || !daemonset) {
      reply.code(400);
      return { error: 'namespace and daemonset are required' };
    }
    const events = await kube.getDaemonSetEvents(namespace, daemonset);
    return { events };
  });

  fastify.get<{ Params: { namespace: string; daemonset: string } }>('/namespaces/:namespace/daemonsets/:daemonset/status', async (request, reply) => {
    const { namespace, daemonset } = request.params;
    if (!namespace || !daemonset) {
      reply.code(400);
      return { error: 'namespace and daemonset are required' };
    }
    const status = await kube.getDaemonSetStatus(namespace, daemonset);
    return status;
  });

  fastify.delete<{ Params: { namespace: string; daemonset: string } }>('/namespaces/:namespace/daemonsets/:daemonset', async (request, reply) => {
    const { namespace, daemonset } = request.params;
    if (!namespace || !daemonset) {
      reply.code(400);
      return { error: 'namespace and daemonset are required' };
    }
    await kube.deleteDaemonSet(namespace, daemonset);
    reply.code(204);
    return null;
  });

  fastify.post<{ Params: { namespace: string; daemonset: string } }>('/namespaces/:namespace/daemonsets/:daemonset/restart', async (request, reply) => {
    const { namespace, daemonset } = request.params;
    if (!namespace || !daemonset) {
      reply.code(400);
      return { error: 'namespace and daemonset are required' };
    }
    await kube.restartDaemonSet(namespace, daemonset);
    reply.code(204);
    return null;
  });

  // StatefulSet routes
  fastify.get<{ Params: { namespace: string } }>('/namespaces/:namespace/statefulsets', async (request, reply) => {
    const { namespace } = request.params;
    if (!namespace) {
      reply.code(400);
      return { error: 'namespace is required' };
    }
    try {
      const statefulSets = await kube.listStatefulSets(namespace);
      return { items: statefulSets };
    } catch (error) {
      const err = error as { statusCode?: number; body?: { message?: string }; message?: string };
      if (err.statusCode === 401) {
        reply.code(401);
        return { error: err.body?.message || err.message || 'Authentication failed. Please check your Kubernetes credentials.' };
      }
      throw error;
    }
  });

  fastify.get<{ Params: { namespace: string; statefulset: string } }>('/namespaces/:namespace/statefulsets/:statefulset', async (request, reply) => {
    const { namespace, statefulset } = request.params;
    if (!namespace || !statefulset) {
      reply.code(400);
      return { error: 'namespace and statefulset are required' };
    }
    const detail = await kube.getStatefulSet(namespace, statefulset);
    return detail;
  });

  fastify.get<{ Params: { namespace: string; statefulset: string } }>('/namespaces/:namespace/statefulsets/:statefulset/manifest', async (request, reply) => {
    const { namespace, statefulset } = request.params;
    const manifest = await kube.getStatefulSetManifest(namespace, statefulset);
    reply.header('content-type', 'application/yaml');
    return yaml.stringify(JSON.parse(manifest));
  });

  fastify.get<{ Params: { namespace: string; statefulset: string } }>('/namespaces/:namespace/statefulsets/:statefulset/events', async (request, reply) => {
    const { namespace, statefulset } = request.params;
    if (!namespace || !statefulset) {
      reply.code(400);
      return { error: 'namespace and statefulset are required' };
    }
    const events = await kube.getStatefulSetEvents(namespace, statefulset);
    return { events };
  });

  fastify.get<{ Params: { namespace: string; statefulset: string } }>('/namespaces/:namespace/statefulsets/:statefulset/status', async (request, reply) => {
    const { namespace, statefulset } = request.params;
    if (!namespace || !statefulset) {
      reply.code(400);
      return { error: 'namespace and statefulset are required' };
    }
    const status = await kube.getStatefulSetStatus(namespace, statefulset);
    return status;
  });

  fastify.delete<{ Params: { namespace: string; statefulset: string } }>('/namespaces/:namespace/statefulsets/:statefulset', async (request, reply) => {
    const { namespace, statefulset } = request.params;
    if (!namespace || !statefulset) {
      reply.code(400);
      return { error: 'namespace and statefulset are required' };
    }
    await kube.deleteStatefulSet(namespace, statefulset);
    reply.code(204);
    return null;
  });

  fastify.post<{ Params: { namespace: string; statefulset: string } }>('/namespaces/:namespace/statefulsets/:statefulset/restart', async (request, reply) => {
    const { namespace, statefulset } = request.params;
    if (!namespace || !statefulset) {
      reply.code(400);
      return { error: 'namespace and statefulset are required' };
    }
    await kube.restartStatefulSet(namespace, statefulset);
    reply.code(204);
    return null;
  });

  fastify.post<{ Params: { namespace: string; statefulset: string }; Body: { replicas: number } }>('/namespaces/:namespace/statefulsets/:statefulset/scale', async (request, reply) => {
    const { namespace, statefulset } = request.params;
    const { replicas } = request.body;
    if (!namespace || !statefulset) {
      reply.code(400);
      return { error: 'namespace and statefulset are required' };
    }
    if (typeof replicas !== 'number' || replicas < 0) {
      reply.code(400);
      return { error: 'replicas must be a non-negative number' };
    }
    await kube.scaleStatefulSet(namespace, statefulset, replicas);
    reply.code(204);
    return null;
  });

  // Job routes
  fastify.get<{ Params: { namespace: string } }>('/namespaces/:namespace/jobs', async (request, reply) => {
    const { namespace } = request.params;
    if (!namespace) {
      reply.code(400);
      return { error: 'namespace is required' };
    }
    try {
      const jobs = await kube.listJobs(namespace);
      return { items: jobs };
    } catch (error) {
      const err = error as { statusCode?: number; body?: { message?: string }; message?: string };
      if (err.statusCode === 401) {
        reply.code(401);
        return { error: err.body?.message || err.message || 'Authentication failed. Please check your Kubernetes credentials.' };
      }
      throw error;
    }
  });

  fastify.get<{ Params: { namespace: string; job: string } }>('/namespaces/:namespace/jobs/:job', async (request, reply) => {
    const { namespace, job } = request.params;
    if (!namespace || !job) {
      reply.code(400);
      return { error: 'namespace and job are required' };
    }
    const detail = await kube.getJob(namespace, job);
    return detail;
  });

  fastify.get<{ Params: { namespace: string; job: string } }>('/namespaces/:namespace/jobs/:job/manifest', async (request, reply) => {
    const { namespace, job } = request.params;
    const manifest = await kube.getJobManifest(namespace, job);
    reply.header('content-type', 'application/yaml');
    return yaml.stringify(JSON.parse(manifest));
  });

  fastify.get<{ Params: { namespace: string; job: string } }>('/namespaces/:namespace/jobs/:job/events', async (request, reply) => {
    const { namespace, job } = request.params;
    if (!namespace || !job) {
      reply.code(400);
      return { error: 'namespace and job are required' };
    }
    const events = await kube.getJobEvents(namespace, job);
    return { events };
  });

  fastify.get<{ Params: { namespace: string; job: string } }>('/namespaces/:namespace/jobs/:job/status', async (request, reply) => {
    const { namespace, job } = request.params;
    if (!namespace || !job) {
      reply.code(400);
      return { error: 'namespace and job are required' };
    }
    const status = await kube.getJobStatus(namespace, job);
    return status;
  });

  fastify.delete<{ Params: { namespace: string; job: string } }>('/namespaces/:namespace/jobs/:job', async (request, reply) => {
    const { namespace, job } = request.params;
    if (!namespace || !job) {
      reply.code(400);
      return { error: 'namespace and job are required' };
    }
    await kube.deleteJob(namespace, job);
    reply.code(204);
    return null;
  });

  // ServiceAccount routes
  fastify.get<{ Params: { namespace: string } }>('/namespaces/:namespace/serviceaccounts', async (request, reply) => {
    const { namespace } = request.params;
    if (!namespace) {
      reply.code(400);
      return { error: 'namespace is required' };
    }
    try {
      const serviceAccounts = await kube.listServiceAccounts(namespace);
      return { items: serviceAccounts };
    } catch (error) {
      const err = error as { statusCode?: number; body?: { message?: string }; message?: string };
      if (err.statusCode === 401) {
        reply.code(401);
        return { error: err.body?.message || err.message || 'Authentication failed. Please check your Kubernetes credentials.' };
      }
      throw error;
    }
  });

  fastify.get<{ Params: { namespace: string; serviceaccount: string } }>('/namespaces/:namespace/serviceaccounts/:serviceaccount', async (request, reply) => {
    const { namespace, serviceaccount } = request.params;
    if (!namespace || !serviceaccount) {
      reply.code(400);
      return { error: 'namespace and serviceaccount are required' };
    }
    const detail = await kube.getServiceAccount(namespace, serviceaccount);
    return detail;
  });

  fastify.get<{ Params: { namespace: string; serviceaccount: string } }>('/namespaces/:namespace/serviceaccounts/:serviceaccount/manifest', async (request, reply) => {
    const { namespace, serviceaccount } = request.params;
    const manifest = await kube.getServiceAccountManifest(namespace, serviceaccount);
    reply.header('content-type', 'application/yaml');
    return yaml.stringify(JSON.parse(manifest));
  });

  fastify.delete<{ Params: { namespace: string; serviceaccount: string } }>('/namespaces/:namespace/serviceaccounts/:serviceaccount', async (request, reply) => {
    const { namespace, serviceaccount } = request.params;
    if (!namespace || !serviceaccount) {
      reply.code(400);
      return { error: 'namespace and serviceaccount are required' };
    }
    await kube.deleteServiceAccount(namespace, serviceaccount);
    reply.code(204);
    return null;
  });

  // Argo CD Application routes
  fastify.get<{ Params: { namespace: string } }>('/namespaces/:namespace/argocd/applications', async (request, reply) => {
    const { namespace } = request.params;
    if (!namespace) {
      reply.code(400);
      return { error: 'namespace is required' };
    }
    try {
      const applications = await kube.listArgoApplications(namespace);
      return { items: applications };
    } catch (error) {
      if (error instanceof CRDNotInstalledError) {
        reply.code(503);
        return { error: error.message };
      }
      const err = error as { statusCode?: number; body?: { message?: string }; message?: string };
      if (err.statusCode === 401) {
        reply.code(401);
        return { error: err.body?.message || err.message || 'Authentication failed. Please check your Kubernetes credentials.' };
      }
      throw error;
    }
  });

  fastify.get<{ Params: { namespace: string; application: string } }>('/namespaces/:namespace/argocd/applications/:application', async (request, reply) => {
    const { namespace, application } = request.params;
    if (!namespace || !application) {
      reply.code(400);
      return { error: 'namespace and application are required' };
    }
    const detail = await kube.getArgoApplication(namespace, application);
    return detail;
  });

  fastify.get<{ Params: { namespace: string; application: string } }>('/namespaces/:namespace/argocd/applications/:application/manifest', async (request, reply) => {
    const { namespace, application } = request.params;
    const manifest = await kube.getArgoApplicationManifest(namespace, application);
    reply.header('content-type', 'application/yaml');
    return yaml.stringify(JSON.parse(manifest));
  });

  fastify.get<{ Params: { namespace: string; application: string } }>('/namespaces/:namespace/argocd/applications/:application/status', async (request, reply) => {
    const { namespace, application } = request.params;
    if (!namespace || !application) {
      reply.code(400);
      return { error: 'namespace and application are required' };
    }
    const status = await kube.getArgoApplicationStatus(namespace, application);
    return status;
  });

  fastify.delete<{ Params: { namespace: string; application: string } }>('/namespaces/:namespace/argocd/applications/:application', async (request, reply) => {
    const { namespace, application } = request.params;
    if (!namespace || !application) {
      reply.code(400);
      return { error: 'namespace and application are required' };
    }
    await kube.deleteArgoApplication(namespace, application);
    reply.code(204);
    return null;
  });

  // Service routes
  fastify.get<{ Params: { namespace: string } }>('/namespaces/:namespace/services', async (request, reply) => {
    const { namespace } = request.params;
    if (!namespace) {
      reply.code(400);
      return { error: 'namespace is required' };
    }
    try {
      const services = await kube.listServices(namespace);
      return { items: services };
    } catch (error) {
      const err = error as { statusCode?: number; body?: { message?: string }; message?: string };
      if (err.statusCode === 401) {
        reply.code(401);
        return { error: err.body?.message || err.message || 'Authentication failed. Please check your Kubernetes credentials.' };
      }
      throw error;
    }
  });

  fastify.get<{ Params: { namespace: string; service: string } }>('/namespaces/:namespace/services/:service', async (request, reply) => {
    const { namespace, service } = request.params;
    if (!namespace || !service) {
      reply.code(400);
      return { error: 'namespace and service are required' };
    }
    const detail = await kube.getService(namespace, service);
    return detail;
  });

  fastify.get<{ Params: { namespace: string; service: string } }>('/namespaces/:namespace/services/:service/manifest', async (request, reply) => {
    const { namespace, service } = request.params;
    const manifest = await kube.getServiceManifest(namespace, service);
    reply.header('content-type', 'application/yaml');
    return yaml.stringify(JSON.parse(manifest));
  });

  fastify.get<{ Params: { namespace: string; service: string } }>('/namespaces/:namespace/services/:service/pods', async (request, reply) => {
    const { namespace, service } = request.params;
    const pods = await kube.getPodsForService(namespace, service);
    return pods;
  });

  fastify.get<{ Params: { namespace: string; service: string } }>('/namespaces/:namespace/services/:service/endpoints', async (request, reply) => {
    const { namespace, service } = request.params;
    const endpoints = await kube.getServiceEndpoints(namespace, service);
    return endpoints;
  });

  fastify.delete<{ Params: { namespace: string; service: string } }>('/namespaces/:namespace/services/:service', async (request, reply) => {
    const { namespace, service } = request.params;
    if (!namespace || !service) {
      reply.code(400);
      return { error: 'namespace and service are required' };
    }
    await kube.deleteService(namespace, service);
    reply.code(204);
    return null;
  });

  // ConfigMap routes
  fastify.get<{ Params: { namespace: string } }>('/namespaces/:namespace/configmaps', async (request, reply) => {
    const { namespace } = request.params;
    if (!namespace) {
      reply.code(400);
      return { error: 'namespace is required' };
    }
    try {
      const configmaps = await kube.listConfigMaps(namespace);
      return { items: configmaps };
    } catch (error) {
      const err = error as { statusCode?: number; body?: { message?: string }; message?: string };
      if (err.statusCode === 401) {
        reply.code(401);
        return { error: err.body?.message || err.message || 'Authentication failed. Please check your Kubernetes credentials.' };
      }
      throw error;
    }
  });

  fastify.get<{ Params: { namespace: string; configmap: string } }>('/namespaces/:namespace/configmaps/:configmap', async (request, reply) => {
    const { namespace, configmap } = request.params;
    if (!namespace || !configmap) {
      reply.code(400);
      return { error: 'namespace and configmap are required' };
    }
    const detail = await kube.getConfigMap(namespace, configmap);
    return detail;
  });

  fastify.get<{ Params: { namespace: string; configmap: string } }>('/namespaces/:namespace/configmaps/:configmap/manifest', async (request, reply) => {
    const { namespace, configmap } = request.params;
    const manifest = await kube.getConfigMapManifest(namespace, configmap);
    reply.header('content-type', 'application/yaml');
    return yaml.stringify(JSON.parse(manifest));
  });

  fastify.delete<{ Params: { namespace: string; configmap: string } }>('/namespaces/:namespace/configmaps/:configmap', async (request, reply) => {
    const { namespace, configmap } = request.params;
    if (!namespace || !configmap) {
      reply.code(400);
      return { error: 'namespace and configmap are required' };
    }
    await kube.deleteConfigMap(namespace, configmap);
    reply.code(204);
    return null;
  });

  // Secret routes
  fastify.get<{ Params: { namespace: string } }>('/namespaces/:namespace/secrets', async (request, reply) => {
    const { namespace } = request.params;
    if (!namespace) {
      reply.code(400);
      return { error: 'namespace is required' };
    }
    try {
      const secrets = await kube.listSecrets(namespace);
      return { items: secrets };
    } catch (error) {
      const err = error as { statusCode?: number; body?: { message?: string }; message?: string };
      if (err.statusCode === 401) {
        reply.code(401);
        return { error: err.body?.message || err.message || 'Authentication failed. Please check your Kubernetes credentials.' };
      }
      throw error;
    }
  });

  fastify.get<{ Params: { namespace: string; secret: string } }>('/namespaces/:namespace/secrets/:secret', async (request, reply) => {
    const { namespace, secret } = request.params;
    if (!namespace || !secret) {
      reply.code(400);
      return { error: 'namespace and secret are required' };
    }
    const detail = await kube.getSecret(namespace, secret);
    return detail;
  });

  fastify.get<{ Params: { namespace: string; secret: string } }>('/namespaces/:namespace/secrets/:secret/manifest', async (request, reply) => {
    const { namespace, secret } = request.params;
    const manifest = await kube.getSecretManifest(namespace, secret);
    reply.header('content-type', 'application/yaml');
    return yaml.stringify(JSON.parse(manifest));
  });

  fastify.delete<{ Params: { namespace: string; secret: string } }>('/namespaces/:namespace/secrets/:secret', async (request, reply) => {
    const { namespace, secret } = request.params;
    if (!namespace || !secret) {
      reply.code(400);
      return { error: 'namespace and secret are required' };
    }
    await kube.deleteSecret(namespace, secret);
    reply.code(204);
    return null;
  });

  // HPA routes
  fastify.get<{ Params: { namespace: string } }>('/namespaces/:namespace/hpas', async (request, reply) => {
    const { namespace } = request.params;
    if (!namespace) {
      reply.code(400);
      return { error: 'namespace is required' };
    }
    try {
      const hpas = await kube.listHpas(namespace);
      return { items: hpas };
    } catch (error) {
      const err = error as { statusCode?: number; body?: { message?: string }; message?: string };
      if (err.statusCode === 401) {
        reply.code(401);
        return { error: err.body?.message || err.message || 'Authentication failed. Please check your Kubernetes credentials.' };
      }
      throw error;
    }
  });

  fastify.get<{ Params: { namespace: string; hpa: string } }>('/namespaces/:namespace/hpas/:hpa', async (request, reply) => {
    const { namespace, hpa } = request.params;
    if (!namespace || !hpa) {
      reply.code(400);
      return { error: 'namespace and hpa are required' };
    }
    return await kube.getHpa(namespace, hpa);
  });

  fastify.get<{ Params: { namespace: string; hpa: string } }>('/namespaces/:namespace/hpas/:hpa/manifest', async (request, reply) => {
    const { namespace, hpa } = request.params;
    const manifestJson = await kube.getHpaManifest(namespace, hpa);
    const manifest = yaml.stringify(JSON.parse(manifestJson));
    return { manifest };
  });

  fastify.delete<{ Params: { namespace: string; hpa: string } }>('/namespaces/:namespace/hpas/:hpa', async (request, reply) => {
    const { namespace, hpa } = request.params;
    if (!namespace || !hpa) {
      reply.code(400);
      return { error: 'namespace and hpa are required' };
    }
    await kube.deleteHpa(namespace, hpa);
    reply.code(204);
    return null;
  });

  // ExternalSecret routes
  fastify.get<{ Params: { namespace: string } }>('/namespaces/:namespace/externalsecrets', async (request, reply) => {
    const { namespace } = request.params;
    if (!namespace) {
      reply.code(400);
      return { error: 'namespace is required' };
    }
    try {
      const externalsecrets = await kube.listExternalSecrets(namespace);
      return { items: externalsecrets };
    } catch (error) {
      if (error instanceof CRDNotInstalledError) {
        reply.code(503);
        return { error: error.message };
      }
      const err = error as { statusCode?: number; body?: { message?: string }; message?: string };
      if (err.statusCode === 401) {
        reply.code(401);
        return { error: err.body?.message || err.message || 'Authentication failed. Please check your Kubernetes credentials.' };
      }
      throw error;
    }
  });

  fastify.get<{ Params: { namespace: string; externalsecret: string } }>('/namespaces/:namespace/externalsecrets/:externalsecret', async (request, reply) => {
    const { namespace, externalsecret } = request.params;
    if (!namespace || !externalsecret) {
      reply.code(400);
      return { error: 'namespace and externalsecret are required' };
    }
    const detail = await kube.getExternalSecret(namespace, externalsecret);
    return detail;
  });

  fastify.get<{ Params: { namespace: string; externalsecret: string } }>('/namespaces/:namespace/externalsecrets/:externalsecret/manifest', async (request, reply) => {
    const { namespace, externalsecret } = request.params;
    const manifest = await kube.getExternalSecretManifest(namespace, externalsecret);
    reply.header('content-type', 'application/yaml');
    return yaml.stringify(JSON.parse(manifest));
  });

  fastify.get<{ Params: { namespace: string; externalsecret: string } }>('/namespaces/:namespace/externalsecrets/:externalsecret/events', async (request, reply) => {
    const { namespace, externalsecret } = request.params;
    if (!namespace || !externalsecret) {
      reply.code(400);
      return { error: 'namespace and externalsecret are required' };
    }
    const events = await kube.getExternalSecretEvents(namespace, externalsecret);
    return { events };
  });

  fastify.get<{ Params: { namespace: string; externalsecret: string } }>('/namespaces/:namespace/externalsecrets/:externalsecret/status', async (request, reply) => {
    const { namespace, externalsecret } = request.params;
    if (!namespace || !externalsecret) {
      reply.code(400);
      return { error: 'namespace and externalsecret are required' };
    }
    const status = await kube.getExternalSecretStatus(namespace, externalsecret);
    return status;
  });

  fastify.delete<{ Params: { namespace: string; externalsecret: string } }>('/namespaces/:namespace/externalsecrets/:externalsecret', async (request, reply) => {
    const { namespace, externalsecret } = request.params;
    if (!namespace || !externalsecret) {
      reply.code(400);
      return { error: 'namespace and externalsecret are required' };
    }
    await kube.deleteExternalSecret(namespace, externalsecret);
    reply.code(204);
    return null;
  });

  // SecretStore routes
  fastify.get<{ Params: { namespace: string } }>('/namespaces/:namespace/secretstores', async (request, reply) => {
    const { namespace } = request.params;
    if (!namespace) {
      reply.code(400);
      return { error: 'namespace is required' };
    }
    try {
      const secretstores = await kube.listSecretStores(namespace);
      return { items: secretstores };
    } catch (error) {
      if (error instanceof CRDNotInstalledError) {
        reply.code(503);
        return { error: error.message };
      }
      const err = error as { statusCode?: number; body?: { message?: string }; message?: string };
      if (err.statusCode === 401) {
        reply.code(401);
        return { error: err.body?.message || err.message || 'Authentication failed. Please check your Kubernetes credentials.' };
      }
      throw error;
    }
  });

  fastify.get<{ Params: { namespace: string; secretstore: string } }>('/namespaces/:namespace/secretstores/:secretstore', async (request, reply) => {
    const { namespace, secretstore } = request.params;
    if (!namespace || !secretstore) {
      reply.code(400);
      return { error: 'namespace and secretstore are required' };
    }
    const detail = await kube.getSecretStore(namespace, secretstore);
    return detail;
  });

  fastify.get<{ Params: { namespace: string; secretstore: string } }>('/namespaces/:namespace/secretstores/:secretstore/manifest', async (request, reply) => {
    const { namespace, secretstore } = request.params;
    const manifest = await kube.getSecretStoreManifest(namespace, secretstore);
    reply.header('content-type', 'application/yaml');
    return yaml.stringify(JSON.parse(manifest));
  });

  fastify.get<{ Params: { namespace: string; secretstore: string } }>('/namespaces/:namespace/secretstores/:secretstore/events', async (request, reply) => {
    const { namespace, secretstore } = request.params;
    if (!namespace || !secretstore) {
      reply.code(400);
      return { error: 'namespace and secretstore are required' };
    }
    const events = await kube.getSecretStoreEvents(namespace, secretstore);
    return { events };
  });

  fastify.get<{ Params: { namespace: string; secretstore: string } }>('/namespaces/:namespace/secretstores/:secretstore/status', async (request, reply) => {
    const { namespace, secretstore } = request.params;
    if (!namespace || !secretstore) {
      reply.code(400);
      return { error: 'namespace and secretstore are required' };
    }
    const status = await kube.getSecretStoreStatus(namespace, secretstore);
    return status;
  });

  fastify.delete<{ Params: { namespace: string; secretstore: string } }>('/namespaces/:namespace/secretstores/:secretstore', async (request, reply) => {
    const { namespace, secretstore } = request.params;
    if (!namespace || !secretstore) {
      reply.code(400);
      return { error: 'namespace and secretstore are required' };
    }
    await kube.deleteSecretStore(namespace, secretstore);
    reply.code(204);
    return null;
  });

  // CustomResourceDefinition routes
  fastify.get('/crds', async (_request, reply) => {
    try {
      const crds = await kube.listCustomResourceDefinitions();
      return { items: crds };
    } catch (error) {
      const err = error as { statusCode?: number; body?: { message?: string }; message?: string };
      if (err.statusCode === 401) {
        reply.code(401);
        return { error: err.body?.message || err.message || 'Authentication failed. Please check your Kubernetes credentials.' };
      }
      throw error;
    }
  });

  fastify.get<{ Params: { crd: string } }>('/crds/:crd', async (request, reply) => {
    const { crd } = request.params;
    if (!crd) {
      reply.code(400);
      return { error: 'crd is required' };
    }
    const detail = await kube.getCustomResourceDefinition(crd);
    return detail;
  });

  fastify.get<{ Params: { crd: string } }>('/crds/:crd/manifest', async (request, reply) => {
    const { crd } = request.params;
    const manifest = await kube.getCustomResourceDefinitionManifest(crd);
    reply.header('content-type', 'application/yaml');
    return yaml.stringify(JSON.parse(manifest));
  });

  fastify.delete<{ Params: { crd: string } }>('/crds/:crd', async (request, reply) => {
    const { crd } = request.params;
    if (!crd) {
      reply.code(400);
      return { error: 'crd is required' };
    }
    await kube.deleteCustomResourceDefinition(crd);
    reply.code(204);
    return null;
  });

  // Applications routes
  fastify.get('/applications', async (_request, reply) => {
    try {
      const applications = await kube.detectInstalledApplications();
      return { items: applications };
    } catch (error) {
      const err = error as { statusCode?: number; body?: { message?: string }; message?: string };
      if (err.statusCode === 401) {
        reply.code(401);
        return { error: err.body?.message || err.message || 'Authentication failed. Please check your Kubernetes credentials.' };
      }
      throw error;
    }
  });

  // PersistentVolumeClaim routes
  fastify.get<{ Params: { namespace: string } }>('/namespaces/:namespace/persistentvolumeclaims', async (request, reply) => {
    const { namespace } = request.params;
    if (!namespace) {
      reply.code(400);
      return { error: 'namespace is required' };
    }
    try {
      const pvcs = await kube.listPersistentVolumeClaims(namespace);
      return { items: pvcs };
    } catch (error) {
      const err = error as { statusCode?: number; body?: { message?: string }; message?: string };
      if (err.statusCode === 401) {
        reply.code(401);
        return { error: err.body?.message || err.message || 'Authentication failed. Please check your Kubernetes credentials.' };
      }
      throw error;
    }
  });

  fastify.get<{ Params: { namespace: string; pvc: string } }>('/namespaces/:namespace/persistentvolumeclaims/:pvc', async (request, reply) => {
    const { namespace, pvc } = request.params;
    if (!namespace || !pvc) {
      reply.code(400);
      return { error: 'namespace and persistentvolumeclaim are required' };
    }
    const detail = await kube.getPersistentVolumeClaim(namespace, pvc);
    return detail;
  });

  fastify.get<{ Params: { namespace: string; pvc: string } }>('/namespaces/:namespace/persistentvolumeclaims/:pvc/manifest', async (request, reply) => {
    const { namespace, pvc } = request.params;
    const manifest = await kube.getPersistentVolumeClaimManifest(namespace, pvc);
    reply.header('content-type', 'application/yaml');
    return yaml.stringify(JSON.parse(manifest));
  });

  fastify.delete<{ Params: { namespace: string; pvc: string } }>('/namespaces/:namespace/persistentvolumeclaims/:pvc', async (request, reply) => {
    const { namespace, pvc } = request.params;
    if (!namespace || !pvc) {
      reply.code(400);
      return { error: 'namespace and persistentvolumeclaim are required' };
    }
    await kube.deletePersistentVolumeClaim(namespace, pvc);
    reply.code(204);
    return null;
  });

  // StorageClass routes
  fastify.get('/storageclasses', async (_request, reply) => {
    try {
      const storageClasses = await kube.listStorageClasses();
      return { items: storageClasses };
    } catch (error) {
      const err = error as { statusCode?: number; body?: { message?: string }; message?: string };
      if (err.statusCode === 401) {
        reply.code(401);
        return { error: err.body?.message || err.message || 'Authentication failed. Please check your Kubernetes credentials.' };
      }
      throw error;
    }
  });

  fastify.get<{ Params: { storageclass: string } }>('/storageclasses/:storageclass', async (request, reply) => {
    const { storageclass } = request.params;
    if (!storageclass) {
      reply.code(400);
      return { error: 'storageclass is required' };
    }
    const detail = await kube.getStorageClass(storageclass);
    return detail;
  });

  fastify.get<{ Params: { storageclass: string } }>('/storageclasses/:storageclass/manifest', async (request, reply) => {
    const { storageclass } = request.params;
    const manifest = await kube.getStorageClassManifest(storageclass);
    reply.header('content-type', 'application/yaml');
    return yaml.stringify(JSON.parse(manifest));
  });

  fastify.delete<{ Params: { storageclass: string } }>('/storageclasses/:storageclass', async (request, reply) => {
    const { storageclass } = request.params;
    if (!storageclass) {
      reply.code(400);
      return { error: 'storageclass is required' };
    }
    await kube.deleteStorageClass(storageclass);
    reply.code(204);
    return null;
  });

  // NodeClass routes
  fastify.get('/nodeclasses', async (_request, reply) => {
    try {
      const nodeClasses = await kube.listNodeClasses();
      return { items: nodeClasses };
    } catch (error) {
      const err = error as { statusCode?: number; body?: { message?: string }; message?: string };
      if (err.statusCode === 401) {
        reply.code(401);
        return { error: err.body?.message || err.message || 'Authentication failed. Please check your Kubernetes credentials.' };
      }
      if (error instanceof CRDNotInstalledError) {
        reply.code(503);
        return { error: error.message };
      }
      throw error;
    }
  });

  fastify.get<{ Params: { nodeclass: string } }>('/nodeclasses/:nodeclass', async (request, reply) => {
    const { nodeclass } = request.params;
    if (!nodeclass) {
      reply.code(400);
      return { error: 'nodeclass is required' };
    }
    const detail = await kube.getNodeClass(nodeclass);
    return detail;
  });

  fastify.get<{ Params: { nodeclass: string } }>('/nodeclasses/:nodeclass/manifest', async (request, reply) => {
    const { nodeclass } = request.params;
    const manifest = await kube.getNodeClassManifest(nodeclass);
    reply.header('content-type', 'application/yaml');
    return yaml.stringify(JSON.parse(manifest));
  });

  fastify.get<{ Params: { nodeclass: string } }>('/nodeclasses/:nodeclass/status', async (request, reply) => {
    const { nodeclass } = request.params;
    if (!nodeclass) {
      reply.code(400);
      return { error: 'nodeclass is required' };
    }
    const status = await kube.getNodeClassStatus(nodeclass);
    return status;
  });

  fastify.delete<{ Params: { nodeclass: string } }>('/nodeclasses/:nodeclass', async (request, reply) => {
    const { nodeclass } = request.params;
    if (!nodeclass) {
      reply.code(400);
      return { error: 'nodeclass is required' };
    }
    await kube.deleteNodeClass(nodeclass);
    reply.code(204);
    return null;
  });

  // NodePool routes
  fastify.get('/nodepools', async (_request, reply) => {
    try {
      const nodepools = await kube.listNodePools();
      return { items: nodepools };
    } catch (error) {
      const err = error as { statusCode?: number; body?: { message?: string }; message?: string };
      if (err.statusCode === 401) {
        reply.code(401);
        return { error: err.body?.message || err.message || 'Authentication failed. Please check your Kubernetes credentials.' };
      }
      if (err instanceof Error && err.message.includes('CRD')) {
        reply.code(404);
        return { error: err.message };
      }
      throw error;
    }
  });

  fastify.get<{ Params: { nodepool: string } }>('/nodepools/:nodepool', async (request, reply) => {
    const { nodepool } = request.params;
    if (!nodepool) {
      reply.code(400);
      return { error: 'nodepool is required' };
    }
    return await kube.getNodePool(nodepool);
  });

  fastify.get<{ Params: { nodepool: string } }>('/nodepools/:nodepool/manifest', async (request, reply) => {
    const { nodepool } = request.params;
    const manifestJson = await kube.getNodePoolManifest(nodepool);
    const manifest = yaml.stringify(JSON.parse(manifestJson));
    return { manifest };
  });

  fastify.delete<{ Params: { nodepool: string } }>('/nodepools/:nodepool', async (request, reply) => {
    const { nodepool } = request.params;
    if (!nodepool) {
      reply.code(400);
      return { error: 'nodepool is required' };
    }
    await kube.deleteNodePool(nodepool);
    reply.code(204);
    return null;
  });

  // CronJob routes
  fastify.get<{ Params: { namespace: string } }>('/namespaces/:namespace/cronjobs', async (request, reply) => {
    const { namespace } = request.params;
    if (!namespace) {
      reply.code(400);
      return { error: 'namespace is required' };
    }
    try {
      const cronjobs = await kube.listCronJobs(namespace);
      return { items: cronjobs };
    } catch (error) {
      const err = error as { statusCode?: number; body?: { message?: string }; message?: string };
      if (err.statusCode === 401) {
        reply.code(401);
        return { error: err.body?.message || err.message || 'Authentication failed. Please check your Kubernetes credentials.' };
      }
      throw error;
    }
  });

  fastify.get<{ Params: { namespace: string; cronjob: string } }>('/namespaces/:namespace/cronjobs/:cronjob', async (request, reply) => {
    const { namespace, cronjob } = request.params;
    if (!namespace || !cronjob) {
      reply.code(400);
      return { error: 'namespace and cronjob are required' };
    }
    const detail = await kube.getCronJob(namespace, cronjob);
    return detail;
  });

  fastify.get<{ Params: { namespace: string; cronjob: string } }>('/namespaces/:namespace/cronjobs/:cronjob/manifest', async (request, reply) => {
    const { namespace, cronjob } = request.params;
    const manifest = await kube.getCronJobManifest(namespace, cronjob);
    reply.header('content-type', 'application/yaml');
    return yaml.stringify(JSON.parse(manifest));
  });

  fastify.post<{ Params: { namespace: string; cronjob: string }; Body: { suspend: boolean } }>('/namespaces/:namespace/cronjobs/:cronjob/suspend', async (request, reply) => {
    const { namespace, cronjob } = request.params;
    const { suspend } = request.body;
    if (!namespace || !cronjob) {
      reply.code(400);
      return { error: 'namespace and cronjob are required' };
    }
    if (typeof suspend !== 'boolean') {
      reply.code(400);
      return { error: 'suspend must be a boolean value' };
    }
    await kube.updateCronJobSuspend(namespace, cronjob, suspend);
    reply.code(204);
    return null;
  });

  fastify.delete<{ Params: { namespace: string; cronjob: string } }>('/namespaces/:namespace/cronjobs/:cronjob', async (request, reply) => {
    const { namespace, cronjob } = request.params;
    if (!namespace || !cronjob) {
      reply.code(400);
      return { error: 'namespace and cronjob are required' };
    }
    await kube.deleteCronJob(namespace, cronjob);
    reply.code(204);
    return null;
  });

  // Ingress routes
  fastify.get<{ Params: { namespace: string } }>('/namespaces/:namespace/ingresses', async (request, reply) => {
    const { namespace } = request.params;
    if (!namespace) {
      reply.code(400);
      return { error: 'namespace is required' };
    }
    try {
      const ingresses = await kube.listIngresses(namespace);
      return { items: ingresses };
    } catch (error) {
      const err = error as { statusCode?: number; body?: { message?: string }; message?: string };
      if (err.statusCode === 401) {
        reply.code(401);
        return { error: err.body?.message || err.message || 'Authentication failed. Please check your Kubernetes credentials.' };
      }
      throw error;
    }
  });

  fastify.get<{ Params: { namespace: string; ingress: string } }>('/namespaces/:namespace/ingresses/:ingress', async (request, reply) => {
    const { namespace, ingress } = request.params;
    if (!namespace || !ingress) {
      reply.code(400);
      return { error: 'namespace and ingress are required' };
    }
    const detail = await kube.getIngress(namespace, ingress);
    return detail;
  });

  fastify.get<{ Params: { namespace: string; ingress: string } }>('/namespaces/:namespace/ingresses/:ingress/manifest', async (request, reply) => {
    const { namespace, ingress } = request.params;
    const manifest = await kube.getIngressManifest(namespace, ingress);
    reply.header('content-type', 'application/yaml');
    return yaml.stringify(JSON.parse(manifest));
  });

  fastify.delete<{ Params: { namespace: string; ingress: string } }>('/namespaces/:namespace/ingresses/:ingress', async (request, reply) => {
    const { namespace, ingress } = request.params;
    if (!namespace || !ingress) {
      reply.code(400);
      return { error: 'namespace and ingress are required' };
    }
    await kube.deleteIngress(namespace, ingress);
    reply.code(204);
    return null;
  });

  // ScaledObject routes (KEDA)
  fastify.get<{ Params: { namespace: string } }>('/namespaces/:namespace/scaledobjects', async (request, reply) => {
    const { namespace } = request.params;
    if (!namespace) {
      reply.code(400);
      return { error: 'namespace is required' };
    }
    try {
      const scaledobjects = await kube.listScaledObjects(namespace);
      return { items: scaledobjects };
    } catch (error) {
      if (error instanceof CRDNotInstalledError) {
        reply.code(503);
        return { error: error.message };
      }
      const err = error as { statusCode?: number; body?: { message?: string }; message?: string };
      if (err.statusCode === 401) {
        reply.code(401);
        return { error: err.body?.message || err.message || 'Authentication failed. Please check your Kubernetes credentials.' };
      }
      throw error;
    }
  });

  fastify.get<{ Params: { namespace: string; scaledobject: string } }>('/namespaces/:namespace/scaledobjects/:scaledobject', async (request, reply) => {
    const { namespace, scaledobject } = request.params;
    if (!namespace || !scaledobject) {
      reply.code(400);
      return { error: 'namespace and scaledobject are required' };
    }
    const detail = await kube.getScaledObject(namespace, scaledobject);
    return detail;
  });

  fastify.get<{ Params: { namespace: string; scaledobject: string } }>('/namespaces/:namespace/scaledobjects/:scaledobject/manifest', async (request, reply) => {
    const { namespace, scaledobject } = request.params;
    const manifest = await kube.getScaledObjectManifest(namespace, scaledobject);
    reply.header('content-type', 'application/yaml');
    return yaml.stringify(JSON.parse(manifest));
  });

  fastify.delete<{ Params: { namespace: string; scaledobject: string } }>('/namespaces/:namespace/scaledobjects/:scaledobject', async (request, reply) => {
    const { namespace, scaledobject } = request.params;
    if (!namespace || !scaledobject) {
      reply.code(400);
      return { error: 'namespace and scaledobject are required' };
    }
    await kube.deleteScaledObject(namespace, scaledobject);
    reply.code(204);
    return null;
  });

  // AWS/EKS routes
  fastify.get('/aws/profiles', async (request, reply) => {
    try {
      const profiles = aws.getAwsProfiles();
      return { profiles };
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return { error: (error as Error).message };
    }
  });

  fastify.get('/aws/regions', async () => {
    const regions = aws.getAwsRegions();
    return { regions };
  });

  fastify.get<{ Querystring: { region: string; profile: string } }>('/aws/eks/clusters', async (request, reply) => {
    const { region, profile } = request.query;
    if (!region || !profile) {
      reply.code(400);
      return { error: 'region and profile are required' };
    }
    try {
      const clusters = await aws.listEksClusters(region, profile);
      return { clusters };
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return { error: (error as Error).message };
    }
  });

  fastify.post<{ Body: { clusterName: string; region: string; profile: string } }>('/aws/eks/import', async (request, reply) => {
    const { clusterName, region, profile } = request.body;
    if (!clusterName || !region || !profile) {
      reply.code(400);
      return { error: 'clusterName, region, and profile are required' };
    }
    try {
      await aws.importEksCluster(clusterName, region, profile);
      kube.refreshCredentials();
      reply.code(204);
      return null;
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return { error: (error as Error).message };
    }
  });
};

export default apiPlugin;
