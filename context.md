# Hub Londrina — Contexto Completo do Projeto
# Atualizado: 12/05/2026
# LEIA ESTE ARQUIVO ANTES DE QUALQUER ALTERAÇÃO

---

## 1. IDENTIDADE DO PRODUTO

**Nome:** Hub Londrina
**Domínio:** https://www.hublondrina.com.br
**Tagline:** Feito por londrinense. Para londrinense.
**Descrição:** Diretório SaaS de negócios locais para Londrina, PR. Conecta consumidores a negócios locais organizados por zona geográfica, com perfis completos, avaliações verificadas e contato direto pelo WhatsApp.

---

## 2. STACK TÉCNICO — NÃO ALTERAR SEM NECESSIDADE

```
Camada         | Tecnologia
---------------|------------------------------------------
Frontend       | React + Vite (SPA)
Roteamento     | Wouter (useLocation, <Link>, useRoute)
Estilização    | Tailwind CSS
Backend        | Express.js (Node.js)
Linguagem      | TypeScript em todo o projeto
Banco          | PostgreSQL + Drizzle ORM
Monorepo       | pnpm workspaces
SSR            | server.mjs (Node puro, sem Next.js)
Email          | Resend (noreply@hublondrina.com.br — domínio verificado)
Pagamentos     | Stripe (checkout + webhooks + portal)
Upload         | GCS (Google Cloud Storage) via uploadBufferToGCS
PDF            | pdfkit (puro Node.js — sem puppeteer)
Domínio        | hublondrina.com.br
Hospedagem     | Replit
```

### Estrutura de pastas
```
workspace/
├── artifacts/
│   ├── hub-londrina/          ← Frontend React + Vite
│   │   └── src/
│   │       ├── pages/         → landing, categorias, busca, negocio, anuncie,
│   │       │                    Cadastro, zona, lojista/*, admin/*
│   │       ├── components/    → Layout, BusinessCard, AdminLayout,
│   │       │                    LojistaLayout, ui/
│   │       └── lib/           → icons, theme, utils, lojista-api, admin-api
│   └── api-server/            ← Backend Express
│       └── src/
│           ├── routes/        → index.ts, health.ts, businesses.ts,
│           │                    categories.ts, reviews.ts, search.ts,
│           │                    admin.ts, lojista.ts, auth.ts, stripe.ts,
│           │                    zones.ts, storage.ts, documents.ts, boosts.ts
│           ├── lib/           → boost-expiration.ts, documentation-job.ts,
│           │                    subscription-job.ts, pdf-report.ts,
│           │                    gcsUpload.ts, objectStorage.ts, logger.ts
│           ├── middleware/    → rateLimiter.ts, validateId.ts
│           └── services/      → email.ts
└── lib/
    ├── db/                    ← Schema Drizzle + conexão Postgres
    │   └── src/schema/        → businesses.ts, business-users.ts,
    │                            subscriptions.ts, search-boosts.ts,
    │                            business-documents.ts, reviews.ts,
    │                            business-clicks.ts, home-banners.ts,
    │                            categories.ts, products.ts
    ├── api-spec/              ← Tipos compartilhados
    ├── api-zod/               ← Validações Zod
    └── api-client-react/      ← Hooks React Query gerados
```

---

## 3. BANCO DE DADOS — SCHEMA COMPLETO

### Tabela `businesses`
```
id                      serial PK
name                    text NOT NULL
categorySlug            text NOT NULL
region                  text NOT NULL
description             text NOT NULL
address                 text NOT NULL
phone                   text
whatsapp                text
rating                  real DEFAULT 0
reviewsCount            integer DEFAULT 0
planType                enum(free|destaque|premium) DEFAULT 'free'
verified                boolean DEFAULT false
photoUrl                text
hours                   text
clicks                  integer DEFAULT 0
whatsappClicks          integer DEFAULT 0
isVisible               boolean DEFAULT true
zone                    text DEFAULT 'centro'
cnpj                    text
ownerName               text
ownerEmail              text
ownerPhone              text
logoUrl                 text
bannerUrl               text
photos                  text[] DEFAULT []
cep / street / number / neighborhood / city / state
lat / lng               numeric (para geolocalização Haversine)
instagram / website     text
paymentMethods          text[] DEFAULT []
tags                    text[] DEFAULT []
videoUrl                text
boostedUntil            timestamp (boost direto pelo admin)
homeFeatured            boolean DEFAULT false
zoneFeatured            boolean DEFAULT false
zoneFeaturedExpiresAt   timestamp
status                  text DEFAULT 'active' (active|pending|rejected)
rejectionReason         text
razaoSocial             text (único por LOWER — validado no PATCH)
nomeFantasia            text
planFrozen              boolean DEFAULT false (congela plano quando docs expiram)
createdAt               timestamp DEFAULT now()
```
Índices: categorySlug, region, rating, zone, status, isVisible, planType, (lat,lng), (status,isVisible,planType)

### Tabela `business_users`
```
id                          serial PK
businessId                  FK → businesses.id CASCADE
email                       text UNIQUE
passwordHash                text
passwordResetToken          text
passwordResetExpiresAt      timestamp
emailVerified               boolean DEFAULT false  (coluna email_verified_bool)
emailVerificationToken      text
firstLoginAt                timestamp (iniciado no 1º login)
documentationDeadline       timestamp (firstLoginAt + 10 dias)
documentationStatus         text DEFAULT 'pending'
                              (pending|submitted|approved|rejected|expired)
documentationRemainingDays  integer DEFAULT 10
documentationTimerPaused    boolean DEFAULT false
createdAt                   timestamp DEFAULT now()
```

### Tabela `subscriptions`
```
id                    serial PK
businessId            FK → businesses.id UNIQUE
stripeCustomerId      text NOT NULL
stripeSubscriptionId  text
stripePriceId         text
plan                  text NOT NULL (free|destaque|premium)
status                text NOT NULL (active|past_due|canceled|trialing...)
currentPeriodStart    timestamp
currentPeriodEnd      timestamp
cancelAtPeriodEnd     boolean DEFAULT false
createdAt / updatedAt timestamp
```

### Tabela `search_boosts`
```
id            serial PK
businessId    FK → businesses.id
monthlyBid    numeric NOT NULL
position      integer
boostType     enum(monthly|avulso) NOT NULL
boostContext  enum(search|zone|home_search) DEFAULT 'search'
zone          text (nullable — usada para boostContext='zone')
status        text DEFAULT 'active' (active|expired|waitlist)
durationDays  integer
price         numeric
startsAt      timestamp DEFAULT now()
expiresAt     timestamp
createdAt     timestamp DEFAULT now()
```
Índices: status, expiresAt, boostContext, zone

### Tabela `business_documents`
```
id              serial PK
businessId      FK → businesses.id CASCADE
documentType    text (personal_id|cnpj_card|address_proof)
fileUrl         text (formato: "private://documents/{bid}/{type}-{ts}.ext")
status          text DEFAULT 'submitted' (submitted|approved|rejected)
rejectionReason text
submittedAt     timestamp DEFAULT now()
reviewedAt      timestamp
```
Índices: businessId, status

### Tabela `reviews`
```
id          serial PK
businessId  FK → businesses.id CASCADE
author      text NOT NULL
rating      integer NOT NULL
text        text DEFAULT ''
visitorId   text (fingerprint do visitante)
verified    boolean DEFAULT false
ownerResponse text (resposta pública do dono)
createdAt   timestamp DEFAULT now()
```

### Tabela `home_banners`
```
id          serial PK
businessId  FK → businesses.id SET NULL
title       text NOT NULL
imageUrl    text NOT NULL
linkUrl     text
active      boolean DEFAULT true
endsAt      timestamp (auto-desativado pelo job)
createdAt   timestamp DEFAULT now()
```

### Tabela `business_clicks`
```
id          serial PK
businessId  FK → businesses.id CASCADE
type        text (profile|whatsapp|phone)
visitorId   text
createdAt   timestamp DEFAULT now()
```
Índices: businessId, createdAt

### Tabela `categories`
```
id / name / slug / icon / color / businessCount
```

### Tabela `products`
```
id / businessId / name / description / price / imageUrl / videoUrl / order / active
```

### Tabela `zones`
```
id          serial PK
slug        text UNIQUE NOT NULL  (centro|norte|sul|leste|oeste)
name        text NOT NULL          (display: "Zona Centro", "Zona Norte"...)
description text
icon        text
color       text
order       integer DEFAULT 0
createdAt   timestamp DEFAULT now()
```
Metadata canônica das 5 zonas. Fallback em `lib/zones.ts`.

### Tabela `job_runs`
```
id          serial PK
jobName     text NOT NULL  (boost-expiration | documentation-job | subscription-job | reminder-job...)
ranAt       timestamp DEFAULT now()
status      text           (success | failed | partial)
durationMs  integer
detailsJson jsonb          (contadores, erros, payload de execução)
```
Checkpoint de execução de cron jobs — usado para idempotência diária e auditoria.

### Tabela `admin_actions`
```
id          serial PK
adminId     text                  (identificador do admin que executou)
action      text NOT NULL         (approve_doc | reject_doc | boost_grant | boost_revoke |
                                    business_edit | business_delete | impersonate | banner_approve...)
targetType  text                  (business | review | banner | subscription | document)
targetId    integer
metadata    jsonb                 (snapshot de antes/depois, motivo, etc)
createdAt   timestamp DEFAULT now()
```
Audit log de toda ação sensível do painel admin.

### Tabela `support_tickets`
```
id            serial PK
businessId    FK → businesses.id (nullable — público pode abrir sem login)
authorEmail   text
authorName    text
subject       text NOT NULL
message       text NOT NULL
status        text DEFAULT 'open'   (open | in_progress | resolved | closed)
priority      text DEFAULT 'normal' (low | normal | high | urgent)
adminResponse text
respondedAt   timestamp
createdAt     timestamp DEFAULT now()
updatedAt     timestamp DEFAULT now()
```
Tickets de suporte abertos por lojistas (`/lojista/suporte`) ou administrados em `/admin/suporte`.

---

## 4. BACKEND — TODOS OS ENDPOINTS

### 4.1 Públicos

#### Negócios (`businesses.ts`)
```
GET  /api/businesses              Lista com filtros (category, region, zone, sort)
                                   Ordenação hierárquica:
                                   monthly boosted (pos) > avulso boosted >
                                   boostedUntil > premium > destaque > free
GET  /api/businesses/nearby       Geolocalização Haversine (?lat=&lng=&radius=5)
GET  /api/businesses/:id          Perfil completo + incrementa clicks
GET  /api/businesses/:id/reviews  Lista de avaliações
POST /api/businesses/:id/review   Enviar avaliação (CSRF + rate limit)
POST /api/businesses/:id/click-whatsapp  Incrementa whatsappClicks
GET  /api/regions                 Lista de regiões distintas
GET  /api/stats                   totalBusinesses, totalCategories, totalZones (SSR)
GET  /api/autocomplete?q=         Patrocinados (boostContext=search) + sugestões
GET  /api/home-featured           Negócios em destaque na home (homeFeatured=true)
GET  /api/categories/:slug/featured  Até 3 negócios da categoria com boost ativo (boostContext='category')
GET  /api/home-banners            Banners ativos da home
```

#### Busca (`search.ts`)
```
GET  /api/search?q=&category=&region=&sort=
     Ordenação: PLAN_ORDER (premium>destaque>free) + rating + completeness + clicks
     Filtros: sinonímia de categorias, normalização de acentos
     Retorna: _boostBadge (Patrocinado|Impulsionado)
```

#### Zonas (`zones.ts`)
```
GET  /api/zones/:zone/stats       Estatísticas da zona
GET  /api/zones/:zone/businesses  Negócios da zona com paginação
```

#### Categorias, Healthz, Storage
```
GET  /api/categories                     Lista de categorias
GET  /api/healthz                        Health check
GET  /api/storage/objects/*filePath      Serve arquivos de object storage
GET  /api/documents/signed/:token        Download de documento por JWT 1h
```

---

### 4.2 Lojista (`/api/lojista/*`)

**Auth:** JWT Bearer token `hub_lojista_token` (localStorage), payload `{businessId, email, role:"lojista"}`, expira 7d.

**Registro e Login**
```
POST /api/lojista/register           Cadastro novo lojista (cria business + user)
POST /api/lojista/login              Login (loginLimiter)
                                      1º login: inicia timer de 10 dias de documentação
```

**Perfil**
```
GET   /api/lojista/profile           Perfil completo + boost ativo
PATCH /api/lojista/profile           Atualiza: nome, razaoSocial (único), nomeFantasia,
                                      cnpj, ownerName, phone, whatsapp, description,
                                      address, hours, instagram, website, paymentMethods, tags
GET   /api/lojista/cep/:cep          Lookup ViaCEP → {street, neighborhood, city, state}
PATCH /api/lojista/location          Geocodificação via Nominatim (lat/lng)
PATCH /api/lojista/password          Troca de senha (bcrypt)
```

**Uploads (GCS)**
```
POST   /api/lojista/upload/logo          Logo (JPG/PNG/WebP/GIF)
POST   /api/lojista/upload/banner        Banner
POST   /api/lojista/upload/photo         Fotos adicionais
DELETE /api/lojista/photos/:index        Remove foto por índice
POST   /api/lojista/upload/product-media Mídia de produto
```

**Produtos**
```
GET    /api/lojista/products             Lista produtos
POST   /api/lojista/products             Cria produto
PATCH  /api/lojista/products/reorder     Reordena (drag-and-drop)
PATCH  /api/lojista/products/:id         Edita produto
DELETE /api/lojista/products/:id         Remove produto
```

**Métricas**
```
GET /api/lojista/metrics              Destaque+: totalClicks, whatsappClicks,
                                       phoneClicks, profileViews, planType
                                       Premium+: last30Days (daily clicks array)
GET /api/lojista/report/pdf?month=    Premium apenas — gera PDF com pdfkit
                                       Conteúdo: métricas, gráfico diário,
                                       boost status, recomendações automáticas
                                       Cache 1h em /tmp/hub-reports/{id}-{month}.pdf
```

**Avaliações**
```
GET    /api/lojista/reviews                    Lista avaliações do negócio
POST   /api/lojista/reviews/:id/respond        Resposta pública do dono
DELETE /api/lojista/reviews/:id/respond        Remove resposta
```

**Documentação (`documents.ts`)**
```
POST /api/lojista/documents   Upload documento (personal_id|cnpj_card|address_proof)
                               Salvo em private://documents/{bid}/{type}-{ts}.ext
                               Pausa timer se 3 docs enviados + nenhum rejeitado
                               cnpj_card: valida via ReceitaWS (alerta admin, não bloqueia)
GET  /api/lojista/documents   Lista documentos + documentationStatus/RemainingDays/etc
```

**Suporte**
```
GET   /api/lojista/support            Lista tickets do próprio negócio
POST  /api/lojista/support            Abre novo ticket (subject, message, priority)
                                       Cria registro em support_tickets vinculado ao businessId
```

**Impulsionamento (`boosts.ts`)**
```
GET  /api/lojista/boosts/availability   Verifica vagas (max 6) por contexto/zona
                                         Retorna: plan, zone, zoneAvailability, homeSearchAvailability
POST /api/lojista/boosts/checkout       Inicia checkout Stripe para zone ou home_search
                                         Se vagas cheias → status=waitlist
GET  /api/lojista/boost-positions       Lista posições disponíveis (busca patrocinada)
```

---

### 4.3 Admin (`/api/admin/*`)

**Auth:** JWT Bearer + ADMIN_PASSWORD (24h)

**Negócios**
```
GET    /api/admin/businesses             Lista (filtros: status, zone, planType)
GET    /api/admin/businesses/:id         Detalhe (inclui razaoSocial, nomeFantasia)
PATCH  /api/admin/businesses/:id         Edição completa
DELETE /api/admin/businesses/:id         Remoção
POST   /api/admin/businesses/:id/boost          Ativar boostedUntil (dias)
DELETE /api/admin/businesses/:id/boost          Remover boost direto
PATCH  /api/admin/businesses/:id/home-featured  Toggle homeFeatured
```

**Lojistas / Assinaturas**
```
GET   /api/admin/lojistas                  Lista lojistas
POST  /api/admin/lojistas/:id/reset-password  Reset de senha
GET   /api/admin/subscriptions             Lista assinaturas Stripe
PATCH /api/admin/subscriptions/:id/extend  Estender período
```

**Categorias**
```
GET    /api/admin/categories
POST   /api/admin/categories
PATCH  /api/admin/categories/:id
DELETE /api/admin/categories/:id
```

**Boosts (busca patrocinada)**
```
GET    /api/admin/boosts             Lista boosts context=search
POST   /api/admin/boosts             Criar boost mensal
PATCH  /api/admin/boosts/:id         Editar
DELETE /api/admin/boosts/:id         Remover
GET    /api/admin/boosts-extra       Boosts zone + home_search
POST   /api/admin/boosts-extra       Criar boost especial
DELETE /api/admin/boosts-extra/:id   Remover boost especial
```

**Cadastros Pendentes**
```
GET  /api/admin/cadastros   Negócios com status=pending, ordenados por urgência
```

**Documentação**
```
GET   /api/admin/documents           Lista lojistas pending/submitted/rejected/expired
PATCH /api/admin/documents/:id       {action:"approve"|"reject", reason?}
                                      Aprovar todos 3 docs → documentationStatus=approved,
                                      isVisible=true, planFrozen=false
                                      Rejeitar → timer despausado, email com motivo
```

**Home Banners**
```
GET    /api/admin/home-banners
POST   /api/admin/home-banners       Cria banner (título, imageUrl, linkUrl, endsAt)
PATCH  /api/admin/home-banners/:id   Edita
DELETE /api/admin/home-banners/:id   Remove
```

**Stats**
```
GET /api/admin/stats   Dashboard: totalBusinesses, totalPremium, totalDestaque,
                        recentSignups, boostRevenue, etc.
```

**Audit Log**
```
GET /api/admin/audit-log   Lista admin_actions ordenadas por createdAt DESC
                            Filtros: action, targetType, targetId, adminId, intervalo
                            Usado em /admin/audit-log
```

**Reviews (moderação)**
```
GET    /api/admin/reviews             Lista todas as reviews (filtros: businessId, rating, verified)
DELETE /api/admin/reviews/:id         Remove review (registra em admin_actions)
PATCH  /api/admin/reviews/:id         Edita/marca como verified (moderação)
```

**Suporte**
```
GET   /api/admin/support              Lista support_tickets (filtros: status, priority)
GET   /api/admin/support/:id          Detalhe do ticket
PATCH /api/admin/support/:id          Atualiza status / prioridade / adminResponse
                                       Envia email de resposta ao authorEmail
```

**Impersonação**
```
POST /api/admin/impersonate/:businessId
     Gera JWT lojista temporário para o admin acessar o painel do negócio
     como se fosse o dono. Registra em admin_actions (action='impersonate').
     Usado para suporte e debugging de fluxos do lojista.
```

---

### 4.4 Stripe (`/api/stripe/*`)

**Auth:** JWT lojista (mesmo token do painel)

```
GET  /api/stripe/config        PRICE_IDs por plano/ciclo:
                                base_monthly   → STRIPE_BASE_PRICE_ID
                                base_annual    → STRIPE_BASE_ANNUAL_PRICE_ID
                                premium_monthly → STRIPE_PREMIUM_PRICE_ID
                                premium_annual → STRIPE_PREMIUM_ANNUAL_PRICE_ID

POST /api/stripe/checkout      Cria sessão Stripe Checkout (mode=subscription)
                                Bloqueia se já há assinatura ativa
                                metadata.businessId para sync no webhook

POST /api/stripe/portal        Cria sessão do portal de faturamento Stripe

GET  /api/stripe/subscription  Retorna status atual da assinatura

GET  /api/stripe/invoices      Lista histórico de invoices da assinatura ativa
                                Retorna: id, amountPaid, status, hostedInvoiceUrl,
                                invoicePdf, periodStart, periodEnd, createdAt
                                Usado em /lojista/plano (aba Faturas)

POST /api/stripe/webhook       Webhook Stripe (raw body, STRIPE_WEBHOOK_SECRET)
                                Eventos: checkout.session.completed,
                                customer.subscription.updated,
                                customer.subscription.deleted,
                                invoice.payment_failed
                                Sincroniza: plan, status, periodStart/End, cancelAtPeriodEnd
```

---

### 4.5 Auth (`auth.ts`)

```
POST /api/auth/forgot-password   Envia link de reset (JWT 1h, email.resetSenha)
POST /api/auth/reset-password    Valida token + salva nova senha (bcrypt)
```

---

## 5. BACKGROUND JOBS

### Job 1 — Boost Expiration (`boost-expiration.ts`)
**Intervalo:** 1 hora (roda imediatamente ao iniciar)
1. **expireBoosts()** — marca como `expired` os `search_boosts` do tipo `avulso` com `expiresAt < NOW()`
2. **expireDirectBoosts()** — limpa `businesses.boostedUntil` vencidos
3. **expireHomeBanners()** — desativa `home_banners` com `endsAt < NOW()`
4. **promoteWaitlist()** — para cada contexto/zona (zone por zona + home_search), conta vagas ativas (max 6). Se houver vaga, promove o mais antigo do waitlist: status→active, startsAt=now, expiresAt=+30d. Envia email `boostAtivado`.

### Job 2 — Documentation Job (`documentation-job.ts`)
**Intervalo:** 24 horas (roda imediatamente ao iniciar)
1. **tickDocumentationTimers()** — para cada lojista com `firstLoginAt` e timer não pausado e status ≠ approved:
   - `remainingDays > 0`: decrementa 1 dia, envia `documentacaoPendente(nome, dias)`
   - `remainingDays = 0`: status→`expired`, `businesses.isVisible=false`, `planFrozen=true`, envia `documentacaoExpirada`
2. **tickFreePlanExpiration()** — planos free com `firstLoginAt < hoje-30d` e `isVisible=true` → `isVisible=false`, envia `planoGratuitoExpirando`

### Job 3 — Subscription Job (`subscription-job.ts`)
**Intervalo:** 24 horas (começa 5 min após o start)
- **runPastDueDowngradeJob()** — assinaturas com `status=past_due` há mais de 7 dias:
  - `businesses.planType → 'free'`
  - `subscriptions.status → 'canceled'`
  - Envia email `downgradeAssinatura`

---

## 6. SERVIÇO DE EMAIL

**Provider:** Resend SDK (`resend` npm)
**FROM atual:** `Hub Londrina <noreply@hublondrina.com.br>` (domínio verificado em 03/05/2026)
- Quota free: 3 emails/dia, 3/mês

**Templates disponíveis (`emails` object em `services/email.ts`):**
```
boasVindas(nome, negocio)              Cadastro recebido — aguardando análise
cadastroAprovado(nome, negocio)        Perfil aprovado pela equipe
cadastroRejeitado(nome, negocio, motivo)  Perfil rejeitado com motivo
documentacaoPendente(nome, diasRestantes)  Countdown do timer (enviado diariamente)
documentacaoExpirada(nome)             Loja offline — docs expirados
documentacaoAprovada(nome)             Documentação aprovada — loja ativa
documentacaoRejeitada(nome, motivo)    Documentação rejeitada — corrigir e reenviar
planoGratuitoExpirando(nome)           Plano gratuito vencido após 30 dias
downgradeAssinatura(nome)              Downgrade por past_due > 7 dias
resetSenha(link)                       Link de reset de senha (JWT 1h)
boostAtivado(nome, ctx, expiresAt)     Boost promovido da fila de espera
```

---

## 7. PLANOS E MONETIZAÇÃO

### Hierarquia de Ordenação (search + businesses)
```
1. monthly boosted   (search_boosts, boostType=monthly, ordenado por position)
2. avulso boosted    (search_boosts, boostType=avulso, ordenado por rating)
3. direct boosted    (businesses.boostedUntil, ordenado por rating)
4. premium           (planType=premium, ordenado por rating)
5. destaque          (planType=destaque, ordenado por rating)
6. free              (planType=free, ordenado por rating)
```
Critério de desempate: rating DESC → completeness score → clicks DESC

### Planos Stripe
| Variável de ambiente           | Plano     | Ciclo   | Tipo    |
|-------------------------------|-----------|---------|---------|
| STRIPE_BASE_PRICE_ID           | destaque  | mensal  | secret  |
| STRIPE_BASE_ANNUAL_PRICE_ID    | destaque  | anual   | secret  |
| STRIPE_PREMIUM_PRICE_ID        | premium   | mensal  | secret  |
| STRIPE_PREMIUM_ANNUAL_PRICE_ID | premium   | anual   | secret  |
| STRIPE_HOME_BANNER_PRICE_ID    | banner home | avulso | secret |
| STRIPE_ZONE_BOOST_PRICE_ID     | boost zona | 30d=R$79 | env var shared |
| STRIPE_HOME_BOOST_PRICE_ID     | boost home/busca | 30d=R$149 | env var shared |

### Impulsionamentos Especiais (boosts.ts)
- **Vitrine de Produtos** (`vitrine_boosts`): 4 slots fixos no carrossel da home, R$ 49/mês, exclusivo Premium com vídeo aprovado. Fila de espera quando esgotado. Aprovação admin obrigatória para o vídeo.
- **Vagas Mensais (Boost de Categoria)** (`boostContext=search`, `boostType=monthly`): 5 posições por categoria no autocomplete de busca. Preço fixo (1ª = R$149 → 5ª = R$59). Exclusivo Premium. Compra direta no cartão.
- **Boost Avulso** (`boostContext=search`, `boostType=avulso`): 7/15/30 dias (R$29/R$49/R$79). Lojista solicita via WhatsApp e admin adiciona manualmente em `/admin/impulsionamento`.
- **Destaque Home + Busca** (`boostContext=home_search`): 6 slots globais com 3 posições numeradas. Aparece no topo da home E em todos os resultados de busca. Exclusivo Premium. Cobrança mensal recorrente. Price ID: `STRIPE_HOME_SEARCH_BOOST_PRICE_ID`.
- **Destaque de Zona** (`boostContext=zone`): destaque na página da zona por 30 dias (R$79). Máximo 6 vagas por zona. Fila de espera automática. Requer plano Destaque+. Price ID: `STRIPE_ZONE_BOOST_PRICE_ID`.
- **Banner na Home** (`home_banners`): R$299/mês, máx. 2 lojistas simultâneos. Exclusivo Premium e sujeito a aprovação do admin antes de publicar.
- **Boost Direto Admin** (`businesses.boostedUntil`): admin define período sem cobrança (cortesia/promoção interna). Sobrescreve `boostedUntil` direto no negócio.

**UX de bloqueio (regra R12):** todo card de impulsionamento em `LojistaBoost.tsx` exibe:
1. Texto explicativo de 1 parágrafo em caixa colorida ANTES do botão de compra (linguagem leiga).
2. Badge laranja "Exclusivo Premium" / "Exclusivo Destaque+" no canto do título quando o lojista não é elegível.
3. Botão cinza desabilitado + caixa amarela com link "Ver planos" → `/lojista/plano` quando bloqueado.

**UX admin:** `/admin/impulsionamento` tem painel colapsável "Como funcionam os impulsionamentos?" no topo com 7 explicações + subtítulo muted (12px) abaixo de cada seção.

**Fluxo de compra self-service (lojista):**
1. `GET /api/lojista/boosts/availability` — verifica vagas e elegibilidade de plano
2. `POST /api/lojista/boosts/checkout` — cria sessão Stripe Checkout (mode=payment)
3. Webhook `payment_intent.succeeded` — cria registro em `search_boosts` com status `active` ou `waitlist`
4. Job `startBoostExpirationJob()` — expira boosts vencidos e promove waitlist a cada 1h

### Features por Plano
| Feature                        | Free | Destaque | Premium |
|-------------------------------|------|----------|---------|
| Perfil básico                 | ✅   | ✅       | ✅      |
| Fotos adicionais              | ✅   | ✅       | ✅      |
| Produtos/serviços             | ✅   | ✅       | ✅      |
| Avaliações verificadas        | ✅   | ✅       | ✅      |
| Responder avaliações          | ✅   | ✅       | ✅      |
| Métricas básicas              | ❌   | ✅       | ✅      |
| Gráfico diário de cliques     | ❌   | ❌       | ✅      |
| Relatório PDF mensal          | ❌   | ❌       | ✅      |
| Impulsionamento de zona       | ❌   | ✅       | ✅      |
| Impulsionamento home/busca    | ❌   | ✅       | ✅      |
| Posição privilegiada na busca | ❌   | ✅       | ✅      |
| Visibilidade após 30 dias     | ❌   | ✅       | ✅      |

---

## 8. FRONTEND — ROTAS E PÁGINAS

### Públicas
```
/               Landing page (SSR + React Query hydration)
/categorias     Lista de categorias com contagem
/busca          Busca + filtros (drawer mobile) + perto de mim (Haversine)
/negocio/:id    Perfil completo + avaliações + resposta do dono
/anuncie        Página de planos e preços
/cadastro       Formulário de cadastro de lojista (com busca de CEP ViaCEP)
/norte          Zona Norte (SSR)
/sul            Zona Sul (SSR)
/leste          Zona Leste (SSR)
/oeste          Zona Oeste (SSR)
/centro         Zona Centro (SSR)
```

### Painel do Lojista (`/lojista/*`)
```
/lojista/login          Login
/lojista/esqueci-senha  Solicitar reset de senha
/lojista/nova-senha     Nova senha via token
/lojista/verificar-email  Verificação de email
/lojista/dashboard      Dashboard com métricas rápidas
/lojista/perfil         Editar perfil (razaoSocial + nomeFantasia inclusos)
/lojista/fotos          Gerenciar fotos (logo, banner, galeria)
/lojista/produtos       Produtos/serviços com drag-and-drop
/lojista/metricas       Métricas + botão PDF (Premium) + seletor de mês
/lojista/plano          Status da assinatura + checkout Stripe
/lojista/senha          Alterar senha
/lojista/avaliacoes     Ver e responder avaliações
/lojista/impulsionar    LojistaBoost.tsx — compra destaques especiais
/lojista/documentacao   Upload e status dos 3 documentos obrigatórios
```

### Painel Admin (`/admin/*`)
```
/admin/login           Login admin (ADMIN_PASSWORD)
/admin                 Dashboard
/admin/negocios        CRUD de negócios
/admin/lojistas        Gestão de usuários lojistas
/admin/cadastros       Aprovação de cadastros pendentes
/admin/categorias      CRUD de categorias
/admin/impulsionamento Gestão de boosts
/admin/zonas           Visualização por zona
/admin/home-banners    Banners da home
/admin/assinaturas     Assinaturas Stripe
/admin/documentacao    Revisão de documentos dos lojistas
```

---

## 9. SSR (SERVER-SIDE RENDERING)

- `server.mjs` serve HTML completo para: `/`, `/negocio/:id`, `/norte`, `/sul`, `/leste`, `/oeste`, `/centro`
- `entry-server.tsx` renderiza React no servidor com dados prefetchados do React Query
- `window.__SSR_QUERIES__` injeta o cache do React Query no cliente
- `main.tsx` usa `hydrateRoot()` quando SSR data está presente
- Em desenvolvimento (Vite dev server): zonas funcionam como SPA
- **NUNCA substituir o server.mjs por vite preview ou servidor estático**
- Build: `dist/public/` (cliente) + `dist/server/entry-server.js` (SSR)

---

## 10. SISTEMA DE DOCUMENTAÇÃO (VALIDAÇÃO DE LOJA)

### Fluxo Completo
1. Lojista faz o **1º login** → `firstLoginAt=now`, `documentationDeadline=+10d`, `documentationRemainingDays=10`, `documentationStatus=pending`
2. **Job diário** decrementa `remainingDays` e envia email de countdown
3. Lojista envia os 3 documentos via `/lojista/documentacao`:
   - `personal_id` — RG ou CNH
   - `cnpj_card` — Cartão CNPJ (valida via ReceitaWS)
   - `address_proof` — Comprovante de endereço
4. Timer pausa quando os 3 docs estão presentes e nenhum rejeitado
5. Admin revisa em `/admin/documentacao`:
   - **Aprovar** todos → `documentationStatus=approved`, `isVisible=true`, `planFrozen=false`
   - **Rejeitar** → timer despausado, email com motivo
6. Se `remainingDays` chega a 0: `documentationStatus=expired`, `isVisible=false`, `planFrozen=true`

### Storage de Documentos
- Arquivos em `private://documents/{businessId}/{type}-{timestamp}.ext`
- **NUNCA servidos estaticamente** — apenas via `/api/documents/signed/:token` (JWT 1h)
- Formatos aceitos: JPG, PNG, WebP, PDF (máx 10MB)
- Reenvio remove arquivo anterior (`safeUnlink`)

### Status de Documentação
```
pending   → Aguardando envio dos documentos
submitted → Todos enviados, em análise (timer pausado)
approved  → Aprovado, loja ativa
rejected  → Rejeitado, timer despausado
expired   → Prazo vencido, loja offline e planFrozen=true
```

---

## 11. REGRAS DE NEGÓCIO IMPORTANTES

### razaoSocial e nomeFantasia
- `businesses.razaoSocial`: único por `LOWER()` — duplicata retorna 400 com `field:"razaoSocial"`
- `businesses.nomeFantasia`: não tem restrição de unicidade
- Ambos editáveis via `PATCH /api/lojista/profile` e `PATCH /api/admin/businesses/:id`
- Exibidos no perfil lojista e na gestão admin

### Plano Congelado (`planFrozen`)
- Quando `planFrozen=true`, a cobrança Stripe não é cancelada (preserva `currentPeriodEnd`)
- O plano permanece no DB mas a loja fica offline (`isVisible=false`)
- Ao aprovar docs → `planFrozen=false`, `isVisible=true`

### Boost Especial — Lógica de Vagas
- Máximo **6 vagas** por contexto/zona (`SLOTS = 6` em `boost-expiration.ts`)
- Se vagas cheias: `status=waitlist`, fila FIFO por `createdAt`
- Job de 1h promove automaticamente ao liberar vaga
- Email `boostAtivado` ao ser promovido

### Autocomplete Patrocinado
- `GET /api/autocomplete?q=` retorna `sponsored` (boostContext=search, status=active) + `suggestions`
- Patrocinados aparecem em destaque com badge "Patrocinado" e ícone Zap

### Plano Free — Expiração Automática
- Após 30 dias do 1º login com `planType=free` → `isVisible=false` automaticamente
- Email `planoGratuitoExpirando` enviado
- Loja permanece no banco, pode ser reativada ao assinar

### Past Due — Downgrade
- Stripe marca `status=past_due` em caso de falha de pagamento
- Após 7 dias em `past_due`: downgrade para `planType=free`, `status=canceled`
- Email `downgradeAssinatura` enviado

---

## 12. VARIÁVEIS DE AMBIENTE (SECRETS)

```
JWT_SECRET                      Assina tokens lojista e admin
SESSION_SECRET                  Express session
ADMIN_PASSWORD                  Senha do painel admin
STRIPE_SECRET_KEY               API key Stripe
STRIPE_WEBHOOK_SECRET           Secret para verificar webhooks
STRIPE_BASE_PRICE_ID            price_... destaque mensal
STRIPE_BASE_ANNUAL_PRICE_ID     price_... destaque anual
STRIPE_PREMIUM_PRICE_ID         price_... premium mensal
STRIPE_PREMIUM_ANNUAL_PRICE_ID  price_... premium anual
RESEND_API_KEY                  API key Resend
DEFAULT_OBJECT_STORAGE_BUCKET_ID  GCS bucket ID
PRIVATE_OBJECT_DIR              Diretório local para arquivos privados
PUBLIC_OBJECT_SEARCH_PATHS      Caminhos públicos de object storage
DATABASE_URL                    Connection string PostgreSQL
GCP_*                           Credenciais Google Cloud Storage
```

---

## 13. AUDITORIA DE SEGURANÇA (03/05/2026)

- ✅ Nenhum secret hardcoded no código-fonte
- ✅ Rate limiting em `/api/lojista/login` e `/api/admin/login` (express-rate-limit)
- ✅ `/api/private/uploads/` retorna 404 (não exposto)
- ✅ Documentos privados apenas via JWT assinado (1h)
- ✅ Path traversal guard em `resolveDocAbsPath` (verifica DOCS_DIR + businessId)
- ✅ CSRF em `POST /api/businesses/:id/review`
- ✅ `validateId` middleware em todos os endpoints com `:id`
- ✅ JWT lojista: `{businessId, email, role:"lojista"}`, expira 7d
- ✅ JWT admin: `{role:"admin"}`, expira 24h
- ✅ bcrypt para hashes de senha

---

## 14. BUILD E DEPLOY

### Tamanhos de Build
```
api-server:     dist/index.mjs = 3.8MB (pdfkit externalized)
hub-londrina:   dist/public/assets/index.js = 721KB (gzip: 196KB)
                dist/public/assets/index.css = 149KB (gzip: 23KB)
                dist/server/entry-server.js = 205KB
```

### pdfkit — Configuração esbuild
Em `artifacts/api-server/build.mjs`, os seguintes pacotes são `external` para evitar problemas de bundling com `@swc/helpers`:
```
pdfkit, fontkit, linebreak, unicode-properties, unicode-trie
```

### Scripts úteis
```bash
# Build api-server
pnpm --filter @workspace/api-server run build

# Build frontend
pnpm --filter @workspace/hub-londrina run build

# Typecheck completo
pnpm run typecheck

# Testes de pagamento
pnpm --filter @workspace/api-server run test:payments
```

---

## 15. O QUE ESTÁ FUNCIONANDO — NÃO QUEBRAR

### SSR
- `server.mjs` serve HTML + dados para home, negócio e zonas
- `hydrateRoot()` no cliente quando `window.__SSR_QUERIES__` presente
- `curl https://www.hublondrina.com.br/ | wc -c` retorna ~82.000 bytes

### Stripe
- Checkout, portal, webhook e subscription status funcionando
- PRICE_IDs corretos como `price_...` (não `prod_...`)
- Webhook sincroniza `plan` e `status` na tabela `subscriptions`
- **Sync direto pós-checkout (independente do webhook)**:
  - `POST /api/lojista/stripe/sync { sessionId }` — planos
  - `POST /api/lojista/boosts/sync { sessionId }` — boosts (categoria/zona/home_search/banner)
  - Mesma lógica do webhook (idempotente via `pg_advisory_xact_lock`)
  - Validação dupla: `session.metadata.businessId === lojista.businessId` + `subscription.businessId === lojista.businessId`

### Uploads
- Logo, banner, fotos e mídias de produto via GCS
- Documentos em storage privado com URLs assinadas

### Jobs de Background
Todos inicializados em `src/index.ts`:
- `startBoostExpirationJob()` — a cada 1h
- `startDocumentationJob()` — a cada 24h
- `startSubscriptionJob()` — a cada 24h (início em 5min)

---

## 15.2. BUG CRÍTICO DE VISIBILIDADE — 09/05/2026 (tarde)

### Sintoma reportado pelo cliente
> "fiz tudo... plano pago no 59 e 90 configurei tudo... fui no comando de pesquisa pra pesquisar empresa que foi cadastrado não está aparecendo lá em serviços... fui nos plano de assinatura também aqui pra divulgação ele liberou falou que vai estar aparecendo mas também não tá... as fotos aqui deu bug elas não deixa subir"

Lojista id 44 (giovangrc@gmail.com, "Estrategista digital", plano Destaque pago R$59,90) — `is_visible=false` no DB.

### Causa raiz
- `artifacts/api-server/src/routes/auth.ts:210` cria todo negócio novo com `status="active"` + `isVisible=false` (esperando aprovação de documentação em 10 dias).
- `stripe.ts:117` (sync) e `stripe.ts:812` (webhook) auto-publicavam o negócio APENAS quando `biz.status === "pending"` — condição que NUNCA acontece no fluxo real (auth já cria com "active").
- Consequência: lojista paga plano, `plan_type` vira destaque/premium, subscription fica ativa, mas `is_visible` continua false até admin aprovar manualmente OU 10 dias passarem.
- Encontrados 2 negócios em produção neste estado: id 21 (seed) e id 44 (cliente real).

### Correções aplicadas

**1. `stripe.ts:117` — `syncSubscriptionFromStripe()`**
- Condição mudou de `status === "pending"` para `(status === "pending" || !isVisible)`.
- Marca `business_users.documentationStatus="approved"` + `documentationRemainingDays=0` para evitar que `tickFreePlanExpiration()` (em documentation-job.ts) derrube o negócio depois de 30d caso volte para free.

**2. `stripe.ts:812` — webhook `checkout.session.completed`**
- Mesma correção da #1 + email `cadastroAprovado` enviado.

**3. `lib/startup-heal.ts` — `healPaidInvisibleBusinesses()` (NOVO)**
- Backfill idempotente que roda no startup do servidor.
- SELECT JOIN businesses+subscriptions WHERE plan IN (destaque,premium) AND sub.status IN (active,trialing) AND (isVisible=false OR status=pending).
- UPDATE em lote: `isVisible=true, status='active'` nos negócios + `documentationStatus='approved'` nos usuários.
- Plugado em `index.ts` entre `ensureViews()` e `app.listen()`.
- Cura imediatamente o lojista 44 (e qualquer caso histórico) sem precisar de SQL manual ou re-pagamento.

**6. Produtos liberados para plano Destaque (antes Premium-only)**
- Sintoma reportado pelo cliente (lojista 44, plano Destaque): "Não encontrou onde cadastrar fotos dos produtos."
- Causa: `lojista.ts` POST/PATCH/DELETE/reorder/upload product-media exigiam `planType === "premium"`. LojistaProdutos.tsx mostrava `LockedFeature` para qualquer plano que não fosse Premium — ou seja, o lojista Destaque via só uma tela de upgrade, não a vitrine.
- Decisão de produto (confirmada pelo dono): liberar produtos no Destaque com limite de 10; manter Premium ilimitado; Free continua bloqueado.
- Backend: 5 endpoints atualizados (POST, PATCH /:id, PATCH reorder, DELETE /:id, POST upload product-media) — checagem mudou de `!== "premium"` para `=== "free"`. POST adicionou enforcement do limite (`PRODUCT_LIMITS = { destaque: 10, premium: 999 }`) com `count(*)` antes do insert. Erros retornam `code: "PRODUCT_LIMIT_REACHED"` com `limit` e `currentPlan`.
- Frontend: `LojistaProdutos.tsx` agora bloqueia só Free. Header mostra contador "X/Y produtos cadastrados" + CTA "Upgrade para Premium para cadastrar mais" quando o lojista é Destaque. Botão "Novo Produto" desabilita ao atingir o limite.

**5. Fotos não apareciam após upload (404 silencioso)**
- Sintoma reportado pelo cliente (lojista 44, plano Destaque): "Quando sobe a foto ela não aparece aqui." Screenshot mostrava ícones de imagem quebrada no Logo, Banner e Galeria.
- Causa: prefixo duplicado em `routes/storage.ts:25`. O `gcsUpload.ts` salva no bucket em `uploads/{folder}/{file}` e retorna a URL `/storage/objects/uploads/{folder}/{file}`. O handler de servir extraía `req.params.filePath = "uploads/{folder}/{file}"` e então chamava `serveGCSObject(\`uploads/${gcsPath}\`)` → procurava `uploads/uploads/{folder}/{file}` no bucket → 404. O frontend recebia 404 em TODA imagem (logo, banner, photos), apesar de o upload estar gravando o objeto corretamente.
- Fix: `serveGCSObject(gcsPath)` sem reprefixar. Como o objeto JÁ está salvo em `uploads/...` no bucket, todas as fotos historicamente "perdidas" reaparecem imediatamente após o restart.
- Verificado em dev via `curl -I /api/storage/objects/uploads/photos/test.jpg` retorna 404 limpo (file not found, não erro).

**4. Limite de upload (5MB → 15MB)**
- `lojista.ts:46` — `memoryUpload` multer agora aceita até 15MB (fotos, logo, banner).
- `LojistaFotos.tsx:46` — guarda frontend atualizada com mensagem incluindo o tamanho do arquivo enviado.
- `app.ts` — error handler global retorna 413 com mensagem amigável para `LIMIT_FILE_SIZE` em vez de 500 genérico (lojistas com smartphones modernos batiam 5MB facilmente — explica "as fotos não deixam subir").

### Arquivos alterados
- `artifacts/api-server/src/routes/stripe.ts` (linhas 117-134, 820-836)
- `artifacts/api-server/src/routes/lojista.ts` (linha 46)
- `artifacts/api-server/src/routes/storage.ts` (linha 30 — fix prefixo duplicado uploads/uploads/)
- `artifacts/api-server/src/routes/lojista.ts` (5 endpoints de produtos liberados para Destaque + limite 10)
- `artifacts/hub-londrina/src/pages/lojista/LojistaProdutos.tsx` (relax gate, contador + CTA upgrade)
- `artifacts/api-server/src/lib/startup-heal.ts` (NOVO)
- `artifacts/api-server/src/index.ts` (import + chamada no startup)
- `artifacts/api-server/src/app.ts` (error handler com tratamento de LIMIT_FILE_SIZE)
- `artifacts/hub-londrina/src/pages/lojista/LojistaFotos.tsx` (linha 46)

---

## 15.1. CORREÇÕES DE PAGAMENTO — Sessão 09/05/2026

### Problema reportado
Após pagar plano na Stripe, lojista voltava ao painel mas o banner "Confirmando seu pagamento..." ficava em loop infinito e o plano nunca atualizava.

### Bugs encontrados e corrigidos

**Bug #1 — Token errado no localStorage (`LojistaDashboard.tsx`)**
- O dashboard chamava `POST /api/lojista/stripe/sync` com `localStorage.getItem("lojista_token")`, mas a chave correta é `"hub_lojista_token"` (definida em `LOJISTA_STORAGE_KEYS` em `lib/lojista-api.ts`).
- Resultado: 401 Unauthorized confirmado nos logs de produção.
- Fix: trocado `fetch` manual por `lojistaFetch()` (helper já autenticado).

**Bug #2 — useEffect cleanup prematuro (`LojistaDashboard.tsx`)**
- O dashboard chamava `window.history.replaceState` para limpar `?payment=success` da URL no mesmo useEffect que rodava o sync. Isso causava re-render → `isPaymentSuccess` recalculado a partir da URL (agora limpa) → deps do useEffect mudavam → cleanup setava `cancelled=true` ANTES do `getProfile()` pós-sync terminar.
- Logs de prod confirmaram: `[Stripe Sync] Lojista 44 sincronizou plano=destaque status=active` mas nenhum `GET /lojista/profile` subsequente.
- Fix: capturar `payment=success` e `session_id` UMA VEZ na carga do módulo (constante `INITIAL_PAYMENT_INFO`), useEffect com deps `[]` e guard `useRef` contra dupla execução em StrictMode.

**Bug #3 — Boosts dependiam apenas do webhook**
- Boosts (categoria/zona/home_search/banner home) só eram ativados via `payment_intent.succeeded` no webhook. Se o webhook estivesse com problema, lojista pagava e ficava sem boost.
- Fix: criado endpoint `POST /api/lojista/boosts/sync` que replica a lógica idempotente do webhook (advisory locks, checagem de duplicata, fila de espera). `LojistaBoost.tsx` agora chama o sync ao detectar qualquer `*_success=1&session_id=...`.
- Todos os success_urls de boost foram atualizados para incluir `&session_id={CHECKOUT_SESSION_ID}`.

### Auditoria de segurança (validada por code review)

- **Token correto** — todas as chamadas autenticadas usam `lojistaFetch` (helper único).
- **Cross-user blocked** — `/api/lojista/stripe/sync` e `/api/lojista/boosts/sync` exigem JWT lojista válido E comparam `session.metadata.businessId === lojista.businessId` (403 Forbidden se diferente).
- **Pagamento confirmado** — `/boosts/sync` só processa se `session.payment_status === "paid"` (caso contrário retorna `{ ok:false, pending:true }`).
- **Idempotência** — webhook e sync usam mesmas advisory locks por slot e checagem `existingMine`. Chamadas concorrentes não duplicam linhas em `searchBoosts` ou `home_banners`.
- **Plano lido sempre do DB** — bloqueios (Instagram/Website, vídeo, produtos, métricas, responder review) refletem mudanças de plano imediatamente. JWT antigo não "lembra" plano antigo.
- **Fallback sem session_id** (apenas plano) — só busca subscriptions do `stripeCustomerId` já vinculado ao próprio `businessId` no DB.

### Arquivos alterados
- `artifacts/api-server/src/routes/stripe.ts` — `syncSubscriptionFromStripe()` extraída (linha 54), endpoint `POST /lojista/stripe/sync` (linha 133), endpoint `POST /lojista/boosts/sync` (linha 199), success_url banner home com `session_id` (linha 406), `FRONTEND_URL` com prioridade prod (linha 26), webhook log com `{err}` correto.
- `artifacts/api-server/src/routes/boosts.ts` — `FRONTEND_URL` com prioridade prod (linha 22), `session_id` em success_urls de boost zone/home_search (linha 215) e categoria (linha 356).
- `artifacts/hub-londrina/src/pages/lojista/LojistaDashboard.tsx` — máquina de estado `paymentStatus: idle|syncing|success|failed`, captura imutável `INITIAL_PAYMENT_INFO`, banner âmbar para falha real (em vez de sucesso falso), botão "Atualizar agora".
- `artifacts/hub-londrina/src/pages/lojista/LojistaBoost.tsx` — useEffect refatorado: chama `/lojista/boosts/sync` quando detecta `boost_success`/`cat_success`/`banner=success` + `session_id`; mensagens contextuais por tipo (categoria/zona/home_search/banner) e status (active/waitlist/duplicate/pending).

---

## 15.x PENTEST — FALSOS POSITIVOS DOCUMENTADOS

### `X-Powered-By: Google Frontend` em produção
Em `https://www.hublondrina.com.br/*` o response inclui `x-powered-by: Google Frontend`. **Não é o nosso Express** — `app.disable("x-powered-by")` em `artifacts/api-server/src/app.ts:14` já remove o header da aplicação, e o Express nunca emite "Google Frontend".

Esse header vem do **proxy de borda do Replit/Google Cloud** (Google Frontend = GFE) que termina TLS e roteia o tráfego para o container. É infraestrutura compartilhada de hospedagem, não revela nada sobre o stack do Hub Londrina (Node/Express/Postgres) e não pode ser removido por código do app — só desligando o GFE inteiro, o que não é uma opção em PaaS.

**Decisão:** marcar como falso positivo nos relatórios de pentest. A mitigação correta para "stack fingerprinting" é o que já fazemos no Express (`disable("x-powered-by")` + ausência de `Server: Express/...`).

---

## 16. INSTRUÇÃO PARA O PRÓXIMO ASSISTENTE

```
Leia o context.md COMPLETO antes de fazer qualquer alteração.

Não quebre nada listado na seção 15 (O que está funcionando).
Não altere copy, regras de negócio ou stack sem instrução explícita.
Não hardcode secrets — use sempre process.env.

## O que precisa ser feito:
[descreva aqui o que quer implementar]

## Restrições:
[liste aqui o que NÃO deve ser tocado, se houver algo específico]

## Ao finalizar:
- Execute os builds (api-server + hub-londrina) e confirme que passam
- Verifique os logs do workflow da API
- Atualize o context.md com o que foi implementado
```
