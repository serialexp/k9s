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
