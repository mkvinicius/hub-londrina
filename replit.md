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

**Routes (public)**:
- `/` — Landing page (hero, categories, featured businesses, pricing CTA)
- `/categorias` — All categories grid
- `/busca` — Search + filters + results list
- `/negocio/:id` — Business profile with tabs + reviews + sidebar
- `/anuncie` — Advertise / pricing page

**Routes (admin — SPA, no SSR)**:
- `/admin/login` — Password login (JWT auth)
- `/admin` — Dashboard (stats, charts)
- `/admin/negocios` — Business management table (CRUD, visibility toggle, plan change)
- `/admin/categorias` — Category management (CRUD)

**Key files**:
- `src/App.tsx` — Router setup with wouter + PrivateRoute for admin
- `src/components/Layout.tsx` — Shared header + footer (public)
- `src/lib/icons.tsx` — Category icon and color helpers
- `src/lib/admin-api.ts` — Admin API client (JWT auth, CRUD operations)
- `src/pages/landing.tsx` — Landing page
- `src/pages/categorias.tsx` — Categories page
- `src/pages/busca.tsx` — Search page
- `src/pages/negocio.tsx` — Business profile page
- `src/pages/anuncie.tsx` — Advertise/pricing page
- `src/pages/admin/AdminLayout.tsx` — Admin sidebar layout
- `src/pages/admin/AdminLogin.tsx` — Admin login page
- `src/pages/admin/AdminDashboard.tsx` — Admin dashboard
- `src/pages/admin/AdminNegocios.tsx` — Admin business management
- `src/pages/admin/AdminCategorias.tsx` — Admin category management

**API Client**: `@workspace/api-client-react` — generated hooks from OpenAPI spec.
Hooks: `useListBusinesses`, `useGetBusinessById`, `useListCategories`, `useSearch`, `useListReviews`

**Admin API**: Direct fetch calls via `src/lib/admin-api.ts` (JWT Bearer auth)
Routes: `POST /api/admin/login`, `GET /api/admin/stats`, `GET|PATCH|DELETE /api/admin/businesses`, `GET|POST|PATCH|DELETE /api/admin/categories`
Env vars: `JWT_SECRET` (auto-generated), `ADMIN_PASSWORD` (user secret)

**DB Schema**: businesses table includes `clicks`, `whatsappClicks`, `isVisible`, `zone` fields
Click tracking: auto-increment on GET /api/businesses/:id, POST /api/businesses/:id/click-whatsapp

**DB Seed**: 10 categories, 20 businesses, 10 reviews

**Pricing Plans**:
- Gratuito: R$0/mês
- Destaque: R$49/mês
- Premium: R$89/mês
