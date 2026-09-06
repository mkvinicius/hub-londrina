# Base44 Dev Environment — Hub Londrina

## Stack
- **Monorepo**: pnpm workspaces (lockfile v9, needs pnpm 9+). Root `package.json` enforces pnpm-only via `preinstall`.
- **Frontend**: `artifacts/hub-londrina` — Vite + React 19 + Tailwind 4 + TanStack Query. Dev server on port 3000.
- **Backend**: `artifacts/api-server` — Express 5 + Drizzle ORM + PostgreSQL. Builds with esbuild (`build.mjs`) then runs `node dist/index.mjs` on port 3001 (internal).
- **Database**: PostgreSQL 16 (`postgres:16-alpine`). Schema managed by Drizzle (`lib/db`). `drizzle-kit push` creates tables; the API seeds on first boot.
- **Shared libs**: `lib/db` (Drizzle schema + pool), `lib/api-zod`, `lib/api-client-react`.

## Architecture (single-origin)
- Vite dev server (port 3000) proxies `/api/*` to the Express API (port 3001, internal `api` service).
- Frontend uses `import.meta.env.VITE_API_URL || ""` for API base — empty = same-origin, routed through Vite proxy.
- API also exposed directly on host port 8000.

## Boot-required env vars (placeholders in `.env.base44-defaults`)
- `JWT_SECRET` — throws at module load if missing (auth/admin/stripe/boosts/docs routes).
- `ADMIN_PASSWORD` — throws at module load if missing (admin routes).
- `STRIPE_SECRET_KEY` — throws at module load if missing (stripe/boosts routes). `new Stripe(key)` doesn't validate at construction, so a placeholder works; Stripe API calls fail at runtime.
- `RESEND_API_KEY` — the Resend SDK throws at construction (`new Resend()`) if missing, even though `sendEmail` checks for it later. Placeholder required.
- `DATABASE_URL` — set inline in compose (local postgres creds).
- `PORT` — set inline in compose.

## Optional env vars (gracefully handled when absent)
- `STRIPE_WEBHOOK_SECRET`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_*_PRICE_ID` — Stripe payment features.
- `RESEND_API_KEY` (real) — email sending.
- `SENTRY_DSN` — error monitoring (silent if absent).
- `S3_BUCKET` / `R2_BUCKET` — object storage for uploads (falls back to local `public/uploads`).
- `FRONTEND_URL` — used for Stripe redirect URLs.

## Setup order
1. `db` (postgres) starts with healthcheck.
2. `install` runs `pnpm install --no-frozen-lockfile` (lockfile overrides mismatch with installed pnpm version).
3. `migrate` runs `drizzle-kit push` to create schema.
4. `api` builds with esbuild and starts; seeds DB on first boot (categories, businesses, users, products, reviews).
5. `web` starts Vite dev server with proxy to API.

## How to verify
- `curl http://localhost:8000/api/healthz` → `{"status":"ok"}`
- `curl http://localhost:3000/api/categories` → category data via Vite proxy
- Preview at port 3000 shows the Hub Londrina homepage.

## Notes
- `--frozen-lockfile` fails because the lockfile's `overrides` config doesn't match pnpm 9.15.x. Use `--no-frozen-lockfile`.
- The API has no watch mode (esbuild bundles to `dist/index.mjs`). Backend changes require `docker compose -f docker-compose.base44.yml restart api`.
- Frontend has Vite HMR (live reload).
- `vite.config.ts` was modified to add `server.proxy` for `/api` → `http://api:3001`.
- Lojista seed login: any seeded business owner email + password `Hub@2026`.
