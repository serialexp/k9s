// ABOUTME: Service for executing commands in Kubernetes pod containers
// ABOUTME: Wraps the K8s Exec API to run commands and collect output

import { Writable } from "node:stream";
import { Exec, KubeConfig, V1Status } from "@kubernetes/client-node";
import type { ExecRequest, ExecResult } from "./ExecService.types.js";

export class ExecService {
  private kubeConfig: KubeConfig;
  private exec: Exec;

  constructor(kubeConfig: KubeConfig) {
    this.kubeConfig = kubeConfig;
    this.exec = new Exec(this.kubeConfig);
  }

  refreshCredentials() {
    this.exec = new Exec(this.kubeConfig);
  }

  async execInPod(request: ExecRequest): Promise<ExecResult> {
    const { namespace, pod, container, command } = request;

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
