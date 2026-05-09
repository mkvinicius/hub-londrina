import {
  pgTable,
  serial,
  integer,
  text,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { businessesTable } from "./businesses";
import { productsTable } from "./products";

// R11 — Boost "Vitrine Destaque"
// 4 slots fixos no carrossel da home, R$ 49/mês recorrente, exclusivo Premium.
// status:
//   active     → slot fixo garantido
//   pending    → checkout iniciado, ainda não confirmado pelo Stripe
//   waitlist   → 4 slots já ocupados, espera vaga
//   cancelled  → cancelado pelo lojista (subscription deleted)
export const vitrineBoostsTable = pgTable(
  "vitrine_boosts",
  {
    id: serial("id").primaryKey(),
    businessId: integer("business_id")
      .notNull()
      .references(() => businessesTable.id, { onDelete: "cascade" }),
    productId: integer("product_id")
      .references(() => productsTable.id, { onDelete: "set null" }),
    status: text("status").notNull().default("pending"),
    stripeSessionId: text("stripe_session_id").unique(),
    stripeSubscriptionId: text("stripe_subscription_id").unique(),
    startsAt: timestamp("starts_at"),
    endsAt: timestamp("ends_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("vitrine_boosts_status_idx").on(t.status),
    index("vitrine_boosts_business_id_idx").on(t.businessId),
    // Garante que um lojista nunca tenha 2 boosts em pending/active/waitlist
    // simultâneos. Cobre toda a janela de "ocupação" para impedir duplicação
    // por checkouts concorrentes (race entre dois cliques rápidos).
    uniqueIndex("vitrine_boosts_one_open_per_business")
      .on(t.businessId)
      .where(sql`status IN ('pending', 'active', 'waitlist')`),
  ],
);

export type InsertVitrineBoost = typeof vitrineBoostsTable.$inferInsert;
export type VitrineBoost = typeof vitrineBoostsTable.$inferSelect;
