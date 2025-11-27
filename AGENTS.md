# Repository Guidelines

## Project Structure & Module Organization
The repository is a pnpm workspace with two apps under `apps/`. `apps/frontend/` holds the SolidJS UI; components live in `src/components/`, shared state in `src/stores/`, and utilities in `src/utils/`. `apps/backend/` hosts the Fastify API with HTTP and SSE handlers in `src/routes/` and cluster integrations in `src/services/`. Each app writes builds to its own `dist/`. Keep kubeconfig-derived files untracked.

## Build, Test, and Development Commands
- `pnpm install`: install workspace dependencies from the repo root.
- `pnpm dev`: run backend and frontend together for local development (http://localhost:3130/3131).
- `pnpm --filter k9s-dashboard-backend build`: compile the API with `tsc`.
- `pnpm --filter k9s-dashboard-frontend build`: type-check and bundle the UI with Vite.
- `pnpm --filter {app} typecheck`: run TypeScript’s `--noEmit` safety net on either app before committing.

## Coding Style & Naming Conventions
Use TypeScript with 2-space indentation. Backend modules favor single quotes and named exports; frontend components remain default exports with PascalCase filenames. Stick to camelCase for stores and utilities, and place shared state in `src/stores/`. Extend styling through Tailwind classes or `src/styles/tailwind.css` rather than ad-hoc CSS.

## Testing Guidelines
No automated test suite exists yet; rely on TypeScript safety nets and manual runs. Add targeted tests when you add complex logic—Vitest pairs well with Vite, and Jest or uvu suits backend modules. Always run `pnpm --filter {app} typecheck` and the appropriate build before pushing, and record manual steps in your PR description.

## Commit & Pull Request Guidelines
Write concise, imperative commit subjects (e.g., `Add pod log stream reconnect`). Group related changes and avoid mixing unrelated API and UI refactors. PRs should explain the behavior change, list manual checks, and include screenshots or GIFs for UI touches. Link issues and note follow-ups so reviewers can track remaining work.

## Security & Configuration Tips
The backend reads the active kubeconfig on startup—never commit kubeconfig files or AWS credentials. For experiments, rely on local environment variables or ignored `.env` files. Test new integrations against non-production clusters and document extra RBAC requirements in your PR.
