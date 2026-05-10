import { db } from "@workspace/db";
import { jobRunsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "./logger";

/**
 * Executa `fn` e registra o resultado em `job_runs` (observabilidade).
 * Sem gate de tempo — o caller decide a frequência via setInterval.
 * Use isto pra jobs que precisam rodar com granularidade fina (ex: expiração horária).
 */
export async function runWithCheckpoint(jobName: string, fn: () => Promise<void>): Promise<void> {
  let status = "success";
  try {
    await fn();
  } catch (err) {
    status = "error";
    logger.error({ err }, `[JobCheckpoint] ${jobName} falhou`);
  } finally {
    try {
      await db
        .insert(jobRunsTable)
        .values({ jobName, lastRunAt: new Date(), lastRunStatus: status })
        .onConflictDoUpdate({
          target: jobRunsTable.jobName,
          set: { lastRunAt: new Date(), lastRunStatus: status },
        });
    } catch (err) {
      logger.error({ err }, `[JobCheckpoint] falha ao gravar checkpoint de ${jobName}`);
    }
  }
}

export async function runOnceDaily(jobName: string, fn: () => Promise<void>): Promise<void> {
  const todayUtc = new Date();
  todayUtc.setUTCHours(0, 0, 0, 0);

  const [existing] = await db
    .select({ lastRunAt: jobRunsTable.lastRunAt })
    .from(jobRunsTable)
    .where(eq(jobRunsTable.jobName, jobName));

  if (existing && existing.lastRunAt >= todayUtc) {
    logger.info(`[JobCheckpoint] ${jobName} já executou hoje (${existing.lastRunAt.toISOString()}), pulando`);
    return;
  }

  let status = "success";
  try {
    await fn();
  } catch (err) {
    status = "error";
    throw err;
  } finally {
    await db
      .insert(jobRunsTable)
      .values({ jobName, lastRunAt: new Date(), lastRunStatus: status })
      .onConflictDoUpdate({
        target: jobRunsTable.jobName,
        set: { lastRunAt: new Date(), lastRunStatus: status },
      });
  }
}
