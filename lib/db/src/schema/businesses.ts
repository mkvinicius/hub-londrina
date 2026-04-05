import {
  pgTable,
  serial,
  integer,
  text,
  real,
  boolean,
  timestamp,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";

export const planTypeEnum = pgEnum("plan_type", [
  "free",
  "destaque",
  "premium",
]);

export const businessesTable = pgTable(
  "businesses",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    categorySlug: text("category_slug").notNull(),
    region: text("region").notNull(),
    description: text("description").notNull(),
    address: text("address").notNull(),
    phone: text("phone"),
    whatsapp: text("whatsapp"),
    rating: real("rating").notNull().default(0),
    reviewsCount: integer("reviews_count").notNull().default(0),
    planType: planTypeEnum("plan_type").notNull().default("free"),
    verified: boolean("verified").notNull().default(false),
    photoUrl: text("photo_url"),
    hours: text("hours"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("businesses_category_slug_idx").on(t.categorySlug),
    index("businesses_region_idx").on(t.region),
    index("businesses_rating_idx").on(t.rating),
  ],
);

export type InsertBusiness = typeof businessesTable.$inferInsert;
export type Business = typeof businessesTable.$inferSelect;
