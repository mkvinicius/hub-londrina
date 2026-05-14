import {
  pgTable,
  serial,
  integer,
  text,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { businessesTable } from "./businesses";

// tier:
//   master    → patrocinador master, exibido em grid grande no topo
//   apoiador  → apoiador, exibido em carrossel infinito menor
export const partnersTable = pgTable("partners", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  tier: text("tier").notNull().default("apoiador"),
  logoUrl: text("logo_url").notNull(),
  businessId: integer("business_id").references(() => businessesTable.id, { onDelete: "set null" }),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [
  index("partners_active_tier_idx").on(t.isActive, t.tier),
  index("partners_sort_idx").on(t.tier, t.sortOrder),
]);

export type InsertPartner = typeof partnersTable.$inferInsert;
export type Partner = typeof partnersTable.$inferSelect;
