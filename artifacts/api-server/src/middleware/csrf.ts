import { Request, Response, NextFunction } from "express";
import crypto from "crypto";

export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  if (req.method === "GET") return next();

  const tokenFromHeader = req.headers["x-csrf-token"] as string | undefined;
  const tokenFromCookie = req.cookies?.["csrf-token"] as string | undefined;

  if (!tokenFromHeader || !tokenFromCookie || tokenFromHeader !== tokenFromCookie) {
    res.status(403).json({ error: "Token CSRF inválido.", code: "CSRF_INVALID" });
    return;
  }

  next();
}
