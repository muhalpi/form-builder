import { Router, type IRouter } from "express";
import healthRouter from "./health";
import formsRouter from "./forms";
import groupsRouter from "./groups";
import responsesRouter from "./responses";
import dashboardRouter from "./dashboard";
import sheetsRouter from "./sheets";

const router: IRouter = Router();

router.use(healthRouter);
router.use(formsRouter);
router.use(groupsRouter);
router.use(responsesRouter);
router.use(dashboardRouter);
router.use(sheetsRouter);

export default router;
