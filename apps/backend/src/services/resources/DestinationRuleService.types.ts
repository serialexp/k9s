// ABOUTME: TypeScript interfaces for Istio DestinationRule resource operations
// ABOUTME: Defines list items, details, and watch event types

export interface DestinationRuleSubset {
	name: string;
	labels: Record<string, string>;
	trafficPolicy?: Record<string, unknown>;
}

export interface DestinationRuleTrafficPolicy {
	loadBalancer?: Record<string, unknown>;
	connectionPool?: Record<string, unknown>;
	outlierDetection?: Record<string, unknown>;
	tls?: Record<string, unknown>;
}

export interface DestinationRuleListItem {
	name: string;
	namespace: string;
	host: string;
	subsetCount: number;
	subsetNames: string[];
	loadBalancer?: string;
	tlsMode?: string;
	creationTimestamp?: string;
}

export interface DestinationRuleDetail extends DestinationRuleListItem {
	labels: Record<string, string>;
	annotations: Record<string, string>;
	trafficPolicy?: DestinationRuleTrafficPolicy;
	subsets: DestinationRuleSubset[];
	exportTo: string[];
}

export interface DestinationRuleWatchEvent {
	type: string;
	object: DestinationRuleListItem;
}
