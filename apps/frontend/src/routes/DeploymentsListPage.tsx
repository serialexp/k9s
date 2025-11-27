import { useParams } from '@solidjs/router';

const DeploymentsListPage = () => {
  const params = useParams<{ context: string; namespace: string }>();

  const context = () => params.context ? decodeURIComponent(params.context) : '';
  const namespace = () => params.namespace ? decodeURIComponent(params.namespace) : '';

  return (
    <main class="p-6">
      <div class="flex items-center justify-center min-h-[50vh]">
        <div class="card bg-base-200 shadow-xl max-w-md">
          <div class="card-body text-center">
            <h2 class="card-title justify-center">Deployments - Coming Soon</h2>
            <p class="opacity-70">
              Deployments view for namespace <strong>{namespace()}</strong> is not yet implemented.
            </p>
            <p class="text-sm opacity-60 mt-2">
              This will show all deployments in the namespace with details like replicas, status, and more.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
};

export default DeploymentsListPage;
