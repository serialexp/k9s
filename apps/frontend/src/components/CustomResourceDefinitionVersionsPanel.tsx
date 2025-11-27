import { For, Show } from 'solid-js';
import type { CustomResourceDefinitionDetail } from '../lib/api';

interface CustomResourceDefinitionVersionsPanelProps {
  crd?: CustomResourceDefinitionDetail;
  loading?: boolean;
}

const CustomResourceDefinitionVersionsPanel = (props: CustomResourceDefinitionVersionsPanelProps) => (
  <Show
    when={props.crd}
    fallback={
      props.loading ? (
        <div class="flex h-48 items-center justify-center">
          <span class="loading loading-dots" />
        </div>
      ) : (
        <p class="text-sm opacity-60">Select a CRD to view its versions.</p>
      )
    }
  >
    {(crd) => (
      <div class="flex flex-col gap-4">
        <Show when={crd().versions.length} fallback={<p class="text-sm opacity-60">No versions defined.</p>}>
          <For each={crd().versions}>
            {(version) => (
              <div class="card bg-base-200/60">
                <div class="card-body gap-3 text-sm">
                  <div class="flex items-center justify-between gap-3">
                    <div class="font-semibold">Version {version.name}</div>
                    <div class="flex items-center gap-2 text-xs">
                      <span class={`badge badge-ghost badge-sm ${version.served ? 'badge-success' : ''}`}>Served</span>
                      <span class={`badge badge-ghost badge-sm ${version.storage ? 'badge-primary' : ''}`}>Storage</span>
                    </div>
                  </div>
                  <Show when={version.additionalPrinterColumns?.length}>
                    <div>
                      <h4 class="text-[0.7rem] uppercase tracking-wide opacity-70">Additional Columns</h4>
                      <pre class="mt-2 overflow-auto rounded bg-base-300/40 p-2 text-xs">
                        {JSON.stringify(version.additionalPrinterColumns, null, 2)}
                      </pre>
                    </div>
                  </Show>
                  <Show when={version.schema}>
                    <div>
                      <h4 class="text-[0.7rem] uppercase tracking-wide opacity-70">Schema</h4>
                      <pre class="mt-2 overflow-auto rounded bg-base-300/40 p-2 text-xs">
                        {JSON.stringify(version.schema, null, 2)}
                      </pre>
                    </div>
                  </Show>
                  <Show when={version.subresources}>
                    <div>
                      <h4 class="text-[0.7rem] uppercase tracking-wide opacity-70">Subresources</h4>
                      <pre class="mt-2 overflow-auto rounded bg-base-300/40 p-2 text-xs">
                        {JSON.stringify(version.subresources, null, 2)}
                      </pre>
                    </div>
                  </Show>
                </div>
              </div>
            )}
          </For>
        </Show>
      </div>
    )}
  </Show>
);

export default CustomResourceDefinitionVersionsPanel;
