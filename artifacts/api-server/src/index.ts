import app from "./app";
import { logger } from "./lib/logger";
import { runStartupSeed } from "./lib/startup-seed";
import { startBoostExpirationJob } from "./lib/boost-expiration";
import { startDocumentationJob } from "./lib/documentation-job";
import fs from "fs";
import path from "path";

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

runStartupSeed().then(() => {
  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }

    logger.info({ port }, "Server listening");
    startBoostExpirationJob();
    startDocumentationJob();
  });
});
