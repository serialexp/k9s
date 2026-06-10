// ABOUTME: Service for Helm release operations via Kubernetes Secret storage
// ABOUTME: Decodes Helm 3 release metadata from gzip-compressed secrets with label owner=helm

import { gunzipSync } from "node:zlib";
import { V1Secret } from "@kubernetes/client-node";
import { BaseKubeService } from "../base/BaseKubeService.js";
import type {
	HelmReleaseDetail,
	HelmReleaseListItem,
} from "./HelmReleaseService.types.js";

interface HelmReleasePayload {
	name: string;
	version: number;
	info: {
		status: string;
		description?: string;
		notes?: string;
		first_deployed?: string;
		last_deployed?: string;
	};
	chart: {
		metadata: {
			name: string;
			version: string;
			appVersion?: string;
		};
	};
	config?: Record<string, unknown>;
}

const HELM_LABEL_SELECTOR = "owner=helm";

export class HelmReleaseService extends BaseKubeService {
	async listHelmReleases(namespace: string): Promise<HelmReleaseListItem[]> {
		return this.withCredentialRetry(async () => {
			const response = await this.coreApi.listNamespacedSecret({
				namespace,
				labelSelector: HELM_LABEL_SELECTOR,
			});

			const byRelease = new Map<string, HelmReleaseListItem>();
			for (const secret of response.items ?? []) {
				const item = this.mapHelmReleaseListItem(secret);
				if (!item) continue;

				const existing = byRelease.get(item.name);
				if (!existing || item.revision > existing.revision) {
					byRelease.set(item.name, item);
				}
			}

			return Array.from(byRelease.values());
		});
	}

	async getHelmRelease(
		namespace: string,
		releaseName: string,
	): Promise<HelmReleaseDetail> {
		return this.withCredentialRetry(async () => {
			const response = await this.coreApi.listNamespacedSecret({
				namespace,
				labelSelector: `${HELM_LABEL_SELECTOR},name=${releaseName}`,
			});

			const secrets = response.items ?? [];
			if (secrets.length === 0) {
				throw { statusCode: 404, message: `Helm release "${releaseName}" not found` };
			}

			let latest = secrets[0];
			let latestVersion = Number(latest.metadata?.labels?.["version"] ?? "0");
			for (const secret of secrets.slice(1)) {
				const version = Number(secret.metadata?.labels?.["version"] ?? "0");
				if (version > latestVersion) {
					latest = secret;
					latestVersion = version;
				}
			}

			return this.mapHelmReleaseDetail(latest);
		});
	}

	async getHelmReleaseManifest(
		namespace: string,
		releaseName: string,
	): Promise<string> {
		return this.withCredentialRetry(async () => {
			const response = await this.coreApi.listNamespacedSecret({
				namespace,
				labelSelector: `${HELM_LABEL_SELECTOR},name=${releaseName}`,
			});

			const secrets = response.items ?? [];
			if (secrets.length === 0) {
				throw { statusCode: 404, message: `Helm release "${releaseName}" not found` };
			}

			let latest = secrets[0];
			let latestVersion = Number(latest.metadata?.labels?.["version"] ?? "0");
			for (const secret of secrets.slice(1)) {
				const version = Number(secret.metadata?.labels?.["version"] ?? "0");
				if (version > latestVersion) {
					latest = secret;
					latestVersion = version;
				}
			}

			const manifest = this.sanitizeManifest(latest);
			return JSON.stringify(manifest, null, 2);
		});
	}

	async streamHelmReleases(
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
					{ labelSelector: HELM_LABEL_SELECTOR },
					(type, obj) => {
						try {
							const item = this.mapHelmReleaseListItem(obj as V1Secret);
							if (!item) return;
							onData(
								JSON.stringify({
									type,
									object: item,
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

	private decodeHelmRelease(secret: V1Secret): HelmReleasePayload | null {
		try {
			const releaseData = secret.data?.["release"];
			if (!releaseData) return null;

			const compressed = Buffer.from(releaseData, "base64");
			const decompressed = gunzipSync(compressed);
			return JSON.parse(decompressed.toString("utf-8")) as HelmReleasePayload;
		} catch {
			return null;
		}
	}

	private mapHelmReleaseListItem(secret: V1Secret): HelmReleaseListItem | null {
		const labels = secret.metadata?.labels ?? {};
		const releaseName = labels["name"];
		if (!releaseName) return null;

		const payload = this.decodeHelmRelease(secret);

		const creationTimestamp = secret.metadata?.creationTimestamp
			? new Date(secret.metadata.creationTimestamp).toISOString()
			: undefined;

		return {
			name: releaseName,
			namespace: secret.metadata?.namespace ?? "default",
			status: labels["status"] ?? payload?.info?.status ?? "unknown",
			revision: Number(labels["version"] ?? "0"),
			chart: payload?.chart?.metadata?.name ?? "",
			chartVersion: payload?.chart?.metadata?.version ?? "",
			appVersion: payload?.chart?.metadata?.appVersion ?? "",
			updated: payload?.info?.last_deployed ?? creationTimestamp,
		};
	}

	private mapHelmReleaseDetail(secret: V1Secret): HelmReleaseDetail {
		const listItem = this.mapHelmReleaseListItem(secret);
		if (!listItem) {
			throw { statusCode: 500, message: "Failed to parse Helm release" };
		}

		const payload = this.decodeHelmRelease(secret);

		return {
			...listItem,
			labels: secret.metadata?.labels ?? {},
			annotations: secret.metadata?.annotations ?? {},
			description: payload?.info?.description ?? "",
			notes: payload?.info?.notes ?? "",
			values: payload?.config ? JSON.stringify(payload.config, null, 2) : "{}",
		};
	}
}
