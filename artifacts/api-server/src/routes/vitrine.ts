// R11 — Vitrine de Produtos da Home (público)
//
// GET /api/vitrine — retorna até 12 cards do carrossel:
//   • até 4 slots fixos (vitrine_boosts ativos)
//   • complemento aleatório com produtos de Premium (videoStatus='approved')
// Se total < 6, retorna { cards: [] } (regra "não renderiza se vazio").
import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import {
  productsTable,
  businessesTable,
  vitrineBoostsTable,
} from "@workspace/db/schema";
import { and, eq, sql, inArray, gt, isNull, or } from "drizzle-orm";

const router: IRouter = Router();

const TOTAL_SLOTS = 12;
const FIXED_SLOTS = 4;
const MIN_TO_RENDER = 6;

type Card = {
  productId: number;
  businessId: number;
  name: string;
  price: string | null;
  videoUrl: string;
  photoUrl: string | null;
  whatsapp: string | null;
  businessName: string;
  fixed: boolean;
};

router.get("/vitrine", async (_req: Request, res: Response) => {
  // R11 — rotação aleatória a cada request: nunca pode ser cacheado por CDN/proxy.
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  res.setHeader("Pragma", "no-cache");

  const now = new Date();

  // 1) Slots fixos: boosts ativos não expirados, com produto vinculado válido,
  //    do business Premium ainda visível.
  const fixedRows = await db
    .select({
      productId: productsTable.id,
      businessId: businessesTable.id,
      name: productsTable.name,
      price: productsTable.price,
      videoUrl: productsTable.videoUrl,
      photoUrl: productsTable.mediaUrl,
      whatsapp: businessesTable.whatsapp,
      businessName: businessesTable.name,
    })
    .from(vitrineBoostsTable)
    .innerJoin(productsTable, eq(vitrineBoostsTable.productId, productsTable.id))
    .innerJoin(businessesTable, eq(vitrineBoostsTable.businessId, businessesTable.id))
    .where(
      and(
        eq(vitrineBoostsTable.status, "active"),
        or(isNull(vitrineBoostsTable.endsAt), gt(vitrineBoostsTable.endsAt, now))!,
        eq(productsTable.videoStatus, "approved"),
        eq(productsTable.isActive, true),
        eq(businessesTable.planType, "premium"),
        eq(businessesTable.isVisible, true),
        eq(businessesTable.status, "active"),
      ),
    )
    .limit(FIXED_SLOTS);

  const fixedCards: Card[] = fixedRows
    .filter((r) => r.videoUrl)
    .map((r) => ({
      productId: r.productId,
      businessId: r.businessId,
      name: r.name,
      price: r.price ?? null,
      videoUrl: r.videoUrl!,
      photoUrl: r.photoUrl ?? null,
      whatsapp: r.whatsapp ?? null,
      businessName: r.businessName,
      fixed: true,
    }));

  const usedProductIds = fixedCards.map((c) => c.productId);
  const remaining = TOTAL_SLOTS - fixedCards.length;

  // 2) Complemento de rotação: produtos Premium com vídeo aprovado, sorteio
  //    aleatório a cada request (sem cache).
  const rotationConditions = [
    eq(productsTable.videoStatus, "approved"),
    eq(productsTable.isActive, true),
    eq(businessesTable.planType, "premium"),
    eq(businessesTable.isVisible, true),
    eq(businessesTable.status, "active"),
  ];
  if (usedProductIds.length > 0) {
    rotationConditions.push(sql`${productsTable.id} NOT IN ${usedProductIds}`);
  }

  const rotationRows = remaining > 0
    ? await db
        .select({
          productId: productsTable.id,
          businessId: businessesTable.id,
          name: productsTable.name,
          price: productsTable.price,
          videoUrl: productsTable.videoUrl,
          photoUrl: productsTable.mediaUrl,
          whatsapp: businessesTable.whatsapp,
          businessName: businessesTable.name,
        })
        .from(productsTable)
        .innerJoin(businessesTable, eq(productsTable.businessId, businessesTable.id))
        .where(and(...rotationConditions))
        .orderBy(sql`random()`)
        .limit(remaining)
    : [];

  const rotationCards: Card[] = rotationRows
    .filter((r) => r.videoUrl)
    .map((r) => ({
      productId: r.productId,
      businessId: r.businessId,
      name: r.name,
      price: r.price ?? null,
      videoUrl: r.videoUrl!,
      photoUrl: r.photoUrl ?? null,
      whatsapp: r.whatsapp ?? null,
      businessName: r.businessName,
      fixed: false,
    }));

  const cards = [...fixedCards, ...rotationCards];

  // R11 — não renderizar bloco se < 6 cards
  if (cards.length < MIN_TO_RENDER) {
    return res.json({ cards: [], totalSlots: TOTAL_SLOTS, minToRender: MIN_TO_RENDER });
  }

  res.json({ cards, totalSlots: TOTAL_SLOTS, fixedSlots: FIXED_SLOTS });
});

export default router;
