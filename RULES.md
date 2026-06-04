# Hub Londrina — Regras de Negócio Invariantes

> **Para o agente**: este arquivo é um contrato. Toda mudança em código deve preservar TODOS os invariantes abaixo. Antes de declarar qualquer task como "concluída", confirme cada regra relevante com **evidência concreta** (curl, SQL, screenshot, teste E2E) — não com leitura de código.

---

## ⛔ Regras invioláveis

### R1 · Gates de plano são sagrados
Plano free **NUNCA** pode comprar nenhum boost ou banner. Gates obrigatórios em **AMBAS** as camadas (backend é fonte de verdade, frontend é cosmético):

| Recurso | Plano mínimo | Backend (rota) | Frontend (componente) |
|---|---|---|---|
| Boost zona | Destaque | `POST /api/lojista/boosts/checkout` (boostContext=zone) | `LojistaBoost.tsx` card Zona |
| Boost home+busca | Premium | `POST /api/lojista/boosts/checkout` (boostContext=home_search) | `LojistaBoost.tsx` card Home+Busca |
| Boost categoria | Premium | `POST /api/lojista/boosts/category-checkout` | `LojistaBoost.tsx` tabela categoria |
| Banner Home R$299 | Premium | `POST /api/lojista/home-banner/checkout` | `LojistaBoost.tsx` card Banner Home |
| Logo / Banner upload | Destaque | `POST /api/lojista/upload/{logo,banner}` (`requirePlan("destaque")`) | `LojistaPerfil.tsx` / `LojistaProdutos.tsx` (aviso "Exclusivo Base/Destaque" + botões disabled) |
| Instagram / Website | Destaque | `PATCH /api/lojista/profile` | `LojistaPerfil.tsx` (LockedFeature) |
| Vídeo vitrine | Premium | `PATCH /api/lojista/profile` (videoUrl) | `LojistaPerfil.tsx` (LockedFeature) |
| Vitrine produtos | Destaque (6) / Premium (10) | `POST /api/lojista/products` | `LojistaProdutos.tsx` (LockedFeature) |
| Métricas | Destaque (números) / Premium (gráfico) | `GET /api/lojista/metrics` | `LojistaMetricas.tsx` (LockedFeature) |
| Resposta a review | Destaque | `POST /api/lojista/reviews/:id/respond` | `LojistaAvaliacoes.tsx` |
| Relatório PDF | Premium | endpoint dedicado | — |

**Regra de UI para CTAs bloqueados**: botão `disabled` cinza + alert amarelo "Exclusivo plano X" + link discreto "Ver planos". **Não mostrar botão clicável** que vai para `/lojista/plano`.

**Plan check sempre lê do DB** (nunca do JWT, que pode estar desatualizado).

**UI nunca rebaixa o plano silenciosamente** (Task #64): se o fetch de `/lojista/profile` falhar, o front **não** pode assumir `planType="free"` e renderizar o recurso como bloqueado — isso mostra "Exclusivo Premium" para quem É Premium. Tratar o erro à parte (ex.: `planLoadError`) com aviso "recarregar", e sempre oferecer "Sincronizar plano agora" para qualquer estado não-premium. O texto de dimensões de upload (ex.: Banner Home `1200×280`) deve ter **fonte única** no componente e bater com o processamento do backend (Sharp), aparecendo **antes** da compra.

**Ordem das guards de checkout**: o **gate de plano vem PRIMEIRO**, antes de qualquer checagem de estado do negócio (`status`/`isVisible`). Para um lojista free o motivo real do bloqueio é o plano — retornar `BUSINESS_INACTIVE` antes de `PLAN_REQUIRED` esconde o gate e confunde o usuário (free nasce `isVisible=false` por design). Vale para todos os endpoints de checkout, incluindo `POST /api/lojista/home-banner/checkout`.

---

### R1.1 · Seção Patrocinadores na home (Task #31)
- Tabela `partners` é fonte única; a seção fica em `src/components/PartnersSection.tsx` e é renderizada em `landing.tsx` no lugar do antigo bloco de depoimentos.
- A seção **só renderiza** se pelo menos 1 patrocinador estiver `isActive=true` (em qualquer tier). Vazio = nada na home (sem placeholder).
- Clique em logo só leva para rota interna `/negocio/:id` quando `businessId` está vinculado. **Proibido** colocar URLs externas no clique sem nova decisão de produto (link externo = risco de SEO/segurança/abuso).
- `businessId` usa `ON DELETE SET NULL` — se o negócio for excluído, o patrocinador fica órfão (logo aparece sem link), nunca é deletado em cascata.
- Upload de logo só por admin via `POST /api/admin/upload/partner-logo` (multer 5MB, PNG/JPG/WEBP/SVG). Lojista **não** tem auto-cadastro nesta versão.

---

### R2 · Documentação aprovada é PRÉ-REQUISITO de visibilidade após o prazo (Task #63, substitui Task #32)
Pagar o plano e aprovar a documentação continuam sendo **trilhas separadas** — pagar **NÃO aprova documento** e o admin analisa doc por doc — mas as duas trilhas **se cruzam num ponto**: depois que o prazo de documentação estoura, **só a aprovação dos 3 documentos mantém/coloca a loja no ar**. Pagamento (e qualquer heal) **não republica** loja com documentação `expired`.

> ⚠️ Mudança em relação à Task #32: o antigo R2-A ("loja paga continua visível mesmo com documentação expirada") foi **REVOGADO**. Agora documentação expirada derruba a loja **para todos os planos**.

**Fonte única de verdade** — `lib/documentation-state.ts`:
- `syncDocumentationState(businessId)` deriva `business_users.documentationStatus`, `documentationTimerPaused` e `businesses.verified` **a partir do estado real de `business_documents.status`**. É chamado em TODOS os pontos que mexem em documento: upload do lojista, approve/reject do admin, e o heal de reconciliação no startup (`healDocumentationConsistency`). É **proibido** recalcular esse agregado à mão em qualquer rota — sempre delegar a este helper.
  - 3 aprovados → `approved` (timer pausado); algum rejeitado → `rejected` (timer corre); 3 presentes sem rejeitados → `submitted` (timer pausado); faltam docs → `pending` (timer corre).
  - **`expired` é STICKY**: qualquer estado **não-aprovado** com o banco de dias zerado (`remaining<=0`) vira `expired`. Completar/reenviar os 3 docs depois do prazo (`submitted`) **NÃO** tira do `expired` — senão `isDocumentationExpired` voltaria a `false` e pagamento/heal republicariam a loja sem aprovação. **Só `allApproved` escapa da expiração.**
  - `verified` é **estritamente derivado**: `verified=true` **se e somente se** os 3 docs estão aprovados; **qualquer** outro estado (pending/submitted/rejected/expired) força `verified=false`. Não há selo manual/legado — o heal de reconciliação corrige divergências históricas. O endpoint `PATCH /api/admin/businesses/:id` **rejeita** (`400 VERIFIED_IS_DERIVED`) qualquer tentativa de setar `verified` à mão; as únicas escritas em `businesses.verified` ficam em `syncDocumentationState` (derivação) e no seed (bootstrap).
  - **Reconciliação ≠ re-publicação**: `syncDocumentationState(id, { reopenOnApproval })`. Por padrão (`false`) só deriva `documentationStatus`/`timerPaused`/`verified` e **NÃO** toca `isVisible`/`status`/`planFrozen` para estados **não-expirados** (pending/submitted/rejected) — usado pelo heal de startup, cron e upload do lojista, para não desfazer ocultação manual do admin nem republicar por engano. A re-publicação (`isVisible=true`/`status=active`/`planFrozen=false`) só acontece com `reopenOnApproval:true`, **exclusivamente** no caminho de aprovação final do admin (`routes/documents.ts`).
  - **Exceção `expired` (Task #71)** — `expired` derruba a loja para TODOS os planos. Quando o estado resolvido é `expired`, `syncDocumentationState` **também grava `isVisible=false`** (além de `verified=false`), em QUALQUER caminho que a chame (heal/cron/upload), e **não só** o cron no instante exato da transição. Assim `documentationStatus='expired'` + `isVisible=true` é estado inválido que **nunca persiste** — o heal de boot o corrige para toda a base. Isso **não** é republicação (só baixa a flag); a religação continua exclusiva da aprovação dos 3 docs (`reopenOnApproval:true`). Como reforço do invariante, o endpoint `PATCH /api/admin/businesses/:id` **rejeita** (`409 DOCUMENTATION_EXPIRED`) qualquer tentativa de setar `isVisible=true` quando a documentação está `expired` — o admin não pode republicar manualmente uma loja expirada contornando os reads públicos (que filtram só por `isVisible`).
- `isDocumentationExpired(businessId)` → `true` quando `documentationStatus='expired'`. É o gate de publicação usado pela trilha de pagamento.

**Trilha A — Pagamento** (Stripe):
- `checkout.session.completed`, `invoice.payment_succeeded` (webhook), `POST /api/lojista/stripe/sync` (fallback) e `healPaidInvisibleBusinesses()` (startup), quando o pagamento confirma:
  - setam `businesses.status = "active"` sempre; e setam `businesses.isVisible = true` **APENAS se `isDocumentationExpired(businessId) === false`**. Se a documentação está `expired`, a loja permanece **offline** até a aprovação dos 3 docs.
  - **NUNCA** alteram `business_users.documentationStatus` nem `documentationRemainingDays`.
- Email enviado: apenas `pagamentoConfirmado`/`upgradePlano`. **Proibido** disparar `cadastroAprovado` aqui — o admin não aprovou nada.

**Trilha B — Documentação** (lojista + admin + cron):
- **Timer com banco de dias (banking)**: o lojista nasce com `documentationRemainingDays=10`. O relógio em `documentation-job.ts` **decrementa 1 por dia ativo** SOMENTE em `pending`/`rejected` com `documentationTimerPaused=false`. Enviar os 3 docs (`submitted`) ou aprovar (`approved`) **pausa** o timer (congela o saldo); uma rejeição **retoma** do saldo congelado. **Nunca** derivar o restante de `firstLoginAt` (isso ignorava as pausas).
- Status (`pending → submitted → approved | rejected | expired`) só muda via `syncDocumentationState` (upload/approve/reject) e via o cron. Pagamento NÃO aciona nenhum desses.
- Aprovação completa religa a loja: `verified=true`, `isVisible=true`, `status=active`, `planFrozen=false`. Badge "Verificado" aparece nos cards e na página do negócio.
- **Expiração (cron)**: quando `documentationRemainingDays` chega a 0 sem os 3 aprovados, o cron seta `documentationStatus='expired'` **e `businesses.isVisible=false` para QUALQUER plano** (gratuito, base/destaque, premium), e dispara `emails.documentacaoExpirada(nome)`. O envio dos docs sozinho **não** republica — só a aprovação do admin.
- Emails de contagem regressiva são enviados **apenas** nos marcos `{7, 3, 1}` dias restantes (não 1/dia).
- Email de rejeição lista TODOS os docs atualmente rejeitados no negócio (não só o último), via `emails.documentacaoRejeitada(nome, Array<{tipo, motivo}>)`.

**Reconciliação (startup)**: `healDocumentationConsistency()` roda `syncDocumentationState` para todos os negócios, corrigindo divergências históricas (banner "aprovado" com docs `submitted`; 3 aprovados sem selo). É **conservador** para estados não-expirados: não republica nem desfaz ocultação manual do admin. **A única ação retroativa de visibilidade é derrubar lojas `expired` que ficaram com `isVisible=true`** (Task #71): como `expired` = offline para TODOS os planos, esse estado é inválido e o heal o corrige para `isVisible=false` em toda a base — não depende mais de o cron ter virado a flag no exato momento da expiração.

**Teste** (provado em dev — ver CHANGELOG): (1) docs 3-aprovados com agregado mentindo `submitted`+`verified=false`+offline → após heal: `approved`/`verified=true`/`isVisible=true`. (2) rejeitar 1 doc → `verified=false`/`rejected`. (3) loja **destaque** com `remaining=1`/`pending` → cron → `expired`+`isVisible=false`. (4) loja paga (assinatura ativa) com docs `expired` e invisível → `healPaidInvisibleBusinesses` **não** republica (`isVisible` continua `false`). (5) **Task #71** — loja `expired`+`isVisible=true` (estado-bug igual ao de produção) aparecia em `/api/businesses` e `/api/search`; após restart, o heal gravou `isVisible=false` e a loja **sumiu** das duas superfícies, enquanto 4 lojas `pending` com `remaining>0` **continuaram visíveis** (conservadoria intacta). (6) **Task #71 (guard admin)** — com a loja em `expired`, `PATCH /api/admin/businesses/:id` com `{isVisible:true}` retornou **`409 DOCUMENTATION_EXPIRED`** (não republicou), enquanto um PATCH de campo não-documental (`description`) seguiu retornando `200`.

---

### R3 · GET /api/lojista/profile deve sempre retornar zone + region
Ambos os campos vêm do cadastro e são necessários para:
- `LojistaDashboard.tsx` mostrar "Zona X" no cabeçalho (usa **só** `zone`, o slug canônico — sem fallback `zone || region`, que mascarava `zone` nulo e podia gerar "Zona Zona Sul" ao capitalizar o display)
- `LojistaBoost.tsx` calcular ocupação da zona do negócio

**Teste**: `curl -H "Authorization: Bearer $JWT" /api/lojista/profile | jq '.zone, .region'` deve retornar 2 valores não-nulos.

---

### R4 · JWT lojista — chave única do localStorage
**SEMPRE** usar `lojistaFetch()` de `src/lib/lojista-api.ts`. Ele lê a chave correta de `LOJISTA_STORAGE_KEYS` (`hub_lojista_token`).

**NUNCA** fazer `localStorage.getItem("lojista_token")` ou `localStorage.getItem("token")` diretamente — vai retornar `null` e quebrar autenticação silenciosamente.

---

### R5 · Storage / GCS — paths sem duplo prefixo
URLs de mídia salvas no DB são `/storage/objects/uploads/{folder}/{file}`. O handler `routes/storage.ts` recebe `gcsPath` que **já contém** o prefixo `uploads/...`.

**NUNCA** chamar `serveGCSObject(\`uploads/${gcsPath}\`)` — vai gerar `uploads/uploads/...` no bucket → 404.
**SEMPRE**: `serveGCSObject(gcsPath)` direto.

---

### R6 · Upload de imagens — limite 15MB
- Multer config em `api-server` deve aceitar até 15MB.
- Frontend (`LojistaFotos.tsx`) deve validar 15MB antes de enviar.
- Error handler global em `app.ts` deve retornar **413 amigável** para `LIMIT_FILE_SIZE`, não 500 genérico.

---

### R7 · Stripe sync pós-pagamento (não confiar só no webhook)

**Fluxo A — Checkout novo** (lojista sem assinatura ativa):
Todo `success_url` de checkout Stripe **deve incluir** `&session_id={CHECKOUT_SESSION_ID}`. O frontend (`LojistaDashboard.tsx`, `LojistaBoost.tsx`) detecta esse param e chama `/lojista/stripe/sync` ou `/lojista/boosts/sync` para garantir ativação imediata mesmo se o webhook atrasar.

**Fluxo B — Portal Stripe** (lojista com assinatura ativa fazendo upgrade/downgrade):
Lojistas com assinatura ativa são redirecionados ao Portal do Stripe (não ao checkout), que **não emite `session_id`**. O `return_url` do portal **deve incluir** `?portal_return=1`. `LojistaPlano.tsx` detecta esse param, chama `POST /lojista/stripe/sync` sem `sessionId` (o endpoint tem fallback que busca a subscription ativa por `stripeCustomerId`), e faz polling até `profile.planType === targetPlanType` retornado pelo sync — não apenas `!== "free"`, pois o plano antigo (destaque) já satisfaria essa condição.

**Fallback de sync sem sessionId** (`POST /lojista/stripe/sync`, `stripe.ts`):
Quando `sessionId` é ausente, busca `stripeCustomerId` em `subscriptions`, chama `stripe.subscriptions.list({ status: "active", limit: 1 })`, cai para `status: "all"` se não encontrar ativa.

**Sync routes devem ser idempotentes** (checar `existingMine` antes de inserir, usar mesmas `pg_advisory_xact_lock` do webhook).

---

### R8 · Cadastro grava zone + region
`POST /api/auth/register` (`auth.ts`) deve gravar **ambos** `businesses.zone` (slug) e `businesses.region` (display). `Cadastro.tsx` envia `zone` no payload; backend deriva `region` da metadata em `lib/zones.ts`.

---

### R9 · Boost locks — chaves determinísticas
`api-server/src/lib/boost-locks.ts` usa chaves `int32 [ns:8|slot:24]`:
- `ns=1` categoria · `ns=2` zona · `ns=3` home_search

**Nunca** gerar chave de lock por `hash(string)` — colisões silenciosas geram race conditions na compra.

---

### R10 · Webhooks Stripe são idempotentes
Toda lógica em `POST /api/stripe/webhook` deve checar duplicatas antes de inserir/atualizar (Stripe pode reenviar o mesmo evento). Usar:
- Para boosts: query por `(businessId, boostType, boostContext, status='active')` antes de inserir.
- Para subscription: `ON CONFLICT (stripeSubscriptionId) DO UPDATE`.

---

### R11 · Vitrine de Produtos da Home
Bloco "Vitrine de Produtos" em `landing.tsx` segue regras estritas:

**Composição visual fixa**: 12 cards no carrossel horizontal.
- **4 slots fixos** = boost Vitrine Destaque (R$ 49/mês, exclusivo Premium).
- **8 slots de rotação** = produtos de qualquer Premium com pelo menos 1 vídeo aprovado, embaralhados a cada page load.
- Se sobrar slot fixo vazio (ninguém comprou boost), promove rotação até completar 12. Carrossel **nunca** mostra menos de 6 cards (se não houver 6, não renderiza o bloco).

**Gates de plano** (backend é fonte de verdade):
| Plano | Pode aparecer? | Pode comprar boost vitrine? |
|---|---|---|
| Free | ❌ | ❌ |
| Base | ❌ | ❌ |
| Premium | ✅ se tem ≥1 vídeo aprovado | ✅ +R$ 49/mês |

**Vídeo é obrigatório** para entrar (rotação ou boost). Lojista Premium sem vídeo recebe aviso destacado no `LojistaDashboard.tsx`: *"Você está perdendo aparições na Vitrine. Suba 1 vídeo para ativar."*

**Aprovação admin**: todo vídeo novo entra com `status="pending"` e só aparece após admin aprovar em `/admin/vitrine`.

**Nota**: home banners (R$299/mês) NÃO passam mais por fila de aprovação desde a Task #56 — ativação automática após upload.

**Endpoint público**: `GET /api/vitrine` retorna até 12 cards (4 fixos + 8 aleatórios) com `{productId, businessId, name, price, videoUrl, photoUrl, whatsapp, businessName}`. **Não cacheia em CDN** — randomização precisa rodar a cada request.

**Endpoint compra boost**: `POST /api/lojista/vitrine-boost/checkout` cria Stripe checkout de R$ 49/mês (subscription). Gate `planType === "premium"` antes de criar sessão.

**Esgotado**: quando os 4 slots de boost estão vendidos, `/lojista/boost` mostra "Vitrine Destaque — esgotado este mês" com botão desabilitado.

---

### R12 · UX de bloqueio nos cards de impulsionamento (lojista)
Todo card de produto em `LojistaBoost.tsx` (Vitrine, Vagas Mensais/Categoria, Destaque Home+Busca, Destaque de Zona, Banner na Home) **deve ter**:

1. **Texto explicativo** em caixa colorida (1 parágrafo, linguagem leiga, sem jargão técnico) ANTES do botão de compra, explicando o que o produto faz na prática.
2. **Badge laranja** "Exclusivo Premium" ou "Exclusivo Destaque+" no canto do título quando o lojista atual não é elegível (`!eligible` ou `planType !== "premium"` conforme o produto).
3. **Botão cinza desabilitado** (`bg-gray-200 text-gray-500 cursor-not-allowed opacity-70`) + caixa amarela (`bg-amber-50 border-amber-200`) com link "Ver planos" → `/lojista/plano`. Nunca mostrar botão clicável que cobra um free.

Equivalente no admin (`AdminImpulsionamento.tsx`): painel colapsável "Como funcionam os impulsionamentos?" no topo (CSS puro, começa fechado) + subtítulo muted (`text-xs text-gray-500 ml-7`) com resumo de 1 linha abaixo de cada `<h2>` de seção. Sem essas explicações o admin novato confunde os 7 produtos diferentes.

**Por quê é regra**: os 7 produtos de impulsionamento são facilmente confundidos entre si. A explicação inline reduz tickets de suporte e aumenta conversão. Removê-la equivale a esconder o produto.

---

### R13 · Config Legal vive no banco (Task #33)
Os dados legais (razão social, CNPJ, DPO_EMAIL, TERMS_VERSION, RETENTION_MONTHS, etc.) são editados em `/admin/legal` e persistidos na tabela `legal_config`. Regras:

1. **Defaults em código são FALLBACK**, não fonte de verdade. `LEGAL_CONFIG_DEFAULTS` (server `lib/legal-config.ts`, front `lib/legal-config.ts`) só é usado se a tabela está vazia ou indisponível.
2. **Campos CORE são protegidos**: as 10 chaves do `LEGAL_CONFIG_DEFAULTS` (COMPANY_NAME, COMPANY_CNPJ, COMPANY_ADDRESS, CONTACT_EMAIL, DPO_EMAIL, TERMS_VERSION, LAST_UPDATED, RETENTION_MONTHS, PLATFORM_NAME, PLATFORM_URL) **não podem ser excluídas** pelo admin (apenas editadas). DELETE em chave core retorna 403.
3. **Cache do server**: `getLegalConfig()` (em `legal-config-store.ts`) cacheia 60s. Toda escrita admin **DEVE** chamar `invalidateLegalConfig()` antes de retornar.
4. **TERMS_VERSION invalida consents implícitos**: trocar a versão força usuários novos a re-aceitar (auth.ts checa contra valor vigente do store, não contra constante hardcoded). Consents antigos no banco mantêm a versão original — auditoria preservada.
5. **Front consome via `useLegalConfig()` hook** (fetch único + cache módulo + fallback aos defaults). Componentes não devem importar `LEGAL_CONFIG` cru se precisam de reatividade após edição admin.

### R14 · Startup do api-server abre a porta ANTES das tarefas de manutenção
O autoscale só considera o deploy saudável quando o processo abre sua porta (`PORT`) dentro do timeout do health check. Em `artifacts/api-server/src/index.ts`, `app.listen(port)` deve rodar **primeiro**; as tarefas que dependem do banco (Sentry/seed/`ensureViews`/`heal*`/jobs) rodam **depois** do listen, dentro de um bloco com `try/catch` que **loga mas não derruba** o servidor. **Proibido** colocar `app.listen` no fim de uma cadeia de promises de startup (qualquer travamento/rejeição segura a porta fechada e a publicação falha no timeout — `not all artifact ports opened`). Uma tarefa de manutenção que falha nunca pode impedir a porta de abrir.

### R15 · Capacidade de vagas dos boosts por contexto (fonte única)
As constantes de capacidade vivem em `api-server/src/lib/boost-locks.ts` e são a **fonte única** usada por disponibilidade (`boosts.ts`), checkout/sync e webhook Stripe (`stripe.ts`), job de expiração/waitlist (`boost-expiration.ts`) **e criação avulsa pelo admin (`admin.ts` → `/admin/boosts-extra`)**:
- `ZONE_SLOTS = 3` — vagas ativas de "Destaque de Zona" **por zona** (Task #66, reduzido de 6). 4º+ comprador entra na `waitlist` e é promovido quando uma vaga abre.
- `HOME_SEARCH_SLOTS = 6` — contador **legado** do `home_search` antigo. O modelo vigente é por **posição numerada** (3 vagas: #1 R$249, #2 R$179, #3 R$129) via `/lojista/boosts/home-search-checkout`; o `/boosts/checkout` genérico só aceita `zone`.

**Proibido** hardcodar `6` (ou qualquer número) no caminho da zona — sempre importar `ZONE_SLOTS`. Reduzir a zona **não pode** afetar o teto do home_search nem de nenhum outro contexto (são constantes separadas de propósito).

---

## 🚧 Workflow de qualidade (para o agente)

### W1 · "Pronto" exige prova
Antes de declarar uma task concluída:
- Endpoint novo/alterado → executar `curl` real e colar response no chat.
- UI nova/alterada → fazer screenshot via `screenshot` ou rodar `runTest()` da skill `testing`.
- Mudança de schema → confirmar via `executeSql` (dev e/ou prod).
- Mudança de gate de plano → testar com lojista free **e** com lojista premium (impersonate via `/admin/impersonate/:id`).

**"Code review" mental não basta. Sem prova ≠ pronto.**

### W2 · Não bundle múltiplos bugs
Se o usuário pede "corrija A, B e C", trate cada um como sub-task separada com sua própria evidência. É comum o agente focar em A, esquecer B e fingir C.

### W3 · Sempre ler RULES.md ao abrir sessão
Sessões novas começam sem contexto. Antes de qualquer mudança em rotas Stripe / lojista / admin / boost, releia este arquivo inteiro (é curto de propósito).

### W4 · Code review antes de commit em áreas críticas
Usar a skill `code_review` (`architect`) antes de finalizar mudanças em: Stripe, autenticação, gates de plano, webhooks, schema do DB.

### W5 · Não inflar este arquivo
Histórico de bugs vai em `CHANGELOG.md`. Aqui só entram **invariantes que valem para sempre**. Se um item virou "regra obsoleta", remova — não comente.
