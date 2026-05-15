import { Router, type IRouter, type Request, type Response } from "express";
import { getLegalConfig } from "../lib/legal-config-store";

const router: IRouter = Router();

router.get("/legal-config", async (_req: Request, res: Response) => {
  try {
    const data = await getLegalConfig();
    res.set("Cache-Control", "public, max-age=300");
    res.json({ data });
  } catch {
    res.status(500).json({ error: "Falha ao ler config legal" });
  }
});

export default router;
