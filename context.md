# Hub Londrina — Contexto Completo do Projeto
# Atualizado: Abril 2026
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
- `server.mjs` serve HTML completo para home e /negocio/:id
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
- Rotas: /norte, /sul, /leste, /oeste, /centro
- SSR em todas as 5 rotas via server.mjs (title + meta description dinâmicos por zona)
- Componente ZonePage com hero (cor da zona), destaques, filtro por categoria, listagem e CTA
- Config de zonas em hub-londrina/src/lib/zones.ts (cor, bgColor, textColor, label, description)
- GET /api/zones/:zone/stats — totalBusinesses, byCategory, topRated
- GET /api/zones/:zone/businesses?category=&limit= — paginação + boost ordering
- Rodapé atualizado com links diretos para todas as 5 zonas
- Dropdown "Selecione a Região" da home inclui seção "Explorar por zona" com os 5 links
- Ao clicar em uma zona no dropdown → navega diretamente para /zona (não vai para /busca)
- Cores: centro=#dc2626, norte=#3d7a28, sul=#2563eb, leste=#d97706, oeste=#7c3aed

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
status (pending|active|rejected), rejectionReason
```

### 4.3 Dados seed
- 20 negócios com endereços reais de Londrina, coordenadas lat/lng
- 20 contas de lojistas — senha padrão: **Hub@2026**
- 42 produtos de exemplo distribuídos entre os negócios
- 10 categorias: Restaurantes, Salões, Academias, Mercados,
  Cafeterias, Pet Shops, Farmácias, Serviços, Padarias, Saúde
- Zonas: norte, sul, leste, oeste, centro

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
- Zonas: norte, sul, leste, oeste, centro
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

---

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
```

---

## 8. O QUE AINDA NÃO FOI IMPLEMENTADO

```
[x] Enforcement das regras de plano no backend
[x] Gateway de pagamento (Stripe — cartão de crédito)
[x] Tabela subscriptions (ciclo de vida da assinatura)
[ ] Notificação pós-clique para solicitar avaliação
[x] Páginas de zona (/norte, /sul, /leste, /oeste, /centro)
[ ] Destaque de Zona (slot pago por categoria)
[ ] Subdomínios personalizados
[ ] SEO Boost (schema.org avançado)
[ ] Relatório mensal PDF para Premium
[ ] Sitemap.xml dinâmico
[ ] Google Search Console ping automático

IMPLEMENTADO:
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
