import { Request, Response, NextFunction } from "express";

export function parseId(value: string | undefined): number | null {
  if (!value) return null;
  const id = parseInt(value, 10);
  if (isNaN(id) || id <= 0 || id > 2147483647) return null;
  return id;
}

export function validateId(req: Request, res: Response, next: NextFunction) {
  const id = parseId(req.params.id);
  if (id === null) {
    res.status(400).json({
      error: "ID inválido.",
      code: "INVALID_ID",
    });
    return;
  }
  req.params.id = String(id);
  next();
}

export function validatePagination(req: Request, res: Response, next: NextFunction) {
  const page = parseInt(req.query.page as string || "1", 10);
  const limit = parseInt(req.query.limit as string || "12", 10);

  if (isNaN(page) || page < 1) req.query.page = "1";
  else if (page > 10000) req.query.page = "10000";

  if (isNaN(limit) || limit < 1) req.query.limit = "12";
  else if (limit > 100) req.query.limit = "100";

  next();
}
