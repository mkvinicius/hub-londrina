# 04 · Regras de negócio (RN-01 a RN-72)

> Este arquivo é contrato, no mesmo espírito do `RULES.md` do marketplace. Toda implementação deve preservar todas as regras abaixo. Mudança de regra é decisão de negócio registrada aqui — não improviso no código.

## Premissas dos cálculos (confirmar com os números reais antes de ligar qualquer regra financeira)

| Premissa | Valor usado | Como confirmar |
|---|---|---|
| Preço/kg (seg–sex) | R$ 79,90 | Preço vigente na casa |
| Custo médio do kg produzido | R$ 29,56 (**37%** do preço/kg) | Compras do período ÷ kg produzidos |
| Consumo médio por cliente | 450 g | (faturamento buffet ÷ preço/kg ÷ clientes) × 1000 |
| Autosseleção do assinante | +15% de consumo | Medir após 60 dias de plano |
| Breakage de bônus (não usado) | 5% a 15% | Medir a partir do 4º mês |

**Todos os números deste documento são recalculados pelo sistema** a partir de `PRICE_PER_KG_CENTS` e `AVG_COST_PER_KG_CENTS` em `resto_settings`. Os valores acima são ilustrativos para as contas de referência.

---

## A. Acesso e identidade (RN-01 a RN-09)

**RN-01** · O cadastro do cliente é **sempre feito pelo restaurante**. Não existe auto-cadastro no MVP. Isso mantém a base limpa e ligada a quem realmente frequenta a casa.

**RN-02** · O **celular é o login** e é único. Dois cadastros com o mesmo telefone são proibidos pelo banco (`UNIQUE`), não só pela tela.

**RN-03** · A senha inicial é gerada pelo sistema (8 caracteres, sem ambiguidade visual — nada de `O`/`0`, `l`/`1`), gravada em bcrypt, **exibida uma única vez** no painel e **nunca recuperável**. Perdeu, gera outra.

**RN-04** · O envio da senha é por WhatsApp. Na Fase 1, o painel monta o link `wa.me` com a mensagem pronta e você confirma o envio. Registra-se `senha_enviada_em` para auditoria.

**RN-05** · Senha temporária **expira em 7 dias**. Após o vencimento o cliente precisa pedir outra — senha antiga circulando em conversa de WhatsApp é risco.

**RN-06** · 5 tentativas de login por telefone a cada 15 minutos. Estourou, bloqueio temporário com mensagem clara e registro no log.

**RN-07** · Mensagem de erro de login é **sempre genérica** ("Celular ou senha incorretos"). Nunca revelar se o telefone está cadastrado — isso protege a privacidade dos seus clientes.

**RN-08** · O primeiro acesso **obriga**: trocar a senha + aceitar Termos e Política de Privacidade. O opt-in de marketing é **separado e opcional** — juntar os dois num checkbox só invalida o consentimento.

**RN-09** · O cliente **não** troca o próprio telefone no app. Alteração só pelo painel, com auditoria — o telefone é a chave de identidade e a carteira está amarrada a ela.

---

## B. Aplicativo (RN-10 a RN-14)

**RN-10** · Nenhum botão clicável leva a uma ação que vai falhar. Recurso indisponível = **botão cinza desabilitado + motivo escrito ao lado**.

**RN-11** · Bloco sem conteúdo **não renderiza**. Nada de "Nenhuma promoção no momento" ocupando meia tela.

**RN-12** · O cardápio dos próximos 3 dias e os dados do perfil ficam em cache offline. O app precisa abrir e ser útil na fila, com internet ruim.

**RN-13** · Cardápio só aparece publicado. O de amanhã fica visível a partir das 18h de hoje (configurável) — cozinha ainda pode ajustar produção.

**RN-14** · Preço/kg de fim de semana e feriado é **campo próprio**, exibido com clareza. Cliente descobrir preço diferente na balança é reclamação garantida.

---

## C. Carteira, crédito e cashback (RN-20 a RN-29)

### RN-20 · A conta do cashback R$ 300 → R$ 30 (memória de cálculo)

| Item | Valor |
|---|---|
| Cliente paga | R$ 300,00 |
| Cliente recebe em crédito | R$ 330,00 |
| **Desconto efetivo** | 30 ÷ 330 = **9,09%** (não 10% — o bônus dilui sobre o total consumido) |
| CMV desse consumo (37%) | R$ 122,10 |
| Margem de contribuição **sem** a promoção | R$ 330 − R$ 122,10 = **R$ 207,90 (63,0%)** |
| Margem de contribuição **com** a promoção | R$ 300 − R$ 122,10 = **R$ 177,90 (53,9% do consumo)** |
| Perda de margem | **R$ 30,00 = −14,4%** |
| **Volume de equilíbrio** | 207,90 ÷ 177,90 = **1,17 → o cliente precisa consumir 17% a mais** |

**Veredito**: a promoção **se justifica**, mas por objetivos secundários explícitos, não pelo desconto em si:
1. **Caixa antecipado** — R$ 300 hoje, em vez de R$ 35 por visita ao longo de 9 visitas.
2. **Recorrência travada** — crédito na conta é motivo de voltar; é o efeito real que paga os 9%.
3. **Ticket maior** — cliente com saldo pega bebida e sobremesa com muito menos atrito (e é aí, no por quilo, que a margem se recompõe).
4. **Breakage** — parte do bônus vence sem uso.

E só é sustentável com as travas RN-21 a RN-27 ligadas. Sem elas, é desconto permanente de 9% na casa inteira.

**RN-21** · A carteira tem **dois saldos separados**: `pago` e `bônus`. Nunca um número só.

**RN-22** · **Crédito pago não expira.** É dinheiro do cliente. Fazer dinheiro pago do consumidor expirar é problema jurídico e de reputação — não vale o ganho.

**RN-23** · **Bônus expira em 90 dias** (configurável por faixa). Está escrito na tela de recarga, no extrato e no card de saldo, com aviso automático 15 dias antes.

**RN-24** · Ordem de consumo do saldo: **bônus primeiro** (o que vence antes, FIFO), depois o pago. Nunca o contrário.

**RN-25** · Toda faixa de recarga tem **teto mensal de bônus emitido**. Atingido o teto, a faixa sai do ar automaticamente e você é avisado no painel. Nenhum degrau pode passar de **12% de desconto efetivo** sem sua confirmação escrita.

Escada recomendada:
| Paga | Recebe | Bônus | Desconto efetivo |
|---|---|---|---|
| R$ 150 | R$ 160 | R$ 10 | 6,25% |
| R$ 300 | R$ 330 | R$ 30 | **9,09%** |
| R$ 500 | R$ 560 | R$ 60 | 10,71% |

**RN-26** · Crédito só entra na carteira com **confirmação do provedor de pagamento**. Webhook idempotente + sync de fallback quando o app volta da tela de pagamento. Nunca creditar por otimismo de interface.

**RN-27** · Saldo **não é transferível, não é sacável em dinheiro** e vale só para consumo na casa. Escrito nos Termos e visível na Carteira. Devolução do saldo **pago** em caso de encerramento segue a política publicada.

**RN-28** · O saldo em carteira é **passivo**: dinheiro recebido que ainda é comida a entregar. O painel exibe esse número o tempo todo. Ignorá-lo é confundir caixa com lucro — o erro clássico de programa de crédito antecipado.

**RN-29** · Toda movimentação passa pelo módulo único `wallet-ledger.ts`, com lock por cliente e chave de idempotência. Nenhuma rota escreve saldo direto. Correção é **estorno**, nunca edição.

---

## D. Promoções (RN-30 a RN-39)

**RN-30** · Toda promoção nasce com **4 campos obrigatórios**: objetivo declarado, custo de margem calculado, meta numérica e data de encerramento. Faltando qualquer um, o sistema **não publica**. Promoção sem isso é queima de caixa.

**RN-31** · **Promoção permanente vira preço** — e preço rebaixado. Data-fim é obrigatória; renovar é decisão consciente, não inércia.

**RN-32** · O sistema calcula e mostra o **volume de equilíbrio** antes da publicação:
```
Volume de equilíbrio = margem de contribuição atual ÷ margem de contribuição promocional
```
*Exemplo real — 15% de desconto no preço/kg:* preço R$ 79,90 → R$ 67,92; custo R$ 29,56/kg. MC cai de R$ 50,34 (63%) para R$ 38,36 (56,5%) por kg → **precisa de +31% de volume** naquele dia só para empatar. Se a promoção rodar num dia que já é cheio, ela **perde dinheiro com certeza matemática**.

**RN-33** · Margem de contribuição promocional **≤ 0 bloqueia a publicação**. Exceção única: marcar explicitamente como "isca declarada", com teto de resgates e justificativa escrita — que fica registrada na promoção.

**RN-34** · Promoções **não acumulam** entre si por padrão (`stackable = false`), e promoção **não acumula com o bônus de recarga** salvo marcação expressa. Empilhamento involuntário é como um desconto de 9% vira 25% sem ninguém perceber.

**RN-35** · O cliente só vê promoção que ele **pode usar** naquele momento. Fora do segmento, fora do dia, esgotada ou já usada → não aparece na lista dele (ou aparece com o motivo visível, nunca com botão ativo).

**RN-36** · Um cupom aberto por promoção por cliente. Clicar de novo mostra o mesmo cupom.

**RN-37** · Promoção de dia/horário fraco **não pode se estender ao dia forte** — o sistema avisa quando os dias selecionados incluem os 2 dias de maior movimento dos últimos 60 dias. Estender canibaliza venda cheia.

**RN-38** · O **custo de divulgação entra na conta** do equilíbrio (impulsionamento, impressão, panfleto).

**RN-39** · Toda promoção encerrada gera **relatório automático**: resgates, meta × realizado, ticket médio de quem usou × quem não usou, faturamento comparado com as mesmas 4 semanas anteriores e efeito nos dias vizinhos (canibalização). Promoção sem medição não pode ser repetida no ano seguinte "porque pareceu que funcionou".

---

## E. Mensalidade / plano de refeições (RN-40 a RN-45)

### RN-41 · A conta do plano (memória de cálculo)

Premissas: assinante consome **520 g** (média 450 g + 15% de autosseleção — quem assina é quem come com frequência), preço/kg R$ 79,90, custo/kg R$ 29,56.

| Item | Avulso (450 g) | Plano 22 refeições |
|---|---|---|
| Preço cheio da refeição | R$ 35,96 | R$ 41,55 (520 g) |
| Preço cheio do pacote | — | R$ 914,10 |
| Preço do plano (−12%) | — | **R$ 799,00** |
| Receita por refeição | R$ 35,96 | R$ 36,32 |
| Custo da refeição | R$ 13,30 | R$ 15,37 |
| **Margem por refeição** | **R$ 22,66 (63%)** | **R$ 20,95 (57,7%)** |

**Ponto de equilíbrio de frequência**: um cliente que vinha **12×/mês** gerava R$ 271,92 de margem. No plano ele precisa vir **13×** para empatar — e se usar as 22, gera **R$ 460,90**. 

**O risco está do outro lado**: quem **já vinha 22×/mês** gerava R$ 498,52 e no plano passa a gerar R$ 460,90 — **R$ 37,62/mês de prejuízo**, todo mês, no seu melhor cliente.

**Conclusão operacional**: o plano é uma ferramenta de **frequência**, não de fidelização do cliente diário. Ofertar a quem vem de 8 a 14 vezes por mês. Para quem já vem quase todo dia, ofereça outra coisa (bebida inclusa, prioridade, mimo) — nunca desconto no que ele já compra.

**RN-40** · Todo plano tem **teto de gramas por refeição** (`max_grams_per_meal`, sugestão 550 g). Acima disso, o excedente é pesado e cobrado na balança. "Coma à vontade por preço fixo" **destrói o modelo por quilo** — é a regra mais importante desta seção.

**RN-42** · Limite de **1 refeição por dia** e validade restrita a dias/horários definidos. Fim de semana e feriado (cardápio mais caro) ficam **fora** do plano por padrão.

**RN-43** · Refeição não usada **não acumula** para o mês seguinte (`allow_carryover = false`). Acúmulo cria passivo crescente e pico de consumo imprevisível.

**RN-44** · O plano é **pessoal e intransferível**, validado por identificação no caixa.

**RN-45** · Ao assinar, o sistema **congela a frequência dos 90 dias anteriores** (`baseline_visits_90d`). Todo mês o painel mostra **frequência antes × depois** e a **margem individual do assinante**. Dois meses seguidos de margem negativa → alerta para revisar ou encerrar o plano daquele cliente. Sem essa medição, o plano vira desconto puro para o cliente que já era fiel.

---

## F. Bonificação (RN-46 a RN-49)

**RN-46** · Toda bonificação exige **motivo escrito**. Sem motivo, não grava.

**RN-47** · Tetos: `operator` **não concede nada**; `manager` até R$ 50 por concessão; acima disso exige aprovação do `owner`. Teto mensal global sugerido: **1,5% do faturamento do mês anterior**.

**RN-48** · Teto composto: **bônus de recarga + descontos de promoção + bonificações ≤ 4% do faturamento do mês** (configurável). Passou de 80%, alerta no painel; passou de 100%, novas concessões exigem sua confirmação. É o freio que impede a soma de "pequenas gentilezas" de comer a margem da casa.

**RN-49** · Bonificação vira crédito na carteira com validade — nunca dinheiro. Tudo em auditoria com autor, valor, motivo e data.

---

## G. Consumo (RN-50 a RN-55)

**RN-50** · Uma visita = uma passagem no caixa, com `external_ref` única quando vem do PDV. Reimportar o mesmo arquivo **não duplica**.

**RN-51** · Visita sem cliente identificado **não é atribuída por aproximação**. Fica anônima, contando para o faturamento e não para a ficha de ninguém.

**RN-52** · O `price_per_kg_cents` é **congelado na visita**. Reajuste futuro não pode reescrever o passado do extrato do cliente.

**RN-53** · Correção é sempre **estorno visível + novo lançamento**. Valor não some do extrato do cliente sem explicação.

**RN-54** · Débito na carteira acontece **dentro da mesma transação** do registro da visita. Ou grava os dois, ou não grava nenhum.

**RN-55** · O cliente sempre tem caminho para contestar (botão "Encontrei um erro" no extrato, que abre o WhatsApp com os dados preenchidos).

---

## H. Permissões (RN-56 a RN-59)

**RN-56** · Existe **um único `owner`**, que não pode ser excluído nem rebaixado.

**RN-57** · Backend é a fonte de verdade das permissões. A tela apenas esconde o que o backend já bloqueia — esconder no front sem bloquear na API não é permissão, é decoração.

**RN-58** · `operator` **nunca** recebe edição em carteira, bonificações, planos ou usuários, mesmo que a matriz seja marcada por engano.

**RN-59** · Desativar usuário **encerra as sessões dele imediatamente**. Toda alteração de permissão é auditada.

---

## I. Comunicação (RN-60 a RN-64)

**RN-60** · Campanha de marketing só vai para quem tem **opt-in registrado**. O painel mostra quantos serão pulados, e por quê.

**RN-61** · Limite de **2 mensagens de marketing por cliente por semana**. Transacionais (senha, recarga confirmada, resumo de consumo, vencimento de bônus) não entram na conta.

**RN-62** · WhatsApp em massa **só** por API oficial com templates aprovados e opt-in. Enquanto isso, modo assistido (`wa.me`). Disparo em massa por número pessoal derruba o número — e o número do restaurante é ativo do negócio.

**RN-63** · Desligar "promoções" no app **é revogação de consentimento** e vale para todos os canais de marketing, inclusive WhatsApp e e-mail.

**RN-64** · Exclusão de conta = anonimização (nome, telefone, CPF, e-mail), preservando o histórico financeiro anonimizado por obrigação fiscal. Saldo em bônus se perde (avisado antes); saldo pago segue a política de devolução publicada.

---

## J. Integridade técnica (RN-65 a RN-69)

**RN-65** · Dinheiro em centavos inteiros; peso em gramas inteiras. Nenhum float em cálculo financeiro.

**RN-66** · Toda rota financeira é **idempotente** e roda sob `pg_advisory_xact_lock(customer_id)`. Clique duplo não credita duas vezes.

**RN-67** · O saldo é reconciliado a partir do razão no boot e diariamente. Divergência vira alerta vermelho no painel — não é corrigida silenciosamente.

**RN-68** · A API **abre a porta primeiro**, e só depois roda heal/jobs, num bloco que loga e não derruba o processo (mesma lição do R14 do marketplace: manutenção travada nunca pode impedir o app de subir).

**RN-69** · Nenhuma senha, token ou CPF completo em log, Sentry ou mensagem de erro.

---

## K. Fidelidade — Fase 4 (RN-70 a RN-72)

**RN-70** · Programa de selos só entra **depois** que a Fase 3 estiver medindo consumo real. Fidelidade sem dado de consumo é chute.

**RN-71** · "A cada 10 almoços, o 11º grátis" é um desconto diluído de ~9% — entra na mesma conta de teto do RN-48, junto com cashback e bonificações. Não é "de graça" só porque não sai dinheiro do caixa.

**RN-72** · Fidelidade, plano e cashback **não se somam sem regra explícita**. Cliente com plano + cashback + selo pode chegar a 25% de desconto acumulado sem que ninguém tenha decidido isso. O sistema calcula o desconto total efetivo por cliente e mostra no painel os 20 maiores.
