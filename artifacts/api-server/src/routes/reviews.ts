import { Router, type IRouter } from "express";

// Rota /reviews?businessId= aposentada — duplicava /businesses/:id/reviews
// (em businesses.ts:286). Use sempre o endpoint canônico aninhado.
const router: IRouter = Router();

export default router;
