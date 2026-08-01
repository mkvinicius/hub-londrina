# 03 · Painel 360 — telas, botões e permissões

Acesso em `/painel`. Mesma base de código do app, autenticação separada (`resto_painel_token`).
Desenhado para **desktop** (você, na gestão) e **tablet/celular** (operador no caixa validando cupom e identificando cliente).

Menu lateral: **Visão 360 · Clientes · Consumo · Carteira · Promoções · Planos · Bonificações · Campanhas · Cardápio · Relatórios · Usuários · Configurações**.

---

## P-00 · Login do painel (F1)

E-mail + senha + **Entrar**. A partir da F2, `owner` tem **2FA obrigatório** (código do app autenticador).
Rate limit de 5 tentativas/15 min. Toda entrada registrada em auditoria com IP.

---

## P-01 · Visão 360 — o painel de comando (F1, cresce por fase)

### Faixa superior — cartões do dia
| Indicador | Fase | Cálculo |
|---|---|---|
| Faturamento de hoje | F3 | soma de `total_cents` do dia |
| Clientes hoje | F3 | visitas do dia |
| Ticket médio | F3 | faturamento ÷ clientes |
| **Consumo médio por cliente (g)** | F3 | o número que manda no por quilo |
| Clientes cadastrados no app | F1 | total ativo |
| Clientes ativos (30 d) | F3 | com ao menos 1 visita |
| **Saldo em aberto na carteira** | F2 | **passivo** — dinheiro já recebido que você ainda deve em comida |
| Assinantes ativos | F2 | |

### Faixa de alertas (o que te faz agir hoje)
Cada alerta é um card com botão de ação direto:
| Alerta | Gatilho | Botão |
|---|---|---|
| 🔴 Promoção sem meta atingida | promoção ativa com < 50% da meta faltando 3 dias | **Ver promoção** |
| 🟠 Bônus emitido no mês perto do teto | ≥ 80% do `BONUS_MONTHLY_CAP_CENTS` | **Ver carteira** |
| 🟠 Assinante consumindo acima do teto | plano com média de gramas > `max_grams_per_meal` | **Ver assinante** |
| 🟠 Clientes sumidos | ≥ 15 clientes com 30+ dias sem visita | **Criar campanha de retorno** |
| 🔵 Aniversariantes da semana | | **Criar campanha** |
| 🔴 Cardápio de amanhã não publicado | após as 17h | **Publicar cardápio** |
| 🔴 Divergência de saldo | heal encontrou diferença entre razão e carteira | **Ver detalhes** |

### Gráficos
Faturamento e clientes por dia (30 dias) · consumo médio em gramas por dia da semana · composição do faturamento (buffet vs. bebidas vs. sobremesas — onde a margem se recompõe no por quilo) · novos cadastros no app.

### Rankings
Top 20 clientes por gasto no período · Top 20 por frequência · Clientes em risco (frequência caiu > 50%).

---

## P-02 · Clientes — a lista (F1)

**Filtros**: busca (nome/telefone/CPF) · status · tem app instalado · tem saldo · tem plano · última visita · faixa de gasto · etiquetas · aniversariantes do mês.

| Botão | Ação |
|---|---|
| **+ Novo cliente** | → P-02a |
| **Importar planilha** | CSV/XLSX (nome, celular, aniversário) com pré-visualização, detecção de duplicado por telefone e relatório de erros linha a linha |
| **Gerar senhas em lote** | Seleciona N clientes → gera senha temporária de cada um → **exporta a lista de links `wa.me` prontos** para você disparar (RN-04) |
| **Exportar** | CSV do filtro atual (registra em auditoria — é dado pessoal saindo) |
| **Criar campanha com este filtro** | Leva o filtro atual direto para a tela de campanha |
| Ação em massa | Adicionar etiqueta · enviar mensagem · bloquear |

### P-02a · Novo cliente
Nome* · Celular* (único) · CPF · Aniversário · E-mail · Etiquetas · Observação interna.
Botão **Salvar e gerar senha** → modal com a **senha temporária exibida uma única vez**, botão **Copiar** e botão **Enviar no WhatsApp** (abre `wa.me` com a mensagem pronta: boas-vindas + link do app + senha + aviso de troca no primeiro acesso).

---

## P-03 · Ficha do cliente — a visão 360 de uma pessoa (F1→F3)

Cabeçalho: foto, nome, celular, desde quando, etiquetas, **status do app** (cadastrado / primeiro acesso feito / nunca entrou), última visita.

**Aba Resumo** — cartões: total gasto na vida · visitas · ticket médio · **peso médio do prato** · frequência (visitas/mês) · dia e horário preferidos · saldo em carteira · plano · bônus recebidos.

**Aba Consumo (F3)** — todas as visitas com data, peso, valor, extras, desconto, forma de pagamento. Botões: **+ Lançar consumo manual** · **Corrigir lançamento** (gera estorno visível) · **Exportar PDF**.

**Aba Carteira (F2)** — saldo pago/bônus, razão completo. Botões: **+ Adicionar crédito** (motivo obrigatório) · **Conceder bônus** · **Estornar** · **Ajustar** (só `owner`).

**Aba Plano (F2)** — assinatura, refeições usadas, cobranças, **frequência antes × depois do plano** (RN-45). Botões: **Assinar plano** · **Pausar** · **Cancelar** · **Alterar plano**.

**Aba Promoções** — cupons emitidos, usados e expirados. Botão **Dar cupom individual** (promoção dirigida a um cliente só).

**Aba Mensagens** — histórico de tudo que foi enviado e lido. Botão **Enviar mensagem agora** (push + inbox, e `wa.me` se houver opt-in).

**Aba Acesso** — status da senha, último login, sessões ativas. Botões: **Gerar nova senha** (exibe uma vez + link WhatsApp) · **Encerrar sessões** · **Bloquear cliente** · **Excluir (LGPD)**.

> **Sub-usuário `operator`** vê apenas as abas Resumo, Consumo e Promoções, com CPF mascarado e **sem** nenhum botão de dinheiro.

---

## P-04 · Consumo (F3)

**Lançamento no caixa** (tela otimizada para tablet, 3 toques):
1. Identificar cliente: **escanear QR** · digitar celular · buscar por nome
2. Digitar **peso (g)** e **extras (R$)** → o sistema calcula com o preço/kg do dia
3. **Aplicar cupom** (se houver) → mostra o desconto
4. Forma de pagamento; se **carteira**, mostra saldo antes/depois
5. **Confirmar** → grava a visita, debita a carteira, envia push com o resumo ao cliente

**Importação do PDV**: **Importar arquivo** (CSV/XLSX) ou integração via API. Pré-visualização, deduplicação por `external_ref`, relatório de importados/ignorados/erros.

**Conciliação diária**: total do PDV × total lançado no app; divergência destacada com botão **Ver diferenças**.

---

## P-05 · Carteira e cashback (F2)

**Aba Regras**: CRUD das faixas de recarga. Ao digitar "paga 300 / ganha 30", a tela mostra **antes de salvar**:
> Desconto efetivo: **9,09%** · Sua margem por cliente cai de 63% para 53,9% do consumo · Este cliente precisa consumir **17% a mais** para você empatar. *(cálculo em `04-REGRAS-DE-NEGOCIO.md` RN-20)*

Campos: valor mínimo · bônus · validade do bônus (padrão 90 dias) · **teto de emissão mensal** · vigência.

**Aba Passivo**: total em aberto (pago + bônus), quanto vence nos próximos 30/60/90 dias, bônus emitido no mês × teto, taxa de utilização do crédito.

**Aba Movimentações**: razão global filtrável, com **Exportar** e botão **Estornar** (motivo obrigatório, auditado).

> **Nunca** existe botão "editar saldo". Só lançamento novo com motivo. É o que garante que o extrato do cliente e a sua contabilidade nunca divirjam.

---

## P-06 · Promoções (F1) — com trava de margem

**Lista** com status, período, resgates, **meta × realizado** e margem consumida.

**Assistente de criação em 5 passos** (não deixa publicar pulando nenhum):

**1. Objetivo** — escolha obrigatória: encher dia fraco · encher horário fraco · aumentar ticket médio · trazer cliente de volta · atrair cliente novo · girar insumo parado.
**2. Mecânica** — desconto %, desconto R$, brinde, combo, preço/kg promocional, cashback extra, refeição grátis. Campos conforme a escolha.
**3. Público e período** — segmento (ou todos), dias da semana, horário, início e **fim obrigatório**, limite por cliente, limite total.
**4. Trava de margem** — **calculada pelo sistema** a partir de `PRICE_PER_KG_CENTS` e `AVG_COST_PER_KG_CENTS`:

```
Margem de contribuição atual .............. R$ __ / __%
Margem de contribuição com a promoção ..... R$ __ / __%
Volume de equilíbrio ...................... precisa de __% mais volume
Custo estimado da promoção no período ..... R$ __
Custo de divulgação (você informa) ........ R$ __
```
- Margem promocional **≤ 0** → **publicação bloqueada**, salvo marcação explícita de "isca declarada" com teto de resgates e justificativa escrita (RN-33).
- Volume de equilíbrio **> 2×** → alerta vermelho exigindo confirmação por escrito do objetivo secundário.

**5. Revisão e publicação** — pré-visualização exata do card como o cliente verá, texto de regras, e os botões **Salvar rascunho** · **Agendar** · **Publicar agora**.

**Tela de acompanhamento**: resgates por dia, meta × realizado, **ticket médio de quem usou × de quem não usou**, faturamento nos dias da promoção × mesmos dias das 4 semanas anteriores, e **canibalização** (o que aconteceu no dia forte vizinho). Botões: **Pausar** · **Encerrar agora** · **Duplicar** · **Encerrar e criar relatório**.

**Validação de cupom** (tela de caixa): digitar código ou escanear QR → mostra cliente, promoção e desconto → **Validar** ou **Recusar** (com motivo).

---

## P-07 · Planos / Mensalidade (F2)

**CRUD de planos** com os campos de trava: preço, refeições incluídas, **máximo de gramas por refeição**, dias e horários válidos, inclui bebida, acumula refeição não usada (padrão: não).
Ao definir o preço, a tela mostra a simulação obrigatória (RN-41):
> Consumo médio esperado do assinante: **__ g** (média geral + 15% de autosseleção) · Custo por refeição: R$ __ · Receita por refeição no plano: R$ __ · **Margem por refeição: R$ __ (__%)** · Ponto de equilíbrio: o assinante precisa vir **__ vezes/mês** para valer a pena.

**Assinantes**: lista com status, refeições usadas, **frequência antes × depois**, consumo médio em gramas, margem individual acumulada.
Alerta automático: assinante com margem negativa 2 meses seguidos → card "Revisar plano deste cliente".
Botões: **Assinar cliente** · **Pausar** · **Cancelar** · **Cobrar agora** · **Exportar**.

---

## P-08 · Bonificações (F1 simples → F2 completa)

Formulário: cliente · tipo (crédito, desconto, refeição grátis, brinde) · valor · **motivo obrigatório** · validade · **Conceder**.
Regras (RN-46 a RN-49): teto por concessão e teto mensal em % do faturamento; acima do teto exige aprovação do `owner`; `operator` nunca concede; tudo auditado.
Painel do mês: total concedido × teto, ranking de quem concedeu, taxa de uso das bonificações.

---

## P-09 · Campanhas e comunicação (F1)

**Nova campanha em 4 passos**: público (segmento salvo ou filtro na hora, com contagem em tempo real) → canal (inbox, push, WhatsApp, e-mail) → conteúdo (título, texto, imagem, botão de ação, variáveis `{{nome}}`, prévia no celular) → agendamento (agora ou data/hora) e **Enviar**.

**Regras de comunicação** (RN-60 a RN-63):
- Campanha de marketing **pula automaticamente** quem não deu opt-in — a tela mostra "1.240 no segmento · 980 receberão · 260 sem autorização".
- Limite de **2 campanhas de marketing por cliente por semana** (transacionais não contam).
- WhatsApp na F1 = **modo assistido**: o sistema gera a fila de links `wa.me`, você/operador confirma o envio um a um e o painel marca como enviado. Sem risco de bloqueio do número.
- WhatsApp na F2 = Cloud API com templates aprovados.

**Segmentos**: construtor visual de regras (E/OU), contagem instantânea, salvar segmento, botão **Ver clientes do segmento**.

---

## P-10 · Cardápio e conteúdo (F1)

**Cardápio**: visão semanal em calendário. **Novo cardápio do dia** com preço/kg, itens por categoria, fotos, etiquetas, destaques. Botões: **Salvar rascunho** · **Publicar** · **Duplicar de outro dia** · **Aplicar cardápio-padrão da semana** · **Publicar semana inteira**.

**Notícias e avisos**: CRUD com título, texto, imagem, tipo, fixar no topo, data de expiração. Botão **Publicar e avisar clientes** (publica + dispara campanha em 1 clique).

---

## P-11 · Relatórios (F2→F3)

| Relatório | Conteúdo |
|---|---|
| Fechamento diário | Faturamento, clientes, ticket médio, consumo médio (g), formas de pagamento, descontos concedidos |
| Indicadores do por quilo | Consumo médio por cliente, faturamento buffet × bebidas × sobremesas, clientes por dia da semana, curva por horário |
| Clientes | Novos, ativos, recorrentes, perdidos, RFV (recência/frequência/valor) |
| Carteira | Recargas, bônus emitido, bônus usado, bônus expirado, passivo |
| Promoções | Custo, resgates, meta × realizado, retorno estimado |
| Bonificações e descontos | Total do mês, % do faturamento, por concedente |

Todos com filtro de período, **Exportar CSV** e **Exportar PDF**.

---

## P-12 · Usuários e permissões (F1)

Lista de usuários do painel. **+ Novo usuário**: nome, e-mail, telefone, perfil (`manager`/`operator`) e **matriz de permissões módulo a módulo** (ver / editar).
Botões: **Salvar e enviar acesso** · **Redefinir senha** · **Desativar** · **Ver ações deste usuário** (leva à auditoria filtrada).

**Travas** (RN-56 a RN-59): só existe **um** `owner`, indelével; `operator` nunca recebe edição em carteira, bonificações, planos ou usuários; toda mudança de permissão é auditada; usuário desativado perde todas as sessões na hora.

---

## P-13 · Configurações (F1)

Dados do restaurante (nome, endereço, telefone, horários, logo, cores) · **Preço/kg de semana e de fim de semana** · **Custo médio do kg produzido** e **meta de food cost** (alimentam a trava de margem — sem eles não se publica promoção) · tetos de bônus e desconto mensal · validade padrão do bônus · textos de Termos e Privacidade + versão · integrações (PSP do Pix, WhatsApp, PDV) · modo de WhatsApp (assistido/API).

---

## P-14 · Auditoria (F1)

Log completo e filtrável: quem, o quê, quando, de onde (IP), valor antes e depois. Somente leitura, sem botão de exclusão para ninguém — inclusive para o `owner`. É o que protege você em qualquer discussão sobre dinheiro.
