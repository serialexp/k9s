import Fastify from 'fastify';
import cors from '@fastify/cors';
import apiPlugin from './routes/api.js';
import eventsPlugin from './routes/events.js';
import logsPlugin from './routes/logs.js';
import { KubeService } from './services/kube.js';
import { AwsService } from './services/aws.js';

const buildServer = () => {
  const server = Fastify({
    logger: true
  });

  return server;
};

const start = async () => {
  const server = buildServer();
  const kube = new KubeService();
  const aws = new AwsService();
  const port = Number(process.env.PORT ?? 3130);

  await server.register(cors, {
    origin: true
  });

  await server.register(apiPlugin, { prefix: '/api', kube, aws });
  await server.register(eventsPlugin, { prefix: '/events', kube });
  await server.register(logsPlugin, { prefix: '/api', kube });

  const close = async () => {
    await server.close();
    process.exit(0);
  };

  process.on('SIGINT', close);
  process.on('SIGTERM', close);

  try {
    await server.listen({ port, host: '0.0.0.0' });
    server.log.info(`Fastify server listening on http://localhost:${port}`);
  } catch (error) {
    server.log.error(error);
    process.exit(1);
  }
};

void start();
