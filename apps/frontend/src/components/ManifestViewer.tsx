// ABOUTME: Displays a manifest/definition with syntax highlighting and copy functionality
// ABOUTME: Used across all resource detail pages for the Definition tab

import { createSignal, Show } from 'solid-js';

interface ManifestViewerProps {
  manifest: string | undefined;
  loading?: boolean;
}

const ManifestViewer = (props: ManifestViewerProps) => {
  const [copied, setCopied] = createSignal(false);

  const handleCopy = async () => {
    if (!props.manifest) return;
    await navigator.clipboard.writeText(props.manifest);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Show when={!props.loading} fallback={<span class="loading loading-dots" />}>
      <Show
        when={props.manifest}
        fallback={<p class="text-sm opacity-60">Manifest unavailable.</p>}
      >
        <div class="relative">
          <button
            type="button"
            class="btn btn-ghost btn-xs absolute right-2 top-2"
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
          <pre class="overflow-auto rounded-lg bg-base-300/60 p-4 text-xs">
            {props.manifest}
          </pre>
        </div>
      </Show>
    </Show>
  );
};

export default ManifestViewer;
