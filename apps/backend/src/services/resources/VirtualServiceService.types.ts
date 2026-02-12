// ABOUTME: TypeScript interfaces for Istio VirtualService resource operations
// ABOUTME: Defines list items, details, and watch event types

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
	type: string;
	object: VirtualServiceListItem;
}
