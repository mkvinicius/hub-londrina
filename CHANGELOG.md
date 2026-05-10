# Hub Londrina — Histórico de mudanças

> Decisões e bugfixes em ordem cronológica reversa. Para regras vigentes ver `RULES.md`.

---

## 2026-05-10

### Vitrine de Produtos — backend implementado
- **DB**: `products` ganhou `videoUrl`, `videoStatus` (enum none/pending/approved/rejected), `videoApprovedAt`, `videoRejectionReason`. Nova tabela `vitrine_boosts` com unique index parcial `WHERE status='active'` por businessId.
- **Endpoint público**: `GET /api/vitrine` retorna até 12 cards (4 boosts fixos + 8 rotação aleatória de Premium com vídeo aprovado). Devolve `cards: []` se total < 6.
- **Lojista**:
  - `POST /lojista/upload/vitrine-video` (Premium-only, MP4 ≤ 20 MB).
  - `POST/PATCH /lojista/products` aceita `videoUrl` — ao setar/alterar marca `videoStatus='pending'` e zera `videoApprovedAt/RejectionReason`.
  - `GET /lojista/vitrine-boost/status` — slots ocupados, slot do lojista, elegibilidade.
  - `POST /lojista/vitrine-boost/checkout` — Stripe subscription R$ 49/mês (price `STRIPE_VITRINE_BOOST_PRICE_ID`). Gates: Premium + ≥1 vídeo aprovado + sem boost ativo/pending. Cria registro `pending` no DB com `stripeSessionId`.
  - `POST /lojista/vitrine-boost/sync` — confirma sessão pós-checkout, ativa slot ou coloca em `waitlist` se 4 slots cheios.
- **Admin**:
  - `GET /admin/vitrine/pending` — fila de vídeos aguardando aprovação.
  - `GET /admin/vitrine/boosts` — visão dos slots ativos / waitlist / pending.
  - `POST /admin/products/:id/video/approve` — marca vídeo aprovado (com audit log).
  - `POST /admin/products/:id/video/reject` { reason } — marca vídeo rejeitado.
- **Stripe webhook**: `customer.subscription.deleted` com metadata `kind=vitrine_boost` cancela o slot e promove o `waitlist` mais antigo automaticamente; não rebaixa o plano do lojista.
- **Validação**: `validate-lojista-rules.mjs` ganhou R11.a/b/c (free → 403, premium s/ vídeo → 409 NO_APPROVED_VIDEO, /api/vitrine respeita teto/mínimo).
- **Pendente próxima sessão**: substituir mock em `landing.tsx` pelo consumo real de `/api/vitrine`; UI lojista (`LojistaProdutos` upload de vídeo) e admin (fila de aprovação).

### Vitrine de Produtos — UI completa
- **Landing**: `landing.tsx` agora consome `GET /api/vitrine` via TanStack Query (`staleTime: 0`, `gcTime: 0` para respeitar a rotação aleatória do servidor). Mock 5-produtos removido. `VitrineCard` reescrito com shape do servidor (`{productId, businessId, name, price, videoUrl, photoUrl, whatsapp, businessName, fixed}`), badge "★ destaque" para slots fixos, click → `/negocio/:id`, WhatsApp com mensagem pré-preenchida. Bloco inteiro só renderiza se `cards.length > 0` (servidor já aplica regra "<6 esconde").
- **Lojista**: `LojistaProdutos.tsx` ganhou seção "Vídeo da Vitrine" no formulário de produto (Premium-only) com upload MP4 ≤ 20 MB para `/lojista/upload/vitrine-video`, validação client-side de tipo/tamanho, badge de status (aprovado/pendente/rejeitado + motivo) e botão "Trocar/Remover". Lista de produtos exibe pill colorida com `videoStatus` para visibilidade rápida.
- **Admin**: `AdminImpulsionamento.tsx` ganhou seção `AdminVitrineSection` no topo com (a) fila "Aguardando aprovação" com preview `<video controls>` + botões Aprovar/Rejeitar (motivo via prompt → enviado ao lojista) e (b) painel "Slots fixos pagos" mostrando `active`/`waitlist` (4 vagas).
- **API client**: `lojista-api.ts` ganhou `uploadVitrineVideo / getVitrineBoostStatus / createVitrineBoostCheckout / syncVitrineBoost`. `admin-api.ts` ganhou `getAdminVitrinePending / getAdminVitrineBoosts / approveVitrineVideo / rejectVitrineVideo` com tipos.
- **Decisão**: CTA "Vitrine Destaque R$49/mês" em `LojistaBoost.tsx` adiada para follow-up — Premium já entra na rotação automaticamente ao ter vídeo aprovado; o boost de slot fixo é uma evolução, não bloqueador.

### Vitrine de Produtos — regra definida
- Discussão de pricing fechou com: Premium R$ 89,90 inclui 1 vídeo na rotação aleatória da Vitrine; boost "Vitrine Destaque" custa +R$ 49/mês para Premium garantir slot fixo nos 4 primeiros.
- Decisão de design: 12 cards visuais (4 fixos pagos + 8 rotação Premium); mínimo de 6 para renderizar bloco; vídeo obrigatório para entrar; aprovação admin antes de publicar.
- Premium sem vídeo não é cobrado nem obrigado — perde aparição e recebe aviso no dashboard ("você está perdendo aparições, suba 1 vídeo").
- Bloco em `landing.tsx` hoje está 100% mockado (5 produtos hard-coded com vídeos `/videos/vitrine-*.mp4` inexistentes e negócios fictícios). Implementação real fica para próxima sessão.
- Ver invariantes em `RULES.md` R11.

---

## 2026-05-09

### Bugs lojista free — CTAs de boost e fallback de zona
- **Dashboard "Zona não definida"**: `LojistaDashboard.tsx` ganhou fallback `profile?.zone || profile?.region`. DB confirmado tem ambos preenchidos pelo cadastro; fallback é defensivo.
- **Boost para plano free**: `LojistaBoost.tsx` antes mostrava botão "Ver planos" clicável nos cards Zona/Home+Busca e botão de compra normal no Banner Home (R$299) e tabela de categoria. Agora todos esses CTAs aparecem como botão `disabled` cinza com tooltip + alert "Exclusivo planos Destaque/Premium" e link discreto "Ver planos".
- **Backend**: `POST /api/lojista/home-banner/checkout` ganhou gate `planType === "premium"` (antes não checava plano — risco de free comprar via API direta).
- Ver invariantes em `RULES.md` R1.

### Visibilidade pós-pagamento (crítico)
- **Sintoma**: lojista pagava plano (Destaque/Premium) mas continuava invisível em `/api/businesses`, `/api/search`, `/api/zones/:slug`.
- **Causa**: `auth.ts:210` cria negócio com `status="active"` + `isVisible=false` (esperando aprovação de docs em 10d). O auto-aprovar pós-pagamento em `stripe.ts:117` e `:812` só disparava se `status === "pending"` — jamais o caso real. Resultado: pagamento confirmado, plano vira destaque, mas `is_visible=false` até admin aprovar manualmente.
- **Fix**: condição agora é `(status === "pending" || !isVisible)` — pagamento confirmado publica imediatamente. Também marca `business_users.documentationStatus = "approved"` para evitar que o `documentation-job` derrube o negócio depois de 30d (regra free).
- **Backfill**: `lib/startup-heal.ts → healPaidInvisibleBusinesses()` roda no startup, encontra negócios com subscription paga ativa + invisível e publica. Idempotente.
- Ver `RULES.md` R2.

### Outros do dia
- **Upload 5MB → 15MB**: multer + frontend `LojistaFotos.tsx`. Error handler em `app.ts` retorna 413 amigável. (`RULES.md` R6)
- **Fotos quebradas no painel**: `routes/storage.ts` chamava `serveGCSObject(\`uploads/${gcsPath}\`)` mas `gcsPath` já vinha com prefixo `uploads/...`. Buscava `uploads/uploads/photos/...` no bucket → 404 em todos os logos/banners/photos. Fix: passar `gcsPath` direto. (`RULES.md` R5)

### Stripe sync pós-checkout
- `POST /api/lojista/stripe/sync { sessionId }` — sincroniza plano direto via Stripe API (não depende do webhook). Valida `session.metadata.businessId === lojista.businessId` (403 se diferente).
- `POST /api/lojista/boosts/sync { sessionId }` — replica lógica idempotente do webhook `payment_intent.succeeded` para boosts (categoria/zone/home_search) e `checkout.session.completed` para `kind=home_banner_request`. Usa as mesmas `pg_advisory_xact_lock` e checagens `existingMine`.
- Todos os `success_url` de checkout incluem `&session_id={CHECKOUT_SESSION_ID}`.
- Frontend: `LojistaDashboard.tsx` (planos) e `LojistaBoost.tsx` (boosts) chamam o sync ao detectar `?*success*&session_id=...`. Captura imutável `INITIAL_PAYMENT_INFO` em `LojistaDashboard.tsx` evita cleanup prematuro do useEffect.
- Bug histórico corrigido: `lojista_token` vs `hub_lojista_token` no localStorage. Agora todas as chamadas autenticadas usam `lojistaFetch()`. (`RULES.md` R4, R7)

---

## Sprints anteriores

### Sprint Backlog B1–B6
- **B1** SSR `/negocio/:id` (`server.mjs`): `og:image`, `canonical`, twitter cards, `og:url`, `og:type` injetados via `replaceMeta()`.
- **B2** Performance `negocio.tsx`: componente `VitrineVideo` com `IntersectionObserver(threshold:0.5)` — toca/pausa conforme visibilidade.
- **B3** Stripe: `GET /api/stripe/invoices` retorna até 24 faturas (`number, amountPaid, status, hostedInvoiceUrl, invoicePdf, periodStart/End`). UI: `LojistaPlano > VisaoGeral > InvoicesSection`.
- **B4** Suporte: tabela `support_tickets` (status open|in_progress|resolved|closed, priority low|normal|high|urgent). Endpoints `GET|POST /api/lojista/support` e `GET /api/admin/support` + `PATCH /api/admin/support/:id` (auto-resolve com resposta, audit, email). Páginas `LojistaSuporte.tsx` e `AdminSuporte.tsx`.
- **B5** `BusinessCard.tsx` reescrito com helper `Pill` e tons consistentes — Zap (boost), Crown (premium), CheckCircle2 (verificado), ThumbsUp (recomendado), Trophy (top).
- **B6** Hero mobile: `landing.tsx` com `min-h-[100svh] md:min-h-0` (viewport unit estável em iOS Safari).

### Sprint 4 — Operação Madura
- **4.1** Global error handler em `app.ts` (após routes) — captura unhandled, integra Sentry, retorna 500 padronizado. `process.on('unhandledRejection'|'uncaughtException')` em `index.ts`.
- **4.2** Tabela `admin_actions` (id, adminId, action, targetType, targetId, details, ip, createdAt). Helper `lib/audit.ts`. Audit em admin.ts (PATCH businesses, DELETE business, POST/DELETE boost, banner approve/reject, review delete, impersonate) e documents.ts. `GET /admin/audit-log?targetType=&adminId=&limit=`.
- **4.3** LGPD: `DELETE /api/lojista/account` — valida senha, cancela Stripe sub, deleta documentos GCS, anonimiza `businesses` (`removed_<id>@deleted.hub`, status="deleted") e `business_users`.
- **4.4** Moderação reviews admin: `GET /admin/reviews?businessId=&rating=&limit=` e `DELETE /admin/reviews/:id` — recalcula `businesses.rating` e `reviewsCount`.
- **4.5** Sentry graceful: `lib/sentry.ts` (`initSentry`, `captureException`) — silencioso sem `SENTRY_DSN`. Importado de `@sentry/node` (externalizado no esbuild para evitar bundling de `@opentelemetry/*`).
- **4.6** Impersonate lojista: `POST /api/admin/impersonate/:businessId` — gera JWT 1h `{businessId, email, role:"lojista", impersonated:true}`. Frontend admin abre `/lojista?impersonate=<token>`; `lojista-api.ts` consome via IIFE no carregamento do módulo.

### Sprint 4 frontend (admin)
- `pages/admin/AdminAuditLog.tsx` — tabela com filtros tipo/limit, badges por ação.
- `pages/admin/AdminReviews.tsx` — moderação com filtros businessId/rating.
- `pages/admin/AdminLayout.tsx` — links nav "Reviews" + "Audit Log".
- `pages/admin/AdminNegocios.tsx` — botão LogIn (impersonate).
- `pages/lojista/LojistaSenha.tsx` — modal de exclusão de conta (senha + digitar "EXCLUIR").
- `App.tsx` — rotas `/admin/reviews` e `/admin/audit-log`.

### Sprint 3 — Schema & Backend Consolidation
- **3.1** `search_boosts.updated_at` adicionado.
- **3.2** UNIQUE INDEX `reviews_visitor_business_uidx(business_id, visitor_id)`.
- **3.3** FKs adicionadas: `businesses.category_slug→categories.slug`, `businesses.zone→zones.slug`, `search_boosts.zone→zones.slug`.
- **3.4** `business_users.email_verified` migrado de `text` para `boolean("email_verified_bool")`.
- **3.5** Índices em `subscriptions(stripe_subscription_id, status)` e `home_banners(active, status)`.
- **3.6** Tabela `job_runs` + helper `runOnceDaily()` em `api-server/src/lib/job-checkpoint.ts`. Os 3 jobs (boost-expiration, documentation-job, subscription-job) usam checkpoint diário.
- **3.7** View `business_placements_active` criada via `ensureViews()` no startup. Endpoint `GET /api/admin/placements?zone=&planType=`.

### Sprint 2.4 — Rotas aposentadas
- `businesses.ts` `/zones/:zone/stats` e `/zones/:zone/businesses` removidos (duplicavam `zones.ts`).
- `reviews.ts` `/reviews?businessId=` removido (use `/businesses/:id/reviews`).
- `LojistaAssinaturas.tsx` removido — fundido em `LojistaPlano.tsx` via abas.

### Stats / Admin Dashboard v2
- `realRevenue` = MRR de `subscriptions` ativas + `boostsRevenueMonth` (soma `search_boosts.price`).
- `estimatedRevenue` mantida como potencial baseado em `byPlan` × preços atuais.
- Expostos: `mrrFromSubs`, `boostsRevenueMonth`, `subsBreakdown`.
- `activeLojistas` = `count(business_users) WHERE last_login_at >= now()-30d` (coluna atualizada no `POST /api/lojista/login`).
- Admin Negócios: clickable rows com detail modal (campos, produtos, métricas), filtro por região.

### Stripe — fonte única de preços
- `GET /api/stripe/config` (público) retorna `prices` (todos price IDs incl. `category_boosts.{1..5}`), `plans` (free/destaque/premium com `monthlyDisplay`/`annualDisplay`/`features`) e `boosts` (metadata categoria/zona/home_search/home_banner). LojistaPlano consome `plans` no fallback.
- **Pendente**: `anuncie.tsx` consumir `prices`/`plans` em vez de hardcode.
