// ABOUTME: TypeScript interfaces for Helm release resource operations
// ABOUTME: Defines list items, details, and watch event types derived from Helm secret metadata

export interface HelmReleaseListItem {
	name: string;
	namespace: string;
	status: string;
	revision: number;
	chart: string;
	chartVersion: string;
	appVersion: string;
	updated?: string;
}

export interface HelmReleaseDetail extends HelmReleaseListItem {
	labels: Record<string, string>;
	annotations: Record<string, string>;
	description: string;
	notes: string;
	values: string;
}

export interface HelmReleaseWatchEvent {
	type: string;
	object: HelmReleaseListItem;
}
