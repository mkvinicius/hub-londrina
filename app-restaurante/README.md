# App do Restaurante — Documento mestre

> Estrutura de construção, processo de desenvolvimento, telas, botões, regras de negócio,
> stack técnica e banco de dados do aplicativo de relacionamento com o cliente do restaurante.
>
> Status: **especificação aprovada para início da Fase 0** · Versão 1.0 · 01/08/2026

---

## Resumo executivo em 10 linhas

1. **Plataforma**: um único aplicativo **PWA (web app) empacotado com Capacitor** para virar app nativo na Play Store e App Store. Não é preciso escolher entre "web" e "híbrido" — o PWA *é* a base do híbrido.
2. **Stack**: React 19 + Vite + TypeScript no front, Express 5 + Drizzle ORM no back, **PostgreSQL** no banco — exatamente a stack que já roda o Hub Londrina, com reaproveitamento de infra, time e padrões.
3. **Dois produtos, uma base de código**: o **App do Cliente** (consumidor) e o **Painel 360** (dono + sub-usuários).
4. **Fase 1 (MVP)**: login com senha gerada pelo dono e enviada por WhatsApp, perfil, cardápio do dia, notícias e promoções + Painel com cadastro de clientes, promoções e disparo de mensagens.
5. **Fase 2**: carteira digital (crédito antecipado + cashback), mensalidade, bonificação, segmentação e push.
6. **Fase 3**: controle de consumo (peso, valor, data, extrato), integração com PDV/balança e painel de indicadores do por quilo.
7. **Fase 4**: publicação nas lojas, fidelidade e indicação.
8. **Dinheiro é sempre em centavos inteiros**, todo movimento de saldo é um **lançamento em razão (ledger) imutável e idempotente**. Saldo nunca é editado direto.
9. **Toda promoção só é publicável com objetivo, meta, data-fim e trava de margem calculada pelo sistema** (RN-30 a RN-39). Promoção sem isso é queima de caixa e o sistema bloqueia.
10. **Prazo estimado até o MVP no ar**: 6 semanas de desenvolvimento com 1 pessoa dedicada em tempo integral (detalhamento em `05-ROADMAP-E-PROCESSO.md`).

---

## Índice dos documentos

| # | Documento | O que responde |
|---|---|---|
| 00 | [`00-VISAO-E-ARQUITETURA.md`](./00-VISAO-E-ARQUITETURA.md) | Híbrido ou web app? Que linguagem? Que arquitetura? Onde hospeda? Quanto custa? |
| 01 | [`01-MODELO-DE-DADOS.md`](./01-MODELO-DE-DADOS.md) | Banco de dados: todas as tabelas, colunas, índices e invariantes |
| 02 | [`02-TELAS-APP-CLIENTE.md`](./02-TELAS-APP-CLIENTE.md) | Cada tela do app do cliente, cada botão clicável, cada validação |
| 03 | [`03-PAINEL-360.md`](./03-PAINEL-360.md) | Cada tela do seu painel, cada botão, permissões do sub-usuário |
| 04 | [`04-REGRAS-DE-NEGOCIO.md`](./04-REGRAS-DE-NEGOCIO.md) | RN-01 a RN-72: as regras invioláveis, com as contas de margem feitas |
| 05 | [`05-ROADMAP-E-PROCESSO.md`](./05-ROADMAP-E-PROCESSO.md) | Metodologia, fases, sprints, critérios de aceite, definição de pronto |
| 06 | [`06-DECISOES-PENDENTES.md`](./06-DECISOES-PENDENTES.md) | O que ainda depende de resposta sua antes de codar |

---

## Os 3 princípios que governam esta aplicação

**1. O painel é a fonte de verdade; o app é vitrine.**
Nenhum crédito, desconto ou bonificação nasce no celular do cliente. Tudo é emitido no painel, registrado em razão auditável e apenas *exibido* no app.

**2. Nenhuma regra financeira entra no ar sem trava de margem.**
Cashback, mensalidade, desconto e bonificação são vazamentos de margem quando não têm teto, validade e medição. Todos os quatro nascem com teto, validade e painel de acompanhamento — as contas estão em `04-REGRAS-DE-NEGOCIO.md`.

**3. Consumo é dado sagrado.**
A partir da Fase 3, o extrato de consumo do cliente é um documento de confiança. Lançamento errado destrói a credibilidade do app inteiro. Por isso: importação com chave externa única, conciliação diária e correção sempre por estorno + novo lançamento, nunca por edição silenciosa.
