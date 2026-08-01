# 06 · Decisões pendentes (o que depende de você antes de codar)

Nada aqui impede começar a Fase 0. Mas os itens **🔴 bloqueantes** precisam de resposta antes da semana indicada.

---

## 🔴 Bloqueantes da Fase 0 (semana 1)

| # | Decisão | Opções | Recomendação |
|---|---|---|---|
| D1 | **Nome e domínio do app** | ex.: `app.seurestaurante.com.br` | Subdomínio próprio, curto, fácil de ditar no caixa |
| D2 | **Identidade visual** | Usar a do restaurante / criar nova | Usar a existente — reconhecimento imediato |
| D3 | **Onde hospedar** | Mesma infra do Hub Londrina / provedor novo | Mesma infra — custo e operação menores |
| D4 | **Banco compartilhado com o Hub Londrina?** | Mesmo Postgres com prefixo `resto_` / banco separado | Mesmo banco, tabelas isoladas |

---

## 🔴 Bloqueantes da Fase 1

| # | Decisão | Por que importa |
|---|---|---|
| D5 | **Preço/kg atual** (semana e fim de semana) | Aparece no app e alimenta toda conta de margem |
| D6 | **Custo médio do kg produzido** (ou o food cost real da casa) | **Sem esse número a trava de margem das promoções não funciona** (RN-33). Se ainda não é medido, a Fase 1 entra com estimativa marcada como provisória e a medição vira tarefa da mesma sprint |
| D7 | **Quantos clientes na base inicial** e em que formato (planilha? caderno? PDV?) | Define o importador |
| D8 | **Qual será a 1ª promoção** do lançamento | O app precisa nascer com motivo para ser aberto |
| D9 | **Quem serão os sub-usuários** e o que cada um pode ver | Define a matriz de permissões |
| D10 | **Texto de Termos de Uso e Política de Privacidade** | Exigência legal do primeiro acesso. Recomendo revisão por advogado — o modelo do Hub Londrina serve de base |
| D11 | **Número de WhatsApp** que enviará as senhas | Se for o mesmo do atendimento, atenção ao volume |

---

## 🟠 Bloqueantes da Fase 2

| # | Decisão | Nota |
|---|---|---|
| D12 | **PSP do Pix** (Mercado Pago, Asaas, Stripe, banco) | Comparar taxa por transação e qualidade do webhook. Confirmar taxas vigentes na contratação |
| D13 | **Escada de recarga definitiva** | A sugerida está em RN-25; a de R$ 300 → R$ 30 é sua e já está calculada |
| D14 | **Teto mensal de bônus** | Sugestão: 1,5% do faturamento do mês anterior |
| D15 | **Preço e formato do plano mensal** | A conta do plano de 22 refeições está em RN-41. Precisa do consumo médio real da casa |
| D16 | **Conta comercial no WhatsApp Business** verificada | Pré-requisito da Cloud API |

---

## 🟡 Bloqueantes da Fase 3

| # | Decisão | Nota |
|---|---|---|
| D17 | **Qual PDV/sistema de caixa você usa hoje** | Define se a integração é por API ou por planilha |
| D18 | **A balança conversa com o PDV?** | Se sim, o peso vem automático; se não, o operador digita |
| D19 | **Identificação no caixa**: QR do app ou telefone digitado | Recomendo os dois — QR é mais rápido, telefone é o plano B que nunca falha |

---

## Dados que eu preciso de você para calibrar as regras financeiras

Estes números tornam todas as contas dos documentos 04 e 05 **reais** em vez de ilustrativas:

1. Preço/kg cobrado hoje (semana e fim de semana).
2. Faturamento médio mensal e nº de clientes/dia por dia da semana.
3. Consumo médio por cliente em gramas (ou o dado para calcular: faturamento do buffet ÷ preço/kg ÷ clientes).
4. Custo dos insumos do mês e kg produzidos no mesmo período — para o CMV real.
5. Quanto o faturamento fora do buffet (bebidas, sobremesas, à parte) representa hoje.
6. Se existe controle de produção e sobra por cuba.

> Se os itens 3, 4 e 6 ainda não são medidos, isso não trava o app — trava a **precisão das travas de margem**. Nesse caso a recomendação é implantar o controle mínimo em paralelo à Fase 1 (fichas técnicas dos itens que mais pesam, contagem de estoque quinzenal, registro de compras e controle de produção/sobra por cuba). Posso gerar as planilhas prontas em `.xlsx` para a cozinha preencher — é 10 minutos por dia e é o que transforma o painel 360 em ferramenta de decisão em vez de mural de números.
