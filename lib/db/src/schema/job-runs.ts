import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const jobRunsTable = pgTable("job_runs", {
  id: serial("id").primaryKey(),
  jobName: text("job_name").notNull().unique(),
  lastRunAt: timestamp("last_run_at").notNull(),
  lastRunStatus: text("last_run_status").notNull().default("success"),
});

export type JobRun = typeof jobRunsTable.$inferSelect;
export type InsertJobRun = typeof jobRunsTable.$inferInsert;
