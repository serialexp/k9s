// ABOUTME: TypeScript interfaces for node exec operations
// ABOUTME: Defines types for debug pod sessions and command execution on nodes

export interface DebugSession {
  id: string;
  nodeName: string;
  podName: string;
  namespace: string;
  createdAt: string;
  status: "creating" | "ready" | "error" | "terminated";
}

export interface NodeExecResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
}
