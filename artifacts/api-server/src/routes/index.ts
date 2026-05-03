import { Router, type IRouter } from "express";
import healthRouter from "./health";
import businessesRouter from "./businesses";
import categoriesRouter from "./categories";
import reviewsRouter from "./reviews";
import searchRouter from "./search";
import adminRouter from "./admin";
import lojistaRouter from "./lojista";
import authRouter from "./auth";
import stripeRouter from "./stripe";
import zonesRouter from "./zones";
import storageRouter from "./storage";
import documentsRouter from "./documents";
import boostsRouter from "./boosts";

const router: IRouter = Router();

router.use(healthRouter);
router.use(businessesRouter);
router.use(categoriesRouter);
router.use(reviewsRouter);
router.use(searchRouter);
router.use(adminRouter);
router.use(boostsRouter);
router.use(lojistaRouter);
router.use(authRouter);
router.use(stripeRouter);
router.use(zonesRouter);
router.use(storageRouter);
router.use(documentsRouter);

export default router;
