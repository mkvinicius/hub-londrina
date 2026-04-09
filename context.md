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
│   │       └── lib/           → icons, theme, utils, lojista-api
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
- Módulos funcionando: dashboard, gestão de negócios, categorias,
  impulsionamento (boostedUntil), home banners (CRUD)
- Rotas backend: `/api/admin/*` todas com middleware de autenticação

### 3.3 Painel do Lojista (/lojista)

- Protegido por JWT com role lojista
- Login via email + senha (bcryptjs — não usar bcrypt nativo)
- Token expira em 7 dias, salvo em localStorage como "hub_lojista_token"
- Módulos: dashboard (com card de impulsionamento), perfil, fotos,
  produtos, métricas, plano, senha, avaliações (ver + responder)
- Upload de imagens em `/public/uploads/` (logos, banners, fotos)
- Busca de CEP via ViaCEP
- Geocodificação via Nominatim (OpenStreetMap)
- Rotas backend: `/api/lojista/*` todas com middleware de autenticação

### 3.4 Rotas públicas funcionando

```
GET /                    → Landing page (SSR)
GET /categorias          → Lista de categorias
GET /busca               → Busca com filtros + GPS + sidebar collapsível
GET /negocio/:id         → Perfil do negócio (SSR) + avaliações
GET /anuncie             → Página de planos
GET /api/businesses      → Lista de negócios (filtros, sinônimos, boost shuffle)
GET /api/businesses/:id  → Negócio individual (incrementa clicks)
GET /api/businesses/nearby → Busca por proximidade (Haversine + raio)
GET /api/categories      → Lista de categorias
GET /api/search          → Busca full-text (sinônimos, accent-insensitive)
GET /api/regions         → Lista de regiões dinâmicas
GET /api/home-banners    → Banners rotativos da home
POST /api/businesses/:id/click-whatsapp → Incrementa whatsappClicks
POST /api/businesses/:id/review → Avaliação pública (cookie visitorId)
```

### 3.5 Tracking de cliques

- `businesses.clicks` — incrementa em GET /api/businesses/:id
- `businesses.whatsappClicks` — incrementa em POST /api/businesses/:id/click-whatsapp
- `business_clicks` — tabela de cliques com visitorId para analytics

### 3.6 Motor de busca inteligente

- Busca accent-insensitive via `translate()` no PostgreSQL
- Busca parcial (ILIKE) em: name, description, categorySlug, address, region, tags
- Variações de plural PT-BR: singular↔plural, -ão↔-ões/-ães, -al↔-ais, -el↔-eis
- Sinônimos de categoria: "restaurante"→restaurantes, "barbearia"→salões,
  "farmacia"→farmacias, "pet"→pet-shops, "café"→cafeterias, etc.
- Relevância ponderada: nome (10), categorySlug (8), tags (6), description (5)

### 3.7 Monetização implementada

- Campo `boostedUntil` (timestamp) — impulsionamento com data de expiração
- Resultados boosted embaralhados aleatoriamente a cada request (shuffle)
- Selos nos cards: Impulsionado, Bem Avaliado (rating≥4.7 + reviews≥10), Premium
- Home Banners rotativos (tabela home_banners, máx 2 ativos)
- Admin: página de impulsionamento + página de home banners
- Lojista: card de status do boost no dashboard

### 3.8 Busca por proximidade

- Botão "Perto de mim" usa navigator.geolocation
- Endpoint `/api/businesses/nearby` com Haversine + filtro de raio (SQL)
- Respeita filtros ativos (categoria, região) durante busca GPS
- Exibe "X km de você" em cada card quando ativo
- "Limpar filtros" reseta completamente o modo GPS

---

## 4. BANCO DE DADOS — ESTADO ATUAL

### 4.1 Tabelas existentes

```
businesses      — negócios (20 registros reais)
categories      — categorias (10 registros)
reviews         — avaliações (campos: visitorId, verified, ownerResponse)
business_users  — contas dos lojistas (20 registros)
products        — vitrine de produtos (42 registros)
business_clicks — tracking de cliques com visitorId
home_banners    — banners da home (id, businessId, title, imageUrl, linkUrl, active, endsAt)
```

### 4.2 Campos da tabela businesses

```
id, name, categorySlug, region, zone, description, address,
phone, whatsapp, rating, reviewsCount, planType, verified,
photoUrl, hours, createdAt, clicks, whatsappClicks, isVisible,
cnpj, ownerName, ownerEmail, ownerPhone, logoUrl, bannerUrl,
photos (array), cep, street, number, neighborhood, city, state,
lat, lng, instagram, website, paymentMethods (array), tags (array),
videoUrl, boostedUntil, homeFeatured
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
contato@sabordosul.com.br     / Hub@2026  → Restaurante Sabor do Sul
contato@churrascariapantanal.com.br / Hub@2026 → Churrascaria Pantanal
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

1. Boost ativo (boostedUntil > NOW()) — embaralhados entre si
2. Plano premium (por rating DESC)
3. Plano destaque (por rating DESC)
4. Completude do perfil (logo + fotos + descrição + endereço)
5. Cliques recentes
6. Plano free (por último, por rating DESC)

### 5.4 Regras do boost na busca

```
Boost avulso (admin ativa manualmente):
  7 dias  — R$29
  15 dias — R$49
  30 dias — R$79

Regras:
- Boosted são embaralhados aleatoriamente a cada request
- Badge "Impulsionado" laranja exibido no card
- Admin ativa manualmente via painel (pagamento integrado depois)
- Campo boostedUntil no banco de dados
```

### 5.5 Regras do boost mensal (IMPLEMENTADO)

```
Vagas mensais: 5 posições fixas por lance
  1º lugar — R$149/mês
  2º lugar — R$119/mês
  3º lugar — R$99/mês
  4º lugar — R$79/mês
  5º lugar — R$59/mês

Tabela: search_boosts (id, businessId UNIQUE FK, monthlyBid, position 1-5, boostType 'monthly'|'avulso', status 'active'|'waitlist'|'expired', startsAt, expiresAt, createdAt)

Regras implementadas:
- Posição é fixa enquanto estiver pagando (não rota entre buscas)
- Avulso entra APÓS os 5 mensais na ordenação
- Badge "Patrocinado" exibido no card (_boostBadge no JSON)
- Boost se aplica à busca geral (search.ts e businesses.ts)
- boostedUntil mantido no businesses (legado) mas NÃO usado na ordenação
- Admin CRUD: GET/POST/PATCH/DELETE /api/admin/search-boosts
- Lojista profile retorna _boost com boostType/position/expiresAt
- Admin panel AdminImpulsionamento.tsx com grid de 5 vagas + tabela avulso
```

### 5.6 Zoneamento

- Cada negócio pertence a **uma** zona principal
- Zonas: norte, sul, leste, oeste, centro
- Cores por zona:
  - Norte: #3d7a28 (verde)
  - Sul: #2563eb (azul)
  - Leste: #d97706 (âmbar)
  - Oeste: #7c3aed (roxo)
  - Centro: #dc2626 (vermelho)

### 5.7 Produtos avulsos e add-ons (ainda não implementados no código)

```
Boost busca mensal — 5 vagas fixas por lance:
  1º R$149 | 2º R$119 | 3º R$99 | 4º R$79 | 5º R$59

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
DATABASE_URL      — string de conexão PostgreSQL
ADMIN_PASSWORD    — senha do painel /admin
SESSION_SECRET    — secret para sessões/JWT
```

---

## 8. O QUE AINDA NÃO FOI IMPLEMENTADO

```
[ ] Cadastro público de novos lojistas (/cadastro)
[ ] Enforcement das regras de plano no backend
[ ] Gateway de pagamento (Stripe ou Asaas/PagSeguro)
[ ] Tabela subscriptions (ciclo de vida da assinatura)
[ ] Notificação pós-clique para solicitar avaliação
[ ] Páginas de zona (/norte, /sul, /leste, /oeste, /centro)
[ ] Destaque de Zona (slot pago por categoria)
[x] Boost mensal (5 vagas fixas por lance — tabela search_boosts)
[ ] Subdomínios personalizados
[ ] SEO Boost (schema.org avançado)
[ ] Relatório mensal PDF para Premium
[ ] Sitemap.xml dinâmico
[ ] Google Search Console ping automático
```

### O que já foi implementado (remover da lista acima quando documentar):

```
[x] Avaliações por visitantes (formulário público + cookie visitorId)
[x] Resposta do lojista às avaliações (ownerResponse)
[x] Selos automáticos (Bem Avaliado = rating≥4.7 + reviews≥10)
[x] Banner da Home (CRUD admin + rotativo na landing)
[x] Impulsionamento avulso (boostedUntil + admin ativa)
[x] Busca por proximidade (Perto de mim com GPS + Haversine)
[x] Motor de busca inteligente (sinônimos, acentos, plural PT-BR)
[x] Sidebar de filtros collapsível (Categoria + Região com toggle)
[x] Botões com efeito de elevação (hover/active)
[x] Feedback visual forte em categoria/região selecionada
[x] Shuffle de resultados boosted (ordem aleatória a cada request)
[x] Card de status de boost no dashboard do lojista
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
- Usar bcryptjs (não bcrypt nativo — falha no Replit)

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
