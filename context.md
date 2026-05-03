# Hub Londrina — Contexto Completo do Projeto
# Atualizado: Maio 2026
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
Domínio        | hublondrina.com.br
Hospedagem     | Replit
```

### Estrutura de pastas
```
workspace/
├── artifacts/
│   ├── hub-londrina/          ← Frontend React + Vite
│   │   └── src/
│   │       ├── pages/         → landing, categorias, busca, negocio, anuncie
│   │       │                    lojista/*, admin/*
│   │       ├── components/    → Layout, BusinessCard, AdminLayout,
│   │       │                    LojistaLayout, ui/
│   │       └── lib/           → icons, theme, utils
│   └── api-server/            ← Backend Express
│       └── src/routes/        → businesses, categories, reviews,
│                                search, health, admin, lojista
└── lib/
    ├── db/                    ← Schema Drizzle + conexão Postgres
    ├── api-spec/              ← Tipos compartilhados
    ├── api-zod/               ← Validações Zod
    └── api-client-react/      ← Hooks React Query gerados
```

---

## 3. O QUE ESTÁ FUNCIONANDO — NÃO QUEBRAR

### 3.1 SSR (Server-Side Rendering)
- `server.mjs` serve HTML completo para home, /negocio/:id e /norte /sul /leste /oeste /centro
- Em dev (Vite) as páginas de zona são SPA — SSR só ativa em produção via server.mjs
- GET /api/stats incluído no SSR (totalBusinesses, totalCategories, totalZones)
- Stats da home carregam no servidor, sem flickering no cliente
- `curl https://www.hublondrina.com.br/ | wc -c` retorna ~82.000 bytes
- `entry-server.tsx` renderiza React no servidor com dados prefetchados
- `window.__SSR_QUERIES__` injeta cache do React Query no cliente
- `main.tsx` usa `hydrateRoot()` quando SSR data está presente
- **NUNCA substituir o server.mjs por vite preview ou servidor estático**

### 3.2 Painel Administrativo (/admin)
- Protegido por JWT com role admin
- Senha via variável de ambiente `ADMIN_PASSWORD`
- Token expira em 24h
- Módulos funcionando: dashboard, gestão de negócios, categorias
- Rotas backend: `/api/admin/*` todas com middleware de autenticação

### 3.3 Painel do Lojista (/lojista)
- Protegido por JWT com role lojista
- Login via email + senha (bcrypt)
- Token expira em 7 dias, salvo em localStorage como "hub_lojista_token"
- Módulos: dashboard, perfil, fotos, produtos, métricas, senha
- Upload de imagens em `/public/uploads/` (logos, banners, fotos)
- Busca de CEP via ViaCEP
- Geocodificação via Nominatim (OpenStreetMap)
- Rotas backend: `/api/lojista/*` todas com middleware de autenticação

### 3.4 Rotas públicas funcionando
```
GET /                    → Landing page (SSR)
GET /categorias          → Lista de categorias
GET /busca               → Busca com filtros
GET /negocio/:id         → Perfil do negócio (SSR)
GET /anuncie             → Página de planos
GET /api/businesses      → Lista de negócios (com filtros)
GET /api/businesses/:id  → Negócio individual (incrementa clicks)
GET /api/categories      → Lista de categorias
GET /api/search          → Busca full-text
POST /api/businesses/:id/click-whatsapp → Incrementa whatsappClicks
```

### 3.5 Tracking de cliques
- `businesses.clicks` — incrementa em GET /api/businesses/:id
- `businesses.whatsappClicks` — incrementa em POST /api/businesses/:id/click-whatsapp
- Tabela `clicks` com visitorId para histórico granular

### 3.6 Sistema de boost na busca
- Tabela `search_boosts` com 5 vagas mensais + avulso
- Schema atualizado:
  - `boostType` — pgEnum ("monthly" | "avulso") — antes era text livre
  - `boostContext` — pgEnum ("search" | "zone" | "home_search"), default "search"
  - `zone` — text nullable, preenchido quando boostContext = "zone"
  - uniqueIndex condicional `search_boosts_business_not_expired` removido
  - Índices novos: `search_boosts_context_idx`, `search_boosts_zone_idx`
- Três contextos de boost suportados:
  - `search` — boost na busca geral e autocomplete (comportamento atual)
  - `zone` — destaque fixo na página da zona do negócio
  - `home_search` — destaque na home principal e página de busca geral
- Ordenação: mensal (posição fixa) > avulso > premium > destaque > free
- Badge "Patrocinado" discreto (cinza) nos cards
- Job de expiração rodando a cada hora
- Admin: /admin/boosts (5 posições + avulso + waitlist)
- Lojista: /lojista/boost (estado ativo ou informativo)
- GET /api/lojista/boost-positions disponível

### 3.7 Sistema de avaliações
- Tabela `reviews` com visitorId, verified, ownerResponse
- GET + POST /api/reviews com verificação por cookie de visita
- Lojista Destaque/Premium pode responder avaliações
- Formulário de avaliação no perfil público do negócio
- Painel lojista: /lojista/avaliacoes

### 3.8 Banners da home
- Tabela `home_banners` com CRUD completo
- Carrossel rotativo na landing page
- Admin: /admin/banners

### 3.10 Selos automáticos nos cards
- "Bem Avaliado" — rating ≥ 4.7 com mínimo 10 avaliações
- "Mais Avaliado" — 20+ avaliações
- "Sem Reclamações" — rating ≥ 4.5 com 5+ avaliações
- "Patrocinado" — boost ativo (cinza, discreto)

### 3.13 Integração Stripe (pagamento)
- Tabela subscriptions no banco
- POST /api/stripe/checkout → cria sessão de checkout
- POST /api/stripe/portal → abre Billing Portal do Stripe
- GET /api/stripe/subscription → status da assinatura
- POST /api/stripe/webhook → processa eventos Stripe
- Webhook: pagamento confirmado → planType muda para destaque/premium
- Webhook: assinatura cancelada → planType volta para free
- Webhook: pagamento falhou → status past_due
- Frontend: /lojista/plano com toggle mensal/anual (17% desconto)
- Cartão de teste: 4242 4242 4242 4242
- Job diário: downgrade para free após 7 dias past_due

### 3.12 Enforcement das regras de plano
- Middleware requirePlan() em api-server/src/middleware/checkPlan.ts
- Free: sem logo, sem banner, máx 1 foto, sem métricas, sem produtos,
  sem Instagram/Website, sem vídeo, sem responder avaliações
- Destaque: sem produtos, sem vídeo, sem impulsionamento
- Premium: acesso completo
- Frontend: componente LockedFeature mostra cadeado + link upgrade
- Rotas protegidas: upload/logo, upload/banner, upload/photo (limite),
  products (CRUD), metrics, reviews/respond, profile (instagram, videoUrl)
- Resposta 403: { error, code: PLAN_REQUIRED, requiredPlan, upgradeUrl }

### 3.11 Cadastro público
- POST /api/auth/register com validações completas
- Validação CNPJ único, telefone único, email único
- Validação CNPJ via ReceitaWS (não bloqueia se API falhar)
- Negócio criado com status='pending' e isVisible=false
- Página /cadastro com formulário de 4 passos
- Admin: /admin/cadastros (aprovar/rejeitar)
- CTA "Reivindicar Página" aponta para /cadastro
- Rotas públicas filtram status='active' AND isVisible=true

### 3.9 Busca por proximidade
- Haversine implementado no backend
- Botão "Perto de mim" na página de busca com GPS
- Parâmetros: lat, lng, radius (padrão 5km)

### 3.14 Páginas de zona
- Rotas SSR: /norte, /sul, /leste, /oeste, /centro
- Componente ZonePage com hero colorido, destaques, categorias, listagem
- Config em hub-londrina/src/lib/zones.ts (cores, labels, slugs)
- GET /api/zones/:zone/stats e /api/zones/:zone/businesses
- Cores: norte=#3d7a28, sul=#2563eb, leste=#d97706, oeste=#7c3aed, centro=#dc2626
- Rodapé com links diretos para páginas de zona
- Dropdown de região na home: seção "Explorar por zona" com 5 zonas coloridas no topo, seção "Por bairro" abaixo com bairros do banco

### 3.17 Email transacional (Resend)
- Serviço em api-server/src/services/email.ts
- Templates: boasVindas, cadastroAprovado, cadastroRejeitado, pagamentoConfirmado, pagamentoFalhou, novaAvaliacao, recuperacaoSenha
- Disparos: cadastro, aprovação/rejeição admin, checkout Stripe, payment_failed, nova avaliação
- Emails assíncronos — falha não bloqueia ação principal

### 3.18 Recuperação de senha
- POST /api/auth/forgot-password — gera token 32 bytes, expira em 1h
- POST /api/auth/reset-password — valida token, atualiza senha, limpa token
- Campos novos em business_users: passwordResetToken, passwordResetExpiresAt
- Páginas: /lojista/esqueci-senha e /lojista/nova-senha?token=
- Link "Esqueci minha senha" na página de login

### 3.20 Índices de banco
- Índices em businesses: zone, categorySlug, status, isVisible, planType, lat/lng, rating
- Índice composto: status + isVisible + planType (query pública mais comum)
- Índices em reviews: businessId
- Índices em search_boosts: status, expiresAt

### 3.21 Sitemap.xml dinâmico
- GET /sitemap.xml — gerado dinamicamente com todas as páginas estáticas + perfis de negócios
- GET /robots.txt — Allow /, Disallow /admin /lojista /api, aponta para sitemap

### 3.22 Structured Data (JSON-LD)
- Schema LocalBusiness em cada /negocio/:id (nome, endereço, telefone, rating, horário, geo)
- Schema WebSite na home com SearchAction
- Injetado no SSR antes de </head>

### 3.23 Upload direto de mídia nos produtos
- POST /api/lojista/upload/product-media (Premium only)
- Aceita imagem (10MB) e vídeo/mp4 (50MB)
- Salva em /public/uploads/products/
- Frontend: toggle Upload/URL no formulário de produto com preview

### 3.25 Connection pooling
- Pool configurado com max: 10, idleTimeoutMillis: 30000, connectionTimeoutMillis: 2000
- Drizzle usando Pool do pg em vez de conexão direta

### 3.26 CSRF protection
- GET /api/auth/csrf-token — gera token + cookie csrf-token (httpOnly: false, sameSite: strict)
- Middleware csrfProtection aplicado em: POST /auth/register, POST /auth/forgot-password, POST /businesses/:id/review
- Frontend: src/lib/csrf.ts com getCsrfToken() (cache 55min) e csrfFetch()
- Cadastro.tsx, EsqueciSenha.tsx e negocio.tsx usam csrfFetch
- Sem token: retorna 403 CSRF_INVALID

### 3.28 Validação de IDs e proteção contra overflow
- Middleware validateId em api-server/src/middleware/validateId.ts
- parseId: valida isNaN, id <= 0, id > 2147483647 (limite int4 PostgreSQL)
- Aplicado em todas as rotas com :id em businesses.ts, admin.ts, lojista.ts
- validatePagination: limita page (max 10000) e limit (max 100)
- Validação de :zone contra lista VALID_ZONES
- businessViewLimiter: 60 requests/minuto por IP nas rotas públicas
- parseId também aplicado em body fields: businessId em boosts e banners

### 3.27 Uploads persistentes
- Diretório de uploads dentro do workspace do Replit (persistente)
- Express serve /uploads/ como estático
- Banner informativo no sidebar do admin sobre limitação de storage local

### 3.24 Confirmação de email no cadastro
- Campos novos em business_users: emailVerified, emailVerificationToken
- GET /api/auth/verify-email?token= — verifica e redireciona para /lojista/login?verified=1
- Página /lojista/verificar-email
- Banner verde no login quando ?verified=1
- Coluna de email verificado no /admin/cadastros

### 3.19 Página admin de assinaturas
- GET /api/admin/subscriptions — MRR calculado, agrupamento por status
- Página /admin/assinaturas com cards MRR, ativas, inadimplentes, canceladas
- Tabela de inadimplentes com link direto ao Stripe Dashboard
- Tabela completa com filtro por status

### 3.16 Segurança implementada
- JWT_SECRET sem fallback hardcoded — servidor recusa iniciar se variável ausente
- JWT_SECRET rotacionado em 03/05/2026 — chave anterior estava exposta no .replit. Nova chave configurada apenas via Replit Secrets Manager.
- Rate limiting em todos os endpoints sensíveis:
  login admin/lojista: 5 tentativas/15min
  cadastro: 3/hora, CNPJ: 20/hora, avaliações: 10/hora
- invoice.payment_failed faz downgrade imediato para free
- Diretórios de upload recriados automaticamente no restart
- Banner de aviso no admin quando uploads estão em filesystem local

### 3.15 Sistema de boost direto (admin)
- POST /api/admin/businesses/:id/boost — seta boostedUntil com duração em dias
- DELETE /api/admin/businesses/:id/boost — remove boost direto
- Badge roxo Impulsionado no BusinessCard
- Hierarquia final: boost_monthly > boost_avulso > boost_direto > premium > destaque > free
- Duração disponível: 7, 14, 30, 60, 90 dias

---

## 4. BANCO DE DADOS — ESTADO ATUAL

### 4.1 Tabelas existentes
```
businesses      — negócios (20 registros reais)
categories      — categorias (10 registros)
reviews         — avaliações (10 registros + visitorId, verified, ownerResponse)
business_users  — contas dos lojistas (20 registros)
products        — vitrine de produtos (42 registros)
search_boosts   — boost na busca (5 vagas mensais + avulso)
home_banners    — banners rotativos da home
clicks          — histórico granular de cliques com visitorId
subscriptions   — assinaturas Stripe (stripeCustomerId, stripeSubscriptionId, plan, status, period)
```

### 4.2 Campos da tabela businesses
```
id, name, categorySlug, region, zone, description, address,
phone, whatsapp, rating, reviewsCount, planType, verified,
photoUrl, hours, createdAt, clicks, whatsappClicks, isVisible,
cnpj, ownerName, ownerEmail, ownerPhone, logoUrl, bannerUrl,
photos (array), cep, street, number, neighborhood, city, state,
lat, lng, instagram, website, paymentMethods (array), tags (array),
videoUrl, boostedUntil, homeFeatured,
zoneFeatured (boolean, NOT NULL, default false),
zoneFeaturedExpiresAt (timestamp, nullable),
status (pending|active|rejected), rejectionReason
```

### 4.3 Dados seed
- 20 negócios com endereços reais de Londrina, coordenadas lat/lng
- 20 contas de lojistas — senha padrão: **Hub@2026**
- 42 produtos de exemplo distribuídos entre os negócios
- 10 categorias: Restaurantes, Salões, Academias, Mercados,
  Cafeterias, Pet Shops, Farmácias, Serviços, Padarias, Saúde
- Zonas: norte (4), sul (7), centro (9) — leste e oeste sem negócios no seed ainda
- Coordenadas lat/lng preenchidas em todos os 20 negócios

### 4.4 Exemplos de login de lojista (para teste)
```
PREMIUM:
contato@sabordosul.com.br            / Hub@2026 → Restaurante Sabor do Sul
contato@churrascariapantanal.com.br  / Hub@2026 → Churrascaria Pantanal

FREE (usar para testar enforcement):
contato@eletricalondrina.com.br      / Hub@2026 → Elétrica Londrina Serviços
contato@automecanica.com.br          / Hub@2026 → Auto Mecânica Confiança
contato@minimercadofamilia.com.br    / Hub@2026 → Mini Mercado Família
contato@drogariapopular.com.br       / Hub@2026 → Drogaria Popular
```

---

## 5. REGRAS DE NEGÓCIO FIXAS — NUNCA ALTERAR SEM INSTRUÇÃO EXPLÍCITA

### 5.1 Planos
```
Plano      | Preço    | Fotos | Busca          | Home
-----------|----------|-------|----------------|------------------
free       | R$0/mês  | 1     | Por último     | Não
destaque   | R$49/mês | 10    | Prioridade     | Não
premium    | R$89/mês | ∞     | Topo garantido | Sim (destaques)
```

### 5.2 O que cada plano libera (backend deve enforçar)
```
Recurso                  | free | destaque | premium
-------------------------|------|----------|--------
Upload fotos             | 1    | 10       | ∞
Logo e banner            | não  | sim      | sim
Selo verificado          | não  | sim      | sim
Métricas                 | não  | básica   | avançada
Avaliações               | não  | sim      | sim
Vitrine de produtos      | não  | não      | sim
Vídeo                    | não  | não      | sim
Instagram/Website        | não  | sim      | sim
Relatório PDF            | não  | não      | sim
Impulsionamento          | não  | não      | sim
```

### 5.3 Ordenação na busca (em ordem de prioridade)
1. Boost ativo mensal (posição fixa pelo lance — não embaralha)
2. Boost ativo avulso (posição fixa, entra após mensais)
3. Plano premium (por rating DESC)
4. Plano destaque (por rating DESC)
5. Completude do perfil (logo + fotos + descrição)
6. Cliques recentes (últimos 30 dias)
7. Plano free (por último, por rating DESC)

### 5.4 Regras do boost na busca
```
Vagas mensais: 5 posições fixas por lance
  1º lugar — R$149/mês
  2º lugar — R$119/mês
  3º lugar — R$99/mês
  4º lugar — R$79/mês
  5º lugar — R$59/mês

Boost avulso (para testar antes de assinar):
  7 dias  — R$29
  15 dias — R$49
  30 dias — R$79

Regras:
- Posição é fixa enquanto estiver pagando (não rota entre buscas)
- Avulso entra APÓS os 5 mensais na ordenação
- Se todas as 5 vagas mensais estiverem ocupadas, avulso entra
  em lista de espera para mensal, mas pode ativar como avulso
- Badge "Patrocinado" discreto (cinza) exibido no card
- Boost se aplica à categoria principal do negócio
- Admin ativa manualmente (pagamento integrado depois)
- Tabela no banco: search_boosts
```

### 5.4 Zoneamento
- Cada negócio pertence a **uma** zona principal
- Zonas: norte (4), sul (7), centro (9) — leste e oeste sem negócios no seed ainda
- Coordenadas lat/lng preenchidas em todos os 20 negócios
- Cores por zona:
  - Norte: #3d7a28 (verde)
  - Sul: #2563eb (azul)
  - Leste: #d97706 (âmbar)
  - Oeste: #7c3aed (roxo)
  - Centro: #dc2626 (vermelho)

### 5.5 Produtos avulsos e add-ons (ainda não implementados no código)
```
Boost busca mensal — 5 vagas fixas por lance:
  1º R$149 | 2º R$119 | 3º R$99 | 4º R$79 | 5º R$59

Boost busca avulso:
  7 dias R$29 | 15 dias R$49 | 30 dias R$79

Banner da Home       | R$299/mês  | máx 2 simultâneos
Destaque de Zona     | R$79/zona  | Premium + add-on, máx 2 zonas extras
Subdomínio           | R$29/mês   | ex: negocio.hublondrina.com.br
SEO Boost            | R$49/mês   | schema.org avançado
```

### 5.5.1 Regras detalhadas dos novos contextos de boost

**Destaque de Zona (R$79/mês):**
- 6 vagas por zona
- Aparece fixo no topo da página da zona
- Aparece fixo em qualquer categoria filtrada dentro da zona
- Exclusivo para empresas da própria zona
- Disponível para planos Base e Premium

**Destaque Home + Busca (R$149/mês):**
- 6 vagas globais
- Aparece na home principal
- Aparece na página de busca geral
- Aparece no autocomplete patrocinado
- Disponível apenas para Premium

**Banner Home (R$299/mês):**
- 2 vagas
- Apenas na home principal
- Disponível apenas para Premium

---

## 5.6 Preços exibidos na plataforma (não alterar)


## 6. COPY E POSICIONAMENTO — NÃO ALTERAR

```
Headline principal: "Feito por londrinense. Para londrinense."
Subtítulo: "Aqui você encontra negócios de verdade — da sua cidade,
            do seu bairro, de gente que vive do mesmo lado que você."
Tagline do rodapé: "O guia de negócios locais feito por quem é de Londrina."
Meta description: "Feito por londrinense, para londrinense. Encontre
                   restaurantes, salões, clínicas e serviços locais
                   em Londrina, PR."
CTA principal: "Cadastrar meu negócio — é grátis"
CTA secundário: "Ver planos a partir de R$49/mês"
```

---

## 7. VARIÁVEIS DE AMBIENTE OBRIGATÓRIAS

```
DATABASE_URL              — string de conexão PostgreSQL
ADMIN_PASSWORD            — senha do painel /admin
JWT_SECRET                — secret para assinar tokens JWT
STRIPE_SECRET_KEY         — sk_test_... ou sk_live_...
STRIPE_PUBLISHABLE_KEY    — pk_test_... ou pk_live_...
STRIPE_BASE_PRICE_ID      — price_... (plano Base R9,90/mês)
STRIPE_PREMIUM_PRICE_ID   — price_... (plano Premium R9,90/mês)
STRIPE_WEBHOOK_SECRET     — whsec_...
RESEND_API_KEY            — re_...
```

---

## 8. O QUE AINDA NÃO FOI IMPLEMENTADO

```
[x] Enforcement das regras de plano no backend
[x] Gateway de pagamento (Stripe — cartão de crédito)
[x] Tabela subscriptions (ciclo de vida da assinatura)
[ ] Notificação pós-clique para solicitar avaliação
[x] Páginas de zona (/norte, /sul, /leste, /oeste, /centro)
[~] Destaque de Zona — schema preparado, backend e frontend pendentes
[ ] Subdomínios personalizados
[ ] SEO Boost (schema.org avançado)
[ ] Relatório mensal PDF para Premium
[ ] Sitemap.xml dinâmico
[ ] Google Search Console ping automático

IMPLEMENTADO:
[x] Connection pooling (max: 10)
[x] CSRF protection nos formulários públicos
[x] Uploads em diretório persistente do workspace
[x] Email transacional via Resend (7 templates)
[x] Recuperação de senha para lojistas
[x] Página admin de assinaturas com MRR
[x] JWT_SECRET sem fallback hardcoded (segurança)
[x] Rate limiting: login, cadastro, CNPJ, avaliações
[x] Downgrade imediato em invoice.payment_failed
[x] Aviso de uploads locais no admin
[x] Sistema de boost na busca com leilão de 5 vagas
[x] Sistema de avaliações com verificação por visita
[x] Banners rotativos da home (home_banners)
[x] Busca por proximidade "Perto de mim" (Haversine)
[x] Selos automáticos: Bem Avaliado, Mais Avaliado, Sem Reclamações, Patrocinado
[x] Painel admin: /admin/boosts, /admin/banners, /admin/cadastros
[x] Painel lojista: /lojista/boost, /lojista/avaliacoes
[x] Cadastro público em /cadastro (4 passos, validação CNPJ/telefone/email)
[x] Fluxo de aprovação admin (pending → active)
[x] CTA "Reivindicar Página" aponta para /cadastro
[x] Rotas públicas filtram status=active AND isVisible=true
```

---

## 9. INSTRUÇÕES PARA O AGENTE

**Antes de qualquer alteração:**
1. Leia este arquivo completamente
2. Identifique o que está sendo pedido
3. Verifique se o que será feito pode quebrar algo da seção 3
4. Se houver risco, avise antes de implementar

**Durante a implementação:**
- Não altere rotas públicas existentes sem necessidade explícita
- Não remova campos do banco — apenas adicione
- Não altere a copy da landing (seção 6)
- Não altere as variáveis de ambiente existentes
- Mantenha o padrão de autenticação JWT já implementado
- Mantenha o padrão de hooks do api-client-react

**Ao finalizar qualquer tarefa, confirme:**
```bash
# Teste 1 — SSR funcionando
curl https://www.hublondrina.com.br/ | wc -c
# Esperado: acima de 50000

# Teste 2 — API respondendo
curl https://www.hublondrina.com.br/api/categories
# Esperado: JSON com array de categorias

# Teste 3 — Admin acessível
# Abrir /admin/login no browser e confirmar que carrega

# Teste 4 — Lojista acessível
# Abrir /lojista/login no browser e confirmar que carrega
```

**Se qualquer teste falhar:** corrija antes de considerar a tarefa concluída.

**OBRIGATÓRIO após qualquer alteração no backend:**
```bash
cd ~/workspace/artifacts/api-server && pnpm build
```
O servidor de produção roda dist/index.mjs (bundle compilado).
Sem rebuild, as correções no TypeScript não chegam em produção.

---

## 10. TEMPLATE DE PROMPT PARA NOVAS TAREFAS

Copie e use este template toda vez que for pedir algo novo:

```
Leia o CONTEXT.md antes de fazer qualquer alteração.

Não quebre nada listado na seção 3 (O que está funcionando).
Não altere copy, regras de negócio ou stack sem instrução explícita.

## O que precisa ser feito:
[descreva aqui o que quer implementar]

## Restrições:
[liste aqui o que NÃO deve ser tocado, se houver algo específico]

## Ao finalizar, execute os 4 testes da seção 9 e confirme os resultados.
```

---

## 11. SISTEMA DE VALIDAÇÃO DE DOCUMENTAÇÃO + EXPIRAÇÃO PLANO FREE (03/05/2026)

### Schema novo
- `business_users.firstLoginAt` (timestamp) — registrado no 1º login
- `business_users.documentationDeadline` (timestamp) — firstLoginAt + 10 dias
- `business_users.documentationStatus` (text) — pending|submitted|approved|rejected|expired
- `business_users.documentationRemainingDays` (integer, default 10)
- `business_users.documentationTimerPaused` (boolean, default false)
- `businesses.planFrozen` (boolean, default false) — congela cobrança quando docs expiram
- `business_documents` (tabela): id, businessId(FK), documentType, fileUrl, status, rejectionReason, submittedAt, reviewedAt

### Endpoints
- `POST /api/lojista/documents` (multipart: documentType + file) — upload local em `/public/uploads/documents/{bid}/{type}-{ts}.ext` (JPG/PNG/WebP/PDF, 10MB). Pausa timer, status=submitted. Para `cnpj_card` chama ReceitaWS (alerta admin via log se inválido, não bloqueia).
- `GET /api/lojista/documents` — retorna documents[] + documentationStatus/RemainingDays/TimerPaused/Deadline
- `GET /api/admin/documents` — lista lojistas pendentes/submetidos/rejeitados/expirados, ordenado por urgência (menos dias)
- `PATCH /api/admin/documents/:id` `{action: "approve"|"reject", reason?}` — quando os 3 docs (personal_id, cnpj_card, address_proof) aprovados: documentationStatus=approved, isVisible=true, planFrozen=false. Rejeição: timer despausado, email com motivo.

### Jobs (artifacts/api-server/src/lib/documentation-job.ts)
Roda 1x ao iniciar e a cada 24h. Dois ciclos:
1. **Documentação**: decrementa remainingDays para usuários com firstLoginAt e timer despausado e status≠approved. Se chegar a 0 → status=expired, businesses.isVisible=false, planFrozen=true.
2. **Plano free 30d**: businesses com planType=free, isVisible=true e firstLoginAt < hoje-30d → isVisible=false, email "planoGratuitoExpirando".

### Login (lojista.ts:147)
No 1º login (`!user.firstLoginAt`): set firstLoginAt=now, deadline=+10d, remainingDays=10, status=pending, timerPaused=false.

### Frontend
- `pages/lojista/LojistaDocumentacao.tsx` — 3 cards (Documento Pessoal, Cartão CNPJ, Comprovante Endereço), upload + status + motivo de rejeição
- `pages/lojista/LojistaLayout.tsx` — banner topo (4 estados: pending vermelho, submitted amarelo+pausado, rejected, expired) + link "Documentação" no menu
- `pages/admin/AdminDocumentacao.tsx` — filtros (todos/pendentes/submetidos/rejeitados/expirados), expansível por lojista, aprovar/rejeitar com motivo
- `pages/admin/AdminLayout.tsx` — link "Documentação" entre "Cadastros Pendentes" e "Assinaturas"
- Rotas registradas em `App.tsx`: `/lojista/documentacao` e `/admin/documentacao`

### 5 templates de email (services/email.ts)
- `documentacaoPendente(nome, dias)` — countdown
- `documentacaoExpirada(nome)` — loja offline
- `documentacaoAprovada(nome)` — loja ativa
- `documentacaoRejeitada(nome, motivo)` — corrija e reenvie
- `planoGratuitoExpirando(nome)` — assine Base

### Correções de segurança (auditoria pós-implementação)
- **Storage privado**: documentos salvos em `private/uploads/documents/{bid}/...` (FORA de `public/`, não servido estaticamente). Evita IDOR via URL pública.
- **URLs assinadas**: download via `GET /api/documents/signed/:token` (JWT 1h). Backend retorna `signedUrl` por documento — `fileUrl` interno nunca exposto.
- **Path traversal guard**: `resolveDocAbsPath` verifica que o caminho resolvido está sob DOCS_DIR e businessId/businessDir; businessId castado para Number e validado.
- **Pause de timer só com 3 docs**: `recomputeDocumentationStatus` só pausa timer quando os 3 tipos (`personal_id`, `cnpj_card`, `address_proof`) estão presentes E nenhum rejeitado. Evita burlar o prazo enviando 1 doc qualquer.
- **Limpeza de arquivos antigos**: ao reenviar mesmo tipo, arquivo físico anterior é removido via `safeUnlink`.
