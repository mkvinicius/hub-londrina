import {
  pgTable,
  serial,
  integer,
  text,
  numeric,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { businessesTable } from "./businesses";

export const productsTable = pgTable(
  "products",
  {
    id: serial("id").primaryKey(),
    businessId: integer("business_id")
      .notNull()
      .references(() => businessesTable.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    price: numeric("price"),
    mediaUrl: text("media_url"),
    mediaType: text("media_type"),
    whatsappLink: text("whatsapp_link"),
    isActive: boolean("is_active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("products_business_id_idx").on(t.businessId)],
);

export type InsertProduct = typeof productsTable.$inferInsert;
export type Product = typeof productsTable.$inferSelect;
