// ABOUTME: Generic service for applying an edited resource manifest in place
// ABOUTME: Parses YAML and performs a Replace (PUT) via KubernetesObjectApi for any kind

import type { KubernetesObject } from "@kubernetes/client-node";
import yaml from "yaml";
import { BaseKubeService } from "../base/BaseKubeService.js";
import { ManifestApplyError } from "../base/errors.js";

export interface AppliedManifest {
	apiVersion: string;
	kind: string;
	name: string;
	namespace?: string;
}

export class ManifestApplyService extends BaseKubeService {
	/**
	 * Apply an edited manifest using Replace (PUT) semantics, analogous to
	 * `kubectl edit`. The target resource is derived entirely from the manifest's
	 * own apiVersion/kind/metadata, so this works for built-in, cluster-scoped,
	 * and custom resources without per-resource code.
	 *
	 * Replace honours metadata.resourceVersion for optimistic concurrency: if the
	 * object changed in the cluster since the manifest was loaded, the API server
	 * rejects the write with a 409 Conflict.
	 */
	async applyManifest(manifestYaml: string): Promise<AppliedManifest> {
		const parsed = this.parseManifest(manifestYaml);

		const applied = await this.withCredentialRetry(async () => {
			try {
				return await this.objectApi.replace(parsed);
			} catch (error) {
				throw this.toApplyError(error);
			}
		});

		const metadata = (applied.metadata ?? {}) as {
			name?: string;
			namespace?: string;
		};

		return {
			apiVersion: applied.apiVersion ?? parsed.apiVersion!,
			kind: applied.kind ?? parsed.kind!,
			name: metadata.name ?? "",
			namespace: metadata.namespace,
		};
	}

	private parseManifest(manifestYaml: string): KubernetesObject {
		let parsed: unknown;
		try {
			parsed = yaml.parse(manifestYaml);
		} catch (error) {
			const detail = error instanceof Error ? error.message : String(error);
			throw new ManifestApplyError(`Invalid YAML: ${detail}`, 400);
		}

		if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
			throw new ManifestApplyError(
				"Manifest must be a single YAML object.",
				400,
			);
		}

		const obj = parsed as Record<string, unknown>;
		const apiVersion = obj.apiVersion;
		const kind = obj.kind;
		const metadata = obj.metadata as Record<string, unknown> | undefined;
		const name = metadata?.name;

		if (typeof apiVersion !== "string" || apiVersion.length === 0) {
			throw new ManifestApplyError("Manifest is missing 'apiVersion'.", 400);
		}
		if (typeof kind !== "string" || kind.length === 0) {
			throw new ManifestApplyError("Manifest is missing 'kind'.", 400);
		}
		if (typeof name !== "string" || name.length === 0) {
			throw new ManifestApplyError("Manifest is missing 'metadata.name'.", 400);
		}

		return parsed as KubernetesObject;
	}

	private toApplyError(error: unknown): ManifestApplyError {
		const err = error as {
			code?: number;
			statusCode?: number;
			body?: unknown;
			message?: string;
		};
		const status = err.code ?? err.statusCode ?? 500;
		const apiMessage = this.extractApiMessage(err.body) ?? err.message;

		switch (status) {
			case 404:
				return new ManifestApplyError(
					apiMessage ??
						"Resource not found. It may have been deleted, or its name/namespace was changed in the manifest.",
					404,
				);
			case 409:
				return new ManifestApplyError(
					apiMessage ??
						"Conflict: the resource changed since it was loaded. Reload the manifest and re-apply.",
					409,
				);
			case 422:
				return new ManifestApplyError(
					apiMessage ?? "The manifest was rejected as invalid by the API server.",
					422,
				);
			default:
				return new ManifestApplyError(
					apiMessage ?? "Failed to apply manifest.",
					typeof status === "number" && status >= 400 ? status : 500,
				);
		}
	}

	private extractApiMessage(body: unknown): string | undefined {
		if (!body) return undefined;
		let parsed = body;
		if (typeof body === "string") {
			try {
				parsed = JSON.parse(body);
			} catch {
				return body;
			}
		}
		if (parsed && typeof parsed === "object") {
			const message = (parsed as Record<string, unknown>).message;
			if (typeof message === "string" && message.length > 0) {
				return message;
			}
		}
		return undefined;
	}
}
