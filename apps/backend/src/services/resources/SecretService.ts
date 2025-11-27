// ABOUTME: Service for Secret resource operations
// ABOUTME: Handles list, get, delete, stream, and manifest operations for Kubernetes Secret resources

import { V1Secret } from "@kubernetes/client-node";
import { BaseKubeService } from "../base/BaseKubeService.js";
import type {
	SecretDetail,
	SecretListItem,
} from "./SecretService.types.js";

export class SecretService extends BaseKubeService {
	async listSecrets(namespace: string): Promise<SecretListItem[]> {
		return this.withCredentialRetry(async () => {
			const secretList = await this.coreApi.listNamespacedSecret({ namespace });
			return (secretList.items ?? []).map((secret: V1Secret) =>
				this.mapSecretListItem(secret),
			);
		});
	}

	async getSecret(
		namespace: string,
		secretName: string,
	): Promise<SecretDetail> {
		return this.withCredentialRetry(async () => {
			const secret = await this.coreApi.readNamespacedSecret({
				name: secretName,
				namespace,
			});
			return this.mapSecretDetail(secret);
		});
	}

	async getSecretManifest(
		namespace: string,
		secretName: string,
	): Promise<string> {
		return this.withCredentialRetry(async () => {
			const secret = await this.coreApi.readNamespacedSecret({
				name: secretName,
				namespace,
			});
			const manifest = this.sanitizeManifest(secret);
			return JSON.stringify(manifest, null, 2);
		});
	}

	async deleteSecret(namespace: string, secretName: string): Promise<void> {
		return this.withCredentialRetry(async () => {
			await this.coreApi.deleteNamespacedSecret({ name: secretName, namespace });
		});
	}

	async streamSecrets(
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
					`/api/v1/namespaces/${namespace}/secrets`,
					{},
					(type, obj) => {
						try {
							onData(
								JSON.stringify({
									type,
									object: this.mapSecretListItem(obj as V1Secret),
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

	private mapSecretListItem(secret: V1Secret): SecretListItem {
		const creationTimestamp = secret.metadata?.creationTimestamp
			? new Date(secret.metadata.creationTimestamp).toISOString()
			: undefined;

		return {
			name: secret.metadata?.name ?? "unknown",
			namespace: secret.metadata?.namespace ?? "default",
			type: secret.type,
			dataCount: Object.keys(secret.data ?? {}).length,
			creationTimestamp,
		};
	}

	private mapSecretDetail(secret: V1Secret): SecretDetail {
		const listItem = this.mapSecretListItem(secret);
		return {
			...listItem,
			labels: secret.metadata?.labels ?? {},
			annotations: secret.metadata?.annotations ?? {},
			data: secret.data ?? {},
		};
	}
}
