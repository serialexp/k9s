// ABOUTME: TypeScript interfaces for port forwarding operations
// ABOUTME: Defines request, active forward, and status types

export interface PortForwardRequest {
	namespace: string;
	pod: string;
	localPort: number;
	targetPort: number;
}

export interface ActivePortForward {
	id: string;
	namespace: string;
	pod: string;
	localPort: number;
	targetPort: number;
	startedAt: string;
	connectionCount: number;
}
