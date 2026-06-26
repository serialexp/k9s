import { FastifyPluginAsync } from 'fastify';
import { KubeService } from '../services/kube.js';

export interface LogsPluginOptions {
  kube: KubeService;
}

export const logsPlugin: FastifyPluginAsync<LogsPluginOptions> = async (fastify, opts) => {
  const { kube } = opts;

  fastify.get<{
    Params: { namespace: string; pod: string; container: string };
    Querystring: { follow?: string; tailLines?: string; previous?: string };
  }>('/namespaces/:namespace/pods/:pod/containers/:container/logs', async (request, reply) => {
    const { namespace, pod, container } = request.params;
    const follow = request.query.follow !== 'false';
    const tailLines = request.query.tailLines ? Number(request.query.tailLines) : 200;
    const previous = request.query.previous === 'true';

    reply.raw.writeHead(200, {
      'Content-Type': 'text/plain; charset=utf-8',
      Connection: 'keep-alive',
      'Cache-Control': 'no-cache',
      // Written straight to the raw socket, so @fastify/cors (origin: true) is
      // bypassed — reflect the origin or the desktop webview can't read logs.
      'Access-Control-Allow-Origin': request.headers.origin ?? '*',
      Vary: 'Origin'
    });

    // Follow streams may produce no bytes for a long time (quiet pod). Flush the
    // headers now so the client's fetch resolves immediately and can show a
    // "connected, waiting" state instead of an indefinite loading spinner.
    reply.raw.flushHeaders();

    const abortController = new AbortController();
    const teardown = kube.streamPodLogs({
      namespace,
      pod,
      container,
      follow,
      tailLines,
      previous,
      signal: abortController.signal,
      onChunk: (chunk) => {
        reply.raw.write(chunk);
      },
      onError: (error) => {
        fastify.log.error({ error }, 'log stream error');
        reply.raw.write(`\n[stream-error] ${(error as Error).message}\n`);
      }
    });

    request.raw.on('close', () => {
      abortController.abort();
      teardown();
    });

    return reply;
  });
};

export default logsPlugin;
