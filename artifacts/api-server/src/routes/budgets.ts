import { Router } from "express";
import { db, budgetsTable, expensesTable } from "@workspace/db";
import { eq, and, sum, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { CreateBudgetBody, UpdateBudgetBody, UpdateBudgetParams, DeleteBudgetParams } from "@workspace/api-zod";

const router = Router();
router.use(requireAuth);

router.get("/budgets", async (req, res) => {
  const userId = req.user!.userId;
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const budgets = await db.select().from(budgetsTable).where(
    and(eq(budgetsTable.userId, userId), eq(budgetsTable.month, currentMonth), eq(budgetsTable.year, currentYear))
  );

  const result = await Promise.all(budgets.map(async (b) => {
    const startDate = `${currentYear}-${String(currentMonth).padStart(2, "0")}-01`;
    const endDate = `${currentYear}-${String(currentMonth).padStart(2, "0")}-31`;

    const [spentResult] = await db
      .select({ total: sum(expensesTable.amount) })
      .from(expensesTable)
      .where(and(
        eq(expensesTable.userId, userId),
        eq(expensesTable.category, b.category),
        sql`${expensesTable.date} >= ${startDate}`,
        sql`${expensesTable.date} <= ${endDate}`,
      ));

    const spent = parseFloat(spentResult?.total ?? "0");
    const limitAmount = parseFloat(b.limitAmount);
    const remaining = limitAmount - spent;
    const percentage = limitAmount > 0 ? (spent / limitAmount) * 100 : 0;

    return {
      id: b.id,
      userId: b.userId,
      category: b.category,
      limitAmount,
      month: b.month,
      year: b.year,
      spent,
      remaining,
      percentage: Math.round(percentage * 10) / 10,
      createdAt: b.createdAt.toISOString(),
    };
  }));

  res.json(result);
});

router.post("/budgets", async (req, res) => {
  const parsed = CreateBudgetBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { category, limitAmount, month, year } = parsed.data;
  const [budget] = await db.insert(budgetsTable).values({ userId: req.user!.userId, category, limitAmount: limitAmount.toString(), month, year }).returning();
  res.status(201).json({ ...budget, limitAmount: parseFloat(budget.limitAmount), createdAt: budget.createdAt.toISOString() });
});

router.put("/budgets/:id", async (req, res) => {
  const idParsed = UpdateBudgetParams.safeParse({ id: parseInt(req.params.id) });
  if (!idParsed.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const bodyParsed = UpdateBudgetBody.safeParse(req.body);
  if (!bodyParsed.success) { res.status(400).json({ error: bodyParsed.error.message }); return; }

  const updates: Record<string, unknown> = {};
  if (bodyParsed.data.limitAmount !== undefined) updates.limitAmount = bodyParsed.data.limitAmount.toString();

  const [budget] = await db.update(budgetsTable).set(updates).where(and(eq(budgetsTable.id, idParsed.data.id), eq(budgetsTable.userId, req.user!.userId))).returning();
  if (!budget) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...budget, limitAmount: parseFloat(budget.limitAmount), createdAt: budget.createdAt.toISOString() });
});

router.delete("/budgets/:id", async (req, res) => {
  const idParsed = DeleteBudgetParams.safeParse({ id: parseInt(req.params.id) });
  if (!idParsed.success) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(budgetsTable).where(and(eq(budgetsTable.id, idParsed.data.id), eq(budgetsTable.userId, req.user!.userId)));
  res.json({ message: "Deleted" });
});

export default router;
