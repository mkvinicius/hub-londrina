# 05 · Processo de desenvolvimento, fases e critérios de aceite

---

## 1. Metodologia

**Sprints semanais com entrega funcionando ao fim de cada semana.** Não é uma escolha de gosto: aplicativo de restaurante morre quando fica 3 meses "em construção" e chega grande, errado e sem uso. A cada semana existe algo que você abre no seu celular e testa.

| Prática | Como funciona aqui |
|---|---|
| **Sprint de 1 semana** | Segunda: combinamos o escopo. Sexta: demonstração no celular real, com dados reais de teste |
| **Quadro de tarefas** | Backlog → Fazendo → Em revisão → Em homologação → Pronto |
| **Fatia vertical** | Cada tarefa entrega banco + API + tela + teste, nunca "só o backend desta semana" |
| **Feature flag** | Funcionalidade nova entra desligada e é ligada quando você aprova |
| **Ambiente de homologação** | Você testa em `staging` com dados fictícios antes de qualquer coisa chegar ao cliente |
| **Uma migração por vez** | Mudança de banco é revisada e aplicada isoladamente, com backup antes |
| **Prova, não opinião** | Nada é "pronto" sem evidência — ver §5 |

### Definição de Pronto (DoD) — vale para toda tarefa
1. Código revisado e sem erro de tipo (`pnpm typecheck`).
2. Validação Zod na entrada de toda rota.
3. Regra de permissão aplicada **no backend**, não só na tela.
4. Estados de carregando / vazio / erro / offline implementados.
5. Testado no celular real (Android **e** iPhone), não só no navegador do computador.
6. Se mexe em dinheiro: teste de clique duplo, teste de reenvio de webhook e lançamento em auditoria conferidos.
7. Documento correspondente (00–04) atualizado se a regra mudou.

---

## 2. Fases, entregáveis e prazos estimados

> Estimativas para **1 pessoa dedicada em tempo integral**. Com 2 pessoas, Fases 1 e 2 encurtam ~35%.

### Fase 0 — Fundação · 1 semana
| Entregável | Detalhe |
|---|---|
| Decisões fechadas | Respostas do doc `06-DECISOES-PENDENTES.md` |
| Artefatos criados | `resto-app` e `resto-api` no monorepo, rodando localmente |
| Banco | Schema Drizzle das tabelas da Fase 1 aplicado |
| Identidade visual | Logo, cores, tipografia, componentes base |
| Ambientes | `dev`, `staging` e `prod` no ar, com backup configurado |
| CI | Typecheck + build automáticos a cada envio de código |

**Aceite**: você acessa o `staging`, vê a tela de login e o painel vazio funcionando.

---

### Fase 1 — MVP: relacionamento · 4 a 5 semanas
O app que você descreveu como "inicialmente será assim": promoções, cardápio e notícias.

| Semana | Entrega |
|---|---|
| 1 | Autenticação completa: cadastro no painel, geração de senha, envio por WhatsApp assistido, login, primeiro acesso, troca de senha, LGPD |
| 2 | Painel: lista de clientes, ficha do cliente, importação de planilha, geração de senha em lote, usuários e permissões, auditoria |
| 3 | Cardápio (painel + app, com cardápio-padrão da semana) e notícias/avisos |
| 4 | Promoções: assistente de 5 passos com trava de margem, cupom com QR, validação no caixa, acompanhamento |
| 5 | Campanhas (inbox + push + WhatsApp assistido), segmentos, perfil do cliente, instalação do PWA, ajustes e homologação |

**Critérios de aceite da Fase 1**
- [ ] Você cadastra um cliente e ele recebe a senha no WhatsApp em menos de 1 minuto.
- [ ] O cliente instala pelo link, troca a senha e vê o cardápio de hoje.
- [ ] Você publica uma promoção — e o sistema **recusa** publicar sem objetivo, meta e data-fim.
- [ ] A trava de margem aparece com o volume de equilíbrio calculado antes de publicar.
- [ ] Um cliente resgata o cupom e o operador valida no caixa pelo QR.
- [ ] Você dispara uma campanha para um segmento e vê quantos foram pulados por falta de opt-in.
- [ ] Um `operator` entra no painel e **não vê** nenhum botão de dinheiro.
- [ ] Toda ação de staff aparece na auditoria com antes/depois.

**Meta de negócio da fase**: 200 clientes cadastrados e ≥ 60% com primeiro acesso feito em 30 dias.

---

### Fase 2 — Dinheiro: carteira, cashback, plano e bonificação · 4 semanas

| Semana | Entrega |
|---|---|
| 1 | Razão da carteira (`wallet-ledger`), saldos pago/bônus, extrato no app, ajustes no painel, jobs de expiração |
| 2 | Recarga por Pix: integração com o PSP, webhook idempotente, sync de fallback, faixas de bônus com teto e simulador de margem |
| 3 | Planos: CRUD com trava de gramas, assinatura, cobrança recorrente, teto de refeições, medição antes × depois |
| 4 | Bonificações com teto e aprovação, painel de passivo e descontos, push nativo, WhatsApp Cloud API |

**Critérios de aceite**
- [ ] Recarga de R$ 300 credita R$ 330, com o bônus expirando em 90 dias e visível no extrato.
- [ ] Pagar duas vezes o mesmo Pix (reenvio de webhook) credita **uma vez só**.
- [ ] Ao criar a faixa "300 → 30", o painel mostra 9,09% de desconto efetivo e +17% de volume de equilíbrio **antes** de salvar.
- [ ] Atingido o teto mensal de bônus, a faixa sai do ar sozinha e você é avisado.
- [ ] Consumo debita bônus antes do crédito pago.
- [ ] Ao criar um plano, o painel mostra margem por refeição e a frequência mínima para o plano valer a pena.
- [ ] `operator` tenta conceder bonificação pela API direta → **403**.

---

### Fase 3 — Consumo: o controle que você quer · 4 a 5 semanas

| Semana | Entrega |
|---|---|
| 1 | Modelo de visitas, lançamento manual no painel, débito integrado da carteira |
| 2 | Tela de caixa (tablet): QR do cliente, peso, extras, cupom, pagamento |
| 3 | Importação/integração com o PDV, conciliação diária, job de métricas |
| 4 | Extrato de consumo no app: visitas, peso, valores, datas, gráficos, PDF |
| 5 | Painel de indicadores do por quilo, relatórios, RFV, alertas de cliente sumido |

**Critérios de aceite**
- [ ] Uma visita lançada aparece no extrato do cliente em segundos, com peso, valor e data corretos.
- [ ] Importar o mesmo arquivo do PDV duas vezes **não duplica** nada.
- [ ] Correção aparece como estorno visível, nunca como sumiço.
- [ ] O painel mostra consumo médio em gramas por dia da semana.
- [ ] O fechamento do dia bate com o caixa do PDV; divergência aparece destacada.

---

### Fase 4 — Escala · 3 a 4 semanas
Publicação nas lojas (Capacitor, Play Store e App Store) · fidelidade por selos · indicação de amigos · self-service de plano e cadastro assistido · marmitas/delivery se fizer sentido.

---

## 3. Ordem de construção dentro de cada funcionalidade

Sempre a mesma sequência — ela evita retrabalho:
```
1. Regra de negócio escrita (doc 04)
2. Tabela + migração (doc 01)
3. Schema Zod compartilhado
4. Rota da API + permissão + auditoria + teste
5. Tela do painel (você opera antes do cliente ver)
6. Tela do app do cliente
7. Teste em celular real + homologação sua
8. Liga a feature flag em produção
```
O painel vem **antes** da tela do cliente de propósito: se você não consegue operar, não adianta o cliente ver.

---

## 4. Riscos mapeados e como cada um é tratado

| Risco | Probabilidade | Tratamento |
|---|---|---|
| Cliente não instala o app | **Alta** | Link, não loja, na Fase 1; QR na mesa e no caixa; senha entregue no WhatsApp com o link junto; benefício claro no primeiro acesso (cupom de boas-vindas) |
| Cliente esquece a senha em massa | Alta | Fluxo de pedido de senha em 2 toques + geração em lote no painel; na F2, código automático por WhatsApp |
| Número de WhatsApp bloqueado por disparo | Média | Modo assistido na F1; API oficial com opt-in na F2 (RN-62) |
| Cashback corroendo a margem | Média | Tetos, validade, medição e alerta de 80% (RN-25, RN-48) |
| Plano vendido para quem já vinha todo dia | **Alta** | Medição de frequência antes × depois e alerta de margem negativa (RN-45) |
| Divergência entre extrato do app e caixa | Média | Razão imutável, conciliação diária, correção só por estorno |
| PDV sem API de integração | Média | Importação por planilha desde o começo — a integração é otimização, não pré-requisito |
| Projeto crescer sem foco | Média | Fase 1 fechada em escopo; ideia nova vai para o backlog, não para a sprint em curso |

---

## 5. Como validamos cada entrega ("pronto exige prova")

Regra herdada do que já funciona no seu marketplace (W1 do `RULES.md`), adaptada:

| Tipo de mudança | Prova exigida |
|---|---|
| Rota nova | `curl` real com resposta colada no registro da tarefa |
| Tela nova | Captura de tela no celular real (Android e iPhone) |
| Mudança de banco | Consulta SQL antes/depois |
| Regra de dinheiro | Teste de clique duplo + reenvio de webhook + conferência do razão |
| Regra de permissão | Testado com `owner`, `manager` e `operator` — inclusive chamando a API direto, sem passar pela tela |
| Regra de margem | Conta refeita à mão e comparada com o número que o sistema mostrou |

**Revisão mental não conta. Sem prova, não está pronto.**

---

## 6. Indicadores de sucesso do produto

| Fase | Indicador | Meta |
|---|---|---|
| 1 | Clientes com primeiro acesso feito | ≥ 60% dos cadastrados em 30 dias |
| 1 | Abertura do app por semana | ≥ 35% da base |
| 1 | Resgate de cupom da 1ª promoção | ≥ 15% dos ativos |
| 2 | Clientes com saldo em carteira | ≥ 20% dos ativos |
| 2 | Ticket médio de quem tem saldo × quem não tem | ≥ +10% |
| 2 | Frequência dos assinantes vs. linha de base | ≥ +25% |
| 3 | Visitas identificadas (com cliente vinculado) | ≥ 70% do movimento |
| 3 | Clientes recuperados por campanha de retorno | ≥ 10% dos inativos contatados |
| Todas | Desconto total concedido (cashback + promo + bonificação) | ≤ 4% do faturamento |
