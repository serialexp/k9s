// ABOUTME: Custom error types for Kubernetes operations
// ABOUTME: Allows API layer to return user-friendly error messages

export class CRDNotInstalledError extends Error {
	constructor(
		public readonly crdName: string,
		public readonly feature: string,
	) {
		super(
			`${feature} is not available: CRD '${crdName}' is not installed in this cluster`,
		);
		this.name = "CRDNotInstalledError";
	}
}

/**
 * Raised when applying an edited manifest fails. Carries an HTTP status code so
 * the API layer can map it back to a meaningful response for the client.
 */
export class ManifestApplyError extends Error {
	constructor(
		message: string,
		public readonly statusCode: number,
	) {
		super(message);
		this.name = "ManifestApplyError";
	}
}
