# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Artifacts

### Hub Londrina — Negócio Local (`artifacts/hub-londrina`)
Full-stack local business directory for Londrina, Brazil.

**Frontend**: React + Vite, Wouter routing, TanStack Query, shadcn/ui components, Tailwind CSS
**Backend**: Express API (`artifacts/api-server`), PostgreSQL + Drizzle ORM

**Brand palette**:
- Marrom `#6F4E37` (HSL 25 34% 33%) — primary text, headers
- Laranja `#FF9800` (HSL 36 100% 50%) — accent/CTA
- Verde `#4CAF50` (HSL 122 39% 49%) — success/WhatsApp
- Bege `#F5F5DC` (HSL 60 56% 91%) — background

**Typography**: Playfair Display (serif headings), Inter (body)

**Routes**:
- `/` — Landing page (hero, categories, featured businesses, pricing CTA)
- `/categorias` — All categories grid
- `/busca` — Search + filters + results list
- `/negocio/:id` — Business profile with tabs + reviews + sidebar
- `/anuncie` — Advertise / pricing page

**Key files**:
- `src/App.tsx` — Router setup with wouter
- `src/components/Layout.tsx` — Shared header + footer
- `src/lib/icons.tsx` — Category icon and color helpers
- `src/pages/landing.tsx` — Landing page
- `src/pages/categorias.tsx` — Categories page
- `src/pages/busca.tsx` — Search page
- `src/pages/negocio.tsx` — Business profile page
- `src/pages/anuncie.tsx` — Advertise/pricing page

**API Client**: `@workspace/api-client-react` — generated hooks from OpenAPI spec.
Hooks: `useListBusinesses`, `useGetBusinessById`, `useListCategories`, `useSearch`, `useListReviews`

**DB Seed**: 10 categories, 20 businesses, 10 reviews

**Pricing Plans**:
- Gratuito: R$0/mês
- Destaque: R$49/mês
- Premium: R$89/mês
