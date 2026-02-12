export interface ContextInfo {
  name: string;
  cluster?: string;
  user?: string;
  namespace?: string;
  isCurrent: boolean;
}

export interface NamespaceList {
  items: string[];
}

export interface NamespaceWatchEvent {
  type: 'ADDED' | 'MODIFIED' | 'DELETED' | string;
  object: string;
}

export interface NamespaceListItem {
  name: string;
  status: string;
  labels: Record<string, string>;
  creationTimestamp?: string;
  podCount: number;
  cpuRequests?: string;
  cpuUsage?: string;
  cpuUsageUtilization?: number;
  memoryRequests?: string;
  memoryUsage?: string;
  memoryUsageUtilization?: number;
}

export interface NamespaceDetail extends NamespaceListItem {
  annotations: Record<string, string>;
  finalizers: string[];
}

export interface NamespaceFullWatchEvent {
  type: 'ADDED' | 'MODIFIED' | 'DELETED' | string;
  object: NamespaceListItem;
}

export interface NamespaceEvent {
  type: string;
  reason: string;
  message: string;
  count?: number;
  firstTimestamp?: string;
  lastTimestamp?: string;
  source?: string;
  involvedObject: {
    kind: string;
    name: string;
  };
}

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
  phase?: string;
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

export interface PodDetail extends PodListItem {
  labels: Record<string, string>;
  annotations: Record<string, string>;
  containersStatus: Array<{
    name: string;
    ready: boolean;
    restartCount: number;
    image: string;
    state?: Record<string, unknown>;
    lastState?: Record<string, unknown>;
  }>;
  containerPorts: Array<{
    containerName: string;
    name?: string;
    containerPort: number;
    protocol?: string;
  }>;
}

export interface PodWatchEvent {
  type: 'ADDED' | 'MODIFIED' | 'DELETED' | string;
  object: PodListItem;
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
    state?: Record<string, unknown>;
    lastState?: Record<string, unknown>;
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

export interface DeploymentWatchEvent {
  type: 'ADDED' | 'MODIFIED' | 'DELETED' | string;
  object: DeploymentListItem;
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

export interface RolloutWatchEvent {
  type: 'ADDED' | 'MODIFIED' | 'DELETED' | string;
  object: RolloutListItem;
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
  type: 'ADDED' | 'MODIFIED' | 'DELETED' | string;
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
  type: 'ADDED' | 'MODIFIED' | 'DELETED' | string;
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
  type: 'ADDED' | 'MODIFIED' | 'DELETED' | string;
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
  secrets: Array<{ name: string }>;
  imagePullSecrets: Array<{ name: string }>;
}

export interface ServiceAccountWatchEvent {
  type: 'ADDED' | 'MODIFIED' | 'DELETED' | string;
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
  summary: {
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
  type: 'ADDED' | 'MODIFIED' | 'DELETED' | string;
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

export interface ServiceWatchEvent {
  type: 'ADDED' | 'MODIFIED' | 'DELETED' | string;
  object: ServiceListItem;
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

export interface CronJobWatchEvent {
  type: 'ADDED' | 'MODIFIED' | 'DELETED' | string;
  object: CronJobListItem;
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

export interface IngressWatchEvent {
  type: 'ADDED' | 'MODIFIED' | 'DELETED' | string;
  object: IngressListItem;
}

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
  type: 'ADDED' | 'MODIFIED' | 'DELETED' | string;
  object: ConfigMapListItem;
}

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

export interface HpaEvent {
  type: string;
  reason: string;
  message: string;
  count?: number;
  firstTimestamp?: string;
  lastTimestamp?: string;
  source?: string;
}

export interface PdbListItem {
  name: string;
  namespace: string;
  minAvailable?: string;
  maxUnavailable?: string;
  currentHealthy?: number;
  desiredHealthy?: number;
  disruptionsAllowed?: number;
  expectedPods?: number;
  creationTimestamp?: string;
}

export interface PdbDetail extends PdbListItem {
  labels: Record<string, string>;
  annotations: Record<string, string>;
  selector?: Record<string, string>;
  conditions?: Array<{
    type: string;
    status: string;
    lastTransitionTime?: string;
    reason?: string;
    message?: string;
  }>;
}

export interface PdbWatchEvent {
  type: string;
  object: PdbListItem;
}

export interface PdbEvent {
  type: string;
  reason: string;
  message: string;
  count?: number;
  firstTimestamp?: string;
  lastTimestamp?: string;
  source?: string;
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
  type: 'ADDED' | 'MODIFIED' | 'DELETED' | string;
  object: ExternalSecretListItem;
}

export interface VirtualServiceHttpRoute {
  match?: Array<Record<string, unknown>>;
  route?: Array<{
    destination: {
      host: string;
      port?: { number: number };
      subset?: string;
    };
    weight?: number;
  }>;
  redirect?: Record<string, unknown>;
  rewrite?: Record<string, unknown>;
  timeout?: string;
  retries?: Record<string, unknown>;
  fault?: Record<string, unknown>;
  mirror?: Record<string, unknown>;
  headers?: Record<string, unknown>;
}

export interface VirtualServiceListItem {
  name: string;
  namespace: string;
  hosts: string[];
  gateways: string[];
  httpRouteCount: number;
  tlsRouteCount: number;
  tcpRouteCount: number;
  creationTimestamp?: string;
}

export interface VirtualServiceDetail extends VirtualServiceListItem {
  labels: Record<string, string>;
  annotations: Record<string, string>;
  http: VirtualServiceHttpRoute[];
  tls: Array<Record<string, unknown>>;
  tcp: Array<Record<string, unknown>>;
  exportTo: string[];
}

export interface VirtualServiceWatchEvent {
  type: 'ADDED' | 'MODIFIED' | 'DELETED' | string;
  object: VirtualServiceListItem;
}

export interface GatewayServer {
  port: {
    number: number;
    name?: string;
    protocol?: string;
  };
  hosts: string[];
  tls?: Record<string, unknown>;
}

export interface GatewayListItem {
  name: string;
  namespace: string;
  selector: Record<string, string>;
  serverCount: number;
  hosts: string[];
  creationTimestamp?: string;
}

export interface GatewayDetail extends GatewayListItem {
  labels: Record<string, string>;
  annotations: Record<string, string>;
  servers: GatewayServer[];
}

export interface GatewayWatchEvent {
  type: 'ADDED' | 'MODIFIED' | 'DELETED' | string;
  object: GatewayListItem;
}

export interface DestinationRuleSubset {
  name: string;
  labels: Record<string, string>;
  trafficPolicy?: Record<string, unknown>;
}

export interface DestinationRuleTrafficPolicy {
  loadBalancer?: Record<string, unknown>;
  connectionPool?: Record<string, unknown>;
  outlierDetection?: Record<string, unknown>;
  tls?: Record<string, unknown>;
}

export interface DestinationRuleListItem {
  name: string;
  namespace: string;
  host: string;
  subsetCount: number;
  subsetNames: string[];
  loadBalancer?: string;
  tlsMode?: string;
  creationTimestamp?: string;
}

export interface DestinationRuleDetail extends DestinationRuleListItem {
  labels: Record<string, string>;
  annotations: Record<string, string>;
  trafficPolicy?: DestinationRuleTrafficPolicy;
  subsets: DestinationRuleSubset[];
  exportTo: string[];
}

export interface DestinationRuleWatchEvent {
  type: 'ADDED' | 'MODIFIED' | 'DELETED' | string;
  object: DestinationRuleListItem;
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
  provider?: Record<string, unknown>;
  retrySettings?: Record<string, unknown>;
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
  type: 'ADDED' | 'MODIFIED' | 'DELETED' | string;
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

export interface CustomResourceDefinitionDetail extends CustomResourceDefinitionListItem {
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
  type: 'ADDED' | 'MODIFIED' | 'DELETED' | string;
  object: CustomResourceDefinitionListItem;
}

export interface SecretWatchEvent {
  type: 'ADDED' | 'MODIFIED' | 'DELETED' | string;
  object: SecretListItem;
}

export interface HpaWatchEvent {
  type: 'ADDED' | 'MODIFIED' | 'DELETED' | string;
  object: HpaListItem;
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

export interface PersistentVolumeClaimDetail extends PersistentVolumeClaimListItem {
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

export interface PersistentVolumeClaimWatchEvent {
  type: 'ADDED' | 'MODIFIED' | 'DELETED' | string;
  object: PersistentVolumeClaimListItem;
}

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
  type: 'ADDED' | 'MODIFIED' | 'DELETED' | string;
  object: StorageClassListItem;
}

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
  type: 'ADDED' | 'MODIFIED' | 'DELETED' | string;
  object: RoleListItem;
}

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
  type: 'ADDED' | 'MODIFIED' | 'DELETED' | string;
  object: ClusterRoleListItem;
}

export interface NodeClassListItem {
  name: string;
  amiFamily?: string;
  role?: string;
  instanceProfile?: string;
  readyStatus?: string;
  readyMessage?: string;
  creationTimestamp?: string;
}

export interface NodeClassDetail extends NodeClassListItem {
  labels: Record<string, string>;
  annotations: Record<string, string>;
  subnetSelectorTerms?: Array<Record<string, unknown>>;
  securityGroupSelectorTerms?: Array<Record<string, unknown>>;
  userData?: string;
  tags?: Record<string, string>;
  blockDeviceMappings?: Array<Record<string, unknown>>;
  instanceStorePolicy?: string;
  metadataOptions?: Record<string, unknown>;
}

export interface NodeClassStatus {
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
  amis?: Array<{
    id?: string;
    name?: string;
    requirements?: Array<Record<string, unknown>>;
  }>;
  subnets?: Array<{
    id?: string;
    zone?: string;
  }>;
  securityGroups?: Array<{
    id?: string;
    name?: string;
  }>;
  instanceProfile?: string;
}

export interface NodeClassWatchEvent {
  type: 'ADDED' | 'MODIFIED' | 'DELETED' | string;
  object: NodeClassListItem;
}

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
  type: 'ADDED' | 'MODIFIED' | 'DELETED' | string;
  object: NodePoolListItem;
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

export interface ScaledObjectWatchEvent {
  type: 'ADDED' | 'MODIFIED' | 'DELETED' | string;
  object: ScaledObjectListItem;
}

export interface PortForward {
  id: string;
  namespace: string;
  pod: string;
  localPort: number;
  targetPort: number;
  startedAt: string;
  connectionCount: number;
}

const API_BASE = '/api';
const EVENTS_BASE = '/events';

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public isAuthError: boolean = false
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: HeadersInit = {};

  if (init?.body) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...headers,
      ...init?.headers
    }
  });

  if (!response.ok) {
    let errorMessage = `Request failed with status ${response.status}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorMessage;
    } catch {
      const text = await response.text();
      if (text) errorMessage = text;
    }
    throw new ApiError(errorMessage, response.status, response.status === 401);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export async function fetchContexts(): Promise<ContextInfo[]> {
  const data = await apiFetch<{ contexts: ContextInfo[] }>(`/contexts`);
  return data.contexts;
}

export async function fetchCurrentContext(): Promise<string> {
  const data = await apiFetch<{ name: string }>(`/contexts/current`);
  return data.name;
}

export async function selectContext(name: string): Promise<void> {
  await apiFetch<void>(`/contexts/select`, {
    method: 'POST',
    body: JSON.stringify({ name })
  });
}

export async function fetchNamespaces(): Promise<NamespaceList> {
  return apiFetch<NamespaceList>(`/namespaces/names`);
}

export async function fetchNamespacesFull(): Promise<NamespaceListItem[]> {
  const data = await apiFetch<{ items: NamespaceListItem[] }>(`/namespaces`);
  return data.items;
}

export async function fetchNamespace(name: string): Promise<NamespaceDetail> {
  return apiFetch<NamespaceDetail>(`/namespaces/${encodeURIComponent(name)}`);
}

export async function fetchNamespaceManifest(name: string): Promise<string> {
  const response = await fetch(`${API_BASE}/namespaces/${encodeURIComponent(name)}/manifest`);
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Failed to load manifest (${response.status})`);
  }
  return await response.text();
}

export async function fetchNamespaceEvents(name: string): Promise<NamespaceEvent[]> {
  const data = await apiFetch<{ items: NamespaceEvent[] }>(`/namespaces/${encodeURIComponent(name)}/events`);
  return data.items;
}

export async function deleteNamespace(name: string): Promise<void> {
  await apiFetch<void>(`/namespaces/${encodeURIComponent(name)}`, {
    method: 'DELETE'
  });
}

export async function createNamespace(name: string): Promise<void> {
  await apiFetch<{ name: string }>(`/namespaces`, {
    method: 'POST',
    body: JSON.stringify({ name })
  });
}

export function subscribeToNamespaceEvents(
  onEvent: (event: NamespaceWatchEvent) => void,
  onError?: (error: ApiError) => void
): () => void {
  const eventSource = new EventSource(`${EVENTS_BASE}/namespaces`);

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data) as NamespaceWatchEvent;
      onEvent(data);
    } catch (error) {
      console.error('Failed to parse namespace watch event', error);
    }
  };

  eventSource.addEventListener('error', (event) => {
    if (event.type === 'error' && 'data' in event) {
      try {
        const messageEvent = event as MessageEvent;
        const errorData = JSON.parse(messageEvent.data) as { message: string; statusCode?: number };
        const apiError = new ApiError(
          errorData.message,
          errorData.statusCode || 500,
          errorData.statusCode === 401
        );
        onError?.(apiError);
      } catch {
        console.error('Namespace watch stream error', event);
      }
    }
    eventSource.close();
  });

  eventSource.onerror = () => {
    eventSource.close();
  };

  return () => {
    eventSource.close();
  };
}

export function subscribeToNamespaceFullEvents(
  onEvent: (event: NamespaceFullWatchEvent) => void,
  onError?: (error: ApiError) => void
): () => void {
  const eventSource = new EventSource(`${EVENTS_BASE}/namespaces/full`);

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data) as NamespaceFullWatchEvent;
      onEvent(data);
    } catch (error) {
      console.error('Failed to parse namespace watch event', error);
    }
  };

  eventSource.addEventListener('error', (event) => {
    if (event.type === 'error' && 'data' in event) {
      try {
        const messageEvent = event as MessageEvent;
        const errorData = JSON.parse(messageEvent.data) as { message: string; statusCode?: number };
        const apiError = new ApiError(
          errorData.message,
          errorData.statusCode || 500,
          errorData.statusCode === 401
        );
        onError?.(apiError);
      } catch {
        console.error('Namespace watch stream error', event);
      }
    }
    eventSource.close();
  });

  eventSource.onerror = () => {
    eventSource.close();
  };

  return () => {
    eventSource.close();
  };
}

export interface NodeListResponse {
  items: NodeListItem[];
  pools: NodePoolSummary[];
}

export async function fetchNodes(): Promise<NodeListResponse> {
  const data = await apiFetch<{ items: NodeListItem[]; pools?: NodePoolSummary[] }>(`/nodes`);
  return {
    items: data.items,
    pools: data.pools ?? []
  };
}

export async function fetchNode(name: string): Promise<NodeDetail> {
  return apiFetch<NodeDetail>(`/nodes/${encodeURIComponent(name)}`);
}

export async function fetchNodeManifest(name: string): Promise<string> {
  const response = await fetch(`${API_BASE}/nodes/${encodeURIComponent(name)}/manifest`);
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Failed to load manifest (${response.status})`);
  }
  return response.text();
}

export async function fetchNodeEvents(name: string): Promise<NodeEvent[]> {
  const data = await apiFetch<{ events: NodeEvent[] }>(`/nodes/${encodeURIComponent(name)}/events`);
  return data.events;
}

export async function fetchAllNodeEvents(): Promise<ClusterNodeEvent[]> {
  const data = await apiFetch<{ events: ClusterNodeEvent[] }>('/events/nodes');
  return data.events;
}

export async function cordonNode(name: string): Promise<void> {
  await fetch(`${API_BASE}/nodes/${encodeURIComponent(name)}/cordon`, { method: 'POST' });
}

export async function uncordonNode(name: string): Promise<void> {
  await fetch(`${API_BASE}/nodes/${encodeURIComponent(name)}/uncordon`, { method: 'POST' });
}

export async function drainNode(name: string): Promise<{ evictedPods: string[] }> {
  const response = await fetch(`${API_BASE}/nodes/${encodeURIComponent(name)}/drain`, { method: 'POST' });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Failed to drain node (${response.status})`);
  }
  return response.json();
}

export async function fetchNamespaceSummaries(): Promise<NamespaceSummary[]> {
  const data = await apiFetch<{ items: NamespaceSummary[] }>(`/namespace-summaries`);
  return data.items;
}

export async function fetchPods(namespace: string): Promise<PodListItem[]> {
  const data = await apiFetch<{ items: PodListItem[] }>(`/namespaces/${encodeURIComponent(namespace)}/pods`);
  return data.items;
}

export async function fetchPod(namespace: string, pod: string): Promise<PodDetail> {
  return apiFetch<PodDetail>(`/namespaces/${encodeURIComponent(namespace)}/pods/${encodeURIComponent(pod)}`);
}

export async function fetchPodManifest(namespace: string, pod: string): Promise<string> {
  const response = await fetch(
    `${API_BASE}/namespaces/${encodeURIComponent(namespace)}/pods/${encodeURIComponent(pod)}/manifest`
  );
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Failed to load manifest (${response.status})`);
  }
  return await response.text();
}

export async function fetchPodEvents(namespace: string, pod: string): Promise<PodEvent[]> {
  const data = await apiFetch<{ events: PodEvent[] }>(`/namespaces/${encodeURIComponent(namespace)}/pods/${encodeURIComponent(pod)}/events`);
  return data.events;
}

export async function fetchPodStatus(namespace: string, pod: string): Promise<PodStatus> {
  return apiFetch<PodStatus>(`/namespaces/${encodeURIComponent(namespace)}/pods/${encodeURIComponent(pod)}/status`);
}

export function subscribeToPodEvents(
  namespace: string,
  onEvent: (event: PodWatchEvent) => void,
  onError?: (error: ApiError) => void
): () => void {
  const eventSource = new EventSource(`${EVENTS_BASE}/pods?namespace=${encodeURIComponent(namespace)}`);

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data) as PodWatchEvent;
      onEvent(data);
    } catch (error) {
      console.error('Failed to parse pod watch event', error);
    }
  };

  eventSource.addEventListener('error', (event) => {
    if (event.type === 'error' && 'data' in event) {
      try {
        const messageEvent = event as MessageEvent;
        const errorData = JSON.parse(messageEvent.data) as { message: string; statusCode?: number };
        const apiError = new ApiError(
          errorData.message,
          errorData.statusCode || 500,
          errorData.statusCode === 401
        );
        onError?.(apiError);
      } catch {
        console.error('Pod watch stream error', event);
      }
    }
    eventSource.close();
  });

  eventSource.onerror = () => {
    eventSource.close();
  };

  return () => {
    eventSource.close();
  };
}

export async function deletePod(namespace: string, pod: string): Promise<void> {
  await apiFetch<void>(`/namespaces/${encodeURIComponent(namespace)}/pods/${encodeURIComponent(pod)}`, {
    method: 'DELETE'
  });
}

export async function evictPod(namespace: string, pod: string): Promise<void> {
  await apiFetch<void>(`/namespaces/${encodeURIComponent(namespace)}/pods/${encodeURIComponent(pod)}/evict`, {
    method: 'POST'
  });
}

export interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
}

export async function execInPod(
  namespace: string,
  pod: string,
  container: string,
  command: string[]
): Promise<ExecResult> {
  return apiFetch<ExecResult>(
    `/namespaces/${encodeURIComponent(namespace)}/pods/${encodeURIComponent(pod)}/exec`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ container, command })
    }
  );
}

export interface DebugSession {
  id: string;
  nodeName: string;
  podName: string;
  namespace: string;
  createdAt: string;
  status: 'creating' | 'ready' | 'error' | 'terminated';
}

export interface NodeExecResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
}

export async function createNodeDebugSession(nodeName: string): Promise<DebugSession> {
  return apiFetch<DebugSession>(
    `/nodes/${encodeURIComponent(nodeName)}/debug-session`,
    { method: 'POST' }
  );
}

export async function execOnNode(
  sessionId: string,
  command: string[]
): Promise<NodeExecResult> {
  return apiFetch<NodeExecResult>(
    `/node-debug-sessions/${encodeURIComponent(sessionId)}/exec`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command })
    }
  );
}

export async function deleteNodeDebugSession(sessionId: string): Promise<void> {
  await apiFetch<void>(
    `/node-debug-sessions/${encodeURIComponent(sessionId)}`,
    { method: 'DELETE' }
  );
}

// Deployment API functions
export async function fetchDeployments(namespace: string): Promise<DeploymentListItem[]> {
  const data = await apiFetch<{ items: DeploymentListItem[] }>(`/namespaces/${encodeURIComponent(namespace)}/deployments`);
  return data.items;
}

export async function fetchDeployment(namespace: string, deployment: string): Promise<DeploymentDetail> {
  return apiFetch<DeploymentDetail>(`/namespaces/${encodeURIComponent(namespace)}/deployments/${encodeURIComponent(deployment)}`);
}

export async function fetchDeploymentManifest(namespace: string, deployment: string): Promise<string> {
  const response = await fetch(
    `${API_BASE}/namespaces/${encodeURIComponent(namespace)}/deployments/${encodeURIComponent(deployment)}/manifest`
  );
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Failed to load manifest (${response.status})`);
  }
  return await response.text();
}

export async function fetchDeploymentEvents(namespace: string, deployment: string): Promise<DeploymentEvent[]> {
  const data = await apiFetch<{ events: DeploymentEvent[] }>(`/namespaces/${encodeURIComponent(namespace)}/deployments/${encodeURIComponent(deployment)}/events`);
  return data.events;
}

export async function fetchDeploymentStatus(namespace: string, deployment: string): Promise<DeploymentStatus> {
  return apiFetch<DeploymentStatus>(`/namespaces/${encodeURIComponent(namespace)}/deployments/${encodeURIComponent(deployment)}/status`);
}

export function subscribeToDeploymentEvents(
  namespace: string,
  onEvent: (event: DeploymentWatchEvent) => void,
  onError?: (error: ApiError) => void
): () => void {
  const eventSource = new EventSource(`${EVENTS_BASE}/deployments?namespace=${encodeURIComponent(namespace)}`);

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data) as DeploymentWatchEvent;
      onEvent(data);
    } catch (error) {
      console.error('Failed to parse deployment watch event', error);
    }
  };

  eventSource.addEventListener('error', (event) => {
    if (event.type === 'error' && 'data' in event) {
      try {
        const messageEvent = event as MessageEvent;
        const errorData = JSON.parse(messageEvent.data) as { message: string; statusCode?: number };
        const apiError = new ApiError(
          errorData.message,
          errorData.statusCode || 500,
          errorData.statusCode === 401
        );
        onError?.(apiError);
      } catch {
        console.error('Deployment watch stream error', event);
      }
    }
    eventSource.close();
  });

  eventSource.onerror = () => {
    eventSource.close();
  };

  return () => {
    eventSource.close();
  };
}

export async function deleteDeployment(namespace: string, deployment: string): Promise<void> {
  await apiFetch<void>(`/namespaces/${encodeURIComponent(namespace)}/deployments/${encodeURIComponent(deployment)}`, {
    method: 'DELETE'
  });
}

export async function restartDeployment(namespace: string, deployment: string): Promise<void> {
  await apiFetch<void>(`/namespaces/${encodeURIComponent(namespace)}/deployments/${encodeURIComponent(deployment)}/restart`, {
    method: 'POST'
  });
}

export async function scaleDeployment(namespace: string, deployment: string, replicas: number): Promise<void> {
  await apiFetch<void>(`/namespaces/${encodeURIComponent(namespace)}/deployments/${encodeURIComponent(deployment)}/scale`, {
    method: 'POST',
    body: JSON.stringify({ replicas })
  });
}

export async function rollbackDeployment(namespace: string, deployment: string, toRevision?: number): Promise<void> {
  await apiFetch<void>(`/namespaces/${encodeURIComponent(namespace)}/deployments/${encodeURIComponent(deployment)}/rollback`, {
    method: 'POST',
    body: JSON.stringify({ toRevision })
  });
}

export async function fetchDeploymentHistory(namespace: string, deployment: string): Promise<DeploymentRevision[]> {
  const data = await apiFetch<{ revisions: DeploymentRevision[] }>(`/namespaces/${encodeURIComponent(namespace)}/deployments/${encodeURIComponent(deployment)}/history`);
  return data.revisions;
}

// Rollout API functions
export async function fetchRollouts(namespace: string): Promise<RolloutListItem[]> {
  const data = await apiFetch<{ items: RolloutListItem[] }>(`/namespaces/${encodeURIComponent(namespace)}/rollouts`);
  return data.items;
}

export async function fetchRollout(namespace: string, rollout: string): Promise<RolloutDetail> {
  return apiFetch<RolloutDetail>(`/namespaces/${encodeURIComponent(namespace)}/rollouts/${encodeURIComponent(rollout)}`);
}

export async function fetchRolloutManifest(namespace: string, rollout: string): Promise<string> {
  const response = await fetch(
    `${API_BASE}/namespaces/${encodeURIComponent(namespace)}/rollouts/${encodeURIComponent(rollout)}/manifest`
  );
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Failed to load manifest (${response.status})`);
  }
  return await response.text();
}

export async function fetchRolloutEvents(namespace: string, rollout: string): Promise<RolloutEvent[]> {
  const data = await apiFetch<{ events: RolloutEvent[] }>(`/namespaces/${encodeURIComponent(namespace)}/rollouts/${encodeURIComponent(rollout)}/events`);
  return data.events;
}

export async function fetchRolloutStatus(namespace: string, rollout: string): Promise<RolloutStatus> {
  return apiFetch<RolloutStatus>(`/namespaces/${encodeURIComponent(namespace)}/rollouts/${encodeURIComponent(rollout)}/status`);
}

export function subscribeToRolloutEvents(
  namespace: string,
  onEvent: (event: RolloutWatchEvent) => void,
  onError?: (error: ApiError) => void
): () => void {
  const eventSource = new EventSource(`${EVENTS_BASE}/rollouts?namespace=${encodeURIComponent(namespace)}`);

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data) as RolloutWatchEvent;
      onEvent(data);
    } catch (error) {
      console.error('Failed to parse rollout watch event', error);
    }
  };

  eventSource.addEventListener('error', (event) => {
    if (event.type === 'error' && 'data' in event) {
      try {
        const messageEvent = event as MessageEvent;
        const errorData = JSON.parse(messageEvent.data) as { message: string; statusCode?: number };
        const apiError = new ApiError(
          errorData.message,
          errorData.statusCode || 500,
          errorData.statusCode === 401
        );
        onError?.(apiError);
      } catch {
        console.error('Rollout watch stream error', event);
      }
    }
    eventSource.close();
  });

  eventSource.onerror = () => {
    eventSource.close();
  };

  return () => {
    eventSource.close();
  };
}

export async function deleteRollout(namespace: string, rollout: string): Promise<void> {
  await apiFetch<void>(`/namespaces/${encodeURIComponent(namespace)}/rollouts/${encodeURIComponent(rollout)}`, {
    method: 'DELETE'
  });
}

// DaemonSet API functions
export async function fetchDaemonSets(namespace: string): Promise<DaemonSetListItem[]> {
  const data = await apiFetch<{ items: DaemonSetListItem[] }>(`/namespaces/${encodeURIComponent(namespace)}/daemonsets`);
  return data.items;
}

export async function fetchDaemonSet(namespace: string, daemonSet: string): Promise<DaemonSetDetail> {
  return apiFetch<DaemonSetDetail>(`/namespaces/${encodeURIComponent(namespace)}/daemonsets/${encodeURIComponent(daemonSet)}`);
}

export async function fetchDaemonSetManifest(namespace: string, daemonSet: string): Promise<string> {
  const response = await fetch(
    `${API_BASE}/namespaces/${encodeURIComponent(namespace)}/daemonsets/${encodeURIComponent(daemonSet)}/manifest`
  );
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Failed to load manifest (${response.status})`);
  }
  return await response.text();
}

export async function fetchDaemonSetEvents(namespace: string, daemonSet: string): Promise<DaemonSetEvent[]> {
  const data = await apiFetch<{ events: DaemonSetEvent[] }>(`/namespaces/${encodeURIComponent(namespace)}/daemonsets/${encodeURIComponent(daemonSet)}/events`);
  return data.events;
}

export async function fetchDaemonSetStatus(namespace: string, daemonSet: string): Promise<DaemonSetStatus> {
  return apiFetch<DaemonSetStatus>(`/namespaces/${encodeURIComponent(namespace)}/daemonsets/${encodeURIComponent(daemonSet)}/status`);
}

export function subscribeToDaemonSetEvents(
  namespace: string,
  onEvent: (event: DaemonSetWatchEvent) => void,
  onError?: (error: ApiError) => void
): () => void {
  const eventSource = new EventSource(`${EVENTS_BASE}/daemonsets?namespace=${encodeURIComponent(namespace)}`);

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data) as DaemonSetWatchEvent;
      onEvent(data);
    } catch (error) {
      console.error('Failed to parse daemonset watch event', error);
    }
  };

  eventSource.addEventListener('error', (event) => {
    if (event.type === 'error' && 'data' in event) {
      try {
        const messageEvent = event as MessageEvent;
        const errorData = JSON.parse(messageEvent.data) as { message: string; statusCode?: number };
        const apiError = new ApiError(
          errorData.message,
          errorData.statusCode || 500,
          errorData.statusCode === 401
        );
        onError?.(apiError);
      } catch {
        console.error('DaemonSet watch stream error', event);
      }
    }
    eventSource.close();
  });

  eventSource.onerror = () => {
    eventSource.close();
  };

  return () => {
    eventSource.close();
  };
}

export async function deleteDaemonSet(namespace: string, daemonSet: string): Promise<void> {
  await apiFetch<void>(`/namespaces/${encodeURIComponent(namespace)}/daemonsets/${encodeURIComponent(daemonSet)}`, {
    method: 'DELETE'
  });
}

export async function restartDaemonSet(namespace: string, daemonSet: string): Promise<void> {
  await apiFetch<void>(`/namespaces/${encodeURIComponent(namespace)}/daemonsets/${encodeURIComponent(daemonSet)}/restart`, {
    method: 'POST'
  });
}

// StatefulSet API functions
export async function fetchStatefulSets(namespace: string): Promise<StatefulSetListItem[]> {
  const data = await apiFetch<{ items: StatefulSetListItem[] }>(`/namespaces/${encodeURIComponent(namespace)}/statefulsets`);
  return data.items;
}

export async function fetchStatefulSet(namespace: string, statefulSet: string): Promise<StatefulSetDetail> {
  return apiFetch<StatefulSetDetail>(`/namespaces/${encodeURIComponent(namespace)}/statefulsets/${encodeURIComponent(statefulSet)}`);
}

export async function fetchStatefulSetManifest(namespace: string, statefulSet: string): Promise<string> {
  const response = await fetch(
    `${API_BASE}/namespaces/${encodeURIComponent(namespace)}/statefulsets/${encodeURIComponent(statefulSet)}/manifest`
  );
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Failed to load manifest (${response.status})`);
  }
  return await response.text();
}

export async function fetchStatefulSetEvents(namespace: string, statefulSet: string): Promise<StatefulSetEvent[]> {
  const data = await apiFetch<{ events: StatefulSetEvent[] }>(`/namespaces/${encodeURIComponent(namespace)}/statefulsets/${encodeURIComponent(statefulSet)}/events`);
  return data.events;
}

export async function fetchStatefulSetStatus(namespace: string, statefulSet: string): Promise<StatefulSetStatus> {
  return apiFetch<StatefulSetStatus>(`/namespaces/${encodeURIComponent(namespace)}/statefulsets/${encodeURIComponent(statefulSet)}/status`);
}

export function subscribeToStatefulSetEvents(
  namespace: string,
  onEvent: (event: StatefulSetWatchEvent) => void,
  onError?: (error: ApiError) => void
): () => void {
  const eventSource = new EventSource(`${EVENTS_BASE}/statefulsets?namespace=${encodeURIComponent(namespace)}`);

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data) as StatefulSetWatchEvent;
      onEvent(data);
    } catch (error) {
      console.error('Failed to parse statefulset watch event', error);
    }
  };

  eventSource.addEventListener('error', (event) => {
    if (event.type === 'error' && 'data' in event) {
      try {
        const messageEvent = event as MessageEvent;
        const errorData = JSON.parse(messageEvent.data) as { message: string; statusCode?: number };
        const apiError = new ApiError(
          errorData.message,
          errorData.statusCode || 500,
          errorData.statusCode === 401
        );
        onError?.(apiError);
      } catch {
        console.error('StatefulSet watch stream error', event);
      }
    }
    eventSource.close();
  });

  eventSource.onerror = () => {
    eventSource.close();
  };

  return () => {
    eventSource.close();
  };
}

export async function deleteStatefulSet(namespace: string, statefulSet: string): Promise<void> {
  await apiFetch<void>(`/namespaces/${encodeURIComponent(namespace)}/statefulsets/${encodeURIComponent(statefulSet)}`, {
    method: 'DELETE'
  });
}

export async function restartStatefulSet(namespace: string, statefulSet: string): Promise<void> {
  await apiFetch<void>(`/namespaces/${encodeURIComponent(namespace)}/statefulsets/${encodeURIComponent(statefulSet)}/restart`, {
    method: 'POST'
  });
}

export async function scaleStatefulSet(namespace: string, statefulSet: string, replicas: number): Promise<void> {
  await apiFetch<void>(`/namespaces/${encodeURIComponent(namespace)}/statefulsets/${encodeURIComponent(statefulSet)}/scale`, {
    method: 'POST',
    body: JSON.stringify({ replicas })
  });
}

// Job API functions
export async function fetchJobs(namespace: string): Promise<JobListItem[]> {
  const data = await apiFetch<{ items: JobListItem[] }>(`/namespaces/${encodeURIComponent(namespace)}/jobs`);
  return data.items;
}

export async function fetchJob(namespace: string, job: string): Promise<JobDetail> {
  return apiFetch<JobDetail>(`/namespaces/${encodeURIComponent(namespace)}/jobs/${encodeURIComponent(job)}`);
}

export async function fetchJobManifest(namespace: string, job: string): Promise<string> {
  const response = await fetch(
    `${API_BASE}/namespaces/${encodeURIComponent(namespace)}/jobs/${encodeURIComponent(job)}/manifest`
  );
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Failed to load manifest (${response.status})`);
  }
  return await response.text();
}

export async function fetchJobEvents(namespace: string, job: string): Promise<JobEvent[]> {
  const data = await apiFetch<{ events: JobEvent[] }>(`/namespaces/${encodeURIComponent(namespace)}/jobs/${encodeURIComponent(job)}/events`);
  return data.events;
}

export async function fetchJobStatus(namespace: string, job: string): Promise<JobStatus> {
  return apiFetch<JobStatus>(`/namespaces/${encodeURIComponent(namespace)}/jobs/${encodeURIComponent(job)}/status`);
}

export function subscribeToJobEvents(
  namespace: string,
  onEvent: (event: JobWatchEvent) => void,
  onError?: (error: ApiError) => void
): () => void {
  const eventSource = new EventSource(`${EVENTS_BASE}/jobs?namespace=${encodeURIComponent(namespace)}`);

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data) as JobWatchEvent;
      onEvent(data);
    } catch (error) {
      console.error('Failed to parse job watch event', error);
    }
  };

  eventSource.addEventListener('error', (event) => {
    if (event.type === 'error' && 'data' in event) {
      try {
        const messageEvent = event as MessageEvent;
        const errorData = JSON.parse(messageEvent.data) as { message: string; statusCode?: number };
        const apiError = new ApiError(
          errorData.message,
          errorData.statusCode || 500,
          errorData.statusCode === 401
        );
        onError?.(apiError);
      } catch {
        console.error('Job watch stream error', event);
      }
    }
    eventSource.close();
  });

  eventSource.onerror = () => {
    eventSource.close();
  };

  return () => {
    eventSource.close();
  };
}

export async function deleteJob(namespace: string, job: string): Promise<void> {
  await apiFetch<void>(`/namespaces/${encodeURIComponent(namespace)}/jobs/${encodeURIComponent(job)}`, {
    method: 'DELETE'
  });
}

// ServiceAccount API functions
export async function fetchServiceAccounts(namespace: string): Promise<ServiceAccountListItem[]> {
  const data = await apiFetch<{ items: ServiceAccountListItem[] }>(`/namespaces/${encodeURIComponent(namespace)}/serviceaccounts`);
  return data.items;
}

export async function fetchServiceAccount(namespace: string, serviceAccount: string): Promise<ServiceAccountDetail> {
  return apiFetch<ServiceAccountDetail>(`/namespaces/${encodeURIComponent(namespace)}/serviceaccounts/${encodeURIComponent(serviceAccount)}`);
}

export async function fetchServiceAccountManifest(namespace: string, serviceAccount: string): Promise<string> {
  const response = await fetch(
    `${API_BASE}/namespaces/${encodeURIComponent(namespace)}/serviceaccounts/${encodeURIComponent(serviceAccount)}/manifest`
  );
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Failed to load manifest (${response.status})`);
  }
  return await response.text();
}

export function subscribeToServiceAccountEvents(
  namespace: string,
  onEvent: (event: ServiceAccountWatchEvent) => void,
  onError?: (error: ApiError) => void
): () => void {
  const eventSource = new EventSource(`${EVENTS_BASE}/serviceaccounts?namespace=${encodeURIComponent(namespace)}`);

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data) as ServiceAccountWatchEvent;
      onEvent(data);
    } catch (error) {
      console.error('Failed to parse serviceaccount watch event', error);
    }
  };

  eventSource.addEventListener('error', (event) => {
    if (event.type === 'error' && 'data' in event) {
      try {
        const messageEvent = event as MessageEvent;
        const errorData = JSON.parse(messageEvent.data) as { message: string; statusCode?: number };
        const apiError = new ApiError(
          errorData.message,
          errorData.statusCode || 500,
          errorData.statusCode === 401
        );
        onError?.(apiError);
      } catch {
        console.error('ServiceAccount watch stream error', event);
      }
    }
    eventSource.close();
  });

  eventSource.onerror = () => {
    eventSource.close();
  };

  return () => {
    eventSource.close();
  };
}

export async function deleteServiceAccount(namespace: string, serviceAccount: string): Promise<void> {
  await apiFetch<void>(`/namespaces/${encodeURIComponent(namespace)}/serviceaccounts/${encodeURIComponent(serviceAccount)}`, {
    method: 'DELETE'
  });
}

// Argo CD Application API functions
export async function fetchArgoApplications(namespace: string): Promise<ArgoApplicationListItem[]> {
  const data = await apiFetch<{ items: ArgoApplicationListItem[] }>(`/namespaces/${encodeURIComponent(namespace)}/argocd/applications`);
  return data.items;
}

export async function fetchArgoApplication(namespace: string, application: string): Promise<ArgoApplicationDetail> {
  return apiFetch<ArgoApplicationDetail>(`/namespaces/${encodeURIComponent(namespace)}/argocd/applications/${encodeURIComponent(application)}`);
}

export async function fetchArgoApplicationManifest(namespace: string, application: string): Promise<string> {
  const response = await fetch(
    `${API_BASE}/namespaces/${encodeURIComponent(namespace)}/argocd/applications/${encodeURIComponent(application)}/manifest`
  );
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Failed to load manifest (${response.status})`);
  }
  return await response.text();
}

export async function fetchArgoApplicationStatus(namespace: string, application: string): Promise<ArgoApplicationStatus> {
  return apiFetch<ArgoApplicationStatus>(`/namespaces/${encodeURIComponent(namespace)}/argocd/applications/${encodeURIComponent(application)}/status`);
}

export function subscribeToArgoApplicationEvents(
  namespace: string,
  onEvent: (event: ArgoApplicationWatchEvent) => void,
  onError?: (error: ApiError) => void
): () => void {
  const eventSource = new EventSource(`${EVENTS_BASE}/argocd/applications?namespace=${encodeURIComponent(namespace)}`);

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data) as ArgoApplicationWatchEvent;
      onEvent(data);
    } catch (error) {
      console.error('Failed to parse Argo CD application watch event', error);
    }
  };

  eventSource.addEventListener('error', (event) => {
    if (event.type === 'error' && 'data' in event) {
      try {
        const messageEvent = event as MessageEvent;
        const errorData = JSON.parse(messageEvent.data) as { message: string; statusCode?: number };
        const apiError = new ApiError(
          errorData.message,
          errorData.statusCode || 500,
          errorData.statusCode === 401
        );
        onError?.(apiError);
      } catch {
        console.error('Argo CD application watch stream error', event);
      }
    }
    eventSource.close();
  });

  eventSource.onerror = () => {
    eventSource.close();
  };

  return () => {
    eventSource.close();
  };
}

export async function deleteArgoApplication(namespace: string, application: string): Promise<void> {
  await apiFetch<void>(`/namespaces/${encodeURIComponent(namespace)}/argocd/applications/${encodeURIComponent(application)}`, {
    method: 'DELETE'
  });
}

// Service API functions
export async function fetchServices(namespace: string): Promise<ServiceListItem[]> {
  const data = await apiFetch<{ items: ServiceListItem[] }>(`/namespaces/${encodeURIComponent(namespace)}/services`);
  return data.items;
}

export async function fetchService(namespace: string, service: string): Promise<ServiceDetail> {
  return apiFetch<ServiceDetail>(`/namespaces/${encodeURIComponent(namespace)}/services/${encodeURIComponent(service)}`);
}

export async function fetchServiceManifest(namespace: string, service: string): Promise<string> {
  const response = await fetch(
    `${API_BASE}/namespaces/${encodeURIComponent(namespace)}/services/${encodeURIComponent(service)}/manifest`
  );
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Failed to load manifest (${response.status})`);
  }
  return await response.text();
}

export async function fetchServicePods(namespace: string, service: string): Promise<PodListItem[]> {
  return apiFetch<PodListItem[]>(`/namespaces/${encodeURIComponent(namespace)}/services/${encodeURIComponent(service)}/pods`);
}

export interface ServiceEndpoint {
  ip: string;
  nodeName?: string;
  podName?: string;
  ready: boolean;
}

export async function fetchServiceEndpoints(namespace: string, service: string): Promise<{
  endpoints: ServiceEndpoint[];
  fromEndpointsAPI: boolean;
}> {
  return apiFetch<{ endpoints: ServiceEndpoint[]; fromEndpointsAPI: boolean }>(
    `/namespaces/${encodeURIComponent(namespace)}/services/${encodeURIComponent(service)}/endpoints`
  );
}

export async function deleteService(namespace: string, service: string): Promise<void> {
  await apiFetch<void>(`/namespaces/${encodeURIComponent(namespace)}/services/${encodeURIComponent(service)}`, {
    method: 'DELETE'
  });
}
 
// ConfigMap API functions
export async function fetchConfigMaps(namespace: string): Promise<ConfigMapListItem[]> {
  const data = await apiFetch<{ items: ConfigMapListItem[] }>(`/namespaces/${encodeURIComponent(namespace)}/configmaps`);
  return data.items;
}

export async function fetchConfigMap(namespace: string, configmap: string): Promise<ConfigMapDetail> {
  return apiFetch<ConfigMapDetail>(`/namespaces/${encodeURIComponent(namespace)}/configmaps/${encodeURIComponent(configmap)}`);
}

export async function fetchConfigMapManifest(namespace: string, configmap: string): Promise<string> {
  const response = await fetch(
    `${API_BASE}/namespaces/${encodeURIComponent(namespace)}/configmaps/${encodeURIComponent(configmap)}/manifest`
  );
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Failed to load manifest (${response.status})`);
  }
  return await response.text();
}

export async function deleteConfigMap(namespace: string, configmap: string): Promise<void> {
  await apiFetch<void>(`/namespaces/${encodeURIComponent(namespace)}/configmaps/${encodeURIComponent(configmap)}`, {
    method: 'DELETE'
  });
}

export function subscribeToConfigMapEvents(
  namespace: string,
  onEvent: (event: ConfigMapWatchEvent) => void,
  onError?: (error: ApiError) => void
): () => void {
  const eventSource = new EventSource(`${EVENTS_BASE}/configmaps?namespace=${encodeURIComponent(namespace)}`);

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data) as ConfigMapWatchEvent;
      onEvent(data);
    } catch (error) {
      console.error('Failed to parse configmap watch event', error);
    }
  };

  eventSource.addEventListener('error', (event) => {
    if (event.type === 'error' && 'data' in event) {
      try {
        const messageEvent = event as MessageEvent;
        const errorData = JSON.parse(messageEvent.data) as { message: string; statusCode?: number };
        const apiError = new ApiError(
          errorData.message,
          errorData.statusCode || 500,
          errorData.statusCode === 401
        );
        onError?.(apiError);
      } catch {
        console.error('ConfigMap watch stream error', event);
      }
    }
    eventSource.close();
  });

  eventSource.onerror = () => {
    eventSource.close();
  };

  return () => {
    eventSource.close();
  };
}

// Secret API functions
export async function fetchSecrets(namespace: string): Promise<SecretListItem[]> {
  const data = await apiFetch<{ items: SecretListItem[] }>(`/namespaces/${encodeURIComponent(namespace)}/secrets`);
  return data.items;
}

export async function fetchSecret(namespace: string, secret: string): Promise<SecretDetail> {
  return apiFetch<SecretDetail>(`/namespaces/${encodeURIComponent(namespace)}/secrets/${encodeURIComponent(secret)}`);
}

export async function fetchSecretManifest(namespace: string, secret: string): Promise<string> {
  const response = await fetch(
    `${API_BASE}/namespaces/${encodeURIComponent(namespace)}/secrets/${encodeURIComponent(secret)}/manifest`
  );
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Failed to load manifest (${response.status})`);
  }
  return await response.text();
}

export async function deleteSecret(namespace: string, secret: string): Promise<void> {
  await apiFetch<void>(`/namespaces/${encodeURIComponent(namespace)}/secrets/${encodeURIComponent(secret)}`, {
    method: 'DELETE'
  });
}

export function subscribeToSecretEvents(
  namespace: string,
  onEvent: (event: SecretWatchEvent) => void,
  onError?: (error: ApiError) => void
): () => void {
  const eventSource = new EventSource(`${EVENTS_BASE}/secrets?namespace=${encodeURIComponent(namespace)}`);

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data) as SecretWatchEvent;
      onEvent(data);
    } catch (error) {
      console.error('Failed to parse secret watch event', error);
    }
  };

  eventSource.addEventListener('error', (event) => {
    if (event.type === 'error' && 'data' in event) {
      try {
        const messageEvent = event as MessageEvent;
        const errorData = JSON.parse(messageEvent.data) as { message: string; statusCode?: number };
        const apiError = new ApiError(
          errorData.message,
          errorData.statusCode || 500,
          errorData.statusCode === 401
        );
        onError?.(apiError);
      } catch {
        console.error('Secret watch stream error', event);
      }
    }
    eventSource.close();
  });

  eventSource.onerror = () => {
    eventSource.close();
  };

  return () => {
    eventSource.close();
  };
}

// HPA API functions
export async function fetchHpas(namespace: string): Promise<HpaListItem[]> {
  const data = await apiFetch<{ items: HpaListItem[] }>(`/namespaces/${encodeURIComponent(namespace)}/hpas`);
  return data.items;
}

export async function fetchHpa(namespace: string, hpa: string): Promise<HpaDetail> {
  return apiFetch<HpaDetail>(`/namespaces/${encodeURIComponent(namespace)}/hpas/${encodeURIComponent(hpa)}`);
}

export async function fetchHpaManifest(namespace: string, hpa: string): Promise<string> {
  const response = await fetch(
    `${API_BASE}/namespaces/${encodeURIComponent(namespace)}/hpas/${encodeURIComponent(hpa)}/manifest`
  );
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Failed to load manifest (${response.status})`);
  }
  const data = await response.json();
  return data.manifest;
}

export async function deleteHpa(namespace: string, hpa: string): Promise<void> {
  await apiFetch<void>(`/namespaces/${encodeURIComponent(namespace)}/hpas/${encodeURIComponent(hpa)}`, {
    method: 'DELETE'
  });
}

export async function patchHpaMinReplicas(namespace: string, hpa: string, minReplicas: number): Promise<void> {
  await apiFetch<void>(`/namespaces/${encodeURIComponent(namespace)}/hpas/${encodeURIComponent(hpa)}/minreplicas`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ minReplicas })
  });
}

export async function fetchHpaEvents(namespace: string, hpa: string): Promise<HpaEvent[]> {
  const data = await apiFetch<{ events: HpaEvent[] }>(`/namespaces/${encodeURIComponent(namespace)}/hpas/${encodeURIComponent(hpa)}/events`);
  return data.events;
}

export function subscribeToHpaEvents(
  namespace: string,
  onEvent: (event: HpaWatchEvent) => void,
  onError?: (error: ApiError) => void
): () => void {
  const eventSource = new EventSource(`${EVENTS_BASE}/hpas?namespace=${encodeURIComponent(namespace)}`);

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data) as HpaWatchEvent;
      onEvent(data);
    } catch (error) {
      console.error('Failed to parse hpa watch event', error);
    }
  };

  eventSource.addEventListener('error', (event) => {
    if (event.type === 'error' && 'data' in event) {
      try {
        const messageEvent = event as MessageEvent;
        const errorData = JSON.parse(messageEvent.data) as { message: string; statusCode?: number };
        const apiError = new ApiError(
          errorData.message,
          errorData.statusCode || 500,
          errorData.statusCode === 401
        );
        onError?.(apiError);
      } catch {
        console.error('HPA watch stream error', event);
      }
    }
    eventSource.close();
  });

  eventSource.onerror = () => {
    eventSource.close();
  };

  return () => {
    eventSource.close();
  };
}

// PodDisruptionBudget API functions
export async function fetchPdbs(namespace: string): Promise<PdbListItem[]> {
  const data = await apiFetch<{ items: PdbListItem[] }>(`/namespaces/${encodeURIComponent(namespace)}/pdbs`);
  return data.items;
}

export async function fetchPdb(namespace: string, pdb: string): Promise<PdbDetail> {
  return apiFetch<PdbDetail>(`/namespaces/${encodeURIComponent(namespace)}/pdbs/${encodeURIComponent(pdb)}`);
}

export async function fetchPdbManifest(namespace: string, pdb: string): Promise<string> {
  const response = await fetch(
    `${API_BASE}/namespaces/${encodeURIComponent(namespace)}/pdbs/${encodeURIComponent(pdb)}/manifest`
  );
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Failed to load manifest (${response.status})`);
  }
  const data = await response.json();
  return data.manifest;
}

export async function deletePdb(namespace: string, pdb: string): Promise<void> {
  await apiFetch<void>(`/namespaces/${encodeURIComponent(namespace)}/pdbs/${encodeURIComponent(pdb)}`, {
    method: 'DELETE'
  });
}

export async function fetchPdbEvents(namespace: string, pdb: string): Promise<PdbEvent[]> {
  const data = await apiFetch<{ events: PdbEvent[] }>(`/namespaces/${encodeURIComponent(namespace)}/pdbs/${encodeURIComponent(pdb)}/events`);
  return data.events;
}

export function subscribeToPdbEvents(
  namespace: string,
  onEvent: (event: PdbWatchEvent) => void,
  onError?: (error: ApiError) => void
): () => void {
  const eventSource = new EventSource(`${EVENTS_BASE}/pdbs?namespace=${encodeURIComponent(namespace)}`);

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data) as PdbWatchEvent;
      onEvent(data);
    } catch (error) {
      console.error('Failed to parse pdb watch event', error);
    }
  };

  eventSource.addEventListener('error', (event) => {
    if (event.type === 'error' && 'data' in event) {
      try {
        const messageEvent = event as MessageEvent;
        const errorData = JSON.parse(messageEvent.data) as { message: string; statusCode?: number };
        const apiError = new ApiError(
          errorData.message,
          errorData.statusCode || 500,
          errorData.statusCode === 401
        );
        onError?.(apiError);
      } catch {
        console.error('PDB watch stream error', event);
      }
    }
    eventSource.close();
  });

  eventSource.onerror = () => {
    eventSource.close();
  };

  return () => {
    eventSource.close();
  };
}

// ExternalSecret API functions
export async function fetchExternalSecrets(namespace: string): Promise<ExternalSecretListItem[]> {
  const data = await apiFetch<{ items: ExternalSecretListItem[] }>(`/namespaces/${encodeURIComponent(namespace)}/externalsecrets`);
  return data.items;
}

export async function fetchExternalSecret(namespace: string, externalsecret: string): Promise<ExternalSecretDetail> {
  return apiFetch<ExternalSecretDetail>(`/namespaces/${encodeURIComponent(namespace)}/externalsecrets/${encodeURIComponent(externalsecret)}`);
}

export async function fetchExternalSecretManifest(namespace: string, externalsecret: string): Promise<string> {
  const response = await fetch(
    `${API_BASE}/namespaces/${encodeURIComponent(namespace)}/externalsecrets/${encodeURIComponent(externalsecret)}/manifest`
  );
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Failed to load manifest (${response.status})`);
  }
  return await response.text();
}

export async function fetchExternalSecretEvents(namespace: string, externalsecret: string): Promise<ExternalSecretEvent[]> {
  const data = await apiFetch<{ events: ExternalSecretEvent[] }>(`/namespaces/${encodeURIComponent(namespace)}/externalsecrets/${encodeURIComponent(externalsecret)}/events`);
  return data.events;
}

export async function fetchExternalSecretStatus(namespace: string, externalsecret: string): Promise<ExternalSecretStatus> {
  return apiFetch<ExternalSecretStatus>(`/namespaces/${encodeURIComponent(namespace)}/externalsecrets/${encodeURIComponent(externalsecret)}/status`);
}

export function subscribeToExternalSecretEvents(
  namespace: string,
  onEvent: (event: ExternalSecretWatchEvent) => void,
  onError?: (error: ApiError) => void
): () => void {
  const eventSource = new EventSource(`${EVENTS_BASE}/externalsecrets?namespace=${encodeURIComponent(namespace)}`);

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data) as ExternalSecretWatchEvent;
      onEvent(data);
    } catch (error) {
      console.error('Failed to parse externalsecret watch event', error);
    }
  };

  eventSource.addEventListener('error', (event) => {
    if (event.type === 'error' && 'data' in event) {
      try {
        const messageEvent = event as MessageEvent;
        const errorData = JSON.parse(messageEvent.data) as { message: string; statusCode?: number };
        const apiError = new ApiError(
          errorData.message,
          errorData.statusCode || 500,
          errorData.statusCode === 401
        );
        onError?.(apiError);
      } catch {
        console.error('ExternalSecret watch stream error', event);
      }
    }
    eventSource.close();
  });

  eventSource.onerror = () => {
    eventSource.close();
  };

  return () => {
    eventSource.close();
  };
}

export async function deleteExternalSecret(namespace: string, externalsecret: string): Promise<void> {
  await apiFetch<void>(`/namespaces/${encodeURIComponent(namespace)}/externalsecrets/${encodeURIComponent(externalsecret)}`, {
    method: 'DELETE'
  });
}

// VirtualService API functions
export async function fetchVirtualServices(namespace: string): Promise<VirtualServiceListItem[]> {
  const data = await apiFetch<{ items: VirtualServiceListItem[] }>(`/namespaces/${encodeURIComponent(namespace)}/virtualservices`);
  return data.items;
}

export async function fetchVirtualService(namespace: string, name: string): Promise<VirtualServiceDetail> {
  return apiFetch<VirtualServiceDetail>(`/namespaces/${encodeURIComponent(namespace)}/virtualservices/${encodeURIComponent(name)}`);
}

export async function fetchVirtualServiceManifest(namespace: string, name: string): Promise<string> {
  const response = await fetch(
    `${API_BASE}/namespaces/${encodeURIComponent(namespace)}/virtualservices/${encodeURIComponent(name)}/manifest`
  );
  if (!response.ok) {
    const message = await response.text();
    throw new ApiError(message || response.statusText, response.status);
  }
  return await response.text();
}

export async function deleteVirtualService(namespace: string, name: string): Promise<void> {
  await apiFetch<void>(`/namespaces/${encodeURIComponent(namespace)}/virtualservices/${encodeURIComponent(name)}`, {
    method: 'DELETE'
  });
}

export function subscribeToVirtualServiceEvents(
  namespace: string,
  onEvent: (event: VirtualServiceWatchEvent) => void,
  onError?: (error: ApiError) => void
): () => void {
  const eventSource = new EventSource(`${EVENTS_BASE}/virtualservices?namespace=${encodeURIComponent(namespace)}`);

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data) as VirtualServiceWatchEvent;
      onEvent(data);
    } catch (error) {
      console.error('Failed to parse virtualservice watch event', error);
    }
  };

  eventSource.onerror = (event) => {
    if (eventSource.readyState === EventSource.CLOSED) {
      try {
        const apiError = new ApiError(
          'VirtualService watch stream closed unexpectedly',
          0
        );
        onError?.(apiError);
      } catch {
        console.error('VirtualService watch stream error', event);
      }
    }
    eventSource.close();
  };

  return () => {
    eventSource.close();
  };
}

// Gateway API functions
export async function fetchGateways(namespace: string): Promise<GatewayListItem[]> {
  const data = await apiFetch<{ items: GatewayListItem[] }>(`/namespaces/${encodeURIComponent(namespace)}/gateways`);
  return data.items;
}

export async function fetchGateway(namespace: string, name: string): Promise<GatewayDetail> {
  return apiFetch<GatewayDetail>(`/namespaces/${encodeURIComponent(namespace)}/gateways/${encodeURIComponent(name)}`);
}

export async function fetchGatewayManifest(namespace: string, name: string): Promise<string> {
  const response = await fetch(
    `${API_BASE}/namespaces/${encodeURIComponent(namespace)}/gateways/${encodeURIComponent(name)}/manifest`
  );
  if (!response.ok) {
    const message = await response.text();
    throw new ApiError(message || response.statusText, response.status);
  }
  return await response.text();
}

export async function deleteGateway(namespace: string, name: string): Promise<void> {
  await apiFetch<void>(`/namespaces/${encodeURIComponent(namespace)}/gateways/${encodeURIComponent(name)}`, {
    method: 'DELETE'
  });
}

export function subscribeToGatewayEvents(
  namespace: string,
  onEvent: (event: GatewayWatchEvent) => void,
  onError?: (error: ApiError) => void
): () => void {
  const eventSource = new EventSource(`${EVENTS_BASE}/gateways?namespace=${encodeURIComponent(namespace)}`);

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data) as GatewayWatchEvent;
      onEvent(data);
    } catch (error) {
      console.error('Failed to parse gateway watch event', error);
    }
  };

  eventSource.onerror = (event) => {
    if (eventSource.readyState === EventSource.CLOSED) {
      try {
        const apiError = new ApiError(
          'Gateway watch stream closed unexpectedly',
          0
        );
        onError?.(apiError);
      } catch {
        console.error('Gateway watch stream error', event);
      }
    }
    eventSource.close();
  };

  return () => {
    eventSource.close();
  };
}

// DestinationRule API functions
export async function fetchDestinationRules(namespace: string): Promise<DestinationRuleListItem[]> {
  const data = await apiFetch<{ items: DestinationRuleListItem[] }>(`/namespaces/${encodeURIComponent(namespace)}/destinationrules`);
  return data.items;
}

export async function fetchDestinationRule(namespace: string, name: string): Promise<DestinationRuleDetail> {
  return apiFetch<DestinationRuleDetail>(`/namespaces/${encodeURIComponent(namespace)}/destinationrules/${encodeURIComponent(name)}`);
}

export async function fetchDestinationRuleManifest(namespace: string, name: string): Promise<string> {
  const response = await fetch(
    `${API_BASE}/namespaces/${encodeURIComponent(namespace)}/destinationrules/${encodeURIComponent(name)}/manifest`
  );
  if (!response.ok) {
    const message = await response.text();
    throw new ApiError(message || response.statusText, response.status);
  }
  return await response.text();
}

export async function deleteDestinationRule(namespace: string, name: string): Promise<void> {
  await apiFetch<void>(`/namespaces/${encodeURIComponent(namespace)}/destinationrules/${encodeURIComponent(name)}`, {
    method: 'DELETE'
  });
}

export function subscribeToDestinationRuleEvents(
  namespace: string,
  onEvent: (event: DestinationRuleWatchEvent) => void,
  onError?: (error: ApiError) => void
): () => void {
  const eventSource = new EventSource(`${EVENTS_BASE}/destinationrules?namespace=${encodeURIComponent(namespace)}`);

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data) as DestinationRuleWatchEvent;
      onEvent(data);
    } catch (error) {
      console.error('Failed to parse destinationrule watch event', error);
    }
  };

  eventSource.onerror = (event) => {
    if (eventSource.readyState === EventSource.CLOSED) {
      try {
        const apiError = new ApiError(
          'DestinationRule watch stream closed unexpectedly',
          0
        );
        onError?.(apiError);
      } catch {
        console.error('DestinationRule watch stream error', event);
      }
    }
    eventSource.close();
  };

  return () => {
    eventSource.close();
  };
}

// SecretStore API functions
export async function fetchSecretStores(namespace: string): Promise<SecretStoreListItem[]> {
  const data = await apiFetch<{ items: SecretStoreListItem[] }>(`/namespaces/${encodeURIComponent(namespace)}/secretstores`);
  return data.items;
}

export async function fetchSecretStore(namespace: string, secretstore: string): Promise<SecretStoreDetail> {
  return apiFetch<SecretStoreDetail>(`/namespaces/${encodeURIComponent(namespace)}/secretstores/${encodeURIComponent(secretstore)}`);
}

export async function fetchSecretStoreManifest(namespace: string, secretstore: string): Promise<string> {
  const response = await fetch(
    `${API_BASE}/namespaces/${encodeURIComponent(namespace)}/secretstores/${encodeURIComponent(secretstore)}/manifest`
  );
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Failed to load manifest (${response.status})`);
  }
  return await response.text();
}

export async function fetchSecretStoreEvents(namespace: string, secretstore: string): Promise<SecretStoreEvent[]> {
  const data = await apiFetch<{ events: SecretStoreEvent[] }>(`/namespaces/${encodeURIComponent(namespace)}/secretstores/${encodeURIComponent(secretstore)}/events`);
  return data.events;
}

export async function fetchSecretStoreStatus(namespace: string, secretstore: string): Promise<SecretStoreStatus> {
  return apiFetch<SecretStoreStatus>(`/namespaces/${encodeURIComponent(namespace)}/secretstores/${encodeURIComponent(secretstore)}/status`);
}

export function subscribeToSecretStoreEvents(
  namespace: string,
  onEvent: (event: SecretStoreWatchEvent) => void,
  onError?: (error: ApiError) => void
): () => void {
  const eventSource = new EventSource(`${EVENTS_BASE}/secretstores?namespace=${encodeURIComponent(namespace)}`);

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data) as SecretStoreWatchEvent;
      onEvent(data);
    } catch (error) {
      console.error('Failed to parse secret store watch event', error);
    }
  };

  eventSource.addEventListener('error', (event) => {
    if (event.type === 'error' && 'data' in event) {
      try {
        const messageEvent = event as MessageEvent;
        const errorData = JSON.parse(messageEvent.data) as { message: string; statusCode?: number };
        const apiError = new ApiError(
          errorData.message,
          errorData.statusCode || 500,
          errorData.statusCode === 401
        );
        onError?.(apiError);
      } catch {
        console.error('SecretStore watch stream error', event);
      }
    }
    eventSource.close();
  });

  eventSource.onerror = () => {
    eventSource.close();
  };

  return () => {
    eventSource.close();
  };
}

export async function deleteSecretStore(namespace: string, secretstore: string): Promise<void> {
  await apiFetch<void>(`/namespaces/${encodeURIComponent(namespace)}/secretstores/${encodeURIComponent(secretstore)}`, {
    method: 'DELETE'
  });
}

// CRD API functions
export async function fetchCustomResourceDefinitions(): Promise<CustomResourceDefinitionListItem[]> {
  const data = await apiFetch<{ items: CustomResourceDefinitionListItem[] }>('/crds');
  return data.items;
}

export async function fetchCustomResourceDefinition(name: string): Promise<CustomResourceDefinitionDetail> {
  return apiFetch<CustomResourceDefinitionDetail>(`/crds/${encodeURIComponent(name)}`);
}

export async function deleteCustomResourceDefinition(name: string): Promise<void> {
  await apiFetch<void>(`/crds/${encodeURIComponent(name)}`, {
    method: 'DELETE'
  });
}

export async function fetchCustomResourceDefinitionManifest(name: string): Promise<string> {
  const response = await fetch(`${API_BASE}/crds/${encodeURIComponent(name)}/manifest`);
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Failed to load manifest (${response.status})`);
  }
  return await response.text();
}

export function subscribeToCustomResourceDefinitionEvents(
  onEvent: (event: CustomResourceDefinitionWatchEvent) => void,
  onError?: (error: ApiError) => void
): () => void {
  const eventSource = new EventSource(`${EVENTS_BASE}/crds`);

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data) as CustomResourceDefinitionWatchEvent;
      onEvent(data);
    } catch (error) {
      console.error('Failed to parse CRD watch event', error);
    }
  };

  eventSource.addEventListener('error', (event) => {
    if (event.type === 'error' && 'data' in event) {
      try {
        const messageEvent = event as MessageEvent;
        const errorData = JSON.parse(messageEvent.data) as { message: string; statusCode?: number };
        const apiError = new ApiError(
          errorData.message,
          errorData.statusCode || 500,
          errorData.statusCode === 401
        );
        onError?.(apiError);
      } catch {
        console.error('CRD watch stream error', event);
      }
    }
    eventSource.close();
  });

  eventSource.onerror = () => {
    eventSource.close();
  };

  return () => {
    eventSource.close();
  };
}

// Applications API functions
export async function fetchInstalledApplications(): Promise<InstalledApplication[]> {
  const data = await apiFetch<{ items: InstalledApplication[] }>('/applications');
  return data.items;
}

// PersistentVolumeClaim API functions
export async function fetchPersistentVolumeClaims(namespace: string): Promise<PersistentVolumeClaimListItem[]> {
  const data = await apiFetch<{ items: PersistentVolumeClaimListItem[] }>(`/namespaces/${encodeURIComponent(namespace)}/persistentvolumeclaims`);
  return data.items;
}

export async function fetchPersistentVolumeClaim(namespace: string, pvc: string): Promise<PersistentVolumeClaimDetail> {
  return apiFetch<PersistentVolumeClaimDetail>(`/namespaces/${encodeURIComponent(namespace)}/persistentvolumeclaims/${encodeURIComponent(pvc)}`);
}

export async function fetchPersistentVolumeClaimManifest(namespace: string, pvc: string): Promise<string> {
  const response = await fetch(
    `${API_BASE}/namespaces/${encodeURIComponent(namespace)}/persistentvolumeclaims/${encodeURIComponent(pvc)}/manifest`
  );
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Failed to load manifest (${response.status})`);
  }
  return await response.text();
}

export async function deletePersistentVolumeClaim(namespace: string, pvc: string): Promise<void> {
  await apiFetch<void>(`/namespaces/${encodeURIComponent(namespace)}/persistentvolumeclaims/${encodeURIComponent(pvc)}`, {
    method: 'DELETE'
  });
}

export function subscribeToPersistentVolumeClaimEvents(
  namespace: string,
  onEvent: (event: PersistentVolumeClaimWatchEvent) => void,
  onError?: (error: ApiError) => void
): () => void {
  const eventSource = new EventSource(`${EVENTS_BASE}/persistentvolumeclaims?namespace=${encodeURIComponent(namespace)}`);

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data) as PersistentVolumeClaimWatchEvent;
      onEvent(data);
    } catch (error) {
      console.error('Failed to parse PVC watch event', error);
    }
  };

  eventSource.addEventListener('error', (event) => {
    if (event.type === 'error' && 'data' in event) {
      try {
        const messageEvent = event as MessageEvent;
        const errorData = JSON.parse(messageEvent.data) as { message: string; statusCode?: number };
        const apiError = new ApiError(
          errorData.message,
          errorData.statusCode || 500,
          errorData.statusCode === 401
        );
        onError?.(apiError);
      } catch {
        console.error('PVC watch stream error', event);
      }
    }
    eventSource.close();
  });

  eventSource.onerror = () => {
    eventSource.close();
  };

  return () => {
    eventSource.close();
  };
}

// StorageClass API functions
export async function fetchStorageClasses(): Promise<StorageClassListItem[]> {
  const data = await apiFetch<{ items: StorageClassListItem[] }>('/storageclasses');
  return data.items;
}

export async function fetchStorageClass(name: string): Promise<StorageClassDetail> {
  return apiFetch<StorageClassDetail>(`/storageclasses/${encodeURIComponent(name)}`);
}

export async function fetchStorageClassManifest(name: string): Promise<string> {
  const response = await fetch(`${API_BASE}/storageclasses/${encodeURIComponent(name)}/manifest`);
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Failed to load manifest (${response.status})`);
  }
  return await response.text();
}

export async function deleteStorageClass(name: string): Promise<void> {
  await apiFetch<void>(`/storageclasses/${encodeURIComponent(name)}`, {
    method: 'DELETE'
  });
}

export function subscribeToStorageClassEvents(
  onEvent: (event: StorageClassWatchEvent) => void,
  onError?: (error: ApiError) => void
): () => void {
  const eventSource = new EventSource(`${EVENTS_BASE}/storageclasses`);

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data) as StorageClassWatchEvent;
      onEvent(data);
    } catch (error) {
      console.error('Failed to parse StorageClass watch event', error);
    }
  };

  eventSource.addEventListener('error', (event) => {
    if (event.type === 'error' && 'data' in event) {
      try {
        const messageEvent = event as MessageEvent;
        const errorData = JSON.parse(messageEvent.data) as { message: string; statusCode?: number };
        const apiError = new ApiError(
          errorData.message,
          errorData.statusCode || 500,
          errorData.statusCode === 401
        );
        onError?.(apiError);
      } catch {
        console.error('StorageClass watch stream error', event);
      }
    }
    eventSource.close();
  });

  eventSource.onerror = () => {
    eventSource.close();
  };

  return () => {
    eventSource.close();
  };
}

// Role API functions
export async function fetchRoles(namespace: string): Promise<RoleListItem[]> {
  const data = await apiFetch<{ items: RoleListItem[] }>(`/namespaces/${encodeURIComponent(namespace)}/roles`);
  return data.items;
}

export async function fetchRole(namespace: string, role: string): Promise<RoleDetail> {
  return apiFetch<RoleDetail>(`/namespaces/${encodeURIComponent(namespace)}/roles/${encodeURIComponent(role)}`);
}

export async function fetchRoleManifest(namespace: string, role: string): Promise<string> {
  const response = await fetch(
    `${API_BASE}/namespaces/${encodeURIComponent(namespace)}/roles/${encodeURIComponent(role)}/manifest`
  );
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Failed to load manifest (${response.status})`);
  }
  return await response.text();
}

export async function deleteRole(namespace: string, role: string): Promise<void> {
  await apiFetch<void>(`/namespaces/${encodeURIComponent(namespace)}/roles/${encodeURIComponent(role)}`, {
    method: 'DELETE'
  });
}

export function subscribeToRoleEvents(
  namespace: string,
  onEvent: (event: RoleWatchEvent) => void,
  onError?: (error: ApiError) => void
): () => void {
  const eventSource = new EventSource(`${EVENTS_BASE}/roles?namespace=${encodeURIComponent(namespace)}`);

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data) as RoleWatchEvent;
      onEvent(data);
    } catch (error) {
      console.error('Failed to parse role watch event', error);
    }
  };

  eventSource.addEventListener('error', (event) => {
    if (event.type === 'error' && 'data' in event) {
      try {
        const messageEvent = event as MessageEvent;
        const errorData = JSON.parse(messageEvent.data) as { message: string; statusCode?: number };
        const apiError = new ApiError(
          errorData.message,
          errorData.statusCode || 500,
          errorData.statusCode === 401
        );
        onError?.(apiError);
      } catch {
        console.error('Role watch stream error', event);
      }
    }
    eventSource.close();
  });

  eventSource.onerror = () => {
    eventSource.close();
  };

  return () => {
    eventSource.close();
  };
}

// ClusterRole API functions
export async function fetchClusterRoles(): Promise<ClusterRoleListItem[]> {
  const data = await apiFetch<{ items: ClusterRoleListItem[] }>('/clusterroles');
  return data.items;
}

export async function fetchClusterRole(name: string): Promise<ClusterRoleDetail> {
  return apiFetch<ClusterRoleDetail>(`/clusterroles/${encodeURIComponent(name)}`);
}

export async function fetchClusterRoleManifest(name: string): Promise<string> {
  const response = await fetch(`${API_BASE}/clusterroles/${encodeURIComponent(name)}/manifest`);
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Failed to load manifest (${response.status})`);
  }
  return await response.text();
}

export async function deleteClusterRole(name: string): Promise<void> {
  await apiFetch<void>(`/clusterroles/${encodeURIComponent(name)}`, {
    method: 'DELETE'
  });
}

export function subscribeToClusterRoleEvents(
  onEvent: (event: ClusterRoleWatchEvent) => void,
  onError?: (error: ApiError) => void
): () => void {
  const eventSource = new EventSource(`${EVENTS_BASE}/clusterroles`);

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data) as ClusterRoleWatchEvent;
      onEvent(data);
    } catch (error) {
      console.error('Failed to parse ClusterRole watch event', error);
    }
  };

  eventSource.addEventListener('error', (event) => {
    if (event.type === 'error' && 'data' in event) {
      try {
        const messageEvent = event as MessageEvent;
        const errorData = JSON.parse(messageEvent.data) as { message: string; statusCode?: number };
        const apiError = new ApiError(
          errorData.message,
          errorData.statusCode || 500,
          errorData.statusCode === 401
        );
        onError?.(apiError);
      } catch {
        console.error('ClusterRole watch stream error', event);
      }
    }
    eventSource.close();
  });

  eventSource.onerror = () => {
    eventSource.close();
  };

  return () => {
    eventSource.close();
  };
}

// NodeClass API functions
export async function fetchNodeClasses(): Promise<NodeClassListItem[]> {
  const data = await apiFetch<{ items: NodeClassListItem[] }>('/nodeclasses');
  return data.items;
}

export async function fetchNodeClass(name: string): Promise<NodeClassDetail> {
  return apiFetch<NodeClassDetail>(`/nodeclasses/${encodeURIComponent(name)}`);
}

export async function fetchNodeClassManifest(name: string): Promise<string> {
  const response = await fetch(`${API_BASE}/nodeclasses/${encodeURIComponent(name)}/manifest`);
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Failed to load manifest (${response.status})`);
  }
  return await response.text();
}

export async function fetchNodeClassStatus(name: string): Promise<NodeClassStatus> {
  return apiFetch<NodeClassStatus>(`/nodeclasses/${encodeURIComponent(name)}/status`);
}

export async function deleteNodeClass(name: string): Promise<void> {
  await apiFetch<void>(`/nodeclasses/${encodeURIComponent(name)}`, {
    method: 'DELETE'
  });
}

export function subscribeToNodeClassEvents(
  onEvent: (event: NodeClassWatchEvent) => void,
  onError?: (error: ApiError) => void
): () => void {
  const eventSource = new EventSource(`${EVENTS_BASE}/nodeclasses`);

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data) as NodeClassWatchEvent;
      onEvent(data);
    } catch (error) {
      console.error('Failed to parse NodeClass watch event', error);
    }
  };

  eventSource.addEventListener('error', (event) => {
    if (event.type === 'error' && 'data' in event) {
      try {
        const messageEvent = event as MessageEvent;
        const errorData = JSON.parse(messageEvent.data) as { message: string; statusCode?: number };
        const apiError = new ApiError(
          errorData.message,
          errorData.statusCode || 500,
          errorData.statusCode === 401
        );
        onError?.(apiError);
      } catch {
        console.error('NodeClass watch stream error', event);
      }
    }
    eventSource.close();
  });

  eventSource.onerror = () => {
    eventSource.close();
  };

  return () => {
    eventSource.close();
  };
}

// NodePool API functions
export async function fetchNodePools(): Promise<NodePoolListItem[]> {
  const data = await apiFetch<{ items: NodePoolListItem[] }>('/nodepools');
  return data.items;
}

export async function fetchNodePool(name: string): Promise<NodePoolDetail> {
  return apiFetch<NodePoolDetail>(`/nodepools/${encodeURIComponent(name)}`);
}

export async function fetchNodePoolManifest(name: string): Promise<string> {
  const response = await fetch(`${API_BASE}/nodepools/${encodeURIComponent(name)}/manifest`);
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Failed to load manifest (${response.status})`);
  }
  const data = await response.json();
  return data.manifest;
}

export async function deleteNodePool(name: string): Promise<void> {
  await apiFetch<void>(`/nodepools/${encodeURIComponent(name)}`, {
    method: 'DELETE'
  });
}

export function subscribeToNodePoolEvents(
  onEvent: (event: NodePoolWatchEvent) => void,
  onError?: (error: ApiError) => void
): () => void {
  const eventSource = new EventSource(`${EVENTS_BASE}/nodepools`);

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data) as NodePoolWatchEvent;
      onEvent(data);
    } catch (error) {
      console.error('Failed to parse NodePool watch event', error);
    }
  };

  eventSource.addEventListener('error', (event) => {
    if (event.type === 'error' && 'data' in event) {
      try {
        const messageEvent = event as MessageEvent;
        const errorData = JSON.parse(messageEvent.data) as { message: string; statusCode?: number };
        const apiError = new ApiError(
          errorData.message,
          errorData.statusCode || 500,
          errorData.statusCode === 401
        );
        onError?.(apiError);
      } catch {
        console.error('NodePool watch stream error', event);
      }
    }
    eventSource.close();
  });

  eventSource.onerror = () => {
    eventSource.close();
  };

  return () => {
    eventSource.close();
  };
}

// CronJob API functions
export async function fetchCronJobs(namespace: string): Promise<CronJobListItem[]> {
  const data = await apiFetch<{ items: CronJobListItem[] }>(`/namespaces/${encodeURIComponent(namespace)}/cronjobs`);
  return data.items;
}

export async function fetchCronJob(namespace: string, cronjob: string): Promise<CronJobDetail> {
  return apiFetch<CronJobDetail>(`/namespaces/${encodeURIComponent(namespace)}/cronjobs/${encodeURIComponent(cronjob)}`);
}

export async function fetchCronJobManifest(namespace: string, cronjob: string): Promise<string> {
  const response = await fetch(
    `${API_BASE}/namespaces/${encodeURIComponent(namespace)}/cronjobs/${encodeURIComponent(cronjob)}/manifest`
  );
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Failed to load manifest (${response.status})`);
  }
  return await response.text();
}

export async function deleteCronJob(namespace: string, cronjob: string): Promise<void> {
  await apiFetch<void>(`/namespaces/${encodeURIComponent(namespace)}/cronjobs/${encodeURIComponent(cronjob)}`, {
    method: 'DELETE'
  });
}

export async function updateCronJobSuspend(namespace: string, cronjob: string, suspend: boolean): Promise<void> {
  await apiFetch<void>(`/namespaces/${encodeURIComponent(namespace)}/cronjobs/${encodeURIComponent(cronjob)}/suspend`, {
    method: 'POST',
    body: JSON.stringify({ suspend })
  });
}

export function subscribeToCronJobEvents(
  namespace: string,
  onEvent: (event: CronJobWatchEvent) => void,
  onError?: (error: ApiError) => void
): () => void {
  const eventSource = new EventSource(`${EVENTS_BASE}/cronjobs?namespace=${encodeURIComponent(namespace)}`);

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data) as CronJobWatchEvent;
      onEvent(data);
    } catch (error) {
      console.error('Failed to parse cronjob watch event', error);
    }
  };

  eventSource.addEventListener('error', (event) => {
    if (event.type === 'error' && 'data' in event) {
      try {
        const messageEvent = event as MessageEvent;
        const errorData = JSON.parse(messageEvent.data) as { message: string; statusCode?: number };
        const apiError = new ApiError(
          errorData.message,
          errorData.statusCode || 500,
          errorData.statusCode === 401
        );
        onError?.(apiError);
      } catch {
        console.error('CronJob watch stream error', event);
      }
    }
    eventSource.close();
  });

  eventSource.onerror = () => {
    eventSource.close();
  };

  return () => {
    eventSource.close();
  };
}

// Ingress API functions
export async function fetchIngresses(namespace: string): Promise<IngressListItem[]> {
  const data = await apiFetch<{ items: IngressListItem[] }>(`/namespaces/${encodeURIComponent(namespace)}/ingresses`);
  return data.items;
}

export async function fetchIngress(namespace: string, ingress: string): Promise<IngressDetail> {
  return apiFetch<IngressDetail>(`/namespaces/${encodeURIComponent(namespace)}/ingresses/${encodeURIComponent(ingress)}`);
}

export async function fetchIngressManifest(namespace: string, ingress: string): Promise<string> {
  const response = await fetch(
    `${API_BASE}/namespaces/${encodeURIComponent(namespace)}/ingresses/${encodeURIComponent(ingress)}/manifest`
  );
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Failed to load manifest (${response.status})`);
  }
  return await response.text();
}

export async function deleteIngress(namespace: string, ingress: string): Promise<void> {
  await apiFetch<void>(`/namespaces/${encodeURIComponent(namespace)}/ingresses/${encodeURIComponent(ingress)}`, {
    method: 'DELETE'
  });
}

export async function forceDeleteIngress(namespace: string, ingress: string): Promise<void> {
  await apiFetch<void>(`/namespaces/${encodeURIComponent(namespace)}/ingresses/${encodeURIComponent(ingress)}?force=true`, {
    method: 'DELETE'
  });
}

export function subscribeToIngressEvents(
  namespace: string,
  onEvent: (event: IngressWatchEvent) => void,
  onError?: (error: ApiError) => void
): () => void {
  const eventSource = new EventSource(`${EVENTS_BASE}/ingresses?namespace=${encodeURIComponent(namespace)}`);

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data) as IngressWatchEvent;
      onEvent(data);
    } catch (error) {
      console.error('Failed to parse ingress watch event', error);
    }
  };

  eventSource.addEventListener('error', (event) => {
    if (event.type === 'error' && 'data' in event) {
      try {
        const messageEvent = event as MessageEvent;
        const errorData = JSON.parse(messageEvent.data) as { message: string; statusCode?: number };
        const apiError = new ApiError(
          errorData.message,
          errorData.statusCode || 500,
          errorData.statusCode === 401
        );
        onError?.(apiError);
      } catch {
        console.error('Ingress watch stream error', event);
      }
    }
    eventSource.close();
  });

  eventSource.onerror = () => {
    eventSource.close();
  };

  return () => {
    eventSource.close();
  };
}

export function subscribeToServiceEvents(
  namespace: string,
  onEvent: (event: ServiceWatchEvent) => void,
  onError?: (error: ApiError) => void
): () => void {
  const eventSource = new EventSource(`${EVENTS_BASE}/services?namespace=${encodeURIComponent(namespace)}`);

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data) as ServiceWatchEvent;
      onEvent(data);
    } catch (error) {
      console.error('Failed to parse service watch event', error);
    }
  };

  eventSource.addEventListener('error', (event) => {
    if (event.type === 'error' && 'data' in event) {
      try {
        const messageEvent = event as MessageEvent;
        const errorData = JSON.parse(messageEvent.data) as { message: string; statusCode?: number };
        const apiError = new ApiError(
          errorData.message,
          errorData.statusCode || 500,
          errorData.statusCode === 401
        );
        onError?.(apiError);
      } catch {
        console.error('Service watch stream error', event);
      }
    }
    eventSource.close();
  });

  eventSource.onerror = () => {
    eventSource.close();
  };

  return () => {
    eventSource.close();
  };
}

export interface LogStreamOptions {
  namespace: string;
  pod: string;
  container: string;
  follow?: boolean;
  tailLines?: number;
  previous?: boolean;
  onChunk: (chunk: string) => void;
  onComplete?: () => void;
  onError?: (error: Error) => void;
}

export interface AwsProfile {
  name: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  sessionToken?: string;
  region?: string;
}

export interface EksCluster {
  name: string;
  status: string;
  version: string;
  endpoint: string;
  region: string;
}

export function streamPodLogs(options: LogStreamOptions): () => void {
  const { namespace, pod, container, follow = true, tailLines = 200, previous = false, onChunk, onComplete, onError } = options;
  const controller = new AbortController();

  void fetch(
    `${API_BASE}/namespaces/${encodeURIComponent(namespace)}/pods/${encodeURIComponent(pod)}/containers/${encodeURIComponent(container)}/logs?follow=${follow}&tailLines=${tailLines}&previous=${previous}`,
    {
      signal: controller.signal
    }
  )
    .then(async (response) => {
      if (!response.ok || !response.body) {
        throw new Error(`Failed to stream logs (${response.status})`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) {
          onChunk(decoder.decode(value, { stream: true }));
        }
      }

      // Stream completed successfully
      onComplete?.();
    })
    .catch((error) => {
      if (error.name !== 'AbortError') {
        console.error('Log stream error', error);
        onError?.(error);
      }
    });

  return () => {
    controller.abort();
  };
}

export async function fetchAwsProfiles(): Promise<AwsProfile[]> {
  const data = await apiFetch<{ profiles: AwsProfile[] }>(`/aws/profiles`);
  return data.profiles;
}

export async function fetchAwsRegions(): Promise<string[]> {
  const data = await apiFetch<{ regions: string[] }>(`/aws/regions`);
  return data.regions;
}

export async function fetchEksClusters(region: string, profile: string): Promise<EksCluster[]> {
  const data = await apiFetch<{ clusters: EksCluster[] }>(`/aws/eks/clusters?region=${encodeURIComponent(region)}&profile=${encodeURIComponent(profile)}`);
  return data.clusters;
}

export async function importEksCluster(clusterName: string, region: string, profile: string): Promise<void> {
  await apiFetch<void>(`/aws/eks/import`, {
    method: 'POST',
    body: JSON.stringify({ clusterName, region, profile })
  });
}

// ScaledObject API functions (KEDA)
export async function fetchScaledObjects(namespace: string): Promise<ScaledObjectListItem[]> {
  const data = await apiFetch<{ items: ScaledObjectListItem[] }>(`/namespaces/${encodeURIComponent(namespace)}/scaledobjects`);
  return data.items;
}

export async function fetchScaledObject(namespace: string, scaledobject: string): Promise<ScaledObjectDetail> {
  return apiFetch<ScaledObjectDetail>(`/namespaces/${encodeURIComponent(namespace)}/scaledobjects/${encodeURIComponent(scaledobject)}`);
}

export async function fetchScaledObjectManifest(namespace: string, scaledobject: string): Promise<string> {
  const response = await fetch(
    `${API_BASE}/namespaces/${encodeURIComponent(namespace)}/scaledobjects/${encodeURIComponent(scaledobject)}/manifest`
  );
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Failed to load manifest (${response.status})`);
  }
  return await response.text();
}

export async function deleteScaledObject(namespace: string, scaledobject: string): Promise<void> {
  await apiFetch<void>(`/namespaces/${encodeURIComponent(namespace)}/scaledobjects/${encodeURIComponent(scaledobject)}`, {
    method: 'DELETE'
  });
}

export function subscribeToScaledObjectEvents(
  namespace: string,
  onEvent: (event: ScaledObjectWatchEvent) => void,
  onError?: (error: ApiError) => void
): () => void {
  const eventSource = new EventSource(`${EVENTS_BASE}/scaledobjects?namespace=${encodeURIComponent(namespace)}`);

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data) as ScaledObjectWatchEvent;
      onEvent(data);
    } catch (error) {
      console.error('Failed to parse scaledobject watch event', error);
    }
  };

  eventSource.addEventListener('error', (event) => {
    if (event.type === 'error' && 'data' in event) {
      try {
        const messageEvent = event as MessageEvent;
        const errorData = JSON.parse(messageEvent.data) as { message: string; statusCode?: number };
        const apiError = new ApiError(
          errorData.message,
          errorData.statusCode || 500,
          errorData.statusCode === 401
        );
        onError?.(apiError);
      } catch {
        console.error('ScaledObject watch stream error', event);
      }
    }
    eventSource.close();
  });

  eventSource.onerror = () => {
    eventSource.close();
  };

  return () => {
    eventSource.close();
  };
}

export async function fetchPortForwards(): Promise<PortForward[]> {
  const data = await apiFetch<{ items: PortForward[] }>('/port-forwards');
  return data.items;
}

export async function startPortForward(
  namespace: string,
  pod: string,
  localPort: number,
  targetPort: number
): Promise<PortForward> {
  return apiFetch<PortForward>('/port-forwards', {
    method: 'POST',
    body: JSON.stringify({ namespace, pod, localPort, targetPort })
  });
}

export async function stopPortForward(id: string): Promise<void> {
  await fetch(`${API_BASE}/port-forwards/${encodeURIComponent(id)}`, {
    method: 'DELETE'
  });
}
