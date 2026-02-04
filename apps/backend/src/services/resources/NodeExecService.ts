// ABOUTME: Service for executing commands on Kubernetes nodes via debug pods
// ABOUTME: Creates privileged pods that use nsenter to run commands on the host

import { Writable } from "node:stream";
import { Exec, KubeConfig, V1Pod, V1Status } from "@kubernetes/client-node";
import { BaseKubeService } from "../base/BaseKubeService.js";
import type { DebugSession, NodeExecResult } from "./NodeExecService.types.js";

const DEBUG_NAMESPACE = "default";
const DEBUG_IMAGE = "busybox:1.36";
const POD_READY_TIMEOUT_MS = 60000;
const POD_READY_POLL_INTERVAL_MS = 1000;

export class NodeExecService extends BaseKubeService {
  private exec: Exec;
  private sessions: Map<string, DebugSession> = new Map();
  private idCounter = 0;

  constructor(kubeConfig: KubeConfig) {
    super(kubeConfig);
    this.exec = new Exec(this.kubeConfig);
  }

  refreshCredentials() {
    super.refreshCredentials();
    this.exec = new Exec(this.kubeConfig);
  }

  async createDebugSession(nodeName: string): Promise<DebugSession> {
    const id = `node-debug-${++this.idCounter}`;
    const podName = `k9s-debug-${nodeName}-${Date.now()}`;

    console.log(`[NodeExec] Creating debug session for node ${nodeName}`);
    console.log(`[NodeExec] Current context: ${this.kubeConfig.getCurrentContext()}`);
    console.log(`[NodeExec] Current cluster: ${this.kubeConfig.getCurrentCluster()?.server}`);

    const session: DebugSession = {
      id,
      nodeName,
      podName,
      namespace: DEBUG_NAMESPACE,
      createdAt: new Date().toISOString(),
      status: "creating",
    };
    this.sessions.set(id, session);

    try {
      const pod: V1Pod = {
        apiVersion: "v1",
        kind: "Pod",
        metadata: {
          name: podName,
          namespace: DEBUG_NAMESPACE,
          labels: {
            "app.kubernetes.io/name": "k9s-debug",
            "app.kubernetes.io/managed-by": "k9s-dashboard",
          },
        },
        spec: {
          nodeName,
          hostPID: true,
          hostNetwork: true,
          restartPolicy: "Never",
          containers: [
            {
              name: "debug",
              image: DEBUG_IMAGE,
              command: ["sleep", "3600"],
              securityContext: {
                privileged: true,
              },
              volumeMounts: [
                {
                  name: "host-root",
                  mountPath: "/host",
                },
              ],
            },
          ],
          volumes: [
            {
              name: "host-root",
              hostPath: {
                path: "/",
              },
            },
          ],
          tolerations: [
            {
              operator: "Exists",
            },
          ],
        },
      };

      await this.withCredentialRetry(async () => {
        await this.coreApi.createNamespacedPod({
          namespace: DEBUG_NAMESPACE,
          body: pod,
        });
      });

      await this.waitForPodReady(DEBUG_NAMESPACE, podName);

      session.status = "ready";
      this.sessions.set(id, session);

      console.log(`[NodeExec ${id}] Debug session ready on node ${nodeName}`);
      return session;
    } catch (error) {
      session.status = "error";
      this.sessions.set(id, session);
      await this.cleanupPod(DEBUG_NAMESPACE, podName);
      throw error;
    }
  }

  async execOnNode(sessionId: string, command: string[]): Promise<NodeExecResult> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Debug session ${sessionId} not found`);
    }
    if (session.status !== "ready") {
      throw new Error(`Debug session ${sessionId} is not ready (status: ${session.status})`);
    }

    const nsenterCommand = [
      "nsenter",
      "--target", "1",
      "--mount", "--uts", "--ipc", "--net", "--pid",
      "--",
      ...command,
    ];

    return this.execInPod(session.namespace, session.podName, "debug", nsenterCommand);
  }

  async deleteDebugSession(sessionId: string): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    await this.cleanupPod(session.namespace, session.podName);
    session.status = "terminated";
    this.sessions.delete(sessionId);

    console.log(`[NodeExec ${sessionId}] Debug session terminated`);
    return true;
  }

  getSession(sessionId: string): DebugSession | undefined {
    return this.sessions.get(sessionId);
  }

  listSessions(): DebugSession[] {
    return Array.from(this.sessions.values());
  }

  async cleanupAllSessions(): Promise<void> {
    for (const sessionId of this.sessions.keys()) {
      await this.deleteDebugSession(sessionId);
    }
  }

  private async waitForPodReady(namespace: string, podName: string): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < POD_READY_TIMEOUT_MS) {
      const pod = await this.withCredentialRetry(() =>
        this.coreApi.readNamespacedPod({ name: podName, namespace })
      );
      const phase = pod.status?.phase;
      const containerStatuses = pod.status?.containerStatuses ?? [];

      if (phase === "Running" && containerStatuses.length > 0) {
        const allReady = containerStatuses.every((cs) => cs.ready);
        if (allReady) {
          return;
        }
      }

      if (phase === "Failed" || phase === "Succeeded") {
        throw new Error(`Debug pod entered terminal phase: ${phase}`);
      }

      await new Promise((resolve) => setTimeout(resolve, POD_READY_POLL_INTERVAL_MS));
    }

    throw new Error(`Debug pod did not become ready within ${POD_READY_TIMEOUT_MS}ms`);
  }

  private async cleanupPod(namespace: string, podName: string): Promise<void> {
    try {
      await this.withCredentialRetry(() =>
        this.coreApi.deleteNamespacedPod({
          name: podName,
          namespace,
          gracePeriodSeconds: 0,
        })
      );
    } catch (error) {
      const err = error as { statusCode?: number; code?: number };
      if (err.statusCode !== 404 && err.code !== 404) {
        console.error(`[NodeExec] Failed to cleanup pod ${podName}:`, error);
      }
    }
  }

  private async execInPod(
    namespace: string,
    pod: string,
    container: string,
    command: string[]
  ): Promise<NodeExecResult> {
    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];

    const stdoutStream = new Writable({
      write(chunk, _encoding, callback) {
        stdoutChunks.push(Buffer.from(chunk));
        callback();
      },
    });

    const stderrStream = new Writable({
      write(chunk, _encoding, callback) {
        stderrChunks.push(Buffer.from(chunk));
        callback();
      },
    });

    return new Promise((resolve, reject) => {
      let exitCode: number | null = null;

      const statusCallback = (status: V1Status) => {
        if (status.status === "Success") {
          exitCode = 0;
        } else if (status.details?.causes) {
          const exitCause = status.details.causes.find(
            (c) => c.reason === "ExitCode"
          );
          if (exitCause?.message) {
            exitCode = parseInt(exitCause.message, 10);
          }
        }
      };

      this.exec
        .exec(
          namespace,
          pod,
          container,
          command,
          stdoutStream,
          stderrStream,
          null,
          false,
          statusCallback
        )
        .then((ws) => {
          ws.on("close", () => {
            resolve({
              stdout: Buffer.concat(stdoutChunks).toString("utf-8"),
              stderr: Buffer.concat(stderrChunks).toString("utf-8"),
              exitCode,
            });
          });

          ws.on("error", (err: Error) => {
            reject(err);
          });
        })
        .catch((err) => {
          reject(err);
        });
    });
  }
}
