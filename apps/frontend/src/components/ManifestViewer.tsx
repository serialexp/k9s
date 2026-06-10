// ABOUTME: Displays a manifest/definition with copy and optional in-place editing
// ABOUTME: Used across all resource detail pages for the Definition tab

import { createEffect, createSignal, Show } from 'solid-js';
import { applyManifest, type AppliedManifest } from '../lib/api';

interface ManifestViewerProps {
  manifest: string | undefined;
  loading?: boolean;
  /** Whether the manifest can be edited and re-applied. Defaults to true. */
  editable?: boolean;
  /** Called after a successful apply so the parent can refetch the manifest. */
  onApplied?: (applied: AppliedManifest) => void;
}

const ManifestViewer = (props: ManifestViewerProps) => {
  const [copied, setCopied] = createSignal(false);
  const [editing, setEditing] = createSignal(false);
  const [draft, setDraft] = createSignal('');
  const [saving, setSaving] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [savedNote, setSavedNote] = createSignal<string | null>(null);
  // After a successful apply we show the submitted YAML until the parent
  // refetches the manifest (i.e. until props.manifest changes).
  const [override, setOverride] = createSignal<string | null>(null);

  createEffect(() => {
    // Reset the override whenever a fresh manifest arrives from the parent.
    props.manifest;
    setOverride(null);
  });

  const editable = () => props.editable !== false;
  const displayed = () => override() ?? props.manifest;

  const handleCopy = async () => {
    const text = displayed();
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const startEditing = () => {
    setDraft(displayed() ?? '');
    setError(null);
    setSavedNote(null);
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
    setError(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const applied = await applyManifest(draft());
      setOverride(draft());
      setEditing(false);
      const target = applied.namespace
        ? `${applied.kind} ${applied.namespace}/${applied.name}`
        : `${applied.kind} ${applied.name}`;
      setSavedNote(`Applied ${target}`);
      setTimeout(() => setSavedNote(null), 4000);
      props.onApplied?.(applied);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply manifest.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Show when={!props.loading} fallback={<span class="loading loading-dots" />}>
      <Show
        when={displayed()}
        fallback={<p class="text-sm opacity-60">Manifest unavailable.</p>}
      >
        <div class="flex flex-col gap-2">
          <Show when={savedNote()}>
            <div role="alert" class="alert alert-success py-2 text-sm">
              <span>{savedNote()}</span>
            </div>
          </Show>
          <Show when={error()}>
            <div role="alert" class="alert alert-error py-2 text-sm">
              <span>{error()}</span>
            </div>
          </Show>

          <Show
            when={editing()}
            fallback={
              <div class="relative">
                <div class="absolute right-2 top-2 flex gap-1">
                  <Show when={editable()}>
                    <button
                      type="button"
                      class="btn btn-ghost btn-xs"
                      onClick={startEditing}
                      title="Edit manifest"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                  </Show>
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
                <pre class="overflow-auto rounded-lg bg-base-300/60 p-4 text-xs">
                  {displayed()}
                </pre>
              </div>
            }
          >
            <textarea
              class="textarea textarea-bordered h-[28rem] w-full resize-y rounded-lg bg-base-300/60 p-4 font-mono text-xs leading-relaxed"
              spellcheck={false}
              value={draft()}
              onInput={(e) => setDraft(e.currentTarget.value)}
              disabled={saving()}
            />
            <div class="flex items-center justify-end gap-2">
              <span class="mr-auto text-xs opacity-60">
                Replaces the resource (kubectl edit semantics). Optimistic locking via resourceVersion.
              </span>
              <button
                type="button"
                class="btn btn-ghost btn-sm"
                onClick={cancelEditing}
                disabled={saving()}
              >
                Cancel
              </button>
              <button
                type="button"
                class="btn btn-primary btn-sm"
                onClick={handleSave}
                disabled={saving()}
              >
                <Show when={saving()}>
                  <span class="loading loading-spinner loading-xs" />
                </Show>
                Apply
              </button>
            </div>
          </Show>
        </div>
      </Show>
    </Show>
  );
};

export default ManifestViewer;
