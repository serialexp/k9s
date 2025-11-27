// ABOUTME: Base class for Kubernetes service operations
// ABOUTME: Provides shared API clients, credential management, and utility methods

import {
	AppsV1Api,
	AutoscalingV2Api,
	BatchV1Api,
	CoreV1Api,
	CustomObjectsApi,
	KubeConfig,
	Log,
	NetworkingV1Api,
	PolicyV1Api,
	StorageV1Api,
	Watch,
} from "@kubernetes/client-node";

export type KubernetesListResponse<T = Record<string, unknown>> = {
	items?: T[];
};

export class BaseKubeService {
	protected kubeConfig: KubeConfig;
	protected coreApi: CoreV1Api;
	protected appsApi: AppsV1Api;
	protected autoscalingApi: AutoscalingV2Api;
	protected batchApi: BatchV1Api;
	protected networkingApi: NetworkingV1Api;
	protected policyApi: PolicyV1Api;
	protected storageApi: StorageV1Api;
	protected customObjectsApi: CustomObjectsApi;
	protected watch: Watch;
	protected log: Log;
	protected crdCache: Map<string, boolean> = new Map();

	constructor(kubeConfig: KubeConfig) {
		this.kubeConfig = kubeConfig;
		this.coreApi = this.kubeConfig.makeApiClient(CoreV1Api);
		this.appsApi = this.kubeConfig.makeApiClient(AppsV1Api);
		this.autoscalingApi = this.kubeConfig.makeApiClient(AutoscalingV2Api);
		this.batchApi = this.kubeConfig.makeApiClient(BatchV1Api);
		this.networkingApi = this.kubeConfig.makeApiClient(NetworkingV1Api);
		this.policyApi = this.kubeConfig.makeApiClient(PolicyV1Api);
		this.storageApi = this.kubeConfig.makeApiClient(StorageV1Api);
		this.customObjectsApi = this.kubeConfig.makeApiClient(CustomObjectsApi);
		this.watch = new Watch(this.kubeConfig);
		this.log = new Log(this.kubeConfig);
	}

	refreshCredentials() {
		this.coreApi = this.kubeConfig.makeApiClient(CoreV1Api);
		this.appsApi = this.kubeConfig.makeApiClient(AppsV1Api);
		this.autoscalingApi = this.kubeConfig.makeApiClient(AutoscalingV2Api);
		this.batchApi = this.kubeConfig.makeApiClient(BatchV1Api);
		this.networkingApi = this.kubeConfig.makeApiClient(NetworkingV1Api);
		this.policyApi = this.kubeConfig.makeApiClient(PolicyV1Api);
		this.storageApi = this.kubeConfig.makeApiClient(StorageV1Api);
		this.customObjectsApi = this.kubeConfig.makeApiClient(CustomObjectsApi);
		this.watch = new Watch(this.kubeConfig);
		this.log = new Log(this.kubeConfig);
	}

	protected async withCredentialRetry<T>(fn: () => Promise<T>): Promise<T> {
		try {
			return await fn();
		} catch (error) {
			const err = error as { statusCode?: number };
			if (err.statusCode === 401) {
				this.refreshCredentials();
				return await fn();
			}
			throw error;
		}
	}

	protected sanitizeManifest(resource: unknown): unknown {
		if (typeof resource === "undefined") {
			return resource;
		}
		const plain = JSON.parse(JSON.stringify(resource));
		if (plain && typeof plain === "object") {
			const record = plain as Record<string, unknown>;
			const metadata = record.metadata as Record<string, unknown> | undefined;
			if (metadata && typeof metadata === "object") {
				delete (metadata as Record<string, unknown>)["managedFields"];
			}
		}
		return plain;
	}

	async checkCRDExists(crdName: string): Promise<boolean> {
		if (this.crdCache.has(crdName)) {
			return this.crdCache.get(crdName)!;
		}

		return this.withCredentialRetry(async () => {
			try {
				const response = await this.customObjectsApi.listClusterCustomObject({
					group: "apiextensions.k8s.io",
					version: "v1",
					plural: "customresourcedefinitions",
				});
				const list = response as unknown as KubernetesListResponse;
				const exists = (list.items ?? []).some((item) => {
					const metadata = (item as Record<string, unknown>)?.["metadata"] as
						| Record<string, unknown>
						| undefined;
					return metadata?.["name"] === crdName;
				});
				this.crdCache.set(crdName, exists);
				return exists;
			} catch (error) {
				this.crdCache.set(crdName, false);
				return false;
			}
		});
	}
}
