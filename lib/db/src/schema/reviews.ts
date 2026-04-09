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

export const reviewsTable = pgTable(
  "reviews",
  {
    id: serial("id").primaryKey(),
    businessId: integer("business_id")
      .notNull()
      .references(() => businessesTable.id, { onDelete: "cascade" }),
    author: text("author").notNull(),
    rating: integer("rating").notNull(),
    text: text("text").notNull().default(""),
    visitorId: text("visitor_id"),
    verified: boolean("verified").notNull().default(false),
    ownerResponse: text("owner_response"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("reviews_business_id_idx").on(t.businessId)],
);

export type InsertReview = typeof reviewsTable.$inferInsert;
export type Review = typeof reviewsTable.$inferSelect;
