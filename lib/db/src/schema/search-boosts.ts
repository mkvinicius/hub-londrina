import {
  pgTable,
  serial,
  integer,
  text,
  numeric,
  timestamp,
} from "drizzle-orm/pg-core";
import { businessesTable } from "./businesses";

export const searchBoostsTable = pgTable("search_boosts", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id")
    .references(() => businessesTable.id)
    .notNull()
    .unique(),
  monthlyBid: numeric("monthly_bid").notNull(),
  position: integer("position"),
  boostType: text("boost_type").notNull(),
  status: text("status").notNull().default("active"),
  startsAt: timestamp("starts_at").defaultNow(),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type InsertSearchBoost = typeof searchBoostsTable.$inferInsert;
export type SearchBoost = typeof searchBoostsTable.$inferSelect;
