import { Request, Response, NextFunction } from "express";
import { db } from "@workspace/db";
import { businessesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

type PlanType = "free" | "destaque" | "premium";

const PLAN_RANK: Record<PlanType, number> = {
  free: 0,
  destaque: 1,
  premium: 2,
};

export function requirePlan(minPlan: PlanType) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const { businessId } = (req as any).lojista;
    const [biz] = await db
      .select({ planType: businessesTable.planType })
      .from(businessesTable)
      .where(eq(businessesTable.id, businessId));

    if (!biz) {
      res.status(404).json({ error: "Negócio não encontrado" });
      return;
    }

    const current = biz.planType as PlanType;
    if (PLAN_RANK[current] < PLAN_RANK[minPlan]) {
      const labels: Record<PlanType, string> = {
        free: "Gratuito",
        destaque: "Destaque",
        premium: "Premium",
      };
      res.status(403).json({
        error: `Recurso disponível a partir do plano ${labels[minPlan]}`,
        requiredPlan: minPlan,
        currentPlan: current,
      });
      return;
    }

    (req as any).businessPlan = current;
    next();
  };
}
