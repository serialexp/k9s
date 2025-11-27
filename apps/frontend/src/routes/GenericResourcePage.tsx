import { useParams } from '@solidjs/router';

interface GenericResourcePageProps {
  resourceType: string;
  resourceLabel: string;
}

const GenericResourcePage = (props: GenericResourcePageProps) => {
  const params = useParams<{ context: string; namespace: string }>();

  const context = () => params.context ? decodeURIComponent(params.context) : '';
  const namespace = () => params.namespace ? decodeURIComponent(params.namespace) : '';

  return (
    <main class="p-6">
      <div class="flex items-center justify-center min-h-[50vh]">
        <div class="card bg-base-200 shadow-xl max-w-md">
          <div class="card-body text-center">
            <h2 class="card-title justify-center">{props.resourceLabel} - Coming Soon</h2>
            <p class="opacity-70">
              {props.resourceLabel} view for namespace <strong>{namespace()}</strong> is not yet implemented.
            </p>
            <p class="text-sm opacity-60 mt-2">
              This will show all {props.resourceLabel.toLowerCase()} in the namespace with their details.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
};

export default GenericResourcePage;
