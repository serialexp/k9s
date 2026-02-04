// ABOUTME: TypeScript interfaces for PodDisruptionBudget resource operations
// ABOUTME: Defines list items, details, watch events, and event types

export interface PdbListItem {
	name: string;
	namespace: string;
	minAvailable?: string;
	maxUnavailable?: string;
	currentHealthy?: number;
	desiredHealthy?: number;
	disruptionsAllowed?: number;
	expectedPods?: number;
	creationTimestamp?: string;
}

export interface PdbDetail extends PdbListItem {
	labels: Record<string, string>;
	annotations: Record<string, string>;
	selector?: Record<string, string>;
	conditions?: Array<{
		type: string;
		status: string;
		lastTransitionTime?: string;
		reason?: string;
		message?: string;
	}>;
}

export interface PdbWatchEvent {
	type: string;
	object: PdbListItem;
}

export interface PdbEvent {
	type: string;
	reason: string;
	message: string;
	count?: number;
	firstTimestamp?: string;
	lastTimestamp?: string;
	source?: string;
}
