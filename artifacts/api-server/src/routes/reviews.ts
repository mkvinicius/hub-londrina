import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { reviewsTable } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { ListReviewsQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/reviews", async (req, res) => {
  const parsed = ListReviewsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "businessId é obrigatório" });
    return;
  }
  const { businessId } = parsed.data;

  const data = await db
    .select()
    .from(reviewsTable)
    .where(eq(reviewsTable.businessId, businessId))
    .orderBy(desc(reviewsTable.createdAt));

  res.json({ data });
});

export default router;
