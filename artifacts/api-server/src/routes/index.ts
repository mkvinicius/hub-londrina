import { Router, type IRouter } from "express";
import healthRouter from "./health";
import businessesRouter from "./businesses";
import categoriesRouter from "./categories";
import reviewsRouter from "./reviews";
import searchRouter from "./search";

const router: IRouter = Router();

router.use(healthRouter);
router.use(businessesRouter);
router.use(categoriesRouter);
router.use(reviewsRouter);
router.use(searchRouter);

export default router;
