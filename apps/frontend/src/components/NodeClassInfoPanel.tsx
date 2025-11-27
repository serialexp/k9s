import { For, Show } from 'solid-js';
import type { NodeClassDetail } from '../lib/api';
import { formatRelativeTime } from '../utils/datetime';

interface NodeClassInfoPanelProps {
  nodeClass?: NodeClassDetail;
  loading?: boolean;
}

const NodeClassInfoPanel = (props: NodeClassInfoPanelProps) => (
  <Show
    when={props.nodeClass}
    fallback={
      props.loading ? (
        <div class="flex h-48 items-center justify-center">
          <span class="loading loading-dots" />
        </div>
      ) : (
        <p class="text-sm opacity-60">Select a node class to inspect its details.</p>
      )
    }
  >
    {(nc) => (
      <div class="flex flex-col gap-6">
        <div class="grid gap-3 lg:grid-cols-2">
          <div class="card bg-base-200/60">
            <div class="card-body gap-3 text-sm">
              <h3 class="text-xs uppercase tracking-wide opacity-80">Metadata</h3>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Name</span>
                <span class="font-mono text-xs">{nc().name}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">AMI Family</span>
                <span class="font-mono text-xs">{nc().amiFamily || '-'}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Instance Profile</span>
                <span class="font-mono text-xs truncate max-w-xs" title={nc().instanceProfile}>
                  {nc().instanceProfile || '-'}
                </span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Instance Store Policy</span>
                <span class="font-mono text-xs">{nc().instanceStorePolicy || '-'}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Ready Status</span>
                <span class={`badge badge-sm ${nc().readyStatus === 'True' ? 'badge-success' : nc().readyStatus === 'False' ? 'badge-error' : 'badge-ghost'}`}>
                  {nc().readyStatus === 'True' ? 'Ready' : nc().readyStatus === 'False' ? 'Not Ready' : 'Unknown'}
                </span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="opacity-70">Age</span>
                <span>{formatRelativeTime(nc().creationTimestamp)}</span>
              </div>
            </div>
          </div>

          <div class="card bg-base-200/60">
            <div class="card-body gap-3 text-sm">
              <h3 class="text-xs uppercase tracking-wide opacity-80">IAM</h3>
              <div class="flex flex-col gap-3">
                <div>
                  <span class="text-xs opacity-70">Role ARN</span>
                  <p class="font-mono text-xs break-all mt-1">{nc().role || '-'}</p>
                </div>
                <Show when={nc().readyMessage}>
                  <div>
                    <span class="text-xs opacity-70">Status Message</span>
                    <p class="text-xs mt-1">{nc().readyMessage}</p>
                  </div>
                </Show>
              </div>
            </div>
          </div>
        </div>

        <Show when={nc().tags && Object.keys(nc().tags!).length}>
          <div class="card bg-base-200/60">
            <div class="card-body gap-3">
              <h3 class="text-xs uppercase tracking-wide opacity-80">Tags</h3>
              <div class="flex flex-wrap gap-2">
                <For each={Object.entries(nc().tags!)}>
                  {([key, value]) => (
                    <span class="badge badge-sm font-mono">
                      {key}: {value}
                    </span>
                  )}
                </For>
              </div>
            </div>
          </div>
        </Show>

        <Show when={nc().subnetSelectorTerms && nc().subnetSelectorTerms!.length}>
          <div class="card bg-base-200/60">
            <div class="card-body gap-3">
              <h3 class="text-xs uppercase tracking-wide opacity-80">Subnet Selector Terms</h3>
              <pre class="overflow-auto rounded-lg bg-base-300/40 p-3 text-xs">
                {JSON.stringify(nc().subnetSelectorTerms, null, 2)}
              </pre>
            </div>
          </div>
        </Show>

        <Show when={nc().securityGroupSelectorTerms && nc().securityGroupSelectorTerms!.length}>
          <div class="card bg-base-200/60">
            <div class="card-body gap-3">
              <h3 class="text-xs uppercase tracking-wide opacity-80">Security Group Selector Terms</h3>
              <pre class="overflow-auto rounded-lg bg-base-300/40 p-3 text-xs">
                {JSON.stringify(nc().securityGroupSelectorTerms, null, 2)}
              </pre>
            </div>
          </div>
        </Show>

        <Show when={nc().blockDeviceMappings && nc().blockDeviceMappings!.length}>
          <div class="card bg-base-200/60">
            <div class="card-body gap-3">
              <h3 class="text-xs uppercase tracking-wide opacity-80">Block Device Mappings</h3>
              <pre class="overflow-auto rounded-lg bg-base-300/40 p-3 text-xs">
                {JSON.stringify(nc().blockDeviceMappings, null, 2)}
              </pre>
            </div>
          </div>
        </Show>

        <Show when={nc().metadataOptions}>
          <div class="card bg-base-200/60">
            <div class="card-body gap-3">
              <h3 class="text-xs uppercase tracking-wide opacity-80">Metadata Options</h3>
              <pre class="overflow-auto rounded-lg bg-base-300/40 p-3 text-xs">
                {JSON.stringify(nc().metadataOptions, null, 2)}
              </pre>
            </div>
          </div>
        </Show>

        <Show when={nc().userData}>
          <div class="card bg-base-200/60">
            <div class="card-body gap-3">
              <h3 class="text-xs uppercase tracking-wide opacity-80">User Data</h3>
              <pre class="overflow-auto rounded-lg bg-base-300/40 p-3 text-xs">
                {nc().userData}
              </pre>
            </div>
          </div>
        </Show>

        <div class="card bg-base-200/60">
          <div class="card-body gap-3">
            <h3 class="text-xs uppercase tracking-wide opacity-80">Labels</h3>
            <Show
              when={Object.keys(nc().labels).length}
              fallback={<p class="text-sm opacity-60">No labels.</p>}
            >
              <div class="flex flex-wrap gap-2">
                <For each={Object.entries(nc().labels)}>
                  {([key, value]) => (
                    <span class="badge badge-sm font-mono">
                      {key}: {value}
                    </span>
                  )}
                </For>
              </div>
            </Show>
          </div>
        </div>

        <div class="card bg-base-200/60">
          <div class="card-body gap-3">
            <h3 class="text-xs uppercase tracking-wide opacity-80">Annotations</h3>
            <Show
              when={Object.keys(nc().annotations).length}
              fallback={<p class="text-sm opacity-60">No annotations.</p>}
            >
              <div class="flex flex-col gap-2 text-sm">
                <For each={Object.entries(nc().annotations)}>
                  {([key, value]) => (
                    <div class="flex items-start justify-between gap-3">
                      <span class="font-mono text-xs opacity-70">{key}</span>
                      <span class="break-all font-mono text-xs text-right">{value}</span>
                    </div>
                  )}
                </For>
              </div>
            </Show>
          </div>
        </div>
      </div>
    )}
  </Show>
);

export default NodeClassInfoPanel;
