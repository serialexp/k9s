// ABOUTME: Service for Istio DestinationRule resource operations
// ABOUTME: Handles list, get, delete, stream, and manifest operations

import {
	BaseKubeService,
	type KubernetesListResponse,
} from "../base/BaseKubeService.js";
import { CRDNotInstalledError } from "../base/errors.js";
import type {
	DestinationRuleDetail,
	DestinationRuleListItem,
	DestinationRuleSubset,
	DestinationRuleTrafficPolicy,
} from "./DestinationRuleService.types.js";

export class DestinationRuleService extends BaseKubeService {
	async listDestinationRules(
		namespace: string,
	): Promise<DestinationRuleListItem[]> {
		const crdExists = await this.checkCRDExists(
			"destinationrules.networking.istio.io",
		);
		if (!crdExists) {
			throw new CRDNotInstalledError(
				"destinationrules.networking.istio.io",
				"Istio DestinationRule",
			);
		}

		return this.withCredentialRetry(async () => {
			const response =
				await this.customObjectsApi.listNamespacedCustomObject({
					group: "networking.istio.io",
					version: "v1beta1",
					namespace,
					plural: "destinationrules",
				});

			const list = response as unknown as KubernetesListResponse;
			return (list.items ?? []).map((item) =>
				this.mapDestinationRuleListItem(item),
			);
		});
	}

	async getDestinationRule(
		namespace: string,
		name: string,
	): Promise<DestinationRuleDetail> {
		return this.withCredentialRetry(async () => {
			const response =
				await this.customObjectsApi.getNamespacedCustomObject({
					group: "networking.istio.io",
					version: "v1beta1",
					namespace,
					plural: "destinationrules",
					name,
				});

			return this.mapDestinationRuleDetail(
				response as Record<string, unknown>,
			);
		});
	}

	async getDestinationRuleManifest(
		namespace: string,
		name: string,
	): Promise<string> {
		return this.withCredentialRetry(async () => {
			const response =
				await this.customObjectsApi.getNamespacedCustomObject({
					group: "networking.istio.io",
					version: "v1beta1",
					namespace,
					plural: "destinationrules",
					name,
				});
			const manifest = this.sanitizeManifest(response);
			return JSON.stringify(manifest, null, 2);
		});
	}

	async deleteDestinationRule(
		namespace: string,
		name: string,
	): Promise<void> {
		return this.withCredentialRetry(async () => {
			await this.customObjectsApi.deleteNamespacedCustomObject({
				group: "networking.istio.io",
				version: "v1beta1",
				namespace,
				plural: "destinationrules",
				name,
			});
		});
	}

	async streamDestinationRules(
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
					`/apis/networking.istio.io/v1beta1/namespaces/${namespace}/destinationrules`,
					{},
					(type, obj) => {
						try {
							onData(
								JSON.stringify({
									type,
									object: this.mapDestinationRuleListItem(
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

	private mapDestinationRuleListItem(
		resource: Record<string, unknown>,
	): DestinationRuleListItem {
		const metadata = resource.metadata as
			| Record<string, unknown>
			| undefined;
		const spec = resource.spec as Record<string, unknown> | undefined;

		const subsets =
			(spec?.subsets as Array<Record<string, unknown>>) ?? [];
		const trafficPolicy = spec?.trafficPolicy as
			| Record<string, unknown>
			| undefined;

		const loadBalancer = trafficPolicy?.loadBalancer as
			| Record<string, unknown>
			| undefined;
		const loadBalancerSimple = loadBalancer?.simple as string | undefined;

		const tls = trafficPolicy?.tls as
			| Record<string, unknown>
			| undefined;
		const tlsMode = tls?.mode as string | undefined;

		const creationTimestamp = metadata?.creationTimestamp
			? new Date(metadata.creationTimestamp as string).toISOString()
			: undefined;

		return {
			name: (metadata?.name as string) ?? "unknown",
			namespace: (metadata?.namespace as string) ?? "default",
			host: (spec?.host as string) ?? "",
			subsetCount: subsets.length,
			subsetNames: subsets.map(
				(s) => (s.name as string) ?? "unknown",
			),
			loadBalancer: loadBalancerSimple,
			tlsMode,
			creationTimestamp,
		};
	}

	private mapDestinationRuleDetail(
		resource: Record<string, unknown>,
	): DestinationRuleDetail {
		const listItem = this.mapDestinationRuleListItem(resource);
		const metadata = resource.metadata as
			| Record<string, unknown>
			| undefined;
		const spec = resource.spec as Record<string, unknown> | undefined;

		const rawSubsets =
			(spec?.subsets as Array<Record<string, unknown>>) ?? [];
		const subsets: DestinationRuleSubset[] = rawSubsets.map((s) => ({
			name: (s.name as string) ?? "unknown",
			labels: (s.labels as Record<string, string>) ?? {},
			trafficPolicy: s.trafficPolicy as
				| Record<string, unknown>
				| undefined,
		}));

		return {
			...listItem,
			labels: (metadata?.labels as Record<string, string>) ?? {},
			annotations:
				(metadata?.annotations as Record<string, string>) ?? {},
			trafficPolicy: spec?.trafficPolicy as
				| DestinationRuleTrafficPolicy
				| undefined,
			subsets,
			exportTo: (spec?.exportTo as string[]) ?? [],
		};
	}
}
