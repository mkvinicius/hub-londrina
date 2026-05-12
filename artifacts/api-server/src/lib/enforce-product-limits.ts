import { db } from "@workspace/db";
import { businessesTable, productsTable } from "@workspace/db/schema";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
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

// Task #12 — Espelha o limite usado em POST /lojista/upload/photo. Manter
// em sincronia com aquele handler. `premium: 999` é tratado como ilimitado
// na prática.
export const PHOTO_LIMITS_BY_PLAN: Record<string, number> = {
  free: 1,
  destaque: 10,
  premium: 999,
};

export function getPhotoLimitForPlan(plan: string | null | undefined): number {
  return PHOTO_LIMITS_BY_PLAN[plan ?? "free"] ?? 1;
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

  // Drizzle serializa array de 1 elemento como literal escalar (ex: `51`)
  // em vez de array Postgres (`{51}`), o que faz `= ANY(...)` quebrar com
  // "malformed array literal". Para n=1, usar `eq` direto. Para n>1, `inArray`
  // monta `IN ($1, $2, ...)` corretamente.
  const idCondition =
    idsToDeactivate.length === 1
      ? eq(productsTable.id, idsToDeactivate[0])
      : inArray(productsTable.id, idsToDeactivate);

  await db
    .update(productsTable)
    .set({ isActive: false })
    .where(and(eq(productsTable.businessId, businessId), idCondition));

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

/**
 * Task #12 — Após mudança de plano (downgrade), move fotos excedentes da
 * galeria do negócio (`businesses.photos`) para `businesses.hiddenPhotos` a
 * fim de respeitar o limite do novo plano (free=1, destaque=10, premium=999).
 *
 * Estratégia de seleção: as MAIS RECENTES (final do array) são ocultadas
 * — assim o lojista mantém visíveis as primeiras fotos cadastradas, que
 * normalmente são as mais representativas do negócio.
 *
 * Não exclui o arquivo do storage nem perde a URL — apenas move para uma
 * coluna paralela. Se voltar para Premium, basta restaurar manualmente.
 *
 * Idempotente: se já está dentro do limite, não faz nada e retorna 0.
 *
 * Acumula em `businesses.lastDowngradeHiddenPhotosCount` para o aviso no
 * painel sobreviver a múltiplos downgrades em sequência (ex: webhook +
 * sync route). Limpado via POST /api/lojista/photos/dismiss-hidden-notice.
 *
 * Envia email apenas quando ao menos 1 foto é ocultada nesta chamada.
 */
export async function enforcePhotoLimitForBusiness(
  businessId: number,
  newPlanType: string,
): Promise<number> {
  const limit = getPhotoLimitForPlan(newPlanType);

  const [biz] = await db
    .select({
      photos: businessesTable.photos,
      hiddenPhotos: businessesTable.hiddenPhotos,
      ownerEmail: businessesTable.ownerEmail,
      ownerName: businessesTable.ownerName,
    })
    .from(businessesTable)
    .where(eq(businessesTable.id, businessId));

  if (!biz) return 0;

  const photos = biz.photos ?? [];
  if (photos.length <= limit) return 0;

  const keep = photos.slice(0, limit);
  const move = photos.slice(limit);
  const excess = move.length;
  const newHidden = [...(biz.hiddenPhotos ?? []), ...move];

  await db
    .update(businessesTable)
    .set({
      photos: keep,
      hiddenPhotos: newHidden,
      lastDowngradeHiddenPhotosCount: sql`${businessesTable.lastDowngradeHiddenPhotosCount} + ${excess}`,
    })
    .where(eq(businessesTable.id, businessId));

  logger.info(
    `[PhotoLimit] businessId=${businessId} plano=${newPlanType} limite=${limit} ocultadas=${excess}`,
  );

  // Email best-effort. Não falha o downgrade se email falhar.
  try {
    if (biz.ownerEmail) {
      const tpl = emails.fotosOcultadasPorDowngrade(
        biz.ownerName || "Lojista",
        excess,
        newPlanType,
        limit,
      );
      await sendEmail(biz.ownerEmail, tpl.subject, tpl.html);
    }
  } catch (err) {
    logger.error({ err }, "[PhotoLimit] erro ao enviar email de aviso");
  }

  return excess;
}
