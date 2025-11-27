import { For, Show } from 'solid-js';
import type { JobEvent } from '../lib/api';
import { formatRelativeTime } from '../utils/datetime';

interface JobEventsPanelProps {
  events: JobEvent[];
  loading?: boolean;
}

const jobEventBadge = (type: string) => {
  switch (type.toLowerCase()) {
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

const JobEventsPanel = (props: JobEventsPanelProps) => (
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
      fallback={<p class="text-sm opacity-60">No events found for this job.</p>}
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
                    <span class={`badge badge-xs ${jobEventBadge(event.type)}`}>
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

export default JobEventsPanel;
