// ABOUTME: Page for importing Kubernetes contexts from AWS EKS clusters
// ABOUTME: Provides a wizard-style interface for selecting AWS profile, region, and cluster to import

import { createSignal, createResource, Show, For } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { fetchAwsProfiles, fetchAwsRegions, fetchEksClusters, importEksCluster, type AwsProfile, type EksCluster } from '../lib/api';
import { contextStore } from '../stores/contextStore';

const ImportPage = () => {
  const navigate = useNavigate();
  const [selectedProfile, setSelectedProfile] = createSignal<string>('');
  const [selectedRegion, setSelectedRegion] = createSignal<string>('');
  const [selectedCluster, setSelectedCluster] = createSignal<string>('');
  const [importing, setImporting] = createSignal<boolean>(false);
  const [error, setError] = createSignal<string>('');

  const [profiles] = createResource(
    async (): Promise<AwsProfile[]> => {
      try {
        return await fetchAwsProfiles();
      } catch (err) {
        setError(`Failed to load AWS profiles: ${(err as Error).message}`);
        return [];
      }
    }
  );

  const [regions] = createResource(
    async (): Promise<string[]> => {
      try {
        return await fetchAwsRegions();
      } catch (err) {
        setError(`Failed to load AWS regions: ${(err as Error).message}`);
        return [];
      }
    }
  );

  const [clusters] = createResource(
    () => ({ profile: selectedProfile(), region: selectedRegion() }),
    async ({ profile, region }: { profile: string; region: string }): Promise<EksCluster[]> => {
      if (!profile || !region) return [];
      try {
        setError('');
        return await fetchEksClusters(region, profile);
      } catch (err) {
        setError(`Failed to load EKS clusters: ${(err as Error).message}`);
        return [];
      }
    }
  );

  const handleImport = async () => {
    const cluster = selectedCluster();
    const region = selectedRegion();
    const profile = selectedProfile();

    if (!cluster || !region || !profile) {
      setError('Please select a profile, region, and cluster');
      return;
    }

    setImporting(true);
    setError('');

    try {
      await importEksCluster(cluster, region, profile);
      await contextStore.refreshAfterImport();
      navigate('/');
    } catch (err) {
      setError(`Failed to import cluster: ${(err as Error).message}`);
    } finally {
      setImporting(false);
    }
  };

  const handleCancel = () => {
    navigate('/');
  };

  const canProceed = () => selectedProfile() && selectedRegion();
  const canImport = () => canProceed() && selectedCluster() && !importing();

  return (
    <div class="container mx-auto p-6 max-w-2xl">
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h2 class="card-title text-2xl mb-4">Import Kubernetes Context from AWS EKS</h2>

          <div class="space-y-4">
            {/* Step 1: Profile Selection */}
            <div class="form-control">
              <label class="label">
                <span class="label-text font-semibold">1. Select AWS Profile</span>
                <Show when={profiles.loading}>
                  <span class="loading loading-xs loading-spinner" />
                </Show>
              </label>
              <select
                class="select select-bordered"
                value={selectedProfile()}
                onChange={(e) => setSelectedProfile((e.target as HTMLSelectElement).value)}
                disabled={profiles.loading}
              >
                <option value="">Choose an AWS profile...</option>
                <For each={profiles()}>
                  {(profile) => (
                    <option value={profile.name}>{profile.name}</option>
                  )}
                </For>
              </select>
            </div>

            {/* Step 2: Region Selection */}
            <div class="form-control">
              <label class="label">
                <span class="label-text font-semibold">2. Select AWS Region</span>
                <Show when={regions.loading}>
                  <span class="loading loading-xs loading-spinner" />
                </Show>
              </label>
              <select
                class="select select-bordered"
                value={selectedRegion()}
                onChange={(e) => setSelectedRegion((e.target as HTMLSelectElement).value)}
                disabled={regions.loading || !selectedProfile()}
              >
                <option value="">Choose a region...</option>
                <For each={regions()}>
                  {(region) => (
                    <option value={region}>{region}</option>
                  )}
                </For>
              </select>
            </div>

            {/* Step 3: Cluster Selection */}
            <Show when={canProceed()}>
              <div class="form-control">
                <label class="label">
                  <span class="label-text font-semibold">3. Select EKS Cluster</span>
                  <Show when={clusters.loading}>
                    <span class="loading loading-xs loading-spinner" />
                  </Show>
                </label>
                <Show
                  when={!clusters.loading && clusters() && clusters()!.length > 0}
                  fallback={
                    <div class="text-sm text-gray-500 p-4 bg-base-200 rounded">
                      <Show
                        when={!clusters.loading}
                        fallback="Loading clusters..."
                      >
                        No EKS clusters found in this region with the selected profile.
                      </Show>
                    </div>
                  }
                >
                  <select
                    class="select select-bordered"
                    value={selectedCluster()}
                    onChange={(e) => setSelectedCluster((e.target as HTMLSelectElement).value)}
                    disabled={clusters.loading}
                  >
                    <option value="">Choose a cluster...</option>
                    <For each={clusters()}>
                      {(cluster) => (
                        <option value={cluster.name}>
                          {cluster.name} ({cluster.status})
                        </option>
                      )}
                    </For>
                  </select>
                </Show>
              </div>
            </Show>

            {/* Error Display */}
            <Show when={error()}>
              <div class="alert alert-error">
                <span>{error()}</span>
              </div>
            </Show>
          </div>

          <div class="card-actions justify-end mt-6">
            <button
              class="btn btn-ghost"
              onClick={handleCancel}
              disabled={importing()}
            >
              Cancel
            </button>
            <button
              class="btn btn-primary"
              onClick={handleImport}
              disabled={!canImport()}
            >
              <Show
                when={!importing()}
                fallback={
                  <>
                    <span class="loading loading-xs loading-spinner" />
                    Importing...
                  </>
                }
              >
                Import Cluster
              </Show>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportPage;
