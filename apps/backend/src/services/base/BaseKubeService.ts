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
	RbacAuthorizationV1Api,
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
	protected rbacApi: RbacAuthorizationV1Api;
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
		this.rbacApi = this.kubeConfig.makeApiClient(RbacAuthorizationV1Api);
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
		this.rbacApi = this.kubeConfig.makeApiClient(RbacAuthorizationV1Api);
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

	protected parseCpuQuantity(quantity?: string | null): number {
		if (!quantity) return 0;
		if (quantity.endsWith("n")) {
			const value = Number.parseFloat(quantity.slice(0, -1));
			return Number.isFinite(value) ? value / 1_000_000 : 0;
		}
		if (quantity.endsWith("u")) {
			const value = Number.parseFloat(quantity.slice(0, -1));
			return Number.isFinite(value) ? value / 1000 : 0;
		}
		if (quantity.endsWith("m")) {
			const value = Number.parseFloat(quantity.slice(0, -1));
			return Number.isFinite(value) ? value : 0;
		}
		const value = Number.parseFloat(quantity);
		return Number.isFinite(value) ? value * 1000 : 0;
	}

	protected parseMemoryQuantity(quantity?: string | null): number {
		if (!quantity) return 0;
		const match = quantity.match(/^([0-9.]+)([A-Za-z]+)?$/);
		if (!match) return 0;
		const value = Number.parseFloat(match[1]);
		if (!Number.isFinite(value)) return 0;
		const unit = match[2];
		if (!unit) return value;

		const binaryUnits: Record<string, number> = {
			Ki: 1024,
			Mi: 1024 ** 2,
			Gi: 1024 ** 3,
			Ti: 1024 ** 4,
			Pi: 1024 ** 5,
			Ei: 1024 ** 6,
		};
		const decimalUnits: Record<string, number> = {
			K: 1000,
			M: 1000 ** 2,
			G: 1000 ** 3,
			T: 1000 ** 4,
			P: 1000 ** 5,
			E: 1000 ** 6,
		};

		if (binaryUnits[unit]) {
			return value * binaryUnits[unit];
		}
		if (decimalUnits[unit]) {
			return value * decimalUnits[unit];
		}

		return value;
	}

	protected formatCpuQuantity(millicores: number): string {
		if (millicores >= 1000) {
			const cores = millicores / 1000;
			const rounded = Number(cores.toFixed(2));
			if (Number.isInteger(rounded)) {
				return rounded.toString();
			}
			return rounded.toFixed(2).replace(/\.?0+$/, "");
		}
		return `${millicores}m`;
	}

	protected formatMemoryQuantity(bytes: number): string {
		if (bytes < 1024) {
			return `${bytes}B`;
		}

		const units = [
			{ unit: "Ei", value: 1024 ** 6 },
			{ unit: "Pi", value: 1024 ** 5 },
			{ unit: "Ti", value: 1024 ** 4 },
			{ unit: "Gi", value: 1024 ** 3 },
			{ unit: "Mi", value: 1024 ** 2 },
			{ unit: "Ki", value: 1024 },
		];

		for (const { unit, value } of units) {
			if (bytes >= value) {
				const amount = bytes / value;
				const rounded = Number(amount.toFixed(2));
				const formatted = Number.isInteger(rounded)
					? rounded.toString()
					: rounded.toFixed(2).replace(/\.?0+$/, "");
				return `${formatted}${unit}`;
			}
		}

		return `${bytes}B`;
	}
}
