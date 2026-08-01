# 00 · Visão, decisão de plataforma e arquitetura

---

## 1. A pergunta central: híbrido ou web app?

**Resposta: os dois. Você constrói um web app (PWA) e o empacota como aplicativo nativo.**

Essa não é uma resposta de conveniência — é a arquitetura que custa menos e entrega mais no seu caso específico, e o motivo é a natureza do produto: seu app é **conteúdo + dados + comunicação** (cardápio, promoções, extrato, mensagens). Ele não precisa de GPS em segundo plano, bluetooth, processamento de vídeo ou qualquer recurso que exija código nativo pesado.

### Comparação das 4 opções reais

| Opção | Custo de construção | Tempo até o ar | Presença nas lojas | Push no iOS | Atualização | Veredito |
|---|---|---|---|---|---|---|
| **PWA pura** (só navegador) | 1× | Mais rápido | ❌ Não | ⚠️ Só se o cliente "adicionar à tela de início" | Instantânea | Boa base, insuficiente sozinha |
| **PWA + Capacitor** ✅ | 1× + ~1 semana | Rápido | ✅ Sim | ✅ Confiável (push nativo) | Instantânea no conteúdo, loja só quando muda o "casco" | **Recomendado** |
| **React Native** | ~1,8× | Médio | ✅ Sim | ✅ Sim | Precisa build/OTA | Justifica-se só se houver recurso nativo pesado — não é o caso |
| **Flutter** | ~2× | Médio | ✅ Sim | ✅ Sim | Precisa build | Linguagem (Dart) diferente de tudo que você já roda. Descartado por custo de time |

### Por que PWA + Capacitor vence aqui

1. **Uma base de código para tudo**: app do cliente no Android, no iOS e no navegador. Cliente que não quer instalar nada acessa por um link — e isso importa muito no lançamento, porque a primeira barreira de adoção é a instalação.
2. **Você já tem essa stack rodando.** O Hub Londrina é React + Vite + Express + Postgres. Time, padrões, deploy e banco são os mesmos. Aprendizado zero.
3. **Atualização sem esperar a Apple.** Mudou promoção, cardápio, texto, regra? Está no ar em minutos, sem revisão de loja. Só mudanças no "casco" nativo (ícone, permissões, plugins) exigem novo envio às lojas.
4. **Push notification confiável no iOS.** Esse é o ponto técnico que mata a PWA pura: no iPhone, notificação de web app só funciona se o cliente adicionou o site à tela de início — na prática, metade dos seus clientes não vai fazer isso. O Capacitor resolve com push nativo de verdade.
5. **Escanear QR no caixa** (Fase 3) funciona com o plugin de câmera do Capacitor, sem gambiarra de navegador.

### Estratégia de lançamento em 2 tempos

- **Fase 1–2**: o app vai ao ar como **link** (`app.seurestaurante.com.br`) com banner "Instalar aplicativo". Cliente instala em 2 toques, ícone na tela, funciona offline no cardápio. **Zero atrito, zero espera de loja.**
- **Fase 4**: mesmo código empacotado com Capacitor e publicado na **Play Store e App Store**, para quem procura o app pelo nome.

---

## 2. Stack técnica definida

| Camada | Tecnologia | Por quê |
|---|---|---|
| Linguagem | **TypeScript** (front e back) | Tipagem compartilhada entre app e API elimina uma classe inteira de bug |
| App do cliente | **React 19 + Vite 7** | Já é a stack do monorepo |
| Roteamento | **Wouter** | Já usado no projeto, leve (1 kB) |
| Estado servidor | **TanStack Query** | Cache, revalidação e offline já resolvidos |
| UI | **Tailwind CSS + Radix UI** | Já instalados no workspace, acessíveis |
| Gráficos | **Recharts** | Já instalado |
| Empacotamento nativo | **Capacitor 6** | Envelopa o PWA em app Android/iOS |
| API | **Express 5 + Node 20** | Mesma do `api-server` |
| ORM | **Drizzle ORM** | Mesmo do `lib/db` |
| Banco | **PostgreSQL 16** | Transacional, ACID — obrigatório para carteira/saldo |
| Validação | **Zod** | Schemas compartilhados front/back (`lib/api-zod`) |
| Autenticação | **JWT + refresh token**, senha com **bcrypt** (cost 12) | Mesmo padrão já auditado do projeto |
| Pagamento (Fase 2) | **Pix via PSP** (Mercado Pago / Asaas / Stripe BR) | Recarga de crédito com custo baixo por transação |
| Mensageria | **Push (FCM/APNs)** + **WhatsApp** (manual na F1, Cloud API na F2) | Ver §5 |
| Imagens | **GCS** (mesmo bucket/handler do projeto) + Sharp | Reaproveita `objectStorage.ts` |
| Observabilidade | **Pino** (log) + **Sentry** | Já configurados no `api-server` |
| E-mail transacional | **Resend** | Já configurado |

**Nada de tecnologia nova sem necessidade.** Cada item acima ou já existe no repositório ou é obrigatório para uma função que não dá para fazer sem ele (Capacitor, Pix, push).

---

## 3. Onde o código mora — estrutura de pastas

O app entra **no mesmo monorepo pnpm**, como artefatos novos. Isso reaproveita banco, libs, tipos e deploy sem tocar em nada que hoje está sob os invariantes do `RULES.md`.

```
hub-londrina/
├── artifacts/
│   ├── hub-londrina/          ← (existente) marketplace
│   ├── api-server/            ← (existente) API do marketplace — NÃO SERÁ TOCADA
│   ├── resto-app/             ← NOVO · PWA do cliente + Painel 360 (React)
│   │   ├── src/
│   │   │   ├── pages/
│   │   │   │   ├── cliente/   ← telas do doc 02
│   │   │   │   └── painel/    ← telas do doc 03
│   │   │   ├── components/
│   │   │   ├── lib/
│   │   │   │   ├── cliente-api.ts   ← clienteFetch() — chave `resto_cliente_token`
│   │   │   │   └── painel-api.ts    ← painelFetch()  — chave `resto_painel_token`
│   │   │   └── hooks/
│   │   ├── capacitor.config.ts      ← Fase 4
│   │   └── public/manifest.webmanifest
│   └── resto-api/             ← NOVO · Express 5 dedicado
│       └── src/
│           ├── routes/        ← auth, perfil, cardapio, promocoes, carteira,
│           │                     consumo, painel, clientes, campanhas, planos
│           ├── lib/           ← wallet-ledger, promo-guard, whatsapp, push,
│           │                     audit, startup-heal
│           └── middleware/    ← auth cliente, auth painel, permissões, rate limit
├── lib/
│   ├── db/src/schema/
│   │   └── resto/             ← NOVO · todas as tabelas com prefixo `resto_`
│   └── api-zod/src/resto/     ← NOVO · schemas Zod compartilhados
```

### Duas decisões de arquitetura que importam

**a) API separada (`resto-api`), não rotas dentro do `api-server`.**
O `api-server` carrega 15 invariantes de negócio do marketplace (Stripe, planos, documentação, boosts). Misturar o restaurante ali significa que todo deploy do app arrisca o marketplace, e vice-versa. Separando: bancos de dados compartilhados, código isolado, falha isolada, deploy independente.

**b) Mesmo banco PostgreSQL, tabelas com prefixo `resto_`.**
Um banco só (menos custo, menos operação, backup único), mas namespace próprio. Nenhuma tabela do marketplace é lida ou escrita pelo `resto-api`.

---

## 4. Fluxo de dados

```
App do Cliente (PWA / Capacitor)
  └─ clienteFetch()  ──► JWT cliente
        │
Painel 360 (mesma SPA, rotas /painel)
  └─ painelFetch()   ──► JWT staff + matriz de permissões
        │
        ▼
   resto-api (Express 5)
     ├─ middleware: auth → permissão → rate limit → validação Zod
     ├─ rotas de leitura  ──────────────► Drizzle ──► PostgreSQL
     └─ rotas financeiras ──► pg_advisory_xact_lock(customer_id)
                              └─ INSERT no ledger (idempotente) ──► PostgreSQL
        │
        ├─► Pix (PSP) ──webhook──► crédito na carteira (idempotente)
        ├─► Push (FCM/APNs)
        └─► WhatsApp (wa.me na F1 · Cloud API na F2)
```

**Regra estrutural**: toda operação que mexe em dinheiro (recarga, bônus, débito, estorno, bonificação, cobrança de mensalidade) passa **obrigatoriamente** por um único módulo — `lib/wallet-ledger.ts` — que aplica lock por cliente, checa idempotência e grava o lançamento. Nenhuma rota escreve saldo direto. Isso é o equivalente, aqui, ao que o `RULES.md` fez com o `syncDocumentationState` no marketplace: **uma fonte única de escrita**.

---

## 5. Comunicação com o cliente — o que é possível quando

Esse é o ponto onde projetos assim mais tomam susto, então está explícito:

| Canal | Fase 1 | Fase 2+ | Custo | Restrição |
|---|---|---|---|---|
| **Inbox no app** | ✅ | ✅ | Zero | Cliente só vê ao abrir o app |
| **Push notification** | ⚠️ Android/PWA | ✅ Android + iOS nativo | Zero | iOS só com app instalado (por isso Capacitor) |
| **WhatsApp — envio manual assistido** | ✅ | ✅ | Zero | Painel gera o link `wa.me` com a mensagem pronta; você (ou o operador) confirma o envio. Ideal para a senha inicial e para o volume atual |
| **WhatsApp — API oficial (Cloud API)** | ❌ | ✅ | Cobrado por conversa iniciada pela empresa (confirmar tabela vigente da Meta na contratação) | Exige conta comercial verificada, **templates aprovados** e **opt-in registrado**. Disparo em massa sem opt-in derruba o número |
| **SMS** | ❌ | Opcional | Alto por unidade | Só como fallback de senha |
| **E-mail** | ✅ (Resend) | ✅ | Baixo | Nem todo cliente de restaurante tem e-mail ativo |

**Decisão para o MVP**: a senha inicial e as primeiras campanhas saem por **WhatsApp manual assistido** — o painel monta a lista, escreve a mensagem, gera os links e você dispara. Custo zero, risco zero de bloqueio, e valida se as pessoas realmente respondem antes de investir na API oficial. A Cloud API entra na Fase 2, quando já houver base e opt-in registrado.

---

## 6. Segurança e LGPD (obrigatório desde a Fase 1)

| Item | Regra |
|---|---|
| Senha | `bcrypt` cost 12. **Nunca** em texto plano no banco, em log ou no Sentry |
| Senha temporária | Exibida **uma única vez** na tela do painel, para copiar. Depois só é possível **regerar** |
| Validade da temporária | 7 dias. Expirou, cliente pede nova ao restaurante |
| Primeiro acesso | Troca de senha **obrigatória** + aceite de Termos e Política de Privacidade |
| Sessão | JWT de 15 min + refresh token de 30 dias, revogável no painel |
| Rate limit | 5 tentativas de login por telefone a cada 15 min; 20 req/min por IP nas rotas públicas |
| Dados sensíveis | CPF **opcional** e mascarado no painel (`***.456.789-**`) para sub-usuários |
| Base legal | Consentimento explícito registrado (versão dos termos, data, IP) na tabela `resto_consents` |
| Direitos do titular | Tela de privacidade no app com **exportar meus dados** (JSON) e **excluir minha conta** |
| Exclusão | *Soft delete* + anonimização (nome → "Cliente removido", telefone → hash). Histórico financeiro é preservado anonimizado por obrigação fiscal |
| Auditoria | Toda ação de staff sobre dinheiro ou dado pessoal grava em `resto_audit_log` com antes/depois |
| Transporte | HTTPS obrigatório, HSTS, cookies `Secure`+`SameSite` |

---

## 7. Ambientes, deploy e custo estimado

| Ambiente | Uso | Banco |
|---|---|---|
| `dev` | Máquina do desenvolvedor | Postgres local ou branch de dev |
| `staging` | Homologação — você testa antes de subir | Banco separado com dados fictícios |
| `prod` | Clientes reais | Banco de produção, backup diário + PITR |

**Custo mensal estimado de infraestrutura** (premissas: até ~2.000 clientes cadastrados, ~15 mil requisições/dia):

| Item | Estimativa/mês |
|---|---|
| Hospedagem API + app (container pequeno) | R$ 60 – R$ 150 |
| PostgreSQL gerenciado com backup | R$ 50 – R$ 120 |
| Armazenamento de imagens (GCS) | R$ 10 – R$ 30 |
| Push (FCM/APNs) | R$ 0 |
| Pix via PSP (Fase 2) | ~R$ 0,60 a R$ 1,00 por recarga (confirmar com o PSP escolhido) |
| WhatsApp Cloud API (Fase 2) | Por conversa iniciada — confirmar tabela vigente da Meta |
| Conta de desenvolvedor Apple (Fase 4) | US$ 99/ano |
| Conta Google Play (Fase 4) | US$ 25 (uma vez) |

> Todos os valores acima são **premissas de ordem de grandeza** para dimensionamento, não cotações. Devem ser confirmados no momento da contratação.
