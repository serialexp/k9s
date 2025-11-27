// ABOUTME: Service for StorageClass resource operations
// ABOUTME: Handles list, get, delete, stream, and manifest operations for Kubernetes StorageClass resources

import { V1StorageClass } from "@kubernetes/client-node";
import { BaseKubeService } from "../base/BaseKubeService.js";
import type {
	StorageClassDetail,
	StorageClassListItem,
} from "./StorageClassService.types.js";

export class StorageClassService extends BaseKubeService {
	async listStorageClasses(): Promise<StorageClassListItem[]> {
		return this.withCredentialRetry(async () => {
			const response = await this.storageApi.listStorageClass();
			return (response.items ?? []).map((sc: V1StorageClass) =>
				this.mapStorageClassListItem(sc),
			);
		});
	}

	async getStorageClass(name: string): Promise<StorageClassDetail> {
		return this.withCredentialRetry(async () => {
			const sc = await this.storageApi.readStorageClass({ name });
			return this.mapStorageClassDetail(sc);
		});
	}

	async getStorageClassManifest(name: string): Promise<string> {
		return this.withCredentialRetry(async () => {
			const sc = await this.storageApi.readStorageClass({ name });
			const manifest = this.sanitizeManifest(sc);
			return JSON.stringify(manifest, null, 2);
		});
	}

	async deleteStorageClass(name: string): Promise<void> {
		return this.withCredentialRetry(async () => {
			await this.storageApi.deleteStorageClass({ name });
		});
	}

	async streamStorageClasses(
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
					"/apis/storage.k8s.io/v1/storageclasses",
					{},
					(type, obj) => {
						try {
							onData(
								JSON.stringify({
									type,
									object: this.mapStorageClassListItem(obj as V1StorageClass),
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

	private mapStorageClassListItem(sc: V1StorageClass): StorageClassListItem {
		const creationTimestamp = sc.metadata?.creationTimestamp
			? new Date(sc.metadata.creationTimestamp).toISOString()
			: undefined;

		return {
			name: sc.metadata?.name ?? "unknown",
			provisioner: sc.provisioner ?? "",
			reclaimPolicy: sc.reclaimPolicy,
			volumeBindingMode: sc.volumeBindingMode,
			allowVolumeExpansion: sc.allowVolumeExpansion ?? false,
			creationTimestamp,
		};
	}

	private mapStorageClassDetail(sc: V1StorageClass): StorageClassDetail {
		const listItem = this.mapStorageClassListItem(sc);
		return {
			...listItem,
			labels: sc.metadata?.labels ?? {},
			annotations: sc.metadata?.annotations ?? {},
			parameters: sc.parameters ?? {},
			mountOptions: sc.mountOptions,
			allowedTopologies: sc.allowedTopologies
				? JSON.parse(JSON.stringify(sc.allowedTopologies))
				: undefined,
		};
	}
}
