import { pgTable, serial, text, timestamp, index } from "drizzle-orm/pg-core";

// status: new | read | replied | archived
export const contactMessagesTable = pgTable(
  "contact_messages",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),
    subject: text("subject").notNull(),
    message: text("message").notNull(),
    status: text("status").notNull().default("new"),
    adminNotes: text("admin_notes"),
    ipAddress: text("ip_address"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("contact_messages_status_idx").on(t.status),
    index("contact_messages_created_at_idx").on(t.createdAt),
  ],
);

export type ContactMessage = typeof contactMessagesTable.$inferSelect;
export type InsertContactMessage = typeof contactMessagesTable.$inferInsert;
