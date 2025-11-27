// ABOUTME: Service for Karpenter NodeClass resource operations
// ABOUTME: Handles list, get, delete, stream, and manifest operations for EKS NodeClass resources

import { BaseKubeService, type KubernetesListResponse } from "../base/BaseKubeService.js";
import { CRDNotInstalledError } from "../base/errors.js";
import type {
	NodeClassDetail,
	NodeClassListItem,
	NodeClassStatus,
} from "./NodeClassService.types.js";

export class NodeClassService extends BaseKubeService {
	async listNodeClasses(): Promise<NodeClassListItem[]> {
		const crdExists = await this.checkCRDExists("nodeclasses.eks.amazonaws.com");
		if (!crdExists) {
			throw new CRDNotInstalledError(
				"nodeclasses.eks.amazonaws.com",
				"EKS NodeClass",
			);
		}

		return this.withCredentialRetry(async () => {
			const response = await this.customObjectsApi.listClusterCustomObject({
				group: "eks.amazonaws.com",
				version: "v1",
				plural: "nodeclasses",
			});

			const list = response as unknown as KubernetesListResponse;
			return (list.items ?? []).map((item) => this.mapNodeClassListItem(item));
		});
	}

	async getNodeClass(name: string): Promise<NodeClassDetail> {
		return this.withCredentialRetry(async () => {
			const response = await this.customObjectsApi.getClusterCustomObject({
				group: "eks.amazonaws.com",
				version: "v1",
				plural: "nodeclasses",
				name,
			});

			return this.mapNodeClassDetail(response as Record<string, unknown>);
		});
	}

	async getNodeClassManifest(name: string): Promise<string> {
		return this.withCredentialRetry(async () => {
			const response = await this.customObjectsApi.getClusterCustomObject({
				group: "eks.amazonaws.com",
				version: "v1",
				plural: "nodeclasses",
				name,
			});
			const manifest = this.sanitizeManifest(response);
			return JSON.stringify(manifest, null, 2);
		});
	}

	async getNodeClassStatus(name: string): Promise<NodeClassStatus> {
		return this.withCredentialRetry(async () => {
			const response = await this.customObjectsApi.getClusterCustomObject({
				group: "eks.amazonaws.com",
				version: "v1",
				plural: "nodeclasses",
				name,
			});

			return this.mapNodeClassStatus(response as Record<string, unknown>);
		});
	}

	async deleteNodeClass(name: string): Promise<void> {
		return this.withCredentialRetry(async () => {
			await this.customObjectsApi.deleteClusterCustomObject({
				group: "eks.amazonaws.com",
				version: "v1",
				plural: "nodeclasses",
				name,
			});
		});
	}

	async streamNodeClasses(
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
					"/apis/eks.amazonaws.com/v1/nodeclasses",
					{},
					(type, obj) => {
						try {
							onData(
								JSON.stringify({
									type,
									object: this.mapNodeClassListItem(obj as Record<string, unknown>),
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

	private mapNodeClassListItem(
		nc: Record<string, unknown>,
	): NodeClassListItem {
		const metadata = nc.metadata as Record<string, unknown> | undefined;
		const spec = nc.spec as Record<string, unknown> | undefined;
		const status = nc.status as Record<string, unknown> | undefined;
		const conditions = (status?.conditions as Array<Record<string, unknown>>) ?? [];
		const readyCondition = conditions.find((c) => c.type === "Ready");

		const creationTimestamp = metadata?.creationTimestamp
			? new Date(metadata.creationTimestamp as string).toISOString()
			: undefined;

		return {
			name: (metadata?.name as string) ?? "unknown",
			amiFamily: spec?.amiFamily as string | undefined,
			role: spec?.role as string | undefined,
			instanceProfile: spec?.instanceProfile as string | undefined,
			readyStatus: readyCondition?.status as string | undefined,
			readyMessage: readyCondition?.message as string | undefined,
			creationTimestamp,
		};
	}

	private mapNodeClassDetail(nc: Record<string, unknown>): NodeClassDetail {
		const listItem = this.mapNodeClassListItem(nc);
		const metadata = nc.metadata as Record<string, unknown> | undefined;
		const spec = nc.spec as Record<string, unknown> | undefined;

		return {
			...listItem,
			labels: (metadata?.labels as Record<string, string>) ?? {},
			annotations: (metadata?.annotations as Record<string, string>) ?? {},
			subnetSelectorTerms: spec?.subnetSelectorTerms as
				| Array<Record<string, unknown>>
				| undefined,
			securityGroupSelectorTerms: spec?.securityGroupSelectorTerms as
				| Array<Record<string, unknown>>
				| undefined,
			userData: spec?.userData as string | undefined,
			tags: spec?.tags as Record<string, string> | undefined,
			blockDeviceMappings: spec?.blockDeviceMappings as
				| Array<Record<string, unknown>>
				| undefined,
			instanceStorePolicy: spec?.instanceStorePolicy as string | undefined,
			metadataOptions: spec?.metadataOptions as Record<string, unknown> | undefined,
		};
	}

	private mapNodeClassStatus(nc: Record<string, unknown>): NodeClassStatus {
		const status = nc.status as Record<string, unknown> | undefined;
		const conditions = (status?.conditions as Array<Record<string, unknown>>) ?? [];
		const readyCondition = conditions.find((c) => c.type === "Ready");

		return {
			readyStatus: readyCondition?.status as string | undefined,
			readyMessage: readyCondition?.message as string | undefined,
			observedGeneration: status?.observedGeneration as number | undefined,
			conditions: conditions.map((condition) => ({
				type: (condition?.type as string) ?? "",
				status: (condition?.status as string) ?? "",
				reason: condition?.reason as string | undefined,
				message: condition?.message as string | undefined,
				lastTransitionTime: condition?.lastTransitionTime as string | undefined,
			})),
			amis: status?.amis as
				| Array<{
						id?: string;
						name?: string;
						requirements?: Array<Record<string, unknown>>;
				  }>
				| undefined,
			subnets: status?.subnets as
				| Array<{
						id?: string;
						zone?: string;
				  }>
				| undefined,
			securityGroups: status?.securityGroups as
				| Array<{
						id?: string;
						name?: string;
				  }>
				| undefined,
			instanceProfile: status?.instanceProfile as string | undefined,
		};
	}
}
