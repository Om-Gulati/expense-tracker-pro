import { Router } from "express";
import { db, expensesTable, incomeTable } from "@workspace/db";
import { eq, and, sum, count, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();
router.use(requireAuth);

function lastDayOfMonth(year: number, month: number): string {
  const day = new Date(year, month, 0).getDate();
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

router.get("/analytics/monthly", async (req, res) => {
  const userId = req.user!.userId;
  const months = parseInt(req.query.months as string) || 6;

  const result = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endDate = lastDayOfMonth(year, month);

    const [incomeResult, expensesResult] = await Promise.all([
      db.select({ total: sum(incomeTable.amount) }).from(incomeTable).where(and(
        eq(incomeTable.userId, userId),
        sql`${incomeTable.date} >= ${startDate}`,
        sql`${incomeTable.date} <= ${endDate}`,
      )),
      db.select({ total: sum(expensesTable.amount) }).from(expensesTable).where(and(
        eq(expensesTable.userId, userId),
        sql`${expensesTable.date} >= ${startDate}`,
        sql`${expensesTable.date} <= ${endDate}`,
      )),
    ]);

    const income = parseFloat(incomeResult[0]?.total ?? "0");
    const expenses = parseFloat(expensesResult[0]?.total ?? "0");
    result.push({
      month: d.toLocaleString("default", { month: "short", year: "2-digit" }),
      income,
      expenses,
      savings: income - expenses,
    });
  }

  res.json(result);
});

router.get("/analytics/categories", async (req, res) => {
  const userId = req.user!.userId;
  const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };

  const conditions = [eq(expensesTable.userId, userId)];
  if (startDate) conditions.push(sql`${expensesTable.date} >= ${startDate}`);
  if (endDate) conditions.push(sql`${expensesTable.date} <= ${endDate}`);

  const rows = await db
    .select({
      category: expensesTable.category,
      amount: sum(expensesTable.amount),
      count: count(),
    })
    .from(expensesTable)
    .where(and(...conditions))
    .groupBy(expensesTable.category)
    .orderBy(sql`SUM(${expensesTable.amount}) DESC`);

  const totalAmount = rows.reduce((acc, r) => acc + parseFloat(r.amount ?? "0"), 0);
  res.json(rows.map(r => ({
    category: r.category,
    amount: parseFloat(r.amount ?? "0"),
    count: r.count,
    percentage: totalAmount > 0 ? Math.round((parseFloat(r.amount ?? "0") / totalAmount) * 1000) / 10 : 0,
  })));
});

router.get("/analytics/trends", async (req, res) => {
  const userId = req.user!.userId;
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const todayStr = now.toISOString().split("T")[0];
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split("T")[0];
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().split("T")[0];

  const [monthTotal, weekTotal, incomeTotal, topCatResult] = await Promise.all([
    db.select({ total: sum(expensesTable.amount) }).from(expensesTable).where(and(eq(expensesTable.userId, userId), sql`${expensesTable.date} >= ${thirtyDaysAgoStr}`, sql`${expensesTable.date} <= ${todayStr}`)),
    db.select({ total: sum(expensesTable.amount) }).from(expensesTable).where(and(eq(expensesTable.userId, userId), sql`${expensesTable.date} >= ${sevenDaysAgoStr}`, sql`${expensesTable.date} <= ${todayStr}`)),
    db.select({ total: sum(incomeTable.amount) }).from(incomeTable).where(and(eq(incomeTable.userId, userId), sql`${incomeTable.date} >= ${thirtyDaysAgoStr}`, sql`${incomeTable.date} <= ${todayStr}`)),
    db.select({ category: expensesTable.category, total: sum(expensesTable.amount) }).from(expensesTable).where(and(eq(expensesTable.userId, userId), sql`${expensesTable.date} >= ${thirtyDaysAgoStr}`)).groupBy(expensesTable.category).orderBy(sql`SUM(${expensesTable.amount}) DESC`).limit(1),
  ]);

  const monthlyAverage = parseFloat(monthTotal[0]?.total ?? "0");
  const weeklyAverage = parseFloat(weekTotal[0]?.total ?? "0");
  const monthlyIncome = parseFloat(incomeTotal[0]?.total ?? "0");
  const savingsRate = monthlyIncome > 0 ? Math.max(0, Math.round(((monthlyIncome - monthlyAverage) / monthlyIncome) * 100)) : 0;

  const recentExpenses = await db.select({ date: expensesTable.date }).from(expensesTable).where(and(eq(expensesTable.userId, userId))).orderBy(sql`${expensesTable.date} DESC`).limit(30);
  let streak = 0;
  const dateSet = new Set(recentExpenses.map(e => e.date));
  for (let i = 0; i < 30; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const ds = d.toISOString().split("T")[0];
    if (!dateSet.has(ds)) break;
    streak++;
  }

  res.json({
    dailyAverage: Math.round((monthlyAverage / 30) * 100) / 100,
    weeklyAverage: Math.round(weeklyAverage * 100) / 100,
    monthlyAverage,
    topCategory: topCatResult[0]?.category ?? "None",
    savingsRate,
    streak,
  });
});

router.get("/reports/monthly", async (req, res) => {
  const userId = req.user!.userId;
  const now = new Date();
  const year = parseInt(req.query.year as string) || now.getFullYear();
  const month = parseInt(req.query.month as string) || (now.getMonth() + 1);
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const endDate = lastDayOfMonth(year, month);

  const prevD = new Date(year, month - 2, 1);
  const prevYear = prevD.getFullYear();
  const prevMonth = prevD.getMonth() + 1;
  const prevStart = `${prevYear}-${String(prevMonth).padStart(2, "0")}-01`;
  const prevEnd = lastDayOfMonth(prevYear, prevMonth);

  const [incomeResult, expensesResult, prevIncomeResult, prevExpensesResult, categoryRows] = await Promise.all([
    db.select({ total: sum(incomeTable.amount) }).from(incomeTable).where(and(eq(incomeTable.userId, userId), sql`${incomeTable.date} >= ${startDate}`, sql`${incomeTable.date} <= ${endDate}`)),
    db.select({ total: sum(expensesTable.amount) }).from(expensesTable).where(and(eq(expensesTable.userId, userId), sql`${expensesTable.date} >= ${startDate}`, sql`${expensesTable.date} <= ${endDate}`)),
    db.select({ total: sum(incomeTable.amount) }).from(incomeTable).where(and(eq(incomeTable.userId, userId), sql`${incomeTable.date} >= ${prevStart}`, sql`${incomeTable.date} <= ${prevEnd}`)),
    db.select({ total: sum(expensesTable.amount) }).from(expensesTable).where(and(eq(expensesTable.userId, userId), sql`${expensesTable.date} >= ${prevStart}`, sql`${expensesTable.date} <= ${prevEnd}`)),
    db.select({ category: expensesTable.category, amount: sum(expensesTable.amount), count: count() }).from(expensesTable).where(and(eq(expensesTable.userId, userId), sql`${expensesTable.date} >= ${startDate}`, sql`${expensesTable.date} <= ${endDate}`)).groupBy(expensesTable.category).orderBy(sql`SUM(${expensesTable.amount}) DESC`),
  ]);

  const totalIncome = parseFloat(incomeResult[0]?.total ?? "0");
  const totalExpenses = parseFloat(expensesResult[0]?.total ?? "0");
  const prevIncome = parseFloat(prevIncomeResult[0]?.total ?? "0");
  const prevExpenses = parseFloat(prevExpensesResult[0]?.total ?? "0");
  const savings = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? Math.round((savings / totalIncome) * 100) : 0;
  const prevSavings = prevIncome - prevExpenses;
  const totalCatAmount = categoryRows.reduce((a, r) => a + parseFloat(r.amount ?? "0"), 0);

  const insights: string[] = [];
  if (savings > 0) insights.push(`You saved ${savings.toFixed(2)} this month.`);
  if (savingsRate >= 20) insights.push("Great savings rate — you're on track to meet your goals.");
  if (totalExpenses > prevExpenses && prevExpenses > 0) insights.push(`Spending rose ${Math.round(((totalExpenses - prevExpenses) / prevExpenses) * 100)}% vs last month.`);
  if (totalExpenses < prevExpenses && prevExpenses > 0) insights.push(`Spending dropped ${Math.round(((prevExpenses - totalExpenses) / prevExpenses) * 100)}% vs last month — great discipline!`);
  if (categoryRows[0]) insights.push(`Biggest spend category: ${categoryRows[0].category} at ${parseFloat(categoryRows[0].amount ?? "0").toFixed(2)}.`);
  if (savings <= 0 && totalIncome > 0) insights.push("Expenses exceeded income this month. Consider reviewing your budget limits.");

  res.json({
    year, month, totalIncome, totalExpenses, savings, savingsRate,
    highestExpenseCategory: categoryRows[0]?.category ?? "None",
    categoryBreakdown: categoryRows.map(r => ({
      category: r.category,
      amount: parseFloat(r.amount ?? "0"),
      count: r.count,
      percentage: totalCatAmount > 0 ? Math.round((parseFloat(r.amount ?? "0") / totalCatAmount) * 1000) / 10 : 0,
    })),
    previousMonthComparison: {
      incomeChange: totalIncome - prevIncome,
      expenseChange: totalExpenses - prevExpenses,
      savingsChange: savings - prevSavings,
    },
    insights,
  });
});

export default router;
