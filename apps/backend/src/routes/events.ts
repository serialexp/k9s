import { FastifyPluginAsync } from 'fastify';
import { KubeService } from '../services/kube.js';

export interface EventPluginOptions {
  kube: KubeService;
}

export const eventsPlugin: FastifyPluginAsync<EventPluginOptions> = async (fastify, opts) => {
  const { kube } = opts;

  fastify.get<{
    Querystring: { namespace?: string };
  }>('/pods', async (request, reply) => {
    const namespace = request.query.namespace ?? 'default';
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      Connection: 'keep-alive',
      'Cache-Control': 'no-cache'
    });

    const send = (data: string) => {
      reply.raw.write(`data: ${data}\n\n`);
    };

    const sendHeartbeat = () => {
      reply.raw.write('event: heartbeat\n');
      reply.raw.write(`data: {"ts": ${Date.now()} }\n\n`);
    };

    const heartbeatInterval = setInterval(sendHeartbeat, 25000);

    const abortController = new AbortController();
    const teardown = await kube
      .streamPods(
        namespace,
        (chunk) => send(chunk),
        (err) => {
          const error = err as { statusCode?: number; body?: { message?: string }; message?: string };
          fastify.log.error({ err }, 'pod watch error');
          reply.raw.write('event: error\n');
          const errorMessage = error.statusCode === 401
            ? 'Authentication failed. Please check your Kubernetes credentials.'
            : error.message ?? 'unknown error';
          reply.raw.write(`data: ${JSON.stringify({ message: errorMessage, statusCode: error.statusCode })}\n\n`);
        },
        abortController.signal
      )
      .catch((error) => {
        const err = error as { statusCode?: number; body?: { message?: string }; message?: string };
        fastify.log.error({ error }, 'failed to start pod watch');
        reply.raw.write('event: error\n');
        const errorMessage = err.statusCode === 401
          ? 'Authentication failed. Please check your Kubernetes credentials.'
          : err.message ?? 'unknown error';
        reply.raw.write(`data: ${JSON.stringify({ message: errorMessage, statusCode: err.statusCode })}\n\n`);
        return () => undefined;
      });

    request.raw.on('close', () => {
      clearInterval(heartbeatInterval);
      abortController.abort();
      teardown?.();
    });

    // keep the stream open
    return reply;
  });

  fastify.get<{
    Querystring: { namespace?: string };
  }>('/deployments', async (request, reply) => {
    const namespace = request.query.namespace ?? 'default';
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      Connection: 'keep-alive',
      'Cache-Control': 'no-cache'
    });

    const send = (data: string) => {
      reply.raw.write(`data: ${data}\n\n`);
    };

    const sendHeartbeat = () => {
      reply.raw.write('event: heartbeat\n');
      reply.raw.write(`data: {"ts": ${Date.now()} }\n\n`);
    };

    const heartbeatInterval = setInterval(sendHeartbeat, 25000);

    const abortController = new AbortController();
    const teardown = await kube
      .streamDeployments(
        namespace,
        (chunk) => send(chunk),
        (err) => {
          const error = err as { statusCode?: number; body?: { message?: string }; message?: string };
          fastify.log.error({ err }, 'deployment watch error');
          reply.raw.write('event: error\n');
          const errorMessage = error.statusCode === 401
            ? 'Authentication failed. Please check your Kubernetes credentials.'
            : error.message ?? 'unknown error';
          reply.raw.write(`data: ${JSON.stringify({ message: errorMessage, statusCode: error.statusCode })}\n\n`);
        },
        abortController.signal
      )
      .catch((error) => {
        const err = error as { statusCode?: number; body?: { message?: string }; message?: string };
        fastify.log.error({ error }, 'failed to start deployment watch');
        reply.raw.write('event: error\n');
        const errorMessage = err.statusCode === 401
          ? 'Authentication failed. Please check your Kubernetes credentials.'
          : err.message ?? 'unknown error';
        reply.raw.write(`data: ${JSON.stringify({ message: errorMessage, statusCode: err.statusCode })}\n\n`);
        return () => undefined;
      });

    request.raw.on('close', () => {
      clearInterval(heartbeatInterval);
      abortController.abort();
      teardown?.();
    });

    // keep the stream open
    return reply;
  });

  fastify.get<{
    Querystring: { namespace?: string };
  }>('/rollouts', async (request, reply) => {
    const namespace = request.query.namespace ?? 'default';
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      Connection: 'keep-alive',
      'Cache-Control': 'no-cache'
    });

    const send = (data: string) => {
      reply.raw.write(`data: ${data}\n\n`);
    };

    const sendHeartbeat = () => {
      reply.raw.write('event: heartbeat\n');
      reply.raw.write(`data: {"ts": ${Date.now()} }\n\n`);
    };

    const heartbeatInterval = setInterval(sendHeartbeat, 25000);

    const abortController = new AbortController();
    const teardown = await kube
      .streamRollouts(
        namespace,
        (chunk) => send(chunk),
        (err) => {
          const error = err as { statusCode?: number; body?: { message?: string }; message?: string };
          fastify.log.error({ err }, 'rollout watch error');
          reply.raw.write('event: error\n');
          const errorMessage = error.statusCode === 401
            ? 'Authentication failed. Please check your Kubernetes credentials.'
            : error.statusCode === 404
              ? (error.message ?? 'Argo Rollouts CRD not found in this cluster. Install Argo Rollouts to enable this view.')
              : error.message ?? 'unknown error';
          reply.raw.write(`data: ${JSON.stringify({ message: errorMessage, statusCode: error.statusCode })}\n\n`);
        },
        abortController.signal
      )
      .catch((error) => {
        const err = error as { statusCode?: number; body?: { message?: string }; message?: string };
        fastify.log.error({ error }, 'failed to start rollout watch');
        reply.raw.write('event: error\n');
        const errorMessage = err.statusCode === 401
          ? 'Authentication failed. Please check your Kubernetes credentials.'
          : err.statusCode === 404
            ? (err.message ?? 'Argo Rollouts CRD not found in this cluster. Install Argo Rollouts to enable this view.')
            : err.message ?? 'unknown error';
        reply.raw.write(`data: ${JSON.stringify({ message: errorMessage, statusCode: err.statusCode })}\n\n`);
        return () => undefined;
      });

    request.raw.on('close', () => {
      clearInterval(heartbeatInterval);
      abortController.abort();
      teardown?.();
    });

    // keep the stream open
    return reply;
  });

  fastify.get<{
    Querystring: { namespace?: string };
  }>('/daemonsets', async (request, reply) => {
    const namespace = request.query.namespace ?? 'default';
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      Connection: 'keep-alive',
      'Cache-Control': 'no-cache'
    });

    const send = (data: string) => {
      reply.raw.write(`data: ${data}\n\n`);
    };

    const sendHeartbeat = () => {
      reply.raw.write('event: heartbeat\n');
      reply.raw.write(`data: {"ts": ${Date.now()} }\n\n`);
    };

    const heartbeatInterval = setInterval(sendHeartbeat, 25000);

    const abortController = new AbortController();
    const teardown = await kube
      .streamDaemonSets(
        namespace,
        (chunk) => send(chunk),
        (err) => {
          const error = err as { statusCode?: number; body?: { message?: string }; message?: string };
          fastify.log.error({ err }, 'daemonset watch error');
          reply.raw.write('event: error\n');
          const errorMessage = error.statusCode === 401
            ? 'Authentication failed. Please check your Kubernetes credentials.'
            : error.message ?? 'unknown error';
          reply.raw.write(`data: ${JSON.stringify({ message: errorMessage, statusCode: error.statusCode })}\n\n`);
        },
        abortController.signal
      )
      .catch((error) => {
        const err = error as { statusCode?: number; body?: { message?: string }; message?: string };
        fastify.log.error({ error }, 'failed to start daemonset watch');
        reply.raw.write('event: error\n');
        const errorMessage = err.statusCode === 401
          ? 'Authentication failed. Please check your Kubernetes credentials.'
          : err.message ?? 'unknown error';
        reply.raw.write(`data: ${JSON.stringify({ message: errorMessage, statusCode: err.statusCode })}\n\n`);
        return () => undefined;
      });

    request.raw.on('close', () => {
      clearInterval(heartbeatInterval);
      abortController.abort();
      teardown?.();
    });

    // keep the stream open
    return reply;
  });

  fastify.get<{
    Querystring: { namespace?: string };
  }>('/statefulsets', async (request, reply) => {
    const namespace = request.query.namespace ?? 'default';
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      Connection: 'keep-alive',
      'Cache-Control': 'no-cache'
    });

    const send = (data: string) => {
      reply.raw.write(`data: ${data}\n\n`);
    };

    const sendHeartbeat = () => {
      reply.raw.write('event: heartbeat\n');
      reply.raw.write(`data: {"ts": ${Date.now()} }\n\n`);
    };

    const heartbeatInterval = setInterval(sendHeartbeat, 25000);

    const abortController = new AbortController();
    const teardown = await kube
      .streamStatefulSets(
        namespace,
        (chunk) => send(chunk),
        (err) => {
          const error = err as { statusCode?: number; body?: { message?: string }; message?: string };
          fastify.log.error({ err }, 'statefulset watch error');
          reply.raw.write('event: error\n');
          const errorMessage = error.statusCode === 401
            ? 'Authentication failed. Please check your Kubernetes credentials.'
            : error.message ?? 'unknown error';
          reply.raw.write(`data: ${JSON.stringify({ message: errorMessage, statusCode: error.statusCode })}\n\n`);
        },
        abortController.signal
      )
      .catch((error) => {
        const err = error as { statusCode?: number; body?: { message?: string }; message?: string };
        fastify.log.error({ error }, 'failed to start statefulset watch');
        reply.raw.write('event: error\n');
        const errorMessage = err.statusCode === 401
          ? 'Authentication failed. Please check your Kubernetes credentials.'
          : err.message ?? 'unknown error';
        reply.raw.write(`data: ${JSON.stringify({ message: errorMessage, statusCode: err.statusCode })}\n\n`);
        return () => undefined;
      });

    request.raw.on('close', () => {
      clearInterval(heartbeatInterval);
      abortController.abort();
      teardown?.();
    });

    return reply;
  });

  fastify.get<{
    Querystring: { namespace?: string };
  }>('/jobs', async (request, reply) => {
    const namespace = request.query.namespace ?? 'default';
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      Connection: 'keep-alive',
      'Cache-Control': 'no-cache'
    });

    const send = (data: string) => {
      reply.raw.write(`data: ${data}\n\n`);
    };

    const sendHeartbeat = () => {
      reply.raw.write('event: heartbeat\n');
      reply.raw.write(`data: {"ts": ${Date.now()} }\n\n`);
    };

    const heartbeatInterval = setInterval(sendHeartbeat, 25000);

    const abortController = new AbortController();
    const teardown = await kube
      .streamJobs(
        namespace,
        (chunk) => send(chunk),
        (err) => {
          const error = err as { statusCode?: number; body?: { message?: string }; message?: string };
          fastify.log.error({ err }, 'job watch error');
          reply.raw.write('event: error\n');
          const errorMessage = error.statusCode === 401
            ? 'Authentication failed. Please check your Kubernetes credentials.'
            : error.message ?? 'unknown error';
          reply.raw.write(`data: ${JSON.stringify({ message: errorMessage, statusCode: error.statusCode })}\n\n`);
        },
        abortController.signal
      )
      .catch((error) => {
        const err = error as { statusCode?: number; body?: { message?: string }; message?: string };
        fastify.log.error({ error }, 'failed to start job watch');
        reply.raw.write('event: error\n');
        const errorMessage = err.statusCode === 401
          ? 'Authentication failed. Please check your Kubernetes credentials.'
          : err.message ?? 'unknown error';
        reply.raw.write(`data: ${JSON.stringify({ message: errorMessage, statusCode: err.statusCode })}\n\n`);
        return () => undefined;
      });

    request.raw.on('close', () => {
      clearInterval(heartbeatInterval);
      abortController.abort();
      teardown?.();
    });

    return reply;
  });

  fastify.get<{
    Querystring: { namespace?: string };
  }>('/serviceaccounts', async (request, reply) => {
    const namespace = request.query.namespace ?? 'default';
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      Connection: 'keep-alive',
      'Cache-Control': 'no-cache'
    });

    const send = (data: string) => {
      reply.raw.write(`data: ${data}\n\n`);
    };

    const sendHeartbeat = () => {
      reply.raw.write('event: heartbeat\n');
      reply.raw.write(`data: {"ts": ${Date.now()} }\n\n`);
    };

    const heartbeatInterval = setInterval(sendHeartbeat, 25000);

    const abortController = new AbortController();
    const teardown = await kube
      .streamServiceAccounts(
        namespace,
        (chunk) => send(chunk),
        (err) => {
          const error = err as { statusCode?: number; body?: { message?: string }; message?: string };
          fastify.log.error({ err }, 'serviceaccount watch error');
          reply.raw.write('event: error\n');
          const errorMessage = error.statusCode === 401
            ? 'Authentication failed. Please check your Kubernetes credentials.'
            : error.message ?? 'unknown error';
          reply.raw.write(`data: ${JSON.stringify({ message: errorMessage, statusCode: error.statusCode })}\n\n`);
        },
        abortController.signal
      )
      .catch((error) => {
        const err = error as { statusCode?: number; body?: { message?: string }; message?: string };
        fastify.log.error({ error }, 'failed to start serviceaccount watch');
        reply.raw.write('event: error\n');
        const errorMessage = err.statusCode === 401
          ? 'Authentication failed. Please check your Kubernetes credentials.'
          : err.message ?? 'unknown error';
        reply.raw.write(`data: ${JSON.stringify({ message: errorMessage, statusCode: err.statusCode })}\n\n`);
        return () => undefined;
      });

    request.raw.on('close', () => {
      clearInterval(heartbeatInterval);
      abortController.abort();
      teardown?.();
    });

    return reply;
  });

  fastify.get<{
    Querystring: { namespace?: string };
  }>('/argocd/applications', async (request, reply) => {
    const namespace = request.query.namespace ?? 'default';
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      Connection: 'keep-alive',
      'Cache-Control': 'no-cache'
    });

    const send = (data: string) => {
      reply.raw.write(`data: ${data}\n\n`);
    };

    const sendHeartbeat = () => {
      reply.raw.write('event: heartbeat\n');
      reply.raw.write(`data: {"ts": ${Date.now()} }\n\n`);
    };

    const heartbeatInterval = setInterval(sendHeartbeat, 25000);

    const abortController = new AbortController();
    const teardown = await kube
      .streamArgoApplications(
        namespace,
        (chunk) => send(chunk),
        (err) => {
          const error = err as { statusCode?: number; body?: { message?: string }; message?: string };
          const isNotFound = error.statusCode === 404;
          if (isNotFound) {
            fastify.log.warn({ err }, 'Argo CD applications CRD not found; streaming disabled');
          } else {
            fastify.log.error({ err }, 'argocd application watch error');
          }
          reply.raw.write('event: error\n');
          const errorMessage = isNotFound
            ? 'Argo CD applications not found in this cluster. Install Argo CD to enable this view.'
            : error.statusCode === 401
              ? 'Authentication failed. Please check your Kubernetes credentials.'
              : error.message ?? 'unknown error';
          reply.raw.write(`data: ${JSON.stringify({ message: errorMessage, statusCode: error.statusCode })}\n\n`);
        },
        abortController.signal
      )
      .catch((error) => {
        const err = error as { statusCode?: number; body?: { message?: string }; message?: string };
        const isNotFound = err.statusCode === 404;
        if (isNotFound) {
          fastify.log.warn({ error }, 'Argo CD applications CRD not found; failed to start watch');
        } else {
          fastify.log.error({ error }, 'failed to start argocd application watch');
        }
        reply.raw.write('event: error\n');
        const errorMessage = isNotFound
          ? 'Argo CD applications not found in this cluster. Install Argo CD to enable this view.'
          : err.statusCode === 401
            ? 'Authentication failed. Please check your Kubernetes credentials.'
            : err.message ?? 'unknown error';
        reply.raw.write(`data: ${JSON.stringify({ message: errorMessage, statusCode: err.statusCode })}\n\n`);
        return () => undefined;
      });

    request.raw.on('close', () => {
      clearInterval(heartbeatInterval);
      abortController.abort();
      teardown?.();
    });

    return reply;
  });

  fastify.get<{
    Querystring: { namespace?: string };
  }>('/cronjobs', async (request, reply) => {
    const namespace = request.query.namespace ?? 'default';
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      Connection: 'keep-alive',
      'Cache-Control': 'no-cache'
    });

    const send = (data: string) => {
      reply.raw.write(`data: ${data}\n\n`);
    };

    const sendHeartbeat = () => {
      reply.raw.write('event: heartbeat\n');
      reply.raw.write(`data: {"ts": ${Date.now()} }\n\n`);
    };

    const heartbeatInterval = setInterval(sendHeartbeat, 25000);

    const abortController = new AbortController();
    const teardown = await kube
      .streamCronJobs(
        namespace,
        (chunk) => send(chunk),
        (err) => {
          const error = err as { statusCode?: number; body?: { message?: string }; message?: string };
          fastify.log.error({ err }, 'cronjob watch error');
          reply.raw.write('event: error\n');
          const errorMessage = error.statusCode === 401
            ? 'Authentication failed. Please check your Kubernetes credentials.'
            : error.message ?? 'unknown error';
          reply.raw.write(`data: ${JSON.stringify({ message: errorMessage, statusCode: error.statusCode })}\n\n`);
        },
        abortController.signal
      )
      .catch((error) => {
        const err = error as { statusCode?: number; body?: { message?: string }; message?: string };
        fastify.log.error({ error }, 'failed to start cronjob watch');
        reply.raw.write('event: error\n');
        const errorMessage = err.statusCode === 401
          ? 'Authentication failed. Please check your Kubernetes credentials.'
          : err.message ?? 'unknown error';
        reply.raw.write(`data: ${JSON.stringify({ message: errorMessage, statusCode: err.statusCode })}\n\n`);
        return () => undefined;
      });

    request.raw.on('close', () => {
      clearInterval(heartbeatInterval);
      abortController.abort();
      teardown?.();
    });

    return reply;
  });

  fastify.get<{
    Querystring: { namespace?: string };
  }>('/services', async (request, reply) => {
    const namespace = request.query.namespace ?? 'default';
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      Connection: 'keep-alive',
      'Cache-Control': 'no-cache'
    });

    const send = (data: string) => {
      reply.raw.write(`data: ${data}\n\n`);
    };

    const sendHeartbeat = () => {
      reply.raw.write('event: heartbeat\n');
      reply.raw.write(`data: {"ts": ${Date.now()} }\n\n`);
    };

    const heartbeatInterval = setInterval(sendHeartbeat, 25000);

    const abortController = new AbortController();
    const teardown = await kube
      .streamServices(
        namespace,
        (chunk) => send(chunk),
        (err) => {
          const error = err as { statusCode?: number; body?: { message?: string }; message?: string };
          fastify.log.error({ err }, 'service watch error');
          reply.raw.write('event: error\n');
          const errorMessage = error.statusCode === 401
            ? 'Authentication failed. Please check your Kubernetes credentials.'
            : error.message ?? 'unknown error';
          reply.raw.write(`data: ${JSON.stringify({ message: errorMessage, statusCode: error.statusCode })}\n\n`);
        },
        abortController.signal
      )
      .catch((error) => {
        const err = error as { statusCode?: number; body?: { message?: string }; message?: string };
        fastify.log.error({ error }, 'failed to start service watch');
        reply.raw.write('event: error\n');
        const errorMessage = err.statusCode === 401
          ? 'Authentication failed. Please check your Kubernetes credentials.'
          : err.message ?? 'unknown error';
        reply.raw.write(`data: ${JSON.stringify({ message: errorMessage, statusCode: err.statusCode })}\n\n`);
        return () => undefined;
      });

    request.raw.on('close', () => {
      clearInterval(heartbeatInterval);
      abortController.abort();
      teardown?.();
    });

    // keep the stream open
    return reply;
  });

  fastify.get<{
    Querystring: { namespace?: string };
  }>('/ingresses', async (request, reply) => {
    const namespace = request.query.namespace ?? 'default';
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      Connection: 'keep-alive',
      'Cache-Control': 'no-cache'
    });

    const send = (data: string) => {
      reply.raw.write(`data: ${data}\n\n`);
    };

    const sendHeartbeat = () => {
      reply.raw.write('event: heartbeat\n');
      reply.raw.write(`data: {"ts": ${Date.now()} }\n\n`);
    };

    const heartbeatInterval = setInterval(sendHeartbeat, 25000);

    const abortController = new AbortController();
    const teardown = await kube
      .streamIngresses(
        namespace,
        (chunk) => send(chunk),
        (err) => {
          const error = err as { statusCode?: number; body?: { message?: string }; message?: string };
          fastify.log.error({ err }, 'ingress watch error');
          reply.raw.write('event: error\n');
          const errorMessage = error.statusCode === 401
            ? 'Authentication failed. Please check your Kubernetes credentials.'
            : error.message ?? 'unknown error';
          reply.raw.write(`data: ${JSON.stringify({ message: errorMessage, statusCode: error.statusCode })}\n\n`);
        },
        abortController.signal
      )
      .catch((error) => {
        const err = error as { statusCode?: number; body?: { message?: string }; message?: string };
        fastify.log.error({ error }, 'failed to start ingress watch');
        reply.raw.write('event: error\n');
        const errorMessage = err.statusCode === 401
          ? 'Authentication failed. Please check your Kubernetes credentials.'
          : err.message ?? 'unknown error';
        reply.raw.write(`data: ${JSON.stringify({ message: errorMessage, statusCode: err.statusCode })}\n\n`);
        return () => undefined;
      });

    request.raw.on('close', () => {
      clearInterval(heartbeatInterval);
      abortController.abort();
      teardown?.();
    });

    return reply;
  });

  fastify.get<{
    Querystring: { namespace?: string };
  }>('/configmaps', async (request, reply) => {
    const namespace = request.query.namespace ?? 'default';
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      Connection: 'keep-alive',
      'Cache-Control': 'no-cache'
    });

    const send = (data: string) => {
      reply.raw.write(`data: ${data}\n\n`);
    };

    const sendHeartbeat = () => {
      reply.raw.write('event: heartbeat\n');
      reply.raw.write(`data: {"ts": ${Date.now()} }\n\n`);
    };

    const heartbeatInterval = setInterval(sendHeartbeat, 25000);

    const abortController = new AbortController();
    const teardown = await kube
      .streamConfigMaps(
        namespace,
        (chunk) => send(chunk),
        (err) => {
          const error = err as { statusCode?: number; body?: { message?: string }; message?: string };
          fastify.log.error({ err }, 'configmap watch error');
          reply.raw.write('event: error\n');
          const errorMessage = error.statusCode === 401
            ? 'Authentication failed. Please check your Kubernetes credentials.'
            : error.message ?? 'unknown error';
          reply.raw.write(`data: ${JSON.stringify({ message: errorMessage, statusCode: error.statusCode })}\n\n`);
        },
        abortController.signal
      )
      .catch((error) => {
        const err = error as { statusCode?: number; body?: { message?: string }; message?: string };
        fastify.log.error({ error }, 'failed to start configmap watch');
        reply.raw.write('event: error\n');
        const errorMessage = err.statusCode === 401
          ? 'Authentication failed. Please check your Kubernetes credentials.'
          : err.message ?? 'unknown error';
        reply.raw.write(`data: ${JSON.stringify({ message: errorMessage, statusCode: err.statusCode })}\n\n`);
        return () => undefined;
      });

    request.raw.on('close', () => {
      clearInterval(heartbeatInterval);
      abortController.abort();
      teardown?.();
    });

    return reply;
  });

  fastify.get<{
    Querystring: { namespace?: string };
  }>('/secrets', async (request, reply) => {
    const namespace = request.query.namespace ?? 'default';
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      Connection: 'keep-alive',
      'Cache-Control': 'no-cache'
    });

    const send = (data: string) => {
      reply.raw.write(`data: ${data}\n\n`);
    };

    const sendHeartbeat = () => {
      reply.raw.write('event: heartbeat\n');
      reply.raw.write(`data: {"ts": ${Date.now()} }\n\n`);
    };

    const heartbeatInterval = setInterval(sendHeartbeat, 25000);

    const abortController = new AbortController();
    const teardown = await kube
      .streamSecrets(
        namespace,
        (chunk) => send(chunk),
        (err) => {
          const error = err as { statusCode?: number; body?: { message?: string }; message?: string };
          fastify.log.error({ err }, 'secret watch error');
          reply.raw.write('event: error\n');
          const errorMessage = error.statusCode === 401
            ? 'Authentication failed. Please check your Kubernetes credentials.'
            : error.message ?? 'unknown error';
          reply.raw.write(`data: ${JSON.stringify({ message: errorMessage, statusCode: error.statusCode })}\n\n`);
        },
        abortController.signal
      )
      .catch((error) => {
        const err = error as { statusCode?: number; body?: { message?: string }; message?: string };
        fastify.log.error({ error }, 'failed to start secret watch');
        reply.raw.write('event: error\n');
        const errorMessage = err.statusCode === 401
          ? 'Authentication failed. Please check your Kubernetes credentials.'
          : err.message ?? 'unknown error';
        reply.raw.write(`data: ${JSON.stringify({ message: errorMessage, statusCode: err.statusCode })}\n\n`);
        return () => undefined;
      });

    request.raw.on('close', () => {
      clearInterval(heartbeatInterval);
      abortController.abort();
      teardown?.();
    });

    return reply;
  });

  fastify.get<{
    Querystring: { namespace?: string };
  }>('/hpas', async (request, reply) => {
    const namespace = request.query.namespace ?? 'default';
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      Connection: 'keep-alive',
      'Cache-Control': 'no-cache'
    });

    const send = (data: string) => {
      reply.raw.write(`data: ${data}\n\n`);
    };

    const sendHeartbeat = () => {
      reply.raw.write('event: heartbeat\n');
      reply.raw.write(`data: {"ts": ${Date.now()} }\n\n`);
    };

    const heartbeatInterval = setInterval(sendHeartbeat, 25000);

    const abortController = new AbortController();
    const teardown = await kube
      .streamHpas(
        namespace,
        (chunk) => send(chunk),
        (err) => {
          const error = err as { statusCode?: number; body?: { message?: string }; message?: string };
          fastify.log.error({ err }, 'hpa watch error');
          reply.raw.write('event: error\n');
          const errorMessage = error.statusCode === 401
            ? 'Authentication failed. Please check your Kubernetes credentials.'
            : error.message ?? 'unknown error';
          reply.raw.write(`data: ${JSON.stringify({ message: errorMessage, statusCode: error.statusCode })}\n\n`);
        },
        abortController.signal
      )
      .catch((error) => {
        const err = error as { statusCode?: number; body?: { message?: string }; message?: string };
        fastify.log.error({ error }, 'failed to start hpa watch');
        reply.raw.write('event: error\n');
        const errorMessage = err.statusCode === 401
          ? 'Authentication failed. Please check your Kubernetes credentials.'
          : err.message ?? 'unknown error';
        reply.raw.write(`data: ${JSON.stringify({ message: errorMessage, statusCode: err.statusCode })}\n\n`);
        return () => undefined;
      });

    request.raw.on('close', () => {
      clearInterval(heartbeatInterval);
      abortController.abort();
      teardown?.();
    });

    return reply;
  });

  fastify.get<{
    Querystring: { namespace?: string };
  }>('/pdbs', async (request, reply) => {
    const namespace = request.query.namespace ?? 'default';
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      Connection: 'keep-alive',
      'Cache-Control': 'no-cache'
    });

    const send = (data: string) => {
      reply.raw.write(`data: ${data}\n\n`);
    };

    const sendHeartbeat = () => {
      reply.raw.write('event: heartbeat\n');
      reply.raw.write(`data: {"ts": ${Date.now()} }\n\n`);
    };

    const heartbeatInterval = setInterval(sendHeartbeat, 25000);

    const abortController = new AbortController();
    const teardown = await kube
      .streamPdbs(
        namespace,
        (chunk) => send(chunk),
        (err) => {
          const error = err as { statusCode?: number; body?: { message?: string }; message?: string };
          fastify.log.error({ err }, 'pdb watch error');
          reply.raw.write('event: error\n');
          const errorMessage = error.statusCode === 401
            ? 'Authentication failed. Please check your Kubernetes credentials.'
            : error.message ?? 'unknown error';
          reply.raw.write(`data: ${JSON.stringify({ message: errorMessage, statusCode: error.statusCode })}\n\n`);
        },
        abortController.signal
      )
      .catch((error) => {
        const err = error as { statusCode?: number; body?: { message?: string }; message?: string };
        fastify.log.error({ error }, 'failed to start pdb watch');
        reply.raw.write('event: error\n');
        const errorMessage = err.statusCode === 401
          ? 'Authentication failed. Please check your Kubernetes credentials.'
          : err.message ?? 'unknown error';
        reply.raw.write(`data: ${JSON.stringify({ message: errorMessage, statusCode: err.statusCode })}\n\n`);
        return () => undefined;
      });

    request.raw.on('close', () => {
      clearInterval(heartbeatInterval);
      abortController.abort();
      teardown?.();
    });

    return reply;
  });

  fastify.get<{
    Querystring: { namespace?: string };
  }>('/externalsecrets', async (request, reply) => {
    const namespace = request.query.namespace ?? 'default';
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      Connection: 'keep-alive',
      'Cache-Control': 'no-cache'
    });

    const send = (data: string) => {
      reply.raw.write(`data: ${data}\n\n`);
    };

    const sendHeartbeat = () => {
      reply.raw.write('event: heartbeat\n');
      reply.raw.write(`data: {"ts": ${Date.now()} }\n\n`);
    };

    const heartbeatInterval = setInterval(sendHeartbeat, 25000);

    const abortController = new AbortController();
    const teardown = await kube
      .streamExternalSecrets(
        namespace,
        (chunk) => send(chunk),
        (err) => {
          const error = err as { statusCode?: number; body?: { message?: string }; message?: string };
          fastify.log.error({ err }, 'externalsecret watch error');
          reply.raw.write('event: error\n');
          const errorMessage = error.statusCode === 401
            ? 'Authentication failed. Please check your Kubernetes credentials.'
            : error.statusCode === 404
              ? (error.message ?? 'ExternalSecrets CRD not found in this cluster. Install External Secrets Operator to enable this view.')
              : error.message ?? 'unknown error';
          reply.raw.write(`data: ${JSON.stringify({ message: errorMessage, statusCode: error.statusCode })}\n\n`);
        },
        abortController.signal
      )
      .catch((error) => {
        const err = error as { statusCode?: number; body?: { message?: string }; message?: string };
        fastify.log.error({ error }, 'failed to start externalsecret watch');
        reply.raw.write('event: error\n');
        const errorMessage = err.statusCode === 401
          ? 'Authentication failed. Please check your Kubernetes credentials.'
          : err.statusCode === 404
            ? (err.message ?? 'ExternalSecrets CRD not found in this cluster. Install External Secrets Operator to enable this view.')
            : err.message ?? 'unknown error';
        reply.raw.write(`data: ${JSON.stringify({ message: errorMessage, statusCode: err.statusCode })}\n\n`);
        return () => undefined;
      });

    request.raw.on('close', () => {
      clearInterval(heartbeatInterval);
      abortController.abort();
      teardown?.();
    });

    return reply;
  });

  fastify.get<{
    Querystring: { namespace?: string };
  }>('/secretstores', async (request, reply) => {
    const namespace = request.query.namespace ?? 'default';
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      Connection: 'keep-alive',
      'Cache-Control': 'no-cache'
    });

    const send = (data: string) => {
      reply.raw.write(`data: ${data}\n\n`);
    };

    const sendHeartbeat = () => {
      reply.raw.write('event: heartbeat\n');
      reply.raw.write(`data: {"ts": ${Date.now()} }\n\n`);
    };

    const heartbeatInterval = setInterval(sendHeartbeat, 25000);

    const abortController = new AbortController();
    const teardown = await kube
      .streamSecretStores(
        namespace,
        (chunk) => send(chunk),
        (err) => {
          const error = err as { statusCode?: number; body?: { message?: string }; message?: string };
          fastify.log.error({ err }, 'secretstore watch error');
          reply.raw.write('event: error\n');
          const errorMessage = error.statusCode === 401
            ? 'Authentication failed. Please check your Kubernetes credentials.'
            : error.statusCode === 404
              ? (error.message ?? 'SecretStore CRD not found in this cluster. Install External Secrets Operator to enable this view.')
              : error.message ?? 'unknown error';
          reply.raw.write(`data: ${JSON.stringify({ message: errorMessage, statusCode: error.statusCode })}\n\n`);
        },
        abortController.signal
      )
      .catch((error) => {
        const err = error as { statusCode?: number; body?: { message?: string }; message?: string };
        fastify.log.error({ error }, 'failed to start secretstore watch');
        reply.raw.write('event: error\n');
        const errorMessage = err.statusCode === 401
          ? 'Authentication failed. Please check your Kubernetes credentials.'
          : err.statusCode === 404
            ? (err.message ?? 'SecretStore CRD not found in this cluster. Install External Secrets Operator to enable this view.')
            : err.message ?? 'unknown error';
        reply.raw.write(`data: ${JSON.stringify({ message: errorMessage, statusCode: err.statusCode })}\n\n`);
        return () => undefined;
      });

    request.raw.on('close', () => {
      clearInterval(heartbeatInterval);
      abortController.abort();
      teardown?.();
    });

    return reply;
  });

  fastify.get('/crds', async (_request, reply) => {
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      Connection: 'keep-alive',
      'Cache-Control': 'no-cache'
    });

    const send = (data: string) => {
      reply.raw.write(`data: ${data}\n\n`);
    };

    const sendHeartbeat = () => {
      reply.raw.write('event: heartbeat\n');
      reply.raw.write(`data: {"ts": ${Date.now()} }\n\n`);
    };

    const heartbeatInterval = setInterval(sendHeartbeat, 25000);

    const abortController = new AbortController();
    const teardown = await kube
      .streamCustomResourceDefinitions(
        (chunk) => send(chunk),
        (err) => {
          const error = err as { statusCode?: number; body?: { message?: string }; message?: string };
          fastify.log.error({ err }, 'crd watch error');
          reply.raw.write('event: error\n');
          const errorMessage = error.statusCode === 401
            ? 'Authentication failed. Please check your Kubernetes credentials.'
            : error.message ?? 'unknown error';
          reply.raw.write(`data: ${JSON.stringify({ message: errorMessage, statusCode: error.statusCode })}\n\n`);
        },
        abortController.signal
      )
      .catch((error) => {
        const err = error as { statusCode?: number; body?: { message?: string }; message?: string };
        fastify.log.error({ error }, 'failed to start crd watch');
        reply.raw.write('event: error\n');
        const errorMessage = err.statusCode === 401
          ? 'Authentication failed. Please check your Kubernetes credentials.'
          : err.message ?? 'unknown error';
        reply.raw.write(`data: ${JSON.stringify({ message: errorMessage, statusCode: err.statusCode })}\n\n`);
        return () => undefined;
      });

    _request.raw.on('close', () => {
      clearInterval(heartbeatInterval);
      abortController.abort();
      teardown?.();
    });

    return reply;
  });

  fastify.get('/storageclasses', async (request, reply) => {
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      Connection: 'keep-alive',
      'Cache-Control': 'no-cache'
    });

    const send = (data: string) => {
      reply.raw.write(`data: ${data}\n\n`);
    };

    const sendHeartbeat = () => {
      reply.raw.write('event: heartbeat\n');
      reply.raw.write(`data: {"ts": ${Date.now()} }\n\n`);
    };

    const heartbeatInterval = setInterval(sendHeartbeat, 25000);

    const abortController = new AbortController();
    const teardown = await kube
      .streamStorageClasses(
        (chunk) => send(chunk),
        (err) => {
          const error = err as { statusCode?: number; body?: { message?: string }; message?: string };
          fastify.log.error({ err }, 'storageclass watch error');
          reply.raw.write('event: error\n');
          const errorMessage = error.statusCode === 401
            ? 'Authentication failed. Please check your Kubernetes credentials.'
            : error.message ?? 'unknown error';
          reply.raw.write(`data: ${JSON.stringify({ message: errorMessage, statusCode: error.statusCode })}\n\n`);
        },
        abortController.signal
      )
      .catch((error) => {
        const err = error as { statusCode?: number; body?: { message?: string }; message?: string };
        fastify.log.error({ error }, 'failed to start storageclass watch');
        reply.raw.write('event: error\n');
        const errorMessage = err.statusCode === 401
          ? 'Authentication failed. Please check your Kubernetes credentials.'
          : err.message ?? 'unknown error';
        reply.raw.write(`data: ${JSON.stringify({ message: errorMessage, statusCode: err.statusCode })}\n\n`);
        return () => undefined;
      });

    request.raw.on('close', () => {
      clearInterval(heartbeatInterval);
      abortController.abort();
      teardown?.();
    });

    return reply;
  });

  fastify.get<{
    Querystring: { namespace?: string };
  }>('/roles', async (request, reply) => {
    const namespace = request.query.namespace ?? 'default';
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      Connection: 'keep-alive',
      'Cache-Control': 'no-cache'
    });

    const send = (data: string) => {
      reply.raw.write(`data: ${data}\n\n`);
    };

    const sendHeartbeat = () => {
      reply.raw.write('event: heartbeat\n');
      reply.raw.write(`data: {"ts": ${Date.now()} }\n\n`);
    };

    const heartbeatInterval = setInterval(sendHeartbeat, 25000);

    const abortController = new AbortController();
    const teardown = await kube
      .streamRoles(
        namespace,
        (chunk) => send(chunk),
        (err) => {
          const error = err as { statusCode?: number; body?: { message?: string }; message?: string };
          fastify.log.error({ err }, 'role watch error');
          reply.raw.write('event: error\n');
          const errorMessage = error.statusCode === 401
            ? 'Authentication failed. Please check your Kubernetes credentials.'
            : error.message ?? 'unknown error';
          reply.raw.write(`data: ${JSON.stringify({ message: errorMessage, statusCode: error.statusCode })}\n\n`);
        },
        abortController.signal
      )
      .catch((error) => {
        const err = error as { statusCode?: number; body?: { message?: string }; message?: string };
        fastify.log.error({ error }, 'failed to start role watch');
        reply.raw.write('event: error\n');
        const errorMessage = err.statusCode === 401
          ? 'Authentication failed. Please check your Kubernetes credentials.'
          : err.message ?? 'unknown error';
        reply.raw.write(`data: ${JSON.stringify({ message: errorMessage, statusCode: err.statusCode })}\n\n`);
        return () => undefined;
      });

    request.raw.on('close', () => {
      clearInterval(heartbeatInterval);
      abortController.abort();
      teardown?.();
    });

    return reply;
  });

  fastify.get('/clusterroles', async (request, reply) => {
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      Connection: 'keep-alive',
      'Cache-Control': 'no-cache'
    });

    const send = (data: string) => {
      reply.raw.write(`data: ${data}\n\n`);
    };

    const sendHeartbeat = () => {
      reply.raw.write('event: heartbeat\n');
      reply.raw.write(`data: {"ts": ${Date.now()} }\n\n`);
    };

    const heartbeatInterval = setInterval(sendHeartbeat, 25000);

    const abortController = new AbortController();
    const teardown = await kube
      .streamClusterRoles(
        (chunk) => send(chunk),
        (err) => {
          const error = err as { statusCode?: number; body?: { message?: string }; message?: string };
          fastify.log.error({ err }, 'clusterrole watch error');
          reply.raw.write('event: error\n');
          const errorMessage = error.statusCode === 401
            ? 'Authentication failed. Please check your Kubernetes credentials.'
            : error.message ?? 'unknown error';
          reply.raw.write(`data: ${JSON.stringify({ message: errorMessage, statusCode: error.statusCode })}\n\n`);
        },
        abortController.signal
      )
      .catch((error) => {
        const err = error as { statusCode?: number; body?: { message?: string }; message?: string };
        fastify.log.error({ error }, 'failed to start clusterrole watch');
        reply.raw.write('event: error\n');
        const errorMessage = err.statusCode === 401
          ? 'Authentication failed. Please check your Kubernetes credentials.'
          : err.message ?? 'unknown error';
        reply.raw.write(`data: ${JSON.stringify({ message: errorMessage, statusCode: err.statusCode })}\n\n`);
        return () => undefined;
      });

    request.raw.on('close', () => {
      clearInterval(heartbeatInterval);
      abortController.abort();
      teardown?.();
    });

    return reply;
  });

  fastify.get('/nodeclasses', async (request, reply) => {
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      Connection: 'keep-alive',
      'Cache-Control': 'no-cache'
    });

    const send = (data: string) => {
      reply.raw.write(`data: ${data}\n\n`);
    };

    const sendHeartbeat = () => {
      reply.raw.write('event: heartbeat\n');
      reply.raw.write(`data: {"ts": ${Date.now()} }\n\n`);
    };

    const heartbeatInterval = setInterval(sendHeartbeat, 25000);

    const abortController = new AbortController();
    const teardown = await kube
      .streamNodeClasses(
        (chunk) => send(chunk),
        (err) => {
          const error = err as { statusCode?: number; body?: { message?: string }; message?: string };
          fastify.log.error({ err }, 'nodeclass watch error');
          reply.raw.write('event: error\n');
          const errorMessage = error.statusCode === 401
            ? 'Authentication failed. Please check your Kubernetes credentials.'
            : error.message ?? 'unknown error';
          reply.raw.write(`data: ${JSON.stringify({ message: errorMessage, statusCode: error.statusCode })}\n\n`);
        },
        abortController.signal
      )
      .catch((error) => {
        const err = error as { statusCode?: number; body?: { message?: string }; message?: string };
        fastify.log.error({ error }, 'failed to start nodeclass watch');
        reply.raw.write('event: error\n');
        const errorMessage = err.statusCode === 401
          ? 'Authentication failed. Please check your Kubernetes credentials.'
          : err.message ?? 'unknown error';
        reply.raw.write(`data: ${JSON.stringify({ message: errorMessage, statusCode: err.statusCode })}\n\n`);
        return () => undefined;
      });

    request.raw.on('close', () => {
      clearInterval(heartbeatInterval);
      abortController.abort();
      teardown?.();
    });

    return reply;
  });

  fastify.get('/nodepools', async (request, reply) => {
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      Connection: 'keep-alive',
      'Cache-Control': 'no-cache'
    });

    const send = (data: string) => {
      reply.raw.write(`data: ${data}\n\n`);
    };

    const sendHeartbeat = () => {
      reply.raw.write('event: heartbeat\n');
      reply.raw.write(`data: {"ts": ${Date.now()} }\n\n`);
    };

    const heartbeatInterval = setInterval(sendHeartbeat, 25000);

    const abortController = new AbortController();
    const teardown = await kube
      .streamNodePools(
        (chunk) => send(chunk),
        (err) => {
          const error = err as { statusCode?: number; body?: { message?: string }; message?: string };
          fastify.log.error({ err }, 'nodepool watch error');
          reply.raw.write('event: error\n');
          const errorMessage = error.statusCode === 401
            ? 'Authentication failed. Please check your Kubernetes credentials.'
            : error.message ?? 'unknown error';
          reply.raw.write(`data: ${JSON.stringify({ message: errorMessage, statusCode: error.statusCode })}\n\n`);
        },
        abortController.signal
      )
      .catch((error) => {
        const err = error as { statusCode?: number; body?: { message?: string }; message?: string };
        fastify.log.error({ error }, 'failed to start nodepool watch');
        reply.raw.write('event: error\n');
        const errorMessage = err.statusCode === 401
          ? 'Authentication failed. Please check your Kubernetes credentials.'
          : err.message ?? 'unknown error';
        reply.raw.write(`data: ${JSON.stringify({ message: errorMessage, statusCode: err.statusCode })}\n\n`);
        return () => undefined;
      });

    request.raw.on('close', () => {
      clearInterval(heartbeatInterval);
      abortController.abort();
      teardown?.();
    });

    return reply;
  });

  fastify.get<{
    Querystring: { namespace?: string };
  }>('/persistentvolumeclaims', async (request, reply) => {
    const namespace = request.query.namespace ?? 'default';
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      Connection: 'keep-alive',
      'Cache-Control': 'no-cache'
    });

    const send = (data: string) => {
      reply.raw.write(`data: ${data}\n\n`);
    };

    const sendHeartbeat = () => {
      reply.raw.write('event: heartbeat\n');
      reply.raw.write(`data: {"ts": ${Date.now()} }\n\n`);
    };

    const heartbeatInterval = setInterval(sendHeartbeat, 25000);

    const abortController = new AbortController();
    const teardown = await kube
      .streamPersistentVolumeClaims(
        namespace,
        (chunk) => send(chunk),
        (err) => {
          const error = err as { statusCode?: number; body?: { message?: string }; message?: string };
          fastify.log.error({ err }, 'pvc watch error');
          reply.raw.write('event: error\n');
          const errorMessage = error.statusCode === 401
            ? 'Authentication failed. Please check your Kubernetes credentials.'
            : error.message ?? 'unknown error';
          reply.raw.write(`data: ${JSON.stringify({ message: errorMessage, statusCode: error.statusCode })}\n\n`);
        },
        abortController.signal
      )
      .catch((error) => {
        const err = error as { statusCode?: number; body?: { message?: string }; message?: string };
        fastify.log.error({ error }, 'failed to start pvc watch');
        reply.raw.write('event: error\n');
        const errorMessage = err.statusCode === 401
          ? 'Authentication failed. Please check your Kubernetes credentials.'
          : err.message ?? 'unknown error';
        reply.raw.write(`data: ${JSON.stringify({ message: errorMessage, statusCode: err.statusCode })}\n\n`);
        return () => undefined;
      });

    request.raw.on('close', () => {
      clearInterval(heartbeatInterval);
      abortController.abort();
      teardown?.();
    });

    return reply;
  });

  fastify.get<{
    Querystring: { namespace?: string };
  }>('/scaledobjects', async (request, reply) => {
    const namespace = request.query.namespace ?? 'default';
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      Connection: 'keep-alive',
      'Cache-Control': 'no-cache'
    });

    const send = (data: string) => {
      reply.raw.write(`data: ${data}\\n\\n`);
    };

    const sendHeartbeat = () => {
      reply.raw.write('event: heartbeat\\n');
      reply.raw.write(`data: {"ts": ${Date.now()} }\\n\\n`);
    };

    const heartbeatInterval = setInterval(sendHeartbeat, 25000);

    const abortController = new AbortController();
    const teardown = await kube
      .streamScaledObjects(
        namespace,
        (chunk) => send(chunk),
        (err) => {
          const error = err as { statusCode?: number; body?: { message?: string }; message?: string };
          fastify.log.error({ err }, 'scaledobject watch error');
          reply.raw.write('event: error\\n');
          const errorMessage = error.statusCode === 401
            ? 'Authentication failed. Please check your Kubernetes credentials.'
            : error.message ?? 'unknown error';
          reply.raw.write(`data: ${JSON.stringify({ message: errorMessage, statusCode: error.statusCode })}\\n\\n`);
        },
        abortController.signal
      )
      .catch((error) => {
        const err = error as { statusCode?: number; body?: { message?: string }; message?: string };
        fastify.log.error({ error }, 'failed to start scaledobject watch');
        reply.raw.write('event: error\\n');
        const errorMessage = err.statusCode === 401
          ? 'Authentication failed. Please check your Kubernetes credentials.'
          : err.message ?? 'unknown error';
        reply.raw.write(`data: ${JSON.stringify({ message: errorMessage, statusCode: err.statusCode })}\\n\\n`);
        return () => undefined;
      });

    request.raw.on('close', () => {
      clearInterval(heartbeatInterval);
      abortController.abort();
      teardown?.();
    });

    // keep the stream open
    return reply;
  });

  fastify.get('/namespaces', async (request, reply) => {
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      Connection: 'keep-alive',
      'Cache-Control': 'no-cache'
    });

    const send = (data: string) => {
      reply.raw.write(`data: ${data}\n\n`);
    };

    const sendHeartbeat = () => {
      reply.raw.write('event: heartbeat\n');
      reply.raw.write(`data: {"ts": ${Date.now()} }\n\n`);
    };

    const heartbeatInterval = setInterval(sendHeartbeat, 25000);

    const abortController = new AbortController();
    const teardown = await kube
      .streamNamespaceNames(
        (chunk) => send(chunk),
        (err) => {
          const error = err as { statusCode?: number; body?: { message?: string }; message?: string };
          fastify.log.error({ err }, 'namespace watch error');
          reply.raw.write('event: error\n');
          const errorMessage = error.statusCode === 401
            ? 'Authentication failed. Please check your Kubernetes credentials.'
            : error.message ?? 'unknown error';
          reply.raw.write(`data: ${JSON.stringify({ message: errorMessage, statusCode: error.statusCode })}\n\n`);
        },
        abortController.signal
      )
      .catch((error) => {
        const err = error as { statusCode?: number; body?: { message?: string }; message?: string };
        fastify.log.error({ error }, 'failed to start namespace watch');
        reply.raw.write('event: error\n');
        const errorMessage = err.statusCode === 401
          ? 'Authentication failed. Please check your Kubernetes credentials.'
          : err.message ?? 'unknown error';
        reply.raw.write(`data: ${JSON.stringify({ message: errorMessage, statusCode: err.statusCode })}\n\n`);
        return () => undefined;
      });

    request.raw.on('close', () => {
      clearInterval(heartbeatInterval);
      abortController.abort();
      teardown?.();
    });

    return reply;
  });

  fastify.get('/namespaces/full', async (request, reply) => {
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      Connection: 'keep-alive',
      'Cache-Control': 'no-cache'
    });

    const send = (data: string) => {
      reply.raw.write(`data: ${data}\n\n`);
    };

    const sendHeartbeat = () => {
      reply.raw.write('event: heartbeat\n');
      reply.raw.write(`data: {"ts": ${Date.now()} }\n\n`);
    };

    const heartbeatInterval = setInterval(sendHeartbeat, 25000);

    const abortController = new AbortController();
    const teardown = await kube
      .streamNamespaces(
        (chunk) => send(chunk),
        (err) => {
          const error = err as { statusCode?: number; body?: { message?: string }; message?: string };
          fastify.log.error({ err }, 'namespace watch error');
          reply.raw.write('event: error\n');
          const errorMessage = error.statusCode === 401
            ? 'Authentication failed. Please check your Kubernetes credentials.'
            : error.message ?? 'unknown error';
          reply.raw.write(`data: ${JSON.stringify({ message: errorMessage, statusCode: error.statusCode })}\n\n`);
        },
        abortController.signal
      )
      .catch((error) => {
        const err = error as { statusCode?: number; body?: { message?: string }; message?: string };
        fastify.log.error({ error }, 'failed to start namespace watch');
        reply.raw.write('event: error\n');
        const errorMessage = err.statusCode === 401
          ? 'Authentication failed. Please check your Kubernetes credentials.'
          : err.message ?? 'unknown error';
        reply.raw.write(`data: ${JSON.stringify({ message: errorMessage, statusCode: err.statusCode })}\n\n`);
        return () => undefined;
      });

    request.raw.on('close', () => {
      clearInterval(heartbeatInterval);
      abortController.abort();
      teardown?.();
    });

    return reply;
  });
};

export default eventsPlugin;
