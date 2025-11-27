// ABOUTME: Service for ConfigMap resource operations
// ABOUTME: Handles list, get, delete, stream, and manifest operations for Kubernetes ConfigMap resources

import { V1ConfigMap } from "@kubernetes/client-node";
import { BaseKubeService } from "../base/BaseKubeService.js";
import type {
	ConfigMapDetail,
	ConfigMapListItem,
} from "./ConfigMapService.types.js";

export class ConfigMapService extends BaseKubeService {
	async listConfigMaps(namespace: string): Promise<ConfigMapListItem[]> {
		return this.withCredentialRetry(async () => {
			const configMapList = await this.coreApi.listNamespacedConfigMap({
				namespace,
			});
			return (configMapList.items ?? []).map((configMap: V1ConfigMap) =>
				this.mapConfigMapListItem(configMap),
			);
		});
	}

	async getConfigMap(
		namespace: string,
		configMapName: string,
	): Promise<ConfigMapDetail> {
		return this.withCredentialRetry(async () => {
			const configMap = await this.coreApi.readNamespacedConfigMap({
				name: configMapName,
				namespace,
			});
			return this.mapConfigMapDetail(configMap);
		});
	}

	async getConfigMapManifest(
		namespace: string,
		configMapName: string,
	): Promise<string> {
		return this.withCredentialRetry(async () => {
			const configMap = await this.coreApi.readNamespacedConfigMap({
				name: configMapName,
				namespace,
			});
			const manifest = this.sanitizeManifest(configMap);
			return JSON.stringify(manifest, null, 2);
		});
	}

	async deleteConfigMap(
		namespace: string,
		configMapName: string,
	): Promise<void> {
		return this.withCredentialRetry(async () => {
			await this.coreApi.deleteNamespacedConfigMap({
				name: configMapName,
				namespace,
			});
		});
	}

	async streamConfigMaps(
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
					`/api/v1/namespaces/${namespace}/configmaps`,
					{},
					(type, obj) => {
						try {
							onData(
								JSON.stringify({
									type,
									object: this.mapConfigMapListItem(obj as V1ConfigMap),
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

	private mapConfigMapListItem(configMap: V1ConfigMap): ConfigMapListItem {
		const creationTimestamp = configMap.metadata?.creationTimestamp
			? new Date(configMap.metadata.creationTimestamp).toISOString()
			: undefined;

		return {
			name: configMap.metadata?.name ?? "unknown",
			namespace: configMap.metadata?.namespace ?? "default",
			dataCount: Object.keys(configMap.data ?? {}).length,
			binaryDataCount: Object.keys(configMap.binaryData ?? {}).length,
			creationTimestamp,
		};
	}

	private mapConfigMapDetail(configMap: V1ConfigMap): ConfigMapDetail {
		const listItem = this.mapConfigMapListItem(configMap);
		return {
			...listItem,
			labels: configMap.metadata?.labels ?? {},
			annotations: configMap.metadata?.annotations ?? {},
			data: configMap.data ?? {},
			binaryData: configMap.binaryData ?? {},
		};
	}
}
