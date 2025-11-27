// ABOUTME: TypeScript interfaces for Karpenter NodePool resource operations
// ABOUTME: Defines list items, details, and watch event types

export interface NodePoolListItem {
	name: string;
	weight?: number;
	limits?: Record<string, string>;
	readyStatus?: string;
	readyMessage?: string;
	creationTimestamp?: string;
}

export interface NodePoolDetail extends NodePoolListItem {
	labels: Record<string, string>;
	annotations: Record<string, string>;
	template?: {
		metadata?: {
			labels?: Record<string, string>;
			annotations?: Record<string, string>;
		};
		spec?: {
			nodeClassRef?: {
				group?: string;
				kind?: string;
				name?: string;
			};
			requirements?: Array<Record<string, unknown>>;
			taints?: Array<{
				key?: string;
				value?: string;
				effect?: string;
			}>;
		};
	};
	disruption?: {
		consolidationPolicy?: string;
		consolidateAfter?: string;
		budgets?: Array<Record<string, unknown>>;
	};
}

export interface NodePoolWatchEvent {
	type: string;
	object: NodePoolListItem;
}
