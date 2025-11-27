// ABOUTME: TypeScript interfaces for ConfigMap resource operations
// ABOUTME: Defines list items, details, and watch event types

export interface ConfigMapListItem {
	name: string;
	namespace: string;
	dataCount: number;
	binaryDataCount: number;
	creationTimestamp?: string;
}

export interface ConfigMapDetail extends ConfigMapListItem {
	labels: Record<string, string>;
	annotations: Record<string, string>;
	data: Record<string, string>;
	binaryData: Record<string, string>;
}

export interface ConfigMapWatchEvent {
	type: string;
	object: ConfigMapListItem;
}
