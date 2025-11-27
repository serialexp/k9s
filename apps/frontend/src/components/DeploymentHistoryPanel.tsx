import { For, Show } from 'solid-js';
import type { DeploymentRevision } from '../lib/api';
import { formatRelativeTime } from '../utils/datetime';

interface DeploymentHistoryPanelProps {
  revisions: DeploymentRevision[];
  loading?: boolean;
  onRollback?: (revision: number) => void;
}

const DeploymentHistoryPanel = (props: DeploymentHistoryPanelProps) => (
  <Show
    when={!props.loading}
    fallback={
      <div class="flex h-48 items-center justify-center">
        <span class="loading loading-dots" />
      </div>
    }
  >
    <Show
      when={props.revisions.length}
      fallback={<p class="text-sm opacity-60">No revision history available for this deployment.</p>}
    >
      <div class="overflow-x-auto">
        <table class="table table-sm">
          <thead>
            <tr class="text-xs uppercase tracking-wide opacity-70">
              <th>Revision</th>
              <th>Change Cause</th>
              <th>Age</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <For each={props.revisions}>
              {(revision) => (
                <tr>
                  <td class="font-mono text-sm">#{revision.revision}</td>
                  <td class="text-xs">{revision.changeReason ?? '—'}</td>
                  <td class="text-xs opacity-70">
                    {formatRelativeTime(revision.creationTimestamp)}
                  </td>
                  <td>
                    <Show when={props.onRollback}>
                      <button
                        type="button"
                        class="btn btn-xs btn-ghost"
                        onClick={() => props.onRollback!(revision.revision)}
                      >
                        Rollback
                      </button>
                    </Show>
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

export default DeploymentHistoryPanel;
