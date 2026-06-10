// ABOUTME: Renders pod environment variables from the spec as a copyable key=value list
// ABOUTME: Parses the already-loaded pod manifest JSON; does not resolve secret/configMap values

import { createMemo, createSignal, Show } from 'solid-js';
import { parse as parseYaml } from 'yaml';

interface PodEnvPanelProps {
  manifest: string | undefined;
  loading?: boolean;
}

interface EnvVar {
  name?: string;
  value?: string;
  valueFrom?: {
    secretKeyRef?: { name?: string; key?: string };
    configMapKeyRef?: { name?: string; key?: string };
    fieldRef?: { fieldPath?: string };
    resourceFieldRef?: { resource?: string; containerName?: string };
  };
}

interface EnvFromSource {
  prefix?: string;
  secretRef?: { name?: string };
  configMapRef?: { name?: string };
}

interface Container {
  name?: string;
  env?: EnvVar[];
  envFrom?: EnvFromSource[];
}

function formatEnvVar(env: EnvVar): string {
  const name = env.name ?? '';
  if (env.value !== undefined) {
    return `${name}=${env.value}`;
  }
  const vf = env.valueFrom;
  if (vf?.secretKeyRef) {
    return `# ${name} <- secret ${vf.secretKeyRef.name ?? '?'}/${vf.secretKeyRef.key ?? '?'}`;
  }
  if (vf?.configMapKeyRef) {
    return `# ${name} <- configMap ${vf.configMapKeyRef.name ?? '?'}/${vf.configMapKeyRef.key ?? '?'}`;
  }
  if (vf?.fieldRef) {
    return `# ${name} <- field ${vf.fieldRef.fieldPath ?? '?'}`;
  }
  if (vf?.resourceFieldRef) {
    return `# ${name} <- resource ${vf.resourceFieldRef.resource ?? '?'}`;
  }
  // valueFrom present but unrecognized shape, or nothing at all.
  return `${name}=`;
}

function formatEnvFrom(src: EnvFromSource): string {
  const kind = src.secretRef ? 'secret' : src.configMapRef ? 'configMap' : 'unknown';
  const refName = src.secretRef?.name ?? src.configMapRef?.name ?? '?';
  const prefix = src.prefix ? ` (prefix: ${src.prefix})` : '';
  return `# envFrom ${kind} ${refName}${prefix}`;
}

const PodEnvPanel = (props: PodEnvPanelProps) => {
  const [copied, setCopied] = createSignal(false);

  const parsed = createMemo<{ text: string; error: string | null }>(() => {
    const raw = props.manifest;
    if (!raw) return { text: '', error: null };

    let pod: { spec?: { containers?: Container[]; initContainers?: Container[] } };
    try {
      pod = parseYaml(raw);
    } catch {
      return { text: '', error: 'Could not parse pod manifest.' };
    }

    const spec = pod.spec ?? {};
    const groups: Container[] = [
      ...(spec.initContainers ?? []).map((c) => ({ ...c, name: `${c.name ?? 'unknown'} (init)` })),
      ...(spec.containers ?? []),
    ];
    const multi = groups.length > 1;

    const blocks: string[] = [];
    for (const container of groups) {
      const lines: string[] = [];
      if (multi) lines.push(`# container: ${container.name ?? 'unknown'}`);
      for (const e of container.envFrom ?? []) lines.push(formatEnvFrom(e));
      for (const e of container.env ?? []) lines.push(formatEnvVar(e));
      const hasEnv = (container.env?.length ?? 0) > 0 || (container.envFrom?.length ?? 0) > 0;
      if (!hasEnv) {
        if (multi) lines.push('# (no environment variables)');
        else continue;
      }
      if (lines.length) blocks.push(lines.join('\n'));
    }

    return { text: blocks.join('\n\n'), error: null };
  });

  const handleCopy = async () => {
    const text = parsed().text;
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Show when={!props.loading} fallback={<span class="loading loading-dots" />}>
      <Show
        when={!parsed().error}
        fallback={<p class="text-sm text-error">{parsed().error}</p>}
      >
        <Show
          when={parsed().text}
          fallback={<p class="text-sm opacity-60">No environment variables defined.</p>}
        >
          <div class="flex flex-col gap-2">
            <p class="text-xs opacity-60">
              Environment variables from the pod spec. Values sourced from Secrets/ConfigMaps are shown
              as commented references, not resolved values.
            </p>
            <div class="relative">
              <div class="absolute right-2 top-2">
                <button
                  type="button"
                  class="btn btn-ghost btn-xs"
                  onClick={handleCopy}
                  title="Copy to clipboard"
                >
                  <Show when={copied()} fallback={
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  }>
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </Show>
                </button>
              </div>
              <pre class="overflow-auto rounded-lg bg-base-300/60 p-4 text-xs leading-relaxed whitespace-pre-wrap break-all">
                {parsed().text}
              </pre>
            </div>
          </div>
        </Show>
      </Show>
    </Show>
  );
};

export default PodEnvPanel;
