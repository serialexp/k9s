// ABOUTME: Service for Istio Gateway resource operations
// ABOUTME: Handles list, get, delete, stream, and manifest operations

import {
	BaseKubeService,
	type KubernetesListResponse,
} from "../base/BaseKubeService.js";
import { CRDNotInstalledError } from "../base/errors.js";
import type {
	GatewayDetail,
	GatewayListItem,
	GatewayServer,
} from "./GatewayService.types.js";

export class GatewayService extends BaseKubeService {
	async listGateways(namespace: string): Promise<GatewayListItem[]> {
		const crdExists = await this.checkCRDExists(
			"gateways.networking.istio.io",
		);
		if (!crdExists) {
			throw new CRDNotInstalledError(
				"gateways.networking.istio.io",
				"Istio Gateway",
			);
		}

		return this.withCredentialRetry(async () => {
			const response =
				await this.customObjectsApi.listNamespacedCustomObject({
					group: "networking.istio.io",
					version: "v1beta1",
					namespace,
					plural: "gateways",
				});

			const list = response as unknown as KubernetesListResponse;
			return (list.items ?? []).map((item) =>
				this.mapGatewayListItem(item),
			);
		});
	}

	async getGateway(
		namespace: string,
		name: string,
	): Promise<GatewayDetail> {
		return this.withCredentialRetry(async () => {
			const response =
				await this.customObjectsApi.getNamespacedCustomObject({
					group: "networking.istio.io",
					version: "v1beta1",
					namespace,
					plural: "gateways",
					name,
				});

			return this.mapGatewayDetail(
				response as Record<string, unknown>,
			);
		});
	}

	async getGatewayManifest(
		namespace: string,
		name: string,
	): Promise<string> {
		return this.withCredentialRetry(async () => {
			const response =
				await this.customObjectsApi.getNamespacedCustomObject({
					group: "networking.istio.io",
					version: "v1beta1",
					namespace,
					plural: "gateways",
					name,
				});
			const manifest = this.sanitizeManifest(response);
			return JSON.stringify(manifest, null, 2);
		});
	}

	async deleteGateway(namespace: string, name: string): Promise<void> {
		return this.withCredentialRetry(async () => {
			await this.customObjectsApi.deleteNamespacedCustomObject({
				group: "networking.istio.io",
				version: "v1beta1",
				namespace,
				plural: "gateways",
				name,
			});
		});
	}

	async streamGateways(
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
					`/apis/networking.istio.io/v1beta1/namespaces/${namespace}/gateways`,
					{},
					(type, obj) => {
						try {
							onData(
								JSON.stringify({
									type,
									object: this.mapGatewayListItem(
										obj as Record<string, unknown>,
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

	private mapGatewayListItem(
		resource: Record<string, unknown>,
	): GatewayListItem {
		const metadata = resource.metadata as
			| Record<string, unknown>
			| undefined;
		const spec = resource.spec as Record<string, unknown> | undefined;

		const servers = (spec?.servers as Array<Record<string, unknown>>) ?? [];
		const allHosts = servers.flatMap(
			(s) => (s.hosts as string[]) ?? [],
		);
		const uniqueHosts = [...new Set(allHosts)];

		const creationTimestamp = metadata?.creationTimestamp
			? new Date(metadata.creationTimestamp as string).toISOString()
			: undefined;

		return {
			name: (metadata?.name as string) ?? "unknown",
			namespace: (metadata?.namespace as string) ?? "default",
			selector: (spec?.selector as Record<string, string>) ?? {},
			serverCount: servers.length,
			hosts: uniqueHosts,
			creationTimestamp,
		};
	}

	private mapGatewayDetail(
		resource: Record<string, unknown>,
	): GatewayDetail {
		const listItem = this.mapGatewayListItem(resource);
		const metadata = resource.metadata as
			| Record<string, unknown>
			| undefined;
		const spec = resource.spec as Record<string, unknown> | undefined;

		return {
			...listItem,
			labels: (metadata?.labels as Record<string, string>) ?? {},
			annotations: (metadata?.annotations as Record<string, string>) ?? {},
			servers: (spec?.servers as GatewayServer[]) ?? [],
		};
	}
}
