// ABOUTME: TypeScript interfaces for Namespace resource operations
// ABOUTME: Defines list items, details, watch events, and namespace event types

export interface NamespaceListItem {
	name: string;
	status: string;
	labels: Record<string, string>;
	creationTimestamp?: string;
	podCount: number;
	cpuRequests?: string;
	cpuUsage?: string;
	cpuUsageUtilization?: number;
	memoryRequests?: string;
	memoryUsage?: string;
	memoryUsageUtilization?: number;
}

export interface NamespaceDetail extends NamespaceListItem {
	annotations: Record<string, string>;
	finalizers: string[];
}

export interface NamespaceWatchEvent {
	type: string;
	object: NamespaceListItem;
}

export interface NamespaceEvent {
	type: string;
	reason: string;
	message: string;
	count?: number;
	firstTimestamp?: string;
	lastTimestamp?: string;
	source?: string;
	involvedObject: {
		kind: string;
		name: string;
	};
}
