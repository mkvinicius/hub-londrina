import { pgTable, serial, text, integer, timestamp, index } from "drizzle-orm/pg-core";

// Registra termos buscados de forma anônima (sem IP, sem usuário).
// Permite ao admin identificar o que os usuários procuram e calibrar o catálogo.
export const searchAnalyticsTable = pgTable(
  "search_analytics",
  {
    id: serial("id").primaryKey(),
    term: text("term").notNull(),
    resultsCount: integer("results_count").notNull().default(0),
    zone: text("zone"),
    searchedAt: timestamp("searched_at").notNull().defaultNow(),
  },
  (t) => [
    index("search_analytics_term_idx").on(t.term),
    index("search_analytics_searched_at_idx").on(t.searchedAt),
  ],
);

export type SearchAnalytics = typeof searchAnalyticsTable.$inferSelect;
export type InsertSearchAnalytics = typeof searchAnalyticsTable.$inferInsert;
