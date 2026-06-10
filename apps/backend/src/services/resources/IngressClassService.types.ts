// ABOUTME: TypeScript interfaces for IngressClass resource operations
// ABOUTME: Defines list items, details, and watch event types

export interface IngressClassListItem {
	name: string;
	controller?: string;
	isDefault: boolean;
	creationTimestamp?: string;
}

export interface IngressClassDetail extends IngressClassListItem {
	labels: Record<string, string>;
	annotations: Record<string, string>;
	parameters?: {
		apiGroup?: string;
		kind?: string;
		name?: string;
		namespace?: string;
		scope?: string;
	};
}

export interface IngressClassWatchEvent {
	type: string;
	object: IngressClassListItem;
}
