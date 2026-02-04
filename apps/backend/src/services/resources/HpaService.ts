// ABOUTME: Service for HorizontalPodAutoscaler resource operations
// ABOUTME: Handles list, get, delete, stream, and manifest operations for Kubernetes HPA resources

import {
	CoreV1Event,
	ObservableMiddleware,
	RequestContext,
	ResponseContext,
	V2HorizontalPodAutoscaler,
} from "@kubernetes/client-node";
import { BaseKubeService } from "../base/BaseKubeService.js";
import type {
	HpaBehavior,
	HpaDetail,
	HpaEvent,
	HpaListItem,
	HpaMetricValue,
	HpaScalingRules,
} from "./HpaService.types.js";

const of = <T>(value: T) =>
	({
		promise: () => Promise.resolve(value),
		toPromise: () => Promise.resolve(value),
		pipe: () => of(value),
	}) as any;

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

	async patchHpaMinReplicas(
		namespace: string,
		hpaName: string,
		minReplicas: number,
	): Promise<void> {
		const setHeaderMiddleware = (
			key: string,
			value: string,
		): ObservableMiddleware => ({
			pre: (request: RequestContext) => {
				request.setHeaderParam(key, value);
				return of(request);
			},
			post: (response: ResponseContext) => of(response),
		});

		return this.withCredentialRetry(async () => {
			await this.autoscalingApi.patchNamespacedHorizontalPodAutoscaler(
				{
					name: hpaName,
					namespace,
					body: {
						spec: {
							minReplicas,
						},
					},
				},
				{
					middleware: [
						setHeaderMiddleware("Content-Type", "application/merge-patch+json"),
					],
					middlewareMergeStrategy: "append",
				},
			);
		});
	}

	async getHpaEvents(namespace: string, hpaName: string): Promise<HpaEvent[]> {
		return this.withCredentialRetry(async () => {
			const events = await this.coreApi.listNamespacedEvent({
				namespace,
				fieldSelector: `involvedObject.name=${hpaName},involvedObject.kind=HorizontalPodAutoscaler`,
			});

			return (events.items ?? [])
				.map((event: CoreV1Event) => ({
					type: event.type ?? "",
					reason: event.reason ?? "",
					message: event.message ?? "",
					count: event.count,
					firstTimestamp: event.firstTimestamp?.toISOString(),
					lastTimestamp: event.lastTimestamp?.toISOString(),
					source: event.source?.component ?? event.reportingComponent,
				}))
				.sort((a, b) => {
					const aTime = a.lastTimestamp ?? a.firstTimestamp ?? "";
					const bTime = b.lastTimestamp ?? b.firstTimestamp ?? "";
					return bTime.localeCompare(aTime);
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

		const currentCpuMetric = hpa.status?.currentMetrics?.find(
			(m) => m.type === "Resource" && m.resource?.name === "cpu",
		);
		const currentMemoryMetric = hpa.status?.currentMetrics?.find(
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
			targetMemoryUtilization:
				memoryMetric?.resource?.target?.averageUtilization,
			currentCPUUtilization:
				currentCpuMetric?.resource?.current?.averageUtilization,
			currentMemoryUtilization:
				currentMemoryMetric?.resource?.current?.averageUtilization,
			creationTimestamp,
		};
	}

	private mapHpaDetail(hpa: V2HorizontalPodAutoscaler): HpaDetail {
		const listItem = this.mapHpaListItem(hpa);

		const currentMetrics = this.mapCurrentMetrics(hpa);
		const behavior = this.mapBehavior(hpa);

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
			currentMetrics,
			lastScaleTime: hpa.status?.lastScaleTime
				? new Date(hpa.status.lastScaleTime).toISOString()
				: undefined,
			behavior,
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

	private mapCurrentMetrics(hpa: V2HorizontalPodAutoscaler): HpaMetricValue[] {
		const result: HpaMetricValue[] = [];
		const specMetrics = hpa.spec?.metrics ?? [];
		const statusMetrics = hpa.status?.currentMetrics ?? [];

		for (const specMetric of specMetrics) {
			const statusMetric = statusMetrics.find((sm) => {
				if (sm.type !== specMetric.type) return false;
				if (sm.type === "Resource") {
					return sm.resource?.name === specMetric.resource?.name;
				}
				if (sm.type === "External") {
					return (
						sm.external?.metric?.name === specMetric.external?.metric?.name
					);
				}
				if (sm.type === "Pods") {
					return sm.pods?.metric?.name === specMetric.pods?.metric?.name;
				}
				if (sm.type === "Object") {
					return sm.object?.metric?.name === specMetric.object?.metric?.name;
				}
				return false;
			});

			if (specMetric.type === "Resource" && specMetric.resource) {
				result.push({
					type: "Resource",
					name: specMetric.resource.name,
					targetAverageUtilization:
						specMetric.resource.target?.averageUtilization,
					targetAverageValue: specMetric.resource.target?.averageValue,
					targetValue: specMetric.resource.target?.value,
					currentAverageUtilization:
						statusMetric?.resource?.current?.averageUtilization,
					currentAverageValue: statusMetric?.resource?.current?.averageValue,
					currentValue: statusMetric?.resource?.current?.value,
				});
			} else if (specMetric.type === "External" && specMetric.external) {
				result.push({
					type: "External",
					name: specMetric.external.metric?.name ?? "unknown",
					targetValue: specMetric.external.target?.value,
					targetAverageValue: specMetric.external.target?.averageValue,
					currentValue: statusMetric?.external?.current?.value,
					currentAverageValue: statusMetric?.external?.current?.averageValue,
				});
			} else if (specMetric.type === "Pods" && specMetric.pods) {
				result.push({
					type: "Pods",
					name: specMetric.pods.metric?.name ?? "unknown",
					targetAverageValue: specMetric.pods.target?.averageValue,
					currentAverageValue: statusMetric?.pods?.current?.averageValue,
				});
			} else if (specMetric.type === "Object" && specMetric.object) {
				result.push({
					type: "Object",
					name: specMetric.object.metric?.name ?? "unknown",
					targetValue: specMetric.object.target?.value,
					targetAverageValue: specMetric.object.target?.averageValue,
					currentValue: statusMetric?.object?.current?.value,
					currentAverageValue: statusMetric?.object?.current?.averageValue,
				});
			}
		}

		return result;
	}

	private mapBehavior(hpa: V2HorizontalPodAutoscaler): HpaBehavior | undefined {
		const behavior = hpa.spec?.behavior;
		if (!behavior) return undefined;

		const mapRules = (
			rules: typeof behavior.scaleDown,
		): HpaScalingRules | undefined => {
			if (!rules) return undefined;
			return {
				stabilizationWindowSeconds: rules.stabilizationWindowSeconds,
				selectPolicy: rules.selectPolicy,
				policies: rules.policies?.map((p) => ({
					type: p.type,
					value: p.value,
					periodSeconds: p.periodSeconds,
				})),
			};
		};

		return {
			scaleUp: mapRules(behavior.scaleUp),
			scaleDown: mapRules(behavior.scaleDown),
		};
	}
}
