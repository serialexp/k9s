// ABOUTME: TypeScript interfaces for Secret resource operations
// ABOUTME: Defines list items, details, and watch event types

export interface SecretListItem {
	name: string;
	namespace: string;
	type?: string;
	dataCount: number;
	creationTimestamp?: string;
}

export interface SecretDetail extends SecretListItem {
	labels: Record<string, string>;
	annotations: Record<string, string>;
	data: Record<string, string>;
}

export interface SecretWatchEvent {
	type: string;
	object: SecretListItem;
}
