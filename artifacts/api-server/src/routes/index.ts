import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import expensesRouter from "./expenses";
import incomeRouter from "./income";
import budgetsRouter from "./budgets";
import goalsRouter from "./goals";
import dashboardRouter from "./dashboard";
import analyticsRouter from "./analytics";
import exportRouter from "./export";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(expensesRouter);
router.use(incomeRouter);
router.use(budgetsRouter);
router.use(goalsRouter);
router.use(dashboardRouter);
router.use(analyticsRouter);
router.use(exportRouter);

export default router;
