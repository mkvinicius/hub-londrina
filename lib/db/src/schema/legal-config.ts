import { pgTable, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const legalConfigTable = pgTable("legal_config", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  isCore: boolean("is_core").notNull().default(false),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  updatedBy: text("updated_by"),
});

export type LegalConfigRow = typeof legalConfigTable.$inferSelect;
export type InsertLegalConfigRow = typeof legalConfigTable.$inferInsert;
