// ABOUTME: TypeScript interfaces for Role resource operations
// ABOUTME: Defines list items, details, and watch event types

export interface PolicyRule {
	apiGroups: string[];
	resources: string[];
	verbs: string[];
	resourceNames?: string[];
	nonResourceURLs?: string[];
}

export interface RoleListItem {
	name: string;
	namespace: string;
	ruleCount: number;
	creationTimestamp?: string;
}

export interface RoleDetail extends RoleListItem {
	labels: Record<string, string>;
	annotations: Record<string, string>;
	rules: PolicyRule[];
}

export interface RoleWatchEvent {
	type: string;
	object: RoleListItem;
}
