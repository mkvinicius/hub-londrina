import { pgTable, serial, integer, text, timestamp, index } from "drizzle-orm/pg-core";

export const adminActionsTable = pgTable("admin_actions", {
  id: serial("id").primaryKey(),
  adminId: integer("admin_id").notNull(),
  action: text("action").notNull(),
  targetType: text("target_type").notNull(),
  targetId: integer("target_id"),
  details: text("details"),
  ip: text("ip"),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => [
  index("admin_actions_target_idx").on(t.targetType, t.targetId),
  index("admin_actions_created_at_idx").on(t.createdAt),
]);

export type AdminAction = typeof adminActionsTable.$inferSelect;
export type InsertAdminAction = typeof adminActionsTable.$inferInsert;
