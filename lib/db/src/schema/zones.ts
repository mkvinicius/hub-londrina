import { pgTable, serial, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const zonesTable = pgTable("zones", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  color: text("color").notNull().default("#f97316"),
  bannerUrl: text("banner_url"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export type Zone = typeof zonesTable.$inferSelect;
export type InsertZone = typeof zonesTable.$inferInsert;
