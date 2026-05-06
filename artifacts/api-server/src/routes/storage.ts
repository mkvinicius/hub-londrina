import { Router, type IRouter, type Request, type Response } from "express";
import { serveGCSObject } from "../lib/gcsUpload";

const router: IRouter = Router();

router.get("/storage/objects/*filePath", async (req: Request, res: Response) => {
  try {
    const raw = req.params.filePath;
    const gcsPath = Array.isArray(raw) ? raw.join("/") : raw;

    if (!gcsPath || gcsPath.includes("..")) {
      res.status(400).json({ error: "Invalid path" });
      return;
    }

    // Documentos privados (CNPJ, RG, comprovante) NÃO podem ser servidos por este
    // endpoint público. O acesso é exclusivamente via /api/documents/signed/:token
    // (JWT 1h, validado por dono/admin em documents.ts).
    const normalized = gcsPath.replace(/^\/+/, "").toLowerCase();
    if (normalized.startsWith("documents/")) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const result = await serveGCSObject(`uploads/${gcsPath}`);
    if (!result) {
      res.status(404).json({ error: "File not found" });
      return;
    }

    res.setHeader("Content-Type", result.contentType);
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.send(result.buffer);
  } catch (error) {
    console.error("Error serving GCS object:", error);
    res.status(500).json({ error: "Failed to serve file" });
  }
});

export default router;
