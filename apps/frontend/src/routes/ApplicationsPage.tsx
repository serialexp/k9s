// ABOUTME: Displays detected Kubernetes applications based on installed CRDs
// ABOUTME: Shows applications in a card-based grid layout with logos and descriptions

import { createEffect, createSignal, For, Show } from 'solid-js';
import { useParams } from '@solidjs/router';
import { contextStore } from '../stores/contextStore';
import { fetchInstalledApplications, type InstalledApplication } from '../lib/api';

const ApplicationsPage = () => {
  const params = useParams<{ context: string; namespace: string }>();

  const context = () => (params.context ? decodeURIComponent(params.context) : '');
  const namespace = () => (params.namespace ? decodeURIComponent(params.namespace) : '');

  const [applications, setApplications] = createSignal<InstalledApplication[]>([]);
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal<string>('');
  const [contextError, setContextError] = createSignal<string>('');

  createEffect(() => {
    const ctx = context();
    const ns = namespace();

    if (!ctx || !ns) return;

    const contexts = contextStore.contexts();
    const namespaces = contextStore.namespaces();

    if (contextStore.contextsLoading() || contextStore.namespacesLoading()) {
      setContextError('');
      return;
    }

    if (contexts.length > 0) {
      const validContext = contexts.find((c) => c.name === ctx);
      if (!validContext) {
        setContextError(`Context "${ctx}" not found`);
        return;
      }
    }

    if (namespaces.length > 0) {
      const validNamespace = namespaces.includes(ns);
      if (!validNamespace) {
        setContextError(`Namespace "${ns}" not found in context "${ctx}"`);
        return;
      }
    }

    setContextError('');

    if (contextStore.activeContext() !== ctx) {
      return;
    }
  });

  const loadApplications = async () => {
    setLoading(true);
    setError('');
    try {
      const items = await fetchInstalledApplications();
      setApplications(items);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load applications';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  createEffect(() => {
    const ctx = context();
    const ns = namespace();
    if (ctx && ns && contextStore.activeContext() === ctx && !contextError()) {
      loadApplications();
    }
  });

  const groupedApplications = () => {
    const apps = applications();
    const grouped = new Map<string, InstalledApplication[]>();

    apps.forEach(app => {
      const category = app.category || 'Other';
      if (!grouped.has(category)) {
        grouped.set(category, []);
      }
      grouped.get(category)!.push(app);
    });

    return Array.from(grouped.entries()).sort(([a], [b]) => a.localeCompare(b));
  };

  return (
    <div class="container mx-auto p-6">
      <div class="mb-6">
        <h1 class="text-3xl font-bold mb-2">Applications</h1>
        <p class="text-base-content/70">
          Installed applications are highlighted. Grayed-out apps can be detected but are not currently installed.
        </p>
      </div>

      <Show when={contextError()}>
        <div class="alert alert-error mb-4">
          <span>{contextError()}</span>
        </div>
      </Show>

      <Show when={error()}>
        <div class="alert alert-error mb-4">
          <span>{error()}</span>
        </div>
      </Show>

      <Show when={loading()}>
        <div class="flex justify-center items-center p-12">
          <span class="loading loading-spinner loading-lg"></span>
        </div>
      </Show>

      <Show when={!loading() && !error() && !contextError()}>
        <Show
          when={applications().length > 0}
          fallback={
            <div class="alert alert-info">
              <span>No applications detected in this cluster</span>
            </div>
          }
        >
          <For each={groupedApplications()}>
            {([category, apps]) => (
              <div class="mb-8">
                <h2 class="text-2xl font-semibold mb-4 border-b border-base-300 pb-2">
                  {category}
                </h2>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  <For each={apps}>
                    {(app) => (
                      <div class={`card shadow-md transition-shadow ${app.installed ? 'bg-base-200 hover:shadow-lg' : 'bg-base-300/30 opacity-60'}`}>
                        <div class="card-body p-4">
                          <div class="flex items-start gap-3">
                            <div class="flex-shrink-0">
                              <div
                                class={`rounded-lg w-12 h-12 flex items-center justify-center overflow-hidden ${app.installed ? 'text-base-content' : 'text-base-content/50'}`}
                                style={app.logoBgColor ? `background-color: ${app.logoBgColor}` : 'background-color: var(--fallback-b3, oklch(var(--b3)))'}
                              >
                                <Show
                                  when={app.logoUrl}
                                  fallback={<span class="text-xl">{app.name[0]}</span>}
                                >
                                  <img
                                    src={app.logoUrl}
                                    alt={`${app.name} logo`}
                                    class={`w-10 h-10 object-contain ${app.installed ? '' : 'grayscale opacity-50'}`}
                                    onError={(e) => {
                                      const target = e.currentTarget;
                                      target.style.display = 'none';
                                      const parent = target.parentElement;
                                      if (parent) {
                                        parent.innerHTML = `<span class="text-xl">${app.name[0]}</span>`;
                                      }
                                    }}
                                  />
                                </Show>
                              </div>
                            </div>
                            <div class="flex-1 min-w-0">
                              <div class="flex items-center gap-2 mb-1">
                                <h3 class={`card-title text-base font-semibold ${app.installed ? '' : 'text-base-content/60'}`}>
                                  {app.name}
                                </h3>
                                <Show when={!app.installed}>
                                  <span class="badge badge-ghost badge-xs">Not Installed</span>
                                </Show>
                              </div>
                              <p class={`text-sm line-clamp-2 mb-2 ${app.installed ? 'text-base-content/70' : 'text-base-content/50'}`}>
                                {app.description}
                              </p>
                              <Show when={app.docsUrl}>
                                <a
                                  href={app.docsUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  class={`link text-xs ${app.installed ? 'link-primary' : 'link-neutral opacity-70'}`}
                                >
                                  Documentation →
                                </a>
                              </Show>
                            </div>
                          </div>
                          <Show when={app.installed && app.detectedBy.length > 0}>
                            <div class="mt-2 pt-2 border-t border-base-300">
                              <details class="text-xs">
                                <summary class="cursor-pointer text-base-content/60 hover:text-base-content">
                                  Detection details
                                </summary>
                                <ul class="list-disc list-inside mt-2 text-base-content/70">
                                  <For each={app.detectedBy}>
                                    {(detection) => <li>{detection}</li>}
                                  </For>
                                </ul>
                              </details>
                            </div>
                          </Show>
                        </div>
                      </div>
                    )}
                  </For>
                </div>
              </div>
            )}
          </For>
        </Show>
      </Show>
    </div>
  );
};

export default ApplicationsPage;
