// ABOUTME: TypeScript interfaces for pod exec operations
// ABOUTME: Defines request parameters and response types for command execution

export interface ExecRequest {
  namespace: string;
  pod: string;
  container: string;
  command: string[];
}

export interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
}
