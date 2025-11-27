import { useNavigate, useLocation } from '@solidjs/router';

const NotFound = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <main class="p-6">
      <div class="flex items-center justify-center min-h-[50vh]">
        <div class="card bg-base-200 shadow-xl max-w-md">
          <div class="card-body text-center">
            <h2 class="card-title justify-center text-error">404 - Page Not Found</h2>
            <p class="opacity-70">The page "{location.pathname}" could not be found.</p>
            <div class="card-actions justify-center mt-4">
              <button
                class="btn btn-primary"
                onClick={() => navigate('/', { replace: true })}
              >
                Go Home
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default NotFound;
