import { For, Show } from 'solid-js';
import type { PodDetail, PodEvent } from '../lib/api';
import { formatRelativeTime } from '../utils/datetime';

interface PodInfoPanelProps {
  pod?: PodDetail;
  events?: PodEvent[];
  loading?: boolean;
}

const getExitCodeExplanation = (exitCode: number): string | null => {
  if (exitCode === 0) return 'Success';
  if (exitCode === 1) return 'General error';
  if (exitCode === 126) return 'Command cannot execute';
  if (exitCode === 127) return 'Command not found';

  if (exitCode > 128 && exitCode <= 255) {
    const signal = exitCode - 128;
    const signalNames: Record<number, string> = {
      1: 'SIGHUP (hangup)',
      2: 'SIGINT (interrupt, Ctrl+C)',
      3: 'SIGQUIT (quit)',
      6: 'SIGABRT (abort)',
      9: 'SIGKILL (killed)',
      11: 'SIGSEGV (segmentation fault)',
      13: 'SIGPIPE (broken pipe)',
      15: 'SIGTERM (termination request)',
    };

    const signalName = signalNames[signal] || `signal ${signal}`;
    return `Process terminated by ${signalName}`;
  }

  return null;
};

const hasProbeFailureNearTermination = (
  events: PodEvent[] | undefined,
  finishedAt: string | undefined
): PodEvent | null => {
  if (!events || !finishedAt) return null;

  const terminationTime = new Date(finishedAt).getTime();
  const fiveMinutesMs = 5 * 60 * 1000;

  const probeFailures = events.filter((e) =>
    e.reason === 'Unhealthy' &&
    (e.message?.includes('probe failed') || e.message?.includes('Liveness') || e.message?.includes('Readiness'))
  );

  for (const event of probeFailures) {
    const eventTime = event.lastTimestamp ? new Date(event.lastTimestamp).getTime() : null;
    if (eventTime && Math.abs(eventTime - terminationTime) < fiveMinutesMs) {
      return event;
    }
  }

  return null;
};

const getTerminationExplanation = (
  exitCode: number | undefined,
  finishedAt: string | undefined,
  events: PodEvent[] | undefined
): string | null => {
  if (exitCode === undefined) return null;

  // For SIGKILL (137), check if there's a probe failure that likely caused it
  if (exitCode === 137) {
    const probeEvent = hasProbeFailureNearTermination(events, finishedAt);
    if (probeEvent) {
      const probeType = probeEvent.message?.includes('Liveness') ? 'liveness' :
                        probeEvent.message?.includes('Readiness') ? 'readiness' : '';
      return `Likely killed due to failed ${probeType} probe`.trim();
    }
    return 'Process killed by SIGKILL (OOM or system termination)';
  }

  return getExitCodeExplanation(exitCode);
};

const PodInfoPanel = (props: PodInfoPanelProps) => (
  <Show
    when={props.pod}
    fallback={
      props.loading ? (
        <div class="flex h-48 items-center justify-center">
          <span class="loading loading-dots" />
        </div>
      ) : (
        <p class="text-sm opacity-60">Select a pod to inspect its metadata.</p>
      )
    }
  >
    {(pod) => {
      const terminatedContainers = pod().containersStatus.filter(
        (c) => c.lastState?.terminated
      );
      const successTerminations = terminatedContainers.filter((c) => {
        const terminated = c.lastState?.terminated as Record<string, unknown> | undefined;
        return terminated?.exitCode === 0;
      });
      const errorTerminations = terminatedContainers.filter((c) => {
        const terminated = c.lastState?.terminated as Record<string, unknown> | undefined;
        return terminated?.exitCode !== 0;
      });

      const renderTerminatedAlert = (containers: typeof terminatedContainers, isError: boolean) => (
        <div class={`alert ${isError ? 'alert-error' : 'alert-info'} shadow-lg`}>
          <Show
            when={isError}
            fallback={
              <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </Show>
          <div class="flex flex-col gap-2 w-full">
            <span class="font-semibold">Container{containers.length > 1 ? 's' : ''} terminated</span>
            <For each={containers}>
              {(container) => {
                const terminated = container.lastState?.terminated as Record<string, unknown> | undefined;
                const reason = terminated?.reason as string | undefined;
                const exitCode = terminated?.exitCode as number | undefined;
                const finishedAt = terminated?.finishedAt as string | undefined;

                const explanation = getTerminationExplanation(exitCode, finishedAt, props.events);

                return (
                  <div class="text-sm opacity-90 flex flex-col gap-1">
                    <div>
                      <span class="font-mono font-semibold">{container.name}</span>
                      {' '}
                      <span class="badge badge-sm badge-outline">{reason ?? 'Unknown'}</span>
                      {exitCode !== undefined && (
                        <span class="ml-2">Exit code: {exitCode}</span>
                      )}
                      {finishedAt && (
                        <span class="ml-2 opacity-70">
                          ({formatRelativeTime(finishedAt)})
                        </span>
                      )}
                    </div>
                    {explanation && (
                      <div class="text-xs opacity-75 ml-1">
                        {explanation}
                      </div>
                    )}
                  </div>
                );
              }}
            </For>
          </div>
        </div>
      );

      return (
        <div class="flex flex-col gap-6">
          <Show when={errorTerminations.length > 0}>
            {renderTerminatedAlert(errorTerminations, true)}
          </Show>
          <Show when={successTerminations.length > 0}>
            {renderTerminatedAlert(successTerminations, false)}
          </Show>
          <div class="grid gap-3 lg:grid-cols-2">
          <div class="card bg-base-200/60">
            <div class="card-body gap-3 text-sm">
              <h3 class="text-xs uppercase tracking-wide opacity-80">Metadata</h3>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Namespace</span>
                <span class="font-mono text-xs">{pod().namespace}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Phase</span>
                <span class="badge badge-outline badge-sm uppercase">{pod().phase ?? 'Unknown'}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Node</span>
                <span class="font-mono text-xs">{pod().nodeName ?? '—'}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Age</span>
                <span>{formatRelativeTime(pod().creationTimestamp)}</span>
              </div>
            </div>
          </div>
          <div class="card bg-base-200/60">
            <div class="card-body gap-3 text-sm">
              <h3 class="text-xs uppercase tracking-wide opacity-80">Status</h3>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Restarts</span>
                <span class="font-semibold">{pod().restarts}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Containers</span>
                <span>{pod().containers.length}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="card bg-base-200/60">
          <div class="card-body gap-3">
            <h3 class="text-xs uppercase tracking-wide opacity-80">Labels</h3>
            <Show when={Object.keys(pod().labels).length} fallback={<p class="text-sm opacity-60">No labels applied.</p>}>
              <div class="flex flex-wrap gap-2">
                <For each={Object.entries(pod().labels)}>
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
            <h3 class="text-xs uppercase tracking-wide opacity-80">Annotations</h3>
            <Show when={Object.keys(pod().annotations).length} fallback={<p class="text-sm opacity-60">No annotations set.</p>}>
              <div class="flex flex-col gap-2">
                <For each={Object.entries(pod().annotations)}>
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

        <div class="card bg-base-200/60">
          <div class="card-body gap-3">
            <h3 class="text-xs uppercase tracking-wide opacity-80">Containers</h3>
            <div class="overflow-x-auto">
              <table class="table table-sm">
                <thead>
                  <tr class="text-xs uppercase tracking-wide opacity-70">
                    <th>Name</th>
                    <th>Ready</th>
                    <th>Restarts</th>
                    <th>Image</th>
                    <th>State</th>
                  </tr>
                </thead>
                <tbody>
                  <For each={pod().containersStatus}>
                    {(container) => (
                      <tr>
                        <td class="font-mono text-xs">{container.name}</td>
                        <td>
                          <span class={`badge badge-xs ${container.ready ? 'badge-success' : 'badge-secondary'}`}>
                            {container.ready ? 'Yes' : 'No'}
                          </span>
                        </td>
                        <td class="text-xs">{container.restartCount}</td>
                        <td class="text-xs opacity-80">{container.image}</td>
                        <td class="text-xs opacity-70">
                          {container.state ? Object.keys(container.state).join(', ') : '—'}
                        </td>
                      </tr>
                    )}
                  </For>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      );
    }}
  </Show>
);

export default PodInfoPanel;
