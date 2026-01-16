// ABOUTME: Service for managing TCP port forwards to Kubernetes pods
// ABOUTME: Creates local TCP listeners that tunnel through the K8s API to target pods

import { createServer, type Server, type Socket } from "node:net";
import { PassThrough } from "node:stream";
import { KubeConfig, PortForward } from "@kubernetes/client-node";
import type {
	ActivePortForward,
	PortForwardRequest,
} from "./PortForwardService.types.js";

interface ManagedForward {
	id: string;
	namespace: string;
	pod: string;
	localPort: number;
	targetPort: number;
	startedAt: Date;
	server: Server;
	connections: Set<Socket>;
}

export class PortForwardService {
	private kubeConfig: KubeConfig;
	private portForwarder: PortForward;
	private activeForwards: Map<string, ManagedForward> = new Map();
	private idCounter = 0;

	constructor(kubeConfig: KubeConfig) {
		this.kubeConfig = kubeConfig;
		this.portForwarder = new PortForward(this.kubeConfig, true);
	}

	refreshCredentials() {
		this.portForwarder = new PortForward(this.kubeConfig, true);
	}

	async startPortForward(request: PortForwardRequest): Promise<ActivePortForward> {
		const { namespace, pod, localPort, targetPort } = request;

		if (localPort < 1024 || localPort > 65535) {
			throw new Error(`Local port must be between 1024 and 65535, got ${localPort}`);
		}

		if (targetPort < 1 || targetPort > 65535) {
			throw new Error(`Target port must be between 1 and 65535, got ${targetPort}`);
		}

		for (const forward of this.activeForwards.values()) {
			if (forward.localPort === localPort) {
				throw new Error(`Port ${localPort} is already in use by another forward`);
			}
		}

		const id = `pf-${++this.idCounter}`;
		const connections = new Set<Socket>();

		const server = createServer((socket) => {
			connections.add(socket);

			const input = new PassThrough();
			const output = new PassThrough();

			socket.pipe(input);
			output.pipe(socket);

			this.portForwarder
				.portForward(namespace, pod, [targetPort], output, null, input)
				.then((wsOrFn) => {
					const cleanup = () => {
						connections.delete(socket);
						input.destroy();
						output.destroy();
						if (typeof wsOrFn === "function") {
							const ws = wsOrFn();
							if (ws) {
								ws.close();
							}
						} else if (wsOrFn && "close" in wsOrFn) {
							wsOrFn.close();
						}
					};

					socket.on("close", cleanup);
					socket.on("error", (err) => {
						console.error(`[PortForward ${id}] Socket error:`, err.message);
						cleanup();
					});
				})
				.catch((err) => {
					console.error(`[PortForward ${id}] Failed to establish connection:`, err.message);
					socket.destroy();
					connections.delete(socket);
				});
		});

		return new Promise((resolve, reject) => {
			server.on("error", (err: NodeJS.ErrnoException) => {
				if (err.code === "EADDRINUSE") {
					reject(new Error(`Port ${localPort} is already in use`));
				} else {
					reject(err);
				}
			});

			server.listen(localPort, "127.0.0.1", () => {
				const forward: ManagedForward = {
					id,
					namespace,
					pod,
					localPort,
					targetPort,
					startedAt: new Date(),
					server,
					connections,
				};

				this.activeForwards.set(id, forward);
				console.log(`[PortForward ${id}] Started: ${namespace}/${pod}:${targetPort} → localhost:${localPort}`);
				resolve(this.toActivePortForward(forward));
			});
		});
	}

	stopPortForward(id: string): boolean {
		const forward = this.activeForwards.get(id);
		if (!forward) {
			return false;
		}

		for (const socket of forward.connections) {
			socket.destroy();
		}
		forward.connections.clear();

		forward.server.close();
		this.activeForwards.delete(id);

		console.log(`[PortForward ${id}] Stopped`);
		return true;
	}

	listActiveForwards(): ActivePortForward[] {
		return Array.from(this.activeForwards.values()).map((f) =>
			this.toActivePortForward(f),
		);
	}

	stopAllForwards(): void {
		for (const id of this.activeForwards.keys()) {
			this.stopPortForward(id);
		}
	}

	private toActivePortForward(forward: ManagedForward): ActivePortForward {
		return {
			id: forward.id,
			namespace: forward.namespace,
			pod: forward.pod,
			localPort: forward.localPort,
			targetPort: forward.targetPort,
			startedAt: forward.startedAt.toISOString(),
			connectionCount: forward.connections.size,
		};
	}
}
