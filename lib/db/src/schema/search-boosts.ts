import {
  pgTable,
  serial,
  integer,
  text,
  numeric,
  timestamp,
  index,
  pgEnum,
} from "drizzle-orm/pg-core";
import { businessesTable } from "./businesses";
import { zonesTable } from "./zones";

export const boostTypeEnum = pgEnum("boost_type", ["monthly", "avulso"]);
export const boostContextEnum = pgEnum("boost_context", [
  "search",
  "zone",
  "home_search",
  "category",
]);

export const searchBoostsTable = pgTable(
  "search_boosts",
  {
    id: serial("id").primaryKey(),
    businessId: integer("business_id")
      .references(() => businessesTable.id)
      .notNull(),
    monthlyBid: numeric("monthly_bid").notNull(),
    position: integer("position"),
    boostType: boostTypeEnum("boost_type").notNull(),
    boostContext: boostContextEnum("boost_context").notNull().default("search"),
    zone: text("zone").references(() => zonesTable.slug),
    status: text("status").notNull().default("active"),
    durationDays: integer("duration_days"),
    price: numeric("price"),
    startsAt: timestamp("starts_at").defaultNow(),
    expiresAt: timestamp("expires_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("search_boosts_status_idx").on(table.status),
    index("search_boosts_expires_at_idx").on(table.expiresAt),
    index("search_boosts_context_idx").on(table.boostContext),
    index("search_boosts_zone_idx").on(table.zone),
  ]
);

export type InsertSearchBoost = typeof searchBoostsTable.$inferInsert;
export type SearchBoost = typeof searchBoostsTable.$inferSelect;
