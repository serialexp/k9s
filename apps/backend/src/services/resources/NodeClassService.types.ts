// ABOUTME: TypeScript interfaces for NodeClass resource operations
// ABOUTME: Defines list items, details, status, and watch event types

export interface NodeClassListItem {
	name: string;
	amiFamily?: string;
	role?: string;
	instanceProfile?: string;
	readyStatus?: string;
	readyMessage?: string;
	creationTimestamp?: string;
}

export interface NodeClassDetail extends NodeClassListItem {
	labels: Record<string, string>;
	annotations: Record<string, string>;
	subnetSelectorTerms?: Array<Record<string, unknown>>;
	securityGroupSelectorTerms?: Array<Record<string, unknown>>;
	userData?: string;
	tags?: Record<string, string>;
	blockDeviceMappings?: Array<Record<string, unknown>>;
	instanceStorePolicy?: string;
	metadataOptions?: Record<string, unknown>;
}

export interface NodeClassStatus {
	readyStatus?: string;
	readyMessage?: string;
	observedGeneration?: number;
	conditions: Array<{
		type: string;
		status: string;
		reason?: string;
		message?: string;
		lastTransitionTime?: string;
	}>;
	amis?: Array<{
		id?: string;
		name?: string;
		requirements?: Array<Record<string, unknown>>;
	}>;
	subnets?: Array<{
		id?: string;
		zone?: string;
	}>;
	securityGroups?: Array<{
		id?: string;
		name?: string;
	}>;
	instanceProfile?: string;
}

export interface NodeClassWatchEvent {
	type: string;
	object: NodeClassListItem;
}
