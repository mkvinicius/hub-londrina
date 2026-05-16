import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

// category: consumidor | lojista | lgpd
export const faqsTable = pgTable(
  "faqs",
  {
    id: serial("id").primaryKey(),
    category: text("category").notNull().default("consumidor"),
    question: text("question").notNull(),
    answer: text("answer").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("faqs_category_active_idx").on(t.category, t.isActive),
    index("faqs_sort_idx").on(t.category, t.sortOrder),
  ],
);

export type Faq = typeof faqsTable.$inferSelect;
export type InsertFaq = typeof faqsTable.$inferInsert;
