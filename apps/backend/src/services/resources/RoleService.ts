// ABOUTME: Service for Role resource operations
// ABOUTME: Handles list, get, delete, stream, and manifest operations for Kubernetes Role resources

import { V1Role, V1PolicyRule } from "@kubernetes/client-node";
import { BaseKubeService } from "../base/BaseKubeService.js";
import type {
	PolicyRule,
	RoleDetail,
	RoleListItem,
} from "./RoleService.types.js";

export class RoleService extends BaseKubeService {
	async listRoles(namespace: string): Promise<RoleListItem[]> {
		return this.withCredentialRetry(async () => {
			const roleList = await this.rbacApi.listNamespacedRole({
				namespace,
			});
			return (roleList.items ?? []).map((role: V1Role) =>
				this.mapRoleListItem(role),
			);
		});
	}

	async getRole(namespace: string, roleName: string): Promise<RoleDetail> {
		return this.withCredentialRetry(async () => {
			const role = await this.rbacApi.readNamespacedRole({
				name: roleName,
				namespace,
			});
			return this.mapRoleDetail(role);
		});
	}

	async getRoleManifest(namespace: string, roleName: string): Promise<string> {
		return this.withCredentialRetry(async () => {
			const role = await this.rbacApi.readNamespacedRole({
				name: roleName,
				namespace,
			});
			const manifest = this.sanitizeManifest(role);
			return JSON.stringify(manifest, null, 2);
		});
	}

	async deleteRole(namespace: string, roleName: string): Promise<void> {
		return this.withCredentialRetry(async () => {
			await this.rbacApi.deleteNamespacedRole({
				name: roleName,
				namespace,
			});
		});
	}

	async streamRoles(
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
					`/apis/rbac.authorization.k8s.io/v1/namespaces/${namespace}/roles`,
					{},
					(type, obj) => {
						try {
							onData(
								JSON.stringify({
									type,
									object: this.mapRoleListItem(obj as V1Role),
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

	private mapRoleListItem(role: V1Role): RoleListItem {
		const creationTimestamp = role.metadata?.creationTimestamp
			? new Date(role.metadata.creationTimestamp).toISOString()
			: undefined;

		return {
			name: role.metadata?.name ?? "unknown",
			namespace: role.metadata?.namespace ?? "default",
			ruleCount: role.rules?.length ?? 0,
			creationTimestamp,
		};
	}

	private mapRoleDetail(role: V1Role): RoleDetail {
		const listItem = this.mapRoleListItem(role);
		return {
			...listItem,
			labels: role.metadata?.labels ?? {},
			annotations: role.metadata?.annotations ?? {},
			rules: (role.rules ?? []).map((rule) => this.mapPolicyRule(rule)),
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
}
