# 01 · Modelo de dados (PostgreSQL + Drizzle ORM)

Todas as tabelas usam prefixo `resto_`, chave primária `uuid`, e `created_at`/`updated_at` com timezone.
Arquivos em `lib/db/src/schema/resto/`.

## Convenções invioláveis

| # | Convenção | Motivo |
|---|---|---|
| C1 | **Dinheiro é `integer` em centavos** (`bigint` para acumulados). Nunca `float`/`numeric` no aplicativo | Ponto flutuante em dinheiro gera divergência de centavo que ninguém consegue explicar depois |
| C2 | **Peso é `integer` em gramas** | Mesma razão |
| C3 | Toda tabela financeira tem `idempotency_key TEXT UNIQUE` | Clique duplo, retry de webhook e reenvio não podem duplicar dinheiro |
| C4 | Saldo **nunca** é `UPDATE` solto — é derivado do razão e conferido | Razão é a verdade; saldo é cache |
| C5 | Datas de referência de negócio (`business_date`) separadas de `created_at` | Um lançamento registrado às 00h10 pode pertencer ao dia anterior de operação |
| C6 | Exclusão é lógica (`deleted_at`), nunca física, em cliente e lançamento | Auditoria e obrigação fiscal |

---

## 1. Pessoas e acesso

### `resto_customers` — o cliente do restaurante
| Coluna | Tipo | Regra |
|---|---|---|
| `id` | uuid PK | |
| `name` | text NOT NULL | |
| `phone` | text **UNIQUE** NOT NULL | Só dígitos com DDD (`5543...`). É o login |
| `cpf` | text UNIQUE NULL | Opcional. Mascarado para sub-usuários |
| `email` | text NULL | |
| `birth_date` | date NULL | Alimenta campanha de aniversário |
| `password_hash` | text NOT NULL | bcrypt cost 12 |
| `must_change_password` | boolean DEFAULT true | Trava o app até trocar |
| `temp_password_expires_at` | timestamptz NULL | 7 dias |
| `status` | enum(`active`,`blocked`,`deleted`) DEFAULT `active` | |
| `photo_url` | text NULL | |
| `tags` | text[] DEFAULT '{}' | Marcação livre do painel ("vip", "empresa X") |
| `notes` | text NULL | Anotação interna — **não** visível ao cliente |
| `first_login_at` | timestamptz NULL | |
| `last_seen_at` | timestamptz NULL | |
| `created_by_staff_id` | uuid FK staff | Quem cadastrou |
| `deleted_at` | timestamptz NULL | |

Índices: `phone`, `status`, `tags` (GIN), `birth_date` (mês/dia).

### `resto_staff_users` — você e seus sub-usuários
| Coluna | Tipo | Regra |
|---|---|---|
| `id` | uuid PK | |
| `name`, `email` (UNIQUE), `phone` | text | |
| `password_hash` | text | bcrypt cost 12 |
| `role` | enum(`owner`,`manager`,`operator`) | `owner` é único e indelével |
| `is_active` | boolean DEFAULT true | |
| `totp_secret` | text NULL | 2FA — obrigatório para `owner` a partir da Fase 2 |
| `last_login_at` | timestamptz | |

### `resto_staff_permissions` — matriz de permissão do sub-usuário
| Coluna | Tipo |
|---|---|
| `staff_user_id` | uuid FK |
| `module` | enum(`dashboard`,`clientes`,`consumo`,`carteira`,`promocoes`,`planos`,`bonificacoes`,`campanhas`,`cardapio`,`relatorios`,`config`,`usuarios`) |
| `can_view` / `can_edit` | boolean |

PK composta (`staff_user_id`,`module`). **`owner` ignora a matriz** (acesso total). Nenhum `operator` recebe `can_edit` em `carteira`, `bonificacoes` ou `usuarios` sem marcação explícita sua (RN-58).

### `resto_consents` — LGPD
`id` · `customer_id` · `type` (`terms`,`privacy`,`marketing_push`,`marketing_whatsapp`) · `version` · `granted` (bool) · `ip` · `user_agent` · `created_at`
> Histórico append-only: revogação é uma **nova linha** com `granted=false`, nunca update.

### `resto_push_subscriptions`
`id` · `customer_id` · `platform` (`web`,`android`,`ios`) · `token` · `endpoint` · `keys` (jsonb) · `is_active` · `last_used_at`

---

## 2. Carteira, crédito e cashback

### `resto_wallets` — saldo (cache do razão)
| Coluna | Tipo | Regra |
|---|---|---|
| `customer_id` | uuid PK FK | 1 carteira por cliente |
| `balance_paid_cents` | bigint DEFAULT 0 | Dinheiro que o cliente **pagou**. **Não expira** (RN-22) |
| `balance_bonus_cents` | bigint DEFAULT 0 | Bônus/cashback concedido. **Expira** (RN-23) |
| `lifetime_topup_cents` / `lifetime_bonus_cents` / `lifetime_spent_cents` | bigint | Acumulados para o painel |
| `updated_at` | timestamptz | |

> **CHECK**: `balance_paid_cents >= 0 AND balance_bonus_cents >= 0`. Saldo negativo é bug, não estado.

### `resto_wallet_transactions` — o razão (append-only)
| Coluna | Tipo | Regra |
|---|---|---|
| `id` | uuid PK | |
| `customer_id` | uuid FK | |
| `type` | enum(`topup`,`bonus`,`debit`,`refund`,`expire`,`adjust`) | |
| `bucket` | enum(`paid`,`bonus`) | Qual saldo moveu |
| `amount_cents` | bigint | Positivo credita, negativo debita |
| `balance_paid_after` / `balance_bonus_after` | bigint | Foto do saldo após o lançamento |
| `source` | enum(`pix`,`cash`,`card`,`staff`,`promotion`,`subscription`,`system`,`consumption`) | |
| `reference_type` / `reference_id` | text / uuid | Liga ao pedido, promoção, visita, cobrança |
| `expires_at` | timestamptz NULL | Só para `bonus` |
| `staff_user_id` | uuid NULL | Quem executou, se manual |
| `reason` | text | **Obrigatório** em `bonus`, `adjust`, `refund` |
| `idempotency_key` | text UNIQUE | |
| `created_at` | timestamptz | |

> **Sem UPDATE e sem DELETE nesta tabela.** Correção = lançamento de estorno (`refund`/`adjust`) referenciando o original.

### `resto_topup_rules` — as faixas de recarga com bônus
| Coluna | Tipo | Exemplo |
|---|---|---|
| `id` | uuid PK | |
| `label` | text | "Recarregue R$ 300 e ganhe R$ 30" |
| `min_amount_cents` | integer | 30000 |
| `bonus_type` | enum(`fixed`,`percent`) | `fixed` |
| `bonus_value` | integer | 3000 (= R$ 30) |
| `bonus_expires_days` | integer DEFAULT 90 | Validade do **bônus** |
| `monthly_issue_cap_cents` | bigint NULL | Teto de bônus emitido no mês nesta faixa (RN-25) |
| `is_active` / `starts_at` / `ends_at` | | |
| `effective_discount_pct` | numeric **gerado/calculado** | `bonus / (min + bonus)` — mostrado ao dono antes de salvar |

---

## 3. Promoções

### `resto_promotions`
| Coluna | Tipo | Regra |
|---|---|---|
| `id` | uuid PK | |
| `title` / `description` / `image_url` | | |
| `objective` | enum(`trafego_dia_fraco`,`trafego_horario_fraco`,`ticket_medio`,`recorrencia`,`aquisicao`,`giro_estoque`) | **NOT NULL** (RN-30) |
| `mechanic` | enum(`desconto_percentual`,`desconto_valor`,`brinde`,`combo`,`preco_kg_promocional`,`cashback_extra`,`refeicao_gratis`) | |
| `discount_type` / `discount_value` | | |
| `applies_to` | enum(`buffet`,`bebida`,`sobremesa`,`total`) | Onde incide |
| `segment_id` | uuid NULL FK | Público-alvo; NULL = todos |
| `days_of_week` | smallint[] | `{2,3}` = ter/qua |
| `time_start` / `time_end` | time NULL | Promoção de horário |
| `starts_at` / `ends_at` | timestamptz **NOT NULL** | Sem fim = vira preço (RN-31) |
| `goal_metric` | enum(`clientes_no_periodo`,`ticket_medio`,`resgates`,`faturamento`) NOT NULL | |
| `goal_value` | numeric NOT NULL | |
| `max_redemptions` | integer NULL | Teto global |
| `max_per_customer` | integer DEFAULT 1 | |
| `stackable` | boolean DEFAULT **false** | Nunca acumula por padrão (RN-34) |
| `margin_check` | jsonb NOT NULL | Foto da trava calculada: preço/kg, custo/kg, MC atual, MC promocional, volume de equilíbrio, custo de mídia |
| `status` | enum(`draft`,`scheduled`,`active`,`paused`,`ended`) | |
| `created_by` / `approved_by` | uuid FK staff | |

### `resto_promotion_redemptions`
`id` · `promotion_id` · `customer_id` · `code` (curto, único, ex. `TER-8F3K`) · `status` (`issued`,`used`,`expired`,`cancelled`) · `issued_at` · `used_at` · `used_by_staff_id` · `visit_id` NULL · `value_cents` (desconto real concedido) · UNIQUE(`promotion_id`,`customer_id`,`code`)

---

## 4. Planos (mensalidade) e bonificação

### `resto_plans`
| Coluna | Tipo | Regra |
|---|---|---|
| `name` / `description` | | "Plano Almoço 22" |
| `price_cents` | integer | |
| `meals_included` | integer | 22 |
| `max_grams_per_meal` | integer NOT NULL | **Trava obrigatória** (RN-42). Excedente pesa na balança |
| `valid_days` | smallint[] | `{1,2,3,4,5}` |
| `valid_time_start` / `valid_time_end` | time | |
| `includes_drink` | boolean DEFAULT false | |
| `allow_carryover` | boolean DEFAULT **false** | Refeição não usada não acumula (RN-44) |
| `is_active` | boolean | |

### `resto_subscriptions`
`id` · `customer_id` · `plan_id` · `status` (`active`,`past_due`,`frozen`,`cancelled`) · `started_at` · `current_period_start`/`end` · `meals_used` · `meals_overage` · `next_charge_at` · `payment_method` · `frozen_until` · `cancel_reason` · `baseline_visits_90d` (**frequência dos 90 dias anteriores à assinatura** — indispensável para medir se o plano aumentou a frequência ou só deu desconto a quem já vinha, RN-45)

### `resto_bonuses` — bonificação discricionária
`id` · `customer_id` · `type` (`credito`,`desconto`,`refeicao_gratis`,`brinde`) · `value_cents` · `reason` **NOT NULL** · `granted_by` · `approved_by` NULL · `status` (`pending_approval`,`granted`,`revoked`,`expired`) · `expires_at` · `wallet_transaction_id` NULL · `created_at`

---

## 5. Consumo (Fase 3)

### `resto_visits` — uma visita = uma passagem no caixa
| Coluna | Tipo | Regra |
|---|---|---|
| `id` | uuid PK | |
| `customer_id` | uuid FK NULL | NULL = venda não identificada (mantida para conciliação de caixa) |
| `visited_at` | timestamptz | |
| `business_date` | date | Dia operacional |
| `meal_period` | enum(`almoco`,`jantar`) | |
| `weight_grams` | integer NULL | Peso do prato |
| `price_per_kg_cents` | integer NULL | Preço/kg **vigente naquele dia** — congelado na visita |
| `buffet_cents` | integer | |
| `extras_cents` | integer | Bebida, sobremesa, à parte |
| `discount_cents` | integer DEFAULT 0 | |
| `total_cents` | integer | |
| `wallet_debit_cents` | integer DEFAULT 0 | Quanto saiu da carteira |
| `payment_method` | enum(`dinheiro`,`debito`,`credito`,`pix`,`carteira`,`plano`) | |
| `promotion_redemption_id` | uuid NULL | |
| `subscription_id` | uuid NULL | Se foi refeição do plano |
| `source` | enum(`pdv`,`manual`,`import`) | |
| `external_ref` | text **UNIQUE** NULL | Chave do PDV — impede importar 2× |
| `created_by_staff_id` | uuid NULL | |

Índices: (`customer_id`,`business_date`), `business_date`, `external_ref`.

### `resto_visit_items` (opcional, se o PDV detalhar)
`id` · `visit_id` · `name` · `category` · `qty` · `unit_price_cents` · `total_cents`

### `resto_daily_metrics` — foto diária consolidada (job noturno)
`business_date` PK · `customers_count` · `revenue_cents` · `buffet_revenue_cents` · `extras_revenue_cents` · `avg_ticket_cents` · `avg_grams` · `price_per_kg_cents` · `wallet_debit_cents` · `bonus_issued_cents` · `discount_cents`
> Tabela que alimenta o painel de indicadores do por quilo sem varrer milhões de linhas.

---

## 6. Conteúdo

### `resto_menu_days` — cardápio do dia
`id` · `date` (UNIQUE com `meal_period`) · `meal_period` · `price_per_kg_cents` · `headline` · `notes` · `is_published` · `published_at`

### `resto_menu_items`
`id` · `menu_day_id` · `name` · `description` · `category` (`salada`,`guarnicao`,`massa`,`proteina`,`sobremesa`,`bebida`) · `photo_url` · `is_highlight` · `dietary_tags` (`vegano`,`vegetariano`,`sem_gluten`,`sem_lactose`) · `sort_order`

### `resto_menu_templates` — cardápio-padrão por dia da semana
`id` · `day_of_week` · `items` (jsonb) — o painel gera a semana em 1 clique a partir daqui.

### `resto_posts` — notícias e avisos
`id` · `title` · `body` (rich text sanitizado) · `image_url` · `type` (`noticia`,`aviso`,`evento`) · `is_pinned` · `published_at` · `expires_at` · `created_by`

---

## 7. Comunicação e segmentação

### `resto_segments`
`id` · `name` · `rules` (jsonb) · `is_dynamic` (bool) · `cached_count` · `cached_at`

Exemplo de `rules`:
```json
{ "all": [
  { "field": "visits_last_30d", "op": ">=", "value": 4 },
  { "field": "last_visit_days_ago", "op": "<=", "value": 15 },
  { "field": "wallet_balance_cents", "op": ">", "value": 0 }
]}
```
Campos disponíveis: `visits_last_30d/90d`, `last_visit_days_ago`, `avg_ticket_cents`, `avg_grams`, `lifetime_spent_cents`, `wallet_balance_cents`, `has_subscription`, `birthday_month`, `tags`, `signup_days_ago`, `never_visited`.

### `resto_campaigns`
`id` · `title` · `body` · `channel` (`push`,`whatsapp`,`inbox`,`email`) · `segment_id` · `promotion_id` NULL · `scheduled_at` · `sent_at` · `status` (`draft`,`scheduled`,`sending`,`sent`,`cancelled`) · `stats` (jsonb: enviados/entregues/lidos/cliques/resgates) · `created_by`

### `resto_campaign_recipients`
`id` · `campaign_id` · `customer_id` · `status` (`queued`,`sent`,`delivered`,`read`,`failed`,`skipped_no_optin`) · `sent_at` · `read_at` · `error` · UNIQUE(`campaign_id`,`customer_id`)

### `resto_inbox_messages` — mensagem 1-a-1 dentro do app
`id` · `customer_id` · `campaign_id` NULL · `title` · `body` · `cta_label` · `cta_route` · `read_at` · `created_at`

---

## 8. Operação e auditoria

### `resto_audit_log`
`id` · `staff_user_id` · `action` (ex.: `wallet.credit`, `bonus.grant`, `promotion.publish`, `customer.password_reset`) · `entity` · `entity_id` · `before` (jsonb) · `after` (jsonb) · `ip` · `created_at`
> **Toda** rota do painel que escreve dinheiro, permissão ou dado pessoal grava aqui. Sem exceção.

### `resto_settings` — configuração viva (chave/valor)
`key` PK · `value` (jsonb) · `updated_by` · `updated_at`
Chaves iniciais: `PRICE_PER_KG_CENTS`, `PRICE_PER_KG_WEEKEND_CENTS`, `TARGET_FOOD_COST_PCT`, `AVG_COST_PER_KG_CENTS`, `OPENING_HOURS`, `BONUS_MONTHLY_CAP_CENTS`, `DISCOUNT_MONTHLY_CAP_PCT`, `TERMS_VERSION`, `WHATSAPP_MODE`, `RESTAURANT_NAME`, `CONTACT_PHONE`.

> `AVG_COST_PER_KG_CENTS` e `TARGET_FOOD_COST_PCT` **alimentam a trava de margem das promoções**. Sem eles preenchidos, o sistema não publica promoção (RN-33).

### `resto_job_runs`
`id` · `job` · `started_at` · `finished_at` · `status` · `stats` (jsonb) · `error`

Jobs previstos: `expireBonusCredits` (diário), `consolidateDailyMetrics` (noturno), `chargeSubscriptions` (diário), `endExpiredPromotions` (horário), `sendScheduledCampaigns` (5 min), `healWalletBalances` (boot + diário).

---

## 9. Heal de inicialização (espelhando o padrão do `api-server`)

`resto-api/src/lib/startup-heal.ts`, rodando **depois** do `app.listen` (mesma lição do R14 do `RULES.md` — a porta abre primeiro, manutenção depois, e falha de manutenção nunca derruba o servidor):

| Job | O que reconcilia |
|---|---|
| `healWalletBalances()` | Recalcula `resto_wallets` a partir do razão e loga qualquer divergência (não deve haver nenhuma; se houver, é bug com nome e sobrenome) |
| `healExpiredBonuses()` | Zera bônus com `expires_at` vencido que ficaram no saldo |
| `healPromotionStatus()` | Move para `ended` promoções com `ends_at` no passado |
| `healSubscriptionPeriods()` | Corrige períodos vencidos sem cobrança processada |
| `healOrphanRedemptions()` | Expira cupons emitidos de promoção já encerrada |
