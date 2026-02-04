// ABOUTME: Page component for viewing cluster-wide Kubernetes node events
// ABOUTME: Shows recent events from all nodes to help diagnose cluster issues

import { createEffect, createSignal, For, Show } from 'solid-js';
import { useNavigate, useParams } from '@solidjs/router';
import { contextStore } from '../stores/contextStore';
import { fetchAllNodeEvents, type ClusterNodeEvent } from '../lib/api';

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

const NodeEventsPage = () => {
  const navigate = useNavigate();
  const params = useParams<{ context: string; namespace: string }>();
  const [events, setEvents] = createSignal<ClusterNodeEvent[]>([]);
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  const loadEvents = async () => {
    setLoading(true);
    setError(null);
    try {
      const nodeEvents = await fetchAllNodeEvents();
      setEvents(nodeEvents);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load node events');
    } finally {
      setLoading(false);
    }
  };

  createEffect(() => {
    if (contextStore.activeContext()) {
      loadEvents();
    }
  });

  const handleNodeClick = (nodeName: string) => {
    navigate(`/${params.context}/${params.namespace}/nodes/${encodeURIComponent(nodeName)}`);
  };

  return (
    <main class="flex flex-1 flex-col overflow-hidden p-6">
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-2xl font-bold">Node Events</h1>
          <p class="text-sm opacity-60 mt-1">
            Recent events from all nodes in the cluster (Kubernetes retains events for ~1 hour)
          </p>
        </div>
        <div class="flex items-center gap-2">
          <Show when={loading()}>
            <span class="loading loading-spinner loading-sm" />
          </Show>
          <button
            type="button"
            class="btn btn-ghost btn-sm"
            onClick={loadEvents}
            disabled={loading()}
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      <Show when={error()}>
        <div class="alert alert-error mb-4">
          <span>{error()}</span>
        </div>
      </Show>

      <div class="flex-1 overflow-y-auto">
        <Show
          when={events().length > 0}
          fallback={
            <Show when={!loading()}>
              <div class="text-center py-12">
                <p class="text-lg opacity-60">No node events found.</p>
                <p class="text-sm opacity-40 mt-2">
                  This could mean all nodes are healthy, or events have expired.
                </p>
              </div>
            </Show>
          }
        >
          <div class="space-y-3">
            <For each={events()}>
              {(event) => (
                <div class="card bg-base-200/60 border border-base-300">
                  <div class="card-body p-4 gap-2">
                    <div class="flex items-start justify-between gap-4">
                      <div class="flex items-center gap-3 flex-wrap">
                        <span class={`badge badge-sm ${getEventTypeClass(event.type)}`}>
                          {event.type}
                        </span>
                        <button
                          type="button"
                          class="font-mono text-sm link link-primary"
                          onClick={() => handleNodeClick(event.nodeName)}
                        >
                          {event.nodeName}
                        </button>
                        <span class="font-semibold text-sm">{event.reason}</span>
                        <Show when={event.count && event.count > 1}>
                          <span class="badge badge-ghost badge-sm">×{event.count}</span>
                        </Show>
                      </div>
                      <div class="text-xs opacity-60 text-right whitespace-nowrap">
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
    </main>
  );
};

export default NodeEventsPage;
