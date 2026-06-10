// ABOUTME: Service for IngressClass resource operations
// ABOUTME: Handles list, get, delete, stream, and manifest operations for cluster-scoped IngressClass resources

import { V1IngressClass } from "@kubernetes/client-node";
import { BaseKubeService } from "../base/BaseKubeService.js";
import type {
	IngressClassDetail,
	IngressClassListItem,
} from "./IngressClassService.types.js";

export class IngressClassService extends BaseKubeService {
	async listIngressClasses(): Promise<IngressClassListItem[]> {
		return this.withCredentialRetry(async () => {
			const response = await this.networkingApi.listIngressClass();
			return (response.items ?? []).map((ic: V1IngressClass) =>
				this.mapIngressClassListItem(ic),
			);
		});
	}

	async getIngressClass(name: string): Promise<IngressClassDetail> {
		return this.withCredentialRetry(async () => {
			const ic = await this.networkingApi.readIngressClass({ name });
			return this.mapIngressClassDetail(ic);
		});
	}

	async getIngressClassManifest(name: string): Promise<string> {
		return this.withCredentialRetry(async () => {
			const ic = await this.networkingApi.readIngressClass({ name });
			const manifest = this.sanitizeManifest(ic);
			return JSON.stringify(manifest, null, 2);
		});
	}

	async deleteIngressClass(name: string): Promise<void> {
		return this.withCredentialRetry(async () => {
			await this.networkingApi.deleteIngressClass({ name });
		});
	}

	async streamIngressClasses(
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
					"/apis/networking.k8s.io/v1/ingressclasses",
					{},
					(type, obj) => {
						try {
							onData(
								JSON.stringify({
									type,
									object: this.mapIngressClassListItem(obj as V1IngressClass),
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

	private mapIngressClassListItem(ic: V1IngressClass): IngressClassListItem {
		const creationTimestamp = ic.metadata?.creationTimestamp
			? new Date(ic.metadata.creationTimestamp).toISOString()
			: undefined;

		const isDefault =
			ic.metadata?.annotations?.[
				"ingressclass.kubernetes.io/is-default-class"
			] === "true";

		return {
			name: ic.metadata?.name ?? "unknown",
			controller: ic.spec?.controller,
			isDefault,
			creationTimestamp,
		};
	}

	private mapIngressClassDetail(ic: V1IngressClass): IngressClassDetail {
		const listItem = this.mapIngressClassListItem(ic);
		const params = ic.spec?.parameters;
		return {
			...listItem,
			labels: ic.metadata?.labels ?? {},
			annotations: ic.metadata?.annotations ?? {},
			parameters: params
				? {
						apiGroup: params.apiGroup,
						kind: params.kind,
						name: params.name,
						namespace: params.namespace,
						scope: params.scope,
					}
				: undefined,
		};
	}
}
