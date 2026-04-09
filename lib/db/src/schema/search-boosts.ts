import {
  pgTable,
  serial,
  integer,
  text,
  numeric,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { businessesTable } from "./businesses";

export const searchBoostsTable = pgTable("search_boosts", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id")
    .references(() => businessesTable.id)
    .notNull(),
  monthlyBid: numeric("monthly_bid").notNull(),
  position: integer("position"),
  boostType: text("boost_type").notNull(),
  status: text("status").notNull().default("active"),
  durationDays: integer("duration_days"),
  price: numeric("price"),
  startsAt: timestamp("starts_at").defaultNow(),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  uniqueIndex("search_boosts_business_not_expired").on(table.businessId).where(sql`status != 'expired'`),
]);

export type InsertSearchBoost = typeof searchBoostsTable.$inferInsert;
export type SearchBoost = typeof searchBoostsTable.$inferSelect;
