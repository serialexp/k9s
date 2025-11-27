// ABOUTME: TypeScript interfaces for HorizontalPodAutoscaler resource operations
// ABOUTME: Defines list items, details, and watch event types

export interface HpaListItem {
	name: string;
	namespace: string;
	minReplicas?: number;
	maxReplicas: number;
	currentReplicas?: number;
	desiredReplicas?: number;
	targetCPUUtilization?: number;
	targetMemoryUtilization?: number;
	creationTimestamp?: string;
}

export interface HpaDetail extends HpaListItem {
	labels: Record<string, string>;
	annotations: Record<string, string>;
	scaleTargetRef: {
		apiVersion?: string;
		kind?: string;
		name?: string;
	};
	metrics: Array<Record<string, unknown>>;
	conditions?: Array<{
		type: string;
		status: string;
		lastTransitionTime?: string;
		reason?: string;
		message?: string;
	}>;
}

export interface HpaWatchEvent {
	type: string;
	object: HpaListItem;
}
