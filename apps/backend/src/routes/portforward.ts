// ABOUTME: Fastify routes for managing port forwards to Kubernetes pods
// ABOUTME: Provides endpoints to start, stop, and list active port forwards

import { FastifyPluginAsync } from "fastify";
import { KubeService } from "../services/kube.js";

export interface PortForwardPluginOptions {
	kube: KubeService;
}

export const portForwardPlugin: FastifyPluginAsync<PortForwardPluginOptions> = async (
	fastify,
	opts,
) => {
	const { kube } = opts;

	fastify.post<{
		Body: {
			namespace: string;
			pod: string;
			localPort: number;
			targetPort: number;
		};
	}>("/port-forwards", async (request, reply) => {
		const { namespace, pod, localPort, targetPort } = request.body;

		if (!namespace || !pod || !localPort || !targetPort) {
			return reply.status(400).send({
				error: "Missing required fields: namespace, pod, localPort, targetPort",
			});
		}

		try {
			const forward = await kube.startPortForward(
				namespace,
				pod,
				localPort,
				targetPort,
			);
			return reply.status(201).send(forward);
		} catch (error) {
			const message = (error as Error).message;
			if (message.includes("already in use")) {
				return reply.status(409).send({ error: message });
			}
			if (message.includes("must be between")) {
				return reply.status(400).send({ error: message });
			}
			fastify.log.error({ error }, "Failed to start port forward");
			return reply.status(500).send({ error: message });
		}
	});

	fastify.get("/port-forwards", async (_request, reply) => {
		const forwards = kube.listPortForwards();
		return reply.send({ items: forwards });
	});

	fastify.delete<{
		Params: { id: string };
	}>("/port-forwards/:id", async (request, reply) => {
		const { id } = request.params;
		const stopped = kube.stopPortForward(id);

		if (!stopped) {
			return reply.status(404).send({ error: `Port forward ${id} not found` });
		}

		return reply.status(204).send();
	});
};

export default portForwardPlugin;
