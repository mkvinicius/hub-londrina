import {
  pgTable,
  serial,
  integer,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { businessesTable } from "./businesses";

export const businessClicksTable = pgTable(
  "business_clicks",
  {
    id: serial("id").primaryKey(),
    businessId: integer("business_id")
      .notNull()
      .references(() => businessesTable.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    visitorId: text("visitor_id"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("business_clicks_business_id_idx").on(t.businessId),
    index("business_clicks_created_at_idx").on(t.createdAt),
  ],
);

export type InsertBusinessClick = typeof businessClicksTable.$inferInsert;
export type BusinessClick = typeof businessClicksTable.$inferSelect;
