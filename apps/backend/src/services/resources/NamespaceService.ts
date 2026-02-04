// ABOUTME: Service for Namespace resource operations
// ABOUTME: Handles list, get, delete, stream, events, and manifest operations

import { V1Namespace, V1Pod, CoreV1Event } from "@kubernetes/client-node";
import { BaseKubeService } from "../base/BaseKubeService.js";
import type {
	NamespaceDetail,
	NamespaceEvent,
	NamespaceListItem,
} from "./NamespaceService.types.js";

type ResourceUsage = {
	cpu?: string;
	memory?: string;
};

export class NamespaceService extends BaseKubeService {
	async listNamespaces(): Promise<NamespaceListItem[]> {
		return this.withCredentialRetry(async () => {
			const [namespaceList, podList] = await Promise.all([
				this.coreApi.listNamespace(),
				this.coreApi.listPodForAllNamespaces(),
			]);
			const namespaces = namespaceList.items ?? [];
			const pods = podList.items ?? [];

			const namespaceMetrics = new Map<
				string,
				{
					namespace: V1Namespace;
					podCount: number;
					cpuRequests: number;
					memoryRequests: number;
					cpuUsage: number;
					memoryUsage: number;
				}
			>();

			for (const ns of namespaces) {
				const name = ns.metadata?.name;
				if (name) {
					namespaceMetrics.set(name, {
						namespace: ns,
						podCount: 0,
						cpuRequests: 0,
						memoryRequests: 0,
						cpuUsage: 0,
						memoryUsage: 0,
					});
				}
			}

			for (const pod of pods) {
				const namespace = pod.metadata?.namespace ?? "default";
				if (!namespaceMetrics.has(namespace)) {
					continue;
				}

				const metrics = namespaceMetrics.get(namespace)!;
				metrics.podCount += 1;

				const totals = this.calculatePodRequestTotals(pod);
				metrics.cpuRequests += totals.cpuMillicores;
				metrics.memoryRequests += totals.memoryBytes;
			}

			const allNamespaceUsage = await Promise.all(
				Array.from(namespaceMetrics.keys()).map(async (namespace) => {
					try {
						const usageByPod = await this.loadPodMetrics(namespace);
						return { namespace, usageByPod };
					} catch {
						return {
							namespace,
							usageByPod: new Map<string, ResourceUsage>(),
						};
					}
				}),
			);

			for (const { namespace, usageByPod } of allNamespaceUsage) {
				const metrics = namespaceMetrics.get(namespace);
				if (!metrics) continue;

				for (const usage of usageByPod.values()) {
					if (usage.cpu) {
						metrics.cpuUsage += this.parseCpuQuantity(usage.cpu);
					}
					if (usage.memory) {
						metrics.memoryUsage += this.parseMemoryQuantity(usage.memory);
					}
				}
			}

			return Array.from(namespaceMetrics.entries())
				.map(([name, metrics]) =>
					this.mapNamespaceListItem(metrics.namespace, {
						podCount: metrics.podCount,
						cpuRequests: metrics.cpuRequests,
						cpuUsage: metrics.cpuUsage,
						memoryRequests: metrics.memoryRequests,
						memoryUsage: metrics.memoryUsage,
					}),
				)
				.sort((a, b) => {
					const aTotal =
						(namespaceMetrics.get(a.name)?.cpuRequests ?? 0) +
						(namespaceMetrics.get(a.name)?.memoryRequests ?? 0);
					const bTotal =
						(namespaceMetrics.get(b.name)?.cpuRequests ?? 0) +
						(namespaceMetrics.get(b.name)?.memoryRequests ?? 0);
					return bTotal - aTotal;
				});
		});
	}

	async getNamespace(name: string): Promise<NamespaceDetail> {
		return this.withCredentialRetry(async () => {
			const ns = await this.coreApi.readNamespace({ name });
			const listItem = await this.getNamespaceWithMetrics(name, ns);
			return this.mapNamespaceDetail(ns, listItem);
		});
	}

	async getNamespaceManifest(name: string): Promise<string> {
		return this.withCredentialRetry(async () => {
			const ns = await this.coreApi.readNamespace({ name });
			const manifest = this.sanitizeManifest(ns);
			return JSON.stringify(manifest, null, 2);
		});
	}

	async getNamespaceEvents(
		name: string,
		limit: number = 100,
	): Promise<NamespaceEvent[]> {
		return this.withCredentialRetry(async () => {
			const eventList = await this.coreApi.listNamespacedEvent({ namespace: name });
			const events = eventList.items ?? [];

			return events
				.map((event: CoreV1Event) => this.mapNamespaceEvent(event))
				.sort((a, b) => {
					const aTime = a.lastTimestamp
						? new Date(a.lastTimestamp).getTime()
						: 0;
					const bTime = b.lastTimestamp
						? new Date(b.lastTimestamp).getTime()
						: 0;
					return bTime - aTime;
				})
				.slice(0, limit);
		});
	}

	async deleteNamespace(name: string): Promise<void> {
		return this.withCredentialRetry(async () => {
			await this.coreApi.deleteNamespace({ name });
		});
	}

	async streamNamespaces(
		onData: (data: string) => void,
		onError: (err: unknown) => void,
		signal?: AbortSignal,
	) {
		const abortController = new AbortController();
		if (signal) {
			const handleAbort = () => abortController.abort(signal.reason);
			signal.addEventListener("abort", handleAbort, { once: true });
			abortController.signal.addEventListener("abort", () => {
				signal.removeEventListener("abort", handleAbort);
			});
		}

		let requestController: AbortController;

		const startWatch = async (
			retryOnAuth: boolean = true,
		): Promise<AbortController> => {
			try {
				return await this.watch.watch(
					"/api/v1/namespaces",
					{},
					(type, obj) => {
						try {
							const ns = obj as V1Namespace;
							onData(
								JSON.stringify({
									type,
									object: this.mapNamespaceListItemBasic(ns),
								}),
							);
						} catch (err) {
							onError(err);
						}
					},
					(err) => {
						if (err && abortController.signal.aborted === false) {
							onError(err);
						}
					},
				);
			} catch (error) {
				const err = error as { statusCode?: number };
				if (err.statusCode === 401 && retryOnAuth) {
					this.refreshCredentials();
					return await startWatch(false);
				}
				throw error;
			}
		};

		try {
			requestController = await startWatch();
		} catch (error) {
			onError(error);
			abortController.abort();
			throw error;
		}

		abortController.signal.addEventListener("abort", () => {
			requestController.abort();
		});

		return () => {
			abortController.abort();
		};
	}

	private async getNamespaceWithMetrics(
		name: string,
		ns: V1Namespace,
	): Promise<NamespaceListItem> {
		const podList = await this.coreApi.listNamespacedPod({ namespace: name });
		const pods = podList.items ?? [];

		let podCount = 0;
		let cpuRequests = 0;
		let memoryRequests = 0;

		for (const pod of pods) {
			podCount += 1;
			const totals = this.calculatePodRequestTotals(pod);
			cpuRequests += totals.cpuMillicores;
			memoryRequests += totals.memoryBytes;
		}

		let cpuUsage = 0;
		let memoryUsage = 0;
		try {
			const usageByPod = await this.loadPodMetrics(name);
			for (const usage of usageByPod.values()) {
				if (usage.cpu) {
					cpuUsage += this.parseCpuQuantity(usage.cpu);
				}
				if (usage.memory) {
					memoryUsage += this.parseMemoryQuantity(usage.memory);
				}
			}
		} catch {
			// Metrics may not be available
		}

		return this.mapNamespaceListItem(ns, {
			podCount,
			cpuRequests,
			cpuUsage,
			memoryRequests,
			memoryUsage,
		});
	}

	private async loadPodMetrics(
		namespace: string,
	): Promise<Map<string, ResourceUsage>> {
		try {
			const response = await this.customObjectsApi.listNamespacedCustomObject({
				group: "metrics.k8s.io",
				version: "v1beta1",
				namespace,
				plural: "pods",
			});

			const list = response as unknown as {
				items?: Array<{
					metadata?: { name?: string | null };
					containers?: Array<{
						usage?: { cpu?: string | null; memory?: string | null } | null;
					} | null>;
				}>;
			};

			const usageByPod = new Map<string, ResourceUsage>();

			for (const item of list.items ?? []) {
				const podName = item?.metadata?.name ?? undefined;
				if (!podName) continue;

				let totalCpuMillicores = 0;
				let totalMemoryBytes = 0;

				for (const container of item?.containers ?? []) {
					totalCpuMillicores += this.parseCpuQuantity(
						container?.usage?.cpu ?? undefined,
					);
					totalMemoryBytes += this.parseMemoryQuantity(
						container?.usage?.memory ?? undefined,
					);
				}

				usageByPod.set(podName, {
					cpu:
						totalCpuMillicores > 0
							? this.formatCpuQuantity(totalCpuMillicores)
							: undefined,
					memory:
						totalMemoryBytes > 0
							? this.formatMemoryQuantity(totalMemoryBytes)
							: undefined,
				});
			}

			return usageByPod;
		} catch (error) {
			const err = error as { statusCode?: number };
			if (err.statusCode === 401) {
				throw error;
			}
			return new Map();
		}
	}

	private calculatePodRequestTotals(pod: V1Pod): {
		cpuMillicores: number;
		memoryBytes: number;
	} {
		let cpuMillicores = 0;
		let memoryBytes = 0;

		for (const container of pod.spec?.containers ?? []) {
			const requests = container.resources?.requests;
			if (requests) {
				if (requests.cpu) {
					cpuMillicores += this.parseCpuQuantity(requests.cpu);
				}
				if (requests.memory) {
					memoryBytes += this.parseMemoryQuantity(requests.memory);
				}
			}
		}

		for (const container of pod.spec?.initContainers ?? []) {
			const requests = container.resources?.requests;
			if (requests) {
				if (requests.cpu) {
					cpuMillicores = Math.max(cpuMillicores, this.parseCpuQuantity(requests.cpu));
				}
				if (requests.memory) {
					memoryBytes = Math.max(memoryBytes, this.parseMemoryQuantity(requests.memory));
				}
			}
		}

		return { cpuMillicores, memoryBytes };
	}

	private mapNamespaceListItemBasic(ns: V1Namespace): NamespaceListItem {
		const creationTimestamp = ns.metadata?.creationTimestamp
			? new Date(ns.metadata.creationTimestamp).toISOString()
			: undefined;

		return {
			name: ns.metadata?.name ?? "unknown",
			status: ns.status?.phase ?? "Unknown",
			labels: ns.metadata?.labels ?? {},
			creationTimestamp,
			podCount: 0,
		};
	}

	private mapNamespaceListItem(
		ns: V1Namespace,
		metrics: {
			podCount: number;
			cpuRequests: number;
			cpuUsage: number;
			memoryRequests: number;
			memoryUsage: number;
		},
	): NamespaceListItem {
		const creationTimestamp = ns.metadata?.creationTimestamp
			? new Date(ns.metadata.creationTimestamp).toISOString()
			: undefined;

		return {
			name: ns.metadata?.name ?? "unknown",
			status: ns.status?.phase ?? "Unknown",
			labels: ns.metadata?.labels ?? {},
			creationTimestamp,
			podCount: metrics.podCount,
			cpuRequests:
				metrics.cpuRequests > 0
					? this.formatCpuQuantity(metrics.cpuRequests)
					: undefined,
			cpuUsage:
				metrics.cpuUsage > 0
					? this.formatCpuQuantity(metrics.cpuUsage)
					: undefined,
			cpuUsageUtilization:
				metrics.cpuRequests > 0
					? metrics.cpuUsage / metrics.cpuRequests
					: undefined,
			memoryRequests:
				metrics.memoryRequests > 0
					? this.formatMemoryQuantity(metrics.memoryRequests)
					: undefined,
			memoryUsage:
				metrics.memoryUsage > 0
					? this.formatMemoryQuantity(metrics.memoryUsage)
					: undefined,
			memoryUsageUtilization:
				metrics.memoryRequests > 0
					? metrics.memoryUsage / metrics.memoryRequests
					: undefined,
		};
	}

	private mapNamespaceDetail(
		ns: V1Namespace,
		listItem: NamespaceListItem,
	): NamespaceDetail {
		return {
			...listItem,
			annotations: ns.metadata?.annotations ?? {},
			finalizers: ns.spec?.finalizers ?? [],
		};
	}

	private mapNamespaceEvent(event: CoreV1Event): NamespaceEvent {
		return {
			type: event.type ?? "Unknown",
			reason: event.reason ?? "",
			message: event.message ?? "",
			count: event.count,
			firstTimestamp: event.firstTimestamp
				? new Date(event.firstTimestamp).toISOString()
				: undefined,
			lastTimestamp: event.lastTimestamp
				? new Date(event.lastTimestamp).toISOString()
				: undefined,
			source: event.source?.component,
			involvedObject: {
				kind: event.involvedObject?.kind ?? "Unknown",
				name: event.involvedObject?.name ?? "unknown",
			},
		};
	}
}
