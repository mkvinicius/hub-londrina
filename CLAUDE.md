# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Critical: Read RULES.md first

Before touching any route in Stripe, auth, lojista, admin, or boost areas, read `RULES.md` in full. It contains inviolable business invariants (R1–R12) and quality workflow rules (W1–W5). Rule W3 is explicit: every new session must re-read it.

## Project overview

**Hub Londrina** is a live SaaS marketplace for local businesses in Londrina, Brazil. Consumers find businesses; lojistas (merchants) manage their profiles and buy visibility products; admins moderate content and manage subscriptions.

Subscription tiers: Free → Destaque (R$49/mo) → Premium (R$89/mo). Revenue also comes from boosts, home banners, and vitrine slots.

## Monorepo structure

pnpm workspaces. All commands run from repo root unless noted.

```
artifacts/hub-londrina/   ← React 19 SPA + SSR (Vite 7)
artifacts/api-server/     ← Express 5 backend
lib/db/                   ← Drizzle ORM schema + PostgreSQL connection (shared)
lib/api-zod/              ← Zod validation schemas (shared)
lib/api-spec/             ← OpenAPI spec + Orval codegen config
lib/api-client-react/     ← Auto-generated React Query hooks (do not hand-edit)
```

## Commands

**Install dependencies** (pnpm only — npm/yarn are blocked by preinstall hook):
```bash
pnpm install
```

**Frontend dev server:**
```bash
cd artifacts/hub-londrina && pnpm dev
```

**Backend dev server:**
```bash
cd artifacts/api-server && pnpm dev
```

**Build frontend (client + SSR):**
```bash
cd artifacts/hub-londrina && pnpm build
```

**Build backend:**
```bash
cd artifacts/api-server && pnpm build
```

**Full workspace typecheck:**
```bash
pnpm typecheck:libs
```

**Database schema push:**
```bash
cd lib/db && pnpm push
```

**Regenerate React Query hooks from OpenAPI spec:**
```bash
cd lib/api-spec && pnpm generate   # runs orval
```

## Architecture

### Data flow

```
React (Wouter routing, TanStack Query)
  └─ lojistaFetch() / adminFetch() / plain fetch()
       └─ Express routes (JWT auth middleware)
            └─ Drizzle ORM → PostgreSQL

Stripe Webhooks → POST /api/stripe/webhook
  └─ pg_advisory_xact_lock → idempotent DB update
```

### Authentication

Two separate JWT systems stored in `localStorage`:
- Lojista: key `hub_lojista_token` — **always** use `lojistaFetch()` from `src/lib/lojista-api.ts`. Direct `localStorage.getItem` will silently return null (R4).
- Admin: key `admin_token` — use `adminFetch()` from `src/lib/admin-api.ts`.

Plan data must always be read from DB on the backend — never from the JWT payload, which can be stale (R1).

### Stripe integration

Every checkout `success_url` must include `&session_id={CHECKOUT_SESSION_ID}`. The frontend detects this param on load and calls the corresponding `/sync` endpoint as a fallback in case the webhook is delayed (R7). All webhook handlers and sync routes must be idempotent (R10).

### Media / GCS storage

URLs stored in DB are `/storage/objects/uploads/{folder}/{file}`. The `routes/storage.ts` handler receives `gcsPath` that already contains the `uploads/` prefix — never prepend it again or you get a double-path 404 (R5). Upload limit is 15 MB end-to-end (R6).

### Plan gates

Backend is the source of truth for plan gates; frontend is cosmetic only. Any blocked feature must show: disabled grey button + amber warning box with "Ver planos" link — never a clickable button that charges a free-tier user (R1, R12).

### Startup heal jobs

`api-server/src/lib/startup-heal.ts` runs on every boot to reconcile DB state:
- `healPaidInvisibleBusinesses()` — sets `isVisible=true` if payment exists but flag is false
- `healOverflowingProductLimits()` — deactivates products that exceed plan limits
- `healZoneRegionDisplayNames()` — syncs zone display names

### SSR

`artifacts/hub-londrina/vite.ssr.config.ts` builds `src/entry-server.tsx` into `dist/server/`. `server.mjs` is the Node.js host that serves both SSR-rendered HTML and static assets. SSR is used for SEO-sensitive pages (landing, business profiles).

### Vitrine

`GET /api/vitrine` returns up to 12 product cards (4 fixed boost slots + 8 random rotation). Never cache this endpoint — randomization must run per-request. Requires Premium plan + at least 1 admin-approved video (R11).

## Key files to know

| File | Purpose |
|------|---------|
| `RULES.md` | Inviolable business invariants — read before every session |
| `artifacts/hub-londrina/src/App.tsx` | All 40+ Wouter routes |
| `artifacts/hub-londrina/src/lib/lojista-api.ts` | `lojistaFetch()` + auth key constants |
| `artifacts/api-server/src/app.ts` | Express setup: CORS, rate limiting, error handler |
| `artifacts/api-server/src/routes/stripe.ts` | Webhook handler — idempotency + advisory locks |
| `lib/db/src/schema/` | All Drizzle table definitions |
| `lib/api-client-react/src/generated/` | Auto-generated hooks — do not hand-edit |

## Other documentation

- `PRD-HubLondrina.md` — product vision, monetization model, feature specs by role
- `REGRAS_DE_NEGOCIO.md` — business entity definitions and plan feature comparison
- `CHANGELOG.md` — reverse-chronological record of decisions and changes
- `context.md` — complete technical context including full schema and API endpoint list
