// ABOUTME: Service for HorizontalPodAutoscaler resource operations
// ABOUTME: Handles list, get, delete, stream, and manifest operations for Kubernetes HPA resources

import { V2HorizontalPodAutoscaler } from "@kubernetes/client-node";
import { BaseKubeService } from "../base/BaseKubeService.js";
import type { HpaDetail, HpaListItem } from "./HpaService.types.js";

export class HpaService extends BaseKubeService {
	async listHpas(namespace: string): Promise<HpaListItem[]> {
		return this.withCredentialRetry(async () => {
			const hpaList = await this.autoscalingApi.listNamespacedHorizontalPodAutoscaler({
				namespace,
			});
			return (hpaList.items ?? []).map((hpa: V2HorizontalPodAutoscaler) =>
				this.mapHpaListItem(hpa),
			);
		});
	}

	async getHpa(namespace: string, hpaName: string): Promise<HpaDetail> {
		return this.withCredentialRetry(async () => {
			const hpa = await this.autoscalingApi.readNamespacedHorizontalPodAutoscaler({
				name: hpaName,
				namespace,
			});
			return this.mapHpaDetail(hpa);
		});
	}

	async getHpaManifest(namespace: string, hpaName: string): Promise<string> {
		return this.withCredentialRetry(async () => {
			const hpa = await this.autoscalingApi.readNamespacedHorizontalPodAutoscaler({
				name: hpaName,
				namespace,
			});
			const manifest = this.sanitizeManifest(hpa);
			return JSON.stringify(manifest, null, 2);
		});
	}

	async deleteHpa(namespace: string, hpaName: string): Promise<void> {
		return this.withCredentialRetry(async () => {
			await this.autoscalingApi.deleteNamespacedHorizontalPodAutoscaler({
				name: hpaName,
				namespace,
			});
		});
	}

	async streamHpas(
		namespace: string,
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
					`/apis/autoscaling/v2/namespaces/${namespace}/horizontalpodautoscalers`,
					{},
					(type, obj) => {
						try {
							onData(
								JSON.stringify({
									type,
									object: this.mapHpaListItem(obj as V2HorizontalPodAutoscaler),
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

	private mapHpaListItem(hpa: V2HorizontalPodAutoscaler): HpaListItem {
		const creationTimestamp = hpa.metadata?.creationTimestamp
			? new Date(hpa.metadata.creationTimestamp).toISOString()
			: undefined;

		const cpuMetric = hpa.spec?.metrics?.find(
			(m) => m.type === "Resource" && m.resource?.name === "cpu",
		);
		const memoryMetric = hpa.spec?.metrics?.find(
			(m) => m.type === "Resource" && m.resource?.name === "memory",
		);

		return {
			name: hpa.metadata?.name ?? "unknown",
			namespace: hpa.metadata?.namespace ?? "default",
			minReplicas: hpa.spec?.minReplicas,
			maxReplicas: hpa.spec?.maxReplicas ?? 0,
			currentReplicas: hpa.status?.currentReplicas,
			desiredReplicas: hpa.status?.desiredReplicas,
			targetCPUUtilization: cpuMetric?.resource?.target?.averageUtilization,
			targetMemoryUtilization: memoryMetric?.resource?.target?.averageUtilization,
			creationTimestamp,
		};
	}

	private mapHpaDetail(hpa: V2HorizontalPodAutoscaler): HpaDetail {
		const listItem = this.mapHpaListItem(hpa);
		return {
			...listItem,
			labels: hpa.metadata?.labels ?? {},
			annotations: hpa.metadata?.annotations ?? {},
			scaleTargetRef: {
				apiVersion: hpa.spec?.scaleTargetRef.apiVersion,
				kind: hpa.spec?.scaleTargetRef.kind,
				name: hpa.spec?.scaleTargetRef.name,
			},
			metrics: JSON.parse(JSON.stringify(hpa.spec?.metrics ?? [])),
			conditions: hpa.status?.conditions?.map((condition) => ({
				type: condition.type,
				status: condition.status,
				lastTransitionTime: condition.lastTransitionTime
					? new Date(condition.lastTransitionTime).toISOString()
					: undefined,
				reason: condition.reason,
				message: condition.message,
			})),
		};
	}
}
