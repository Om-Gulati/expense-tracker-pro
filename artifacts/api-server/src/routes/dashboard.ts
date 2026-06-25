import { Router } from "express";
import { db, expensesTable, incomeTable, budgetsTable } from "@workspace/db";
import { eq, and, sum, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();
router.use(requireAuth);

router.get("/dashboard", async (req, res) => {
  const userId = req.user!.userId;
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const monthStart = `${currentYear}-${String(currentMonth).padStart(2, "0")}-01`;
  const monthEnd = `${currentYear}-${String(currentMonth).padStart(2, "0")}-31`;

  const [totalIncomeResult, totalExpensesResult, monthlyIncomeResult, monthlyExpensesResult] = await Promise.all([
    db.select({ total: sum(incomeTable.amount) }).from(incomeTable).where(eq(incomeTable.userId, userId)),
    db.select({ total: sum(expensesTable.amount) }).from(expensesTable).where(eq(expensesTable.userId, userId)),
    db.select({ total: sum(incomeTable.amount) }).from(incomeTable).where(and(eq(incomeTable.userId, userId), sql`${incomeTable.date} >= ${monthStart}`, sql`${incomeTable.date} <= ${monthEnd}`)),
    db.select({ total: sum(expensesTable.amount) }).from(expensesTable).where(and(eq(expensesTable.userId, userId), sql`${expensesTable.date} >= ${monthStart}`, sql`${expensesTable.date} <= ${monthEnd}`)),
  ]);

  const totalIncome = parseFloat(totalIncomeResult[0]?.total ?? "0");
  const totalExpenses = parseFloat(totalExpensesResult[0]?.total ?? "0");
  const monthlyIncome = parseFloat(monthlyIncomeResult[0]?.total ?? "0");
  const monthlyExpenses = parseFloat(monthlyExpensesResult[0]?.total ?? "0");

  const totalBalance = totalIncome - totalExpenses;
  const totalSavings = totalBalance;
  const monthlySavings = monthlyIncome - monthlyExpenses;
  const healthScore = monthlyIncome > 0 ? Math.min(100, Math.max(0, Math.round((monthlySavings / monthlyIncome) * 100 + 50))) : 50;

  const recentExpenses = await db.select().from(expensesTable).where(eq(expensesTable.userId, userId)).orderBy(sql`${expensesTable.date} DESC, ${expensesTable.createdAt} DESC`).limit(5);
  const recentIncome = await db.select().from(incomeTable).where(eq(incomeTable.userId, userId)).orderBy(sql`${incomeTable.date} DESC, ${incomeTable.createdAt} DESC`).limit(5);

  const recentTransactions = [
    ...recentExpenses.map(e => ({ id: e.id, type: "expense" as const, amount: parseFloat(e.amount), category: e.category, note: e.note ?? null, date: e.date })),
    ...recentIncome.map(i => ({ id: i.id, type: "income" as const, amount: parseFloat(i.amount), category: i.category, note: i.note ?? null, date: i.date })),
  ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);

  const budgets = await db.select().from(budgetsTable).where(and(eq(budgetsTable.userId, userId), eq(budgetsTable.month, currentMonth), eq(budgetsTable.year, currentYear)));

  const budgetAlerts = await Promise.all(budgets.map(async (b) => {
    const [spentResult] = await db.select({ total: sum(expensesTable.amount) }).from(expensesTable).where(and(
      eq(expensesTable.userId, userId),
      eq(expensesTable.category, b.category),
      sql`${expensesTable.date} >= ${monthStart}`,
      sql`${expensesTable.date} <= ${monthEnd}`,
    ));
    const spent = parseFloat(spentResult?.total ?? "0");
    const limitAmount = parseFloat(b.limitAmount);
    const percentage = limitAmount > 0 ? (spent / limitAmount) * 100 : 0;
    return { category: b.category, limitAmount, spent, percentage: Math.round(percentage * 10) / 10 };
  }));

  res.json({
    totalBalance,
    totalIncome,
    totalExpenses,
    totalSavings,
    monthlyIncome,
    monthlyExpenses,
    monthlySavings,
    healthScore,
    recentTransactions,
    budgetAlerts: budgetAlerts.filter(b => b.percentage >= 70),
  });
});

export default router;
