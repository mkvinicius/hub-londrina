import {
  pgTable,
  serial,
  integer,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { businessesTable } from "./businesses";

// status:   open | in_progress | resolved | closed
// priority: low  | normal      | high     | urgent
export const supportTicketsTable = pgTable(
  "support_tickets",
  {
    id: serial("id").primaryKey(),
    businessId: integer("business_id")
      .notNull()
      .references(() => businessesTable.id, { onDelete: "cascade" }),
    subject: text("subject").notNull(),
    message: text("message").notNull(),
    status: text("status").notNull().default("open"),
    priority: text("priority").notNull().default("normal"),
    adminResponse: text("admin_response"),
    respondedAt: timestamp("responded_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("support_tickets_status_priority_idx").on(t.status, t.priority),
    index("support_tickets_business_idx").on(t.businessId),
    index("support_tickets_created_at_idx").on(t.createdAt),
  ],
);

export type SupportTicket = typeof supportTicketsTable.$inferSelect;
export type InsertSupportTicket = typeof supportTicketsTable.$inferInsert;
