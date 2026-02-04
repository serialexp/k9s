// ABOUTME: Displays a table of Kubernetes PodDisruptionBudget events
// ABOUTME: Shows event type, reason, message, count, and age
import { For, Show } from 'solid-js';
import type { PdbEvent } from '../lib/api';
import { formatRelativeTime } from '../utils/datetime';

interface PdbEventsPanelProps {
  events: PdbEvent[];
  loading?: boolean;
}

const getEventBadgeClass = (eventType: string) => {
  switch (eventType.toLowerCase()) {
    case 'normal':
      return 'badge-info';
    case 'warning':
      return 'badge-warning';
    case 'error':
      return 'badge-error';
    default:
      return 'badge-ghost';
  }
};

const PdbEventsPanel = (props: PdbEventsPanelProps) => (
  <Show
    when={!props.loading}
    fallback={
      <div class="flex h-48 items-center justify-center">
        <span class="loading loading-dots" />
      </div>
    }
  >
    <Show
      when={props.events.length}
      fallback={<p class="text-sm opacity-60">No events found for this PodDisruptionBudget.</p>}
    >
      <div class="overflow-x-auto">
        <table class="table table-sm">
          <thead>
            <tr class="text-xs uppercase tracking-wide opacity-70">
              <th>Type</th>
              <th>Reason</th>
              <th>Message</th>
              <th>Count</th>
              <th>Age</th>
            </tr>
          </thead>
          <tbody>
            <For each={props.events}>
              {(event) => (
                <tr>
                  <td>
                    <span class={`badge badge-xs ${getEventBadgeClass(event.type)}`}>
                      {event.type}
                    </span>
                  </td>
                  <td class="font-mono text-xs">{event.reason}</td>
                  <td class="text-xs">{event.message}</td>
                  <td class="text-xs">{event.count ?? 1}</td>
                  <td class="text-xs opacity-70">
                    {formatRelativeTime(event.lastTimestamp ?? event.firstTimestamp)}
                  </td>
                </tr>
              )}
            </For>
          </tbody>
        </table>
      </div>
    </Show>
  </Show>
);

export default PdbEventsPanel;
