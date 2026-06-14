import { pgTable, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const aboutPageTable = pgTable("about_page", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  isCore: boolean("is_core").notNull().default(false),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  updatedBy: text("updated_by"),
});

export type AboutPageRow = typeof aboutPageTable.$inferSelect;
export type InsertAboutPageRow = typeof aboutPageTable.$inferInsert;
