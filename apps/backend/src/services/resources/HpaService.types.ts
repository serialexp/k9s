// ABOUTME: TypeScript interfaces for HorizontalPodAutoscaler resource operations
// ABOUTME: Defines list items, details, and watch event types

export interface HpaMetricValue {
	type: string;
	name: string;
	currentValue?: string;
	currentAverageValue?: string;
	currentAverageUtilization?: number;
	targetValue?: string;
	targetAverageValue?: string;
	targetAverageUtilization?: number;
}

export interface HpaScalingPolicy {
	type: string;
	value: number;
	periodSeconds: number;
}

export interface HpaScalingRules {
	stabilizationWindowSeconds?: number;
	selectPolicy?: string;
	policies?: HpaScalingPolicy[];
}

export interface HpaBehavior {
	scaleUp?: HpaScalingRules;
	scaleDown?: HpaScalingRules;
}

export interface HpaListItem {
	name: string;
	namespace: string;
	minReplicas?: number;
	maxReplicas: number;
	currentReplicas?: number;
	desiredReplicas?: number;
	targetCPUUtilization?: number;
	targetMemoryUtilization?: number;
	currentCPUUtilization?: number;
	currentMemoryUtilization?: number;
	creationTimestamp?: string;
}

export interface HpaDetail extends HpaListItem {
	labels: Record<string, string>;
	annotations: Record<string, string>;
	scaleTargetRef: {
		apiVersion?: string;
		kind?: string;
		name?: string;
	};
	metrics: Array<Record<string, unknown>>;
	currentMetrics: HpaMetricValue[];
	lastScaleTime?: string;
	behavior?: HpaBehavior;
	conditions?: Array<{
		type: string;
		status: string;
		lastTransitionTime?: string;
		reason?: string;
		message?: string;
	}>;
}

export interface HpaWatchEvent {
	type: string;
	object: HpaListItem;
}

export interface HpaEvent {
	type: string;
	reason: string;
	message: string;
	count?: number;
	firstTimestamp?: string;
	lastTimestamp?: string;
	source?: string;
}
