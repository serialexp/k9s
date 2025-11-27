// ABOUTME: Defines detection patterns for common Kubernetes applications
// ABOUTME: Maps CRD groups, labels, and annotations to application metadata

export interface ApplicationDefinition {
  name: string;
  description: string;
  logoUrl: string; // Placeholder - will be populated with actual logo paths
  logoBgColor?: string; // Background color for logo container (hex color)
  detectionPatterns: {
    crdGroups?: string[]; // CRD API groups that indicate this app is installed
    labels?: Record<string, string>; // Label key-value pairs to match
    annotations?: Record<string, string>; // Annotation key-value pairs to match
  };
  docsUrl?: string; // Link to official documentation
  category?: string; // E.g., "GitOps", "Security", "Networking", "Observability"
}

export const APPLICATION_DEFINITIONS: ApplicationDefinition[] = [
  {
    name: "Argo CD",
    description: "Declarative GitOps continuous delivery tool for Kubernetes",
    logoUrl: "/logos/argo.webp",
    detectionPatterns: {
      crdGroups: ["argoproj.io"],
    },
    docsUrl: "https://argo-cd.readthedocs.io/",
    category: "GitOps",
  },
  {
    name: "Argo Workflows",
    description: "Container-native workflow engine for Kubernetes",
    logoUrl: "/logos/argo.webp",
    detectionPatterns: {
      crdGroups: ["argoproj.io"],
    },
    docsUrl: "https://argoproj.github.io/workflows/",
    category: "CI/CD",
  },
  {
    name: "Argo Rollouts",
    description: "Progressive delivery with advanced deployment strategies",
    logoUrl: "/logos/argo.webp",
    detectionPatterns: {
      crdGroups: ["argoproj.io"],
    },
    docsUrl: "https://argoproj.github.io/rollouts/",
    category: "GitOps",
  },
  {
    name: "External Secrets",
    description: "Synchronizes secrets from external secret management systems",
    logoUrl: "/logos/external-secrets.svg",
    detectionPatterns: {
      crdGroups: ["external-secrets.io"],
    },
    docsUrl: "https://external-secrets.io/",
    category: "Security",
  },
  {
    name: "Cert Manager",
    description: "Automates management and issuance of TLS certificates",
    logoUrl: "/logos/certmanager.png",
    detectionPatterns: {
      crdGroups: ["cert-manager.io"],
    },
    docsUrl: "https://cert-manager.io/",
    category: "Security",
  },
  {
    name: "Istio",
    description: "Service mesh for traffic management, security, and observability",
    logoUrl: "/logos/istio.png",
    logoBgColor: "#516baa",
    detectionPatterns: {
      crdGroups: ["networking.istio.io", "security.istio.io", "telemetry.istio.io"],
    },
    docsUrl: "https://istio.io/",
    category: "Networking",
  },
  {
    name: "Prometheus Operator",
    description: "Creates and manages Prometheus monitoring instances",
    logoUrl: "/logos/prometheus-operator.png",
    detectionPatterns: {
      crdGroups: ["monitoring.coreos.com"],
    },
    docsUrl: "https://prometheus-operator.dev/",
    category: "Observability",
  },
  {
    name: "Grafana Operator",
    description: "Manages Grafana instances and dashboards",
    logoUrl: "/logos/grafana.svg",
    detectionPatterns: {
      crdGroups: ["grafana.integreatly.org"],
    },
    docsUrl: "https://grafana-operator.github.io/grafana-operator/",
    category: "Observability",
  },
  {
    name: "Velero",
    description: "Backup and restore Kubernetes cluster resources and volumes",
    logoUrl: "/logos/velero.svg",
    detectionPatterns: {
      crdGroups: ["velero.io"],
    },
    docsUrl: "https://velero.io/",
    category: "Backup",
  },
  {
    name: "Sealed Secrets",
    description: "Encrypt secrets into SealedSecrets for safe git storage",
    logoUrl: "/logos/sealed-secrets.svg",
    detectionPatterns: {
      crdGroups: ["bitnami.com"],
    },
    docsUrl: "https://sealed-secrets.netlify.app/",
    category: "Security",
  },
  {
    name: "Crossplane",
    description: "Compose cloud infrastructure and services using Kubernetes API",
    logoUrl: "/logos/crossplane.svg",
    detectionPatterns: {
      crdGroups: ["crossplane.io"],
    },
    docsUrl: "https://crossplane.io/",
    category: "Infrastructure",
  },
  {
    name: "Fission",
    description: "Fast serverless functions with code-only deployment and warm pools",
    logoUrl: "/logos/fission.svg",
    detectionPatterns: {
      crdGroups: ["fission.io"],
    },
    docsUrl: "https://fission.io/",
    category: "Serverless",
  },
  {
    name: "Knative",
    description: "Serverless containers on Kubernetes",
    logoUrl: "/logos/knative.svg",
    detectionPatterns: {
      crdGroups: ["serving.knative.dev", "eventing.knative.dev"],
    },
    docsUrl: "https://knative.dev/",
    category: "Serverless",
  },
  {
    name: "Kyverno",
    description: "Policy engine designed for Kubernetes",
    logoUrl: "/logos/kyverno.svg",
    detectionPatterns: {
      crdGroups: ["kyverno.io"],
    },
    docsUrl: "https://kyverno.io/",
    category: "Security",
  },
  {
    name: "Cilium",
    description: "eBPF-based networking, security, and observability",
    logoUrl: "/logos/cilium.svg",
    detectionPatterns: {
      crdGroups: ["cilium.io"],
    },
    docsUrl: "https://cilium.io/",
    category: "Networking",
  },
  {
    name: "Traefik",
    description: "Cloud-native application proxy and ingress controller",
    logoUrl: "/logos/traefik.svg",
    detectionPatterns: {
      crdGroups: ["traefik.io", "traefik.containo.us"],
    },
    docsUrl: "https://traefik.io/",
    category: "Networking",
  },
  {
    name: "NGINX Ingress Controller",
    description: "Ingress controller using NGINX as reverse proxy",
    logoUrl: "/logos/nginx.svg",
    detectionPatterns: {
      crdGroups: ["k8s.nginx.org"],
    },
    docsUrl: "https://kubernetes.github.io/ingress-nginx/",
    category: "Networking",
  },
  {
    name: "Flux",
    description: "GitOps toolkit for keeping Kubernetes in sync with config sources",
    logoUrl: "/logos/flux.svg",
    detectionPatterns: {
      crdGroups: ["fluxcd.io", "notification.toolkit.fluxcd.io", "source.toolkit.fluxcd.io"],
    },
    docsUrl: "https://fluxcd.io/",
    category: "GitOps",
  },
  {
    name: "Linkerd",
    description: "Ultralight service mesh for Kubernetes",
    logoUrl: "/logos/linkerd.svg",
    detectionPatterns: {
      crdGroups: ["linkerd.io"],
    },
    docsUrl: "https://linkerd.io/",
    category: "Networking",
  },
  {
    name: "KEDA",
    description: "Event-driven autoscaling for Kubernetes workloads",
    logoUrl: "/logos/keda.png",
    logoBgColor: "#ffffff",
    detectionPatterns: {
      crdGroups: ["keda.sh"],
    },
    docsUrl: "https://keda.sh/",
    category: "Autoscaling",
  },
  {
    name: "Karpenter",
    description: "Just-in-time node provisioning for Kubernetes",
    logoUrl: "/logos/karpenter.svg",
    logoBgColor: "#6a72b1",
    detectionPatterns: {
      crdGroups: ["karpenter.sh"],
    },
    docsUrl: "https://karpenter.sh/",
    category: "Autoscaling",
  },
  {
    name: "AWS EKS Add-ons",
    description: "Amazon EKS managed add-ons and integrations",
    logoUrl: "/logos/eks.png",
    logoBgColor: "#ffffff",
    detectionPatterns: {
      crdGroups: ["eks.amazonaws.com"],
    },
    docsUrl: "https://docs.aws.amazon.com/eks/",
    category: "Infrastructure",
  },
  {
    name: "Tekton",
    description: "Cloud-native CI/CD pipeline framework",
    logoUrl: "/logos/tekton.svg",
    detectionPatterns: {
      crdGroups: ["tekton.dev"],
    },
    docsUrl: "https://tekton.dev/",
    category: "CI/CD",
  },
  {
    name: "Strimzi",
    description: "Apache Kafka on Kubernetes",
    logoUrl: "/logos/strimzi.svg",
    detectionPatterns: {
      crdGroups: ["kafka.strimzi.io"],
    },
    docsUrl: "https://strimzi.io/",
    category: "Messaging",
  },
  {
    name: "Elastic Cloud on Kubernetes",
    description: "Orchestrate Elasticsearch, Kibana, APM Server, and more",
    logoUrl: "/logos/elastic.svg",
    detectionPatterns: {
      crdGroups: ["elasticsearch.k8s.elastic.co", "kibana.k8s.elastic.co"],
    },
    docsUrl: "https://www.elastic.co/elastic-cloud-kubernetes",
    category: "Observability",
  },
  {
    name: "Rook",
    description: "Storage orchestration for Kubernetes",
    logoUrl: "/logos/rook.svg",
    detectionPatterns: {
      crdGroups: ["ceph.rook.io", "rook.io"],
    },
    docsUrl: "https://rook.io/",
    category: "Storage",
  },
  {
    name: "Volcano",
    description: "Batch system built on Kubernetes for high-performance workloads",
    logoUrl: "/logos/volcano.svg",
    detectionPatterns: {
      crdGroups: ["batch.volcano.sh"],
    },
    docsUrl: "https://volcano.sh/",
    category: "Batch Processing",
  },
  {
    name: "Kubeflow",
    description: "Machine learning toolkit for Kubernetes",
    logoUrl: "/logos/kubeflow.svg",
    detectionPatterns: {
      crdGroups: ["kubeflow.org"],
    },
    docsUrl: "https://kubeflow.org/",
    category: "Machine Learning",
  },
  {
    name: "Cluster API",
    description: "Declarative APIs for cluster creation, configuration, and management",
    logoUrl: "/logos/cluster-api.svg",
    detectionPatterns: {
      crdGroups: ["cluster.x-k8s.io"],
    },
    docsUrl: "https://cluster-api.sigs.k8s.io/",
    category: "Infrastructure",
  },
  {
    name: "Longhorn",
    description: "Cloud-native distributed block storage for Kubernetes",
    logoUrl: "/logos/longhorn.svg",
    detectionPatterns: {
      crdGroups: ["longhorn.io"],
    },
    docsUrl: "https://longhorn.io/",
    category: "Storage",
  },
  {
    name: "Falco",
    description: "Runtime security and threat detection",
    logoUrl: "/logos/falco.svg",
    detectionPatterns: {
      crdGroups: ["falco.org"],
    },
    docsUrl: "https://falco.org/",
    category: "Security",
  },
  {
    name: "Open Policy Agent (OPA)",
    description: "Policy-based control for cloud-native environments",
    logoUrl: "/logos/opa.svg",
    detectionPatterns: {
      crdGroups: ["constraints.gatekeeper.sh", "mutations.gatekeeper.sh"],
    },
    docsUrl: "https://www.openpolicyagent.org/",
    category: "Security",
  },
  {
    name: "KubeVirt",
    description: "Run virtual machines on Kubernetes",
    logoUrl: "/logos/kubevirt.svg",
    detectionPatterns: {
      crdGroups: ["kubevirt.io"],
    },
    docsUrl: "https://kubevirt.io/",
    category: "Virtualization",
  },
  {
    name: "Litmus",
    description: "Chaos engineering for Kubernetes",
    logoUrl: "/logos/litmus.svg",
    detectionPatterns: {
      crdGroups: ["litmuschaos.io"],
    },
    docsUrl: "https://litmuschaos.io/",
    category: "Chaos Engineering",
  },
  {
    name: "Rancher",
    description: "Multi-cluster Kubernetes management platform",
    logoUrl: "/logos/rancher.svg",
    detectionPatterns: {
      crdGroups: ["ui.cattle.io", "management.cattle.io", "catalog.cattle.io"],
    },
    docsUrl: "https://rancher.com/docs/",
    category: "Infrastructure",
  },
  {
    name: "AWS Load Balancer Controller",
    description: "Manages AWS Elastic Load Balancers for Kubernetes services",
    logoUrl: "/logos/aws-load-balancer-controller.svg",
    detectionPatterns: {
      crdGroups: ["elbv2.k8s.aws"],
    },
    docsUrl: "https://kubernetes-sigs.github.io/aws-load-balancer-controller/",
    category: "Networking",
  },
];
