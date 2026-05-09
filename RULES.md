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
| Logo / Banner upload | Destaque | `POST /api/lojista/upload/{logo,banner}` | `LojistaFotos.tsx` (LockedFeature) |
| Instagram / Website | Destaque | `PATCH /api/lojista/profile` | `LojistaPerfil.tsx` (LockedFeature) |
| Vídeo vitrine | Premium | `PATCH /api/lojista/profile` (videoUrl) | `LojistaPerfil.tsx` (LockedFeature) |
| Vitrine produtos | Destaque (10) / Premium (∞) | `POST /api/lojista/products` | `LojistaProdutos.tsx` (LockedFeature) |
| Métricas | Destaque (números) / Premium (gráfico) | `GET /api/lojista/metrics` | `LojistaMetricas.tsx` (LockedFeature) |
| Resposta a review | Destaque | `POST /api/lojista/reviews/:id/respond` | `LojistaAvaliacoes.tsx` |
| Relatório PDF | Premium | endpoint dedicado | — |

**Regra de UI para CTAs bloqueados**: botão `disabled` cinza + alert amarelo "Exclusivo plano X" + link discreto "Ver planos". **Não mostrar botão clicável** que vai para `/lojista/plano`.

**Plan check sempre lê do DB** (nunca do JWT, que pode estar desatualizado).

---

### R2 · Visibilidade pós-pagamento
Quando um lojista paga (Destaque ou Premium), o negócio **deve ficar visível imediatamente**, mesmo que `isVisible=false` por causa do período de aprovação de docs.

- Webhook `checkout.session.completed` e `invoice.payment_succeeded` em `stripe.ts` devem rodar `(status === "pending" || !isVisible)` → setar `isVisible=true` + `business_users.documentationStatus="approved"`.
- Mesma lógica em `POST /api/lojista/stripe/sync` (caminho de fallback sem webhook).
- Backfill `lib/startup-heal.ts → healPaidInvisibleBusinesses()` roda no startup; deve ser idempotente.

**Teste**: criar lojista novo → pagar → verificar `SELECT is_visible FROM businesses WHERE id=X` retorna `true` em até 5s.

---

### R3 · GET /api/lojista/profile deve sempre retornar zone + region
Ambos os campos vêm do cadastro e são necessários para:
- `LojistaDashboard.tsx` mostrar "Zona X" no cabeçalho (fallback: `zone || region`)
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

### R7 · Stripe sync pós-checkout (não confiar só no webhook)
Todo `success_url` de checkout Stripe **deve incluir** `&session_id={CHECKOUT_SESSION_ID}`. O frontend (`LojistaDashboard.tsx`, `LojistaBoost.tsx`) detecta esse param e chama `/lojista/stripe/sync` ou `/lojista/boosts/sync` para garantir ativação imediata mesmo se o webhook atrasar.

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

**Aprovação admin**: todo vídeo novo entra com `status="pending"` e só aparece após admin aprovar em `/admin/vitrine` (mesma fila do home banner).

**Endpoint público**: `GET /api/vitrine` retorna até 12 cards (4 fixos + 8 aleatórios) com `{productId, businessId, name, price, videoUrl, photoUrl, whatsapp, businessName}`. **Não cacheia em CDN** — randomização precisa rodar a cada request.

**Endpoint compra boost**: `POST /api/lojista/vitrine-boost/checkout` cria Stripe checkout de R$ 49/mês (subscription). Gate `planType === "premium"` antes de criar sessão.

**Esgotado**: quando os 4 slots de boost estão vendidos, `/lojista/boost` mostra "Vitrine Destaque — esgotado este mês" com botão desabilitado.

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
