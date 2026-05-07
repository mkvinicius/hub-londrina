import {
  pgTable,
  serial,
  integer,
  text,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { businessesTable } from "./businesses";

// status:
//   active          → publicado, aparece na home
//   pending_review  → lojista pagou via Stripe, aguardando aprovação do admin
//   rejected        → admin rejeitou (motivo opcional)
//   expired         → endsAt passou
//
// requestedBy:
//   admin           → admin cadastrou diretamente (vai já como active)
//   lojista         → lojista comprou via Stripe (vai como pending_review)
export const homeBannersTable = pgTable("home_banners", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").references(() => businessesTable.id, { onDelete: "cascade" }),
  title: text("title"),
  imageUrl: text("image_url").notNull(),
  linkUrl: text("link_url"),
  active: boolean("active").notNull().default(true),
  status: text("status").notNull().default("active"),
  requestedBy: text("requested_by").notNull().default("admin"),
  rejectionReason: text("rejection_reason"),
  stripeSessionId: text("stripe_session_id").unique(),
  stripeSubscriptionId: text("stripe_subscription_id"),
  clicks: integer("clicks").notNull().default(0),
  endsAt: timestamp("ends_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  index("home_banners_active_status_idx").on(t.active, t.status),
]);

export type InsertHomeBanner = typeof homeBannersTable.$inferInsert;
export type HomeBanner = typeof homeBannersTable.$inferSelect;
