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
- `/admin/impulsionamento` — Search boost management (5 monthly positions + avulso boosts)
- `/admin/home-banners` — Home banner management (CRUD, max 2 active)
- `/admin/zonas` — Zone CRUD + per-zone featured slots (up to 6 per zone)
- `/admin/suporte` — Moderação de tickets (B4: filtros status/prioridade, resposta + email auto)

**Zonas (regions)**: 5 zonas canônicas — `centro`, `norte`, `sul`, `leste`, `oeste`. Stored as `businesses.zone` (slug) and `businesses.region` (display name). Zone metadata (name, color, banner, description) lives in the `zones` table; falls back to `lib/zones.ts` constants if a row is missing.

**Zone-aware endpoints** (all accept `?zone=<slug>`):
- `GET /api/businesses?zone=` `GET /api/search?zone=` `GET /api/categories?zone=`
- `GET /api/zones` (public list with counts) · `GET /api/zones/:slug` (public detail)
- `GET/POST/PATCH/DELETE /api/admin/zones[/:id]` (admin CRUD)

**Routes (lojista — SPA, no SSR)**:
- `/lojista/login` — Email+password login (JWT 7 days)
- `/lojista` — Dashboard (metrics, profile warnings)
- `/lojista/perfil` — Business profile editor (data, hours, location w/ CEP, tags, payments)
- `/lojista/fotos` — Logo, banner, gallery uploads (plan limits enforced; logo/banner locked for free)
- `/lojista/produtos` — Product catalog CRUD (locked for non-premium)
- `/lojista/metricas` — Click analytics (locked for free; chart locked for non-premium)
- `/lojista/avaliacoes` — Review management (view, respond, copy review link)
- `/lojista/suporte` — Tickets de suporte (B4: criar/listar com prioridade e status)
- `/lojista/boost` — Boost (categoria self-service Premium com botões comprar, avulso WhatsApp)
- `/lojista/plano` — Plano & Assinatura unificado, abas "Visão Geral" (status plano + boosts + banner) e "Mudar Plano" (grade 3 planos consumindo `/api/stripe/config`)
- `/lojista/assinaturas` — redirect 301-like para `/lojista/plano` (rota aposentada)
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
Routes: `POST /api/admin/login`, `GET /api/admin/stats` (comprehensive: KPIs, byPlan, byRegion, byCategory, topBusinesses, recentBusinesses, clicksByDay, estimatedRevenue),
`GET|PATCH|DELETE /api/admin/businesses`, `GET /api/admin/businesses/:id` (detail w/ products, lojista, clickBreakdown),
`GET|POST|PATCH|DELETE /api/admin/categories`
Env vars: `JWT_SECRET` (auto-generated), `ADMIN_PASSWORD` (user secret)
Admin Dashboard: 6 KPI cards, plan/region/category distributions, top 10 businesses, recent signups feed, visibility summary.
Stats v2: `realRevenue` (MRR vindo de `subscriptions` ativas + `boostsRevenueMonth` somando `search_boosts.price`); `estimatedRevenue` mantida como potencial baseado em `byPlan` × preços atuais (R$59,90/R$89,90); `mrrFromSubs`/`boostsRevenueMonth`/`subsBreakdown` expostos para diagnóstico. `activeLojistas` = `count(business_users) WHERE last_login_at >= now()-30d` (coluna `lastLoginAt` atualizada no `POST /api/lojista/login`); `totalLojistas` é o total cadastrado.
Admin Negócios: clickable rows with detail modal (all fields, products, metrics), region-based filtering from admin-scoped data

**Lojista API**: Direct fetch calls via `src/lib/lojista-api.ts` (JWT Bearer auth)
Routes: `POST /api/lojista/login`, `GET|PATCH /api/lojista/profile`, `POST /api/lojista/upload/{logo,banner,photo}`,
`DELETE /api/lojista/photos/:index`, `GET /api/lojista/cep/:cep`, `PATCH /api/lojista/location`,
`GET|POST /api/lojista/products`, `PATCH /api/lojista/products/reorder`, `PATCH|DELETE /api/lojista/products/:id`,
`GET /api/lojista/metrics`, `PATCH /api/lojista/password`

**DB Schema**:
- `businesses` — extended with cnpj, ownerName, ownerEmail, ownerPhone, logoUrl, bannerUrl, photos[], cep, street, number, neighborhood, city, state, lat, lng, instagram, website, paymentMethods[], tags[], videoUrl, boostedUntil (legacy), homeFeatured
- `business_users` — lojista login accounts (email+bcrypt hash, FK to businesses)
- `products` — product catalog per business (name, description, price, media, sortOrder)
- `business_clicks` — click event history (type: profile/whatsapp/phone/maps, visitorId)
- `reviews` — with visitorId, verified, ownerResponse
- `home_banners` — rotating hero banners (max 2 active, CRUD admin)
- `search_boosts` — boost auction system (5 monthly fixed positions by bid + avulso timed boosts). businessId UNIQUE FK, position 1-5, boostType monthly|avulso, status active|waitlist|expired
- Uploads served at `/api/uploads/{logos,banners,photos}/` — MIME filtered (jpg/png/webp/gif only)

**Boost System**:
- Categoria (auto-serviço, Premium-only): 5 posições mensais R$149/R$119/R$99/R$79/R$59. Compra direta no cartão via Stripe Checkout. Waitlist se posição ocupada. Duração 30d. Price IDs em `STRIPE_BOOST_CAT_{1..5}_PRICE_ID`. Endpoints `GET /api/lojista/boosts/category-positions` e `POST /api/lojista/boosts/category-checkout`. Webhook `payment_intent.succeeded` com `boostContext=category` insere em `searchBoosts(boostType=monthly, boostContext=category, position 1-5)` com `pg_advisory_xact_lock` por posição. Locks determinísticos em `api-server/src/lib/boost-locks.ts` (chaves int32 `[ns:8|slot:24]`, sem hash de string — ns=1 categoria, ns=2 zona, ns=3 home_search). Enum `boost_context` (lib/db/schema): search|zone|home_search|category.
- Avulso: 7d=R$29, 15d=R$49, 30d=R$79. Contato WhatsApp.
- Zona / Home+Busca / Banner Home: vendidos em `LojistaBoost` via `/lojista/boosts/checkout` (zone/home_search) e `/lojista/home-banner/checkout`.
- Ordering: monthly boosted (position ASC) → avulso boosted (rating DESC) → premium → destaque → free
- Expiration job: `api-server/src/lib/boost-expiration.ts` — runs on startup + every 1h.
- API: `GET /api/lojista/boost-positions` — view legacy de posições.

**DB Seed**: 10 categories, 20 businesses (real Londrina data), 20 lojista accounts, 42 products, 10 reviews
Default lojista password: Hub@2026 (all accounts)

**Plan Enforcement**:
- Backend: all plan checks read from DB (not JWT). Profile PATCH blocks instagram/website for free, videoUrl for non-premium. Products PATCH/DELETE/reorder require premium. Metrics blocks free, chart series only for premium. Review respond requires destaque+. Admin boosts require premium on business.
- Frontend: `LockedFeature` component (`src/components/LockedFeature.tsx`) provides inline blur overlay or full-page lock card with plan upgrade CTA. Used in LojistaFotos (logo/banner), LojistaPerfil (instagram/website/videoUrl), LojistaProdutos (full page), LojistaMetricas (full page + chart), LojistaBoost (premium warning).
- `checkPlan.ts` middleware available at `api-server/src/middleware/checkPlan.ts` (reusable `requirePlan` factory).

**Pricing Plans**:
- Gratuito: R$0/mês
- Base (Destaque): R$59,90/mês ou R$598,80/ano (R$49,90/mês)
- Premium: R$89,90/mês ou R$958,80/ano (R$79,90/mês)

**Stripe — Sync pós-checkout (09/05/2026)**:
- `POST /api/lojista/stripe/sync { sessionId }` (auth lojista) — sincroniza plano direto via Stripe API (não depende do webhook). Valida `session.metadata.businessId === lojista.businessId` (403 se diferente). Fallback sem sessionId busca subscription do customer já vinculado ao próprio businessId.
- `POST /api/lojista/boosts/sync { sessionId }` (auth lojista) — replica lógica idempotente do webhook `payment_intent.succeeded` para boosts (categoria 1-5, zone, home_search) e do `checkout.session.completed` para `kind=home_banner_request`. Usa as mesmas `pg_advisory_xact_lock` e checagens `existingMine`. Só processa se `session.payment_status === "paid"`.
- Todos os success_urls de checkout incluem `&session_id={CHECKOUT_SESSION_ID}` (planos, boost zone/home_search, boost categoria, banner home).
- Frontend: `LojistaDashboard.tsx` (planos) e `LojistaBoost.tsx` (boosts) chamam o sync ao detectar `?*success*&session_id=...`. Captura imutável `INITIAL_PAYMENT_INFO` em `LojistaDashboard.tsx` evita cleanup prematuro do useEffect quando a URL é limpa via `replaceState`.
- Bug histórico: `lojista_token` vs `hub_lojista_token` (chave do localStorage) — agora todas as chamadas autenticadas usam `lojistaFetch()` que pega a chave correta de `LOJISTA_STORAGE_KEYS`.

**Stripe Integration**:
- Subscriptions table: `lib/db/src/schema/subscriptions.ts` (businessId, stripeCustomerId, stripeSubscriptionId, stripePriceId, plan, status, currentPeriodEnd, cancelAtPeriodEnd)
- Routes: `artifacts/api-server/src/routes/stripe.ts`
  - `GET /api/stripe/config` — returns publishableKey + 4 price IDs (public)
  - `POST /api/stripe/checkout` — creates Stripe Checkout session (lojista auth)
  - `POST /api/stripe/portal` — creates Stripe Billing Portal session (lojista auth)
  - `GET /api/stripe/subscription` — returns current subscription info (lojista auth)
  - `POST /api/stripe/webhook` — handles Stripe events (raw body, signature verified)
- Webhook events: checkout.session.completed, invoice.payment_succeeded, invoice.payment_failed, customer.subscription.updated, customer.subscription.deleted
- On payment success: sets business.planType to "destaque" or "premium"
- On cancellation/failure: reverts business.planType to "free"
- Frontend: LojistaPlano.tsx fully integrated — mensal/anual toggle, real checkout buttons, Billing Portal access, subscription status card
- Required secrets: STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY, STRIPE_BASE_PRICE_ID, STRIPE_BASE_ANNUAL_PRICE_ID, STRIPE_PREMIUM_PRICE_ID, STRIPE_PREMIUM_ANNUAL_PRICE_ID, STRIPE_WEBHOOK_SECRET, STRIPE_ZONE_BOOST_PRICE_ID, STRIPE_HOME_SEARCH_BOOST_PRICE_ID, STRIPE_HOME_BANNER_PRICE_ID, STRIPE_BOOST_CAT_{1..5}_PRICE_ID
- `/api/stripe/config` (público) — fonte única de preços/planos/boosts. Retorna `prices` (todos price IDs incl. `category_boosts.{1..5}`), `plans` (free/destaque/premium com `monthlyDisplay`/`annualDisplay`/`features`) e `boosts` (metadata categoria/zona/home_search/home_banner). LojistaPlano consome `plans` no fallback. Pendente: `anuncie.tsx` consumir `prices`/`plans`.

**Rotas aposentadas (Sprint 2.4)**:
- `businesses.ts` `/zones/:zone/stats` e `/zones/:zone/businesses` removidos (duplicavam `zones.ts:108/165`).
- `reviews.ts` `/reviews?businessId=` removido (use `/businesses/:id/reviews`).
- `LojistaAssinaturas.tsx` removido — fundido em `LojistaPlano.tsx` via abas.

**Sprint 4 — Operação Madura** (✅ completo):
- 4.1 Global error handler em `app.ts` (próximo após routes) — captura unhandled errors, integra com Sentry, retorna 500 padronizado. `process.on('unhandledRejection'|'uncaughtException')` em `index.ts`.
- 4.2 Tabela `admin_actions` (id, adminId, action, targetType, targetId, details, ip, createdAt). Helper `lib/audit.ts` (`logAdminAction`, `getReqIp`, `ADMIN_DEFAULT_ID=1`). Audit calls em admin.ts (PATCH businesses status/plan/visibility, DELETE business, POST/DELETE boost, banner approve/reject, review delete, impersonate) e documents.ts (approve/reject). `GET /admin/audit-log?targetType=&adminId=&limit=`.
- 4.3 LGPD: `DELETE /api/lojista/account` (auth lojista) — valida senha, cancela Stripe sub, deleta documentos GCS (best-effort), anonimiza `businesses` (sentinelEmail `removed_<id>@deleted.hub`, status="deleted", isVisible=false, planType="free", limpa PII e mídia) e `business_users` (email sentinel, passwordHash="", flags resetados).
- 4.4 Moderação reviews admin: `GET /admin/reviews?businessId=&rating=&limit=` (join business name) e `DELETE /admin/reviews/:id` — recalcula `businesses.rating` (AVG) e `reviewsCount` após exclusão.
- 4.5 Sentry graceful: `lib/sentry.ts` (`initSentry()`, `captureException()`) — silencioso sem `SENTRY_DSN`. Importado de `@sentry/node` (externalizado no esbuild para evitar bundling de `@opentelemetry/*`). Init chamado em `index.ts` antes do listen. Capture invocado pelo error handler em `app.ts`.
- 4.6 Impersonate lojista: `POST /api/admin/impersonate/:businessId` — gera JWT 1h `{businessId, email, role:"lojista", impersonated:true}`. Frontend admin abre `/lojista?impersonate=<token>` em nova aba; `lojista-api.ts` consome o token via IIFE no carregamento do módulo (move para localStorage e limpa o query). Audita `lojista.impersonate`.

**Sprint Backlog B1-B6** (esta sessão):
- B1 SSR `/negocio/:id` (`server.mjs`): `og:image`, `canonical`, twitter cards, `og:url`, `og:type` injetados via `replaceMeta()`.
- B2 Performance: `negocio.tsx` componente `VitrineVideo` com `IntersectionObserver(threshold:0.5)` — toca/pausa conforme visibilidade; substitui `useEffect` global de `play()` em todos os vídeos.
- B3 Stripe: `GET /api/stripe/invoices` retorna até 24 faturas (`number, amountPaid, status, hostedInvoiceUrl, invoicePdf, periodStart/End`). UI: `LojistaPlano > VisaoGeral > InvoicesSection` (tabela com badge status, links Ver/PDF).
- B4 Suporte: tabela `support_tickets` (businessId FK cascade, subject 200, message 5000, status open|in_progress|resolved|closed, priority low|normal|high|urgent, adminResponse 5000, respondedAt, createdAt, updatedAt). Endpoints `GET|POST /api/lojista/support` (auth lojista, validação 1-200/1-5000, priority allowlist) e `GET /api/admin/support?status=&priority=&limit=` + `PATCH /api/admin/support/:id` (auto-resolve quando há resposta, audit `support.update`, email `emails.suporteRespondido`). Páginas: `LojistaSuporte.tsx` (criar/listar com filtros visuais), `AdminSuporte.tsx` (tabela + modal resposta + quickStatus). Nav links em `LojistaLayout` (HelpCircle) e `AdminLayout` (MessageSquare).
- B5 `BusinessCard.tsx` reescrito com `Pill` helper e tons consistentes (orange/gold/green/blue/purple) — Zap (boost), Crown (premium), CheckCircle2 (verificado), ThumbsUp (recomendado), Trophy (top).
- B6 Hero mobile: `landing.tsx` hero com `min-h-[100svh] md:min-h-0` (preserva style height clamp existente) — usa viewport unit estável em iOS Safari.

**Frontend Sprint 4** (admin):
- `pages/admin/AdminAuditLog.tsx` — tabela de auditoria com filtros tipo/limit, badges coloridos por ação.
- `pages/admin/AdminReviews.tsx` — moderação reviews com filtros businessId/rating, exclusão recalcula rating do negócio.
- `pages/admin/AdminLayout.tsx` — links nav adicionais "Reviews" + "Audit Log".
- `pages/admin/AdminNegocios.tsx` — botão LogIn (impersonate) ao lado de excluir.
- `pages/lojista/LojistaSenha.tsx` — seção "zona de risco" com modal de exclusão de conta (senha + digite "EXCLUIR" para confirmar).
- `App.tsx` — rotas `/admin/reviews` e `/admin/audit-log`.

**Sprint 3 — Schema & Backend Consolidation**:
- 3.1: `search_boosts.updated_at` timestamp adicionado.
- 3.2: UNIQUE INDEX `reviews_visitor_business_uidx(business_id, visitor_id)` em reviews.
- 3.3: FKs adicionadas — `businesses.category_slug→categories.slug`, `businesses.zone→zones.slug`, `search_boosts.zone→zones.slug`.
- 3.4: `business_users.email_verified` migrado de `text("false"/"true")` para `boolean("email_verified_bool")`. Backend (`admin.ts`, `auth.ts`) atualizado.
- 3.5: Índices adicionados em `subscriptions(stripe_subscription_id, status)` e `home_banners(active, status)`.
- 3.6: Tabela `job_runs` criada. Helper `runOnceDaily()` em `api-server/src/lib/job-checkpoint.ts`. Os 3 jobs (boost-expiration, documentation-job, subscription-job) agora usam checkpoint diário — evitam re-execução em restart do servidor no mesmo dia.
- 3.7: View `business_placements_active` criada via `ensureViews()` no startup. Endpoint `GET /api/admin/placements` (filtros opcionais `?zone=&planType=`) retorna todos os negócios com destaque ativo (boostedUntil, homeFeatured, zoneFeatured, search_boosts active).
