import { For, Show } from 'solid-js';
import type { RolloutDetail } from '../lib/api';
import { formatRelativeTime } from '../utils/datetime';

interface RolloutInfoPanelProps {
  rollout?: RolloutDetail;
  loading?: boolean;
}

const describeStep = (step: Record<string, unknown>) => {
  if ('setWeight' in step) {
    const weight = step.setWeight as number | string | undefined;
    return `Set weight to ${weight ?? '?'}%`;
  }
  if ('pause' in step) {
    const pause = step.pause as Record<string, unknown> | undefined;
    if (pause?.['duration']) {
      return `Pause for ${pause['duration']}`;
    }
    if (pause?.['untilApproved']) {
      return 'Pause until approved';
    }
    return 'Pause';
  }
  if ('analysis' in step) {
    const analysis = step.analysis as Record<string, unknown> | undefined;
    const templates = analysis?.['templates'] as Array<Record<string, unknown>> | undefined;
    const templateNames = templates?.map((tpl) => tpl['templateName']).filter(Boolean) as string[] | undefined;
    const templateText = templateNames?.length ? templateNames.join(', ') : 'analysis';
    return `Run analysis${templateNames?.length ? `: ${templateText}` : ''}`;
  }
  if ('experiment' in step) {
    const experiment = step.experiment as Record<string, unknown> | undefined;
    return `Run experiment ${experiment?.['name'] ?? ''}`.trim();
  }
  if ('setCanaryScale' in step) {
    return 'Update canary scale';
  }
  return JSON.stringify(step);
};

const RolloutInfoPanel = (props: RolloutInfoPanelProps) => (
  <Show
    when={props.rollout}
    fallback={
      props.loading ? (
        <div class="flex h-48 items-center justify-center">
          <span class="loading loading-dots" />
        </div>
      ) : (
        <p class="text-sm opacity-60">Select a rollout to inspect its metadata.</p>
      )
    }
  >
    {(rollout) => (
      <div class="flex flex-col gap-6">
        <div class="grid gap-3 lg:grid-cols-2">
          <div class="card bg-base-200/60">
            <div class="card-body gap-3 text-sm">
              <h3 class="text-xs uppercase tracking-wide opacity-80">Metadata</h3>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Namespace</span>
                <span class="font-mono text-xs">{rollout().namespace}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Strategy</span>
                <span class="badge badge-outline badge-sm uppercase">{rollout().strategy}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Phase</span>
                <span class="font-semibold">{rollout().phase ?? 'Unknown'}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Current Step</span>
                <span class="font-semibold">{rollout().currentStepIndex ?? '—'}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Age</span>
                <span>{formatRelativeTime(rollout().creationTimestamp)}</span>
              </div>
            </div>
          </div>
          <div class="card bg-base-200/60">
            <div class="card-body gap-3 text-sm">
              <h3 class="text-xs uppercase tracking-wide opacity-80">Replicas</h3>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Desired</span>
                <span class="font-semibold">{rollout().replicas}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Ready</span>
                <span class="font-semibold">{rollout().readyReplicas}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Updated</span>
                <span class="font-semibold">{rollout().updatedReplicas}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Available</span>
                <span class="font-semibold">{rollout().availableReplicas}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="grid gap-3 lg:grid-cols-2">
          <div class="card bg-base-200/60">
            <div class="card-body gap-3 text-sm">
              <h3 class="text-xs uppercase tracking-wide opacity-80">Services</h3>
              <Show
                when={rollout().services.stableService || rollout().services.canaryService}
                fallback={<p class="text-sm opacity-60">No services associated with this rollout.</p>}
              >
                <div class="flex flex-col gap-2">
                  <Show when={rollout().services.stableService}>
                    <div class="flex items-center justify-between gap-3">
                      <span class="opacity-70">Stable</span>
                      <span class="font-mono text-xs">{rollout().services.stableService}</span>
                    </div>
                  </Show>
                  <Show when={rollout().services.canaryService}>
                    <div class="flex items-center justify-between gap-3">
                      <span class="opacity-70">Canary</span>
                      <span class="font-mono text-xs">{rollout().services.canaryService}</span>
                    </div>
                  </Show>
                </div>
              </Show>
            </div>
          </div>
          <div class="card bg-base-200/60">
            <div class="card-body gap-3 text-sm">
              <h3 class="text-xs uppercase tracking-wide opacity-80">Selector</h3>
              <Show when={Object.keys(rollout().selector).length} fallback={<p class="text-sm opacity-60">No selectors defined.</p>}>
                <div class="flex flex-wrap gap-2">
                  <For each={Object.entries(rollout().selector)}>
                    {([key, value]) => (
                      <span class="badge badge-outline badge-sm font-mono">{key}={value}</span>
                    )}
                  </For>
                </div>
              </Show>
            </div>
          </div>
        </div>

        <div class="grid gap-3 lg:grid-cols-2">
          <div class="card bg-base-200/60">
            <div class="card-body gap-3">
              <h3 class="text-xs uppercase tracking-wide opacity-80">Template Labels</h3>
              <Show when={Object.keys(rollout().templateLabels).length} fallback={<p class="text-sm opacity-60">No template labels defined.</p>}>
                <div class="flex flex-wrap gap-2">
                  <For each={Object.entries(rollout().templateLabels)}>
                    {([key, value]) => (
                      <span class="badge badge-outline badge-sm font-mono">{key}={value}</span>
                    )}
                  </For>
                </div>
              </Show>
            </div>
          </div>
          <div class="card bg-base-200/60">
            <div class="card-body gap-3">
              <h3 class="text-xs uppercase tracking-wide opacity-80">Template Annotations</h3>
              <Show when={Object.keys(rollout().templateAnnotations).length} fallback={<p class="text-sm opacity-60">No template annotations set.</p>}>
                <div class="flex flex-col gap-2">
                  <For each={Object.entries(rollout().templateAnnotations)}>
                    {([key, value]) => (
                      <div class="rounded-lg bg-base-300/40 p-3 text-xs">
                        <div class="font-mono text-[0.7rem] uppercase tracking-wide opacity-70">{key}</div>
                        <div class="font-mono break-words text-xs">{value}</div>
                      </div>
                    )}
                  </For>
                </div>
              </Show>
            </div>
          </div>
        </div>

        <div class="card bg-base-200/60">
          <div class="card-body gap-3">
            <h3 class="text-xs uppercase tracking-wide opacity-80">Steps</h3>
            <Show when={rollout().steps.length} fallback={<p class="text-sm opacity-60">No steps defined for this rollout.</p>}>
              <ol class="flex flex-col gap-2">
                <For each={rollout().steps}>
                  {(step, index) => (
                    <li class="rounded-lg bg-base-300/40 p-3 text-sm">
                      <div class="flex items-center justify-between gap-3">
                        <span class="font-semibold">Step {index() + 1}</span>
                        <span class="text-xs opacity-70 font-mono">{describeStep(step)}</span>
                      </div>
                    </li>
                  )}
                </For>
              </ol>
            </Show>
          </div>
        </div>

        <div class="card bg-base-200/60">
          <div class="card-body gap-3">
            <h3 class="text-xs uppercase tracking-wide opacity-80">Conditions</h3>
            <Show when={rollout().conditions.length} fallback={<p class="text-sm opacity-60">No conditions available.</p>}>
              <div class="overflow-x-auto">
                <table class="table table-sm">
                  <thead>
                    <tr class="text-xs uppercase tracking-wide opacity-70">
                      <th>Type</th>
                      <th>Status</th>
                      <th>Reason</th>
                      <th>Message</th>
                      <th>Last Update</th>
                    </tr>
                  </thead>
                  <tbody>
                    <For each={rollout().conditions}>
                      {(condition) => (
                        <tr>
                          <td class="font-mono text-xs">{condition.type}</td>
                          <td>
                            <span class={`badge badge-xs ${condition.status === 'True' ? 'badge-success' : 'badge-secondary'}`}>
                              {condition.status}
                            </span>
                          </td>
                          <td class="text-xs">{condition.reason ?? '—'}</td>
                          <td class="text-xs opacity-80">{condition.message ?? '—'}</td>
                          <td class="text-xs opacity-70">
                            {formatRelativeTime(condition.lastUpdateTime ?? condition.lastTransitionTime)}
                          </td>
                        </tr>
                      )}
                    </For>
                  </tbody>
                </table>
              </div>
            </Show>
          </div>
        </div>
      </div>
    )}
  </Show>
);

export default RolloutInfoPanel;
