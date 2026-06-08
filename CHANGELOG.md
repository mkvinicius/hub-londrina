# Hub Londrina — Histórico de mudanças

> Decisões e bugfixes em ordem cronológica reversa. Para regras vigentes ver `RULES.md`.

---

## 2026-06-08

### Lojista pode TROCAR a arte do Banner na Home com o plano ativo (sem perder a vaga)

**Problema**: depois que o banner ficava `active`, o lojista não tinha como mudar a imagem. O endpoint `POST /api/lojista/home-banner/upload` só casava banners em `paid_awaiting_upload` ou `rejected`, e o bloco "ativo" da UI (`LojistaBoost.tsx`) só exibia "Seu banner está ativo na Home!" — sem nenhuma ação. Quem queria atualizar a arte ficava travado.

**Correção** (troca no lugar, sem downtime e sem perder a vaga paga — preferida a um "excluir" que liberaria a vaga dos máx. 2 lojistas):
- Backend (`routes/lojista.ts`): o endpoint de upload agora também casa banners `active`, substituindo a imagem **no lugar** (status segue `active`, mesma linha em `home_banners`, mesma vaga). O processamento Sharp é o mesmo (resize 1200×280 `fit:cover` + `position:attention` recorte inteligente, `jpeg quality 85`).
- Frontend (`LojistaBoost.tsx`): o bloco do banner ativo ganhou texto explicativo ("enquanto o plano estiver ativo, troque a arte quantas vezes quiser") + botão **"Trocar arte do banner"** (mesmo fluxo de upload, mesmo `bannerImageRef`).

**Tratamento de imagem** (resposta à dúvida do dono): sim, há tratamento automático — Sharp redimensiona toda imagem enviada para **1200×280px** com **recorte inteligente** (`fit:cover`, `position:attention`, foca na região de maior saliência) e recomprime em **JPEG qualidade 85**. O lojista sobe JPG/PNG/WebP de qualquer dimensão (≤15 MB) e o sistema entrega a arte na proporção 4:1 correta.

**Provas (dev)**: (1) E2E via curl/SQL: banner `active` (image antiga `OLD-placeholder.jpg`) → login lojista premium → `POST /home-banner/upload` (multipart, imagem real) → **200** `{ok:true, imageUrl:".../1-<ts>.jpg"}` → SQL confirmou `status='active'` + `image_url` trocada (substituição no lugar). (2) E2E de UI (Playwright): login premium → `/lojista/boost` → seção "Banner na Home" mostra "Seu banner está ativo na Home!" + botão "Trocar arte do banner" + texto explicativo (**success**). (3) `validate-lojista-rules` (R1/R3/R11) **OK** — gates de plano intactos.

### Config legal propaga em ~60s, não em 5 min: header HTTP alinhado ao cache interno (Task #78)

**Problema** (R13): o store interno da config legal (`legal-config-store.ts`) cacheia 60s e é invalidado a cada escrita do admin (`invalidateLegalConfig()`), mas o endpoint público `GET /api/legal-config` (`routes/legal.ts`) respondia com `Cache-Control: public, max-age=300` (5 min). Resultado: o admin salvava, a origem já servia o valor novo, mas o navegador/CDN segurava a versão antiga por até 5 min.

**Correção**: header HTTP alinhado à janela do store — `max-age=300` → `max-age=60` em `routes/legal.ts`. `RULES.md` R13 (item 3) atualizado para documentar que o `Cache-Control` do endpoint público deve bater com os 60s do store.

**Provas (dev)**: (1) `curl -D -` em `/api/legal-config` → `Cache-Control: public, max-age=60`. (2) E2E de propagação na origem: login admin → `PUT /api/admin/legal-config/LAST_UPDATED` (com CSRF) com valor sentinela → **HTTP 200** → `GET /api/legal-config` refletiu o valor sentinela **imediatamente** (store invalidado), header já `max-age=60`; valor original restaurado ao final (HTTP 200).

**Fora de escopo** (intocados, já corretos): chaves CORE, proteção de DELETE (403), invalidação de consents por `TERMS_VERSION`, TTL interno do store (60s).

### Defesa em profundidade do invariante de documentação expirada (R2) — reads públicos + cron via fonte única + teste de regressão (Task #77)

**Problema**: o invariante "documentação `expired` = loja offline para TODOS os planos" (R2) dependia de **um único caminho de escrita** gravar `isVisible=false`. As listagens públicas filtravam **só** por `isVisible`; se qualquer caminho futuro (nova rota, refactor) esquecesse de baixar a flag, uma loja `expired` voltaria a aparecer no site. Além disso, o cron de expiração **duplicava** a lógica de transição (`expired`+`isVisible=false`) em vez de delegar à fonte única `syncDocumentationState`, abrindo espaço para divergência.

**Correção** (defense-in-depth, 4 camadas):
- **Reads públicos (segunda camada)**: nova condição exportada `NOT_DOCUMENTATION_EXPIRED` em `lib/documentation-state.ts` (subquery `NOT EXISTS` correlacionada em `business_users.documentation_status='expired'`). Aplicada **além** do filtro de `isVisible` em `GET /api/businesses` (`routes/businesses.ts`), `GET /api/search` (`routes/search.ts`) e `GET /api/zones/:zone/{stats,businesses}` (`routes/zones.ts`). Não substitui `isVisible` — soma-se a ele.
- **Cron via fonte única**: o else-branch de expiração em `lib/documentation-job.ts` agora **zera o banco de dias e chama `syncDocumentationState(businessId)`** (única escrita de `expired`+`isVisible=false`) em vez de duplicar a transição; o email `documentacaoExpirada` + log de auditoria só disparam quando `sync.status === "expired"`.
- **Teste de regressão**: novo `scripts/src/validate-doc-expired-invariant.ts` (script npm `validate-doc-expired`, registrado como validação `doc-expired-invariant`). Cria 2 negócios descartáveis `isVisible=true` na mesma zona (um `expired`, um `approved`/controle), verifica que o `expired` some das 3 superfícies públicas e o controle permanece, e que o admin não republica (409); cleanup em `finally`.
- **RULES.md R2**: documentadas as 4 camadas (defesa em profundidade nos reads, cron delegando à fonte única, item de teste (7)).

**Provas (dev)**: (1) validação `doc-expired-invariant` **PASSOU** (exit 0): `✓ R2 /api/businesses oculta loja expirada mesmo com isVisible=true` · `✓ controle: lista loja approved (filtro não derruba todos)` · `✓ R2 /api/search oculta` · `✓ R2 /api/zones/:zone/businesses oculta` · `✓ controle zones lista approved` · `✓ admin NÃO republica (409 DOCUMENTATION_EXPIRED)`. (2) typecheck: nenhum erro novo nos arquivos tocados (`documentation-state.ts`, `documentation-job.ts`, `businesses.ts`, `search.ts`, `zones.ts`, script novo); erros pré-existentes em `stripe.ts`/`vitrine.ts`/`create-boost-products.ts` fora de escopo (api-server builda via esbuild). (3) `validate-lojista-rules` segue verde.

**Fora de escopo** (intocados): reads `GET /api/businesses/:id`, `/nearby`, `/home-featured` — só as 3 listagens nomeadas foram alvo; a religação continua exclusiva da aprovação dos 3 docs.

### Robustez do front do lojista: token centralizado, limite do banner unificado em 15MB e fallback de zona removido (Task #76)

**Problema**: três fragilidades no painel do lojista (sem quebra funcional hoje, mas violando padrões e mascarando erros). (1) **R4** — o upload do banner da home lia `localStorage.getItem("hub_lojista_token")` direto + `fetch` manual, fora do helper central de autenticação; se a chave mudar, quebra em silêncio. (2) **R6** — o banner da home validava 10MB enquanto a regra geral e as demais telas usam 15MB. (3) **R3** — o cabeçalho do dashboard usava `zone || region`, mascarando `zone` nulo e podendo gerar "Zona Zona Sul" ao capitalizar o display.

**Correção**:
- **R4 (token central)**: novo `uploadHomeBanner(file)` em `lib/lojista-api.ts` (usa `lojistaFetch`, trata token + 401). `LojistaBoost.handleBannerImageUpload` reescrito para chamá-lo — removido o `localStorage`/`fetch` manual; `catch` usa `err?.message`.
- **R6 (15MB)**: limite unificado 10MB→15MB em **três** pontos para o contrato bater com o backend (R1/R30): check do cliente em `LojistaBoost`, texto `BANNER_SPECS_LINE` ("máx 10 MB"→"máx 15 MB") e o check do backend em `routes/lojista.ts` (`home-banner/upload`). O multer global já era 15MB e o `app.ts` já retorna 413 amigável.
- **R3 (sem fallback)**: `LojistaDashboard.tsx` passa a usar **só** `profile?.zone` (slug canônico) → "Zona não definida" quando ausente, em vez de cair em `region`.
- **RULES.md**: R3 atualizado (usa só `zone`, sem fallback `zone || region`).

**Provas (dev)**: (1) curl `home-banner/upload` como premium: **11,44MB (>10,<15)** → **400 "Você não tem um banner pendente de upload"** (passou do size-check; antes daria "Máximo 10 MB"); **16MB (>15)** → **413 "Arquivo muito grande. O limite por imagem é de 15MB."** (2) `rg localStorage` em `LojistaBoost.tsx` → **vazio** (sem acesso direto). (3) `validate-lojista-rules` verde (10/10) — inclui **R3 profile zone='sul' region='Zona Sul'**, confirmando o render "Zona Sul". (4) typecheck do front: nenhum erro novo (só `icons.tsx` pré-existente — `JSX` namespace). Observação: screenshot do dashboard autenticado não capturado — SPA com JWT em `localStorage` não é injetável pela ferramenta de screenshot; R3 provado pelo contrato de dados (`lojista-rules`) + código.

**Fora de escopo** (intocados): limites de 10MB de foto de produto/negócio (`LojistaProdutos.tsx` + `product-media` no backend) — só o banner da home foi alvo; processamento Sharp do banner.

### Gates de plano alinhados com a realidade: logo/capa travados em Base/Destaque+ e limite de produtos documentado (Task #75)

**Problema**: duas divergências entre `RULES.md` (contrato) e o código real. (1) **Limite de produtos** — RULES.md prometia `Destaque(10)/Premium(∞)`, mas o código aplica `Destaque=6/Premium=10` (`enforce-product-limits.ts` + `lojista.ts`). (2) **Logo/foto de capa** — RULES.md exigia plano Destaque, mas as rotas `POST /api/lojista/upload/{logo,banner}` aceitavam **todos os planos, inclusive Gratuito** (decisão antiga "identidade visual básica").

**Decisão do dono** (via pergunta): (1) manter o limite real `Destaque=6/Premium=10` → corrigir o contrato; (2) **travar** logo/capa a partir de Base/Destaque (bloquear Gratuito) → corrigir o código.

**Correção**:
- **Backend** (`routes/lojista.ts`): `requirePlan("destaque")` aplicado **antes** do `memoryUpload` em `/upload/logo` e `/upload/banner` (gate de plano vem primeiro — R1). Plano lê do DB via middleware, não do JWT. Comentário antigo "disponíveis em TODOS os planos" reescrito.
- **Frontend** (`LojistaPerfil.tsx` e `LojistaProdutos.tsx`): para `planType==="free"`, aviso âmbar "Exclusivo Base/Destaque" + link discreto "Ver planos" + botões de logo/capa `disabled` (regra de UI de CTA bloqueado — R1).
- **RULES.md R1**: limite de vitrine corrigido para `Destaque(6)/Premium(10)`; linha de logo/capa aponta para os componentes reais (`LojistaPerfil`/`LojistaProdutos`) — o `LojistaFotos.tsx` citado não existe.

**Provas (dev)**: (1) curl multipart por plano: FREE logo→**403 PLAN_REQUIRED**, FREE capa→**403 PLAN_REQUIRED**, DESTAQUE logo→**200 logoUrl**, PREMIUM capa→**200 bannerUrl**. (2) E2E (Playwright): lojista FREE logado vê o aviso âmbar e botões desabilitados em `/lojista/perfil` e `/lojista/produtos`. (3) `validate-lojista-rules` verde (10/10 — gates existentes intactos). (4) code review (architect): PASSA, sem bypass via outras rotas (`PATCH /profile` não grava `logoUrl/bannerUrl`). (5) typecheck: nenhum erro novo nos arquivos tocados (erros pré-existentes em `stripe.ts`/`vitrine.ts`/`create-boost-products.ts`/`icons.tsx` fora de escopo; api-server builda via esbuild).

**Fora de escopo**: degradação silenciosa do front quando `getProfile` falha (limite 0 implícito sem aviso) — preexistente, coberto pela Task #76.

### Loja com documentação expirada sai do ar de fato — para todos os planos (Task #71)

**Problema relatado**: lojas com `documentationStatus='expired'` continuavam **públicas/online**. Diagnóstico **com prova SQL em produção** (read-only, não leitura de código): 5 negócios estavam `documentation_status='expired'` E `is_visible=true` ao mesmo tempo (ex.: #21 Sabor do Sul destaque, #37 Elétrica Londrina, #42 Loja Teste, #44 Estrategista digital premium, #45 Restaurante Estações). Isso viola R2 ("documentação expirada derruba a loja para TODOS os planos").

**Causa-raiz**: o `isVisible=false` da expiração era gravado **apenas** pelo cron (`documentation-job.ts`), no instante exato da transição (estado em `pending`/`rejected` com `remaining` chegando a 0). Negócios que chegavam a `expired` por outro caminho (`syncDocumentationState` via heal/upload), ou cuja flag nunca foi virada nesse momento exato, ficavam `expired` **mas visíveis** — e os caminhos de leitura pública (`businesses.ts`, `search.ts`, `zones.ts`) filtram só por `isVisible`+`status`, sem checar `expired`. A reconciliação (`reopenOnApproval=false`) era deliberadamente conservadora e **não tocava** `isVisible` para nenhum estado não-aprovado.

**Correção (fonte única — `lib/documentation-state.ts`)**: na branch não-aprovada de `syncDocumentationState`, quando o estado resolvido é **`expired`**, o UPDATE agora grava **`{ verified:false, isVisible:false }`** (antes só `verified:false`). Estados não-expirados (`pending`/`submitted`/`rejected`) **seguem conservadores** — não tocam `isVisible` (loja paga dentro do prazo de 10 dias continua no ar) e nunca republicam. Como o heal de boot (`healDocumentationConsistency`) roda `syncDocumentationState` para **todos** os negócios, essa mudança **corrige a base inteira automaticamente** no próximo deploy — incluindo as 5 lojas de produção — sem script de migração. `expired` + `isVisible=true` deixa de ser um estado que persiste. A religação continua **exclusiva** da aprovação dos 3 docs (`reopenOnApproval:true`, intacto).

**Reforço do invariante (guard admin — `routes/admin.ts`)**: a revisão de código (architect) apontou um furo: o `PATCH /api/admin/businesses/:id` ainda permitia o admin setar `isVisible=true` à mão numa loja `expired` — e, como os reads públicos filtram só por `isVisible`, ela voltaria a aparecer até o próximo `syncDocumentationState`. Correção: o endpoint agora **rejeita** com **`409 DOCUMENTATION_EXPIRED`** qualquer `{isVisible:true}` quando `documentationStatus='expired'`. Religar a loja segue exclusivo da aprovação dos 3 docs.

**Fora de escopo** (intocados): trilha de pagamento (gates `isDocumentationExpired` já corretos), `expired` sticky, `verified` write-protected, cron de expiração (continua gravando `isVisible=false` no momento da transição — agora redundante e coerente com o sync).

**Provas (dev)**: (1) estado-bug reproduzido no negócio #20 (`expired` + `is_visible=true` + `remaining=0`, igual às 5 linhas de produção) → aparecia em `GET /api/businesses` (total=20) E em `GET /api/search`. (2) após restart do api-server (heal de boot), SQL: `is_visible=false`, `documentation_status=expired` → loja **sumiu** de `/api/businesses` (total=19) e de `/api/search`. (3) **conservadoria**: 4 lojas `pending` com `remaining>0` (#5/#9/#15/#17) **continuaram visíveis** — só a `expired` (#20) saiu. (4) #20 restaurado ao estado original. (5) `validate-lojista-rules` verde (10/10). (6) typecheck: nenhum erro novo em `documentation-state.ts` (os ~40 erros pré-existentes em `stripe.ts`/`vitrine.ts` permanecem como dívida fora desta task; build usa esbuild sem `tsc`).

**Regra atualizada**: RULES.md R2 — nova "Exceção `expired`" e a cláusula de reconciliação reescrita (a única ação retroativa de visibilidade do heal é derrubar `expired` visível). context.md (fluxo de documentação) atualizado.

### Banner "Documentação aprovada" só aparece com os 3 docs realmente aprovados (Task #69)

**Problema relatado**: na tela do lojista **Documentação** (`/lojista/documentacao`), a faixa verde **"✅ Documentação aprovada — selo Verificado"** aparecia mesmo com os 3 documentos ainda **"Em análise"** (`submitted`). Mentira para o lojista e viola a regra do dono (a frase "aprovado"/selo só existe com os 3 docs aprovados pelo admin).

**Causa-raiz** (frontend, `LojistaDocumentacao.tsx`): o banner escolhia o estado com `s = allDocsApproved ? "approved" : data.documentationStatus`. Quando `allDocsApproved` era `false`, ele **caía de volta** no agregado `documentationStatus` — que pode estar `"approved"` por divergência histórica / build antigo em produção → faixa verde indevida enquanto os cards mostravam "Em análise". O backend (`syncDocumentationState`) já estava correto; nada a corrigir lá (R2 intacto).

**Correção (somente front, `LojistaDocumentacao.tsx`)**: o estado do banner agora é derivado **estritamente** dos status reais dos 3 documentos — `allDocsApproved → approved`; `documentationStatus==='expired' → expired` (único estado sticky não-derivável dos docs, lido do backend); `anyRejected → rejected`; `allPresent → submitted`; senão `pending`. O caso "approved" (verde) é **inalcançável** sem os 3 docs `approved`, mesmo que o agregado venha mentindo. Selo público "Verificado" segue governado por `businesses.verified` (derivado no backend) — sem regressão.

**Fora de escopo** (intocados): backend de documentação (`syncDocumentationState`, upload/approve/reject — já corretos), re-marcar negócios históricos (Task #60), cron de expiração, gate de pagamento.

**Provas** (E2E Playwright com `[DB]` steps, negócio #1, restaurado ao fim): (A) **divergência (o bug)** — 3 docs `submitted` + `documentation_status='approved'` → banner **AZUL** "aguardando análise", verde **ausente**. (B) 3 aprovados → banner **VERDE** "Documentação aprovada". (C) 1 doc rejeitado → banner **VERMELHO** "rejeitado", verde ausente. (D) `documentation_status='expired'` → banner **VERMELHO** "Prazo de 10 dias encerrado", verde ausente. `validate-lojista-rules` verde (10/10); typecheck do arquivo limpo (erros restantes em `icons.tsx` são pré-existentes).

### Destaque de Zona: 6→3 vagas por zona + textos dos cards de busca mais claros (Task #66)

**Pedido**: (A) reduzir as vagas do "Destaque de Zona" de 6 para 3 por zona (com 6 destaques a página da região fica poluída); (B) deixar mais claros os textos dos dois cards de busca ("Destaque Home + Busca" vs "Boost na busca por categoria"), que confundiam o lojista por parecerem o mesmo produto — **sem unificá-los** (decisão do usuário).

**Mudança (A) — capacidade da zona**:
- Nova **fonte única** de capacidade em `lib/boost-locks.ts`: `ZONE_SLOTS = 3` (dedicada à zona) e `HOME_SEARCH_SLOTS = 6` (contador legado do home_search). Antes havia um único `SLOTS_PER_CONTEXT = 6` compartilhado entre zona e home_search — reduzir um afetaria o outro.
- `boosts.ts` (disponibilidade), `stripe.ts` (checkout/sync + webhook, 2 pontos), `boost-expiration.ts` (promoção de waitlist) **e `admin.ts` (`/admin/boosts-extra`)** agora derivam o teto por contexto (`zone → 3`, `home_search → 6`). Nenhum `6` hardcoded sobrou no caminho da zona. Regra de negócio inalterada: zona segue exclusiva Destaque/Premium, R$79/30 dias, na zona do próprio negócio. 4º+ comprador vai para `waitlist` e é promovido quando uma vaga abre (agora com teto 3).
  - **Atenção** (achado da revisão de código): o `admin.ts` ainda usava um `MAX_SLOTS_PER_CONTEXT = 6` compartilhado, permitindo a um admin encher uma zona até 6 vagas por fora do limite — corrigido para usar `ZONE_SLOTS`/`HOME_SEARCH_SLOTS`. O GET `/admin/boosts-extra` passou a expor `zoneMaxSlots`/`homeSearchMaxSlots` (campo `maxSlots` único removido; não era consumido pelo front).
- Card "Destaque de Zona" no painel do lojista exibe "X de 3" automaticamente (contagem vem da API).

**Bugfix de borda (corrigido junto)**: `boosts.ts` referenciava `HOME_PRICE_BRL` (preço legado do home_search) **sem nunca defini-lo** → `ReferenceError` derrubava `GET /api/lojista/boosts/availability` com **500** para todos os planos (o card de Zona nem carregava). Definido `HOME_PRICE_BRL = 149` (valor legado, bate com `home_search.priceBRL: 149` no `stripe.ts`). Estava entre os erros de runtime pré-existentes.

**Mudança (B) — textos (somente front)**:
- `LojistaBoost.tsx`: card "Destaque Home + Busca" agora deixa explícito que aparece no **site inteiro** (home + busca de **qualquer categoria**); seção "Boost na busca por categoria" ganhou caixa explicativa de que aparece **só dentro da própria categoria**. Cada texto cita o outro produto para reforçar a diferença de alcance.
- `AdminImpulsionamento.tsx` (painel "Como funcionam os impulsionamentos?"): "6 vagas por zona" → "3 vagas por zona"; texto do Home+Busca corrigido (era "6 slots globais com 3 posições", contraditório) para "3 posições numeradas (R$249/179/129) … toda busca do site, de qualquer categoria".

**Nova regra**: RULES.md **R15** documenta as capacidades por contexto como fonte única (`ZONE_SLOTS`/`HOME_SEARCH_SLOTS` em `boost-locks.ts`) e proíbe hardcodar números no caminho da zona.

**Fora de escopo** (intocados): preços (zona R$79, home_search R$249/179/129, categoria R$149→R$59), `category` (5 posições), `home_banner` (2 slots), vitrine, e a elegibilidade de plano de qualquer contexto.

**Provas**: (1) `curl /api/lojista/boosts/availability` como lojista Premium → `zoneAvailability.total: 3` e `homeSearchAvailability.total: 6` (intacto). (2) `GET /api/admin/boosts-extra` → `zoneMaxSlots: 3, homeSearchMaxSlots: 6`. (3) Caminho admin: criados 3 boosts de zona em `leste` (201), 4ª criação **bloqueada** com `400 {"code":"SLOTS_FULL","error":"Zona leste já tem 3 slots ocupados"}`, e cleanup (volta a 0). (4) `validate-lojista-rules` verde (12/12). (5) E2E (`runTest`) logando como Premium: card "Destaque de Zona" mostra **"3 de 3"** (não 6), card Home+Busca cita "site inteiro"/"qualquer categoria", e seção de categoria diz "só dentro da sua categoria". (6) typecheck: nenhum erro novo nos arquivos alterados (os pré-existentes de `api-server`/`hub-londrina` permanecem como dívida fora desta task).

### Deploy falhava ao publicar — porta do api-server abria só DEPOIS das tarefas de startup

**Problema relatado**: a publicação (autoscale) falhava no build/deploy. Diagnóstico **com prova nos logs de produção** (não leitura de código): o build compilava normalmente (`dist/index.mjs` gerado e executado) — a falha era em **runtime**. O hub-londrina (SSR, porta 22662) subia, mas o **api-server (porta 8080) nunca abria a porta**, e o deploy estourava no timeout (`not all artifact ports opened within timeout expected=[8080 22662] detected=1`). O processo do api-server iniciava (pid) mas **não emitia nenhum log** — coerente com travar **antes** do `listen`.

**Causa-raiz** (`artifacts/api-server/src/index.ts`): o `app.listen` estava no **fim** de uma cadeia `initSentry → runStartupSeed → ensureViews → healDocumentationConsistency → healPaidInvisibleBusinesses → healOverflowingProductLimits → healZoneRegionDisplayNames`, **sem `.catch()`**. Todas essas etapas dependem do banco. Qualquer travamento (ex.: conexão lenta/pendurada — `pool` tem `connectionTimeoutMillis`) ou rejeição não tratada impedia o `listen`, então a porta nunca abria e o health check do autoscale falhava.

**Mudança (somente `index.ts`)**: o `app.listen(port)` agora roda **primeiro** (abre a porta imediatamente → health check passa), e as tarefas de manutenção (Sentry/seed/views/heal/jobs) rodam **depois** dentro de `runStartupTasks()`, com `try/catch` que **loga mas não derruba** o servidor. Falha de manutenção não impede mais a publicação.

**Fora de escopo** (intocados): lógica de seed/views/heal/jobs (só mudou a ordem/tratamento de erro), build (`esbuild` não faz typecheck), demais artifacts. Os ~40 erros de typecheck pré-existentes em `api-server`/`hub-londrina` **não** bloqueiam o deploy (o build não roda `tsc`) e ficam como dívida fora desta task.

**Provas**: (1) logs de produção mostravam `detected=1 expected=2` (porta 8080 ausente) e timeout. (2) Após o fix, logs locais do api-server mostram a ordem correta: `Server listening port:8080` **antes** de `Database already seeded`/`View ... criada`/jobs. (3) `GET /api/healthz` → `{"status":"ok"}`. (4) `validate-lojista-rules` verde (12/12). (5) typecheck de `index.ts` limpo.

### Banner na Home — dimensões antes da compra + gate Premium blindado na UI (Task #64)

**Problema relatado**: cliente Premium achava que o Banner na Home "não funcionava". Diagnóstico (com prova SQL em produção): o fluxo de auto-upload (Task #56) já estava implementado e o backend liberava a compra (negócio #45 "Restaurante Estações Gastronomia" estava `plan_type=premium`/`active`). As falhas reais eram de **front**:
1. As **dimensões só apareciam DEPOIS de pagar** (dentro do bloco `paid_awaiting_upload`). Antes de comprar, a descrição não dizia o tamanho aceito nem que o próprio lojista sobe a imagem.
2. **Gate Premium podia travar falsamente**: se `GET /lojista/profile` falhasse, a UI rebaixava `planType` para `"free"` silenciosamente → Premium via "Exclusivo Premium" com botão desabilitado e **sem saída** (o atalho "Sincronizar plano agora" só aparecia para `destaque`).

**Mudança (somente `LojistaBoost.tsx`, front)**:
- **Fonte única do texto de dimensões** (`BANNER_SPECS_LINE`): `1200×280px (4:1) · JPG/PNG/WebP · máx 10 MB · recorte automático`, reutilizada **antes da compra** (na descrição, com destaque "Após o pagamento, você mesmo envia a imagem") e **pós-pagamento** (bloco de upload). Valores batem com o backend (Sharp `resize(1200, 280)`).
- **Sem downgrade silencioso de plano**: `loadAll()` busca o profile em separado; se falhar, seta `planLoadError=true` (não cai para `free`). Demais fetches têm `.catch` individual e não derrubam a página.
- **Saída para Premium exibido como bloqueado**: o card de Banner mostra um ramo `planLoadError` ("Não foi possível carregar o seu plano… Recarregar") e o atalho **"Sincronizar plano agora"** passa a aparecer para **qualquer** estado não-premium (antes só `destaque`).
- Removido o rodapé cinza redundante (a mensagem agora está destacada na descrição). **R1 preservado**: não-premium continua com botão cinza desabilitado + alerta amarelo "Exclusivo Premium" + link "Ver planos".

**Fora de escopo** (intocados): backend de checkout/upload (gate `PLAN_REQUIRED` antes de `BUSINESS_INACTIVE` já correto), expiração automática (Task #57), validação de conteúdo (Task #58), regra de offline por documentação (Task #63).

**Provas**: (1) E2E logado como Premium (`contato@sabordosul.com.br`) em `/lojista/boost`: dimensões visíveis ANTES da compra, botão "Comprar banner — R$299/mês" habilitado, sem "Exclusivo Premium". (2) `validate-lojista-rules` verde — "R1 home-banner/checkout bloqueia free (403 PLAN_REQUIRED)" intacto. (3) typecheck do arquivo limpo (erros restantes são pré-existentes em `icons.tsx`/`busca.tsx`/`negocio.tsx`).

## 2026-06-03

### Documentação — fonte única de verdade + offline para todos os planos ao expirar (Task #63, revoga R2-A)

**Problema**: o estado da documentação vivia em 3 lugares que divergiam. Em produção: negócio #44 (premium) com `documentation_status='approved'` mas os 3 docs ainda `submitted` (banner verde "aprovada" mentindo enquanto os cards mostravam "Em análise"); negócio #43 (destaque) com 3 docs realmente aprovados porém `verified=false` (selo público não aparecia). Além disso, o usuário ajustou a regra de prazo/visibilidade.

**Nova regra (R2 reescrito)**:
- **Fonte única de verdade** (`lib/documentation-state.ts → syncDocumentationState`): `documentationStatus`, `documentationTimerPaused` e `businesses.verified` são sempre **derivados** de `business_documents.status`. Chamado em upload (lojista), approve/reject (admin) e no heal de startup. `verified=true` sse os 3 docs aprovados.
- **Timer com banco de dias (banking)**: decrementa só em dias ativos (`pending`/`rejected`, não pausado). Enviar os 3 docs pausa (congela o saldo); rejeição retoma do saldo congelado. Não deriva mais o restante de `firstLoginAt`. Countdown por email só nos marcos {7, 3, 1}.
- **Offline para TODOS os planos ao expirar**: quando os dias ativos zeram sem aprovação → `documentationStatus='expired'` + `businesses.isVisible=false` para qualquer plano (free, base/destaque, premium). **Revoga o antigo R2-A** (loja paga continuava visível). Email `documentacaoExpirada(nome)` agora com cópia "offline independente do plano".
- **Trilho de pagamento guardado**: webhook (checkout/invoice), `stripe/sync` e `healPaidInvisibleBusinesses()` só setam `isVisible=true` quando `isDocumentationExpired(businessId) === false`. Pagamento **não** republica loja expirada — só a aprovação dos 3 docs religa.
- **Reconciliação histórica**: `healDocumentationConsistency()` roda `syncDocumentationState` para todos os negócios no startup (corrige #43/#44). Conservador: não tira loja visível do ar retroativamente.

**Arquivos**: `lib/documentation-state.ts` (novo), `routes/documents.ts`, `lib/documentation-job.ts`, `lib/startup-heal.ts`, `index.ts`, `routes/stripe.ts` (3 guards), `services/email.ts`, `LojistaDocumentacao.tsx`, `AdminDocumentacao.tsx`.

**`expired` é STICKY**: qualquer estado não-aprovado com `remaining<=0` permanece `expired`. Completar/reenviar os 3 docs depois do prazo (`submitted`) **não** tira do `expired` — só a aprovação dos 3 docs religa. Isso fecha a brecha em que `submitted` pós-prazo voltava `isDocumentationExpired` a `false` e o pagamento/heal republicavam a loja sem aprovação.

**`verified` é write-protected**: `PATCH /api/admin/businesses/:id` rejeita `verified` no body com `400 VERIFIED_IS_DERIVED`. As únicas escritas em `businesses.verified` ficam em `syncDocumentationState` (derivação) e no seed (bootstrap). A UI admin só exibe o selo.

**Reconciliação ≠ re-publicação**: `syncDocumentationState(id, { reopenOnApproval })`. O default `false` (heal/cron/upload) só deriva status/timer/selo e **não** mexe em `isVisible`/`status`/`planFrozen`; a re-publicação só ocorre com `reopenOnApproval:true`, exclusivamente na aprovação final do admin. Fecha a regressão em que o heal de boot republicava lojas ocultadas manualmente pelo admin.

**Provas (dev, re-seed limpo)**: (0) 20 negócios, 15 verificados com 3 docs aprovados (45), zero inconsistências (`verified` ⇔ 3 aprovados). (1) heal reconciliou negócio com agregado mentindo `submitted`+offline → status `approved`/`verified=true` **sem** alterar visibilidade. (2) reject → `verified=false`/`rejected`. (3) loja **destaque** `remaining=1`/`pending` → cron → `expired`+`isVisible=false`. (4) loja paga (assinatura `active`) com docs `expired` → `healPaidInvisibleBusinesses` **não** republicou. (5) STICKY: loja paga `expired` que envia os 3 docs (`submitted`) → heal mantém `expired`+`isVisible=false` (não republica sem aprovação). (6) loja com 3 docs aprovados **ocultada manualmente** (`isVisible=false`) → após restart o heal mantém `isVisible=false` (respeita decisão do admin), `verified=true`. (7) `PATCH verified=true` → `400`; `PATCH description` → `200`. `validate-lojista-rules` verde.

### UI — Perfil do negócio: capa limpa + linha única de meta-informações reordenada

**Problema**: na página `/negocio/:id`, os badges **Premium** e de **nota ("0 (0)")** flutuavam sobre a borda inferior da foto de capa em posições desencontradas, com aspecto bagunçado. A linha de meta-tags abaixo também tinha ordem pouco intuitiva (categoria antes do local).

**Correção** (`artifacts/hub-londrina/src/pages/negocio.tsx`):
- Removidos da capa os badges flutuantes de **Premium** e de **nota**, além do botão **Favoritar** do canto superior direito. A capa agora tem só o botão **Voltar** + a logo flutuante.
- Consolidada uma **linha única** de meta-informações, alinhada (`items-center`), na ordem: **local + cidade** → **categoria** → **selos automáticos** (Novo/Confiável/etc) → **Verificado** → **Premium** → **estrelas (nota) + favoritar (coração)**.
- A nota que antes vivia na linha do nome foi consolidada nessa linha; a linha do nome ficou só com o `<h1>`.

**Escopo**: mudança puramente visual. Nenhuma alteração em lógica de `getAutoBadges` (`lib/badges.ts`), `BusinessCard.tsx`, gates, Stripe, auth ou DB.
**Prova**: `validate-lojista-rules.mjs` → 10/10 ✓; screenshot do perfil (negócio premium verificado) confere a ordem e o alinhamento.

---

### Bugfix — home-banner/checkout retornava BUSINESS_INACTIVE em vez de PLAN_REQUIRED para lojista free

**Sintoma**: o teste `R1 home-banner/checkout bloqueia free` em `validate-lojista-rules.mjs` falhava — esperava 403 `PLAN_REQUIRED` mas recebia 400 `BUSINESS_INACTIVE`.

**Causa raiz**: em `artifacts/api-server/src/routes/stripe.ts`, o endpoint `POST /api/lojista/home-banner/checkout` checava `status !== "active" || !isVisible` **antes** do gate de plano. Como lojista free nasce `isVisible=false` por design, batia na guarda de visibilidade e nunca chegava ao check de plano. Todos os outros endpoints de checkout já tinham o gate de plano primeiro — só o home-banner estava invertido.

**Correção**: invertida a ordem das duas guards — gate de plano (`planType !== "premium"` → 403 `PLAN_REQUIRED`) agora vem primeiro; checagem de `BUSINESS_INACTIVE` só depois. Faz sentido de produto também: free deve ouvir "exclusivo Premium", não "negócio inativo".

**Prova**: `node scripts/src/validate-lojista-rules.mjs` → 10/10 ✓.
**RULES.md**: nova diretriz em R1 — gate de plano sempre vem antes de checagens de estado do negócio em endpoints de checkout.

---

### Task #59 — Selo "Verificado" aparece automaticamente após aprovação de documentação

**Problema**: o badge "Verificado" (pill verde ✓) estava implementado no frontend (`BusinessCard.tsx` e `negocio.tsx`) mas **nunca aparecia** para nenhum lojista — mesmo após o admin aprovar toda a documentação. O campo `businesses.verified` permanecia `false` indefinidamente.

**Causa raiz**: em `documents.ts`, quando todos os docs são aprovados (`allApproved`), o código setava `isVisible=true` e `planFrozen=false` mas **esquecia `verified=true`**. Eram duas ações separadas sem elo.

**Correção em `artifacts/api-server/src/routes/documents.ts`**:
- Branch `allApproved`: adicionado `verified: true` ao UPDATE existente em `businessesTable`
- Path de rejeição: adicionado UPDATE separado em `businessesTable` com `verified: false` (garante reset se um doc for re-aberto/rejeitado após aprovação completa)

Nenhuma mudança no frontend necessária — badges já estavam implementados corretamente.
**RULES.md**: nova regra documentada em R2 (aprovação total → `verified=true`; rejeição → `verified=false`).

---

### Task #56 — Banner Home: upload automático com Sharp (sem aprovação manual)

**Problema**: o fluxo anterior criava o banner com `status="pending_review"` e imageUrl copiado do logo do negócio. O admin precisava aprovar manualmente antes de o banner ir ao ar, gerando fricção operacional e delay de horas ou dias.

**Solução**: substituído por fluxo de upload direto com processamento automático via Sharp.

**Mudanças no backend (`artifacts/api-server`)**:
- `sharp` adicionado ao `onlyBuiltDependencies` em `pnpm-workspace.yaml` (usa binários pré-compilados — sem build scripts).
- `routes/stripe.ts` (webhook `checkout.session.completed` + sync `POST /lojista/boosts/sync`): novo banner criado com `status="paid_awaiting_upload"` e `imageUrl=""` (antes: `pending_review` + logoUrl).
- `routes/lojista.ts`: novo endpoint `POST /api/lojista/home-banner/upload` — valida MIME/tamanho, chama `sharp(buffer).resize(1200, 280, { fit: "cover", position: "attention" }).jpeg({ quality: 85 })`, faz upload para GCS em `home-banners/`, atualiza `status="active"` e `active=true` automaticamente. Lojistas com status `rejected` também podem reenviar imagem via mesmo endpoint.
- Query `GET /api/lojista/boost-positions`: adicionado `paid_awaiting_upload` ao OR de status visíveis.
- Resposta `homeBanner` agora inclui `createdAt`.

**Mudanças no frontend (`artifacts/hub-londrina`)**:
- `LojistaBoost.tsx`: adicionado `useRef` e ícone `Upload`; estados `bannerImageUploading` e `bannerImageRef`; handler `handleBannerImageUpload`; UI do card Banner Home completamente renovada — mostra card de upload azul quando `paid_awaiting_upload`, botão de reenvio quando `rejected`, remove menção a "sujeito a aprovação". Texto de rodapé atualizado.
- Mensagem pós-sync `home_banner` atualizada para orientar sobre o upload.
- `AdminHomeBanners.tsx`: tipo `Banner["status"]` agora inclui `paid_awaiting_upload`; label "Pago — aguardando imagem" (azul); aba "Pendentes" inclui ambos os status.

**Schema / docs**:
- Comentário em `lib/db/src/schema/home-banners.ts` atualizado.
- `context.md` seção `home_banners` atualizada com novo campo `status` e fluxo.
- `RULES.md` nota adicionada sobre fim da fila de aprovação para home banners.

**Status legado**: `pending_review` preservado no DB/tipos para banners criados antes desta task — não há migração de dados.

---

### Task #53 — Identidade Visual (logo + capa) na página "Perfil do Negócio"

**Problema**: o lojista abria `/lojista/perfil` esperando encontrar onde alterar a foto do negócio, mas a página só exibia campos de texto. Os uploads de logo/capa (Task #49) haviam ficado em `/lojista/produtos`, o que é contra-intuitivo.

**Correção em `LojistaPerfil.tsx`:**
- Novo card **"Identidade Visual"** adicionado no topo da página (antes dos "Dados Jurídicos"), com:
  - **Logo**: preview circular 80×80px, hint `400×400px (1:1) · máx 2 MB`, chama `uploadLogo()`.
  - **Foto de capa**: preview retangular `3:1` (ou placeholder tracejado), hint `1200×400px · máx 5 MB`, chama `uploadBanner()`.
- Preview atualiza imediatamente após upload sem precisar recarregar a página.
- Link de rodapé levando à aba Produtos para quem quiser gerenciar a galeria de fotos.
- Handlers usam o mesmo padrão de `LojistaProdutos.tsx` (Task #49): `uploadLogo`/`uploadBanner` já existentes em `lojista-api.ts`.

Nenhuma rota nova de backend necessária — `uploadLogo` e `uploadBanner` já existiam.

---

### Task #49 — Orientações de tamanho de foto + seção "Fotos do Negócio" no painel lojista

**Problema duplo:**
1. Nenhum campo de upload exibia dimensões recomendadas em pixels — lojistas enviavam logos de 50×50px ou banners quadrados.
2. Maior descoberta: `uploadLogo`, `uploadBanner`, `uploadPhoto` existiam no backend (e em `lojista-api.ts`) mas **nunca eram chamadas** em nenhuma tela. O lojista não tinha como fazer upload de logo, capa ou galeria do negócio.

**Correções em `LojistaProdutos.tsx`:**
- Nova seção **"Fotos do Negócio"** adicionada no topo da página (antes da lista de produtos), com três blocos:
  - **Logo**: preview circular, hint `400×400px (1:1) · JPG, PNG, WebP · máx 2 MB`, chama `uploadLogo()`.
  - **Foto de capa**: preview retangular 3:1, hint `1200×400px (3:1) · máx 5 MB`, chama `uploadBanner()`.
  - **Galeria**: grid de thumbs com ← → "Tornar Capa" e "Remover", hint `mín. 800px de largura · máx 10 MB/foto`, chama `uploadPhoto()` / `deletePhoto()` / `reorderPhotos()`. Respeita limite por plano (free=1, destaque=10, premium=∞) conforme `RULES.md R11`.

**Nova rota backend** (`artifacts/api-server/src/routes/lojista.ts`):
- `PUT /lojista/photos/reorder` — reordena `businesses.photos[]`. Valida que o payload contém exatamente as mesmas URLs (sem adição/remoção), só muda a ordem. Retorna `{ photos: string[] }`.

**Nova função na API client** (`artifacts/hub-londrina/src/lib/lojista-api.ts`):
- `reorderPhotos(photos: string[])` — chama `PUT /lojista/photos/reorder`.
- Hint do campo **Mídia do Produto** melhorado: `+ Imagem: recomendado 800×600px (4:3)`.
- Hint do **Vídeo 360°** melhorado: `+ 720p ou 1080p, formato horizontal (16:9)`.
- Hint do **Vídeo da Vitrine** melhorado: `+ 9:16 · recomendado 1080×1920px`.

**Correções no painel admin:**
- `AdminHomeBanners.tsx`: hint `Dimensão recomendada: 1200×400px (3:1)` abaixo do campo URL da imagem.
- `AdminZonas.tsx`: hint `Dimensão recomendada: 1200×400px (3:1)` abaixo do campo URL do banner da zona.
- `AdminPatrocinadores.tsx`: hint atualizado para incluir `máx 300×200px recomendado` além do já existente.

**Dimensões padronizadas** (referência para todo o sistema):
Logo `400×400px (1:1)` · Capa `1200×400px (3:1)` · Galeria negócio `≥800px` · Mídia produto `800×600px (4:3)` · Vídeo 360° `16:9` · Vitrine `1080×1920px (9:16)` · Logo parceiro `300×200px`

**Nenhum invariante novo** adicionado ao `RULES.md` — R11 já cobria os limites de galeria por plano.

---

### Task #47 — Bugfix: vídeos/fotos da aba Vitrine não carregavam (imgSrc ausente)

**Sintoma**: na aba **Vitrine** de `/negocio/:id`, cards de produto mostravam ícone "?" no lugar do vídeo ou da foto de capa.

**Causa raiz**: `imgSrc()` em `utils.ts` transforma qualquer URL que começa com `/` adicionando o prefixo `/api` — necessário para que o reverse-proxy roteie `/api/storage/objects/...` até o Express. O componente `BusinessVitrine` em `negocio.tsx` passava `item.mediaUrl` e `item.videoUrl` **sem** esse wrapper. Em desenvolvimento o seed usa `/videos/vitrine-cafe.mp4` (arquivo estático no `public/` do Vite), então parecia funcionar — mas em produção os uploads reais ficam em `/storage/objects/uploads/vitrine/xxx.mp4` e precisam do prefixo → 404 → ícone "?".

**Prova**: `imgSrc` já estava importada no topo de `negocio.tsx` e usada em todas as outras imagens da página (linhas 160, 187, 245, 469, 517) — só `BusinessVitrine` havia ficado sem ela.

**Correções** (`artifacts/hub-londrina/src/pages/negocio.tsx`):
- `const poster = item.mediaUrl || ""` → `const poster = imgSrc(item.mediaUrl)` — cobre a foto de capa (fallback quando sem vídeo)
- `<VitrineVideo src={item.videoUrl!} ...>` → `<VitrineVideo src={imgSrc(item.videoUrl)!} ...>` — cobre o src do `<source>` e o `poster` do `<video>`

Nenhuma mudança em RULES.md ou replit.md necessária — a obrigação de usar `imgSrc()` já era implícita no padrão existente do código.

---

### Task #44 — Bugfix: planType não sincronizava após upgrade via Portal Stripe

**Sintoma**: lojista que fazia upgrade de Base/Destaque → Premium via Portal do Stripe continuava vendo todos os recursos Premium bloqueados (banner, boost de categoria, home search) após retornar ao painel.

**Causa raiz**: `POST /stripe/portal` retornava `return_url="/lojista/plano"` sem nenhum sinal de sucesso. `LojistaPlano.tsx` só acionava sync/polling quando `?success=1` estava na URL — flag que nunca aparece no fluxo do portal (sem `session_id`). O único mecanismo restante era o webhook do Stripe, que pode não estar configurado.

**Observação importante**: o endpoint `POST /lojista/stripe/sync` **já tinha** fallback sem `sessionId` (linhas ~165-178 de `stripe.ts`): quando `sessionId` é ausente, busca `stripeCustomerId` da tabela `subscriptions` e chama `stripe.subscriptions.list` diretamente. A correção foi feita sem criar novo endpoint.

**Correções**:
- `artifacts/api-server/src/routes/stripe.ts`:
  - `return_url` do portal: `/lojista/plano` → `/lojista/plano?portal_return=1`
  - Fallback de sync sem sessionId agora prefere `status="active"` (upgrade via portal entra imediatamente ativo), cai para `status="all"` se não encontrar ativa (ex: trialing/past_due)
- `artifacts/hub-londrina/src/pages/lojista/LojistaPlano.tsx`:
  - Detecta `?portal_return=1`, limpa URL, chama `POST /lojista/stripe/sync` (sem sessionId), faz polling até `profile.planType === targetPlanType` (plano confirmado pelo sync) — evita parada prematura em upgrades destaque→premium onde `planType !== "free"` já era satisfeito pelo plano antigo
  - Banner azul "Sincronizando seu plano com o Stripe..." durante o polling (separado do banner verde de novo checkout)
- `artifacts/hub-londrina/src/pages/lojista/LojistaBoost.tsx`:
  - Botão "Sincronizar plano agora" exibido **apenas** quando `planType === "destaque"` — exatamente o cenário de upgrade Base→Premium com plano desatualizado no frontend

**Regra criada**: ver RULES.md R7 (estendida para cobrir fluxo de portal).

---

## 2026-05-16

### Task #35 — Páginas /contato e /faq + admin
- Menu público: link `/anuncie` renomeado de "Contato" → "Anuncie" (path mantido). Footer ganha coluna **Ajuda** (/contato, /faq, suporte lojista).
- Novas tabelas `contact_messages` e `faqs` (Drizzle, aplicadas via `pnpm --filter @workspace/db run push`).
- Backend (`artifacts/api-server/src/routes/contact.ts`):
  - Público: `GET /api/faqs[?category=]` (apenas ativos), `POST /api/contact-messages` com `csrfProtection` + `contactMessageLimiter` (5/h/IP).
  - Admin (JWT): `GET/PATCH/DELETE /api/admin/contact-messages` (paginado, filtro por status, counts) e `GET/POST/PATCH/DELETE /api/admin/faqs`. Mutações sob `csrfProtection` + audit (`logAdminAction`).
- Frontend:
  - `/contato`: WhatsApp + e-mails (comercial/DPO) + endereço + horário + iframe Google Maps + formulário (Zod no servidor: nome, email, telefone opcional, assunto, mensagem). Lê `WHATSAPP_CONTATO`, `ATENDIMENTO_HORARIO`, `MAP_EMBED_URL` de `legal_config` (defaults se ausentes).
  - `/faq`: 3 abas (consumidor/lojista/lgpd) com Accordion + CTA para `/contato`. Seed inicial de 12 perguntas via `scripts/src/seed-faqs.ts`.
  - `/admin/contato`: 2 abas — Mensagens (lista + drawer com status, notas internas, link mailto e exclusão; auto-marca "nova" como "lida" ao abrir) e Configurações (CRUD das 3 chaves `WHATSAPP_CONTATO`, `ATENDIMENTO_HORARIO`, `MAP_EMBED_URL` em `legal_config`).
  - `/admin/faq`: CRUD por categoria com ordenação, ativo/inativo, modal de edição.
- Helpers: `lib/public-api.ts` (fetch FAQs, submit contato com `csrfFetch`) e novos métodos em `lib/admin-api.ts` (mutações usam `csrfFetch` + Bearer).
- Sidebar admin: novos itens **Contato** (Mail) e **FAQ** (HelpCircle).

## 2026-05-15

### Task #33 — Aba admin Config Legal (DB-backed)
- Nova tabela `legal_config` (key PK, value, is_core, updated_at, updated_by) — aplicada via `pnpm --filter @workspace/db run push`.
- `lib/legal-config-store.ts` no server: cache 60s + fallback aos defaults + `invalidateLegalConfig()` em toda escrita admin.
- `legal-config.ts` (server e front) agora exporta apenas `LEGAL_CONFIG_DEFAULTS` + `CORE_KEYS`. Front também expõe `useLegalConfig()` hook (fetch único, cache módulo) e mantém `LEGAL_CONFIG` mutável para compat.
- Endpoints admin: `GET/PUT/POST/DELETE /api/admin/legal-config[/:key]` (auth + csrf + audit). Core keys: PUT permitido, DELETE 403.
- Endpoint público: `GET /api/legal-config` (cache HTTP 5min) — consumido pelo hook front.
- `auth.ts` (`/auth/register`) e `retention-job.ts` agora leem TERMS_VERSION e RETENTION_MONTHS do store (com fallback aos defaults).
- Página `/admin/legal` (`AdminLegalConfig.tsx`): tabela editável com badge Sistema/Custom, modal "Novo campo" e confirmação de exclusão. Item "Config Legal" no sidebar admin.
- `Termos.tsx`, `Privacidade.tsx`, `Cadastro.tsx`, `Layout.tsx`, `LojistaPerfil.tsx` migrados para `useLegalConfig()`.
- RULES.md: nova R13 (config legal vive no banco; core protegido; cache invalida em escrita; TERMS_VERSION força re-aceite).

---

## 2026-05-14

### Task #31 — Patrocinadores e Apoiadores na home
- Removido o bloco fictício de depoimentos "O que dizem os londrinenses" (`landing.tsx`) — incluindo o array hard-coded `testimonials` e o ícone `Quote` que ficou órfão.
- Nova seção `<PartnersSection />` (`src/components/PartnersSection.tsx`) renderiza duas faixas: **Patrocinadores Master** em grid `2/3/4` colunas com cards `h-20/h-24` e **Apoiadores** em carrossel CSS infinito (`@keyframes partners-scroll` 35s, pause-on-hover, mask gradient nas bordas, respeita `prefers-reduced-motion`). Logos com `businessId` setado são clicáveis e levam para `/negocio/:id`; sem vínculo ficam apenas como referência visual.
- Apoiadores recebem efeito grayscale + opacidade 60%, voltando a cores no hover.
- Backend: nova tabela `partners` (`lib/db/src/schema/partners.ts`) com `id, name, tier(master|apoiador), logoUrl, businessId(FK ON DELETE SET NULL), isActive, sortOrder, createdAt, updatedAt`. Aplicada via `pnpm --filter @workspace/db run push`.
- Endpoints: público `GET /api/partners` (devolve `{ master: [], apoiador: [] }`, somente ativos, ordenados por `sortOrder asc`); admin `GET/POST/PATCH/DELETE /api/admin/partners` + `POST /api/admin/upload/partner-logo` (multer 5MB, PNG/JPG/WEBP/SVG → GCS bucket `partners`). Todas as mutações admin gravam em `admin_actions` (`partner.create|update|delete`).
- Spec OpenAPI atualizada com schemas `Partner` / `PartnersResponse` e codegen rodado.
- Admin: nova página `pages/admin/AdminPatrocinadores.tsx` com CRUD completo (upload de logo, seletor de negócio com lista de ativos+visíveis, tier, ordem, ativo/inativo, abas Master/Apoiadores/Todos). Link "Patrocinadores" adicionado no `AdminLayout` entre "Banners Home" e "Categorias". Rota `/admin/patrocinadores` registrada em `App.tsx`.
- A seção pública só renderiza se houver pelo menos 1 patrocinador ativo (em qualquer tier) — degradação silenciosa quando vazio.

### UX — categorias na home e na página /categorias
- **Task #27 (revertida pela #28)**: tentativa de transformar as pílulas de categoria da home em mini cards 150×110 com foto de fundo. Usuário não gostou do resultado.
- **Task #28**: home (`landing.tsx`) restaurada ao formato anterior — pílulas brancas arredondadas (cápsula horizontal) com badge circular colorido + ícone à esquerda e nome em texto escuro à direita; "Ver Todos" como pílula marrom `#6F4E37` no fim. Mantido scroll-x mobile / wrap desktop com scrollbar oculto.
- **Task #29**: cards da página `/categorias` (`pages/categorias.tsx`) reformulados pra adotar o mesmo layout visual do `BusinessCard`: foto `h-32` no topo, círculo `w-14 h-14` com a paleta da categoria (`getCategoryColorClasses`) sobreposto centralizado na divisa (`-top-7`, borda branca 3px com suporte a dark mode), nome em `font-black text-lg` centralizado e contagem "X negócios" embaixo em fundo branco. Sem botões CTA — card inteiro continua clicável → `/busca?categoria=<slug>`. Grid responsivo 1/2/3/4 colunas mantido. Adicionado `data-testid="card-category-<slug>"`.
- **Refactor pequeno**: `getCategoryPhoto` + `CATEGORY_PHOTOS` movidos de `pages/categorias.tsx` para `lib/icons.tsx` (helpers de categoria já viviam ali) para reuso futuro entre páginas.
- **Não afetado**: `BusinessCard`, `getCategoryPhoto` (assinatura), backend, schema, gates de plano.

### Cleanup — feature Instagram removida
- Removida a aba pública "Instagram" em `pages/negocio.tsx`, a página `LojistaInstagram`, a rota `PATCH /api/lojista/instagram-posts`, o item de menu correspondente e a função `updateInstagramPosts` no client. Schema `instagramPosts` no DB foi **preservado** (não houve drop) — adoção baixa não justificava manter UI/rota, mas dado histórico fica disponível caso a feature retorne.
- Commit: `ff8ad7d`.

---

## 2026-05-12

### UX — textos explicativos e bloqueios visuais nos impulsionamentos
- **LojistaBoost.tsx (4 cards)**: cada card de produto (Destaque de Zona, Destaque Home+Busca, Banner Home, Vagas Mensais/Boost de Categoria) ganhou caixa colorida com 1 parágrafo em linguagem leiga ANTES do botão de compra explicando o que o produto faz. Quando o lojista não é elegível, badge laranja "Exclusivo Premium" / "Exclusivo Destaque+" no canto do título; botão cinza desabilitado e caixa amarela com link "Ver planos" → `/lojista/plano` permanecem (já existiam).
- **AdminImpulsionamento.tsx**: painel colapsável "Como funcionam os impulsionamentos?" no topo (useState + CSS puro, começa fechado) com 7 cartões coloridos explicando Vitrine, Vagas Mensais, Boost Avulso, Destaque Home+Busca, Boost Direto, Destaque de Zona, Banner Home. Subtítulo muted (`text-xs text-gray-500 ml-7`) com resumo de 1 linha abaixo de cada `<h2>` (Vagas Mensais, Boosts Avulsos, Destaque Home+Busca, Boost Direto).
- **Desvio**: a spec listava Vitrine como card em LojistaBoost, mas Vitrine não é card de compra dessa página (é em LojistaProdutos via upload de vídeo). Os 4 cards existentes foram tratados; a explicação da Vitrine ficou no painel de ajuda do admin.
- **RULES.md**: nova invariante R12 documentando o padrão de UX (texto explicativo + badge + botão cinza) que deve ser preservado em qualquer mudança futura nesses cards.
- **Tarefas anteriores na sequência (#11, #12, #13)**: aviso de downgrade pré-confirmação, aplicação do limite de fotos da galeria em downgrade, cura de negócios em downgrade com produtos acima do limite. Todas mergeadas.

---

## 2026-05-10

### UX — Logo e banner liberados para TODOS os planos (inclusive Gratuito)
- **Motivo**: identidade visual básica não deve ser gate de plano. Um diretório fica feio com metade dos lojistas sem foto de perfil/banner. Diferenciais Premium continuam onde fazem sentido: vitrine de produtos, vídeo de apresentação, boosts, métricas avançadas, selo Premium.
- **Backend**: removidas as guardas `business.planType === "free"` em `POST /api/lojista/upload/logo` e `POST /api/lojista/upload/banner` (`artifacts/api-server/src/routes/lojista.ts`). Outros gates (Instagram/Website, vídeo, vitrine, métricas, resposta a reviews, PDF) permanecem inalterados.
- **Frontend**:
  - `LojistaFotos.tsx` — removidos os wrappers `<LockedFeature planRequired="destaque">` ao redor das seções de Logo e Banner; removida a guarda pré-upload e o `import` órfão do componente. Botão "Enviar" agora visível em qualquer plano.
  - `LojistaPlano.tsx` — `"Logo e banner"` agora aparece como `included: true` no descritor do plano Gratuito; removido do plano Base (passou a ser implícito em "Tudo do Gratuito"). Adicionado `"Selo Destaque"` como diferencial visível do Base.

### Bugfix — imagens dos negócios quebradas em todo o site público
- **Sintoma**: card de busca aparecia com fundo marrom sólido (sem foto da empresa). Vitrine da home, banners de zona e mini-logos no admin idem.
- **Causa**: mesmo bug do perfil — uploads chegam como path relativo `/storage/objects/...` e estavam sendo usados crus em vários componentes (`BusinessCard`, `landing.tsx` vitrine, `categorias.tsx`, `zona.tsx`, `AdminHomeBanners.tsx`). `LojistaDashboard.tsx` tinha um hack manual `profile.logoUrl.startsWith("/") ? \`/api${url}\` : url` no avatar do dashboard.
- **Correção**: `imgSrc()` aplicado em todos os componentes que renderizam mídia de negócios (cards, vitrine, banners de zona, avatar do dashboard do lojista, mini-logo no AdminHomeBanners). Hack manual no LojistaDashboard removido em favor do helper. `BusinessCard` agora também prioriza `bannerUrl` sobre `photoUrl` (consistente com o perfil) e adiciona `loading="lazy"`.

### Bugfix — "Alterar para Premium" não trocava de plano
- **Sintoma**: lojista no plano Base clicava em "Alterar para Premium" e era redirecionado ao portal do Stripe, que mostrava só "Cancels Jun 9 / Don't cancel subscription" — sem opção de trocar de plano.
- **Causa**: o portal do Stripe Billing **não permite "switch plan"** sem configuração manual no Dashboard (Settings → Customer portal → Subscriptions → Customers can switch plans + lista de produtos). Mesmo configurado, depende de manutenção fora do código.
- **Correção**: novo endpoint `POST /api/stripe/change-plan` que faz `stripe.subscriptions.update(subId, { items, proration_behavior: "create_prorations" })` e ressincroniza o DB local imediatamente. Cliente expõe `changePlan(priceId)` em `lib/lojista-api.ts`. Os botões "Alterar para X" e "Fazer downgrade para Y" no painel agora chamam essa rota com `window.confirm` explicando proração — o portal continua acessível pelo botão "Gerenciar assinatura" (cancelar / atualizar cartão / faturas).
- **Validações backend**: priceId no PRICE_MAP, sub existe + ativa, não é o mesmo plano. Erros traduzidos em PT-BR.

### Bugfix — banner/logo do lojista quebrados no perfil público
- **Causa**: uploads (logo, banner, galeria) são salvos como path relativo `/storage/objects/...` e o painel do lojista os resolve via helper `imgSrc()` que prepende `${VITE_API_URL}/api`. Em `negocio.tsx`, as URLs eram usadas cruas → o `<img>` ficava quebrado (mostrando `?` no header marrom).
- **Logo nunca renderizado**: o avatar circular do negócio (`logoUrl`) não existia em lugar nenhum no perfil público — o lojista subia mas a foto não aparecia para o cliente.
- **Correção**: criado helper compartilhado `imgSrc()` em `lib/utils.ts` (passa absolutas/data/blob direto, prepende `${VITE_API_URL}/api` em paths relativos). Aplicado no banner do hero, na galeria de fotos e no logo. Logo agora aparece como avatar circular 24/28px com borda branca sobre o banner (alinhado ao nome do negócio, oculto em mobile <sm para não competir com o título).

### UX — reordenação de abas e correção da galeria no perfil público
- **Bug "Fotos" sumida**: aba era condicional a `business.photoUrl` (campo legado de capa única), mas as fotos enviadas pelo lojista vão para o array `photos` (via `uploadPhoto`). Negócios sem `photoUrl` antigo não viam a aba mesmo com galeria preenchida. Corrigido: aba aparece sempre que `photos.length > 0` OU `photoUrl` existe; galeria renderiza todas as fotos do array com `loading="lazy"`.
- **Reordenação**: ordem das abas agora é Fotos → Vitrine → Sobre → Avaliações (antes: Sobre → Fotos → Vitrine → Avaliações). Default abre em "Fotos"; se o negócio não tem fotos, cai automaticamente para "Sobre".

### Bugfix — perfil público `/negocio/:id` não exibia dados reais
- **Banner do hero**: header só lia `business.photoUrl` e ignorava `bannerUrl` (campo populado pelo `uploadBanner` em `LojistaFotos`). Agora usa `bannerUrl ?? photoUrl`. Capa enviada pelo lojista aparece imediatamente após upload.
- **Vitrine**: aba mostrava arrays mock por categoria (Sobremesa do Chef, Frango na Brasa…) ignorando os produtos cadastrados. Criado endpoint público `GET /api/businesses/:id/products` (filtra `isActive=true`, ordena por `sortOrder`, expõe shape mínimo + `videoStatus` para gating de vídeo aprovado). `negocio.tsx` agora consome esse endpoint via novo componente `BusinessVitrine` com loading skeleton e empty state.
- **Hardening de segurança**: `products.whatsappLink` era armazenado cru e renderizado direto como `href` — permitia `javascript:` / phishing. Adicionada `sanitizeWhatsappLink()` em `POST/PATCH /lojista/products` (allowlist `https://wa.me`, `api.whatsapp.com`, `whatsapp.com`) e guarda defensiva equivalente no frontend para neutralizar dados antigos. Links inválidos caem no `wa.me/<whatsapp do negócio>` padrão.

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
