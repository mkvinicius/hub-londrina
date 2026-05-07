import { db } from "@workspace/db";
import { adminActionsTable } from "@workspace/db/schema";
import type { Request } from "express";
import { logger } from "./logger";

export const ADMIN_DEFAULT_ID = 1;

export async function logAdminAction(
  adminId: number,
  action: string,
  targetType: string,
  targetId?: number,
  details?: string,
  ip?: string,
): Promise<void> {
  try {
    await db.insert(adminActionsTable).values({
      adminId,
      action,
      targetType,
      targetId,
      details,
      ip,
    });
  } catch (err) {
    logger.error({ err, action, targetType, targetId }, "[Audit] Falha ao registrar ação admin");
  }
}

export function getReqIp(req: Request): string | undefined {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") return forwarded.split(",")[0]?.trim();
  return req.ip;
}
