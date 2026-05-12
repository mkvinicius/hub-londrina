import { db } from "@workspace/db";
import { businessesTable, productsTable } from "@workspace/db/schema";
import { eq, asc } from "drizzle-orm";

const PRODUCT_IMAGE_LIMITS: Record<string, number> = {
  free: 0,
  destaque: 5,
  premium: 8,
};

function isValidUrl(s: unknown): s is string {
  if (typeof s !== "string") return false;
  const t = s.trim();
  if (!t) return false;
  return /^(https?:\/\/|\/)/i.test(t);
}

function collectLegacyPhotos(biz: {
  photos: unknown;
  photoUrl: string | null;
}): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  if (Array.isArray(biz.photos)) {
    for (const p of biz.photos) {
      if (isValidUrl(p) && !seen.has(p)) {
        seen.add(p);
        out.push(p);
      }
    }
  }
  if (isValidUrl(biz.photoUrl) && !seen.has(biz.photoUrl)) {
    seen.add(biz.photoUrl);
    out.push(biz.photoUrl);
  }
  return out;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");

  const businesses = await db
    .select({
      id: businessesTable.id,
      name: businessesTable.name,
      planType: businessesTable.planType,
      photos: businessesTable.photos,
      photoUrl: businessesTable.photoUrl,
    })
    .from(businessesTable);

  let touchedBusinesses = 0;
  let updatedProducts = 0;
  let addedImages = 0;
  let skippedNoPhotos = 0;
  let skippedFreePlan = 0;
  let skippedNoProducts = 0;
  let skippedAllFull = 0;

  for (const biz of businesses) {
    const legacy = collectLegacyPhotos(biz);
    if (legacy.length === 0) {
      skippedNoPhotos++;
      continue;
    }

    const limit = PRODUCT_IMAGE_LIMITS[biz.planType] ?? 0;
    if (limit === 0) {
      skippedFreePlan++;
      continue;
    }

    const products = await db
      .select({
        id: productsTable.id,
        images: productsTable.images,
        mediaUrl: productsTable.mediaUrl,
        mediaType: productsTable.mediaType,
        sortOrder: productsTable.sortOrder,
      })
      .from(productsTable)
      .where(eq(productsTable.businessId, biz.id))
      .orderBy(asc(productsTable.sortOrder), asc(productsTable.id));

    if (products.length === 0) {
      skippedNoProducts++;
      continue;
    }

    const targets = products.map((p) => {
      const initial = Array.isArray(p.images) ? [...p.images] : [];
      return {
        id: p.id,
        images: initial,
        initialCount: initial.length,
        mediaUrl: p.mediaUrl,
        mediaType: p.mediaType,
        changed: false,
      };
    });

    const globallyUsed = new Set<string>();
    for (const t of targets) for (const url of t.images) globallyUsed.add(url);

    const queue = legacy.filter((url) => !globallyUsed.has(url));
    if (queue.length === 0) {
      skippedAllFull++;
      continue;
    }

    let progressed = true;
    while (queue.length > 0 && progressed) {
      progressed = false;
      for (const t of targets) {
        if (queue.length === 0) break;
        if (t.images.length >= limit) continue;
        const url = queue.shift()!;
        t.images.push(url);
        globallyUsed.add(url);
        t.changed = true;
        progressed = true;
      }
    }

    if (queue.length > 0 && !targets.some((t) => t.changed)) {
      // Todos os produtos já estavam no limite e nenhuma foto coube.
      skippedAllFull++;
      continue;
    }

    let bizTouched = false;
    for (const t of targets) {
      if (!t.changed) continue;
      const newCover = t.images[0] ?? null;
      const updates: Record<string, unknown> = { images: t.images };
      if (newCover) {
        updates.mediaUrl = newCover;
        updates.mediaType = "image";
      }
      addedImages += t.images.length - t.initialCount;
      updatedProducts++;
      bizTouched = true;
      if (!dryRun) {
        await db.update(productsTable).set(updates).where(eq(productsTable.id, t.id));
      }
    }
    if (bizTouched) touchedBusinesses++;
  }

  const prefix = dryRun ? "[dry-run] " : "";
  console.log(
    `${prefix}Backfill concluído: ${touchedBusinesses} negócios afetados, ${updatedProducts} produtos atualizados, ${addedImages} fotos adicionadas.`,
  );
  console.log(
    `  Pulados: ${skippedNoPhotos} sem fotos antigas, ${skippedFreePlan} no plano free, ${skippedNoProducts} sem produtos, ${skippedAllFull} já com todas as fotos.`,
  );
  process.exit(0);
}

main().catch((err) => {
  console.error("Falha no backfill:", err);
  process.exit(1);
});
