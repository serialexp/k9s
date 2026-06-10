// ABOUTME: Service for ReplicaSet resource operations
// ABOUTME: Handles list, get, delete, stream, and manifest operations for namespace-scoped ReplicaSet resources

import { V1ReplicaSet } from "@kubernetes/client-node";
import { BaseKubeService } from "../base/BaseKubeService.js";
import type {
	ReplicaSetDetail,
	ReplicaSetListItem,
} from "./ReplicaSetService.types.js";

export class ReplicaSetService extends BaseKubeService {
	async listReplicaSets(namespace: string): Promise<ReplicaSetListItem[]> {
		return this.withCredentialRetry(async () => {
			const response = await this.appsApi.listNamespacedReplicaSet({
				namespace,
			});
			return (response.items ?? []).map((rs: V1ReplicaSet) =>
				this.mapReplicaSetListItem(rs),
			);
		});
	}

	async getReplicaSet(
		namespace: string,
		name: string,
	): Promise<ReplicaSetDetail> {
		return this.withCredentialRetry(async () => {
			const rs = await this.appsApi.readNamespacedReplicaSet({
				name,
				namespace,
			});
			return this.mapReplicaSetDetail(rs);
		});
	}

	async getReplicaSetManifest(
		namespace: string,
		name: string,
	): Promise<string> {
		return this.withCredentialRetry(async () => {
			const rs = await this.appsApi.readNamespacedReplicaSet({
				name,
				namespace,
			});
			const manifest = this.sanitizeManifest(rs);
			return JSON.stringify(manifest, null, 2);
		});
	}

	async deleteReplicaSet(namespace: string, name: string): Promise<void> {
		return this.withCredentialRetry(async () => {
			await this.appsApi.deleteNamespacedReplicaSet({ name, namespace });
		});
	}

	async streamReplicaSets(
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
					`/apis/apps/v1/namespaces/${namespace}/replicasets`,
					{},
					(type, obj) => {
						try {
							onData(
								JSON.stringify({
									type,
									object: this.mapReplicaSetListItem(
										obj as V1ReplicaSet,
									),
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

	private mapReplicaSetListItem(rs: V1ReplicaSet): ReplicaSetListItem {
		const creationTimestamp = rs.metadata?.creationTimestamp
			? new Date(rs.metadata.creationTimestamp).toISOString()
			: undefined;

		const ownerRef = rs.metadata?.ownerReferences?.find(
			(ref) => ref.controller === true,
		);

		const images = (rs.spec?.template?.spec?.containers ?? []).map(
			(c) => c.image ?? "unknown",
		);

		return {
			name: rs.metadata?.name ?? "unknown",
			namespace: rs.metadata?.namespace ?? "default",
			desiredReplicas: rs.spec?.replicas ?? 0,
			readyReplicas: rs.status?.readyReplicas ?? 0,
			availableReplicas: rs.status?.availableReplicas ?? 0,
			ownerReference: ownerRef
				? `${ownerRef.kind}/${ownerRef.name}`
				: undefined,
			images,
			creationTimestamp,
		};
	}

	private mapReplicaSetDetail(rs: V1ReplicaSet): ReplicaSetDetail {
		const listItem = this.mapReplicaSetListItem(rs);
		return {
			...listItem,
			labels: rs.metadata?.labels ?? {},
			annotations: rs.metadata?.annotations ?? {},
			selector: rs.spec?.selector?.matchLabels ?? {},
			conditions: (rs.status?.conditions ?? []).map((c) => ({
				type: c.type ?? "unknown",
				status: c.status ?? "Unknown",
				lastTransitionTime: c.lastTransitionTime
					? new Date(c.lastTransitionTime).toISOString()
					: undefined,
				reason: c.reason,
				message: c.message,
			})),
		};
	}
}
