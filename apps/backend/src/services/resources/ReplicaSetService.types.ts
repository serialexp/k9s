// ABOUTME: TypeScript interfaces for ReplicaSet resource operations
// ABOUTME: Defines list items, details, and watch event types

export interface ReplicaSetListItem {
	name: string;
	namespace: string;
	desiredReplicas: number;
	readyReplicas: number;
	availableReplicas: number;
	ownerReference?: string;
	images: string[];
	creationTimestamp?: string;
}

export interface ReplicaSetDetail extends ReplicaSetListItem {
	labels: Record<string, string>;
	annotations: Record<string, string>;
	selector: Record<string, string>;
	conditions: Array<{
		type: string;
		status: string;
		lastTransitionTime?: string;
		reason?: string;
		message?: string;
	}>;
}

export interface ReplicaSetWatchEvent {
	type: string;
	object: ReplicaSetListItem;
}
