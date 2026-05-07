import { logger } from "./logger";

let SentryRef: typeof import("@sentry/node") | null = null;

export async function initSentry(): Promise<void> {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    logger.info("[Sentry] SENTRY_DSN não configurado — Sentry desativado (graceful degradation)");
    return;
  }
  try {
    const Sentry = await import("@sentry/node");
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV || "production",
      tracesSampleRate: 0.1,
    });
    SentryRef = Sentry;
    logger.info({ env: process.env.NODE_ENV }, "[Sentry] Inicializado com sucesso");
  } catch (err) {
    logger.error({ err }, "[Sentry] Falha ao inicializar — continuando sem Sentry");
  }
}

export function captureException(err: unknown, context?: Record<string, unknown>): void {
  if (!SentryRef) return;
  try {
    SentryRef.captureException(err, context ? { extra: context } : undefined);
  } catch {
    // swallow — Sentry deve ser fail-safe
  }
}
