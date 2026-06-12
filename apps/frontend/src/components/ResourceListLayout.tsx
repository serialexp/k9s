// ABOUTME: Shared layout chrome for resource list/detail pages.
// ABOUTME: Owns the flex column that fills the space below the header, the
// ABOUTME: invalid-route state, the inline error alert, and the two-column grid.

import { Show, type JSX } from 'solid-js';
import { useNavigate } from '@solidjs/router';

interface ResourceListLayoutProps {
  /** When set, the route is invalid; render the "Route Not Found" state instead. */
  contextError?: string;
  /** Optional error message shown as an alert above the grid. */
  error?: string;
  /** The grid cells — typically a list card and a detail card. */
  children: JSX.Element;
  /** Optional content rendered above the grid (e.g. a scope note). */
  banner?: JSX.Element;
  /** Optional modals/dialogs rendered inside <main>, outside the grid. */
  overlay?: JSX.Element;
}

const ErrorIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    class="stroke-current shrink-0 h-6 w-6"
    fill="none"
    viewBox="0 0 24 24"
  >
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2"
      d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

/**
 * The page chrome shared by every resource list page. Pages render their two
 * cards as children; the flex sizing lives here so the panel tracks the real
 * header height (no hard-coded offset) and layout tweaks happen in one place.
 */
const ResourceListLayout = (props: ResourceListLayoutProps) => {
  const navigate = useNavigate();

  return (
    <Show
      when={!props.contextError}
      fallback={
        <main class="p-6">
          <div class="flex items-center justify-center min-h-[50vh]">
            <div class="card bg-base-200 shadow-xl max-w-md">
              <div class="card-body text-center">
                <h2 class="card-title justify-center text-error">Route Not Found</h2>
                <p class="opacity-70">{props.contextError}</p>
                <div class="card-actions justify-center mt-4">
                  <button
                    class="btn btn-primary"
                    onClick={() => navigate('/', { replace: true })}
                  >
                    Go to Default View
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      }
    >
      <main class="p-6 flex min-h-0 flex-1 flex-col">
        <div class="flex flex-1 flex-col gap-6 min-h-0">
          <Show when={props.error}>
            <div role="alert" class="alert alert-error">
              <ErrorIcon />
              <span>{props.error}</span>
            </div>
          </Show>
          {props.banner}
          <section class="grid grid-cols-1 gap-6 xl:grid-cols-2 min-h-0 flex-1">
            {props.children}
          </section>
        </div>
        {props.overlay}
      </main>
    </Show>
  );
};

export default ResourceListLayout;
