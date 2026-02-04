// ABOUTME: TypeScript interfaces for ClusterRole resource operations
// ABOUTME: Defines list items, details, and watch event types

import type { PolicyRule } from "./RoleService.types.js";

export interface AggregationRule {
	clusterRoleSelectors?: Array<{
		matchLabels?: Record<string, string>;
		matchExpressions?: Array<{
			key: string;
			operator: string;
			values?: string[];
		}>;
	}>;
}

export interface ClusterRoleListItem {
	name: string;
	ruleCount: number;
	aggregationRule?: AggregationRule;
	creationTimestamp?: string;
}

export interface ClusterRoleDetail extends ClusterRoleListItem {
	labels: Record<string, string>;
	annotations: Record<string, string>;
	rules: PolicyRule[];
}

export interface ClusterRoleWatchEvent {
	type: string;
	object: ClusterRoleListItem;
}
