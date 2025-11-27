// ABOUTME: TypeScript interfaces for StorageClass resource operations
// ABOUTME: Defines list items, details, and watch event types

export interface StorageClassListItem {
	name: string;
	provisioner: string;
	reclaimPolicy?: string;
	volumeBindingMode?: string;
	allowVolumeExpansion: boolean;
	creationTimestamp?: string;
}

export interface StorageClassDetail extends StorageClassListItem {
	labels: Record<string, string>;
	annotations: Record<string, string>;
	parameters: Record<string, string>;
	mountOptions?: string[];
	allowedTopologies?: Array<Record<string, unknown>>;
}

export interface StorageClassWatchEvent {
	type: string;
	object: StorageClassListItem;
}
