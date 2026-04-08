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

**Routes (lojista — SPA, no SSR)**:
- `/lojista/login` — Email+password login (JWT 7 days)
- `/lojista` — Dashboard (metrics, profile warnings)
- `/lojista/perfil` — Business profile editor (data, hours, location w/ CEP, tags, payments)
- `/lojista/fotos` — Logo, banner, gallery uploads (plan limits enforced)
- `/lojista/produtos` — Product catalog CRUD
- `/lojista/metricas` — Click analytics + 30-day chart
- `/lojista/senha` — Password change

**Key files**:
- `src/App.tsx` — Router setup with wouter + PrivateRoute/LojistaPrivateRoute
- `src/components/Layout.tsx` — Shared header + footer (public)
- `src/lib/icons.tsx` — Category icon and color helpers
- `src/lib/admin-api.ts` — Admin API client (JWT auth, CRUD operations)
- `src/lib/lojista-api.ts` — Lojista API client (JWT auth, profile, uploads, products, metrics)
- `src/pages/landing.tsx` — Landing page
- `src/pages/categorias.tsx` — Categories page
- `src/pages/busca.tsx` — Search page
- `src/pages/negocio.tsx` — Business profile page
- `src/pages/anuncie.tsx` — Advertise/pricing page
- `src/pages/admin/*` — Admin panel pages
- `src/pages/lojista/LojistaLayout.tsx` — Lojista sidebar layout
- `src/pages/lojista/LojistaLogin.tsx` — Lojista login
- `src/pages/lojista/LojistaDashboard.tsx` — Lojista dashboard
- `src/pages/lojista/LojistaPerfil.tsx` — Business profile editor
- `src/pages/lojista/LojistaFotos.tsx` — Photo management
- `src/pages/lojista/LojistaProdutos.tsx` — Product catalog
- `src/pages/lojista/LojistaMetricas.tsx` — Analytics
- `src/pages/lojista/LojistaSenha.tsx` — Password change

**API Client**: `@workspace/api-client-react` — generated hooks from OpenAPI spec.
Hooks: `useListBusinesses`, `useGetBusinessById`, `useListCategories`, `useSearch`, `useListReviews`

**Admin API**: Direct fetch calls via `src/lib/admin-api.ts` (JWT Bearer auth)
Routes: `POST /api/admin/login`, `GET /api/admin/stats`, `GET|PATCH|DELETE /api/admin/businesses`, `GET|POST|PATCH|DELETE /api/admin/categories`
Env vars: `JWT_SECRET` (auto-generated), `ADMIN_PASSWORD` (user secret)

**Lojista API**: Direct fetch calls via `src/lib/lojista-api.ts` (JWT Bearer auth)
Routes: `POST /api/lojista/login`, `GET|PATCH /api/lojista/profile`, `POST /api/lojista/upload/{logo,banner,photo}`,
`DELETE /api/lojista/photos/:index`, `GET /api/lojista/cep/:cep`, `PATCH /api/lojista/location`,
`GET|POST /api/lojista/products`, `PATCH /api/lojista/products/reorder`, `PATCH|DELETE /api/lojista/products/:id`,
`GET /api/lojista/metrics`, `PATCH /api/lojista/password`

**DB Schema**:
- `businesses` — extended with cnpj, ownerName, ownerEmail, ownerPhone, logoUrl, bannerUrl, photos[], cep, street, number, neighborhood, city, state, lat, lng, instagram, website, paymentMethods[], tags[], videoUrl
- `business_users` — lojista login accounts (email+bcrypt hash, FK to businesses)
- `products` — product catalog per business (name, description, price, media, sortOrder)
- `business_clicks` — click event history (type: profile/whatsapp/phone/maps)
- Uploads served at `/api/uploads/{logos,banners,photos}/` — MIME filtered (jpg/png/webp/gif only)

**DB Seed**: 10 categories, 20 businesses (real Londrina data), 20 lojista accounts, 42 products, 10 reviews
Default lojista password: Hub@2026 (all accounts)

**Pricing Plans**:
- Gratuito: R$0/mês
- Destaque: R$49/mês
- Premium: R$89/mês
