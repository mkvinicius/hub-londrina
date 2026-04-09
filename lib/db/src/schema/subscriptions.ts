import { pgTable, serial, integer, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { businessesTable } from "./businesses";

export const subscriptionsTable = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id")
    .references(() => businessesTable.id)
    .notNull()
    .unique(),
  stripeCustomerId: text("stripe_customer_id").notNull(),
  stripeSubscriptionId: text("stripe_subscription_id"),
  stripePriceId: text("stripe_price_id"),
  plan: text("plan").notNull(),
  status: text("status").notNull(),
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
