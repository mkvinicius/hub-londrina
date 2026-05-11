import { db } from "@workspace/db";
import { businessesTable, productsTable } from "@workspace/db/schema";
import { eq, and, sql } from "drizzle-orm";

async function main() {
  const businesses = await db
    .select({
      id: businessesTable.id,
      name: businessesTable.name,
      photos: businessesTable.photos,
      photoUrl: businessesTable.photoUrl,
    })
    .from(businessesTable);

  let createdTotal = 0;
  let skippedTotal = 0;

  for (const biz of businesses) {
    const photos: string[] = [];
    if (Array.isArray(biz.photos)) {
      for (const p of biz.photos) {
        if (typeof p === "string" && p && !photos.includes(p)) photos.push(p);
      }
    }
    if (biz.photoUrl && typeof biz.photoUrl === "string" && !photos.includes(biz.photoUrl)) {
      photos.push(biz.photoUrl);
    }
    if (photos.length === 0) continue;

    const existing = await db
      .select({ mediaUrl: productsTable.mediaUrl })
      .from(productsTable)
      .where(eq(productsTable.businessId, biz.id));
    const existingUrls = new Set(existing.map((r) => r.mediaUrl).filter(Boolean));

    const [{ maxOrder }] = await db
      .select({ maxOrder: sql<number>`COALESCE(MAX(${productsTable.sortOrder}), -1)::int` })
      .from(productsTable)
      .where(eq(productsTable.businessId, biz.id));
    let nextOrder = (maxOrder ?? -1) + 1;

    for (const url of photos) {
      if (existingUrls.has(url)) {
        skippedTotal++;
        continue;
      }
      await db.insert(productsTable).values({
        businessId: biz.id,
        name: biz.name,
        description: null,
        mediaUrl: url,
        mediaType: "image",
        isActive: true,
        sortOrder: nextOrder++,
      });
      createdTotal++;
    }
  }

  console.log(`Migração concluída: ${createdTotal} produtos criados, ${skippedTotal} já existiam (pulados).`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Falha na migração:", err);
  process.exit(1);
});
