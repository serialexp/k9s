// ABOUTME: Service for PodDisruptionBudget resource operations
// ABOUTME: Handles list, get, delete, stream, events, and manifest operations

import { CoreV1Event, V1PodDisruptionBudget } from "@kubernetes/client-node";
import { BaseKubeService } from "../base/BaseKubeService.js";
import type {
	PdbDetail,
	PdbEvent,
	PdbListItem,
} from "./PdbService.types.js";

export class PdbService extends BaseKubeService {
	async listPdbs(namespace: string): Promise<PdbListItem[]> {
		return this.withCredentialRetry(async () => {
			const pdbList = await this.policyApi.listNamespacedPodDisruptionBudget({
				namespace,
			});
			return (pdbList.items ?? []).map((pdb: V1PodDisruptionBudget) =>
				this.mapPdbListItem(pdb),
			);
		});
	}

	async getPdb(namespace: string, pdbName: string): Promise<PdbDetail> {
		return this.withCredentialRetry(async () => {
			const pdb = await this.policyApi.readNamespacedPodDisruptionBudget({
				name: pdbName,
				namespace,
			});
			return this.mapPdbDetail(pdb);
		});
	}

	async getPdbManifest(namespace: string, pdbName: string): Promise<string> {
		return this.withCredentialRetry(async () => {
			const pdb = await this.policyApi.readNamespacedPodDisruptionBudget({
				name: pdbName,
				namespace,
			});
			const manifest = this.sanitizeManifest(pdb);
			return JSON.stringify(manifest, null, 2);
		});
	}

	async deletePdb(namespace: string, pdbName: string): Promise<void> {
		return this.withCredentialRetry(async () => {
			await this.policyApi.deleteNamespacedPodDisruptionBudget({
				name: pdbName,
				namespace,
			});
		});
	}

	async getPdbEvents(namespace: string, pdbName: string): Promise<PdbEvent[]> {
		return this.withCredentialRetry(async () => {
			const events = await this.coreApi.listNamespacedEvent({
				namespace,
				fieldSelector: `involvedObject.name=${pdbName},involvedObject.kind=PodDisruptionBudget`,
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

	async streamPdbs(
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
					`/apis/policy/v1/namespaces/${namespace}/poddisruptionbudgets`,
					{},
					(type, obj) => {
						try {
							onData(
								JSON.stringify({
									type,
									object: this.mapPdbListItem(obj as V1PodDisruptionBudget),
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

	private mapPdbListItem(pdb: V1PodDisruptionBudget): PdbListItem {
		const creationTimestamp = pdb.metadata?.creationTimestamp
			? new Date(pdb.metadata.creationTimestamp).toISOString()
			: undefined;

		return {
			name: pdb.metadata?.name ?? "unknown",
			namespace: pdb.metadata?.namespace ?? "default",
			minAvailable: pdb.spec?.minAvailable?.toString(),
			maxUnavailable: pdb.spec?.maxUnavailable?.toString(),
			currentHealthy: pdb.status?.currentHealthy,
			desiredHealthy: pdb.status?.desiredHealthy,
			disruptionsAllowed: pdb.status?.disruptionsAllowed,
			expectedPods: pdb.status?.expectedPods,
			creationTimestamp,
		};
	}

	private mapPdbDetail(pdb: V1PodDisruptionBudget): PdbDetail {
		const listItem = this.mapPdbListItem(pdb);
		return {
			...listItem,
			labels: pdb.metadata?.labels ?? {},
			annotations: pdb.metadata?.annotations ?? {},
			selector: pdb.spec?.selector?.matchLabels,
			conditions: pdb.status?.conditions?.map((condition) => ({
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
