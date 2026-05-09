# Workspace

> ⚠️ **Antes de mexer em qualquer coisa, leia `RULES.md`.** Ele lista os invariantes de negócio que NÃO podem ser quebrados (gates de plano, visibilidade pós-pagamento, paths de storage, etc). Histórico de bugfixes em `CHANGELOG.md`.

## Stack

- pnpm workspaces · Node 24 · TypeScript 5.9
- Express 5 · PostgreSQL + Drizzle ORM · Zod (`zod/v4`) · Orval (OpenAPI codegen) · esbuild

## Comandos principais

- `pnpm run typecheck` — typecheck completo
- `pnpm run build` — typecheck + build
- `pnpm --filter @workspace/api-spec run codegen` — regenerar hooks/Zod do OpenAPI
- `pnpm --filter @workspace/db run push` — aplicar schema (dev)
- `pnpm --filter @workspace/api-server run dev` — rodar API local

Ver skill `pnpm-workspace` para detalhes do monorepo.

## Artifacts

### Hub Londrina — Negócio Local (`artifacts/hub-londrina`)
Diretório SaaS de negócios locais de Londrina/PR.

**Stack**: React + Vite + Wouter + TanStack Query + shadcn/ui + Tailwind no front; Express + Postgres + Drizzle no back (`artifacts/api-server`).

**Brand**: Marrom `#6F4E37` · Laranja `#FF9800` · Verde `#4CAF50` · Bege `#F5F5DC` · Playfair Display (títulos) + Inter (corpo).

**Rotas públicas**: `/` · `/categorias` · `/busca` · `/negocio/:id` · `/anuncie`

**Rotas admin** (SPA, JWT): `/admin/login` · `/admin` · `/admin/negocios` · `/admin/categorias` · `/admin/impulsionamento` · `/admin/home-banners` · `/admin/zonas` · `/admin/suporte` · `/admin/reviews` · `/admin/audit-log`

**Rotas lojista** (SPA, JWT 7d): `/lojista/login` · `/lojista` · `/lojista/perfil` · `/lojista/fotos` · `/lojista/produtos` · `/lojista/metricas` · `/lojista/avaliacoes` · `/lojista/suporte` · `/lojista/boost` · `/lojista/plano` · `/lojista/senha`

**Zonas**: 5 canônicas — `centro · norte · sul · leste · oeste`. `businesses.zone` (slug) + `businesses.region` (display). Metadata em tabela `zones`, fallback `lib/zones.ts`. Endpoints aceitam `?zone=<slug>`.

**Planos**:
- Gratuito — R$0
- Base/Destaque — R$59,90/mês ou R$598,80/ano (R$49,90/mês)
- Premium — R$89,90/mês ou R$958,80/ano (R$79,90/mês)

**Tabelas chave** (DB):
`businesses` · `business_users` · `products` · `business_clicks` · `reviews` · `home_banners` · `search_boosts` · `subscriptions` · `support_tickets` · `admin_actions` · `job_runs` · `categories` · `zones`

**Endpoints chave** (resumo — ver código para lista completa):
- Público: `/api/businesses`, `/api/search`, `/api/categories`, `/api/zones[/:slug]`, `/api/businesses/:id/reviews`, `/api/home-banners`, `/api/stripe/config`
- Lojista: `/api/lojista/{login,profile,upload/*,products,metrics,reviews/:id/respond,boosts/*,home-banner/*,support,stripe/sync,boosts/sync,account}`
- Admin: `/api/admin/{login,stats,businesses,categories,zones,boosts,home-banners,reviews,audit-log,support,placements,impersonate/:businessId}`
- Stripe: `/api/stripe/{config,checkout,portal,subscription,invoices,webhook}`

**Boost system** (resumo): 4 contextos — `category` (5 posições mensais Premium R$149→R$59), `zone` (6 vagas/zona Destaque+ R$79), `home_search` (6 vagas Premium R$149), `home_banner` (Premium R$299/mês com aprovação admin). Avulso 7/15/30d via WhatsApp. Locks `pg_advisory_xact_lock` em `lib/boost-locks.ts`. Expiração horária via `boost-expiration.ts`.

**API client gerado**: `@workspace/api-client-react` — hooks Orval (apenas para públicos). Admin/lojista usam `src/lib/{admin,lojista}-api.ts` direto.

**Required secrets** (Stripe): `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_BASE_PRICE_ID`, `STRIPE_BASE_ANNUAL_PRICE_ID`, `STRIPE_PREMIUM_PRICE_ID`, `STRIPE_PREMIUM_ANNUAL_PRICE_ID`, `STRIPE_ZONE_BOOST_PRICE_ID`, `STRIPE_HOME_SEARCH_BOOST_PRICE_ID`, `STRIPE_HOME_BANNER_PRICE_ID`, `STRIPE_BOOST_CAT_{1..5}_PRICE_ID`. Outros: `JWT_SECRET`, `ADMIN_PASSWORD`, `SESSION_SECRET`, `RESEND_API_KEY`, `SENTRY_DSN` (opcional).

**Seed dev**: 10 categorias · 20 negócios reais · 20 lojistas (senha `Hub@2026`) · 42 produtos · 10 reviews.
