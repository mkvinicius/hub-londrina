import {
  pgTable,
  serial,
  integer,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { businessesTable } from "./businesses";

export const businessUsersTable = pgTable(
  "business_users",
  {
    id: serial("id").primaryKey(),
    businessId: integer("business_id")
      .notNull()
      .references(() => businessesTable.id, { onDelete: "cascade" }),
    email: text("email").notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("business_users_email_idx").on(t.email)],
);

export type InsertBusinessUser = typeof businessUsersTable.$inferInsert;
export type BusinessUser = typeof businessUsersTable.$inferSelect;
