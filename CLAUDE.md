# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Structure

This is a TypeScript monorepo for a Kubernetes dashboard application built with:
- **Frontend**: SolidJS + Tailwind CSS (DaisyUI) + Vite
- **Backend**: Fastify + @kubernetes/client-node
- **Package Manager**: pnpm with workspaces

### Workspace Layout
```
apps/
├── frontend/          # SolidJS frontend app (port 3131)
│   ├── src/
│   │   ├── components/    # React-like components
│   │   ├── routes/       # Page components
│   │   ├── lib/         # API client utilities
│   │   └── utils/       # Helper functions
│   └── vite.config.ts   # Proxies /api and /events to backend
└── backend/          # Fastify backend API (port 3130)
    ├── src/
    │   ├── routes/      # API route handlers
    │   └── services/    # Kubernetes client service
    └── index.ts
```

## Common Development Commands

### Development
- `pnpm dev` - Start both frontend and backend in development mode
- `pnpm dev:frontend` - Start only frontend (port 3131)
- `pnpm dev:backend` - Start only backend (port 3130)

### Building & Type Checking
- **Frontend**: `pnpm --filter k9s-dashboard-frontend build` or `pnpm --filter k9s-dashboard-frontend typecheck`
- **Backend**: `pnpm --filter k9s-dashboard-backend build` or `pnpm --filter k9s-dashboard-backend typecheck`

### Production
- `pnpm --filter k9s-dashboard-frontend preview` - Preview production build of frontend
- `pnpm --filter k9s-dashboard-backend start` - Run built backend (requires prior build)

## Architecture Notes

### Frontend
- Uses SolidJS with JSX syntax (`jsxImportSource: "solid-js"`)
- Tailwind CSS v4 via `@tailwindcss/vite` plugin + DaisyUI components
- API communication through `/api` proxy to backend
- Server-Sent Events for real-time updates via `/events` proxy
- Build target is `esnext` for modern JavaScript

### Backend
- Fastify server that interfaces with Kubernetes via `@kubernetes/client-node`
- Uses local kubeconfig for authentication (respects AWS IAM exec plugins like AWS EKS)
- Provides REST API endpoints and SSE streams for pod/cluster data
- Context switching updates kubectl context without shelling out
- TypeScript with NodeNext module resolution
- Development uses `tsx watch` for hot reloading
- All Kubernetes credentials stay server-side (never exposed to browser)

### Key Integration Points
- Frontend proxies API calls and SSE connections to backend
- Backend respects local kubectl context and can switch contexts
- Real-time pod updates flow from Kubernetes → Backend SSE → Frontend
- Log streaming happens per-container with JSON parsing support

## Technology Stack
- **Frontend**: SolidJS, Tailwind CSS v4, DaisyUI, Vite, TypeScript
- **Backend**: Fastify, @kubernetes/client-node, TypeScript, tsx
- **Monorepo**: pnpm workspaces, concurrently for dev orchestration

## Backend Service Architecture

### IMPORTANT: Creating New Kubernetes Resource Services

**DO NOT add new resource methods directly to `apps/backend/src/services/kube.ts`!**

The backend uses a **service-per-resource** architecture to keep code maintainable. Each Kubernetes resource type (Pod, Deployment, ConfigMap, etc.) has its own dedicated service class.

### Service Structure

```
apps/backend/src/services/
├── base/
│   ├── errors.ts              # Shared error types (CRDNotInstalledError)
│   └── BaseKubeService.ts     # Base class with shared functionality
├── resources/
│   ├── [Resource]Service.types.ts    # TypeScript interfaces
│   └── [Resource]Service.ts          # Service implementation
└── kube.ts                    # Main facade that delegates to services
```

### Creating a New Service

Follow these steps to add support for a new Kubernetes resource:

#### 1. Create the Types File

Create `apps/backend/src/services/resources/[Resource]Service.types.ts`:

```typescript
// ABOUTME: TypeScript interfaces for [Resource] resource operations
// ABOUTME: Defines list items, details, and watch event types

export interface [Resource]ListItem {
  name: string;
  namespace: string;  // omit for cluster-scoped resources
  // ... other fields for list view
  creationTimestamp?: string;
}

export interface [Resource]Detail extends [Resource]ListItem {
  labels: Record<string, string>;
  annotations: Record<string, string>;
  // ... other detailed fields
}

export interface [Resource]WatchEvent {
  type: string;
  object: [Resource]ListItem;
}
```

#### 2. Create the Service Implementation

Create `apps/backend/src/services/resources/[Resource]Service.ts`:

**For Standard Kubernetes Resources:**

```typescript
// ABOUTME: Service for [Resource] resource operations
// ABOUTME: Handles list, get, delete, stream, and manifest operations

import { V1[Resource] } from "@kubernetes/client-node";
import { BaseKubeService } from "../base/BaseKubeService.js";
import type {
  [Resource]Detail,
  [Resource]ListItem,
} from "./[Resource]Service.types.js";

export class [Resource]Service extends BaseKubeService {
  async list[Resources](namespace: string): Promise<[Resource]ListItem[]> {
    return this.withCredentialRetry(async () => {
      const response = await this.[apiClient].listNamespaced[Resource]({ namespace });
      return (response.items ?? []).map((item) => this.map[Resource]ListItem(item));
    });
  }

  async get[Resource](namespace: string, name: string): Promise<[Resource]Detail> {
    const resource = await this.[apiClient].readNamespaced[Resource]({ name, namespace });
    return this.map[Resource]Detail(resource);
  }

  async get[Resource]Manifest(namespace: string, name: string): Promise<string> {
    const resource = await this.[apiClient].readNamespaced[Resource]({ name, namespace });
    const manifest = this.sanitizeManifest(resource);
    return JSON.stringify(manifest, null, 2);
  }

  async delete[Resource](namespace: string, name: string): Promise<void> {
    await this.[apiClient].deleteNamespaced[Resource]({ name, namespace });
  }

  async stream[Resources](
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

    const startWatch = async (retryOnAuth: boolean = true): Promise<AbortController> => {
      try {
        return await this.watch.watch(
          `/api/v1/namespaces/${namespace}/[resources]`,
          {},
          (type, obj) => {
            try {
              onData(JSON.stringify({
                type,
                object: this.map[Resource]ListItem(obj as V1[Resource]),
              }));
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

  private map[Resource]ListItem(resource: V1[Resource]): [Resource]ListItem {
    const creationTimestamp = resource.metadata?.creationTimestamp
      ? new Date(resource.metadata.creationTimestamp).toISOString()
      : undefined;

    return {
      name: resource.metadata?.name ?? "unknown",
      namespace: resource.metadata?.namespace ?? "default",
      // ... map other fields
      creationTimestamp,
    };
  }

  private map[Resource]Detail(resource: V1[Resource]): [Resource]Detail {
    const listItem = this.map[Resource]ListItem(resource);
    return {
      ...listItem,
      labels: resource.metadata?.labels ?? {},
      annotations: resource.metadata?.annotations ?? {},
      // ... map other detailed fields
    };
  }
}
```

**For Custom Resource Definitions (CRDs):**

```typescript
import { BaseKubeService, type KubernetesListResponse } from "../base/BaseKubeService.js";
import { CRDNotInstalledError } from "../base/errors.js";

export class [Resource]Service extends BaseKubeService {
  async list[Resources](namespace: string): Promise<[Resource]ListItem[]> {
    const crdExists = await this.checkCRDExists("[resources].[group]");
    if (!crdExists) {
      throw new CRDNotInstalledError("[resources].[group]", "[Feature Name]");
    }

    return this.withCredentialRetry(async () => {
      const response = await this.customObjectsApi.listNamespacedCustomObject({
        group: "[group]",
        version: "[version]",
        namespace,
        plural: "[resources]",
      });

      const list = response as unknown as KubernetesListResponse;
      return (list.items ?? []).map((item) => this.map[Resource]ListItem(item));
    });
  }

  // ... similar methods using customObjectsApi instead

  private map[Resource]ListItem(resource: Record<string, unknown>): [Resource]ListItem {
    const metadata = resource.metadata as Record<string, unknown> | undefined;
    const spec = resource.spec as Record<string, unknown> | undefined;

    return {
      name: (metadata?.name as string) ?? "unknown",
      namespace: (metadata?.namespace as string) ?? "default",
      // ... extract fields from spec/status
    };
  }
}
```

**For Cluster-Scoped Resources:**

Omit the `namespace` parameter and use cluster-scoped API methods:
- `listClusterCustomObject` instead of `listNamespacedCustomObject`
- `readStorageClass` instead of `readNamespacedConfigMap`
- Watch path: `/apis/[group]/[version]/[resources]` instead of namespace-scoped path

#### 3. Integrate into KubeService

**a) Import the service in `apps/backend/src/services/kube.ts`:**

```typescript
import { [Resource]Service } from "./resources/[Resource]Service.js";
```

**b) Export the types:**

```typescript
export type {
  [Resource]Detail,
  [Resource]ListItem,
  [Resource]WatchEvent,
} from "./resources/[Resource]Service.types.js";
```

**c) Add as a private property:**

```typescript
export class KubeService {
  // ... other properties
  private [resource]Service: [Resource]Service;
```

**d) Initialize in constructor:**

```typescript
constructor() {
  // ... other initialization
  this.[resource]Service = new [Resource]Service(this.kubeConfig);
}
```

**e) Update credential refresh methods:**

```typescript
refreshCredentials() {
  // ... existing code
  this.[resource]Service.refreshCredentials();
}

setCurrentContext(name: string) {
  // ... existing code
  this.[resource]Service.refreshCredentials();
}
```

**f) Add delegation methods:**

```typescript
// [Resource] methods - delegated to [Resource]Service
async list[Resources](namespace: string) {
  return this.[resource]Service.list[Resources](namespace);
}

async get[Resource](namespace: string, name: string) {
  return this.[resource]Service.get[Resource](namespace, name);
}

async get[Resource]Manifest(namespace: string, name: string) {
  return this.[resource]Service.get[Resource]Manifest(namespace, name);
}

async delete[Resource](namespace: string, name: string) {
  return this.[resource]Service.delete[Resource](namespace, name);
}

async stream[Resources](
  namespace: string,
  onData: (data: string) => void,
  onError: (err: unknown) => void,
  signal?: AbortSignal,
) {
  return this.[resource]Service.stream[Resources](namespace, onData, onError, signal);
}
```

### Reference Examples

See these existing services for complete examples:

**Standard Resources:**
- `StorageClassService` - Cluster-scoped, simple resource
- `ConfigMapService` - Namespace-scoped, simple resource with data
- `SecretService` - Namespace-scoped, similar to ConfigMap

**Custom Resources:**
- `NodeClassService` - Cluster-scoped CRD (Karpenter)

### Available API Clients in BaseKubeService

All services extending `BaseKubeService` have access to:

- `this.coreApi` - CoreV1Api (Pods, ConfigMaps, Secrets, Services, etc.)
- `this.appsApi` - AppsV1Api (Deployments, StatefulSets, DaemonSets)
- `this.batchApi` - BatchV1Api (Jobs, CronJobs)
- `this.networkingApi` - NetworkingV1Api (Ingresses, NetworkPolicies)
- `this.policyApi` - PolicyV1Api (PodDisruptionBudgets)
- `this.storageApi` - StorageV1Api (StorageClasses, VolumeAttachments)
- `this.customObjectsApi` - CustomObjectsApi (all CRDs)
- `this.watch` - Watch API for streaming updates
- `this.log` - Log API for container logs
- `this.kubeConfig` - Shared KubeConfig instance

### Helper Methods Available

- `this.withCredentialRetry(fn)` - Automatically retry on 401 errors
- `this.sanitizeManifest(resource)` - Remove managedFields for clean YAML
- `this.checkCRDExists(crdName)` - Check if a CRD is installed (with caching)
- `this.refreshCredentials()` - Refresh all API clients (called by KubeService)