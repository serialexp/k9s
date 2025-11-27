import { For, Show } from 'solid-js';
import type { CustomResourceDefinitionDetail } from '../lib/api';
import { formatRelativeTime } from '../utils/datetime';

interface CustomResourceDefinitionInfoPanelProps {
  crd?: CustomResourceDefinitionDetail;
  loading?: boolean;
}

const CustomResourceDefinitionInfoPanel = (props: CustomResourceDefinitionInfoPanelProps) => (
  <Show
    when={props.crd}
    fallback={
      props.loading ? (
        <div class="flex h-48 items-center justify-center">
          <span class="loading loading-dots" />
        </div>
      ) : (
        <p class="text-sm opacity-60">Select a CRD to inspect its details.</p>
      )
    }
  >
    {(crd) => (
      <div class="flex flex-col gap-6">
        <div class="grid gap-3 lg:grid-cols-2">
          <div class="card bg-base-200/60">
            <div class="card-body gap-3 text-sm">
              <h3 class="text-xs uppercase tracking-wide opacity-80">Metadata</h3>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Group</span>
                <span class="font-mono text-xs">{crd().group}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Version</span>
                <span class="font-mono text-xs">{crd().version}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Kind</span>
                <span class="font-mono text-xs">{crd().kind}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Scope</span>
                <span class="font-mono text-xs uppercase">{crd().scope}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Age</span>
                <span>{formatRelativeTime(crd().creationTimestamp)}</span>
              </div>
            </div>
          </div>
          <div class="card bg-base-200/60">
            <div class="card-body gap-3 text-sm">
              <h3 class="text-xs uppercase tracking-wide opacity-80">Status</h3>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Established</span>
                <span class="font-semibold">{crd().established ? 'Yes' : 'No'}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Names Accepted</span>
                <span class="font-semibold">{crd().namesAccepted ? 'Yes' : 'No'}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Terminating</span>
                <span class="font-semibold">{crd().terminating ? 'Yes' : 'No'}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="card bg-base-200/60">
          <div class="card-body gap-3">
            <h3 class="text-xs uppercase tracking-wide opacity-80">Names</h3>
            <div class="flex flex-wrap gap-2 text-xs">
              <Show when={crd().shortNames.length}>
                <div>
                  <span class="opacity-70">Short Names:</span>
                  <span class="ml-1 font-mono">{crd().shortNames.join(', ')}</span>
                </div>
              </Show>
              <Show when={crd().categories.length}>
                <div>
                  <span class="opacity-70">Categories:</span>
                  <span class="ml-1 font-mono">{crd().categories.join(', ')}</span>
                </div>
              </Show>
            </div>
          </div>
        </div>

        <div class="card bg-base-200/60">
          <div class="card-body gap-3">
            <h3 class="text-xs uppercase tracking-wide opacity-80">Conditions</h3>
            <Show when={crd().conditions.length} fallback={<p class="text-sm opacity-60">No conditions reported.</p>}>
              <div class="overflow-x-auto">
                <table class="table table-sm">
                  <thead>
                    <tr class="text-xs uppercase tracking-wide opacity-70">
                      <th>Type</th>
                      <th>Status</th>
                      <th>Reason</th>
                      <th>Message</th>
                      <th>Last Transition</th>
                    </tr>
                  </thead>
                  <tbody>
                    <For each={crd().conditions}>
                      {(condition) => (
                        <tr>
                          <td class="font-mono text-xs">{condition.type}</td>
                          <td class="text-xs">{condition.status}</td>
                          <td class="text-xs">{condition.reason ?? '—'}</td>
                          <td class="text-xs opacity-80">{condition.message ?? '—'}</td>
                          <td class="text-xs opacity-70">{formatRelativeTime(condition.lastTransitionTime)}</td>
                        </tr>
                      )}
                    </For>
                  </tbody>
                </table>
              </div>
            </Show>
          </div>
        </div>

        <div class="card bg-base-200/60">
          <div class="card-body gap-3">
            <h3 class="text-xs uppercase tracking-wide opacity-80">Accepted Names</h3>
            <pre class="overflow-auto rounded-lg bg-base-300/40 p-3 text-xs">
              {JSON.stringify(crd().acceptedNames, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    )}
  </Show>
);

export default CustomResourceDefinitionInfoPanel;
