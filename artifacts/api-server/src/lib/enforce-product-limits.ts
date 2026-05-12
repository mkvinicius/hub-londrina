import { db } from "@workspace/db";
import { businessesTable, productsTable } from "@workspace/db/schema";
import { and, desc, eq, sql } from "drizzle-orm";
import { logger } from "./logger";
import { sendEmail, emails } from "../services/email";

// Espelha PRODUCT_LIMITS em routes/lojista.ts. Mantenha em sincronia.
export const PRODUCT_LIMITS_BY_PLAN: Record<string, number> = {
  free: 0,
  destaque: 6,
  premium: 10,
};

export function getProductLimitForPlan(plan: string | null | undefined): number {
  return PRODUCT_LIMITS_BY_PLAN[plan ?? "free"] ?? 0;
}

/**
 * Task #8 — Após mudança de plano (downgrade), desativa produtos excedentes
 * para que o número de produtos ATIVOS respeite o limite do novo plano.
 *
 * Estratégia de seleção dos "excedentes": prioriza os MAIS RECENTES
 * (sortOrder DESC, createdAt DESC, id DESC) — assim o lojista mantém a base
 * de produtos antiga/principal visível no público e perde apenas os últimos
 * adicionados/promovidos.
 *
 * Idempotente: se já está dentro do limite, não faz nada e retorna 0.
 *
 * Acumula o contador em `businesses.lastDowngradeDeactivatedCount` para que
 * o lojista veja o aviso no painel mesmo se múltiplos eventos de downgrade
 * acontecerem em sequência (ex: webhook + sync route).
 *
 * Envia email apenas quando ao menos 1 produto é desativado nesta chamada.
 *
 * NÃO reativa produtos automaticamente em upgrade — lojista escolhe via UI.
 */
export async function enforceProductLimitForBusiness(
  businessId: number,
  newPlanType: string,
): Promise<number> {
  const limit = getProductLimitForPlan(newPlanType);

  const activeProducts = await db
    .select({ id: productsTable.id })
    .from(productsTable)
    .where(
      and(
        eq(productsTable.businessId, businessId),
        eq(productsTable.isActive, true),
      ),
    )
    .orderBy(
      desc(productsTable.sortOrder),
      desc(productsTable.createdAt),
      desc(productsTable.id),
    );

  if (activeProducts.length <= limit) return 0;

  const excess = activeProducts.length - limit;
  const idsToDeactivate = activeProducts.slice(0, excess).map((p) => p.id);

  await db
    .update(productsTable)
    .set({ isActive: false })
    .where(
      and(
        eq(productsTable.businessId, businessId),
        sql`${productsTable.id} = ANY(${idsToDeactivate})`,
      ),
    );

  await db
    .update(businessesTable)
    .set({
      lastDowngradeDeactivatedCount: sql`${businessesTable.lastDowngradeDeactivatedCount} + ${excess}`,
    })
    .where(eq(businessesTable.id, businessId));

  logger.info(
    `[ProductLimit] businessId=${businessId} plano=${newPlanType} limite=${limit} desativados=${excess}`,
  );

  // Email best-effort. Não falha o downgrade se email falhar.
  try {
    const [biz] = await db
      .select({
        ownerEmail: businessesTable.ownerEmail,
        ownerName: businessesTable.ownerName,
      })
      .from(businessesTable)
      .where(eq(businessesTable.id, businessId));
    if (biz?.ownerEmail) {
      const tpl = emails.produtosDesativadosPorDowngrade(
        biz.ownerName || "Lojista",
        excess,
        newPlanType,
        limit,
      );
      await sendEmail(biz.ownerEmail, tpl.subject, tpl.html);
    }
  } catch (err) {
    logger.error({ err }, "[ProductLimit] erro ao enviar email de aviso");
  }

  return excess;
}
