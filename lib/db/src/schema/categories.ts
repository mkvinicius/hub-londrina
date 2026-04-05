import { pgTable, serial, text } from "drizzle-orm/pg-core";

export const categoriesTable = pgTable("categories", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  icon: text("icon").notNull(),
  color: text("color").notNull(),
  photoUrl: text("photo_url"),
});

export type InsertCategory = typeof categoriesTable.$inferInsert;
export type Category = typeof categoriesTable.$inferSelect;
