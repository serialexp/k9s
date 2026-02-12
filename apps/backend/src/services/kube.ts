import { PassThrough } from "stream";
import { ClusterRoleService } from "./resources/ClusterRoleService.js";
import { ExecService } from "./resources/ExecService.js";
import { NodeExecService } from "./resources/NodeExecService.js";
import { NamespaceService } from "./resources/NamespaceService.js";
import { NodeClassService } from "./resources/NodeClassService.js";
import { NodePoolService } from "./resources/NodePoolService.js";
import { RoleService } from "./resources/RoleService.js";
import { StorageClassService } from "./resources/StorageClassService.js";
import { ConfigMapService } from "./resources/ConfigMapService.js";
import { SecretService } from "./resources/SecretService.js";
import { HpaService } from "./resources/HpaService.js";
import { PdbService } from "./resources/PdbService.js";
import { PortForwardService } from "./resources/PortForwardService.js";
import { VirtualServiceService } from "./resources/VirtualServiceService.js";
import { GatewayService } from "./resources/GatewayService.js";
import { DestinationRuleService } from "./resources/DestinationRuleService.js";
import { CRDNotInstalledError } from "./base/errors.js";
import {
	AppsV1Api,
	BatchV1Api,
	CoreV1Api,
	CoreV1Event,
	CustomObjectsApi,
	KubeConfig,
	Log,
	NetworkingV1Api,
	ObservableMiddleware,
	PolicyV1Api,
	RequestContext,
	ResponseContext,
	StorageV1Api,
	V1ConfigMap,
	V1ContainerStatus,
	V1CronJob,
	V1Deployment,
	V1DaemonSet,
	V1Endpoints,
	V1Job,
	V1Ingress,
	V1Namespace,
	V1Node,
	V1Pod,
	V1PersistentVolumeClaim,
	V1ServiceAccount,
	V1Secret,
	V1Service,
	V1StorageClass,
	V1Taint,
	V1StatefulSet,
	Watch,
} from "@kubernetes/client-node";

import type { V1NodeAffinity, V1Toleration } from "@kubernetes/client-node";

export type {
	NodeClassDetail,
	NodeClassListItem,
	NodeClassStatus,
	NodeClassWatchEvent,
} from "./resources/NodeClassService.types.js";
export type {
	NodePoolDetail,
	NodePoolListItem,
	NodePoolWatchEvent,
} from "./resources/NodePoolService.types.js";
export type {
	StorageClassDetail,
	StorageClassListItem,
	StorageClassWatchEvent,
} from "./resources/StorageClassService.types.js";
export type {
	ConfigMapDetail,
	ConfigMapListItem,
	ConfigMapWatchEvent,
} from "./resources/ConfigMapService.types.js";
export type {
	SecretDetail,
	SecretListItem,
	SecretWatchEvent,
} from "./resources/SecretService.types.js";
export type {
	HpaBehavior,
	HpaDetail,
	HpaEvent,
	HpaListItem,
	HpaMetricValue,
	HpaScalingPolicy,
	HpaScalingRules,
	HpaWatchEvent,
} from "./resources/HpaService.types.js";
export type {
	PdbDetail,
	PdbEvent,
	PdbListItem,
	PdbWatchEvent,
} from "./resources/PdbService.types.js";
export type {
	ActivePortForward,
	PortForwardRequest,
} from "./resources/PortForwardService.types.js";
export type {
	ExecRequest,
	ExecResult,
} from "./resources/ExecService.types.js";
export type {
	DebugSession,
	NodeExecResult,
} from "./resources/NodeExecService.types.js";
export type {
	PolicyRule,
	RoleDetail,
	RoleListItem,
	RoleWatchEvent,
} from "./resources/RoleService.types.js";
export type {
	AggregationRule,
	ClusterRoleDetail,
	ClusterRoleListItem,
	ClusterRoleWatchEvent,
} from "./resources/ClusterRoleService.types.js";
export type {
	NamespaceDetail,
	NamespaceEvent,
	NamespaceListItem,
	NamespaceWatchEvent,
} from "./resources/NamespaceService.types.js";
export type {
	VirtualServiceDetail,
	VirtualServiceHttpRoute,
	VirtualServiceListItem,
	VirtualServiceWatchEvent,
} from "./resources/VirtualServiceService.types.js";
export type {
	GatewayDetail,
	GatewayListItem,
	GatewayServer,
	GatewayWatchEvent,
} from "./resources/GatewayService.types.js";
export type {
	DestinationRuleDetail,
	DestinationRuleListItem,
	DestinationRuleSubset,
	DestinationRuleTrafficPolicy,
	DestinationRuleWatchEvent,
} from "./resources/DestinationRuleService.types.js";
export { CRDNotInstalledError } from "./base/errors.js";

const of = <T>(value: T) =>
	({
		promise: () => Promise.resolve(value),
		toPromise: () => Promise.resolve(value),
		pipe: () => of(value),
	}) as any;

type ResourceUsage = {
	cpu?: string;
	memory?: string;
};

// ABOUTME: Type for Kubernetes API list responses from customObjectsApi
// ABOUTME: Used to safely type the response from listNamespacedCustomObject and listClusterCustomObject
type KubernetesListResponse<T = Record<string, unknown>> = {
	items?: T[];
};

const POOL_SELECTOR_KEYS = new Set([
	"nodepool",
	"karpenter.sh/nodepool",
	"node-type",
]);

type PodPlacementConstraint = {
	key: string;
	description: string;
	topologyKey?: string;
};

type NodePodDetail = {
	name: string;
	namespace: string;
	cpuMillicores: number;
	memoryBytes: number;
	cpuRequests?: string;
	memoryRequests?: string;
	cpuUsage?: string;
	memoryUsage?: string;
	restartCount: number;
	nodeSelector?: Record<string, string>;
	nodeAffinity?: V1NodeAffinity;
	tolerations: V1Toleration[];
	labels: Record<string, string>;
	selfAntiAffinity: PodPlacementConstraint[];
	topologySpread: PodPlacementConstraint[];
	podIPs: string[];
};

export interface NodeBlocker {
	podName?: string;
	namespace?: string;
	reasons: string[];
}

export interface NodePoolBlocker {
	reason: string;
	pods: Array<{ name: string; namespace: string }>;
	nodes: string[];
}

export interface NodePoolSummary {
	name: string;
	nodeCount: number;
	zones: string[];
	instanceTypes: string[];
	instanceTypeRecommendation?: string;
	cpuRequests?: string;
	cpuAllocatable?: string;
	cpuUtilization?: number;
	cpuUsage?: string;
	cpuUsageUtilization?: number;
	memoryRequests?: string;
	memoryAllocatable?: string;
	memoryUtilization?: number;
	memoryUsage?: string;
	memoryUsageUtilization?: number;
	podCount: number;
	podCapacity: number;
	podUtilization?: number;
	blockers: NodePoolBlocker[];
}

export interface NamespaceSummary {
	name: string;
	podCount: number;
	cpuRequests?: string;
	cpuUsage?: string;
	cpuUsageUtilization?: number;
	memoryRequests?: string;
	memoryUsage?: string;
	memoryUsageUtilization?: number;
}

export interface PodListItem {
	name: string;
	namespace: string;
	phase: string | undefined;
	restarts: number;
	lastRestartTime?: string;
	containers: string[];
	nodeName?: string;
	podIP?: string;
	creationTimestamp?: string;
	cpuRequests?: string;
	memoryRequests?: string;
	cpuUsage?: string;
	memoryUsage?: string;
}

export interface NodeListItem {
	name: string;
	status: string;
	roles: string[];
	nodePool?: string;
	instanceType?: string;
	architecture?: string;
	kubeletVersion?: string;
	internalIP?: string;
	creationTimestamp?: string;
	cpuCapacity?: string;
	cpuAllocatable?: string;
	cpuUsage?: string;
	memoryCapacity?: string;
	memoryAllocatable?: string;
	memoryUsage?: string;
	podCapacity?: number;
	podAllocatable?: number;
	podCount?: number;
	podIPsAllocated?: number;
	podIPsCapacity?: number;
	cpuRequests?: string;
	memoryRequests?: string;
	totalRestarts: number;
	blockers?: NodeBlocker[];
	pods: Array<{
		name: string;
		namespace: string;
		cpuRequests?: string;
		memoryRequests?: string;
		cpuUsage?: string;
		memoryUsage?: string;
		restartCount: number;
	}>;
}

export interface NodeCondition {
	type: string;
	status: string;
	reason?: string;
	message?: string;
	lastHeartbeatTime?: string;
	lastTransitionTime?: string;
}

export interface NodeDetail extends NodeListItem {
	labels: Record<string, string>;
	annotations: Record<string, string>;
	taints: Array<{
		key: string;
		value?: string;
		effect: string;
	}>;
	conditions: NodeCondition[];
	nodeInfo: {
		machineID?: string;
		systemUUID?: string;
		bootID?: string;
		kernelVersion?: string;
		osImage?: string;
		containerRuntimeVersion?: string;
		kubeletVersion?: string;
		kubeProxyVersion?: string;
		operatingSystem?: string;
		architecture?: string;
	};
	addresses: Array<{
		type: string;
		address: string;
	}>;
	podCIDR?: string;
	podCIDRs?: string[];
	providerID?: string;
}

export interface NodeEvent {
	type: string;
	reason: string;
	message: string;
	count?: number;
	firstTimestamp?: string;
	lastTimestamp?: string;
	source?: string;
}

export interface ClusterNodeEvent extends NodeEvent {
	nodeName: string;
}

export interface PodDetail extends PodListItem {
	labels: Record<string, string>;
	annotations: Record<string, string>;
	containersStatus: Array<{
		name: string;
		ready: boolean;
		restartCount: number;
		image: string;
		state?: V1ContainerStatus["state"];
		lastState?: V1ContainerStatus["lastState"];
	}>;
	containerPorts: Array<{
		containerName: string;
		name?: string;
		containerPort: number;
		protocol?: string;
	}>;
}

export interface PodEvent {
	type: string;
	reason: string;
	message: string;
	count?: number;
	firstTimestamp?: string;
	lastTimestamp?: string;
	source?: string;
}

export interface PodStatus {
	phase: string;
	conditions: Array<{
		type: string;
		status: string;
		reason?: string;
		message?: string;
		lastTransitionTime?: string;
	}>;
	containerStatuses: Array<{
		name: string;
		ready: boolean;
		restartCount: number;
		image: string;
		imageID?: string;
		containerID?: string;
		state?: V1ContainerStatus["state"];
		lastState?: V1ContainerStatus["lastState"];
	}>;
	podIP?: string;
	hostIP?: string;
	startTime?: string;
	qosClass?: string;
}

export interface DeploymentListItem {
	name: string;
	namespace: string;
	replicas: number;
	readyReplicas: number;
	updatedReplicas: number;
	availableReplicas: number;
	creationTimestamp?: string;
}

export interface DeploymentDetail extends DeploymentListItem {
	labels: Record<string, string>;
	annotations: Record<string, string>;
	selector: Record<string, string>;
	strategy: string;
	conditions: Array<{
		type: string;
		status: string;
		reason?: string;
		message?: string;
		lastTransitionTime?: string;
		lastUpdateTime?: string;
	}>;
}

export interface DeploymentEvent {
	type: string;
	reason: string;
	message: string;
	count?: number;
	firstTimestamp?: string;
	lastTimestamp?: string;
	source?: string;
}

export interface DeploymentStatus {
	replicas: number;
	readyReplicas: number;
	updatedReplicas: number;
	availableReplicas: number;
	unavailableReplicas: number;
	conditions: Array<{
		type: string;
		status: string;
		reason?: string;
		message?: string;
		lastTransitionTime?: string;
		lastUpdateTime?: string;
	}>;
	observedGeneration?: number;
	collisionCount?: number;
}

export interface DeploymentRevision {
	revision: number;
	creationTimestamp?: string;
	changeReason?: string;
}

export interface RolloutListItem {
	name: string;
	namespace: string;
	strategy: string;
	replicas: number;
	updatedReplicas: number;
	readyReplicas: number;
	availableReplicas: number;
	currentStepIndex?: number;
	phase?: string;
	message?: string;
	stableRevision?: string;
	currentRevision?: string;
	creationTimestamp?: string;
}

export interface RolloutDetail extends RolloutListItem {
	labels: Record<string, string>;
	annotations: Record<string, string>;
	selector: Record<string, string>;
	templateLabels: Record<string, string>;
	templateAnnotations: Record<string, string>;
	services: {
		stableService?: string;
		canaryService?: string;
	};
	steps: Array<Record<string, unknown>>;
	conditions: Array<{
		type: string;
		status: string;
		reason?: string;
		message?: string;
		lastTransitionTime?: string;
		lastUpdateTime?: string;
	}>;
}

export interface RolloutEvent {
	type: string;
	reason: string;
	message: string;
	count?: number;
	firstTimestamp?: string;
	lastTimestamp?: string;
	source?: string;
}

export interface RolloutStatus {
	replicas: number;
	updatedReplicas: number;
	readyReplicas: number;
	availableReplicas: number;
	unavailableReplicas: number;
	currentStepIndex?: number;
	phase?: string;
	message?: string;
	currentPodHash?: string;
	stableRS?: string;
	canaryRS?: string;
	pauseStartTime?: string;
	abortedAt?: string;
	conditions: Array<{
		type: string;
		status: string;
		reason?: string;
		message?: string;
		lastTransitionTime?: string;
		lastUpdateTime?: string;
	}>;
}

export interface RolloutWatchEvent {
	type: string;
	object: RolloutListItem;
}

export interface DaemonSetListItem {
	name: string;
	namespace: string;
	desiredNumberScheduled: number;
	currentNumberScheduled: number;
	numberReady: number;
	numberAvailable: number;
	creationTimestamp?: string;
}

export interface DaemonSetDetail extends DaemonSetListItem {
	labels: Record<string, string>;
	annotations: Record<string, string>;
	selector: Record<string, string>;
	updateStrategy: string;
	maxUnavailable?: string;
	minReadySeconds?: number;
	conditions: Array<{
		type: string;
		status: string;
		reason?: string;
		message?: string;
		lastTransitionTime?: string;
		lastUpdateTime?: string;
	}>;
}

export interface DaemonSetEvent {
	type: string;
	reason: string;
	message: string;
	count?: number;
	firstTimestamp?: string;
	lastTimestamp?: string;
	source?: string;
}

export interface DaemonSetStatus {
	desiredNumberScheduled: number;
	currentNumberScheduled: number;
	updatedNumberScheduled: number;
	numberReady: number;
	numberAvailable: number;
	numberUnavailable: number;
	numberMisscheduled: number;
	conditions: Array<{
		type: string;
		status: string;
		reason?: string;
		message?: string;
		lastTransitionTime?: string;
		lastUpdateTime?: string;
	}>;
	observedGeneration?: number;
	collisionCount?: number;
}

export interface DaemonSetWatchEvent {
	type: string;
	object: DaemonSetListItem;
}

export interface StatefulSetListItem {
	name: string;
	namespace: string;
	replicas: number;
	readyReplicas: number;
	updatedReplicas: number;
	currentReplicas: number;
	creationTimestamp?: string;
}

export interface StatefulSetDetail extends StatefulSetListItem {
	labels: Record<string, string>;
	annotations: Record<string, string>;
	selector: Record<string, string>;
	serviceName?: string;
	updateStrategy: string;
	podManagementPolicy: string;
	conditions: Array<{
		type: string;
		status: string;
		reason?: string;
		message?: string;
		lastTransitionTime?: string;
	}>;
}

export interface StatefulSetEvent {
	type: string;
	reason: string;
	message: string;
	count?: number;
	firstTimestamp?: string;
	lastTimestamp?: string;
	source?: string;
}

export interface StatefulSetStatus {
	replicas: number;
	readyReplicas: number;
	updatedReplicas: number;
	currentReplicas: number;
	availableReplicas: number;
	conditions: Array<{
		type: string;
		status: string;
		reason?: string;
		message?: string;
		lastTransitionTime?: string;
	}>;
	observedGeneration?: number;
	collisionCount?: number;
}

export interface StatefulSetWatchEvent {
	type: string;
	object: StatefulSetListItem;
}

export interface JobListItem {
	name: string;
	namespace: string;
	completions?: number;
	succeeded?: number;
	failed?: number;
	active?: number;
	startTime?: string;
	completionTime?: string;
	creationTimestamp?: string;
}

export interface JobDetail extends JobListItem {
	labels: Record<string, string>;
	annotations: Record<string, string>;
	selector: Record<string, string>;
	parallelism?: number;
	backoffLimit?: number;
	ttlSecondsAfterFinished?: number;
}

export interface JobEvent {
	type: string;
	reason: string;
	message: string;
	count?: number;
	firstTimestamp?: string;
	lastTimestamp?: string;
	source?: string;
}

export interface JobStatus {
	startTime?: string;
	completionTime?: string;
	active?: number;
	succeeded?: number;
	failed?: number;
	conditions: Array<{
		type: string;
		status: string;
		reason?: string;
		message?: string;
		lastProbeTime?: string;
		lastTransitionTime?: string;
	}>;
}

export interface JobWatchEvent {
	type: string;
	object: JobListItem;
}

export interface ServiceAccountListItem {
	name: string;
	namespace: string;
	secretCount: number;
	imagePullSecretCount: number;
	creationTimestamp?: string;
}

export interface ServiceAccountDetail extends ServiceAccountListItem {
	labels: Record<string, string>;
	annotations: Record<string, string>;
	secrets: Array<{
		name: string;
	}>;
	imagePullSecrets: Array<{
		name: string;
	}>;
}

export interface ServiceAccountWatchEvent {
	type: string;
	object: ServiceAccountListItem;
}

export interface ArgoApplicationListItem {
	name: string;
	namespace: string;
	project?: string;
	syncStatus?: string;
	healthStatus?: string;
	revision?: string;
	destinationServer?: string;
	destinationNamespace?: string;
	repoURL?: string;
	targetRevision?: string;
	lastSyncedAt?: string;
	creationTimestamp?: string;
}

export interface ArgoApplicationDetail extends ArgoApplicationListItem {
	labels: Record<string, string>;
	annotations: Record<string, string>;
	sources: Array<{
		repoURL?: string;
		path?: string;
		chart?: string;
		targetRevision?: string;
		helm?: {
			valueFiles?: string[];
			parameters?: Array<{ name?: string; value?: string }>;
		};
		directory?: {
			recurse?: boolean;
			include?: string;
			exclude?: string;
		};
	}>;
	destination?: {
		server?: string;
		namespace?: string;
		name?: string;
	};
	syncPolicy?: unknown;
	externalUrls: string[];
}

export interface ArgoApplicationStatus {
	syncStatus?: string;
	syncComparedTo?: string;
	healthStatus?: string;
	revision?: string;
	reconciledAt?: string;
	observedAt?: string;
	operationState?: {
		phase?: string;
		message?: string;
		startedAt?: string;
		finishedAt?: string;
	};
	summary?: {
		images: string[];
		externalURLs: string[];
	};
	history: Array<{
		id?: number;
		revision?: string;
		deployStartedAt?: string;
		deployFinishedAt?: string;
		source?: {
			repoURL?: string;
			targetRevision?: string;
			path?: string;
			chart?: string;
		};
		destServer?: string;
		destNamespace?: string;
	}>;
}

export interface ArgoApplicationWatchEvent {
	type: string;
	object: ArgoApplicationListItem;
}

export interface ServiceListItem {
	name: string;
	namespace: string;
	type: string;
	clusterIP?: string;
	externalIP?: string;
	ports: Array<{
		name?: string;
		port: number;
		targetPort: string | number;
		protocol: string;
	}>;
	ready: boolean | null;
	creationTimestamp?: string;
}

export interface ServiceDetail extends ServiceListItem {
	labels: Record<string, string>;
	annotations: Record<string, string>;
	selector: Record<string, string>;
	sessionAffinity?: string;
	loadBalancerIP?: string;
	externalTrafficPolicy?: string;
}

export interface ScaledObjectListItem {
	name: string;
	namespace: string;
	targetKind: string;
	targetName: string;
	minReplicas?: number;
	maxReplicas?: number;
	currentReplicas?: number;
	desiredReplicas?: number;
	triggerCount: number;
	ready: boolean;
	active: boolean;
	creationTimestamp?: string;
}

export interface ScaledObjectDetail extends ScaledObjectListItem {
	labels: Record<string, string>;
	annotations: Record<string, string>;
	pollingInterval?: number;
	cooldownPeriod?: number;
	idleReplicaCount?: number;
	triggers: Array<{
		type: string;
		name?: string;
		metadata: Record<string, unknown>;
	}>;
	conditions: Array<{
		type: string;
		status: string;
		reason?: string;
		message?: string;
	}>;
}

export interface CronJobListItem {
	name: string;
	namespace: string;
	schedule: string;
	suspend: boolean;
	activeJobs: number;
	lastScheduleTime?: string;
	lastSuccessfulTime?: string;
	concurrencyPolicy?: string;
	creationTimestamp?: string;
}

export interface CronJobDetail extends CronJobListItem {
	labels: Record<string, string>;
	annotations: Record<string, string>;
	startingDeadlineSeconds?: number;
	successfulJobsHistoryLimit?: number;
	failedJobsHistoryLimit?: number;
	jobTemplate: {
		containers: Array<{
			name?: string;
			image?: string;
			command?: string[];
			args?: string[];
		}>;
		restartPolicy?: string;
	};
}

export interface IngressListItem {
	name: string;
	namespace: string;
	className?: string;
	hosts: string[];
	serviceCount: number;
	tlsHosts: string[];
	creationTimestamp?: string;
}

export interface IngressDetail extends IngressListItem {
	labels: Record<string, string>;
	annotations: Record<string, string>;
	finalizers: string[];
	rules: Array<{
		host?: string;
		paths: Array<{
			path?: string;
			pathType?: string;
			serviceName?: string;
			servicePort?: string | number;
		}>;
	}>;
	tls: Array<{
		hosts: string[];
		secretName?: string;
	}>;
}

export interface ExternalSecretListItem {
	name: string;
	namespace: string;
	secretName?: string;
	refreshInterval?: string;
	storeKind?: string;
	storeName?: string;
	readyStatus?: string;
	readyMessage?: string;
	syncedAt?: string;
	creationTimestamp?: string;
}

export interface ExternalSecretDetail extends ExternalSecretListItem {
	labels: Record<string, string>;
	annotations: Record<string, string>;
	target: {
		creationPolicy?: string;
		deletionPolicy?: string;
		name?: string;
		template?: Record<string, unknown>;
	};
	data: Array<{
		secretKey?: string;
		remoteRef?: Record<string, unknown>;
	}>;
	dataFrom: Array<Record<string, unknown>>;
}

export interface ExternalSecretEvent {
	type: string;
	reason: string;
	message: string;
	count?: number;
	firstTimestamp?: string;
	lastTimestamp?: string;
	source?: string;
}

export interface ExternalSecretStatus {
	readyStatus?: string;
	readyMessage?: string;
	syncedAt?: string;
	refreshTime?: string;
	observedGeneration?: number;
	conditions: Array<{
		type: string;
		status: string;
		reason?: string;
		message?: string;
		lastTransitionTime?: string;
	}>;
}

export interface ExternalSecretWatchEvent {
	type: string;
	object: ExternalSecretListItem;
}

export interface SecretStoreListItem {
	name: string;
	namespace: string;
	providerType?: string;
	providerSummary?: string;
	refreshInterval?: string;
	readyStatus?: string;
	readyMessage?: string;
	creationTimestamp?: string;
}

export interface SecretStoreDetail extends SecretStoreListItem {
	labels: Record<string, string>;
	annotations: Record<string, string>;
	provider: Record<string, unknown> | undefined;
	retrySettings: Record<string, unknown> | undefined;
}

export interface SecretStoreEvent {
	type: string;
	reason: string;
	message: string;
	count?: number;
	firstTimestamp?: string;
	lastTimestamp?: string;
	source?: string;
}

export interface SecretStoreStatus {
	readyStatus?: string;
	readyMessage?: string;
	observedGeneration?: number;
	conditions: Array<{
		type: string;
		status: string;
		reason?: string;
		message?: string;
		lastTransitionTime?: string;
	}>;
}

export interface SecretStoreWatchEvent {
	type: string;
	object: SecretStoreListItem;
}

export interface InstalledApplication {
	name: string;
	description: string;
	logoUrl: string;
	logoBgColor?: string;
	category?: string;
	docsUrl?: string;
	detectedBy: string[];
	installed: boolean;
}

export interface CustomResourceDefinitionListItem {
	name: string;
	group: string;
	version: string;
	scope: string;
	kind: string;
	shortNames: string[];
	categories: string[];
	established: boolean;
	namesAccepted: boolean;
	terminating: boolean;
	storageVersions: Array<{
		name: string;
		served: boolean;
		storage: boolean;
	}>;
	creationTimestamp?: string;
}

export interface CustomResourceDefinitionDetail
	extends CustomResourceDefinitionListItem {
	labels: Record<string, string>;
	annotations: Record<string, string>;
	conditions: Array<{
		type: string;
		status: string;
		reason?: string;
		message?: string;
		lastTransitionTime?: string;
	}>;
	acceptedNames: Record<string, unknown>;
	versions: Array<{
		name: string;
		served: boolean;
		storage: boolean;
		schema?: Record<string, unknown>;
		subresources?: Record<string, unknown>;
		additionalPrinterColumns?: Array<Record<string, unknown>>;
	}>;
}

export interface CustomResourceDefinitionWatchEvent {
	type: string;
	object: CustomResourceDefinitionListItem;
}

export interface PersistentVolumeClaimListItem {
	name: string;
	namespace: string;
	status: string;
	storageClass?: string;
	capacity?: string;
	requestedStorage?: string;
	accessModes: string[];
	volumeName?: string;
	creationTimestamp?: string;
}

export interface PersistentVolumeClaimDetail
	extends PersistentVolumeClaimListItem {
	labels: Record<string, string>;
	annotations: Record<string, string>;
	volumeMode?: string;
	storageRequest?: string;
	storageLimit?: string;
	selector?: Record<string, unknown>;
	conditions: Array<{
		type?: string;
		status?: string;
		reason?: string;
		message?: string;
		lastTransitionTime?: string;
	}>;
}

export class KubeService {
	private kubeConfig: KubeConfig;
	private coreApi: CoreV1Api;
	private appsApi: AppsV1Api;
	private batchApi: BatchV1Api;
	private networkingApi: NetworkingV1Api;
	private policyApi: PolicyV1Api;
	private storageApi: StorageV1Api;
	private customObjectsApi: CustomObjectsApi;
	private watch: Watch;
	private log: Log;
	private crdCache: Map<string, boolean> = new Map();
	private static readonly IPV4_REGEX = /^(?:\d{1,3}\.){3}\d{1,3}$/;

	private clusterRoleService: ClusterRoleService;
	private execService: ExecService;
	private namespaceService: NamespaceService;
	private nodeExecService: NodeExecService;
	private nodeClassService: NodeClassService;
	private nodePoolService: NodePoolService;
	private roleService: RoleService;
	private storageClassService: StorageClassService;
	private configMapService: ConfigMapService;
	private secretService: SecretService;
	private hpaService: HpaService;
	private pdbService: PdbService;
	private portForwardService: PortForwardService;
	private virtualServiceService: VirtualServiceService;
	private gatewayService: GatewayService;
	private destinationRuleService: DestinationRuleService;

	constructor() {
		this.kubeConfig = new KubeConfig();
		this.kubeConfig.loadFromDefault();
		this.coreApi = this.kubeConfig.makeApiClient(CoreV1Api);
		this.appsApi = this.kubeConfig.makeApiClient(AppsV1Api);
		this.batchApi = this.kubeConfig.makeApiClient(BatchV1Api);
		this.networkingApi = this.kubeConfig.makeApiClient(NetworkingV1Api);
		this.policyApi = this.kubeConfig.makeApiClient(PolicyV1Api);
		this.storageApi = this.kubeConfig.makeApiClient(StorageV1Api);
		this.customObjectsApi = this.kubeConfig.makeApiClient(CustomObjectsApi);
		this.watch = new Watch(this.kubeConfig);
		this.log = new Log(this.kubeConfig);

		this.clusterRoleService = new ClusterRoleService(this.kubeConfig);
		this.execService = new ExecService(this.kubeConfig);
		this.namespaceService = new NamespaceService(this.kubeConfig);
		this.nodeExecService = new NodeExecService(this.kubeConfig);
		this.nodeClassService = new NodeClassService(this.kubeConfig);
		this.nodePoolService = new NodePoolService(this.kubeConfig);
		this.roleService = new RoleService(this.kubeConfig);
		this.storageClassService = new StorageClassService(this.kubeConfig);
		this.configMapService = new ConfigMapService(this.kubeConfig);
		this.secretService = new SecretService(this.kubeConfig);
		this.hpaService = new HpaService(this.kubeConfig);
		this.pdbService = new PdbService(this.kubeConfig);
		this.portForwardService = new PortForwardService(this.kubeConfig);
		this.virtualServiceService = new VirtualServiceService(this.kubeConfig);
		this.gatewayService = new GatewayService(this.kubeConfig);
		this.destinationRuleService = new DestinationRuleService(this.kubeConfig);
	}

	refreshCredentials() {
		this.kubeConfig.loadFromDefault();
		this.coreApi = this.kubeConfig.makeApiClient(CoreV1Api);
		this.appsApi = this.kubeConfig.makeApiClient(AppsV1Api);
		this.batchApi = this.kubeConfig.makeApiClient(BatchV1Api);
		this.networkingApi = this.kubeConfig.makeApiClient(NetworkingV1Api);
		this.policyApi = this.kubeConfig.makeApiClient(PolicyV1Api);
		this.storageApi = this.kubeConfig.makeApiClient(StorageV1Api);
		this.customObjectsApi = this.kubeConfig.makeApiClient(CustomObjectsApi);
		this.watch = new Watch(this.kubeConfig);
		this.log = new Log(this.kubeConfig);

		this.clusterRoleService.refreshCredentials();
		this.execService.refreshCredentials();
		this.namespaceService.refreshCredentials();
		this.nodeExecService.refreshCredentials();
		this.nodeClassService.refreshCredentials();
		this.nodePoolService.refreshCredentials();
		this.roleService.refreshCredentials();
		this.storageClassService.refreshCredentials();
		this.configMapService.refreshCredentials();
		this.secretService.refreshCredentials();
		this.hpaService.refreshCredentials();
		this.pdbService.refreshCredentials();
		this.portForwardService.refreshCredentials();
		this.virtualServiceService.refreshCredentials();
		this.gatewayService.refreshCredentials();
		this.destinationRuleService.refreshCredentials();
	}

	private async withCredentialRetry<T>(fn: () => Promise<T>): Promise<T> {
		try {
			return await fn();
		} catch (error) {
			const err = error as { statusCode?: number };
			if (err.statusCode === 401) {
				this.refreshCredentials();
				return await fn();
			}
			throw error;
		}
	}

	getContexts() {
		return this.kubeConfig.getContexts().map((ctx) => ({
			name: ctx.name,
			cluster: ctx.cluster,
			user: ctx.user,
			namespace: ctx.namespace,
			isCurrent: ctx.name === this.kubeConfig.getCurrentContext(),
		}));
	}

	getCurrentContext() {
		return this.kubeConfig.getCurrentContext();
	}

	setCurrentContext(name: string) {
		const contextNames = this.kubeConfig.getContexts().map((ctx) => ctx.name);
		if (!contextNames.includes(name)) {
			throw new Error(`Context ${name} not found`);
		}
		this.kubeConfig.setCurrentContext(name);
		this.coreApi = this.kubeConfig.makeApiClient(CoreV1Api);
		this.appsApi = this.kubeConfig.makeApiClient(AppsV1Api);
		this.batchApi = this.kubeConfig.makeApiClient(BatchV1Api);
		this.networkingApi = this.kubeConfig.makeApiClient(NetworkingV1Api);
		this.policyApi = this.kubeConfig.makeApiClient(PolicyV1Api);
		this.storageApi = this.kubeConfig.makeApiClient(StorageV1Api);
		this.customObjectsApi = this.kubeConfig.makeApiClient(CustomObjectsApi);
		this.watch = new Watch(this.kubeConfig);
		this.log = new Log(this.kubeConfig);

		this.clusterRoleService.refreshCredentials();
		this.execService.refreshCredentials();
		this.namespaceService.refreshCredentials();
		this.nodeExecService.refreshCredentials();
		this.nodeClassService.refreshCredentials();
		this.nodePoolService.refreshCredentials();
		this.roleService.refreshCredentials();
		this.storageClassService.refreshCredentials();
		this.configMapService.refreshCredentials();
		this.secretService.refreshCredentials();
		this.hpaService.refreshCredentials();
		this.pdbService.refreshCredentials();
		this.portForwardService.stopAllForwards();
		this.portForwardService.refreshCredentials();
		this.virtualServiceService.refreshCredentials();
		this.gatewayService.refreshCredentials();
		this.destinationRuleService.refreshCredentials();
	}

	// Namespace methods - delegated to NamespaceService
	async listNamespaces() {
		return this.namespaceService.listNamespaces();
	}

	async listNamespaceNames() {
		return this.withCredentialRetry(async () => {
			const list = await this.coreApi.listNamespace();
			return (list.items ?? [])
				.map((ns: V1Namespace) => ns.metadata?.name)
				.filter((name): name is string => Boolean(name));
		});
	}

	async getNamespace(name: string) {
		return this.namespaceService.getNamespace(name);
	}

	async getNamespaceManifest(name: string) {
		return this.namespaceService.getNamespaceManifest(name);
	}

	async getNamespaceEvents(name: string, limit?: number) {
		return this.namespaceService.getNamespaceEvents(name, limit);
	}

	async deleteNamespace(name: string) {
		return this.namespaceService.deleteNamespace(name);
	}

	async createNamespace(name: string) {
		return this.withCredentialRetry(async () => {
			await this.coreApi.createNamespace({
				body: {
					apiVersion: "v1",
					kind: "Namespace",
					metadata: { name },
				},
			});
		});
	}

	async streamNamespaces(
		onData: (data: string) => void,
		onError: (err: unknown) => void,
		signal?: AbortSignal,
	) {
		return this.namespaceService.streamNamespaces(onData, onError, signal);
	}

	async streamNamespaceNames(
		onData: (data: string) => void,
		onError: (err: unknown) => void,
		signal?: AbortSignal,
	) {
		const abortController = new AbortController();
		if (signal) {
			const handleAbort = () => abortController.abort(signal.reason);
			signal.addEventListener("abort", handleAbort, { once: true });
			abortController.signal.addEventListener("abort", () => {
				signal.removeEventListener("abort", handleAbort);
			});
		}

		let requestController: AbortController;

		const startWatch = async (
			retryOnAuth: boolean = true,
		): Promise<AbortController> => {
			try {
				return await this.watch.watch(
					"/api/v1/namespaces",
					{},
					(type, obj) => {
						try {
							const namespace = obj as V1Namespace;
							const name = namespace.metadata?.name;
							if (name) {
								onData(
									JSON.stringify({
										type,
										object: name,
									}),
								);
							}
						} catch (err) {
							onError(err);
						}
					},
					(err) => {
						if (err && abortController.signal.aborted === false) {
							onError(err);
						}
					},
				);
			} catch (error) {
				const err = error as { statusCode?: number };
				if (err.statusCode === 401 && retryOnAuth) {
					this.refreshCredentials();
					return await startWatch(false);
				}
				throw error;
			}
		};

		try {
			requestController = await startWatch();
		} catch (error) {
			onError(error);
			abortController.abort();
			throw error;
		}

		abortController.signal.addEventListener("abort", () => {
			requestController.abort();
		});

		return () => {
			abortController.abort();
		};
	}

	async listPods(namespace: string) {
		return this.withCredentialRetry(async () => {
			const podList = await this.coreApi.listNamespacedPod({ namespace });
			const usageByPod = await this.loadPodMetrics(namespace);
			return (podList.items ?? []).map((pod: V1Pod) => {
				const name = pod.metadata?.name ?? "";
				return this.mapPodListItem(
					pod,
					name ? usageByPod.get(name) : undefined,
				);
			});
		});
	}

	async listNodes(): Promise<{
		nodes: NodeListItem[];
		pools: NodePoolSummary[];
	}> {
		return this.withCredentialRetry(async () => {
			const [
				nodeList,
				usageByNode,
				podDetailsByNode,
				podMetricsByNamespace,
				nodeEvents,
				networkingWarnings,
				vpcWarnings,
			] = await Promise.all([
				this.coreApi.listNode(),
				this.loadNodeMetrics(),
				this.loadNodePodDetails(),
				this.loadAllPodMetrics(),
				this.loadNodeEvents(),
				this.loadNetworkingWarnings(),
				this.loadVpcCniWarnings(),
			]);

			const nodes: NodeListItem[] = [];
			const poolMetrics: Array<{
				pool: string;
				nodeName: string;
				zone?: string;
				instanceType?: string;
				blockers: NodeBlocker[];
				cpuRequests: number;
				memoryRequests: number;
				cpuAllocatable: number;
				memoryAllocatable: number;
				cpuUsage: number;
				memoryUsage: number;
				podCount: number;
				podCapacity: number;
			}> = [];

			const selfAntiCounts = new Map<string, number>();
			const spreadCounts = new Map<
				string,
				{ count: number; topologyKey?: string }
			>();

			for (const podDetails of podDetailsByNode.values()) {
				for (const pod of podDetails) {
					const antiSeen = new Set<string>();
					for (const info of pod.selfAntiAffinity) {
						if (antiSeen.has(info.key)) continue;
						selfAntiCounts.set(
							info.key,
							(selfAntiCounts.get(info.key) ?? 0) + 1,
						);
						antiSeen.add(info.key);
					}
					const spreadSeen = new Set<string>();
					for (const info of pod.topologySpread) {
						if (spreadSeen.has(info.key)) continue;
						const existing = spreadCounts.get(info.key);
						if (existing) {
							existing.count += 1;
						} else {
							spreadCounts.set(info.key, {
								count: 1,
								topologyKey: info.topologyKey,
							});
						}
						spreadSeen.add(info.key);
					}
				}
			}

			for (const node of nodeList.items ?? []) {
				const name = node.metadata?.name ?? "";
				if (!name) {
					continue;
				}

				const usage = usageByNode.get(name);
				const podDetails = podDetailsByNode.get(name) ?? [];
				const pool = this.extractNodePool(node.metadata?.labels) ?? "default";
				const pods = podDetails.map((pod) => {
					const podUsage = podMetricsByNamespace
						.get(pod.namespace)
						?.get(pod.name);
					return {
						name: pod.name,
						namespace: pod.namespace,
						cpuRequests: pod.cpuRequests,
						memoryRequests: pod.memoryRequests,
						cpuUsage: podUsage?.cpu,
						memoryUsage: podUsage?.memory,
						restartCount: pod.restartCount,
					};
				});
				const totalRestarts = podDetails.reduce(
					(acc, pod) => acc + pod.restartCount,
					0,
				);
				const totals = this.aggregatePodResources(podDetails);
				const cpuAllocatableMillicores = this.parseCpuQuantity(
					node.status?.allocatable?.cpu,
				);
				const memoryAllocatableBytes = this.parseMemoryQuantity(
					node.status?.allocatable?.memory,
				);
				const podCapacity = Number.parseInt(
					node.status?.capacity?.pods ?? "",
					10,
				);
				const podAllocatable = Number.parseInt(
					node.status?.allocatable?.pods ?? "",
					10,
				);
				const allocatedIPs = new Set<string>();
				for (const pod of podDetails) {
					for (const ip of pod.podIPs ?? []) {
						allocatedIPs.add(ip);
					}
				}
				const podIpCapacity = this.estimateNodePodIpCapacity(node);
				const blockers = this.calculateNodeBlockers(
					node,
					podDetails,
					pool,
					cpuAllocatableMillicores,
					memoryAllocatableBytes,
					selfAntiCounts,
					spreadCounts,
				);

				const eventMessages = nodeEvents.get(name) ?? [];
				for (const message of eventMessages) {
					blockers.push({ reasons: [message] });
				}

				nodes.push(
					this.mapNodeListItem(node, usage, {
						pool,
						podCount: podDetails.length,
						podCapacity: Number.isFinite(podCapacity) ? podCapacity : undefined,
						podAllocatable: Number.isFinite(podAllocatable)
							? podAllocatable
							: undefined,
						podIPsAllocated: allocatedIPs.size,
						podIPsCapacity: podIpCapacity,
						cpuRequestsMillicores: totals.cpuMillicores,
						memoryRequestsBytes: totals.memoryBytes,
						totalRestarts,
						pods,
						blockers,
					}),
				);

				poolMetrics.push({
					pool,
					nodeName: name,
					zone:
						node.metadata?.labels?.["topology.kubernetes.io/zone"] ??
						node.metadata?.labels?.["failure-domain.beta.kubernetes.io/zone"],
					instanceType: this.extractInstanceType(node.metadata?.labels),
					blockers,
					cpuRequests: totals.cpuMillicores,
					memoryRequests: totals.memoryBytes,
					cpuAllocatable: cpuAllocatableMillicores,
					memoryAllocatable: memoryAllocatableBytes,
					cpuUsage: usage?.cpu ? this.parseCpuQuantity(usage.cpu) : 0,
					memoryUsage: usage?.memory
						? this.parseMemoryQuantity(usage.memory)
						: 0,
					podCount: podDetails.length,
					podCapacity: Number.isFinite(podAllocatable) ? podAllocatable : 0,
				});
			}

			const pools = this.buildNodePoolSummaries(poolMetrics, [
				...networkingWarnings,
				...vpcWarnings,
			]);

			return { nodes, pools };
		});
	}

	async getNode(name: string): Promise<NodeDetail> {
		return this.withCredentialRetry(async () => {
			const [node, usageByNode, podDetailsByNode, podMetricsByNamespace] =
				await Promise.all([
					this.coreApi.readNode({ name }),
					this.loadNodeMetrics(),
					this.loadNodePodDetails(),
					this.loadAllPodMetrics(),
				]);

			const usage = usageByNode.get(name);
			const podDetails = podDetailsByNode.get(name) ?? [];
			const pool = this.extractNodePool(node.metadata?.labels) ?? "default";

			const pods = podDetails.map((pod) => {
				const podUsage = podMetricsByNamespace
					.get(pod.namespace)
					?.get(pod.name);
				return {
					name: pod.name,
					namespace: pod.namespace,
					cpuRequests: pod.cpuRequests,
					memoryRequests: pod.memoryRequests,
					cpuUsage: podUsage?.cpu,
					memoryUsage: podUsage?.memory,
					restartCount: pod.restartCount,
				};
			});
			const totalRestarts = podDetails.reduce(
				(acc, pod) => acc + pod.restartCount,
				0,
			);

			const totals = this.aggregatePodResources(podDetails);
			const cpuAllocatableMillicores = this.parseCpuQuantity(
				node.status?.allocatable?.cpu,
			);
			const memoryAllocatableBytes = this.parseMemoryQuantity(
				node.status?.allocatable?.memory,
			);
			const podCapacity = Number.parseInt(
				node.status?.capacity?.pods ?? "",
				10,
			);
			const podAllocatable = Number.parseInt(
				node.status?.allocatable?.pods ?? "",
				10,
			);
			const allocatedIPs = new Set<string>();
			for (const pod of podDetails) {
				for (const ip of pod.podIPs ?? []) {
					allocatedIPs.add(ip);
				}
			}
			const podIpCapacity = this.estimateNodePodIpCapacity(node);

			const baseItem = this.mapNodeListItem(node, usage, {
				pool,
				podCount: podDetails.length,
				podCapacity: Number.isFinite(podCapacity) ? podCapacity : undefined,
				podAllocatable: Number.isFinite(podAllocatable)
					? podAllocatable
					: undefined,
				podIPsAllocated: allocatedIPs.size,
				podIPsCapacity: podIpCapacity,
				cpuRequestsMillicores: totals.cpuMillicores,
				memoryRequestsBytes: totals.memoryBytes,
				totalRestarts,
				pods,
				blockers: [],
			});

			const conditions: NodeCondition[] = (node.status?.conditions ?? []).map(
				(c) => ({
					type: c.type ?? "",
					status: c.status ?? "",
					reason: c.reason ?? undefined,
					message: c.message ?? undefined,
					lastHeartbeatTime: c.lastHeartbeatTime?.toISOString(),
					lastTransitionTime: c.lastTransitionTime?.toISOString(),
				}),
			);

			const nodeInfo = node.status?.nodeInfo;
			const addresses = (node.status?.addresses ?? []).map((a) => ({
				type: a.type ?? "",
				address: a.address ?? "",
			}));

			const taints = (node.spec?.taints ?? []).map((t) => ({
				key: t.key ?? "",
				value: t.value ?? undefined,
				effect: t.effect ?? "",
			}));

			return {
				...baseItem,
				labels: node.metadata?.labels ?? {},
				annotations: node.metadata?.annotations ?? {},
				taints,
				conditions,
				nodeInfo: {
					machineID: nodeInfo?.machineID ?? undefined,
					systemUUID: nodeInfo?.systemUUID ?? undefined,
					bootID: nodeInfo?.bootID ?? undefined,
					kernelVersion: nodeInfo?.kernelVersion ?? undefined,
					osImage: nodeInfo?.osImage ?? undefined,
					containerRuntimeVersion: nodeInfo?.containerRuntimeVersion ?? undefined,
					kubeletVersion: nodeInfo?.kubeletVersion ?? undefined,
					kubeProxyVersion: nodeInfo?.kubeProxyVersion ?? undefined,
					operatingSystem: nodeInfo?.operatingSystem ?? undefined,
					architecture: nodeInfo?.architecture ?? undefined,
				},
				addresses,
				podCIDR: node.spec?.podCIDR ?? undefined,
				podCIDRs: node.spec?.podCIDRs ?? undefined,
				providerID: node.spec?.providerID ?? undefined,
			};
		});
	}

	async getNodeManifest(name: string): Promise<string> {
		return this.withCredentialRetry(async () => {
			const node = await this.coreApi.readNode({ name });
			const manifest = this.sanitizeManifest(node);
			return JSON.stringify(manifest, null, 2);
		});
	}

	async getNodeEvents(name: string): Promise<NodeEvent[]> {
		return this.withCredentialRetry(async () => {
			const events = await this.coreApi.listEventForAllNamespaces({
				fieldSelector: `involvedObject.name=${name},involvedObject.kind=Node`,
			});

			return (events.items ?? [])
				.map((event: CoreV1Event) => ({
					type: event.type ?? "",
					reason: event.reason ?? "",
					message: event.message ?? "",
					count: event.count,
					firstTimestamp: event.firstTimestamp?.toISOString(),
					lastTimestamp: event.lastTimestamp?.toISOString(),
					source: event.source?.component ?? event.reportingComponent,
				}))
				.sort((a, b) => {
					const timeA = new Date(
						a.lastTimestamp ?? a.firstTimestamp ?? "",
					).getTime();
					const timeB = new Date(
						b.lastTimestamp ?? b.firstTimestamp ?? "",
					).getTime();
					return timeB - timeA;
				});
		});
	}

	async listAllNodeEvents(): Promise<ClusterNodeEvent[]> {
		return this.withCredentialRetry(async () => {
			const events = await this.coreApi.listEventForAllNamespaces({
				fieldSelector: "involvedObject.kind=Node",
			});

			return (events.items ?? [])
				.map((event: CoreV1Event) => ({
					nodeName: event.involvedObject?.name ?? "unknown",
					type: event.type ?? "",
					reason: event.reason ?? "",
					message: event.message ?? "",
					count: event.count,
					firstTimestamp: event.firstTimestamp?.toISOString(),
					lastTimestamp: event.lastTimestamp?.toISOString(),
					source: event.source?.component ?? event.reportingComponent,
				}))
				.sort((a, b) => {
					const timeA = new Date(
						a.lastTimestamp ?? a.firstTimestamp ?? "",
					).getTime();
					const timeB = new Date(
						b.lastTimestamp ?? b.firstTimestamp ?? "",
					).getTime();
					return timeB - timeA;
				});
		});
	}

	async cordonNode(name: string): Promise<void> {
		return this.withCredentialRetry(async () => {
			const setHeaderMiddleware = (
				key: string,
				value: string,
			): ObservableMiddleware => ({
				pre: (request: RequestContext) => {
					request.setHeaderParam(key, value);
					return of(request);
				},
				post: (response: ResponseContext) => of(response),
			});

			await this.coreApi.patchNode(
				{ name, body: { spec: { unschedulable: true } } },
				{
					middleware: [
						setHeaderMiddleware(
							"Content-Type",
							"application/strategic-merge-patch+json",
						),
					],
					middlewareMergeStrategy: "append",
				},
			);
		});
	}

	async uncordonNode(name: string): Promise<void> {
		return this.withCredentialRetry(async () => {
			const setHeaderMiddleware = (
				key: string,
				value: string,
			): ObservableMiddleware => ({
				pre: (request: RequestContext) => {
					request.setHeaderParam(key, value);
					return of(request);
				},
				post: (response: ResponseContext) => of(response),
			});

			await this.coreApi.patchNode(
				{ name, body: { spec: { unschedulable: false } } },
				{
					middleware: [
						setHeaderMiddleware(
							"Content-Type",
							"application/strategic-merge-patch+json",
						),
					],
					middlewareMergeStrategy: "append",
				},
			);
		});
	}

	async drainNode(name: string): Promise<{ evictedPods: string[] }> {
		return this.withCredentialRetry(async () => {
			const setHeaderMiddleware = (
				key: string,
				value: string,
			): ObservableMiddleware => ({
				pre: (request: RequestContext) => {
					request.setHeaderParam(key, value);
					return of(request);
				},
				post: (response: ResponseContext) => of(response),
			});

			await this.coreApi.patchNode(
				{ name, body: { spec: { unschedulable: true } } },
				{
					middleware: [
						setHeaderMiddleware(
							"Content-Type",
							"application/strategic-merge-patch+json",
						),
					],
					middlewareMergeStrategy: "append",
				},
			);

			const podList = await this.coreApi.listPodForAllNamespaces({
				fieldSelector: `spec.nodeName=${name}`,
			});

			const evictedPods: string[] = [];
			const evictionErrors: string[] = [];

			for (const pod of podList.items ?? []) {
				const podName = pod.metadata?.name;
				const namespace = pod.metadata?.namespace;
				if (!podName || !namespace) continue;

				const ownerKind = pod.metadata?.ownerReferences?.[0]?.kind;
				if (ownerKind === "DaemonSet") continue;

				if (
					pod.metadata?.annotations?.[
						"kubernetes.io/config.mirror"
					]
				) {
					continue;
				}

				try {
					await this.coreApi.deleteNamespacedPod({
						name: podName,
						namespace,
						body: {
							apiVersion: "policy/v1",
							kind: "DeleteOptions",
							gracePeriodSeconds: 30,
						},
					});
					evictedPods.push(`${namespace}/${podName}`);
				} catch (err) {
					const error = err as { body?: { message?: string } };
					evictionErrors.push(
						`${namespace}/${podName}: ${error.body?.message ?? "unknown error"}`,
					);
				}
			}

			if (evictionErrors.length > 0) {
				console.warn("Some pods could not be evicted:", evictionErrors);
			}

			return { evictedPods };
		});
	}

	async listNamespaceSummaries(): Promise<NamespaceSummary[]> {
		return this.withCredentialRetry(async () => {
			const [namespaceList, podList] = await Promise.all([
				this.coreApi.listNamespace(),
				this.coreApi.listPodForAllNamespaces(),
			]);
			const namespaces = namespaceList.items ?? [];
			const pods = podList.items ?? [];

			const namespaceMetrics = new Map<
				string,
				{
					podCount: number;
					cpuRequests: number;
					memoryRequests: number;
					cpuUsage: number;
					memoryUsage: number;
				}
			>();

			for (const ns of namespaces) {
				const name = ns.metadata?.name;
				if (name) {
					namespaceMetrics.set(name, {
						podCount: 0,
						cpuRequests: 0,
						memoryRequests: 0,
						cpuUsage: 0,
						memoryUsage: 0,
					});
				}
			}

			for (const pod of pods) {
				const namespace = pod.metadata?.namespace ?? "default";
				if (!namespaceMetrics.has(namespace)) {
					namespaceMetrics.set(namespace, {
						podCount: 0,
						cpuRequests: 0,
						memoryRequests: 0,
						cpuUsage: 0,
						memoryUsage: 0,
					});
				}

				const metrics = namespaceMetrics.get(namespace)!;
				metrics.podCount += 1;

				const totals = this.calculatePodRequestTotals(pod);
				metrics.cpuRequests += totals.cpuMillicores;
				metrics.memoryRequests += totals.memoryBytes;
			}

			const allNamespaceUsage = await Promise.all(
				Array.from(namespaceMetrics.keys()).map(async (namespace) => {
					try {
						const usageByPod = await this.loadPodMetrics(namespace);
						return { namespace, usageByPod };
					} catch {
						return {
							namespace,
							usageByPod: new Map<string, ResourceUsage>(),
						};
					}
				}),
			);

			for (const { namespace, usageByPod } of allNamespaceUsage) {
				const metrics = namespaceMetrics.get(namespace);
				if (!metrics) continue;

				for (const usage of usageByPod.values()) {
					if (usage.cpu) {
						metrics.cpuUsage += this.parseCpuQuantity(usage.cpu);
					}
					if (usage.memory) {
						metrics.memoryUsage += this.parseMemoryQuantity(usage.memory);
					}
				}
			}

			return Array.from(namespaceMetrics.entries())
				.map(([name, metrics]) => ({
					name,
					podCount: metrics.podCount,
					cpuRequests:
						metrics.cpuRequests > 0
							? this.formatCpuQuantity(metrics.cpuRequests)
							: undefined,
					cpuUsage:
						metrics.cpuUsage > 0
							? this.formatCpuQuantity(metrics.cpuUsage)
							: undefined,
					cpuUsageUtilization:
						metrics.cpuRequests > 0
							? metrics.cpuUsage / metrics.cpuRequests
							: undefined,
					memoryRequests:
						metrics.memoryRequests > 0
							? this.formatMemoryQuantity(metrics.memoryRequests)
							: undefined,
					memoryUsage:
						metrics.memoryUsage > 0
							? this.formatMemoryQuantity(metrics.memoryUsage)
							: undefined,
					memoryUsageUtilization:
						metrics.memoryRequests > 0
							? metrics.memoryUsage / metrics.memoryRequests
							: undefined,
				}))
				.sort((a, b) => {
					const aTotal =
						namespaceMetrics.get(a.name)!.cpuRequests +
						namespaceMetrics.get(a.name)!.memoryRequests;
					const bTotal =
						namespaceMetrics.get(b.name)!.cpuRequests +
						namespaceMetrics.get(b.name)!.memoryRequests;
					return bTotal - aTotal;
				});
		});
	}

	private async loadPodMetrics(
		namespace: string,
	): Promise<Map<string, ResourceUsage>> {
		try {
			const response = await this.customObjectsApi.listNamespacedCustomObject({
				group: "metrics.k8s.io",
				version: "v1beta1",
				namespace,
				plural: "pods",
			});

			const list = response as unknown as {
				items?: Array<{
					metadata?: { name?: string | null };
					containers?: Array<{
						usage?: { cpu?: string | null; memory?: string | null } | null;
					} | null>;
				}>;
			};

			const usageByPod = new Map<string, ResourceUsage>();

			for (const item of list.items ?? []) {
				const podName = item?.metadata?.name ?? undefined;
				if (!podName) continue;

				let totalCpuMillicores = 0;
				let totalMemoryBytes = 0;

				for (const container of item?.containers ?? []) {
					totalCpuMillicores += this.parseCpuQuantity(
						container?.usage?.cpu ?? undefined,
					);
					totalMemoryBytes += this.parseMemoryQuantity(
						container?.usage?.memory ?? undefined,
					);
				}

				usageByPod.set(podName, {
					cpu:
						totalCpuMillicores > 0
							? this.formatCpuQuantity(totalCpuMillicores)
							: undefined,
					memory:
						totalMemoryBytes > 0
							? this.formatMemoryQuantity(totalMemoryBytes)
							: undefined,
				});
			}

			return usageByPod;
		} catch (error) {
			const err = error as { statusCode?: number };
			if (err.statusCode === 401) {
				throw error;
			}
			return new Map();
		}
	}

	private async loadAllPodMetrics(): Promise<
		Map<string, Map<string, ResourceUsage>>
	> {
		try {
			const response = await this.customObjectsApi.listClusterCustomObject({
				group: "metrics.k8s.io",
				version: "v1beta1",
				plural: "pods",
			});

			const list = response as unknown as {
				items?: Array<{
					metadata?: { name?: string | null; namespace?: string | null };
					containers?: Array<{
						usage?: { cpu?: string | null; memory?: string | null } | null;
					} | null>;
				}>;
			};

			const usageByNamespaceAndPod = new Map<
				string,
				Map<string, ResourceUsage>
			>();

			for (const item of list.items ?? []) {
				const podName = item?.metadata?.name ?? undefined;
				const namespace = item?.metadata?.namespace ?? "default";
				if (!podName) continue;

				let totalCpuMillicores = 0;
				let totalMemoryBytes = 0;

				for (const container of item?.containers ?? []) {
					totalCpuMillicores += this.parseCpuQuantity(
						container?.usage?.cpu ?? undefined,
					);
					totalMemoryBytes += this.parseMemoryQuantity(
						container?.usage?.memory ?? undefined,
					);
				}

				if (!usageByNamespaceAndPod.has(namespace)) {
					usageByNamespaceAndPod.set(namespace, new Map());
				}
				usageByNamespaceAndPod.get(namespace)!.set(podName, {
					cpu:
						totalCpuMillicores > 0
							? this.formatCpuQuantity(totalCpuMillicores)
							: undefined,
					memory:
						totalMemoryBytes > 0
							? this.formatMemoryQuantity(totalMemoryBytes)
							: undefined,
				});
			}

			return usageByNamespaceAndPod;
		} catch (error) {
			const err = error as { statusCode?: number };
			if (err.statusCode === 401) {
				throw error;
			}
			return new Map();
		}
	}

	private async loadNodeMetrics(): Promise<Map<string, ResourceUsage>> {
		try {
			const response = await this.customObjectsApi.listClusterCustomObject({
				group: "metrics.k8s.io",
				version: "v1beta1",
				plural: "nodes",
			});

			const list = response as unknown as {
				items?: Array<{
					metadata?: { name?: string | null };
					usage?: { cpu?: string | null; memory?: string | null } | null;
				}>;
			};

			const usageByNode = new Map<string, ResourceUsage>();

			for (const item of list.items ?? []) {
				const nodeName = item?.metadata?.name ?? undefined;
				if (!nodeName) continue;

				const cpuMillicores = this.parseCpuQuantity(
					item?.usage?.cpu ?? undefined,
				);
				const memoryBytes = this.parseMemoryQuantity(
					item?.usage?.memory ?? undefined,
				);

				usageByNode.set(nodeName, {
					cpu:
						cpuMillicores > 0
							? this.formatCpuQuantity(cpuMillicores)
							: undefined,
					memory:
						memoryBytes > 0
							? this.formatMemoryQuantity(memoryBytes)
							: undefined,
				});
			}

			return usageByNode;
		} catch (error) {
			const err = error as { statusCode?: number };
			if (err.statusCode === 401) {
				throw error;
			}
			return new Map();
		}
	}

	private async loadNodePodDetails(): Promise<Map<string, NodePodDetail[]>> {
		try {
			const podList = await this.coreApi.listPodForAllNamespaces();
			const podsByNode = new Map<string, NodePodDetail[]>();

			for (const pod of podList.items ?? []) {
				const nodeName = pod.spec?.nodeName;
				if (!nodeName) continue;

				const { cpuMillicores, memoryBytes } =
					this.calculatePodRequestTotals(pod);
				const labels = pod.metadata?.labels ?? {};
				const selfAntiAffinity = this.extractSelfAntiAffinity(pod, labels);
				const topologySpread = this.extractTopologySpread(pod, labels);
				const podIPs = (pod.status?.podIPs ?? [])
					.map((entry) => entry?.ip)
					.filter((ip): ip is string => Boolean(ip));
				if (podIPs.length === 0 && pod.status?.podIP) {
					podIPs.push(pod.status.podIP);
				}
				const restartCount = (pod.status?.containerStatuses ?? []).reduce(
					(acc, cs) => acc + (cs.restartCount ?? 0),
					0,
				);
				const details: NodePodDetail = {
					name: pod.metadata?.name ?? "unknown",
					namespace: pod.metadata?.namespace ?? "default",
					cpuMillicores,
					memoryBytes,
					cpuRequests:
						cpuMillicores > 0
							? this.formatCpuQuantity(cpuMillicores)
							: undefined,
					memoryRequests:
						memoryBytes > 0
							? this.formatMemoryQuantity(memoryBytes)
							: undefined,
					restartCount,
					nodeSelector: pod.spec?.nodeSelector ?? undefined,
					nodeAffinity: pod.spec?.affinity?.nodeAffinity,
					tolerations: (pod.spec?.tolerations ?? []) as V1Toleration[],
					labels,
					selfAntiAffinity,
					topologySpread,
					podIPs,
				};

				if (!podsByNode.has(nodeName)) {
					podsByNode.set(nodeName, []);
				}
				podsByNode.get(nodeName)!.push(details);
			}

			return podsByNode;
		} catch (error) {
			const err = error as { statusCode?: number };
			if (err.statusCode === 401) {
				throw error;
			}
			return new Map<string, NodePodDetail[]>();
		}
	}

	private extractSelfAntiAffinity(
		pod: V1Pod,
		labels: Record<string, string>,
	): PodPlacementConstraint[] {
		const affinity = pod.spec?.affinity?.podAntiAffinity;
		if (!affinity) return [];

		const constraints = new Map<string, PodPlacementConstraint>();
		const processTerm = (term?: {
			labelSelector?: {
				matchLabels?: Record<string, string>;
				matchExpressions?: Array<{
					key?: string;
					operator?: string;
					values?: string[];
				}>;
			};
			topologyKey?: string;
		}) => {
			if (!term) return;
			const selector = term.labelSelector;
			if (!selector) return;
			const pairs: string[] = [];
			for (const [key, value] of Object.entries(selector.matchLabels ?? {})) {
				if (labels[key] === value) {
					pairs.push(`${key}=${value}`);
				}
			}
			for (const expr of selector.matchExpressions ?? []) {
				if (!expr?.key || !expr.values?.length) continue;
				const operator = expr.operator ?? "In";
				if (operator !== "In") continue;
				const podValue = labels[expr.key];
				if (podValue && expr.values.includes(podValue)) {
					pairs.push(`${expr.key}=${podValue}`);
				}
			}
			if (!pairs.length) return;
			const description = pairs.sort().join(", ");
			const key = `${pod.metadata?.namespace ?? ""}:${description}`;
			constraints.set(key, {
				key,
				description,
				topologyKey: term.topologyKey,
			});
		};

		for (const term of affinity.requiredDuringSchedulingIgnoredDuringExecution ??
			[]) {
			processTerm(
				term as {
					labelSelector?: {
						matchLabels?: Record<string, string>;
						matchExpressions?: Array<{
							key?: string;
							operator?: string;
							values?: string[];
						}>;
					};
					topologyKey?: string;
				},
			);
		}
		for (const preferred of affinity.preferredDuringSchedulingIgnoredDuringExecution ??
			[]) {
			processTerm(preferred?.podAffinityTerm);
		}

		return Array.from(constraints.values());
	}

	private extractTopologySpread(
		pod: V1Pod,
		labels: Record<string, string>,
	): PodPlacementConstraint[] {
		const constraints = new Map<string, PodPlacementConstraint>();

		for (const constraint of pod.spec?.topologySpreadConstraints ?? []) {
			if (
				(constraint.whenUnsatisfiable ?? "").toLowerCase() === "scheduleanyway"
			) {
				continue;
			}
			const selector = constraint?.labelSelector;
			if (!selector) continue;
			const pairs: string[] = [];
			for (const [key, value] of Object.entries(selector.matchLabels ?? {})) {
				if (labels[key] === value) {
					pairs.push(`${key}=${value}`);
				}
			}
			for (const expr of selector.matchExpressions ?? []) {
				if (!expr?.key || !expr.values?.length) continue;
				const operator = expr.operator ?? "In";
				if (operator !== "In") continue;
				const podValue = labels[expr.key];
				if (podValue && expr.values.includes(podValue)) {
					pairs.push(`${expr.key}=${podValue}`);
				}
			}
			if (!pairs.length) continue;
			const description = pairs.sort().join(", ");
			const key = `${pod.metadata?.namespace ?? ""}:${description}`;
			constraints.set(key, {
				key,
				description,
				topologyKey: constraint.topologyKey,
			});
		}

		return Array.from(constraints.values());
	}

	private async loadNodeEvents(): Promise<Map<string, string[]>> {
		try {
			const response = await this.coreApi.listEventForAllNamespaces({
				fieldSelector: "involvedObject.kind=Node",
			});
			const eventsByNode = new Map<string, Set<string>>();

			for (const event of response.items ?? []) {
				const nodeName = event.involvedObject?.name;
				if (!nodeName) continue;

				const reason = event.reason ?? "";
				const message = event.message ?? "";

				if (reason === "Unconsolidatable" && message) {
					if (!eventsByNode.has(nodeName)) {
						eventsByNode.set(nodeName, new Set<string>());
					}
					if (message.includes("non-empty consolidation disabled")) {
						eventsByNode
							.get(nodeName)!
							.add(
								"Auto scaling is configured to keep non-empty system nodes; consolidation disabled",
							);
					} else {
						eventsByNode.get(nodeName)!.add(message);
					}
				}
			}

			const result = new Map<string, string[]>();
			for (const [node, messages] of eventsByNode) {
				result.set(node, Array.from(messages));
			}
			return result;
		} catch (error) {
			const err = error as { statusCode?: number };
			if (err.statusCode === 401) {
				throw error;
			}
			return new Map<string, string[]>();
		}
	}

	private async loadNetworkingWarnings(): Promise<string[]> {
		try {
			const response = await this.coreApi.listEventForAllNamespaces();
			const warnings = new Set<string>();
			const patterns = [
				/InsufficientFreeAddresses/i,
				/no available ip/i,
				/IP addresses not available/i,
				/failed to allocate (eni )?ip/i,
			];

			for (const event of response.items ?? []) {
				const message = event.message ?? "";
				if (!message) continue;
				if (patterns.some((pattern) => pattern.test(message))) {
					warnings.add(message);
				}
			}

			return Array.from(warnings);
		} catch (error) {
			const err = error as { statusCode?: number };
			if (err.statusCode === 401) {
				throw error;
			}
			return [];
		}
	}

	private async loadVpcCniWarnings(): Promise<string[]> {
		try {
			const ds = await this.appsApi.readNamespacedDaemonSet({
				name: "aws-node",
				namespace: "kube-system",
			});

			const container = ds.spec?.template?.spec?.containers?.find(
				(c) => c?.name === "aws-node",
			);
			if (!container || !container.env) return [];

			const envMap = new Map<string, string>();
			for (const env of container.env) {
				if (!env?.name || typeof env.value === "undefined") continue;
				envMap.set(env.name, env.value);
			}

			const warnings: string[] = [];

			const prefixDelegation = (
				envMap.get("ENABLE_PREFIX_DELEGATION") ?? ""
			).toLowerCase();
			const warmPrefixTarget = Number.parseInt(
				envMap.get("WARM_PREFIX_TARGET") ?? "0",
				10,
			);
			if (prefixDelegation === "false" && warmPrefixTarget > 0) {
				warnings.push(
					"VPC CNI prefix delegation disabled: each pod consumes a VPC IP; consider enabling ENABLE_PREFIX_DELEGATION",
				);
			}

			const enableIpv4 = (envMap.get("ENABLE_IPv4") ?? "").toLowerCase();
			if (enableIpv4 === "true" && prefixDelegation === "false") {
				warnings.push(
					"VPC CNI using IPv4 only without prefix delegation; pod density limited by subnet IP pool",
				);
			}

			return Array.from(new Set(warnings));
		} catch (error) {
			const err = error as { statusCode?: number };
			if (err.statusCode === 401) {
				throw error;
			}
			return [];
		}
	}

	private aggregatePodResources(pods: NodePodDetail[]): {
		cpuMillicores: number;
		memoryBytes: number;
	} {
		return pods.reduce(
			(acc, pod) => {
				acc.cpuMillicores += pod.cpuMillicores;
				acc.memoryBytes += pod.memoryBytes;
				return acc;
			},
			{ cpuMillicores: 0, memoryBytes: 0 },
		);
	}

	private estimateNodePodIpCapacity(node: V1Node): number | undefined {
		const cidrs = new Set<string>();
		if (node.spec?.podCIDR) {
			cidrs.add(node.spec.podCIDR);
		}
		for (const cidr of node.spec?.podCIDRs ?? []) {
			if (cidr) cidrs.add(cidr);
		}
		let total = 0;
		for (const cidr of cidrs) {
			const count = this.countIPv4AddressesInCIDR(cidr);
			if (typeof count === "number") {
				total += count;
			}
		}
		if (total > 0) {
			return total;
		}

		const annotation =
			node.metadata?.annotations?.["vpc.amazonaws.com/pod-ips"];
		if (annotation) {
			try {
				const parsed = JSON.parse(annotation) as unknown;
				const ips = new Set<string>();
				this.collectIPv4Strings(parsed, ips);
				if (ips.size > 0) {
					return ips.size;
				}
			} catch (error) {
				console.warn(
					"Failed to parse vpc.amazonaws.com/pod-ips annotation",
					error,
				);
			}
		}

		return undefined;
	}

	private countIPv4AddressesInCIDR(cidr?: string): number | undefined {
		if (!cidr) return undefined;
		const [ip, prefixStr] = cidr.split("/");
		const prefix = Number(prefixStr);
		if (!prefixStr || Number.isNaN(prefix) || prefix < 0 || prefix > 32) {
			return undefined;
		}
		const octets = ip.split(".");
		if (
			octets.length !== 4 ||
			!octets.every((octet) => {
				const value = Number(octet);
				return Number.isInteger(value) && value >= 0 && value <= 255;
			})
		) {
			return undefined;
		}
		const hostBits = 32 - prefix;
		if (hostBits <= 0) {
			return 1;
		}
		return Math.pow(2, hostBits);
	}

	private collectIPv4Strings(value: unknown, collector: Set<string>): void {
		if (typeof value === "string") {
			if (KubeService.IPV4_REGEX.test(value)) {
				collector.add(value);
			}
			return;
		}
		if (Array.isArray(value)) {
			for (const item of value) {
				this.collectIPv4Strings(item, collector);
			}
			return;
		}
		if (value && typeof value === "object") {
			for (const item of Object.values(value)) {
				this.collectIPv4Strings(item, collector);
			}
		}
	}

	private calculateNodeBlockers(
		node: V1Node,
		pods: NodePodDetail[],
		pool: string,
		cpuAllocatableMillicores: number,
		memoryAllocatableBytes: number,
		selfAntiCounts: Map<string, number>,
		spreadCounts: Map<string, { count: number; topologyKey?: string }>,
	): NodeBlocker[] {
		const labels = node.metadata?.labels ?? {};
		const taints = (node.spec?.taints ?? []) as V1Taint[];
		const blockers: NodeBlocker[] = [];

		for (const pod of pods) {
			const reasons: string[] = [];

			if (pod.nodeSelector) {
				for (const [key, value] of Object.entries(pod.nodeSelector)) {
					if (POOL_SELECTOR_KEYS.has(key) && labels[key] === value) {
						reasons.push(`nodeSelector ${key}=${value}`);
					}
				}
			}

			const affinityTerms =
				pod.nodeAffinity?.requiredDuringSchedulingIgnoredDuringExecution
					?.nodeSelectorTerms ?? [];
			for (const term of affinityTerms) {
				for (const expression of term.matchExpressions ?? []) {
					if (!POOL_SELECTOR_KEYS.has(expression.key)) continue;
					const nodeValue = labels[expression.key];
					if (!nodeValue) continue;
					if (
						(expression.operator === "In" ||
							expression.operator === "Equals") &&
						(expression.values ?? []).includes(nodeValue)
					) {
						reasons.push(
							`nodeAffinity ${expression.key} in ${(expression.values ?? []).join(", ")}`,
						);
					}
				}
			}

			for (const taint of taints) {
				if (!taint.key || !taint.effect) continue;
				if (taint.effect !== "NoSchedule" && taint.effect !== "NoExecute")
					continue;
				const matchesTaint = (pod.tolerations ?? []).some((toleration) => {
					if (toleration.key !== taint.key) return false;
					if (toleration.effect && toleration.effect !== taint.effect)
						return false;
					if (toleration.operator === "Exists") return true;
					if (!toleration.operator || toleration.operator === "Equal") {
						return toleration.value === taint.value;
					}
					return false;
				});
				if (matchesTaint) {
					reasons.push(
						`tolerates taint ${taint.key}${taint.value ? `=${taint.value}` : ""} (${taint.effect})`,
					);
				}
			}

			if (cpuAllocatableMillicores > 0 && pod.cpuMillicores > 0) {
				const ratio = pod.cpuMillicores / cpuAllocatableMillicores;
				if (ratio >= 0.5) {
					reasons.push(
						`CPU request ~${this.formatPercentage(ratio)} of allocatable`,
					);
				}
			}

			if (memoryAllocatableBytes > 0 && pod.memoryBytes > 0) {
				const ratio = pod.memoryBytes / memoryAllocatableBytes;
				if (ratio >= 0.5) {
					reasons.push(
						`Memory request ~${this.formatPercentage(ratio)} of allocatable`,
					);
				}
			}

			for (const info of pod.selfAntiAffinity) {
				const count = selfAntiCounts.get(info.key) ?? 0;
				if (count > 1) {
					const topologyText = info.topologyKey
						? ` across ${info.topologyKey}`
						: "";
					reasons.push(
						`Self anti-affinity (${info.description}) keeps ${count} replicas${topologyText}`,
					);
				}
			}

			for (const info of pod.topologySpread) {
				const summary = spreadCounts.get(info.key);
				if (summary && summary.count > 1) {
					const topologyKey = info.topologyKey ?? summary.topologyKey;
					const topologyText = topologyKey ? ` over ${topologyKey}` : "";
					reasons.push(
						`Topology spread (${info.description}) maintains ${summary.count} replicas${topologyText}`,
					);
				}
			}

			if (reasons.length) {
				blockers.push({
					podName: pod.name,
					namespace: pod.namespace,
					reasons: Array.from(new Set(reasons)),
				});
			}
		}

		return blockers;
	}

	private buildNodePoolSummaries(
		metrics: Array<{
			pool: string;
			nodeName: string;
			zone?: string;
			instanceType?: string;
			blockers: NodeBlocker[];
			cpuRequests: number;
			memoryRequests: number;
			cpuAllocatable: number;
			memoryAllocatable: number;
			cpuUsage: number;
			memoryUsage: number;
			podCount: number;
			podCapacity: number;
		}>,
		globalWarnings: string[] = [],
	): NodePoolSummary[] {
		const builders = new Map<
			string,
			{
				name: string;
				nodes: Set<string>;
				zones: Set<string>;
				instanceTypes: Set<string>;
				cpuRequests: number;
				memoryRequests: number;
				cpuAllocatable: number;
				memoryAllocatable: number;
				cpuUsage: number;
				memoryUsage: number;
				podCount: number;
				podCapacity: number;
				blockers: Map<
					string,
					{
						reason: string;
						pods: Map<string, { name: string; namespace: string }>;
						nodes: Set<string>;
					}
				>;
			}
		>();

		for (const metric of metrics) {
			const poolName = metric.pool || "default";
			if (!builders.has(poolName)) {
				builders.set(poolName, {
					name: poolName,
					nodes: new Set<string>(),
					zones: new Set<string>(),
					instanceTypes: new Set<string>(),
					cpuRequests: 0,
					memoryRequests: 0,
					cpuAllocatable: 0,
					memoryAllocatable: 0,
					cpuUsage: 0,
					memoryUsage: 0,
					podCount: 0,
					podCapacity: 0,
					blockers: new Map(),
				});
			}
			const builder = builders.get(poolName)!;
			builder.nodes.add(metric.nodeName);
			if (metric.zone) {
				builder.zones.add(metric.zone);
			}
			if (metric.instanceType) {
				builder.instanceTypes.add(metric.instanceType);
			}
			builder.cpuRequests += metric.cpuRequests;
			builder.memoryRequests += metric.memoryRequests;
			builder.cpuAllocatable += metric.cpuAllocatable;
			builder.memoryAllocatable += metric.memoryAllocatable;
			builder.cpuUsage += metric.cpuUsage;
			builder.memoryUsage += metric.memoryUsage;
			builder.podCount += metric.podCount;
			builder.podCapacity += metric.podCapacity;

			for (const blocker of metric.blockers) {
				for (const reason of blocker.reasons) {
					if (!builder.blockers.has(reason)) {
						builder.blockers.set(reason, {
							reason,
							pods: new Map<string, { name: string; namespace: string }>(),
							nodes: new Set<string>(),
						});
					}
					const entry = builder.blockers.get(reason)!;
					entry.nodes.add(metric.nodeName);
					if (blocker.podName && blocker.namespace) {
						const key = `${blocker.namespace}/${blocker.podName}`;
						entry.pods.set(key, {
							name: blocker.podName,
							namespace: blocker.namespace,
						});
					}
				}
			}
		}

		for (const builder of builders.values()) {
			for (const warning of globalWarnings) {
				if (!builder.blockers.has(warning)) {
					builder.blockers.set(warning, {
						reason: warning,
						pods: new Map<string, { name: string; namespace: string }>(),
						nodes: new Set<string>(),
					});
				}
				const entry = builder.blockers.get(warning)!;
				builder.nodes.forEach((nodeName) => entry.nodes.add(nodeName));
			}
		}

		return Array.from(builders.values())
			.map((builder) => {
				const cpuAllocatable = builder.cpuAllocatable;
				const memoryAllocatable = builder.memoryAllocatable;
				const podCapacity = builder.podCapacity;
				const instanceTypes = Array.from(builder.instanceTypes).sort();
				const instanceTypeRecommendation =
					this.generateInstanceTypeRecommendation(
						instanceTypes,
						builder.cpuUsage,
						builder.memoryUsage,
					);

				return {
					name: builder.name,
					nodeCount: builder.nodes.size,
					zones: Array.from(builder.zones).sort(),
					instanceTypes,
					instanceTypeRecommendation,
					cpuRequests:
						builder.cpuRequests > 0
							? this.formatCpuQuantity(builder.cpuRequests)
							: undefined,
					cpuAllocatable:
						cpuAllocatable > 0
							? this.formatCpuQuantity(cpuAllocatable)
							: undefined,
					cpuUtilization:
						cpuAllocatable > 0
							? builder.cpuRequests / cpuAllocatable
							: undefined,
					memoryRequests:
						builder.memoryRequests > 0
							? this.formatMemoryQuantity(builder.memoryRequests)
							: undefined,
					memoryAllocatable:
						memoryAllocatable > 0
							? this.formatMemoryQuantity(memoryAllocatable)
							: undefined,
					memoryUtilization:
						memoryAllocatable > 0
							? builder.memoryRequests / memoryAllocatable
							: undefined,
					cpuUsage:
						builder.cpuUsage > 0
							? this.formatCpuQuantity(builder.cpuUsage)
							: undefined,
					cpuUsageUtilization:
						builder.cpuRequests > 0
							? builder.cpuUsage / builder.cpuRequests
							: undefined,
					memoryUsage:
						builder.memoryUsage > 0
							? this.formatMemoryQuantity(builder.memoryUsage)
							: undefined,
					memoryUsageUtilization:
						builder.memoryRequests > 0
							? builder.memoryUsage / builder.memoryRequests
							: undefined,
					podCount: builder.podCount,
					podCapacity,
					podUtilization:
						podCapacity > 0 ? builder.podCount / podCapacity : undefined,
					blockers: Array.from(builder.blockers.values()).map((entry) => ({
						reason: entry.reason,
						nodes: Array.from(entry.nodes).sort(),
						pods: Array.from(entry.pods.values()),
					})),
				};
			})
			.sort((a, b) => a.name.localeCompare(b.name));
	}

	private formatPercentage(ratio: number, fractionDigits: number = 0): string {
		const percentage = ratio * 100;
		return `${percentage.toFixed(fractionDigits)}%`;
	}

	async getPod(namespace: string, podName: string): Promise<PodDetail> {
		return this.withCredentialRetry(async () => {
			const pod = await this.coreApi.readNamespacedPod({
				name: podName,
				namespace,
			});
			return this.mapPodDetail(pod);
		});
	}

	async getPodManifest(namespace: string, podName: string): Promise<string> {
		return this.withCredentialRetry(async () => {
			const pod = await this.coreApi.readNamespacedPod({
				name: podName,
				namespace,
			});
			const manifest = this.sanitizeManifest(pod);
			return JSON.stringify(manifest, null, 2);
		});
	}

	async getPodEvents(namespace: string, podName: string): Promise<PodEvent[]> {
		return this.withCredentialRetry(async () => {
			const events = await this.coreApi.listNamespacedEvent({
				namespace,
				fieldSelector: `involvedObject.name=${podName},involvedObject.kind=Pod`,
			});

			return (events.items ?? [])
				.map((event: CoreV1Event) => ({
					type: event.type ?? "",
					reason: event.reason ?? "",
					message: event.message ?? "",
					count: event.count,
					firstTimestamp: event.firstTimestamp?.toISOString(),
					lastTimestamp: event.lastTimestamp?.toISOString(),
					source: event.source?.component ?? event.reportingComponent,
				}))
				.sort((a, b) => {
					const timeA = new Date(
						a.lastTimestamp ?? a.firstTimestamp ?? "",
					).getTime();
					const timeB = new Date(
						b.lastTimestamp ?? b.firstTimestamp ?? "",
					).getTime();
					return timeB - timeA;
				});
		});
	}

	async getPodStatus(namespace: string, podName: string): Promise<PodStatus> {
		return this.withCredentialRetry(async () => {
			const pod = await this.coreApi.readNamespacedPod({
				name: podName,
				namespace,
			});

			return {
				phase: pod.status?.phase ?? "",
				conditions: (pod.status?.conditions ?? []).map((condition) => ({
					type: condition.type ?? "",
					status: condition.status ?? "",
					reason: condition.reason,
					message: condition.message,
					lastTransitionTime: condition.lastTransitionTime?.toISOString(),
				})),
				containerStatuses: (pod.status?.containerStatuses ?? []).map((cs) => ({
					name: cs.name ?? "",
					ready: Boolean(cs.ready),
					restartCount: cs.restartCount ?? 0,
					image: cs.image ?? "",
					imageID: cs.imageID,
					containerID: cs.containerID,
					state: cs.state,
					lastState: cs.lastState,
				})),
				podIP: pod.status?.podIP,
				hostIP: pod.status?.hostIP,
				startTime: pod.status?.startTime?.toISOString(),
				qosClass: pod.status?.qosClass,
			};
		});
	}

	async deletePod(namespace: string, podName: string): Promise<void> {
		return this.withCredentialRetry(async () => {
			await this.coreApi.deleteNamespacedPod({ name: podName, namespace });
		});
	}

	async evictPod(namespace: string, podName: string): Promise<void> {
		return this.withCredentialRetry(async () => {
			await this.coreApi.deleteNamespacedPod({
				name: podName,
				namespace,
				body: {
					gracePeriodSeconds: 30,
				},
			});
		});
	}

	async streamPods(
		namespace: string,
		onData: (data: string) => void,
		onError: (err: unknown) => void,
		signal?: AbortSignal,
	) {
		const abortController = new AbortController();
		if (signal) {
			const handleAbort = () => abortController.abort(signal.reason);
			signal.addEventListener("abort", handleAbort, { once: true });
			abortController.signal.addEventListener("abort", () => {
				signal.removeEventListener("abort", handleAbort);
			});
		}

		let requestController: AbortController;
		let metricsInterval: ReturnType<typeof setInterval> | undefined;
		let usageByPod = new Map<string, ResourceUsage>();
		const podCache = new Map<string, V1Pod>();

		const refreshMetrics = async () => {
			try {
				usageByPod = await this.withCredentialRetry(() =>
					this.loadPodMetrics(namespace),
				);
				// Push updated metrics for all cached pods
				for (const [name, pod] of podCache) {
					onData(
						JSON.stringify({
							type: "MODIFIED",
							object: this.mapPodListItem(pod, usageByPod.get(name)),
						}),
					);
				}
			} catch {
				usageByPod = new Map();
			}
		};

		const startWatch = async (
			retryOnAuth: boolean = true,
		): Promise<AbortController> => {
			try {
				return await this.watch.watch(
					`/api/v1/namespaces/${namespace}/pods`,
					{},
					(type, obj) => {
						try {
							const pod = obj as V1Pod;
							const name = pod.metadata?.name ?? "";
							// Maintain pod cache for metrics updates
							if (type === "DELETED") {
								podCache.delete(name);
							} else if (name) {
								podCache.set(name, pod);
							}
							onData(
								JSON.stringify({
									type,
									object: this.mapPodListItem(
										pod,
										name ? usageByPod.get(name) : undefined,
									),
								}),
							);
						} catch (err) {
							onError(err);
						}
					},
					(err) => {
						if (err && abortController.signal.aborted === false) {
							onError(err);
						}
					},
				);
			} catch (error) {
				const err = error as { statusCode?: number };
				if (err.statusCode === 401 && retryOnAuth) {
					this.refreshCredentials();
					return await startWatch(false);
				}
				throw error;
			}
		};

		try {
			await refreshMetrics();
			requestController = await startWatch();
			metricsInterval = setInterval(() => {
				void refreshMetrics();
			}, 15000);
		} catch (error) {
			onError(error);
			abortController.abort();
			throw error;
		}

		abortController.signal.addEventListener("abort", () => {
			requestController.abort();
			if (metricsInterval) {
				clearInterval(metricsInterval);
			}
		});

		return () => {
			abortController.abort();
		};
	}

	streamPodLogs(options: {
		namespace: string;
		pod: string;
		container: string;
		follow?: boolean;
		tailLines?: number;
		previous?: boolean;
		signal?: AbortSignal;
		onChunk: (chunk: string) => void;
		onError: (err: unknown) => void;
	}): () => void {
		const {
			namespace,
			pod,
			container,
			follow = true,
			tailLines = 200,
			previous = false,
			signal,
			onChunk,
			onError,
		} = options;
		const abortController = new AbortController();
		if (signal) {
			signal.addEventListener("abort", () =>
				abortController.abort(signal.reason),
			);
		}

		const passThrough = new PassThrough();
		passThrough.setEncoding("utf-8");
		passThrough.on("data", onChunk);
		passThrough.on("error", onError);

		const handleAbort = () => {
			if (typeof passThrough.destroy === "function") {
				passThrough.destroy();
			} else {
				passThrough.end();
			}
		};

		abortController.signal.addEventListener("abort", handleAbort, {
			once: true,
		});

		void this.log
			.log(namespace, pod, container, passThrough, {
				follow,
				tailLines,
				previous,
				timestamps: true,
			})
			.then((controller) => {
				abortController.signal.addEventListener(
					"abort",
					() => {
						controller.abort();
					},
					{ once: true },
				);
			})
			.catch((error) => {
				onError(error);
				abortController.abort();
			});

		return () => {
			abortController.abort();
		};
	}

	private sanitizeManifest(resource: unknown): unknown {
		if (typeof resource === "undefined") {
			return resource;
		}
		const plain = JSON.parse(JSON.stringify(resource));
		if (plain && typeof plain === "object") {
			const record = plain as Record<string, unknown>;
			const metadata = record.metadata as Record<string, unknown> | undefined;
			if (metadata && typeof metadata === "object") {
				delete (metadata as Record<string, unknown>)["managedFields"];
			}
		}
		return plain;
	}

	private mapPodListItem(pod: V1Pod, usage?: ResourceUsage): PodListItem {
		const containerStatuses = (pod.status?.containerStatuses ??
			[]) as V1ContainerStatus[];
		const restarts = containerStatuses.reduce(
			(acc, cs) => acc + (cs.restartCount ?? 0),
			0,
		);
		// Find the most recent restart time across all containers
		let lastRestartTime: string | undefined;
		for (const cs of containerStatuses) {
			const finishedAt = cs.lastState?.terminated?.finishedAt;
			if (finishedAt) {
				const finishedAtStr = new Date(finishedAt).toISOString();
				if (!lastRestartTime || finishedAtStr > lastRestartTime) {
					lastRestartTime = finishedAtStr;
				}
			}
		}
		const creationTimestamp = pod.metadata?.creationTimestamp
			? new Date(pod.metadata.creationTimestamp).toISOString()
			: undefined;
		const { cpuRequests, memoryRequests } = this.calculatePodRequests(pod);
		return {
			name: pod.metadata?.name ?? "unknown",
			namespace: pod.metadata?.namespace ?? "default",
			phase: pod.status?.phase,
			restarts,
			lastRestartTime,
			containers: (pod.spec?.containers ?? []).map((c) => c.name),
			nodeName: pod.spec?.nodeName ?? undefined,
			podIP: pod.status?.podIP ?? undefined,
			creationTimestamp,
			cpuRequests,
			memoryRequests,
			cpuUsage: usage?.cpu,
			memoryUsage: usage?.memory,
		};
	}

	private mapPodDetail(pod: V1Pod, usage?: ResourceUsage): PodDetail {
		const listItem = this.mapPodListItem(pod, usage);

		const containerPorts: PodDetail["containerPorts"] = [];
		for (const container of pod.spec?.containers ?? []) {
			for (const port of container.ports ?? []) {
				if (port.containerPort) {
					containerPorts.push({
						containerName: container.name ?? "unknown",
						name: port.name,
						containerPort: port.containerPort,
						protocol: port.protocol,
					});
				}
			}
		}

		return {
			...listItem,
			labels: pod.metadata?.labels ?? {},
			annotations: pod.metadata?.annotations ?? {},
			containersStatus: (pod.status?.containerStatuses ?? []).map(
				(cs: V1ContainerStatus) => ({
					name: cs.name ?? "unknown",
					ready: Boolean(cs.ready),
					restartCount: cs.restartCount ?? 0,
					image: cs.image ?? "",
					state: cs.state ?? undefined,
					lastState: cs.lastState ?? undefined,
				}),
			),
			containerPorts,
		};
	}

	private mapNodeListItem(
		node: V1Node,
		usage?: ResourceUsage,
		options?: {
			pool?: string;
			podCount?: number;
			podCapacity?: number;
			podAllocatable?: number;
			podIPsAllocated?: number;
			podIPsCapacity?: number;
			cpuRequestsMillicores?: number;
			memoryRequestsBytes?: number;
			totalRestarts?: number;
			pods?: NodeListItem["pods"];
			blockers?: NodeBlocker[];
		},
	): NodeListItem {
		const readyCondition = (node.status?.conditions ?? []).find(
			(condition) => condition.type === "Ready",
		);
		const status =
			readyCondition?.status === "True"
				? "Ready"
				: readyCondition?.status === "Unknown"
					? "Unknown"
					: "NotReady";

		const creationTimestamp = node.metadata?.creationTimestamp
			? new Date(node.metadata.creationTimestamp).toISOString()
			: undefined;

		const cpuCapacityMillicores = this.parseCpuQuantity(
			node.status?.capacity?.cpu,
		);
		const cpuAllocatableMillicores = this.parseCpuQuantity(
			node.status?.allocatable?.cpu,
		);
		const memoryCapacityBytes = this.parseMemoryQuantity(
			node.status?.capacity?.memory,
		);
		const memoryAllocatableBytes = this.parseMemoryQuantity(
			node.status?.allocatable?.memory,
		);

		const cpuCapacity =
			cpuCapacityMillicores > 0
				? this.formatCpuQuantity(cpuCapacityMillicores)
				: undefined;
		const cpuAllocatable =
			cpuAllocatableMillicores > 0
				? this.formatCpuQuantity(cpuAllocatableMillicores)
				: undefined;
		const memoryCapacity =
			memoryCapacityBytes > 0
				? this.formatMemoryQuantity(memoryCapacityBytes)
				: undefined;
		const memoryAllocatable =
			memoryAllocatableBytes > 0
				? this.formatMemoryQuantity(memoryAllocatableBytes)
				: undefined;

		const podCapacity = Number.parseInt(node.status?.capacity?.pods ?? "", 10);
		const podAllocatable = Number.parseInt(
			node.status?.allocatable?.pods ?? "",
			10,
		);

		const internalIP = node.status?.addresses?.find(
			(address) => address?.type === "InternalIP",
		)?.address;

		const cpuRequests =
			options?.cpuRequestsMillicores && options.cpuRequestsMillicores > 0
				? this.formatCpuQuantity(options.cpuRequestsMillicores)
				: undefined;
		const memoryRequests =
			options?.memoryRequestsBytes && options.memoryRequestsBytes > 0
				? this.formatMemoryQuantity(options.memoryRequestsBytes)
				: undefined;

		return {
			name: node.metadata?.name ?? "unknown",
			status,
			roles: this.extractNodeRoles(node.metadata?.labels),
			nodePool: options?.pool ?? this.extractNodePool(node.metadata?.labels),
			instanceType: this.extractInstanceType(node.metadata?.labels),
			architecture: node.status?.nodeInfo?.architecture ?? undefined,
			kubeletVersion: node.status?.nodeInfo?.kubeletVersion ?? undefined,
			internalIP,
			creationTimestamp,
			cpuCapacity,
			cpuAllocatable,
			cpuUsage: usage?.cpu,
			memoryCapacity,
			memoryAllocatable,
			memoryUsage: usage?.memory,
			podCapacity:
				options?.podCapacity ??
				(Number.isFinite(podCapacity) ? podCapacity : undefined),
			podAllocatable:
				options?.podAllocatable ??
				(Number.isFinite(podAllocatable) ? podAllocatable : undefined),
			podCount: options?.podCount,
			podIPsAllocated: options?.podIPsAllocated,
			podIPsCapacity: options?.podIPsCapacity,
			cpuRequests,
			memoryRequests,
			totalRestarts: options?.totalRestarts ?? 0,
			pods: options?.pods ?? [],
			blockers: options?.blockers ?? [],
		};
	}

	private extractNodeRoles(
		labels?: Record<string, string | undefined>,
	): string[] {
		if (!labels) return [];
		const roles = new Set<string>();

		for (const [key, value] of Object.entries(labels)) {
			if (key === "kubernetes.io/role" && value) {
				roles.add(value);
			}
			if (key.startsWith("node-role.kubernetes.io/")) {
				const [, role] = key.split("/");
				if (role) {
					roles.add(role);
				}
			}
		}

		return Array.from(roles).sort();
	}

	private extractInstanceType(
		labels?: Record<string, string | undefined>,
	): string | undefined {
		if (!labels) return undefined;

		const preferredKeys = [
			"node.kubernetes.io/instance-type",
			"beta.kubernetes.io/instance-type",
			"kops.k8s.io/instancegroup",
		];

		for (const key of preferredKeys) {
			const value = labels[key];
			if (value) return value;
		}

		return undefined;
	}

	private extractNodePool(
		labels?: Record<string, string | undefined>,
	): string | undefined {
		if (!labels) return undefined;

		const preferredKeys = [
			"nodepool",
			"nodePool",
			"kubernetes.azure.com/agentpool",
			"eks.amazonaws.com/nodegroup",
			"eks.amazonaws.com/nodegroup-name",
			"cloud.google.com/gke-nodepool",
			"alpha.eksctl.io/nodegroup-name",
			"karpenter.sh/provisioner-name",
		];

		for (const key of preferredKeys) {
			const value = labels[key];
			if (value) {
				return value;
			}
		}

		const fuzzyKey = Object.keys(labels).find((key) =>
			key.toLowerCase().includes("nodepool"),
		);
		if (fuzzyKey) {
			const value = labels[fuzzyKey];
			if (value) {
				return value;
			}
		}

		const nodeGroupKey = Object.keys(labels).find((key) =>
			key.toLowerCase().includes("nodegroup"),
		);
		if (nodeGroupKey) {
			const value = labels[nodeGroupKey];
			if (value) {
				return value;
			}
		}

		return undefined;
	}

	private generateInstanceTypeRecommendation(
		instanceTypes: string[],
		cpuUsageMillicores: number,
		memoryUsageBytes: number,
	): string | undefined {
		if (
			instanceTypes.length === 0 ||
			cpuUsageMillicores <= 0 ||
			memoryUsageBytes <= 0
		) {
			return undefined;
		}

		const cpuCores = cpuUsageMillicores / 1000;
		const memoryGiB = memoryUsageBytes / 1024 ** 3;
		const actualRatio = memoryGiB / cpuCores;

		const awsInstanceFamilies = {
			c: { ratio: 2, name: "compute-optimized (c family)" },
			t: { ratio: 4, name: "burstable (t family)" },
			m: { ratio: 4, name: "general-purpose (m family)" },
			r: { ratio: 8, name: "memory-optimized (r family)" },
		};

		const currentFamily = instanceTypes
			.map((type) => type.match(/^([ctmr])\d/)?.[1])
			.find(
				(family): family is "c" | "t" | "m" | "r" =>
					family !== undefined && family in awsInstanceFamilies,
			);

		if (!currentFamily) {
			return undefined;
		}

		const currentIdealRatio = awsInstanceFamilies[currentFamily].ratio;
		const deviation =
			Math.abs(actualRatio - currentIdealRatio) / currentIdealRatio;

		if (deviation < 0.5) {
			return undefined;
		}

		let recommendedFamily: "c" | "m" | "r";
		if (actualRatio < 3) {
			recommendedFamily = "c";
		} else if (actualRatio < 6) {
			recommendedFamily = "m";
		} else {
			recommendedFamily = "r";
		}

		const normalizedCurrentFamily = currentFamily === "t" ? "m" : currentFamily;

		if (recommendedFamily === normalizedCurrentFamily) {
			return undefined;
		}

		const currentFamilyName = awsInstanceFamilies[currentFamily].name;
		const recommendedFamilyName = awsInstanceFamilies[recommendedFamily].name;

		return `Current workload uses ${actualRatio.toFixed(1)} GiB per core. Consider switching from ${currentFamilyName} to ${recommendedFamilyName} for better resource alignment.`;
	}

	private calculatePodRequestTotals(pod: V1Pod): {
		cpuMillicores: number;
		memoryBytes: number;
	} {
		const containers = pod.spec?.containers ?? [];
		const initContainers = pod.spec?.initContainers ?? [];

		const containerCpuMillicores = containers.reduce((acc, container) => {
			const request = container.resources?.requests?.cpu;
			return acc + this.parseCpuQuantity(request);
		}, 0);
		const initContainerCpuMillicores = initContainers.reduce(
			(max, container) => {
				const request = container.resources?.requests?.cpu;
				return Math.max(max, this.parseCpuQuantity(request));
			},
			0,
		);

		const containerMemoryBytes = containers.reduce((acc, container) => {
			const request = container.resources?.requests?.memory;
			return acc + this.parseMemoryQuantity(request);
		}, 0);
		const initContainerMemoryBytes = initContainers.reduce((max, container) => {
			const request = container.resources?.requests?.memory;
			return Math.max(max, this.parseMemoryQuantity(request));
		}, 0);

		const overheadCpuMillicores = this.parseCpuQuantity(
			pod.spec?.overhead?.cpu,
		);
		const overheadMemoryBytes = this.parseMemoryQuantity(
			pod.spec?.overhead?.memory,
		);

		const totalCpuMillicores =
			Math.max(containerCpuMillicores, initContainerCpuMillicores) +
			overheadCpuMillicores;
		const totalMemoryBytes =
			Math.max(containerMemoryBytes, initContainerMemoryBytes) +
			overheadMemoryBytes;

		return {
			cpuMillicores: totalCpuMillicores,
			memoryBytes: totalMemoryBytes,
		};
	}

	private calculatePodRequests(pod: V1Pod): {
		cpuRequests?: string;
		memoryRequests?: string;
	} {
		const { cpuMillicores, memoryBytes } = this.calculatePodRequestTotals(pod);
		return {
			cpuRequests:
				cpuMillicores > 0 ? this.formatCpuQuantity(cpuMillicores) : undefined,
			memoryRequests:
				memoryBytes > 0 ? this.formatMemoryQuantity(memoryBytes) : undefined,
		};
	}

	private parseCpuQuantity(quantity?: string | null): number {
		if (!quantity) return 0;
		if (quantity.endsWith("n")) {
			const value = Number.parseFloat(quantity.slice(0, -1));
			return Number.isFinite(value) ? value / 1_000_000 : 0;
		}
		if (quantity.endsWith("u")) {
			const value = Number.parseFloat(quantity.slice(0, -1));
			return Number.isFinite(value) ? value / 1000 : 0;
		}
		if (quantity.endsWith("m")) {
			const value = Number.parseFloat(quantity.slice(0, -1));
			return Number.isFinite(value) ? value : 0;
		}
		const value = Number.parseFloat(quantity);
		return Number.isFinite(value) ? value * 1000 : 0;
	}

	private parseMemoryQuantity(quantity?: string | null): number {
		if (!quantity) return 0;
		const match = quantity.match(/^([0-9.]+)([A-Za-z]+)?$/);
		if (!match) return 0;
		const value = Number.parseFloat(match[1]);
		if (!Number.isFinite(value)) return 0;
		const unit = match[2];
		if (!unit) return value;

		const binaryUnits: Record<string, number> = {
			Ki: 1024,
			Mi: 1024 ** 2,
			Gi: 1024 ** 3,
			Ti: 1024 ** 4,
			Pi: 1024 ** 5,
			Ei: 1024 ** 6,
		};
		const decimalUnits: Record<string, number> = {
			K: 1000,
			M: 1000 ** 2,
			G: 1000 ** 3,
			T: 1000 ** 4,
			P: 1000 ** 5,
			E: 1000 ** 6,
		};

		if (binaryUnits[unit]) {
			return value * binaryUnits[unit];
		}
		if (decimalUnits[unit]) {
			return value * decimalUnits[unit];
		}

		return value;
	}

	private formatCpuQuantity(millicores: number): string {
		if (millicores >= 1000) {
			const cores = millicores / 1000;
			const rounded = Number(cores.toFixed(2));
			if (Number.isInteger(rounded)) {
				return rounded.toString();
			}
			return rounded.toFixed(2).replace(/\.?0+$/, "");
		}
		return `${millicores}m`;
	}

	private formatMemoryQuantity(bytes: number): string {
		if (bytes < 1024) {
			return `${bytes}B`;
		}

		const units = [
			{ unit: "Ei", value: 1024 ** 6 },
			{ unit: "Pi", value: 1024 ** 5 },
			{ unit: "Ti", value: 1024 ** 4 },
			{ unit: "Gi", value: 1024 ** 3 },
			{ unit: "Mi", value: 1024 ** 2 },
			{ unit: "Ki", value: 1024 },
		];

		for (const { unit, value } of units) {
			if (bytes >= value) {
				const amount = bytes / value;
				const rounded = Number(amount.toFixed(2));
				const formatted = Number.isInteger(rounded)
					? rounded.toString()
					: rounded.toFixed(2).replace(/\.?0+$/, "");
				return `${formatted}${unit}`;
			}
		}

		return `${bytes}B`;
	}

	// Deployment methods
	async listDeployments(namespace: string): Promise<DeploymentListItem[]> {
		return this.withCredentialRetry(async () => {
			const deploymentList = await this.appsApi.listNamespacedDeployment({
				namespace,
			});
			return (deploymentList.items ?? []).map((deployment: V1Deployment) =>
				this.mapDeploymentListItem(deployment),
			);
		});
	}

	async getDeployment(
		namespace: string,
		deploymentName: string,
	): Promise<DeploymentDetail> {
		return this.withCredentialRetry(async () => {
			const deployment = await this.appsApi.readNamespacedDeployment({
				name: deploymentName,
				namespace,
			});
			return this.mapDeploymentDetail(deployment);
		});
	}

	async getDeploymentManifest(
		namespace: string,
		deploymentName: string,
	): Promise<string> {
		return this.withCredentialRetry(async () => {
			const deployment = await this.appsApi.readNamespacedDeployment({
				name: deploymentName,
				namespace,
			});
			const manifest = this.sanitizeManifest(deployment);
			return JSON.stringify(manifest, null, 2);
		});
	}

	async getDeploymentEvents(
		namespace: string,
		deploymentName: string,
	): Promise<DeploymentEvent[]> {
		return this.withCredentialRetry(async () => {
			const events = await this.coreApi.listNamespacedEvent({
				namespace,
				fieldSelector: `involvedObject.name=${deploymentName},involvedObject.kind=Deployment`,
			});

			return (events.items ?? [])
				.map((event: CoreV1Event) => ({
					type: event.type ?? "",
					reason: event.reason ?? "",
					message: event.message ?? "",
					count: event.count,
					firstTimestamp: event.firstTimestamp?.toISOString(),
					lastTimestamp: event.lastTimestamp?.toISOString(),
					source: event.source?.component ?? event.reportingComponent,
				}))
				.sort((a, b) => {
					const timeA = new Date(
						a.lastTimestamp ?? a.firstTimestamp ?? "",
					).getTime();
					const timeB = new Date(
						b.lastTimestamp ?? b.firstTimestamp ?? "",
					).getTime();
					return timeB - timeA;
				});
		});
	}

	async getDeploymentStatus(
		namespace: string,
		deploymentName: string,
	): Promise<DeploymentStatus> {
		return this.withCredentialRetry(async () => {
			const deployment = await this.appsApi.readNamespacedDeployment({
				name: deploymentName,
				namespace,
			});

			return {
				replicas: deployment.status?.replicas ?? 0,
				readyReplicas: deployment.status?.readyReplicas ?? 0,
				updatedReplicas: deployment.status?.updatedReplicas ?? 0,
				availableReplicas: deployment.status?.availableReplicas ?? 0,
				unavailableReplicas: deployment.status?.unavailableReplicas ?? 0,
				conditions: (deployment.status?.conditions ?? []).map((condition) => ({
					type: condition.type ?? "",
					status: condition.status ?? "",
					reason: condition.reason,
					message: condition.message,
					lastTransitionTime: condition.lastTransitionTime?.toISOString(),
					lastUpdateTime: condition.lastUpdateTime?.toISOString(),
				})),
				observedGeneration: deployment.status?.observedGeneration,
				collisionCount: deployment.status?.collisionCount,
			};
		});
	}

	async deleteDeployment(
		namespace: string,
		deploymentName: string,
	): Promise<void> {
		return this.withCredentialRetry(async () => {
			await this.appsApi.deleteNamespacedDeployment({
				name: deploymentName,
				namespace,
			});
		});
	}

	async restartDeployment(
		namespace: string,
		deploymentName: string,
	): Promise<void> {
		const now = new Date().toISOString();
		const patchBody = {
			spec: {
				template: {
					metadata: {
						annotations: {
							"kubectl.kubernetes.io/restartedAt": now,
						},
					},
				},
			},
		};

		function setHeaderMiddleware(
			key: string,
			value: string,
		): ObservableMiddleware {
			return {
				pre: (request: RequestContext) => {
					request.setHeaderParam(key, value);
					return of(request);
				},
				post: (response: ResponseContext) => {
					return of(response);
				},
			};
		}

		await this.appsApi.patchNamespacedDeployment(
			{
				name: deploymentName,
				namespace,
				body: patchBody,
			},
			{
				middleware: [
					setHeaderMiddleware(
						"Content-Type",
						"application/strategic-merge-patch+json",
					),
				],
				middlewareMergeStrategy: "append",
			},
		);
	}

	async scaleDeployment(
		namespace: string,
		deploymentName: string,
		replicas: number,
	): Promise<void> {
		await this.appsApi.patchNamespacedDeploymentScale({
			name: deploymentName,
			namespace,
			body: {
				spec: {
					replicas,
				},
			},
		});
	}

	async rollbackDeployment(
		namespace: string,
		deploymentName: string,
		toRevision?: number,
	): Promise<void> {
		// Get all ReplicaSets for this deployment to find the target revision
		const replicaSets = await this.appsApi.listNamespacedReplicaSet({
			namespace,
			labelSelector: `app=${deploymentName}`,
		});

		// Find the target ReplicaSet
		let targetRS;
		if (toRevision) {
			// Find specific revision
			targetRS = replicaSets.items.find(
				(rs) =>
					parseInt(
						rs.metadata?.annotations?.["deployment.kubernetes.io/revision"] ??
							"0",
					) === toRevision,
			);
		} else {
			// Find previous revision (not current, sorted by revision descending)
			const deployment = await this.appsApi.readNamespacedDeployment({
				name: deploymentName,
				namespace,
			});
			const currentRevision = parseInt(
				deployment.metadata?.annotations?.[
					"deployment.kubernetes.io/revision"
				] ?? "1",
			);

			const sortedRS = replicaSets.items
				.filter(
					(rs) =>
						parseInt(
							rs.metadata?.annotations?.["deployment.kubernetes.io/revision"] ??
								"0",
						) > 0,
				)
				.sort((a, b) => {
					const revA = parseInt(
						a.metadata?.annotations?.["deployment.kubernetes.io/revision"] ??
							"0",
					);
					const revB = parseInt(
						b.metadata?.annotations?.["deployment.kubernetes.io/revision"] ??
							"0",
					);
					return revB - revA;
				});

			// Get the second item (first is current, second is previous)
			targetRS = sortedRS[1];
		}

		if (!targetRS?.spec?.template) {
			throw new Error("Target revision not found or invalid");
		}

		function setHeaderMiddleware(
			key: string,
			value: string,
		): ObservableMiddleware {
			return {
				pre: (request: RequestContext) => {
					request.setHeaderParam(key, value);
					return of(request);
				},
				post: (response: ResponseContext) => {
					return of(response);
				},
			};
		}

		// Patch the deployment with the target ReplicaSet's pod template
		await this.appsApi.patchNamespacedDeployment(
			{
				name: deploymentName,
				namespace,
				body: {
					spec: {
						template: targetRS.spec.template,
					},
				},
			},
			{
				middleware: [
					setHeaderMiddleware(
						"Content-Type",
						"application/strategic-merge-patch+json",
					),
				],
				middlewareMergeStrategy: "append",
			},
		);
	}

	async getDeploymentHistory(
		namespace: string,
		deploymentName: string,
	): Promise<DeploymentRevision[]> {
		return this.withCredentialRetry(async () => {
			// Get all ReplicaSets for this deployment
			const replicaSets = await this.appsApi.listNamespacedReplicaSet({
				namespace,
				labelSelector: `app=${deploymentName}`,
			});

			// Extract revision information from ReplicaSets
			const revisions: DeploymentRevision[] = (replicaSets.items ?? [])
				.map((rs) => {
					const revision = parseInt(
						rs.metadata?.annotations?.["deployment.kubernetes.io/revision"] ??
							"0",
					);
					if (revision === 0) return null;

					return {
						revision,
						creationTimestamp: rs.metadata?.creationTimestamp?.toISOString(),
						changeReason:
							rs.metadata?.annotations?.["kubernetes.io/change-cause"],
					} as DeploymentRevision;
				})
				.filter((r): r is DeploymentRevision => r !== null)
				.sort((a, b) => b.revision - a.revision);

			return revisions;
		});
	}

	async streamDeployments(
		namespace: string,
		onData: (data: string) => void,
		onError: (err: unknown) => void,
		signal?: AbortSignal,
	) {
		const abortController = new AbortController();
		if (signal) {
			const handleAbort = () => abortController.abort(signal.reason);
			signal.addEventListener("abort", handleAbort, { once: true });
			abortController.signal.addEventListener("abort", () => {
				signal.removeEventListener("abort", handleAbort);
			});
		}

		let requestController: AbortController;

		const startWatch = async (
			retryOnAuth: boolean = true,
		): Promise<AbortController> => {
			try {
				return await this.watch.watch(
					`/apis/apps/v1/namespaces/${namespace}/deployments`,
					{},
					(type, obj) => {
						try {
							onData(
								JSON.stringify({
									type,
									object: this.mapDeploymentListItem(obj as V1Deployment),
								}),
							);
						} catch (err) {
							onError(err);
						}
					},
					(err) => {
						if (err && abortController.signal.aborted === false) {
							onError(err);
						}
					},
				);
			} catch (error) {
				const err = error as { statusCode?: number };
				if (err.statusCode === 401 && retryOnAuth) {
					this.refreshCredentials();
					return await startWatch(false);
				}
				throw error;
			}
		};

		try {
			requestController = await startWatch();
		} catch (error) {
			onError(error);
			abortController.abort();
			throw error;
		}

		abortController.signal.addEventListener("abort", () => {
			requestController.abort();
		});

		return () => {
			abortController.abort();
		};
	}

	private mapDeploymentListItem(deployment: V1Deployment): DeploymentListItem {
		const creationTimestamp = deployment.metadata?.creationTimestamp
			? new Date(deployment.metadata.creationTimestamp).toISOString()
			: undefined;
		return {
			name: deployment.metadata?.name ?? "unknown",
			namespace: deployment.metadata?.namespace ?? "default",
			replicas: deployment.spec?.replicas ?? 0,
			readyReplicas: deployment.status?.readyReplicas ?? 0,
			updatedReplicas: deployment.status?.updatedReplicas ?? 0,
			availableReplicas: deployment.status?.availableReplicas ?? 0,
			creationTimestamp,
		};
	}

	private mapDeploymentDetail(deployment: V1Deployment): DeploymentDetail {
		const listItem = this.mapDeploymentListItem(deployment);
		return {
			...listItem,
			labels: deployment.metadata?.labels ?? {},
			annotations: deployment.metadata?.annotations ?? {},
			selector: deployment.spec?.selector?.matchLabels ?? {},
			strategy: deployment.spec?.strategy?.type ?? "RollingUpdate",
			conditions: (deployment.status?.conditions ?? []).map((condition) => ({
				type: condition.type ?? "",
				status: condition.status ?? "",
				reason: condition.reason,
				message: condition.message,
				lastTransitionTime: condition.lastTransitionTime?.toISOString(),
				lastUpdateTime: condition.lastUpdateTime?.toISOString(),
			})),
		};
	}

	// Rollout methods
	async listRollouts(namespace: string): Promise<RolloutListItem[]> {
		const crdExists = await this.checkCRDExists("rollouts.argoproj.io");
		if (!crdExists) {
			throw new CRDNotInstalledError("rollouts.argoproj.io", "Argo Rollouts");
		}

		return this.withCredentialRetry(async () => {
			const response = await this.customObjectsApi.listNamespacedCustomObject({
				group: "argoproj.io",
				version: "v1alpha1",
				namespace,
				plural: "rollouts",
			});

			const list = response as unknown as KubernetesListResponse;
			return (list.items ?? []).map((item) => this.mapRolloutListItem(item));
		});
	}

	async getRollout(namespace: string, name: string): Promise<RolloutDetail> {
		return this.withCredentialRetry(async () => {
			const response = await this.customObjectsApi.getNamespacedCustomObject({
				group: "argoproj.io",
				version: "v1alpha1",
				namespace,
				plural: "rollouts",
				name,
			});

			return this.mapRolloutDetail(response as Record<string, unknown>);
		});
	}

	async getRolloutManifest(namespace: string, name: string): Promise<string> {
		return this.withCredentialRetry(async () => {
			const response = await this.customObjectsApi.getNamespacedCustomObject({
				group: "argoproj.io",
				version: "v1alpha1",
				namespace,
				plural: "rollouts",
				name,
			});
			const manifest = this.sanitizeManifest(response);
			return JSON.stringify(manifest, null, 2);
		});
	}

	async getRolloutEvents(
		namespace: string,
		name: string,
	): Promise<RolloutEvent[]> {
		return this.withCredentialRetry(async () => {
			const events = await this.coreApi.listNamespacedEvent({
				namespace,
				fieldSelector: `involvedObject.name=${name},involvedObject.kind=Rollout`,
			});

			return (events.items ?? [])
				.map((event: CoreV1Event) => ({
					type: event.type ?? "",
					reason: event.reason ?? "",
					message: event.message ?? "",
					count: event.count,
					firstTimestamp: event.firstTimestamp?.toISOString(),
					lastTimestamp: event.lastTimestamp?.toISOString(),
					source: event.source?.component ?? event.reportingComponent,
				}))
				.sort((a, b) => {
					const timeA = new Date(
						a.lastTimestamp ?? a.firstTimestamp ?? "",
					).getTime();
					const timeB = new Date(
						b.lastTimestamp ?? b.firstTimestamp ?? "",
					).getTime();
					return timeB - timeA;
				});
		});
	}

	async getRolloutStatus(
		namespace: string,
		name: string,
	): Promise<RolloutStatus> {
		return this.withCredentialRetry(async () => {
			const response = await this.customObjectsApi.getNamespacedCustomObject({
				group: "argoproj.io",
				version: "v1alpha1",
				namespace,
				plural: "rollouts",
				name,
			});

			return this.mapRolloutStatus(response as Record<string, unknown>);
		});
	}

	async deleteRollout(namespace: string, name: string): Promise<void> {
		return this.withCredentialRetry(async () => {
			await this.customObjectsApi.deleteNamespacedCustomObject({
				group: "argoproj.io",
				version: "v1alpha1",
				namespace,
				plural: "rollouts",
				name,
			});
		});
	}

	async streamRollouts(
		namespace: string,
		onData: (data: string) => void,
		onError: (err: unknown) => void,
		signal?: AbortSignal,
	) {
		const crdExists = await this.checkCRDExists("rollouts.argoproj.io");
		if (!crdExists) {
			const error = new CRDNotInstalledError(
				"rollouts.argoproj.io",
				"Argo Rollouts",
			);
			onError(error);
			return () => {};
		}

		const abortController = new AbortController();
		if (signal) {
			const handleAbort = () => abortController.abort(signal.reason);
			signal.addEventListener("abort", handleAbort, { once: true });
			abortController.signal.addEventListener("abort", () => {
				signal.removeEventListener("abort", handleAbort);
			});
		}

		let requestController: AbortController;

		const startWatch = async (
			retryOnAuth: boolean = true,
		): Promise<AbortController> => {
			try {
				return await this.watch.watch(
					`/apis/argoproj.io/v1alpha1/namespaces/${namespace}/rollouts`,
					{},
					(type, obj) => {
						try {
							onData(
								JSON.stringify({
									type,
									object: this.mapRolloutListItem(
										obj as Record<string, unknown>,
									),
								}),
							);
						} catch (err) {
							onError(err);
						}
					},
					(err) => {
						if (err && abortController.signal.aborted === false) {
							onError(err);
						}
					},
				);
			} catch (error) {
				const err = error as { statusCode?: number };
				if (err.statusCode === 401 && retryOnAuth) {
					this.refreshCredentials();
					return await startWatch(false);
				}
				throw error;
			}
		};

		try {
			requestController = await startWatch();
		} catch (error) {
			onError(error);
			abortController.abort();
			throw error;
		}

		abortController.signal.addEventListener("abort", () => {
			requestController.abort();
		});

		return () => {
			abortController.abort();
		};
	}

	private mapRolloutListItem(
		rollout: Record<string, unknown>,
	): RolloutListItem {
		const metadata = rollout?.["metadata"] as
			| Record<string, unknown>
			| undefined;
		const spec = rollout?.["spec"] as Record<string, unknown> | undefined;
		const status = rollout?.["status"] as Record<string, unknown> | undefined;
		const strategySpec = spec?.["strategy"] as
			| Record<string, unknown>
			| undefined;

		let strategy = "RollingUpdate";
		if (strategySpec?.["blueGreen"]) {
			strategy = "BlueGreen";
		} else if (strategySpec?.["canary"]) {
			strategy = "Canary";
		}

		const creationTimestamp = metadata?.["creationTimestamp"]
			? new Date(metadata["creationTimestamp"] as string).toISOString()
			: undefined;

		return {
			name: (metadata?.["name"] as string) ?? "unknown",
			namespace: (metadata?.["namespace"] as string) ?? "default",
			strategy,
			replicas:
				(spec?.["replicas"] as number | undefined) ??
				(status?.["replicas"] as number | undefined) ??
				0,
			updatedReplicas: (status?.["updatedReplicas"] as number | undefined) ?? 0,
			readyReplicas: (status?.["readyReplicas"] as number | undefined) ?? 0,
			availableReplicas:
				(status?.["availableReplicas"] as number | undefined) ?? 0,
			currentStepIndex: status?.["currentStepIndex"] as number | undefined,
			phase: status?.["phase"] as string | undefined,
			message: status?.["message"] as string | undefined,
			stableRevision: status?.["stableRS"] as string | undefined,
			currentRevision: status?.["currentPodHash"] as string | undefined,
			creationTimestamp,
		};
	}

	private mapRolloutDetail(rollout: Record<string, unknown>): RolloutDetail {
		const listItem = this.mapRolloutListItem(rollout);
		const metadata = rollout?.["metadata"] as
			| Record<string, unknown>
			| undefined;
		const spec = rollout?.["spec"] as Record<string, unknown> | undefined;
		const status = rollout?.["status"] as Record<string, unknown> | undefined;
		const strategySpec = spec?.["strategy"] as
			| Record<string, unknown>
			| undefined;
		const templateMetadata = (
			spec?.["template"] as Record<string, unknown> | undefined
		)?.["metadata"] as Record<string, unknown> | undefined;

		const decodeSteps = (): Array<Record<string, unknown>> => {
			const canary = strategySpec?.["canary"] as
				| Record<string, unknown>
				| undefined;
			if (!canary) return [];
			const steps = canary["steps"] as
				| Array<Record<string, unknown>>
				| undefined;
			return (steps ?? [])
				.map((step) => step ?? {})
				.map((step) => ({ ...step }));
		};

		return {
			...listItem,
			labels: (metadata?.["labels"] as Record<string, string>) ?? {},
			annotations: (metadata?.["annotations"] as Record<string, string>) ?? {},
			selector:
				((spec?.["selector"] as Record<string, unknown> | undefined)?.[
					"matchLabels"
				] as Record<string, string>) ?? {},
			templateLabels:
				(templateMetadata?.["labels"] as Record<string, string>) ?? {},
			templateAnnotations:
				(templateMetadata?.["annotations"] as Record<string, string>) ?? {},
			services: {
				stableService:
					((
						strategySpec?.["blueGreen"] as Record<string, unknown> | undefined
					)?.["stableService"] as string | undefined) ??
					((strategySpec?.["canary"] as Record<string, unknown> | undefined)?.[
						"stableService"
					] as string | undefined),
				canaryService:
					((
						strategySpec?.["blueGreen"] as Record<string, unknown> | undefined
					)?.["activeService"] as string | undefined) ??
					((strategySpec?.["canary"] as Record<string, unknown> | undefined)?.[
						"canaryService"
					] as string | undefined),
			},
			steps: decodeSteps(),
			conditions:
				(
					status?.["conditions"] as Array<Record<string, unknown>> | undefined
				)?.map((condition) => ({
					type: (condition?.["type"] as string) ?? "",
					status: (condition?.["status"] as string) ?? "",
					reason: condition?.["reason"] as string | undefined,
					message: condition?.["message"] as string | undefined,
					lastTransitionTime: condition?.["lastTransitionTime"]
						? new Date(condition["lastTransitionTime"] as string).toISOString()
						: undefined,
					lastUpdateTime: condition?.["lastUpdateTime"]
						? new Date(condition["lastUpdateTime"] as string).toISOString()
						: undefined,
				})) ?? [],
		};
	}

	private mapRolloutStatus(rollout: Record<string, unknown>): RolloutStatus {
		const status = rollout?.["status"] as Record<string, unknown> | undefined;
		const unavailableReplicas =
			((status?.["replicas"] as number | undefined) ?? 0) -
			((status?.["availableReplicas"] as number | undefined) ?? 0);

		return {
			replicas: (status?.["replicas"] as number | undefined) ?? 0,
			updatedReplicas: (status?.["updatedReplicas"] as number | undefined) ?? 0,
			readyReplicas: (status?.["readyReplicas"] as number | undefined) ?? 0,
			availableReplicas:
				(status?.["availableReplicas"] as number | undefined) ?? 0,
			unavailableReplicas,
			currentStepIndex: status?.["currentStepIndex"] as number | undefined,
			phase: status?.["phase"] as string | undefined,
			message: status?.["message"] as string | undefined,
			currentPodHash: status?.["currentPodHash"] as string | undefined,
			stableRS: status?.["stableRS"] as string | undefined,
			canaryRS: status?.["canary"]
				? ((status["canary"] as Record<string, unknown>)?.["stableRS"] as
						| string
						| undefined)
				: undefined,
			pauseStartTime: status?.["pauseStartTime"] as string | undefined,
			abortedAt: status?.["abortedAt"] as string | undefined,
			conditions:
				(
					status?.["conditions"] as Array<Record<string, unknown>> | undefined
				)?.map((condition) => ({
					type: (condition?.["type"] as string) ?? "",
					status: (condition?.["status"] as string) ?? "",
					reason: condition?.["reason"] as string | undefined,
					message: condition?.["message"] as string | undefined,
					lastTransitionTime: condition?.["lastTransitionTime"]
						? new Date(condition["lastTransitionTime"] as string).toISOString()
						: undefined,
					lastUpdateTime: condition?.["lastUpdateTime"]
						? new Date(condition["lastUpdateTime"] as string).toISOString()
						: undefined,
				})) ?? [],
		};
	}

	// DaemonSet methods
	async listDaemonSets(namespace: string): Promise<DaemonSetListItem[]> {
		return this.withCredentialRetry(async () => {
			const daemonSetList = await this.appsApi.listNamespacedDaemonSet({
				namespace,
			});
			return (daemonSetList.items ?? []).map((daemonSet: V1DaemonSet) =>
				this.mapDaemonSetListItem(daemonSet),
			);
		});
	}

	async getDaemonSet(
		namespace: string,
		daemonSetName: string,
	): Promise<DaemonSetDetail> {
		return this.withCredentialRetry(async () => {
			const daemonSet = await this.appsApi.readNamespacedDaemonSet({
				name: daemonSetName,
				namespace,
			});
			return this.mapDaemonSetDetail(daemonSet);
		});
	}

	async getDaemonSetManifest(
		namespace: string,
		daemonSetName: string,
	): Promise<string> {
		return this.withCredentialRetry(async () => {
			const daemonSet = await this.appsApi.readNamespacedDaemonSet({
				name: daemonSetName,
				namespace,
			});
			const manifest = this.sanitizeManifest(daemonSet);
			return JSON.stringify(manifest, null, 2);
		});
	}

	async getDaemonSetEvents(
		namespace: string,
		daemonSetName: string,
	): Promise<DaemonSetEvent[]> {
		return this.withCredentialRetry(async () => {
			const events = await this.coreApi.listNamespacedEvent({
				namespace,
				fieldSelector: `involvedObject.name=${daemonSetName},involvedObject.kind=DaemonSet`,
			});

			return (events.items ?? [])
				.map((event: CoreV1Event) => ({
					type: event.type ?? "",
					reason: event.reason ?? "",
					message: event.message ?? "",
					count: event.count,
					firstTimestamp: event.firstTimestamp?.toISOString(),
					lastTimestamp: event.lastTimestamp?.toISOString(),
					source: event.source?.component ?? event.reportingComponent,
				}))
				.sort((a, b) => {
					const timeA = new Date(
						a.lastTimestamp ?? a.firstTimestamp ?? "",
					).getTime();
					const timeB = new Date(
						b.lastTimestamp ?? b.firstTimestamp ?? "",
					).getTime();
					return timeB - timeA;
				});
		});
	}

	async getDaemonSetStatus(
		namespace: string,
		daemonSetName: string,
	): Promise<DaemonSetStatus> {
		return this.withCredentialRetry(async () => {
			const daemonSet = await this.appsApi.readNamespacedDaemonSet({
				name: daemonSetName,
				namespace,
			});

			return {
				desiredNumberScheduled: daemonSet.status?.desiredNumberScheduled ?? 0,
				currentNumberScheduled: daemonSet.status?.currentNumberScheduled ?? 0,
				updatedNumberScheduled: daemonSet.status?.updatedNumberScheduled ?? 0,
				numberReady: daemonSet.status?.numberReady ?? 0,
				numberAvailable: daemonSet.status?.numberAvailable ?? 0,
				numberUnavailable: daemonSet.status?.numberUnavailable ?? 0,
				numberMisscheduled: daemonSet.status?.numberMisscheduled ?? 0,
				conditions: (daemonSet.status?.conditions ?? []).map((condition) => ({
					type: condition.type ?? "",
					status: condition.status ?? "",
					reason: condition.reason,
					message: condition.message,
					lastTransitionTime: condition.lastTransitionTime?.toISOString(),
					lastUpdateTime: condition.lastTransitionTime?.toISOString(),
				})),
				observedGeneration: daemonSet.status?.observedGeneration,
				collisionCount: daemonSet.status?.collisionCount,
			};
		});
	}

	async deleteDaemonSet(
		namespace: string,
		daemonSetName: string,
	): Promise<void> {
		return this.withCredentialRetry(async () => {
			await this.appsApi.deleteNamespacedDaemonSet({
				name: daemonSetName,
				namespace,
			});
		});
	}

	async restartDaemonSet(
		namespace: string,
		daemonSetName: string,
	): Promise<void> {
		const now = new Date().toISOString();
		const patchBody = {
			spec: {
				template: {
					metadata: {
						annotations: {
							"kubectl.kubernetes.io/restartedAt": now,
						},
					},
				},
			},
		};

		await this.appsApi.patchNamespacedDaemonSet({
			name: daemonSetName,
			namespace,
			body: patchBody,
		});
	}

	async streamDaemonSets(
		namespace: string,
		onData: (data: string) => void,
		onError: (err: unknown) => void,
		signal?: AbortSignal,
	) {
		const abortController = new AbortController();
		if (signal) {
			const handleAbort = () => abortController.abort(signal.reason);
			signal.addEventListener("abort", handleAbort, { once: true });
			abortController.signal.addEventListener("abort", () => {
				signal.removeEventListener("abort", handleAbort);
			});
		}

		let requestController: AbortController;

		const startWatch = async (
			retryOnAuth: boolean = true,
		): Promise<AbortController> => {
			try {
				return await this.watch.watch(
					`/apis/apps/v1/namespaces/${namespace}/daemonsets`,
					{},
					(type, obj) => {
						try {
							onData(
								JSON.stringify({
									type,
									object: this.mapDaemonSetListItem(obj as V1DaemonSet),
								}),
							);
						} catch (err) {
							onError(err);
						}
					},
					(err) => {
						if (err && abortController.signal.aborted === false) {
							onError(err);
						}
					},
				);
			} catch (error) {
				const err = error as { statusCode?: number };
				if (err.statusCode === 401 && retryOnAuth) {
					this.refreshCredentials();
					return await startWatch(false);
				}
				throw error;
			}
		};

		try {
			requestController = await startWatch();
		} catch (error) {
			onError(error);
			abortController.abort();
			throw error;
		}

		abortController.signal.addEventListener("abort", () => {
			requestController.abort();
		});

		return () => {
			abortController.abort();
		};
	}

	private mapDaemonSetListItem(daemonSet: V1DaemonSet): DaemonSetListItem {
		const creationTimestamp = daemonSet.metadata?.creationTimestamp
			? new Date(daemonSet.metadata.creationTimestamp).toISOString()
			: undefined;
		return {
			name: daemonSet.metadata?.name ?? "unknown",
			namespace: daemonSet.metadata?.namespace ?? "default",
			desiredNumberScheduled:
				daemonSet.status?.desiredNumberScheduled ??
				daemonSet.status?.currentNumberScheduled ??
				0,
			currentNumberScheduled: daemonSet.status?.currentNumberScheduled ?? 0,
			numberReady: daemonSet.status?.numberReady ?? 0,
			numberAvailable: daemonSet.status?.numberAvailable ?? 0,
			creationTimestamp,
		};
	}

	private mapDaemonSetDetail(daemonSet: V1DaemonSet): DaemonSetDetail {
		const listItem = this.mapDaemonSetListItem(daemonSet);
		const maxUnavailable =
			daemonSet.spec?.updateStrategy?.rollingUpdate?.maxUnavailable;
		const maxUnavailableValue =
			typeof maxUnavailable === "string"
				? maxUnavailable
				: typeof maxUnavailable === "number"
					? maxUnavailable.toString()
					: undefined;

		return {
			...listItem,
			labels: daemonSet.metadata?.labels ?? {},
			annotations: daemonSet.metadata?.annotations ?? {},
			selector: daemonSet.spec?.selector?.matchLabels ?? {},
			updateStrategy: daemonSet.spec?.updateStrategy?.type ?? "RollingUpdate",
			maxUnavailable: maxUnavailableValue,
			minReadySeconds: daemonSet.spec?.minReadySeconds,
			conditions: (daemonSet.status?.conditions ?? []).map((condition) => ({
				type: condition.type ?? "",
				status: condition.status ?? "",
				reason: condition.reason,
				message: condition.message,
				lastTransitionTime: condition.lastTransitionTime?.toISOString(),
				lastUpdateTime: condition.lastTransitionTime?.toISOString(),
			})),
		};
	}

	// StatefulSet methods
	async listStatefulSets(namespace: string): Promise<StatefulSetListItem[]> {
		return this.withCredentialRetry(async () => {
			const statefulSetList = await this.appsApi.listNamespacedStatefulSet({
				namespace,
			});
			return (statefulSetList.items ?? []).map((statefulSet: V1StatefulSet) =>
				this.mapStatefulSetListItem(statefulSet),
			);
		});
	}

	async getStatefulSet(
		namespace: string,
		statefulSetName: string,
	): Promise<StatefulSetDetail> {
		return this.withCredentialRetry(async () => {
			const statefulSet = await this.appsApi.readNamespacedStatefulSet({
				name: statefulSetName,
				namespace,
			});
			return this.mapStatefulSetDetail(statefulSet);
		});
	}

	async getStatefulSetManifest(
		namespace: string,
		statefulSetName: string,
	): Promise<string> {
		return this.withCredentialRetry(async () => {
			const statefulSet = await this.appsApi.readNamespacedStatefulSet({
				name: statefulSetName,
				namespace,
			});
			const manifest = this.sanitizeManifest(statefulSet);
			return JSON.stringify(manifest, null, 2);
		});
	}

	async getStatefulSetEvents(
		namespace: string,
		statefulSetName: string,
	): Promise<StatefulSetEvent[]> {
		return this.withCredentialRetry(async () => {
			const events = await this.coreApi.listNamespacedEvent({
				namespace,
				fieldSelector: `involvedObject.name=${statefulSetName},involvedObject.kind=StatefulSet`,
			});

			return (events.items ?? [])
				.map((event: CoreV1Event) => ({
					type: event.type ?? "",
					reason: event.reason ?? "",
					message: event.message ?? "",
					count: event.count,
					firstTimestamp: event.firstTimestamp?.toISOString(),
					lastTimestamp: event.lastTimestamp?.toISOString(),
					source: event.source?.component ?? event.reportingComponent,
				}))
				.sort((a, b) => {
					const timeA = new Date(
						a.lastTimestamp ?? a.firstTimestamp ?? "",
					).getTime();
					const timeB = new Date(
						b.lastTimestamp ?? b.firstTimestamp ?? "",
					).getTime();
					return timeB - timeA;
				});
		});
	}

	async getStatefulSetStatus(
		namespace: string,
		statefulSetName: string,
	): Promise<StatefulSetStatus> {
		return this.withCredentialRetry(async () => {
			const statefulSet = await this.appsApi.readNamespacedStatefulSet({
				name: statefulSetName,
				namespace,
			});

			return {
				replicas: statefulSet.status?.replicas ?? 0,
				readyReplicas: statefulSet.status?.readyReplicas ?? 0,
				updatedReplicas: statefulSet.status?.updatedReplicas ?? 0,
				currentReplicas: statefulSet.status?.currentReplicas ?? 0,
				availableReplicas: statefulSet.status?.availableReplicas ?? 0,
				conditions: (statefulSet.status?.conditions ?? []).map((condition) => ({
					type: condition.type ?? "",
					status: condition.status ?? "",
					reason: condition.reason,
					message: condition.message,
					lastTransitionTime: condition.lastTransitionTime?.toISOString(),
				})),
				observedGeneration: statefulSet.status?.observedGeneration,
				collisionCount: statefulSet.status?.collisionCount,
			};
		});
	}

	async deleteStatefulSet(
		namespace: string,
		statefulSetName: string,
	): Promise<void> {
		return this.withCredentialRetry(async () => {
			await this.appsApi.deleteNamespacedStatefulSet({
				name: statefulSetName,
				namespace,
			});
		});
	}

	async restartStatefulSet(
		namespace: string,
		statefulSetName: string,
	): Promise<void> {
		const now = new Date().toISOString();
		const patchBody = {
			spec: {
				template: {
					metadata: {
						annotations: {
							"kubectl.kubernetes.io/restartedAt": now,
						},
					},
				},
			},
		};

		await this.appsApi.patchNamespacedStatefulSet({
			name: statefulSetName,
			namespace,
			body: patchBody,
		});
	}

	async scaleStatefulSet(
		namespace: string,
		statefulSetName: string,
		replicas: number,
	): Promise<void> {
		await this.appsApi.patchNamespacedStatefulSetScale({
			name: statefulSetName,
			namespace,
			body: {
				spec: {
					replicas,
				},
			},
		});
	}

	async streamStatefulSets(
		namespace: string,
		onData: (data: string) => void,
		onError: (err: unknown) => void,
		signal?: AbortSignal,
	) {
		const abortController = new AbortController();
		if (signal) {
			const handleAbort = () => abortController.abort(signal.reason);
			signal.addEventListener("abort", handleAbort, { once: true });
			abortController.signal.addEventListener("abort", () => {
				signal.removeEventListener("abort", handleAbort);
			});
		}

		let requestController: AbortController;

		const startWatch = async (
			retryOnAuth: boolean = true,
		): Promise<AbortController> => {
			try {
				return await this.watch.watch(
					`/apis/apps/v1/namespaces/${namespace}/statefulsets`,
					{},
					(type, obj) => {
						try {
							onData(
								JSON.stringify({
									type,
									object: this.mapStatefulSetListItem(obj as V1StatefulSet),
								}),
							);
						} catch (err) {
							onError(err);
						}
					},
					(err) => {
						if (err && abortController.signal.aborted === false) {
							onError(err);
						}
					},
				);
			} catch (error) {
				const err = error as { statusCode?: number };
				if (err.statusCode === 401 && retryOnAuth) {
					this.refreshCredentials();
					return await startWatch(false);
				}
				throw error;
			}
		};

		try {
			requestController = await startWatch();
		} catch (error) {
			onError(error);
			abortController.abort();
			throw error;
		}

		abortController.signal.addEventListener("abort", () => {
			requestController.abort();
		});

		return () => {
			abortController.abort();
		};
	}

	private mapStatefulSetListItem(
		statefulSet: V1StatefulSet,
	): StatefulSetListItem {
		const creationTimestamp = statefulSet.metadata?.creationTimestamp
			? new Date(statefulSet.metadata.creationTimestamp).toISOString()
			: undefined;
		return {
			name: statefulSet.metadata?.name ?? "unknown",
			namespace: statefulSet.metadata?.namespace ?? "default",
			replicas: statefulSet.spec?.replicas ?? 0,
			readyReplicas: statefulSet.status?.readyReplicas ?? 0,
			updatedReplicas: statefulSet.status?.updatedReplicas ?? 0,
			currentReplicas: statefulSet.status?.currentReplicas ?? 0,
			creationTimestamp,
		};
	}

	private mapStatefulSetDetail(statefulSet: V1StatefulSet): StatefulSetDetail {
		const listItem = this.mapStatefulSetListItem(statefulSet);
		return {
			...listItem,
			labels: statefulSet.metadata?.labels ?? {},
			annotations: statefulSet.metadata?.annotations ?? {},
			selector: statefulSet.spec?.selector?.matchLabels ?? {},
			serviceName: statefulSet.spec?.serviceName,
			updateStrategy: statefulSet.spec?.updateStrategy?.type ?? "RollingUpdate",
			podManagementPolicy:
				statefulSet.spec?.podManagementPolicy ?? "OrderedReady",
			conditions: (statefulSet.status?.conditions ?? []).map((condition) => ({
				type: condition.type ?? "",
				status: condition.status ?? "",
				reason: condition.reason,
				message: condition.message,
				lastTransitionTime: condition.lastTransitionTime?.toISOString(),
			})),
		};
	}

	// Job methods
	async listJobs(namespace: string): Promise<JobListItem[]> {
		return this.withCredentialRetry(async () => {
			const jobList = await this.batchApi.listNamespacedJob({ namespace });
			return (jobList.items ?? []).map((job: V1Job) =>
				this.mapJobListItem(job),
			);
		});
	}

	async getJob(namespace: string, jobName: string): Promise<JobDetail> {
		return this.withCredentialRetry(async () => {
			const job = await this.batchApi.readNamespacedJob({
				name: jobName,
				namespace,
			});
			return this.mapJobDetail(job);
		});
	}

	async getJobManifest(namespace: string, jobName: string): Promise<string> {
		return this.withCredentialRetry(async () => {
			const job = await this.batchApi.readNamespacedJob({
				name: jobName,
				namespace,
			});
			const manifest = this.sanitizeManifest(job);
			return JSON.stringify(manifest, null, 2);
		});
	}

	async getJobEvents(namespace: string, jobName: string): Promise<JobEvent[]> {
		return this.withCredentialRetry(async () => {
			const events = await this.coreApi.listNamespacedEvent({
				namespace,
				fieldSelector: `involvedObject.name=${jobName},involvedObject.kind=Job`,
			});

			return (events.items ?? [])
				.map((event: CoreV1Event) => ({
					type: event.type ?? "",
					reason: event.reason ?? "",
					message: event.message ?? "",
					count: event.count,
					firstTimestamp: event.firstTimestamp?.toISOString(),
					lastTimestamp: event.lastTimestamp?.toISOString(),
					source: event.source?.component ?? event.reportingComponent,
				}))
				.sort((a, b) => {
					const timeA = new Date(
						a.lastTimestamp ?? a.firstTimestamp ?? "",
					).getTime();
					const timeB = new Date(
						b.lastTimestamp ?? b.firstTimestamp ?? "",
					).getTime();
					return timeB - timeA;
				});
		});
	}

	async getJobStatus(namespace: string, jobName: string): Promise<JobStatus> {
		return this.withCredentialRetry(async () => {
			const job = await this.batchApi.readNamespacedJob({
				name: jobName,
				namespace,
			});

			return {
				startTime: job.status?.startTime?.toISOString(),
				completionTime: job.status?.completionTime?.toISOString(),
				active: job.status?.active ?? 0,
				succeeded: job.status?.succeeded ?? 0,
				failed: job.status?.failed ?? 0,
				conditions: (job.status?.conditions ?? []).map((condition) => ({
					type: condition.type ?? "",
					status: condition.status ?? "",
					reason: condition.reason,
					message: condition.message,
					lastProbeTime: condition.lastProbeTime?.toISOString(),
					lastTransitionTime: condition.lastTransitionTime?.toISOString(),
				})),
			};
		});
	}

	async deleteJob(namespace: string, jobName: string): Promise<void> {
		return this.withCredentialRetry(async () => {
			await this.batchApi.deleteNamespacedJob({ name: jobName, namespace });
		});
	}

	async streamJobs(
		namespace: string,
		onData: (data: string) => void,
		onError: (err: unknown) => void,
		signal?: AbortSignal,
	) {
		const abortController = new AbortController();
		if (signal) {
			const handleAbort = () => abortController.abort(signal.reason);
			signal.addEventListener("abort", handleAbort, { once: true });
			abortController.signal.addEventListener("abort", () => {
				signal.removeEventListener("abort", handleAbort);
			});
		}

		let requestController: AbortController;

		const startWatch = async (
			retryOnAuth: boolean = true,
		): Promise<AbortController> => {
			try {
				return await this.watch.watch(
					`/apis/batch/v1/namespaces/${namespace}/jobs`,
					{},
					(type, obj) => {
						try {
							onData(
								JSON.stringify({
									type,
									object: this.mapJobListItem(obj as V1Job),
								}),
							);
						} catch (err) {
							onError(err);
						}
					},
					(err) => {
						if (err && abortController.signal.aborted === false) {
							onError(err);
						}
					},
				);
			} catch (error) {
				const err = error as { statusCode?: number };
				if (err.statusCode === 401 && retryOnAuth) {
					this.refreshCredentials();
					return await startWatch(false);
				}
				throw error;
			}
		};

		try {
			requestController = await startWatch();
		} catch (error) {
			onError(error);
			abortController.abort();
			throw error;
		}

		abortController.signal.addEventListener("abort", () => {
			requestController.abort();
		});

		return () => {
			abortController.abort();
		};
	}

	private mapJobListItem(job: V1Job): JobListItem {
		const creationTimestamp = job.metadata?.creationTimestamp
			? new Date(job.metadata.creationTimestamp).toISOString()
			: undefined;
		return {
			name: job.metadata?.name ?? "unknown",
			namespace: job.metadata?.namespace ?? "default",
			completions: job.spec?.completions ?? undefined,
			succeeded: job.status?.succeeded ?? 0,
			failed: job.status?.failed ?? 0,
			active: job.status?.active ?? 0,
			startTime: job.status?.startTime?.toISOString(),
			completionTime: job.status?.completionTime?.toISOString(),
			creationTimestamp,
		};
	}

	private mapJobDetail(job: V1Job): JobDetail {
		const listItem = this.mapJobListItem(job);
		return {
			...listItem,
			labels: job.metadata?.labels ?? {},
			annotations: job.metadata?.annotations ?? {},
			selector: job.spec?.selector?.matchLabels ?? {},
			parallelism: job.spec?.parallelism ?? undefined,
			backoffLimit: job.spec?.backoffLimit ?? undefined,
			ttlSecondsAfterFinished: job.spec?.ttlSecondsAfterFinished ?? undefined,
		};
	}

	// ServiceAccount methods
	async listServiceAccounts(
		namespace: string,
	): Promise<ServiceAccountListItem[]> {
		return this.withCredentialRetry(async () => {
			const saList = await this.coreApi.listNamespacedServiceAccount({
				namespace,
			});
			return (saList.items ?? []).map((sa: V1ServiceAccount) =>
				this.mapServiceAccountListItem(sa),
			);
		});
	}

	async getServiceAccount(
		namespace: string,
		serviceAccountName: string,
	): Promise<ServiceAccountDetail> {
		return this.withCredentialRetry(async () => {
			const sa = await this.coreApi.readNamespacedServiceAccount({
				name: serviceAccountName,
				namespace,
			});
			return this.mapServiceAccountDetail(sa);
		});
	}

	async getServiceAccountManifest(
		namespace: string,
		serviceAccountName: string,
	): Promise<string> {
		return this.withCredentialRetry(async () => {
			const sa = await this.coreApi.readNamespacedServiceAccount({
				name: serviceAccountName,
				namespace,
			});
			const manifest = this.sanitizeManifest(sa);
			return JSON.stringify(manifest, null, 2);
		});
	}

	async deleteServiceAccount(
		namespace: string,
		serviceAccountName: string,
	): Promise<void> {
		return this.withCredentialRetry(async () => {
			await this.coreApi.deleteNamespacedServiceAccount({
				name: serviceAccountName,
				namespace,
			});
		});
	}

	async streamServiceAccounts(
		namespace: string,
		onData: (data: string) => void,
		onError: (err: unknown) => void,
		signal?: AbortSignal,
	) {
		const abortController = new AbortController();
		if (signal) {
			const handleAbort = () => abortController.abort(signal.reason);
			signal.addEventListener("abort", handleAbort, { once: true });
			abortController.signal.addEventListener("abort", () => {
				signal.removeEventListener("abort", handleAbort);
			});
		}

		let requestController: AbortController;

		const startWatch = async (
			retryOnAuth: boolean = true,
		): Promise<AbortController> => {
			try {
				return await this.watch.watch(
					`/api/v1/namespaces/${namespace}/serviceaccounts`,
					{},
					(type, obj) => {
						try {
							onData(
								JSON.stringify({
									type,
									object: this.mapServiceAccountListItem(
										obj as V1ServiceAccount,
									),
								}),
							);
						} catch (err) {
							onError(err);
						}
					},
					(err) => {
						if (err && abortController.signal.aborted === false) {
							onError(err);
						}
					},
				);
			} catch (error) {
				const err = error as { statusCode?: number };
				if (err.statusCode === 401 && retryOnAuth) {
					this.refreshCredentials();
					return await startWatch(false);
				}
				throw error;
			}
		};

		try {
			requestController = await startWatch();
		} catch (error) {
			onError(error);
			abortController.abort();
			throw error;
		}

		abortController.signal.addEventListener("abort", () => {
			requestController.abort();
		});

		return () => {
			abortController.abort();
		};
	}

	private mapServiceAccountListItem(
		sa: V1ServiceAccount,
	): ServiceAccountListItem {
		const creationTimestamp = sa.metadata?.creationTimestamp
			? new Date(sa.metadata.creationTimestamp).toISOString()
			: undefined;
		return {
			name: sa.metadata?.name ?? "unknown",
			namespace: sa.metadata?.namespace ?? "default",
			secretCount: sa.secrets?.length ?? 0,
			imagePullSecretCount: sa.imagePullSecrets?.length ?? 0,
			creationTimestamp,
		};
	}

	private mapServiceAccountDetail(sa: V1ServiceAccount): ServiceAccountDetail {
		const listItem = this.mapServiceAccountListItem(sa);
		return {
			...listItem,
			labels: sa.metadata?.labels ?? {},
			annotations: sa.metadata?.annotations ?? {},
			secrets: (sa.secrets ?? []).map((secret) => ({
				name: secret.name ?? "",
			})),
			imagePullSecrets: (sa.imagePullSecrets ?? []).map((secret) => ({
				name: typeof secret === "string" ? secret : (secret.name ?? ""),
			})),
		};
	}

	// Argo CD Application methods
	async listArgoApplications(
		namespace: string,
	): Promise<ArgoApplicationListItem[]> {
		const crdExists = await this.checkCRDExists("applications.argoproj.io");
		if (!crdExists) {
			throw new CRDNotInstalledError("applications.argoproj.io", "Argo CD");
		}

		return this.withCredentialRetry(async () => {
			const response = await this.customObjectsApi.listNamespacedCustomObject({
				group: "argoproj.io",
				version: "v1alpha1",
				namespace,
				plural: "applications",
			});

			const list = response as unknown as KubernetesListResponse;
			return (list.items ?? []).map((item) =>
				this.mapArgoApplicationListItem(item),
			);
		});
	}

	async getArgoApplication(
		namespace: string,
		name: string,
	): Promise<ArgoApplicationDetail> {
		return this.withCredentialRetry(async () => {
			const response = await this.customObjectsApi.getNamespacedCustomObject({
				group: "argoproj.io",
				version: "v1alpha1",
				namespace,
				plural: "applications",
				name,
			});

			return this.mapArgoApplicationDetail(response as Record<string, unknown>);
		});
	}

	async getArgoApplicationManifest(
		namespace: string,
		name: string,
	): Promise<string> {
		return this.withCredentialRetry(async () => {
			const response = await this.customObjectsApi.getNamespacedCustomObject({
				group: "argoproj.io",
				version: "v1alpha1",
				namespace,
				plural: "applications",
				name,
			});

			const manifest = this.sanitizeManifest(response);
			return JSON.stringify(manifest, null, 2);
		});
	}

	async getArgoApplicationStatus(
		namespace: string,
		name: string,
	): Promise<ArgoApplicationStatus> {
		return this.withCredentialRetry(async () => {
			const response = await this.customObjectsApi.getNamespacedCustomObject({
				group: "argoproj.io",
				version: "v1alpha1",
				namespace,
				plural: "applications",
				name,
			});

			return this.mapArgoApplicationStatus(response as Record<string, unknown>);
		});
	}

	async deleteArgoApplication(namespace: string, name: string): Promise<void> {
		return this.withCredentialRetry(async () => {
			await this.customObjectsApi.deleteNamespacedCustomObject({
				group: "argoproj.io",
				version: "v1alpha1",
				namespace,
				plural: "applications",
				name,
			});
		});
	}

	async streamArgoApplications(
		namespace: string,
		onData: (data: string) => void,
		onError: (err: unknown) => void,
		signal?: AbortSignal,
	) {
		const crdExists = await this.checkCRDExists("applications.argoproj.io");
		if (!crdExists) {
			const error = new CRDNotInstalledError(
				"applications.argoproj.io",
				"Argo CD",
			);
			onError(error);
			return () => {};
		}

		const abortController = new AbortController();
		if (signal) {
			const handleAbort = () => abortController.abort(signal.reason);
			signal.addEventListener("abort", handleAbort, { once: true });
			abortController.signal.addEventListener("abort", () => {
				signal.removeEventListener("abort", handleAbort);
			});
		}

		let requestController: AbortController;

		const startWatch = async (
			retryOnAuth: boolean = true,
		): Promise<AbortController> => {
			try {
				return await this.watch.watch(
					`/apis/argoproj.io/v1alpha1/namespaces/${namespace}/applications`,
					{},
					(type, obj) => {
						try {
							onData(
								JSON.stringify({
									type,
									object: this.mapArgoApplicationListItem(
										obj as Record<string, unknown>,
									),
								}),
							);
						} catch (err) {
							onError(err);
						}
					},
					(err) => {
						if (err && abortController.signal.aborted === false) {
							onError(err);
						}
					},
				);
			} catch (error) {
				const err = error as { statusCode?: number };
				if (err.statusCode === 401 && retryOnAuth) {
					this.refreshCredentials();
					return await startWatch(false);
				}
				throw error;
			}
		};

		try {
			requestController = await startWatch();
		} catch (error) {
			onError(error);
			abortController.abort();
			throw error;
		}

		abortController.signal.addEventListener("abort", () => {
			requestController.abort();
		});

		return () => {
			abortController.abort();
		};
	}

	private mapArgoApplicationListItem(
		application: Record<string, unknown>,
	): ArgoApplicationListItem {
		const metadata = application?.["metadata"] as
			| Record<string, unknown>
			| undefined;
		const spec = application?.["spec"] as Record<string, unknown> | undefined;
		const status = application?.["status"] as
			| Record<string, unknown>
			| undefined;

		const sync = status?.["sync"] as Record<string, unknown> | undefined;
		const health = status?.["health"] as Record<string, unknown> | undefined;
		const history = status?.["history"] as
			| Array<Record<string, unknown>>
			| undefined;
		const destination = spec?.["destination"] as
			| Record<string, unknown>
			| undefined;

		const primarySource = (() => {
			const rawSources = spec?.["sources"] as
				| Array<Record<string, unknown>>
				| undefined;
			if (rawSources?.length) {
				return rawSources[0];
			}
			return spec?.["source"] as Record<string, unknown> | undefined;
		})();

		return {
			name: (metadata?.["name"] as string) ?? "unknown",
			namespace: (metadata?.["namespace"] as string) ?? "default",
			project: spec?.["project"] as string | undefined,
			syncStatus: sync?.["status"] as string | undefined,
			healthStatus: health?.["status"] as string | undefined,
			revision:
				status?.["sync"] && typeof sync?.["revision"] === "string"
					? (sync?.["revision"] as string)
					: undefined,
			destinationServer: destination?.["server"] as string | undefined,
			destinationNamespace:
				(destination?.["namespace"] as string) ??
				((spec?.["destination"] as Record<string, unknown> | undefined)?.[
					"namespace"
				] as string | undefined),
			repoURL: primarySource?.["repoURL"] as string | undefined,
			targetRevision: primarySource?.["targetRevision"] as string | undefined,
			lastSyncedAt:
				(status?.["reconciledAt"] as string | undefined) ??
				(history?.[history.length - 1]?.["deployFinishedAt"] as
					| string
					| undefined),
			creationTimestamp: metadata?.["creationTimestamp"] as string | undefined,
		};
	}

	private mapArgoApplicationDetail(
		application: Record<string, unknown>,
	): ArgoApplicationDetail {
		const listItem = this.mapArgoApplicationListItem(application);
		const metadata = application?.["metadata"] as
			| Record<string, unknown>
			| undefined;
		const spec = application?.["spec"] as Record<string, unknown> | undefined;
		const status = application?.["status"] as
			| Record<string, unknown>
			| undefined;

		const rawSources =
			(spec?.["sources"] as Array<Record<string, unknown>> | undefined) ??
			(spec?.["source"] ? [spec?.["source"] as Record<string, unknown>] : []);

		const sources = rawSources.map((source) => ({
			repoURL: source?.["repoURL"] as string | undefined,
			path: source?.["path"] as string | undefined,
			chart: source?.["chart"] as string | undefined,
			targetRevision: source?.["targetRevision"] as string | undefined,
			helm: (source?.["helm"] as Record<string, unknown> | undefined)
				? {
						valueFiles: (source["helm"] as Record<string, unknown>)?.[
							"valueFiles"
						] as string[] | undefined,
						parameters: (source["helm"] as Record<string, unknown>)?.[
							"parameters"
						] as Array<Record<string, string>> | undefined,
					}
				: undefined,
			directory: (source?.["directory"] as Record<string, unknown> | undefined)
				? {
						recurse: (source["directory"] as Record<string, unknown>)?.[
							"recurse"
						] as boolean | undefined,
						include: (source["directory"] as Record<string, unknown>)?.[
							"include"
						] as string | undefined,
						exclude: (source["directory"] as Record<string, unknown>)?.[
							"exclude"
						] as string | undefined,
					}
				: undefined,
		}));

		const destination = spec?.["destination"] as
			| Record<string, unknown>
			| undefined;
		const summary = status?.["summary"] as Record<string, unknown> | undefined;
		const externalURLs =
			(summary?.["externalURLs"] as string[] | undefined) ?? [];

		return {
			...listItem,
			labels: (metadata?.["labels"] as Record<string, string>) ?? {},
			annotations: (metadata?.["annotations"] as Record<string, string>) ?? {},
			sources,
			destination: destination
				? {
						server: destination["server"] as string | undefined,
						namespace: destination["namespace"] as string | undefined,
						name: destination["name"] as string | undefined,
					}
				: undefined,
			syncPolicy: spec?.["syncPolicy"],
			externalUrls: externalURLs,
		};
	}

	private mapArgoApplicationStatus(
		application: Record<string, unknown>,
	): ArgoApplicationStatus {
		const status = application?.["status"] as
			| Record<string, unknown>
			| undefined;
		const sync = status?.["sync"] as Record<string, unknown> | undefined;
		const health = status?.["health"] as Record<string, unknown> | undefined;
		const summary = status?.["summary"] as Record<string, unknown> | undefined;
		const history = status?.["history"] as
			| Array<Record<string, unknown>>
			| undefined;
		const operationState = status?.["operationState"] as
			| Record<string, unknown>
			| undefined;

		return {
			syncStatus: sync?.["status"] as string | undefined,
			syncComparedTo: sync?.["comparedTo"]
				? JSON.stringify(sync["comparedTo"])
				: undefined,
			healthStatus: health?.["status"] as string | undefined,
			revision: sync?.["revision"] as string | undefined,
			reconciledAt: status?.["reconciledAt"] as string | undefined,
			observedAt: status?.["observedAt"] as string | undefined,
			operationState: operationState
				? {
						phase: operationState["phase"] as string | undefined,
						message: operationState["message"] as string | undefined,
						startedAt: operationState["startedAt"] as string | undefined,
						finishedAt: operationState["finishedAt"] as string | undefined,
					}
				: undefined,
			summary: {
				images: (summary?.["images"] as string[] | undefined) ?? [],
				externalURLs: (summary?.["externalURLs"] as string[] | undefined) ?? [],
			},
			history: (history ?? []).map((item) => ({
				id: item["id"] as number | undefined,
				revision: item["revision"] as string | undefined,
				deployStartedAt: item["deployStartedAt"] as string | undefined,
				deployFinishedAt: item["deployFinishedAt"] as string | undefined,
				source: (item["source"] as Record<string, unknown> | undefined)
					? {
							repoURL: (item["source"] as Record<string, unknown>)?.[
								"repoURL"
							] as string | undefined,
							targetRevision: (item["source"] as Record<string, unknown>)?.[
								"targetRevision"
							] as string | undefined,
							path: (item["source"] as Record<string, unknown>)?.["path"] as
								| string
								| undefined,
							chart: (item["source"] as Record<string, unknown>)?.["chart"] as
								| string
								| undefined,
						}
					: undefined,
				destServer: item["destServer"] as string | undefined,
				destNamespace: item["destNamespace"] as string | undefined,
			})),
		};
	}

	// Service methods
	async listServices(namespace: string): Promise<ServiceListItem[]> {
		return this.withCredentialRetry(async () => {
			const [serviceList, endpointsResult] = await Promise.all([
				this.coreApi.listNamespacedService({ namespace }),
				this.coreApi
					.listNamespacedEndpoints({ namespace })
					.catch(() => null),
			]);

			let readyEndpointsByService: Map<string, boolean> | undefined;
			if (endpointsResult) {
				readyEndpointsByService = new Map<string, boolean>();
				for (const endpoints of endpointsResult.items ?? []) {
					const serviceName = endpoints.metadata?.name;
					if (!serviceName) continue;

					const hasReadyEndpoints = (endpoints.subsets ?? []).some(
						(subset) => (subset.addresses?.length ?? 0) > 0,
					);
					readyEndpointsByService.set(serviceName, hasReadyEndpoints);
				}
			}

			return (serviceList.items ?? []).map((service: V1Service) =>
				this.mapServiceListItem(service, readyEndpointsByService),
			);
		});
	}

	async getService(
		namespace: string,
		serviceName: string,
	): Promise<ServiceDetail> {
		return this.withCredentialRetry(async () => {
			const service = await this.coreApi.readNamespacedService({
				name: serviceName,
				namespace,
			});
			return this.mapServiceDetail(service);
		});
	}

	async getServiceManifest(
		namespace: string,
		serviceName: string,
	): Promise<string> {
		return this.withCredentialRetry(async () => {
			const service = await this.coreApi.readNamespacedService({
				name: serviceName,
				namespace,
			});
			const manifest = this.sanitizeManifest(service);
			return JSON.stringify(manifest, null, 2);
		});
	}

	async deleteService(namespace: string, serviceName: string): Promise<void> {
		return this.withCredentialRetry(async () => {
			await this.coreApi.deleteNamespacedService({
				name: serviceName,
				namespace,
			});
		});
	}

	async streamServices(
		namespace: string,
		onData: (data: string) => void,
		onError: (err: unknown) => void,
		signal?: AbortSignal,
	) {
		const abortController = new AbortController();
		if (signal) {
			const handleAbort = () => abortController.abort(signal.reason);
			signal.addEventListener("abort", handleAbort, { once: true });
			abortController.signal.addEventListener("abort", () => {
				signal.removeEventListener("abort", handleAbort);
			});
		}

		const serviceCache = new Map<string, V1Service>();
		const endpointReadyCache = new Map<string, boolean>();

		const emitServiceEvent = (type: string, service: V1Service) => {
			const serviceName = service.metadata?.name;
			if (!serviceName) return;

			try {
				onData(
					JSON.stringify({
						type,
						object: this.mapServiceListItem(service, endpointReadyCache),
					}),
				);
			} catch (err) {
				onError(err);
			}
		};

		let serviceController: AbortController | undefined;
		let endpointController: AbortController | undefined;

		const startServiceWatch = async (
			retryOnAuth: boolean = true,
		): Promise<AbortController> => {
			try {
				return await this.watch.watch(
					`/api/v1/namespaces/${namespace}/services`,
					{},
					(type, obj) => {
						const service = obj as V1Service;
						const serviceName = service.metadata?.name;
						if (!serviceName) return;

						if (type === "DELETED") {
							serviceCache.delete(serviceName);
						} else {
							serviceCache.set(serviceName, service);
						}
						emitServiceEvent(type, service);
					},
					(err) => {
						if (err && abortController.signal.aborted === false) {
							onError(err);
						}
					},
				);
			} catch (error) {
				const err = error as { statusCode?: number };
				if (err.statusCode === 401 && retryOnAuth) {
					this.refreshCredentials();
					return await startServiceWatch(false);
				}
				throw error;
			}
		};

		const startEndpointWatch = async (
			retryOnAuth: boolean = true,
		): Promise<AbortController> => {
			try {
				return await this.watch.watch(
					`/api/v1/namespaces/${namespace}/endpoints`,
					{},
					(type, obj) => {
						const endpoints = obj as V1Endpoints;
						const serviceName = endpoints.metadata?.name;
						if (!serviceName) return;

						if (type === "DELETED") {
							endpointReadyCache.delete(serviceName);
						} else {
							const hasReadyEndpoints = (endpoints.subsets ?? []).some(
								(subset) => (subset.addresses?.length ?? 0) > 0,
							);
							endpointReadyCache.set(serviceName, hasReadyEndpoints);
						}

						const cachedService = serviceCache.get(serviceName);
						if (cachedService) {
							emitServiceEvent("MODIFIED", cachedService);
						}
					},
					(err) => {
						if (err && abortController.signal.aborted === false) {
							onError(err);
						}
					},
				);
			} catch (error) {
				const err = error as { statusCode?: number };
				if (err.statusCode === 401 && retryOnAuth) {
					this.refreshCredentials();
					return await startEndpointWatch(false);
				}
				throw error;
			}
		};

		try {
			serviceController = await startServiceWatch();
		} catch (error) {
			onError(error);
			abortController.abort();
			throw error;
		}

		try {
			endpointController = await startEndpointWatch();
		} catch {
			// Endpoint watching failed, but we can continue with services only
		}

		abortController.signal.addEventListener("abort", () => {
			serviceController?.abort();
			endpointController?.abort();
		});

		return () => {
			abortController.abort();
		};
	}

	private mapServiceListItem(
		service: V1Service,
		readyEndpointsByService?: Map<string, boolean>,
	): ServiceListItem {
		const creationTimestamp = service.metadata?.creationTimestamp
			? new Date(service.metadata.creationTimestamp).toISOString()
			: undefined;

		const externalIPs = service.status?.loadBalancer?.ingress
			?.map((ing) => ing.ip || ing.hostname)
			.filter((ip): ip is string => Boolean(ip))
			.join(", ");

		const serviceName = service.metadata?.name ?? "unknown";
		const ready = readyEndpointsByService?.get(serviceName) ?? null;

		return {
			name: serviceName,
			namespace: service.metadata?.namespace ?? "default",
			type: service.spec?.type ?? "ClusterIP",
			clusterIP: service.spec?.clusterIP,
			externalIP: externalIPs || undefined,
			ports: (service.spec?.ports ?? []).map((port) => ({
				name: port.name,
				port: port.port ?? 0,
				targetPort: port.targetPort ?? port.port ?? 0,
				protocol: port.protocol ?? "TCP",
			})),
			ready,
			creationTimestamp,
		};
	}

	private mapServiceDetail(service: V1Service): ServiceDetail {
		const listItem = this.mapServiceListItem(service);
		return {
			...listItem,
			labels: service.metadata?.labels ?? {},
			annotations: service.metadata?.annotations ?? {},
			selector: service.spec?.selector ?? {},
			sessionAffinity: service.spec?.sessionAffinity,
			loadBalancerIP: service.spec?.loadBalancerIP,
			externalTrafficPolicy: service.spec?.externalTrafficPolicy,
		};
	}

	async getPodsForService(
		namespace: string,
		serviceName: string,
	): Promise<PodListItem[]> {
		return this.withCredentialRetry(async () => {
			const [service, podList, usageByPod] = await Promise.all([
				this.coreApi.readNamespacedService({ name: serviceName, namespace }),
				this.coreApi.listNamespacedPod({ namespace }),
				this.loadPodMetrics(namespace),
			]);

			const selector = service.spec?.selector ?? {};

			if (Object.keys(selector).length === 0) {
				return [];
			}

			const matchingPods = (podList.items ?? []).filter((pod: V1Pod) => {
				const podLabels = pod.metadata?.labels ?? {};
				return Object.entries(selector).every(
					([key, value]) => podLabels[key] === value,
				);
			});

			return matchingPods.map((pod: V1Pod) => {
				const name = pod.metadata?.name ?? "";
				return this.mapPodListItem(
					pod,
					name ? usageByPod.get(name) : undefined,
				);
			});
		});
	}

	async getServiceEndpoints(
		namespace: string,
		serviceName: string,
	): Promise<{
		endpoints: Array<{
			ip: string;
			nodeName?: string;
			podName?: string;
			ready: boolean;
		}>;
		fromEndpointsAPI: boolean;
	}> {
		return this.withCredentialRetry(async () => {
			try {
				const endpoints = await this.coreApi.readNamespacedEndpoints({
					name: serviceName,
					namespace,
				});
				const endpointList: Array<{
					ip: string;
					nodeName?: string;
					podName?: string;
					ready: boolean;
				}> = [];

				for (const subset of endpoints.subsets ?? []) {
					for (const address of subset.addresses ?? []) {
						endpointList.push({
							ip: address.ip ?? "",
							nodeName: address.nodeName,
							podName: address.targetRef?.name,
							ready: true,
						});
					}
					for (const address of subset.notReadyAddresses ?? []) {
						endpointList.push({
							ip: address.ip ?? "",
							nodeName: address.nodeName,
							podName: address.targetRef?.name,
							ready: false,
						});
					}
				}

				return { endpoints: endpointList, fromEndpointsAPI: true };
			} catch (error) {
				return { endpoints: [], fromEndpointsAPI: false };
			}
		});
	}

	// CronJob methods
	async listCronJobs(namespace: string): Promise<CronJobListItem[]> {
		return this.withCredentialRetry(async () => {
			const cronJobList = await this.batchApi.listNamespacedCronJob({
				namespace,
			});
			return (cronJobList.items ?? []).map((cronJob: V1CronJob) =>
				this.mapCronJobListItem(cronJob),
			);
		});
	}

	async getCronJob(
		namespace: string,
		cronJobName: string,
	): Promise<CronJobDetail> {
		return this.withCredentialRetry(async () => {
			const cronJob = await this.batchApi.readNamespacedCronJob({
				name: cronJobName,
				namespace,
			});
			return this.mapCronJobDetail(cronJob);
		});
	}

	async getCronJobManifest(
		namespace: string,
		cronJobName: string,
	): Promise<string> {
		return this.withCredentialRetry(async () => {
			const cronJob = await this.batchApi.readNamespacedCronJob({
				name: cronJobName,
				namespace,
			});
			const manifest = this.sanitizeManifest(cronJob);
			return JSON.stringify(manifest, null, 2);
		});
	}

	async deleteCronJob(namespace: string, cronJobName: string): Promise<void> {
		return this.withCredentialRetry(async () => {
			await this.batchApi.deleteNamespacedCronJob({
				name: cronJobName,
				namespace,
			});
		});
	}

	async updateCronJobSuspend(
		namespace: string,
		cronJobName: string,
		suspend: boolean,
	): Promise<void> {
		await this.batchApi.patchNamespacedCronJob({
			name: cronJobName,
			namespace,
			body: {
				spec: {
					suspend,
				},
			},
		});
	}

	async streamCronJobs(
		namespace: string,
		onData: (data: string) => void,
		onError: (err: unknown) => void,
		signal?: AbortSignal,
	) {
		const abortController = new AbortController();
		if (signal) {
			const handleAbort = () => abortController.abort(signal.reason);
			signal.addEventListener("abort", handleAbort, { once: true });
			abortController.signal.addEventListener("abort", () => {
				signal.removeEventListener("abort", handleAbort);
			});
		}

		let requestController: AbortController;

		const startWatch = async (
			retryOnAuth: boolean = true,
		): Promise<AbortController> => {
			try {
				return await this.watch.watch(
					`/apis/batch/v1/namespaces/${namespace}/cronjobs`,
					{},
					(type, obj) => {
						try {
							onData(
								JSON.stringify({
									type,
									object: this.mapCronJobListItem(obj as V1CronJob),
								}),
							);
						} catch (err) {
							onError(err);
						}
					},
					(err) => {
						if (err && abortController.signal.aborted === false) {
							onError(err);
						}
					},
				);
			} catch (error) {
				const err = error as { statusCode?: number };
				if (err.statusCode === 401 && retryOnAuth) {
					this.refreshCredentials();
					return await startWatch(false);
				}
				throw error;
			}
		};

		try {
			requestController = await startWatch();
		} catch (error) {
			onError(error);
			abortController.abort();
			throw error;
		}

		abortController.signal.addEventListener("abort", () => {
			requestController.abort();
		});

		return () => {
			abortController.abort();
		};
	}

	private mapCronJobListItem(cronJob: V1CronJob): CronJobListItem {
		const creationTimestamp = cronJob.metadata?.creationTimestamp
			? new Date(cronJob.metadata.creationTimestamp).toISOString()
			: undefined;

		const lastScheduleTime = cronJob.status?.lastScheduleTime
			? new Date(cronJob.status.lastScheduleTime).toISOString()
			: undefined;

		const lastSuccessfulTime = cronJob.status?.lastSuccessfulTime
			? new Date(cronJob.status.lastSuccessfulTime).toISOString()
			: undefined;

		return {
			name: cronJob.metadata?.name ?? "unknown",
			namespace: cronJob.metadata?.namespace ?? "default",
			schedule: cronJob.spec?.schedule ?? "",
			suspend: Boolean(cronJob.spec?.suspend),
			activeJobs: cronJob.status?.active?.length ?? 0,
			lastScheduleTime,
			lastSuccessfulTime,
			concurrencyPolicy: cronJob.spec?.concurrencyPolicy,
			creationTimestamp,
		};
	}

	private mapCronJobDetail(cronJob: V1CronJob): CronJobDetail {
		const listItem = this.mapCronJobListItem(cronJob);
		const podSpec = cronJob.spec?.jobTemplate?.spec?.template?.spec;
		return {
			...listItem,
			labels: cronJob.metadata?.labels ?? {},
			annotations: cronJob.metadata?.annotations ?? {},
			startingDeadlineSeconds: cronJob.spec?.startingDeadlineSeconds,
			successfulJobsHistoryLimit: cronJob.spec?.successfulJobsHistoryLimit,
			failedJobsHistoryLimit: cronJob.spec?.failedJobsHistoryLimit,
			jobTemplate: {
				containers: (podSpec?.containers ?? []).map((container) => ({
					name: container.name,
					image: container.image,
					command: container.command,
					args: container.args,
				})),
				restartPolicy: podSpec?.restartPolicy,
			},
		};
	}

	// Ingress methods
	async listIngresses(namespace: string): Promise<IngressListItem[]> {
		return this.withCredentialRetry(async () => {
			const ingressList = await this.networkingApi.listNamespacedIngress({
				namespace,
			});
			return (ingressList.items ?? []).map((ingress: V1Ingress) =>
				this.mapIngressListItem(ingress),
			);
		});
	}

	async getIngress(
		namespace: string,
		ingressName: string,
	): Promise<IngressDetail> {
		return this.withCredentialRetry(async () => {
			const ingress = await this.networkingApi.readNamespacedIngress({
				name: ingressName,
				namespace,
			});
			return this.mapIngressDetail(ingress);
		});
	}

	async getIngressManifest(
		namespace: string,
		ingressName: string,
	): Promise<string> {
		return this.withCredentialRetry(async () => {
			const ingress = await this.networkingApi.readNamespacedIngress({
				name: ingressName,
				namespace,
			});
			const manifest = this.sanitizeManifest(ingress);
			return JSON.stringify(manifest, null, 2);
		});
	}

	async deleteIngress(namespace: string, ingressName: string): Promise<void> {
		return this.withCredentialRetry(async () => {
			await this.networkingApi.deleteNamespacedIngress({
				name: ingressName,
				namespace,
			});
		});
	}

	async forceDeleteIngress(
		namespace: string,
		ingressName: string,
	): Promise<void> {
		return this.withCredentialRetry(async () => {
			function setHeaderMiddleware(
				key: string,
				value: string,
			): ObservableMiddleware {
				return {
					pre: (request: RequestContext) => {
						request.setHeaderParam(key, value);
						return of(request);
					},
					post: (response: ResponseContext) => {
						return of(response);
					},
				};
			}

			await this.networkingApi.patchNamespacedIngress(
				{
					name: ingressName,
					namespace,
					body: { metadata: { finalizers: null } },
				},
				{
					middleware: [
						setHeaderMiddleware(
							"Content-Type",
							"application/merge-patch+json",
						),
					],
					middlewareMergeStrategy: "append",
				},
			);

			await this.networkingApi.deleteNamespacedIngress({
				name: ingressName,
				namespace,
			});
		});
	}

	async streamIngresses(
		namespace: string,
		onData: (data: string) => void,
		onError: (err: unknown) => void,
		signal?: AbortSignal,
	) {
		const abortController = new AbortController();
		if (signal) {
			const handleAbort = () => abortController.abort(signal.reason);
			signal.addEventListener("abort", handleAbort, { once: true });
			abortController.signal.addEventListener("abort", () => {
				signal.removeEventListener("abort", handleAbort);
			});
		}

		let requestController: AbortController;

		const startWatch = async (
			retryOnAuth: boolean = true,
		): Promise<AbortController> => {
			try {
				return await this.watch.watch(
					`/apis/networking.k8s.io/v1/namespaces/${namespace}/ingresses`,
					{},
					(type, obj) => {
						try {
							onData(
								JSON.stringify({
									type,
									object: this.mapIngressListItem(obj as V1Ingress),
								}),
							);
						} catch (err) {
							onError(err);
						}
					},
					(err) => {
						if (err && abortController.signal.aborted === false) {
							onError(err);
						}
					},
				);
			} catch (error) {
				const err = error as { statusCode?: number };
				if (err.statusCode === 401 && retryOnAuth) {
					this.refreshCredentials();
					return await startWatch(false);
				}
				throw error;
			}
		};

		try {
			requestController = await startWatch();
		} catch (error) {
			onError(error);
			abortController.abort();
			throw error;
		}

		abortController.signal.addEventListener("abort", () => {
			requestController.abort();
		});

		return () => {
			abortController.abort();
		};
	}

	private mapIngressListItem(ingress: V1Ingress): IngressListItem {
		const creationTimestamp = ingress.metadata?.creationTimestamp
			? new Date(ingress.metadata.creationTimestamp).toISOString()
			: undefined;

		const hosts = (ingress.spec?.rules ?? [])
			.map((rule) => rule.host)
			.filter((host): host is string => Boolean(host));

		const tlsHosts = (ingress.spec?.tls ?? [])
			.flatMap((tls) => tls.hosts ?? [])
			.filter((host): host is string => Boolean(host));

		const serviceCount = (ingress.spec?.rules ?? []).reduce((acc, rule) => {
			const paths = rule.http?.paths ?? [];
			return acc + paths.length;
		}, 0);

		return {
			name: ingress.metadata?.name ?? "unknown",
			namespace: ingress.metadata?.namespace ?? "default",
			className: ingress.spec?.ingressClassName,
			hosts,
			serviceCount,
			tlsHosts,
			creationTimestamp,
		};
	}

	private mapIngressDetail(ingress: V1Ingress): IngressDetail {
		const listItem = this.mapIngressListItem(ingress);
		return {
			...listItem,
			labels: ingress.metadata?.labels ?? {},
			annotations: ingress.metadata?.annotations ?? {},
			finalizers: ingress.metadata?.finalizers ?? [],
			rules: (ingress.spec?.rules ?? []).map((rule) => ({
				host: rule.host,
				paths: (rule.http?.paths ?? []).map((path) => ({
					path: path.path,
					pathType: path.pathType,
					serviceName: path.backend?.service?.name,
					servicePort:
						path.backend?.service?.port?.number ??
						path.backend?.service?.port?.name,
				})),
			})),
			tls: (ingress.spec?.tls ?? []).map((tls) => ({
				hosts: tls.hosts ?? [],
				secretName: tls.secretName,
			})),
		};
	}

	// ConfigMap methods
	async listConfigMaps(namespace: string) {
		return this.configMapService.listConfigMaps(namespace);
	}

	async getConfigMap(namespace: string, configMapName: string) {
		return this.configMapService.getConfigMap(namespace, configMapName);
	}

	async getConfigMapManifest(namespace: string, configMapName: string) {
		return this.configMapService.getConfigMapManifest(namespace, configMapName);
	}

	async deleteConfigMap(namespace: string, configMapName: string) {
		return this.configMapService.deleteConfigMap(namespace, configMapName);
	}

	async streamConfigMaps(
		namespace: string,
		onData: (data: string) => void,
		onError: (err: unknown) => void,
		signal?: AbortSignal,
	) {
		return this.configMapService.streamConfigMaps(
			namespace,
			onData,
			onError,
			signal,
		);
	}

	// Secret methods
	async listSecrets(namespace: string) {
		return this.secretService.listSecrets(namespace);
	}

	async getSecret(namespace: string, secretName: string) {
		return this.secretService.getSecret(namespace, secretName);
	}

	async getSecretManifest(namespace: string, secretName: string) {
		return this.secretService.getSecretManifest(namespace, secretName);
	}

	async deleteSecret(namespace: string, secretName: string) {
		return this.secretService.deleteSecret(namespace, secretName);
	}

	async streamSecrets(
		namespace: string,
		onData: (data: string) => void,
		onError: (err: unknown) => void,
		signal?: AbortSignal,
	) {
		return this.secretService.streamSecrets(namespace, onData, onError, signal);
	}

	// HPA methods
	async listHpas(namespace: string) {
		return this.hpaService.listHpas(namespace);
	}

	async getHpa(namespace: string, hpaName: string) {
		return this.hpaService.getHpa(namespace, hpaName);
	}

	async getHpaManifest(namespace: string, hpaName: string) {
		return this.hpaService.getHpaManifest(namespace, hpaName);
	}

	async deleteHpa(namespace: string, hpaName: string) {
		return this.hpaService.deleteHpa(namespace, hpaName);
	}

	async patchHpaMinReplicas(
		namespace: string,
		hpaName: string,
		minReplicas: number,
	) {
		return this.hpaService.patchHpaMinReplicas(namespace, hpaName, minReplicas);
	}

	async streamHpas(
		namespace: string,
		onData: (data: string) => void,
		onError: (err: unknown) => void,
		signal?: AbortSignal,
	) {
		return this.hpaService.streamHpas(namespace, onData, onError, signal);
	}

	async getHpaEvents(namespace: string, hpaName: string) {
		return this.hpaService.getHpaEvents(namespace, hpaName);
	}

	// PodDisruptionBudget methods - delegated to PdbService
	async listPdbs(namespace: string) {
		return this.pdbService.listPdbs(namespace);
	}

	async getPdb(namespace: string, pdbName: string) {
		return this.pdbService.getPdb(namespace, pdbName);
	}

	async getPdbManifest(namespace: string, pdbName: string) {
		return this.pdbService.getPdbManifest(namespace, pdbName);
	}

	async deletePdb(namespace: string, pdbName: string) {
		return this.pdbService.deletePdb(namespace, pdbName);
	}

	async getPdbEvents(namespace: string, pdbName: string) {
		return this.pdbService.getPdbEvents(namespace, pdbName);
	}

	async streamPdbs(
		namespace: string,
		onData: (data: string) => void,
		onError: (err: unknown) => void,
		signal?: AbortSignal,
	) {
		return this.pdbService.streamPdbs(namespace, onData, onError, signal);
	}

	// Port forward methods
	async startPortForward(
		namespace: string,
		pod: string,
		localPort: number,
		targetPort: number,
	) {
		return this.portForwardService.startPortForward({
			namespace,
			pod,
			localPort,
			targetPort,
		});
	}

	stopPortForward(id: string) {
		return this.portForwardService.stopPortForward(id);
	}

	listPortForwards() {
		return this.portForwardService.listActiveForwards();
	}

	stopAllPortForwards() {
		return this.portForwardService.stopAllForwards();
	}

	// Exec methods
	async execInPod(
		namespace: string,
		pod: string,
		container: string,
		command: string[],
	) {
		return this.execService.execInPod({
			namespace,
			pod,
			container,
			command,
		});
	}

	// Node exec methods
	async createNodeDebugSession(nodeName: string) {
		return this.nodeExecService.createDebugSession(nodeName);
	}

	async execOnNode(sessionId: string, command: string[]) {
		return this.nodeExecService.execOnNode(sessionId, command);
	}

	async deleteNodeDebugSession(sessionId: string) {
		return this.nodeExecService.deleteDebugSession(sessionId);
	}

	getNodeDebugSession(sessionId: string) {
		return this.nodeExecService.getSession(sessionId);
	}

	listNodeDebugSessions() {
		return this.nodeExecService.listSessions();
	}

	async cleanupAllNodeDebugSessions() {
		return this.nodeExecService.cleanupAllSessions();
	}

	// ExternalSecret methods
	async listExternalSecrets(
		namespace: string,
	): Promise<ExternalSecretListItem[]> {
		const crdExists = await this.checkCRDExists(
			"externalsecrets.external-secrets.io",
		);
		if (!crdExists) {
			throw new CRDNotInstalledError(
				"externalsecrets.external-secrets.io",
				"External Secrets Operator",
			);
		}

		return this.withCredentialRetry(async () => {
			const response = await this.customObjectsApi.listNamespacedCustomObject({
				group: "external-secrets.io",
				version: "v1beta1",
				namespace,
				plural: "externalsecrets",
			});

			const list = response as unknown as KubernetesListResponse;
			return (list.items ?? []).map((item) =>
				this.mapExternalSecretListItem(item),
			);
		});
	}

	async getExternalSecret(
		namespace: string,
		name: string,
	): Promise<ExternalSecretDetail> {
		return this.withCredentialRetry(async () => {
			const response = await this.customObjectsApi.getNamespacedCustomObject({
				group: "external-secrets.io",
				version: "v1beta1",
				namespace,
				plural: "externalsecrets",
				name,
			});

			return this.mapExternalSecretDetail(response as Record<string, unknown>);
		});
	}

	async getExternalSecretManifest(
		namespace: string,
		name: string,
	): Promise<string> {
		return this.withCredentialRetry(async () => {
			const response = await this.customObjectsApi.getNamespacedCustomObject({
				group: "external-secrets.io",
				version: "v1beta1",
				namespace,
				plural: "externalsecrets",
				name,
			});
			const manifest = this.sanitizeManifest(response);
			return JSON.stringify(manifest, null, 2);
		});
	}

	async getExternalSecretEvents(
		namespace: string,
		name: string,
	): Promise<ExternalSecretEvent[]> {
		return this.withCredentialRetry(async () => {
			const events = await this.coreApi.listNamespacedEvent({
				namespace,
				fieldSelector: `involvedObject.name=${name},involvedObject.kind=ExternalSecret`,
			});

			return (events.items ?? [])
				.map((event: CoreV1Event) => ({
					type: event.type ?? "",
					reason: event.reason ?? "",
					message: event.message ?? "",
					count: event.count,
					firstTimestamp: event.firstTimestamp?.toISOString(),
					lastTimestamp: event.lastTimestamp?.toISOString(),
					source: event.source?.component ?? event.reportingComponent,
				}))
				.sort((a, b) => {
					const timeA = new Date(
						a.lastTimestamp ?? a.firstTimestamp ?? "",
					).getTime();
					const timeB = new Date(
						b.lastTimestamp ?? b.firstTimestamp ?? "",
					).getTime();
					return timeB - timeA;
				});
		});
	}

	async getExternalSecretStatus(
		namespace: string,
		name: string,
	): Promise<ExternalSecretStatus> {
		return this.withCredentialRetry(async () => {
			const response = await this.customObjectsApi.getNamespacedCustomObject({
				group: "external-secrets.io",
				version: "v1beta1",
				namespace,
				plural: "externalsecrets",
				name,
			});

			return this.mapExternalSecretStatus(response as Record<string, unknown>);
		});
	}

	async deleteExternalSecret(namespace: string, name: string): Promise<void> {
		return this.withCredentialRetry(async () => {
			await this.customObjectsApi.deleteNamespacedCustomObject({
				group: "external-secrets.io",
				version: "v1beta1",
				namespace,
				plural: "externalsecrets",
				name,
			});
		});
	}

	async streamExternalSecrets(
		namespace: string,
		onData: (data: string) => void,
		onError: (err: unknown) => void,
		signal?: AbortSignal,
	) {
		const crdExists = await this.checkCRDExists(
			"externalsecrets.external-secrets.io",
		);
		if (!crdExists) {
			const error = new CRDNotInstalledError(
				"externalsecrets.external-secrets.io",
				"External Secrets Operator",
			);
			onError(error);
			return () => {};
		}

		const abortController = new AbortController();
		if (signal) {
			const handleAbort = () => abortController.abort(signal.reason);
			signal.addEventListener("abort", handleAbort, { once: true });
			abortController.signal.addEventListener("abort", () => {
				signal.removeEventListener("abort", handleAbort);
			});
		}

		let requestController: AbortController;

		const startWatch = async (
			retryOnAuth: boolean = true,
		): Promise<AbortController> => {
			try {
				return await this.watch.watch(
					`/apis/external-secrets.io/v1beta1/namespaces/${namespace}/externalsecrets`,
					{},
					(type, obj) => {
						try {
							onData(
								JSON.stringify({
									type,
									object: this.mapExternalSecretListItem(
										obj as Record<string, unknown>,
									),
								}),
							);
						} catch (err) {
							onError(err);
						}
					},
					(err) => {
						if (err && abortController.signal.aborted === false) {
							onError(err);
						}
					},
				);
			} catch (error) {
				const err = error as { statusCode?: number };
				if (err.statusCode === 401 && retryOnAuth) {
					this.refreshCredentials();
					return await startWatch(false);
				}
				throw error;
			}
		};

		try {
			requestController = await startWatch();
		} catch (error) {
			onError(error);
			abortController.abort();
			throw error;
		}

		abortController.signal.addEventListener("abort", () => {
			requestController.abort();
		});

		return () => {
			abortController.abort();
		};
	}

	private mapExternalSecretListItem(
		secret: Record<string, unknown>,
	): ExternalSecretListItem {
		const metadata = secret?.["metadata"] as
			| Record<string, unknown>
			| undefined;
		const spec = secret?.["spec"] as Record<string, unknown> | undefined;
		const status = secret?.["status"] as Record<string, unknown> | undefined;
		const target = spec?.["target"] as Record<string, unknown> | undefined;
		const storeRef = spec?.["secretStoreRef"] as
			| Record<string, unknown>
			| undefined;
		const conditions = Array.isArray(status?.["conditions"])
			? (status?.["conditions"] as Array<Record<string, unknown>>)
			: [];
		const readyCondition =
			conditions.find((condition) => condition?.["type"] === "Ready") ??
			conditions[0];

		const creationTimestamp = metadata?.["creationTimestamp"]
			? new Date(metadata["creationTimestamp"] as string).toISOString()
			: undefined;

		return {
			name: (metadata?.["name"] as string) ?? "unknown",
			namespace: (metadata?.["namespace"] as string) ?? "default",
			secretName: (target?.["name"] as string) ?? undefined,
			refreshInterval: spec?.["refreshInterval"] as string | undefined,
			storeKind: (storeRef?.["kind"] as string) ?? undefined,
			storeName: (storeRef?.["name"] as string) ?? undefined,
			readyStatus: readyCondition?.["status"] as string | undefined,
			readyMessage: readyCondition?.["message"] as string | undefined,
			syncedAt: status?.["refreshTime"] as string | undefined,
			creationTimestamp,
		};
	}

	private mapExternalSecretDetail(
		secret: Record<string, unknown>,
	): ExternalSecretDetail {
		const listItem = this.mapExternalSecretListItem(secret);
		const metadata = secret?.["metadata"] as
			| Record<string, unknown>
			| undefined;
		const spec = secret?.["spec"] as Record<string, unknown> | undefined;
		const target = spec?.["target"] as Record<string, unknown> | undefined;
		const data = Array.isArray(spec?.["data"])
			? (spec?.["data"] as Array<Record<string, unknown>>)
			: [];
		const dataFrom = Array.isArray(spec?.["dataFrom"])
			? (spec?.["dataFrom"] as Array<Record<string, unknown>>)
			: [];

		return {
			...listItem,
			labels: (metadata?.["labels"] as Record<string, string>) ?? {},
			annotations: (metadata?.["annotations"] as Record<string, string>) ?? {},
			target: {
				creationPolicy: target?.["creationPolicy"] as string | undefined,
				deletionPolicy: target?.["deletionPolicy"] as string | undefined,
				name: target?.["name"] as string | undefined,
				template: target?.["template"] as Record<string, unknown> | undefined,
			},
			data: data.map((item) => ({
				secretKey: item?.["secretKey"] as string | undefined,
				remoteRef: item?.["remoteRef"] as Record<string, unknown> | undefined,
			})),
			dataFrom: dataFrom.map((item) => ({ ...item })),
		};
	}

	private mapExternalSecretStatus(
		secret: Record<string, unknown>,
	): ExternalSecretStatus {
		const status = secret?.["status"] as Record<string, unknown> | undefined;
		const conditions = Array.isArray(status?.["conditions"])
			? (status?.["conditions"] as Array<Record<string, unknown>>)
			: [];
		const readyCondition =
			conditions.find((condition) => condition?.["type"] === "Ready") ??
			conditions[0];

		return {
			readyStatus: readyCondition?.["status"] as string | undefined,
			readyMessage: readyCondition?.["message"] as string | undefined,
			syncedAt: status?.["syncedResourceVersion"] as string | undefined,
			refreshTime: status?.["refreshTime"] as string | undefined,
			observedGeneration: status?.["observedGeneration"] as number | undefined,
			conditions: conditions.map((condition) => ({
				type: (condition?.["type"] as string) ?? "",
				status: (condition?.["status"] as string) ?? "",
				reason: condition?.["reason"] as string | undefined,
				message: condition?.["message"] as string | undefined,
				lastTransitionTime: condition?.["lastTransitionTime"] as
					| string
					| undefined,
			})),
		};
	}

	// SecretStore methods
	async listSecretStores(namespace: string): Promise<SecretStoreListItem[]> {
		const crdExists = await this.checkCRDExists(
			"secretstores.external-secrets.io",
		);
		if (!crdExists) {
			throw new CRDNotInstalledError(
				"secretstores.external-secrets.io",
				"External Secrets Operator",
			);
		}

		return this.withCredentialRetry(async () => {
			const response = await this.customObjectsApi.listNamespacedCustomObject({
				group: "external-secrets.io",
				version: "v1beta1",
				namespace,
				plural: "secretstores",
			});

			const list = response as unknown as KubernetesListResponse;
			return (list.items ?? []).map((item) =>
				this.mapSecretStoreListItem(item),
			);
		});
	}

	async getSecretStore(
		namespace: string,
		name: string,
	): Promise<SecretStoreDetail> {
		return this.withCredentialRetry(async () => {
			const response = await this.customObjectsApi.getNamespacedCustomObject({
				group: "external-secrets.io",
				version: "v1beta1",
				namespace,
				plural: "secretstores",
				name,
			});

			return this.mapSecretStoreDetail(response as Record<string, unknown>);
		});
	}

	async getSecretStoreManifest(
		namespace: string,
		name: string,
	): Promise<string> {
		return this.withCredentialRetry(async () => {
			const response = await this.customObjectsApi.getNamespacedCustomObject({
				group: "external-secrets.io",
				version: "v1beta1",
				namespace,
				plural: "secretstores",
				name,
			});
			const manifest = this.sanitizeManifest(response);
			return JSON.stringify(manifest, null, 2);
		});
	}

	async getSecretStoreEvents(
		namespace: string,
		name: string,
	): Promise<SecretStoreEvent[]> {
		return this.withCredentialRetry(async () => {
			const events = await this.coreApi.listNamespacedEvent({
				namespace,
				fieldSelector: `involvedObject.name=${name},involvedObject.kind=SecretStore`,
			});

			return (events.items ?? [])
				.map((event: CoreV1Event) => ({
					type: event.type ?? "",
					reason: event.reason ?? "",
					message: event.message ?? "",
					count: event.count,
					firstTimestamp: event.firstTimestamp?.toISOString(),
					lastTimestamp: event.lastTimestamp?.toISOString(),
					source: event.source?.component ?? event.reportingComponent,
				}))
				.sort((a, b) => {
					const timeA = new Date(
						a.lastTimestamp ?? a.firstTimestamp ?? "",
					).getTime();
					const timeB = new Date(
						b.lastTimestamp ?? b.firstTimestamp ?? "",
					).getTime();
					return timeB - timeA;
				});
		});
	}

	async getSecretStoreStatus(
		namespace: string,
		name: string,
	): Promise<SecretStoreStatus> {
		return this.withCredentialRetry(async () => {
			const response = await this.customObjectsApi.getNamespacedCustomObject({
				group: "external-secrets.io",
				version: "v1beta1",
				namespace,
				plural: "secretstores",
				name,
			});

			return this.mapSecretStoreStatus(response as Record<string, unknown>);
		});
	}

	async deleteSecretStore(namespace: string, name: string): Promise<void> {
		return this.withCredentialRetry(async () => {
			await this.customObjectsApi.deleteNamespacedCustomObject({
				group: "external-secrets.io",
				version: "v1beta1",
				namespace,
				plural: "secretstores",
				name,
			});
		});
	}

	async streamSecretStores(
		namespace: string,
		onData: (data: string) => void,
		onError: (err: unknown) => void,
		signal?: AbortSignal,
	) {
		const crdExists = await this.checkCRDExists(
			"secretstores.external-secrets.io",
		);
		if (!crdExists) {
			const error = new CRDNotInstalledError(
				"secretstores.external-secrets.io",
				"External Secrets Operator",
			);
			onError(error);
			return () => {};
		}

		const abortController = new AbortController();
		if (signal) {
			const handleAbort = () => abortController.abort(signal.reason);
			signal.addEventListener("abort", handleAbort, { once: true });
			abortController.signal.addEventListener("abort", () => {
				signal.removeEventListener("abort", handleAbort);
			});
		}

		let requestController: AbortController;

		const startWatch = async (
			retryOnAuth: boolean = true,
		): Promise<AbortController> => {
			try {
				return await this.watch.watch(
					`/apis/external-secrets.io/v1beta1/namespaces/${namespace}/secretstores`,
					{},
					(type, obj) => {
						try {
							onData(
								JSON.stringify({
									type,
									object: this.mapSecretStoreListItem(
										obj as Record<string, unknown>,
									),
								}),
							);
						} catch (err) {
							onError(err);
						}
					},
					(err) => {
						if (err && abortController.signal.aborted === false) {
							onError(err);
						}
					},
				);
			} catch (error) {
				const err = error as { statusCode?: number };
				if (err.statusCode === 401 && retryOnAuth) {
					this.refreshCredentials();
					return await startWatch(false);
				}
				throw error;
			}
		};

		try {
			requestController = await startWatch();
		} catch (error) {
			onError(error);
			abortController.abort();
			throw error;
		}

		abortController.signal.addEventListener("abort", () => {
			requestController.abort();
		});

		return () => {
			abortController.abort();
		};
	}

	private mapSecretStoreListItem(
		secretStore: Record<string, unknown>,
	): SecretStoreListItem {
		const metadata = secretStore?.["metadata"] as
			| Record<string, unknown>
			| undefined;
		const spec = secretStore?.["spec"] as Record<string, unknown> | undefined;
		const status = secretStore?.["status"] as
			| Record<string, unknown>
			| undefined;
		const conditions = Array.isArray(status?.["conditions"])
			? (status?.["conditions"] as Array<Record<string, unknown>>)
			: [];
		const readyCondition =
			conditions.find((condition) => condition?.["type"] === "Ready") ??
			conditions[0];

		const provider = spec?.["provider"] as Record<string, unknown> | undefined;
		const providerType = provider ? Object.keys(provider)[0] : undefined;
		const providerConfig = providerType ? provider?.[providerType] : undefined;

		const creationTimestamp = metadata?.["creationTimestamp"]
			? new Date(metadata["creationTimestamp"] as string).toISOString()
			: undefined;

		return {
			name: (metadata?.["name"] as string) ?? "unknown",
			namespace: (metadata?.["namespace"] as string) ?? "default",
			providerType,
			providerSummary: providerConfig
				? JSON.stringify(providerConfig)
				: undefined,
			refreshInterval: spec?.["refreshInterval"] as string | undefined,
			readyStatus: readyCondition?.["status"] as string | undefined,
			readyMessage: readyCondition?.["message"] as string | undefined,
			creationTimestamp,
		};
	}

	private mapSecretStoreDetail(
		secretStore: Record<string, unknown>,
	): SecretStoreDetail {
		const listItem = this.mapSecretStoreListItem(secretStore);
		const metadata = secretStore?.["metadata"] as
			| Record<string, unknown>
			| undefined;
		const spec = secretStore?.["spec"] as Record<string, unknown> | undefined;

		return {
			...listItem,
			labels: (metadata?.["labels"] as Record<string, string>) ?? {},
			annotations: (metadata?.["annotations"] as Record<string, string>) ?? {},
			provider: spec?.["provider"] as Record<string, unknown> | undefined,
			retrySettings: spec?.["retrySettings"] as
				| Record<string, unknown>
				| undefined,
		};
	}

	private mapSecretStoreStatus(
		secretStore: Record<string, unknown>,
	): SecretStoreStatus {
		const status = secretStore?.["status"] as
			| Record<string, unknown>
			| undefined;
		const conditions = Array.isArray(status?.["conditions"])
			? (status?.["conditions"] as Array<Record<string, unknown>>)
			: [];
		const readyCondition =
			conditions.find((condition) => condition?.["type"] === "Ready") ??
			conditions[0];

		return {
			readyStatus: readyCondition?.["status"] as string | undefined,
			readyMessage: readyCondition?.["message"] as string | undefined,
			observedGeneration: status?.["observedGeneration"] as number | undefined,
			conditions: conditions.map((condition) => ({
				type: (condition?.["type"] as string) ?? "",
				status: (condition?.["status"] as string) ?? "",
				reason: condition?.["reason"] as string | undefined,
				message: condition?.["message"] as string | undefined,
				lastTransitionTime: condition?.["lastTransitionTime"] as
					| string
					| undefined,
			})),
		};
	}

	async listCustomResourceDefinitions(): Promise<
		CustomResourceDefinitionListItem[]
	> {
		return this.withCredentialRetry(async () => {
			const response = await this.customObjectsApi.listClusterCustomObject({
				group: "apiextensions.k8s.io",
				version: "v1",
				plural: "customresourcedefinitions",
			});
			const list = response as unknown as KubernetesListResponse;
			return (list.items ?? []).map((item) =>
				this.mapCustomResourceDefinitionListItem(item),
			);
		});
	}

	async checkCRDExists(crdName: string): Promise<boolean> {
		if (this.crdCache.has(crdName)) {
			return this.crdCache.get(crdName)!;
		}

		return this.withCredentialRetry(async () => {
			try {
				const response = await this.customObjectsApi.listClusterCustomObject({
					group: "apiextensions.k8s.io",
					version: "v1",
					plural: "customresourcedefinitions",
				});
				const list = response as unknown as KubernetesListResponse;
				const exists = (list.items ?? []).some((item) => {
					const metadata = (item as Record<string, unknown>)?.["metadata"] as
						| Record<string, unknown>
						| undefined;
					return metadata?.["name"] === crdName;
				});
				this.crdCache.set(crdName, exists);
				return exists;
			} catch (error) {
				const err = error as { statusCode?: number };
				if (err.statusCode === 404 || err.statusCode === 403) {
					this.crdCache.set(crdName, false);
					return false;
				}
				throw error;
			}
		});
	}

	async getCustomResourceDefinition(
		name: string,
	): Promise<CustomResourceDefinitionDetail> {
		const response = await (
			this.customObjectsApi as unknown as {
				getClusterCustomObject: (param: {
					group: string;
					version: string;
					plural: string;
					name: string;
				}) => Promise<unknown>;
			}
		).getClusterCustomObject({
			group: "apiextensions.k8s.io",
			version: "v1",
			plural: "customresourcedefinitions",
			name,
		});
		const body = response as unknown as { body: Record<string, unknown> };
		return this.mapCustomResourceDefinitionDetail(body.body);
	}

	async getCustomResourceDefinitionManifest(name: string): Promise<string> {
		return this.withCredentialRetry(async () => {
			const response = await (
				this.customObjectsApi as unknown as {
					getClusterCustomObject: (param: {
						group: string;
						version: string;
						plural: string;
						name: string;
					}) => Promise<unknown>;
				}
			).getClusterCustomObject({
				group: "apiextensions.k8s.io",
				version: "v1",
				plural: "customresourcedefinitions",
				name,
			});
			const body = response as unknown as { body: Record<string, unknown> };
			const manifest = this.sanitizeManifest(body.body);
			return JSON.stringify(manifest, null, 2);
		});
	}

	async deleteCustomResourceDefinition(name: string): Promise<void> {
		return this.withCredentialRetry(async () => {
			await (
				this.customObjectsApi as unknown as {
					deleteClusterCustomObject: (param: {
						group: string;
						version: string;
						plural: string;
						name: string;
					}) => Promise<unknown>;
				}
			).deleteClusterCustomObject({
				group: "apiextensions.k8s.io",
				version: "v1",
				plural: "customresourcedefinitions",
				name,
			});
		});
	}

	async streamCustomResourceDefinitions(
		onData: (data: string) => void,
		onError: (err: unknown) => void,
		signal?: AbortSignal,
	) {
		const abortController = new AbortController();
		if (signal) {
			const handleAbort = () => abortController.abort(signal.reason);
			signal.addEventListener("abort", handleAbort, { once: true });
			abortController.signal.addEventListener("abort", () => {
				signal.removeEventListener("abort", handleAbort);
			});
		}

		let requestController: AbortController;

		const startWatch = async (
			retryOnAuth: boolean = true,
		): Promise<AbortController> => {
			try {
				return await this.watch.watch(
					"/apis/apiextensions.k8s.io/v1/customresourcedefinitions",
					{},
					(type, obj) => {
						try {
							onData(
								JSON.stringify({
									type,
									object: this.mapCustomResourceDefinitionListItem(
										obj as Record<string, unknown>,
									),
								}),
							);
						} catch (err) {
							onError(err);
						}
					},
					(err) => {
						if (err && abortController.signal.aborted === false) {
							onError(err);
						}
					},
				);
			} catch (error) {
				const err = error as { statusCode?: number };
				if (err.statusCode === 401 && retryOnAuth) {
					this.refreshCredentials();
					return await startWatch(false);
				}
				throw error;
			}
		};

		try {
			requestController = await startWatch();
		} catch (error) {
			onError(error);
			abortController.abort();
			throw error;
		}

		abortController.signal.addEventListener("abort", () => {
			requestController.abort();
		});

		return () => {
			abortController.abort();
		};
	}

	private mapCustomResourceDefinitionListItem(
		crd: Record<string, unknown>,
	): CustomResourceDefinitionListItem {
		const metadata = crd?.["metadata"] as Record<string, unknown> | undefined;
		const spec = crd?.["spec"] as Record<string, unknown> | undefined;
		const status = crd?.["status"] as Record<string, unknown> | undefined;
		const versions =
			(spec?.["versions"] as Array<Record<string, unknown>> | undefined) ?? [];

		const storageVersions = (
			(status?.["storedVersions"] as string[] | undefined) ?? []
		).map((name) => {
			const versionInfo = versions.find((v) => v?.["name"] === name) as
				| Record<string, unknown>
				| undefined;
			return {
				name,
				served: (versionInfo?.["served"] as boolean | undefined) ?? false,
				storage: (versionInfo?.["storage"] as boolean | undefined) ?? false,
			};
		});

		const conditions =
			(status?.["conditions"] as Array<Record<string, unknown>> | undefined) ??
			[];
		const established = conditions.some(
			(condition) =>
				condition?.["type"] === "Established" &&
				condition?.["status"] === "True",
		);
		const namesAccepted = conditions.some(
			(condition) =>
				condition?.["type"] === "NamesAccepted" &&
				condition?.["status"] === "True",
		);
		const terminating = conditions.some(
			(condition) =>
				condition?.["type"] === "Terminating" &&
				condition?.["status"] === "True",
		);
		const names = spec?.["names"] as Record<string, unknown> | undefined;

		return {
			name: (metadata?.["name"] as string) ?? "unknown",
			group: (spec?.["group"] as string) ?? "",
			version: (versions[0]?.["name"] as string) ?? "",
			scope: (spec?.["scope"] as string) ?? "",
			kind: (names?.["kind"] as string) ?? "",
			shortNames: (names?.["shortNames"] as string[] | undefined) ?? [],
			categories: (names?.["categories"] as string[] | undefined) ?? [],
			established,
			namesAccepted,
			terminating,
			storageVersions,
			creationTimestamp: metadata?.["creationTimestamp"]
				? new Date(metadata["creationTimestamp"] as string).toISOString()
				: undefined,
		};
	}

	private mapCustomResourceDefinitionDetail(
		crd: Record<string, unknown>,
	): CustomResourceDefinitionDetail {
		const listItem = this.mapCustomResourceDefinitionListItem(crd);
		const metadata = crd?.["metadata"] as Record<string, unknown> | undefined;
		const spec = crd?.["spec"] as Record<string, unknown> | undefined;
		const status = crd?.["status"] as Record<string, unknown> | undefined;
		const versions =
			(spec?.["versions"] as Array<Record<string, unknown>> | undefined) ?? [];
		const conditions =
			(status?.["conditions"] as Array<Record<string, unknown>> | undefined) ??
			[];

		return {
			...listItem,
			labels:
				(metadata?.["labels"] as Record<string, string> | undefined) ?? {},
			annotations:
				(metadata?.["annotations"] as Record<string, string> | undefined) ?? {},
			conditions: conditions.map((condition) => ({
				type: (condition?.["type"] as string) ?? "",
				status: (condition?.["status"] as string) ?? "",
				reason: condition?.["reason"] as string | undefined,
				message: condition?.["message"] as string | undefined,
				lastTransitionTime: condition?.["lastTransitionTime"]
					? new Date(condition["lastTransitionTime"] as string).toISOString()
					: undefined,
			})),
			acceptedNames: JSON.parse(
				JSON.stringify(status?.["acceptedNames"] ?? {}),
			) as Record<string, unknown>,
			versions: versions.map((version) => ({
				name: (version?.["name"] as string) ?? "",
				served: (version?.["served"] as boolean | undefined) ?? false,
				storage: (version?.["storage"] as boolean | undefined) ?? false,
				schema:
					version?.["schema"] &&
					(version["schema"] as Record<string, unknown>)?.["openAPIV3Schema"]
						? (JSON.parse(
								JSON.stringify(
									(version["schema"] as Record<string, unknown>)[
										"openAPIV3Schema"
									],
								),
							) as Record<string, unknown>)
						: undefined,
				subresources: version?.["subresources"]
					? (JSON.parse(JSON.stringify(version["subresources"])) as Record<
							string,
							unknown
						>)
					: undefined,
				additionalPrinterColumns: (
					version?.["additionalPrinterColumns"] as
						| Array<Record<string, unknown>>
						| undefined
				)?.map(
					(col) => JSON.parse(JSON.stringify(col)) as Record<string, unknown>,
				),
			})),
		};
	}

	async detectInstalledApplications(): Promise<InstalledApplication[]> {
		return this.withCredentialRetry(async () => {
			const { APPLICATION_DEFINITIONS } = await import(
				"../application-definitions.js"
			);

			const crds = await this.listCustomResourceDefinitions();
			const crdGroups = new Set(crds.map((crd) => crd.group));

			const allApps: InstalledApplication[] = [];

			for (const appDef of APPLICATION_DEFINITIONS) {
				let isInstalled = false;
				const detectedBy: string[] = [];

				if (appDef.detectionPatterns.crdGroups) {
					for (const group of appDef.detectionPatterns.crdGroups) {
						if (crdGroups.has(group)) {
							isInstalled = true;
							detectedBy.push(`CRD group: ${group}`);
						}
					}
				}

				allApps.push({
					name: appDef.name,
					description: appDef.description,
					logoUrl: appDef.logoUrl,
					logoBgColor: appDef.logoBgColor,
					category: appDef.category,
					docsUrl: appDef.docsUrl,
					detectedBy,
					installed: isInstalled,
				});
			}

			return allApps.sort((a, b) => a.name.localeCompare(b.name));
		});
	}

	// PersistentVolumeClaim methods
	async listPersistentVolumeClaims(
		namespace: string,
	): Promise<PersistentVolumeClaimListItem[]> {
		return this.withCredentialRetry(async () => {
			const pvcList = await this.coreApi.listNamespacedPersistentVolumeClaim({
				namespace,
			});
			return (pvcList.items ?? []).map((pvc: V1PersistentVolumeClaim) =>
				this.mapPersistentVolumeClaimListItem(pvc),
			);
		});
	}

	async getPersistentVolumeClaim(
		namespace: string,
		pvcName: string,
	): Promise<PersistentVolumeClaimDetail> {
		return this.withCredentialRetry(async () => {
			const pvc = await this.coreApi.readNamespacedPersistentVolumeClaim({
				name: pvcName,
				namespace,
			});
			return this.mapPersistentVolumeClaimDetail(pvc);
		});
	}

	async getPersistentVolumeClaimManifest(
		namespace: string,
		pvcName: string,
	): Promise<string> {
		return this.withCredentialRetry(async () => {
			const pvc = await this.coreApi.readNamespacedPersistentVolumeClaim({
				name: pvcName,
				namespace,
			});
			const manifest = this.sanitizeManifest(pvc);
			return JSON.stringify(manifest, null, 2);
		});
	}

	async deletePersistentVolumeClaim(
		namespace: string,
		pvcName: string,
	): Promise<void> {
		return this.withCredentialRetry(async () => {
			await this.coreApi.deleteNamespacedPersistentVolumeClaim({
				name: pvcName,
				namespace,
			});
		});
	}

	async streamPersistentVolumeClaims(
		namespace: string,
		onData: (data: string) => void,
		onError: (err: unknown) => void,
		signal?: AbortSignal,
	) {
		const abortController = new AbortController();
		if (signal) {
			const handleAbort = () => abortController.abort(signal.reason);
			signal.addEventListener("abort", handleAbort, { once: true });
			abortController.signal.addEventListener("abort", () => {
				signal.removeEventListener("abort", handleAbort);
			});
		}

		let requestController: AbortController;

		const startWatch = async (
			retryOnAuth: boolean = true,
		): Promise<AbortController> => {
			try {
				return await this.watch.watch(
					`/api/v1/namespaces/${namespace}/persistentvolumeclaims`,
					{},
					(type, obj) => {
						try {
							onData(
								JSON.stringify({
									type,
									object: this.mapPersistentVolumeClaimListItem(
										obj as V1PersistentVolumeClaim,
									),
								}),
							);
						} catch (err) {
							onError(err);
						}
					},
					(err) => {
						if (err && abortController.signal.aborted === false) {
							onError(err);
						}
					},
				);
			} catch (error) {
				const err = error as { statusCode?: number };
				if (err.statusCode === 401 && retryOnAuth) {
					this.refreshCredentials();
					return await startWatch(false);
				}
				throw error;
			}
		};

		try {
			requestController = await startWatch();
		} catch (error) {
			onError(error);
			abortController.abort();
			throw error;
		}

		abortController.signal.addEventListener("abort", () => {
			requestController.abort();
		});

		return () => {
			abortController.abort();
		};
	}

	private mapPersistentVolumeClaimListItem(
		pvc: V1PersistentVolumeClaim,
	): PersistentVolumeClaimListItem {
		const creationTimestamp = pvc.metadata?.creationTimestamp
			? new Date(pvc.metadata.creationTimestamp).toISOString()
			: undefined;

		const capacity = pvc.status?.capacity?.storage;
		const requestedStorage = pvc.spec?.resources?.requests?.storage;

		return {
			name: pvc.metadata?.name ?? "unknown",
			namespace: pvc.metadata?.namespace ?? "default",
			status: pvc.status?.phase ?? "Unknown",
			storageClass: pvc.spec?.storageClassName,
			capacity,
			requestedStorage,
			accessModes: pvc.spec?.accessModes ?? [],
			volumeName: pvc.spec?.volumeName,
			creationTimestamp,
		};
	}

	private mapPersistentVolumeClaimDetail(
		pvc: V1PersistentVolumeClaim,
	): PersistentVolumeClaimDetail {
		const listItem = this.mapPersistentVolumeClaimListItem(pvc);
		return {
			...listItem,
			labels: pvc.metadata?.labels ?? {},
			annotations: pvc.metadata?.annotations ?? {},
			volumeMode: pvc.spec?.volumeMode,
			storageRequest: pvc.spec?.resources?.requests?.storage,
			storageLimit: pvc.spec?.resources?.limits?.storage,
			selector: pvc.spec?.selector
				? JSON.parse(JSON.stringify(pvc.spec.selector))
				: undefined,
			conditions: (pvc.status?.conditions ?? []).map((condition) => ({
				type: condition.type,
				status: condition.status,
				reason: condition.reason,
				message: condition.message,
				lastTransitionTime: condition.lastTransitionTime?.toISOString(),
			})),
		};
	}

	// StorageClass methods - delegated to StorageClassService
	async listStorageClasses() {
		return this.storageClassService.listStorageClasses();
	}

	async getStorageClass(name: string) {
		return this.storageClassService.getStorageClass(name);
	}

	async getStorageClassManifest(name: string) {
		return this.storageClassService.getStorageClassManifest(name);
	}

	async deleteStorageClass(name: string) {
		return this.storageClassService.deleteStorageClass(name);
	}

	async streamStorageClasses(
		onData: (data: string) => void,
		onError: (err: unknown) => void,
		signal?: AbortSignal,
	) {
		return this.storageClassService.streamStorageClasses(
			onData,
			onError,
			signal,
		);
	}

	// Role methods - delegated to RoleService
	async listRoles(namespace: string) {
		return this.roleService.listRoles(namespace);
	}

	async getRole(namespace: string, roleName: string) {
		return this.roleService.getRole(namespace, roleName);
	}

	async getRoleManifest(namespace: string, roleName: string) {
		return this.roleService.getRoleManifest(namespace, roleName);
	}

	async deleteRole(namespace: string, roleName: string) {
		return this.roleService.deleteRole(namespace, roleName);
	}

	async streamRoles(
		namespace: string,
		onData: (data: string) => void,
		onError: (err: unknown) => void,
		signal?: AbortSignal,
	) {
		return this.roleService.streamRoles(namespace, onData, onError, signal);
	}

	// ClusterRole methods - delegated to ClusterRoleService
	async listClusterRoles() {
		return this.clusterRoleService.listClusterRoles();
	}

	async getClusterRole(name: string) {
		return this.clusterRoleService.getClusterRole(name);
	}

	async getClusterRoleManifest(name: string) {
		return this.clusterRoleService.getClusterRoleManifest(name);
	}

	async deleteClusterRole(name: string) {
		return this.clusterRoleService.deleteClusterRole(name);
	}

	async streamClusterRoles(
		onData: (data: string) => void,
		onError: (err: unknown) => void,
		signal?: AbortSignal,
	) {
		return this.clusterRoleService.streamClusterRoles(onData, onError, signal);
	}

	// NodeClass methods - delegated to NodeClassService
	async listNodeClasses() {
		return this.nodeClassService.listNodeClasses();
	}

	async getNodeClass(name: string) {
		return this.nodeClassService.getNodeClass(name);
	}

	async getNodeClassManifest(name: string) {
		return this.nodeClassService.getNodeClassManifest(name);
	}

	async getNodeClassStatus(name: string) {
		return this.nodeClassService.getNodeClassStatus(name);
	}

	async deleteNodeClass(name: string) {
		return this.nodeClassService.deleteNodeClass(name);
	}

	async streamNodeClasses(
		onData: (data: string) => void,
		onError: (err: unknown) => void,
		signal?: AbortSignal,
	) {
		return this.nodeClassService.streamNodeClasses(onData, onError, signal);
	}

	// NodePool methods - delegated to NodePoolService
	async listNodePools() {
		return this.nodePoolService.listNodePools();
	}

	async getNodePool(name: string) {
		return this.nodePoolService.getNodePool(name);
	}

	async getNodePoolManifest(name: string) {
		return this.nodePoolService.getNodePoolManifest(name);
	}

	async deleteNodePool(name: string) {
		return this.nodePoolService.deleteNodePool(name);
	}

	async streamNodePools(
		onData: (data: string) => void,
		onError: (err: unknown) => void,
		signal?: AbortSignal,
	) {
		return this.nodePoolService.streamNodePools(onData, onError, signal);
	}

	// ScaledObject methods (KEDA)
	async listScaledObjects(namespace: string): Promise<ScaledObjectListItem[]> {
		const crdExists = await this.checkCRDExists("scaledobjects.keda.sh");
		if (!crdExists) {
			throw new CRDNotInstalledError("scaledobjects.keda.sh", "KEDA");
		}

		return this.withCredentialRetry(async () => {
			const response = await this.customObjectsApi.listNamespacedCustomObject({
				group: "keda.sh",
				version: "v1alpha1",
				namespace,
				plural: "scaledobjects",
			});

			const list = response as unknown as KubernetesListResponse;

			if (!list.items || list.items.length === 0) {
				return [];
			}

			return list.items.map((item: unknown) =>
				this.mapScaledObjectListItem(item),
			);
		});
	}

	async getScaledObject(
		namespace: string,
		name: string,
	): Promise<ScaledObjectDetail> {
		return this.withCredentialRetry(async () => {
			const response = await this.customObjectsApi.getNamespacedCustomObject({
				group: "keda.sh",
				version: "v1alpha1",
				namespace,
				plural: "scaledobjects",
				name,
			});

			// The response itself IS the object (not response.body)
			return this.mapScaledObjectDetail(response);
		});
	}

	async getScaledObjectManifest(
		namespace: string,
		name: string,
	): Promise<string> {
		return this.withCredentialRetry(async () => {
			const response = await this.customObjectsApi.getNamespacedCustomObject({
				group: "keda.sh",
				version: "v1alpha1",
				namespace,
				plural: "scaledobjects",
				name,
			});

			// The response itself IS the object (not response.body)
			const manifest = this.sanitizeManifest(response);
			return JSON.stringify(manifest, null, 2);
		});
	}

	async deleteScaledObject(namespace: string, name: string): Promise<void> {
		return this.withCredentialRetry(async () => {
			await this.customObjectsApi.deleteNamespacedCustomObject({
				group: "keda.sh",
				version: "v1alpha1",
				namespace,
				plural: "scaledobjects",
				name,
			});
		});
	}

	async streamScaledObjects(
		namespace: string,
		onData: (data: string) => void,
		onError: (err: unknown) => void,
		signal?: AbortSignal,
	) {
		const crdExists = await this.checkCRDExists("scaledobjects.keda.sh");
		if (!crdExists) {
			const error = new CRDNotInstalledError("scaledobjects.keda.sh", "KEDA");
			onError(error);
			return () => {};
		}

		const abortController = new AbortController();
		if (signal) {
			const handleAbort = () => abortController.abort(signal.reason);
			signal.addEventListener("abort", handleAbort, { once: true });
			abortController.signal.addEventListener("abort", () => {
				signal.removeEventListener("abort", handleAbort);
			});
		}

		let requestController: AbortController;

		const startWatch = async (
			retryOnAuth: boolean = true,
		): Promise<AbortController> => {
			try {
				return await this.watch.watch(
					`/apis/keda.sh/v1alpha1/namespaces/${namespace}/scaledobjects`,
					{},
					(type, obj) => {
						try {
							onData(
								JSON.stringify({
									type,
									object: this.mapScaledObjectListItem(obj),
								}),
							);
						} catch (err) {
							onError(err);
						}
					},
					(err) => {
						if (err && abortController.signal.aborted === false) {
							onError(err);
						}
					},
				);
			} catch (error) {
				const err = error as { statusCode?: number };
				if (err.statusCode === 401 && retryOnAuth) {
					this.refreshCredentials();
					return await startWatch(false);
				}
				throw error;
			}
		};

		try {
			requestController = await startWatch();
		} catch (error) {
			onError(error);
			abortController.abort();
			throw error;
		}

		abortController.signal.addEventListener("abort", () => {
			requestController.abort();
		});

		return () => {
			abortController.abort();
		};
	}

	private mapScaledObjectListItem(scaledObject: unknown): ScaledObjectListItem {
		const so = scaledObject as {
			metadata?: {
				name?: string;
				namespace?: string;
				creationTimestamp?: string;
			};
			spec?: {
				scaleTargetRef?: {
					kind?: string;
					name?: string;
				};
				minReplicaCount?: number;
				maxReplicaCount?: number;
				triggers?: unknown[];
			};
			status?: {
				conditions?: Array<{
					type?: string;
					status?: string;
				}>;
				scaleTargetGVKR?: {
					kind?: string;
				};
				externalMetricNames?: string[];
				health?: Record<string, unknown>;
				lastActiveTime?: string;
				originalReplicaCount?: number;
			};
		};

		const creationTimestamp = so.metadata?.creationTimestamp
			? new Date(so.metadata.creationTimestamp).toISOString()
			: undefined;

		const ready = (so.status?.conditions ?? []).some(
			(c) => c.type === "Ready" && c.status === "True",
		);

		const active = (so.status?.conditions ?? []).some(
			(c) => c.type === "Active" && c.status === "True",
		);

		return {
			name: so.metadata?.name ?? "unknown",
			namespace: so.metadata?.namespace ?? "default",
			targetKind: so.spec?.scaleTargetRef?.kind ?? "",
			targetName: so.spec?.scaleTargetRef?.name ?? "",
			minReplicas: so.spec?.minReplicaCount,
			maxReplicas: so.spec?.maxReplicaCount,
			currentReplicas: so.status?.originalReplicaCount,
			desiredReplicas: undefined,
			triggerCount: (so.spec?.triggers ?? []).length,
			ready,
			active,
			creationTimestamp,
		};
	}

	private mapScaledObjectDetail(scaledObject: unknown): ScaledObjectDetail {
		const so = scaledObject as {
			metadata?: {
				name?: string;
				namespace?: string;
				creationTimestamp?: string;
				labels?: Record<string, string>;
				annotations?: Record<string, string>;
			};
			spec?: {
				scaleTargetRef?: {
					kind?: string;
					name?: string;
				};
				pollingInterval?: number;
				cooldownPeriod?: number;
				idleReplicaCount?: number;
				minReplicaCount?: number;
				maxReplicaCount?: number;
				triggers?: Array<{
					type?: string;
					name?: string;
					metadata?: Record<string, unknown>;
				}>;
			};
			status?: {
				conditions?: Array<{
					type?: string;
					status?: string;
					reason?: string;
					message?: string;
				}>;
				originalReplicaCount?: number;
			};
		};

		const listItem = this.mapScaledObjectListItem(scaledObject);

		return {
			...listItem,
			labels: so.metadata?.labels ?? {},
			annotations: so.metadata?.annotations ?? {},
			pollingInterval: so.spec?.pollingInterval,
			cooldownPeriod: so.spec?.cooldownPeriod,
			idleReplicaCount: so.spec?.idleReplicaCount,
			triggers: (so.spec?.triggers ?? []).map((trigger) => ({
				type: trigger.type ?? "",
				name: trigger.name,
				metadata: trigger.metadata ?? {},
			})),
			conditions: (so.status?.conditions ?? []).map((condition) => ({
				type: condition.type ?? "",
				status: condition.status ?? "",
				reason: condition.reason,
				message: condition.message,
			})),
		};
	}

	// VirtualService methods - delegated to VirtualServiceService
	async listVirtualServices(namespace: string) {
		return this.virtualServiceService.listVirtualServices(namespace);
	}

	async getVirtualService(namespace: string, name: string) {
		return this.virtualServiceService.getVirtualService(namespace, name);
	}

	async getVirtualServiceManifest(namespace: string, name: string) {
		return this.virtualServiceService.getVirtualServiceManifest(namespace, name);
	}

	async deleteVirtualService(namespace: string, name: string) {
		return this.virtualServiceService.deleteVirtualService(namespace, name);
	}

	async streamVirtualServices(
		namespace: string,
		onData: (data: string) => void,
		onError: (err: unknown) => void,
		signal?: AbortSignal,
	) {
		return this.virtualServiceService.streamVirtualServices(namespace, onData, onError, signal);
	}

	// Gateway methods - delegated to GatewayService
	async listGateways(namespace: string) {
		return this.gatewayService.listGateways(namespace);
	}

	async getGateway(namespace: string, name: string) {
		return this.gatewayService.getGateway(namespace, name);
	}

	async getGatewayManifest(namespace: string, name: string) {
		return this.gatewayService.getGatewayManifest(namespace, name);
	}

	async deleteGateway(namespace: string, name: string) {
		return this.gatewayService.deleteGateway(namespace, name);
	}

	async streamGateways(
		namespace: string,
		onData: (data: string) => void,
		onError: (err: unknown) => void,
		signal?: AbortSignal,
	) {
		return this.gatewayService.streamGateways(namespace, onData, onError, signal);
	}

	// DestinationRule methods - delegated to DestinationRuleService
	async listDestinationRules(namespace: string) {
		return this.destinationRuleService.listDestinationRules(namespace);
	}

	async getDestinationRule(namespace: string, name: string) {
		return this.destinationRuleService.getDestinationRule(namespace, name);
	}

	async getDestinationRuleManifest(namespace: string, name: string) {
		return this.destinationRuleService.getDestinationRuleManifest(namespace, name);
	}

	async deleteDestinationRule(namespace: string, name: string) {
		return this.destinationRuleService.deleteDestinationRule(namespace, name);
	}

	async streamDestinationRules(
		namespace: string,
		onData: (data: string) => void,
		onError: (err: unknown) => void,
		signal?: AbortSignal,
	) {
		return this.destinationRuleService.streamDestinationRules(namespace, onData, onError, signal);
	}
}
