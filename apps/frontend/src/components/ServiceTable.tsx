// ABOUTME: Displays a table of Kubernetes services with their type, IPs, and ports
// ABOUTME: Supports selection highlighting and click handlers
import { For, Show } from 'solid-js';
import type { ServiceListItem } from '../lib/api';
import { formatRelativeTime } from '../utils/datetime';

interface ServiceTableProps {
  services: ServiceListItem[];
  selectedService?: string;
  loading?: boolean;
  onSelect?: (service: ServiceListItem) => void;
}

const typeBadgeClass = (type: string) => {
  switch (type) {
    case 'ClusterIP':
      return 'badge-primary';
    case 'NodePort':
      return 'badge-info';
    case 'LoadBalancer':
      return 'badge-success';
    case 'ExternalName':
      return 'badge-warning';
    default:
      return 'badge-ghost';
  }
};

const ServiceTable = (props: ServiceTableProps) => (
  <div class="flex flex-col gap-3">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-semibold">Services</h2>
      <Show when={props.loading}>
        <span class="loading loading-xs loading-spinner" />
      </Show>
    </div>
    <div class="overflow-x-auto rounded-lg border border-base-200/50 bg-base-200/30">
      <table class="table table-zebra table-pin-rows">
        <thead>
          <tr class="text-sm uppercase tracking-wide text-base-content/60">
            <th>Name</th>
            <th>Type</th>
            <th>Cluster IP</th>
            <th>External IP</th>
            <th>Ports</th>
            <th>Age</th>
          </tr>
        </thead>
        <tbody>
          <Show
            when={props.services.length}
            fallback={
              <tr>
                <td colSpan={6} class="text-center text-sm opacity-70">
                  No services in this namespace.
                </td>
              </tr>
            }
          >
            <For each={props.services}>
              {(service) => (
                <tr
                  class={`cursor-pointer hover:bg-base-200/50 ${props.selectedService === service.name ? 'bg-primary/20 border-l-4 border-primary' : ''}`}
                  onClick={() => props.onSelect?.(service)}
                >
                  <td class="font-mono text-sm">
                    <span class="inline-flex items-center gap-2">
                      <span class={`inline-block w-2 h-2 rounded-full ${service.ready === null ? 'bg-base-content/30' : service.ready ? 'bg-success' : 'bg-error'}`} />
                      {service.name}
                    </span>
                  </td>
                  <td>
                    <span class={`badge badge-sm ${typeBadgeClass(service.type)}`}>{service.type}</span>
                  </td>
                  <td class="text-xs opacity-80">{service.clusterIP || '-'}</td>
                  <td class="text-xs opacity-80">{service.externalIP || '-'}</td>
                  <td class="text-xs opacity-80">
                    {service.ports.map(p => `${p.port}/${p.protocol}`).join(', ')}
                  </td>
                  <td class="text-xs opacity-80">{formatRelativeTime(service.creationTimestamp)}</td>
                </tr>
              )}
            </For>
          </Show>
        </tbody>
      </table>
    </div>
  </div>
);

export default ServiceTable;
