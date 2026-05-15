import {
  pgTable,
  serial,
  integer,
  text,
  timestamp,
  boolean,
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
    passwordResetToken: text("password_reset_token"),
    passwordResetExpiresAt: timestamp("password_reset_expires_at"),
    emailVerified: boolean("email_verified_bool").notNull().default(false),
    emailVerificationToken: text("email_verification_token"),
    firstLoginAt: timestamp("first_login_at"),
    lastLoginAt: timestamp("last_login_at"),
    documentationDeadline: timestamp("documentation_deadline"),
    documentationStatus: text("documentation_status").default("pending"),
    documentationRemainingDays: integer("documentation_remaining_days").default(10),
    documentationTimerPaused: boolean("documentation_timer_paused").default(false),
    // LGPD — consentimento explícito (Lei 13.709/2018, art. 8º).
    consentTermsVersion: text("consent_terms_version"),
    consentTermsAt: timestamp("consent_terms_at"),
    consentPrivacyAt: timestamp("consent_privacy_at"),
    // LGPD — direito ao esquecimento (art. 18, VI). Quando preenchido,
    // o cron de retenção hard-deleta a conta após 30 dias.
    accountDeletionRequestedAt: timestamp("account_deletion_requested_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("business_users_email_idx").on(t.email)],
);

export type InsertBusinessUser = typeof businessUsersTable.$inferInsert;
export type BusinessUser = typeof businessUsersTable.$inferSelect;
