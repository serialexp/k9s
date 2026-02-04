// ABOUTME: Service for ClusterRole resource operations
// ABOUTME: Handles list, get, delete, stream, and manifest operations for Kubernetes ClusterRole resources

import { V1ClusterRole, V1PolicyRule } from "@kubernetes/client-node";
import { BaseKubeService } from "../base/BaseKubeService.js";
import type { PolicyRule } from "./RoleService.types.js";
import type {
	AggregationRule,
	ClusterRoleDetail,
	ClusterRoleListItem,
} from "./ClusterRoleService.types.js";

export class ClusterRoleService extends BaseKubeService {
	async listClusterRoles(): Promise<ClusterRoleListItem[]> {
		return this.withCredentialRetry(async () => {
			const response = await this.rbacApi.listClusterRole();
			return (response.items ?? []).map((clusterRole: V1ClusterRole) =>
				this.mapClusterRoleListItem(clusterRole),
			);
		});
	}

	async getClusterRole(name: string): Promise<ClusterRoleDetail> {
		return this.withCredentialRetry(async () => {
			const clusterRole = await this.rbacApi.readClusterRole({ name });
			return this.mapClusterRoleDetail(clusterRole);
		});
	}

	async getClusterRoleManifest(name: string): Promise<string> {
		return this.withCredentialRetry(async () => {
			const clusterRole = await this.rbacApi.readClusterRole({ name });
			const manifest = this.sanitizeManifest(clusterRole);
			return JSON.stringify(manifest, null, 2);
		});
	}

	async deleteClusterRole(name: string): Promise<void> {
		return this.withCredentialRetry(async () => {
			await this.rbacApi.deleteClusterRole({ name });
		});
	}

	async streamClusterRoles(
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
					"/apis/rbac.authorization.k8s.io/v1/clusterroles",
					{},
					(type, obj) => {
						try {
							onData(
								JSON.stringify({
									type,
									object: this.mapClusterRoleListItem(obj as V1ClusterRole),
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

	private mapClusterRoleListItem(clusterRole: V1ClusterRole): ClusterRoleListItem {
		const creationTimestamp = clusterRole.metadata?.creationTimestamp
			? new Date(clusterRole.metadata.creationTimestamp).toISOString()
			: undefined;

		return {
			name: clusterRole.metadata?.name ?? "unknown",
			ruleCount: clusterRole.rules?.length ?? 0,
			aggregationRule: clusterRole.aggregationRule
				? this.mapAggregationRule(clusterRole.aggregationRule)
				: undefined,
			creationTimestamp,
		};
	}

	private mapClusterRoleDetail(clusterRole: V1ClusterRole): ClusterRoleDetail {
		const listItem = this.mapClusterRoleListItem(clusterRole);
		return {
			...listItem,
			labels: clusterRole.metadata?.labels ?? {},
			annotations: clusterRole.metadata?.annotations ?? {},
			rules: (clusterRole.rules ?? []).map((rule) => this.mapPolicyRule(rule)),
		};
	}

	private mapPolicyRule(rule: V1PolicyRule): PolicyRule {
		return {
			apiGroups: rule.apiGroups ?? [],
			resources: rule.resources ?? [],
			verbs: rule.verbs ?? [],
			resourceNames: rule.resourceNames,
			nonResourceURLs: rule.nonResourceURLs,
		};
	}

	private mapAggregationRule(
		aggregationRule: V1ClusterRole["aggregationRule"],
	): AggregationRule | undefined {
		if (!aggregationRule) return undefined;

		return {
			clusterRoleSelectors: aggregationRule.clusterRoleSelectors?.map(
				(selector) => ({
					matchLabels: selector.matchLabels,
					matchExpressions: selector.matchExpressions?.map((expr) => ({
						key: expr.key,
						operator: expr.operator,
						values: expr.values,
					})),
				}),
			),
		};
	}
}
