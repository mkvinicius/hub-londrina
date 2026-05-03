import { pgTable, serial, integer, text, timestamp, index } from "drizzle-orm/pg-core";
import { businessesTable } from "./businesses";

export const businessDocumentsTable = pgTable(
  "business_documents",
  {
    id: serial("id").primaryKey(),
    businessId: integer("business_id")
      .references(() => businessesTable.id, { onDelete: "cascade" })
      .notNull(),
    documentType: text("document_type").notNull(),
    fileUrl: text("file_url").notNull(),
    status: text("status").notNull().default("submitted"),
    rejectionReason: text("rejection_reason"),
    submittedAt: timestamp("submitted_at").defaultNow(),
    reviewedAt: timestamp("reviewed_at"),
  },
  (t) => [
    index("business_documents_business_idx").on(t.businessId),
    index("business_documents_status_idx").on(t.status),
  ],
);

export type InsertBusinessDocument = typeof businessDocumentsTable.$inferInsert;
export type BusinessDocument = typeof businessDocumentsTable.$inferSelect;
