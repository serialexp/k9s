// ABOUTME: TypeScript interfaces for Istio Gateway resource operations
// ABOUTME: Defines list items, details, and watch event types

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
	type: string;
	object: GatewayListItem;
}
