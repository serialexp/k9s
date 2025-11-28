// ABOUTME: Events panel component displaying Kubernetes node events
// ABOUTME: Shows warnings, errors and normal events with timestamps

import { Show, For } from 'solid-js';
import type { NodeEvent } from '../lib/api';

interface NodeEventsPanelProps {
  events?: NodeEvent[];
  loading?: boolean;
}

const formatTime = (timestamp?: string) => {
  if (!timestamp) return '—';
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'just now';
};

const getEventTypeClass = (type: string) => {
  switch (type.toLowerCase()) {
    case 'warning':
      return 'badge-warning';
    case 'error':
      return 'badge-error';
    default:
      return 'badge-info';
  }
};

const NodeEventsPanel = (props: NodeEventsPanelProps) => (
  <div class="flex flex-col gap-4">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-semibold">Node Events</h2>
      <Show when={props.loading}>
        <span class="loading loading-xs loading-spinner" />
      </Show>
    </div>
    <Show
      when={props.events && props.events.length > 0}
      fallback={
        <Show when={!props.loading}>
          <p class="text-sm opacity-60">No events found for this node.</p>
        </Show>
      }
    >
      <div class="space-y-3">
        <For each={props.events}>
          {(event) => (
            <div class="card bg-base-200/60 border border-base-300">
              <div class="card-body p-4 gap-2">
                <div class="flex items-start justify-between gap-4">
                  <div class="flex items-center gap-3">
                    <span class={`badge badge-sm ${getEventTypeClass(event.type)}`}>
                      {event.type}
                    </span>
                    <span class="font-semibold text-sm">{event.reason}</span>
                    <Show when={event.count && event.count > 1}>
                      <span class="badge badge-ghost badge-sm">×{event.count}</span>
                    </Show>
                  </div>
                  <div class="text-xs opacity-60 text-right">
                    <div>{formatTime(event.lastTimestamp || event.firstTimestamp)}</div>
                    <Show when={event.source}>
                      <div class="font-mono">{event.source}</div>
                    </Show>
                  </div>
                </div>
                <div class="text-sm opacity-80 mt-1">
                  {event.message}
                </div>
              </div>
            </div>
          )}
        </For>
      </div>
    </Show>
  </div>
);

export default NodeEventsPanel;
