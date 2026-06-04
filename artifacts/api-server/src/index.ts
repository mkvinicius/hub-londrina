import app from "./app";
import { logger } from "./lib/logger";
import { initSentry } from "./lib/sentry";
import { runStartupSeed } from "./lib/startup-seed";
import { startBoostExpirationJob } from "./lib/boost-expiration";
import { startDocumentationJob } from "./lib/documentation-job";
import { startRetentionJob } from "./lib/retention-job";
import { startSubscriptionJob } from "./lib/subscription-job";
import { startSubscriptionReminderJob } from "./lib/subscription-reminder-job";
import { ensureViews } from "./lib/startup-views";
import { healPaidInvisibleBusinesses, healOverflowingProductLimits, healZoneRegionDisplayNames, healDocumentationConsistency } from "./lib/startup-heal";
import fs from "fs";
import path from "path";

// Sprint 4.1 — handlers de processo (registrados ANTES de qualquer trabalho assíncrono)
process.on("unhandledRejection", (reason) => {
  logger.error({ reason }, "Unhandled rejection");
});
process.on("uncaughtException", (err) => {
  logger.error({ err }, "Uncaught exception");
  process.exit(1);
});

const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");
["logos", "banners", "photos"].forEach((dir) => {
  const fullPath = path.join(UPLOADS_DIR, dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
    logger.warn(`Diretório de upload recriado: ${fullPath}`);
    logger.warn("ATENÇÃO: uploads locais são perdidos ao reiniciar o container.");
    logger.warn("Configure S3/R2 para produção permanente.");
  }
});

if (process.env.NODE_ENV === "production" && !process.env.S3_BUCKET && !process.env.R2_BUCKET) {
  logger.warn("⚠  UPLOADS LOCAIS ATIVOS em produção. Configure S3_BUCKET ou R2_BUCKET para persistência permanente.");
}

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// Deploy fix — a porta é aberta IMEDIATAMENTE para que o health check do
// autoscale passe dentro do timeout. As tarefas de inicialização que dependem
// do banco (Sentry/seed/views/heal) rodam DEPOIS do listen e NÃO bloqueiam a
// abertura da porta. Antes, qualquer travamento/rejeição nessas etapas (a cadeia
// não tinha .catch) impedia o app.listen e a publicação falhava no timeout.
app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
  // Pentest fix — confirma no startup que os limiters estão registrados
  // (express-rate-limit é em memória; o log facilita auditar reset após deploy).
  logger.info(
    "Rate limiters ativos: admin/login, lojista/login, register, review, csrf-token, business-view, cnpj, reset-senha",
  );

  void runStartupTasks();
});

// Tarefas de inicialização pós-listen. Falhas são logadas mas NÃO derrubam o
// servidor — a porta já está aberta e o health check já passou.
async function runStartupTasks() {
  try {
    // Sprint 4.5 — Sentry (graceful: silencioso se SENTRY_DSN ausente)
    await initSentry();
    await runStartupSeed();
    await ensureViews();
    await healDocumentationConsistency();
    await healPaidInvisibleBusinesses();
    await healOverflowingProductLimits();
    await healZoneRegionDisplayNames();
  } catch (startupErr) {
    logger.error(
      { err: startupErr },
      "Falha em tarefa de inicialização pós-listen (servidor segue no ar)",
    );
  }

  startBoostExpirationJob();
  startDocumentationJob();
  startRetentionJob();
  startSubscriptionJob();
  startSubscriptionReminderJob();
}
