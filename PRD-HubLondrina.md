# PRD — Hub Londrina: Negócio Local
**Versão:** 1.0 · **Data:** Maio 2026 · **Status:** Em Produção

---

## 1. Visão Geral

### 1.1 Problema
Pequenos e médios negócios de Londrina (PR) não têm uma presença digital local estruturada. Google e iFood favorecem grandes redes. O consumidor local não tem um canal confiável para descobrir negócios do bairro.

### 1.2 Solução
Hub Londrina é um diretório de negócios locais SaaS focado exclusivamente em Londrina. Funciona como uma vitrine digital por zona (região da cidade), com planos pagos que ampliam a visibilidade e ferramentas de gestão para o lojista.

### 1.3 Missão
*"Onde você compra local, Londrina cresce."*

### 1.4 Público-alvo

| Perfil | Descrição |
|--------|-----------|
| **Consumidor** | Morador de Londrina buscando negócios locais por bairro/categoria |
| **Lojista** | Dono de pequeno/médio negócio local querendo presença digital |
| **Administrador** | Gestor da plataforma (equipe Hub Londrina) |

---

## 2. Contexto de Negócio

### 2.1 Modelo de Monetização

#### Planos de Assinatura (recorrente via Stripe)

| Plano | Mensal | Anual | Equivalente/mês |
|-------|--------|-------|-----------------|
| **Gratuito** | R$ 0 | — | — |
| **Destaque (Base)** | R$ 59,90 | R$ 598,80 | R$ 49,90 |
| **Premium** | R$ 89,90 | R$ 958,80 | R$ 79,90 |

#### Boosts (receita adicional)

| Produto | Preço | Duração | Canal de compra |
|---------|-------|---------|-----------------|
| Boost Categoria — Posição 1 | R$ 149 | 30 dias | Stripe Checkout (Premium only) |
| Boost Categoria — Posição 2 | R$ 119 | 30 dias | Stripe Checkout |
| Boost Categoria — Posição 3 | R$ 99 | 30 dias | Stripe Checkout |
| Boost Categoria — Posição 4 | R$ 79 | 30 dias | Stripe Checkout |
| Boost Categoria — Posição 5 | R$ 59 | 30 dias | Stripe Checkout |
| Boost Avulso — 7 dias | R$ 29 | 7 dias | WhatsApp |
| Boost Avulso — 15 dias | R$ 49 | 15 dias | WhatsApp |
| Boost Avulso — 30 dias | R$ 79 | 30 dias | WhatsApp |
| Boost Zona | — | — | Stripe Checkout |
| Boost Home+Busca | — | — | Stripe Checkout |
| Banner Home | — | — | Stripe Checkout |

---

## 3. Funcionalidades por Perfil

### 3.1 Área Pública (Consumidor)

#### 3.1.1 Landing Page (`/`)
- Hero com banner rotativo (até 2 banners ativos, intervalo 5s)
- Barra de busca com filtro por região
- Contadores em tempo real: negócios ativos, lojistas, categorias, 5 regiões
- Grade de categorias populares
- Negócios em destaque (featured)
- Seção de chamada para cadastro de lojistas
- SEO: SSR com meta tags Open Graph, Twitter Cards e canonical por rota

#### 3.1.2 Categorias (`/categorias`)
- Grade com todas as categorias e contagem de negócios por categoria
- Filtrável por zona

#### 3.1.3 Busca (`/busca`)
- Busca por texto livre (nome, descrição, tags)
- Filtros: categoria, zona, plano, "perto de mim" (geolocalização Haversine)
- Ordenação hierárquica de resultados:
  1. Boosted mensal (por posição de lance, 1-5)
  2. Boosted avulso (por rating)
  3. Premium
  4. Destaque
  5. Gratuito

#### 3.1.4 Perfil do Negócio (`/negocio/:id`)
- Dados completos: nome, descrição, telefone, endereço, horários
- Galeria de fotos
- Vídeo de vitrine (play/pause por visibilidade — IntersectionObserver)
- Catálogo de produtos (Premium)
- Avaliações com resposta do dono
- Botões de ação: WhatsApp, telefone, mapa, Instagram, site
- Rastreamento de cliques por tipo (profile, whatsapp, phone, maps)
- Compartilhamento por link de avaliação

#### 3.1.5 Anuncie (`/anuncie`)
- Tabela comparativa de planos com preços e features
- CTA para cadastro com seleção de plano e ciclo (mensal/anual)

#### 3.1.6 Avaliações (público)
- POST por visitante (rate limit + CSRF)
- 1 avaliação por visitante por negócio (fingerprint único)
- Nota de 1 a 5 estrelas + comentário

---

### 3.2 Painel do Lojista (`/lojista`)

#### 3.2.1 Acesso
- Login por e-mail + senha (JWT válido por 7 dias)
- Troca de senha autenticada
- Exclusão de conta (LGPD): valida senha + confirmação digitada, cancela Stripe, anonimiza dados

#### 3.2.2 Dashboard
- KPIs: total de cliques, WhatsApp, telefone, mapa (últimos 30 dias)
- Alertas de perfil incompleto
- Status do plano atual

#### 3.2.3 Perfil (`/lojista/perfil`)
- Dados básicos: nome, descrição, CNPJ, telefone, WhatsApp
- Horários de funcionamento por dia da semana
- Endereço com autocomplete por CEP (integração ViaCEP)
- Mapa com pin ajustável (latitude/longitude)
- Tags personalizadas (ex: "delivery", "estacionamento")
- Formas de pagamento aceitas
- Instagram e site (bloqueado no plano Gratuito)
- Vídeo de vitrine URL (bloqueado no plano Gratuito e Destaque)

#### 3.2.4 Fotos (`/lojista/fotos`)
- Upload de logo (bloqueado no Gratuito)
- Upload de banner (bloqueado no Gratuito)
- Galeria de fotos (limite por plano)
- Tipos aceitos: JPG, PNG, WebP, GIF

#### 3.2.5 Produtos (`/lojista/produtos`)
- CRUD completo de catálogo de produtos (Premium only)
- Campos: nome, descrição, preço, mídia, ordem
- Reordenação por drag-and-drop

#### 3.2.6 Métricas (`/lojista/metricas`)
- Total de cliques por tipo (Gratuito: bloqueado)
- Gráfico de cliques por dia — últimos 30 dias (Premium only)

#### 3.2.7 Avaliações (`/lojista/avaliacoes`)
- Lista de avaliações recebidas com nota e texto
- Resposta do dono (Destaque e Premium)
- Copiar link de avaliação para compartilhar

#### 3.2.8 Suporte (`/lojista/suporte`)
- Abertura de tickets com assunto, mensagem e prioridade (low/normal/high/urgent)
- Listagem de tickets com status (open/in_progress/resolved/closed)
- Notificação por e-mail quando admin responde

#### 3.2.9 Boost (`/lojista/boost`)
- 5 posições de destaque por categoria (Premium only)
- Compra via Stripe Checkout com bloqueio de posição concorrente (advisory lock)
- Waitlist automático se posição ocupada
- Boost avulso: contato via WhatsApp

#### 3.2.10 Plano & Assinatura (`/lojista/plano`)
- Aba "Visão Geral": status atual, período de vigência, boosts ativos, banner
- Aba "Mudar Plano": comparativo dos 3 planos com toggle mensal/anual
- Histórico de faturas (até 24) com status, link de visualização e PDF
- Acesso ao Billing Portal do Stripe (cancelamento, troca de cartão)

---

### 3.3 Painel Admin (`/admin`)

#### 3.3.1 Acesso
- Login por senha única (sem usuário) + JWT
- Impersonar lojista: abre painel do negócio em nova aba (auditado)

#### 3.3.2 Dashboard
- 6 KPIs: total de negócios, lojistas ativos (30d), MRR real, MRR potencial, total de cliques, avaliações
- Distribuição por plano, região e categoria (gráficos)
- Top 10 negócios por cliques
- Feed de cadastros recentes
- Distribuição de visibilidade (visível/oculto)

#### 3.3.3 Gestão de Negócios (`/admin/negocios`)
- Tabela com filtros (plano, região, status, busca por nome)
- Ações por linha: editar plano, toggle visibilidade, excluir, impersonar
- Modal de detalhe: todos os campos + produtos + breakdown de cliques

#### 3.3.4 Categorias (`/admin/categorias`)
- CRUD completo (nome, slug, ícone, cor, descrição)

#### 3.3.5 Impulsionamento (`/admin/impulsionamento`)
- Visualização das 5 posições de boost por categoria
- Criação/remoção manual de boosts
- Listagem de boosts avulsos ativos e histórico

#### 3.3.6 Banners Home (`/admin/home-banners`)
- CRUD de banners (máx. 2 ativos simultaneamente)
- Aprovação/rejeição com auditoria

#### 3.3.7 Zonas (`/admin/zonas`)
- 5 zonas canônicas: Centro, Norte, Sul, Leste, Oeste
- CRUD de metadados por zona (nome, cor, banner, descrição)
- Gestão de slots de destaque por zona (até 6 por zona)

#### 3.3.8 Suporte (`/admin/suporte`)
- Fila de tickets com filtros por status e prioridade
- Modal de resposta com envio automático de e-mail ao lojista
- Troca rápida de status sem abrir modal

#### 3.3.9 Moderação de Avaliações (`/admin/reviews`)
- Listagem com filtros por negócio e nota
- Exclusão de avaliação (recalcula rating e contagem do negócio)

#### 3.3.10 Auditoria (`/admin/audit-log`)
- Log de todas as ações administrativas
- Filtros por tipo de ação, admin e quantidade
- Campos: ação, alvo, IP, timestamp

---

## 4. Regras de Negócio Críticas

### 4.1 Planos e Acesso

| Recurso | Gratuito | Destaque | Premium |
|---------|----------|----------|---------|
| Perfil básico | ✅ | ✅ | ✅ |
| Logo e banner | ❌ | ✅ | ✅ |
| Instagram / site | ❌ | ✅ | ✅ |
| Vídeo de vitrine | ❌ | ❌ | ✅ |
| Catálogo de produtos | ❌ | ❌ | ✅ |
| Métricas de cliques | ❌ | ✅ | ✅ |
| Gráfico de cliques | ❌ | ❌ | ✅ |
| Responder avaliações | ❌ | ✅ | ✅ |
| Boost por categoria | ❌ | ❌ | ✅ |

### 4.2 Ordenação de Resultados
A ordem de exibição em listagens e busca é sempre:
1. **Boosted mensal** — posição 1 a 5 (menor número aparece primeiro)
2. **Boosted avulso** — por rating decrescente
3. **Premium** — por rating decrescente
4. **Destaque** — por rating decrescente
5. **Gratuito** — por rating decrescente

### 4.3 Boost por Categoria
- Apenas negócios Premium podem comprar posições
- Cada posição é exclusiva (1 negócio por posição por vez)
- Se posição ocupada, entra em waitlist automático
- Trava concorrente via `pg_advisory_xact_lock` para evitar dupla compra simultânea
- Duração fixa: 30 dias
- Expiração verificada a cada 1 hora (job automático)

### 4.4 Banners Home
- Máximo 2 banners ativos simultaneamente
- Aprovação necessária pelo admin antes de ir ao ar
- Exibição rotativa com intervalo de 5 segundos

### 4.5 Avaliações
- 1 avaliação por visitante por negócio (fingerprint + UNIQUE index)
- Rate limit por IP para evitar spam
- CSRF token obrigatório
- Rating do negócio recalculado automaticamente (AVG das avaliações)

### 4.6 LGPD — Exclusão de Conta
1. Lojista valida senha + digita "EXCLUIR"
2. Sistema cancela assinatura Stripe ativa
3. Remove arquivos de mídia (best-effort)
4. Anonimiza `businesses`: sentinel email, status="deleted", limpa todos os PII
5. Anonimiza `business_users`: sentinel email, hash vazio, flags resetados

---

## 5. Arquitetura Técnica

### 5.1 Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 19 + Vite, Wouter, TanStack Query, shadcn/ui, Tailwind CSS |
| Backend | Express 5 + TypeScript, Node.js 24 |
| Banco de dados | PostgreSQL + Drizzle ORM |
| Pagamentos | Stripe (Checkout, Billing Portal, Webhooks) |
| Uploads | Object Storage (MIME filter: jpg/png/webp/gif) |
| E-mail transacional | Resend (FROM: noreply@hublondrina.com.br) |
| Monitoramento de erros | Sentry (graceful — silencioso sem DSN) |
| Auth | JWT (admin: senha única · lojista: e-mail+senha, 7 dias) |
| SSR | server.mjs (meta tags OG/Twitter por rota) |

### 5.2 Zonas Canônicas

| Slug | Nome |
|------|------|
| `centro` | Zona Centro |
| `norte` | Zona Norte |
| `sul` | Zona Sul |
| `leste` | Zona Leste |
| `oeste` | Zona Oeste |

### 5.3 Jobs Automáticos (diários, com checkpoint)
- **Boost Expiration**: expira boosts vencidos, promove waitlist
- **Documentation Job**: métricas de engajamento
- **Subscription Reminder**: e-mails de aviso de vencimento de boost/banner

### 5.4 Paleta de Marca

| Token | Cor | Uso |
|-------|-----|-----|
| Marrom | `#6F4E37` | Textos principais, headers |
| Laranja | `#FF9800` | CTAs, destaques, accent |
| Verde | `#4CAF50` | WhatsApp, sucesso |
| Bege | `#F5F5DC` | Fundo geral |

**Tipografia:** Playfair Display (títulos serif) · Inter (corpo)

---

## 6. Fluxo de Cadastro do Lojista

```
Passo 1 — Sua conta
  └── Nome, e-mail, senha, telefone

Passo 2 — Seu negócio
  └── Nome do negócio, CNPJ, categoria, zona, descrição

Passo 3 — Endereço
  └── CEP (autocomplete), rua, número, bairro

Passo 4 — Confirmação
  └── Aceite dos Termos de Uso
  └── Submit → cria business + business_users + envia e-mail de boas-vindas

Pós-cadastro
  └── Se veio de /anuncie?plano=X&ciclo=Y → redireciona para Stripe Checkout
  └── Se plano gratuito → vai direto para /lojista
```

---

## 7. E-mails Transacionais

| Evento | Destinatário | Gatilho |
|--------|-------------|---------|
| Boas-vindas | Lojista | Cadastro concluído |
| Confirmação de pagamento | Lojista | Webhook Stripe: payment_succeeded |
| Falha de pagamento | Lojista | Webhook Stripe: invoice.payment_failed |
| Resposta de suporte | Lojista | Admin responde ticket |
| Lembrete de vencimento boost | Lojista | Job diário (D-1 antes do vencimento) |
| Lembrete de vencimento banner | Lojista | Job diário (D-1 antes do vencimento) |
| Recuperação de senha | Lojista | Solicitação no login |

---

## 8. Métricas de Sucesso (KPIs)

| Métrica | O que mede |
|---------|-----------|
| MRR Real | Receita mensal recorrente de assinaturas ativas |
| MRR Potencial | Potencial se todos convertessem ao plano contratado |
| Taxa de conversão Gratuito→Pago | % negócios que upgradaram |
| Lojistas ativos (30d) | Login nos últimos 30 dias |
| Cliques totais | Engajamento do consumidor com os negócios |
| Receita de Boosts | Soma de `search_boosts.price` no mês |

---

## 9. Roadmap Pendente

| Item | Prioridade | Descrição |
|------|-----------|-----------|
| `anuncie.tsx` consumir `/api/stripe/config` | Alta | Preços dinâmicos na página pública |
| Boost Zona e Home+Busca UI completa | Alta | Auto-serviço para zona e posição home |
| Notificação de nova avaliação | Média | E-mail ao lojista quando recebe avaliação |
| Painel de Analytics avançado | Média | Funil de conversão, heatmap de cliques |
| App mobile (lojista) | Baixa | Notificações push, acesso rápido |
| Integração Google Maps | Baixa | Pin no mapa dentro do perfil público |

---

*Documento gerado automaticamente a partir do estado atual do sistema em produção — hublondrina.com.br*
