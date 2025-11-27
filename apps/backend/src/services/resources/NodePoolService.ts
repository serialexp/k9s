// ABOUTME: Service for Karpenter NodePool resource operations
// ABOUTME: Handles list, get, delete, stream, and manifest operations for Karpenter NodePool resources

import { BaseKubeService, type KubernetesListResponse } from "../base/BaseKubeService.js";
import { CRDNotInstalledError } from "../base/errors.js";
import type {
	NodePoolDetail,
	NodePoolListItem,
} from "./NodePoolService.types.js";

export class NodePoolService extends BaseKubeService {
	async listNodePools(): Promise<NodePoolListItem[]> {
		const crdExists = await this.checkCRDExists("nodepools.karpenter.sh");
		if (!crdExists) {
			throw new CRDNotInstalledError(
				"nodepools.karpenter.sh",
				"Karpenter NodePool",
			);
		}

		return this.withCredentialRetry(async () => {
			const response = await this.customObjectsApi.listClusterCustomObject({
				group: "karpenter.sh",
				version: "v1",
				plural: "nodepools",
			});

			const list = response as unknown as KubernetesListResponse;
			return (list.items ?? []).map((item) => this.mapNodePoolListItem(item));
		});
	}

	async getNodePool(name: string): Promise<NodePoolDetail> {
		return this.withCredentialRetry(async () => {
			const response = await this.customObjectsApi.getClusterCustomObject({
				group: "karpenter.sh",
				version: "v1",
				plural: "nodepools",
				name,
			});

			return this.mapNodePoolDetail(response as Record<string, unknown>);
		});
	}

	async getNodePoolManifest(name: string): Promise<string> {
		return this.withCredentialRetry(async () => {
			const response = await this.customObjectsApi.getClusterCustomObject({
				group: "karpenter.sh",
				version: "v1",
				plural: "nodepools",
				name,
			});
			const manifest = this.sanitizeManifest(response);
			return JSON.stringify(manifest, null, 2);
		});
	}

	async deleteNodePool(name: string): Promise<void> {
		return this.withCredentialRetry(async () => {
			await this.customObjectsApi.deleteClusterCustomObject({
				group: "karpenter.sh",
				version: "v1",
				plural: "nodepools",
				name,
			});
		});
	}

	async streamNodePools(
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
					"/apis/karpenter.sh/v1/nodepools",
					{},
					(type, obj) => {
						try {
							onData(
								JSON.stringify({
									type,
									object: this.mapNodePoolListItem(obj as Record<string, unknown>),
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

	private mapNodePoolListItem(
		np: Record<string, unknown>,
	): NodePoolListItem {
		const metadata = np.metadata as Record<string, unknown> | undefined;
		const spec = np.spec as Record<string, unknown> | undefined;
		const status = np.status as Record<string, unknown> | undefined;
		const conditions = (status?.conditions as Array<Record<string, unknown>>) ?? [];
		const readyCondition = conditions.find((c) => c.type === "Ready");

		const creationTimestamp = metadata?.creationTimestamp
			? new Date(metadata.creationTimestamp as string).toISOString()
			: undefined;

		return {
			name: (metadata?.name as string) ?? "unknown",
			weight: spec?.weight as number | undefined,
			limits: spec?.limits as Record<string, string> | undefined,
			readyStatus: readyCondition?.status as string | undefined,
			readyMessage: readyCondition?.message as string | undefined,
			creationTimestamp,
		};
	}

	private mapNodePoolDetail(np: Record<string, unknown>): NodePoolDetail {
		const listItem = this.mapNodePoolListItem(np);
		const metadata = np.metadata as Record<string, unknown> | undefined;
		const spec = np.spec as Record<string, unknown> | undefined;
		const template = spec?.template as Record<string, unknown> | undefined;
		const templateMetadata = template?.metadata as Record<string, unknown> | undefined;
		const templateSpec = template?.spec as Record<string, unknown> | undefined;
		const nodeClassRef = templateSpec?.nodeClassRef as Record<string, unknown> | undefined;
		const disruption = spec?.disruption as Record<string, unknown> | undefined;

		return {
			...listItem,
			labels: (metadata?.labels as Record<string, string>) ?? {},
			annotations: (metadata?.annotations as Record<string, string>) ?? {},
			template: {
				metadata: {
					labels: templateMetadata?.labels as Record<string, string> | undefined,
					annotations: templateMetadata?.annotations as Record<string, string> | undefined,
				},
				spec: {
					nodeClassRef: nodeClassRef ? {
						group: nodeClassRef.group as string | undefined,
						kind: nodeClassRef.kind as string | undefined,
						name: nodeClassRef.name as string | undefined,
					} : undefined,
					requirements: templateSpec?.requirements as Array<Record<string, unknown>> | undefined,
					taints: templateSpec?.taints as Array<{
						key?: string;
						value?: string;
						effect?: string;
					}> | undefined,
				},
			},
			disruption: disruption ? {
				consolidationPolicy: disruption.consolidationPolicy as string | undefined,
				consolidateAfter: disruption.consolidateAfter as string | undefined,
				budgets: disruption.budgets as Array<Record<string, unknown>> | undefined,
			} : undefined,
		};
	}
}
