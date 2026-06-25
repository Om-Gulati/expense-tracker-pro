import { Router } from "express";
import { db, expensesTable, incomeTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();
router.use(requireAuth);

router.get("/export/csv", async (req, res) => {
  const userId = req.user!.userId;
  const { type = "all", startDate, endDate } = req.query as { type?: string; startDate?: string; endDate?: string };

  const rows: string[] = [];

  if (type === "expenses" || type === "all") {
    const conditions = [eq(expensesTable.userId, userId)];
    if (startDate) conditions.push(sql`${expensesTable.date} >= ${startDate}`);
    if (endDate) conditions.push(sql`${expensesTable.date} <= ${endDate}`);
    const expenses = await db.select().from(expensesTable).where(and(...conditions)).orderBy(sql`${expensesTable.date} DESC`);
    if (type === "all") rows.push("Type,Date,Amount,Category,Note");
    else rows.push("Date,Amount,Category,Note");
    for (const e of expenses) {
      const note = (e.note ?? "").replace(/,/g, ";");
      if (type === "all") rows.push(`Expense,${e.date},${e.amount},${e.category},${note}`);
      else rows.push(`${e.date},${e.amount},${e.category},${note}`);
    }
  }

  if (type === "income") {
    const conditions = [eq(incomeTable.userId, userId)];
    if (startDate) conditions.push(sql`${incomeTable.date} >= ${startDate}`);
    if (endDate) conditions.push(sql`${incomeTable.date} <= ${endDate}`);
    const incomes = await db.select().from(incomeTable).where(and(...conditions)).orderBy(sql`${incomeTable.date} DESC`);
    rows.push("Date,Amount,Category,Source,Note");
    for (const i of incomes) {
      const note = (i.note ?? "").replace(/,/g, ";");
      const source = (i.source ?? "").replace(/,/g, ";");
      rows.push(`${i.date},${i.amount},${i.category},${source},${note}`);
    }
  }

  if (type === "all") {
    const conditions = [eq(incomeTable.userId, userId)];
    if (startDate) conditions.push(sql`${incomeTable.date} >= ${startDate}`);
    if (endDate) conditions.push(sql`${incomeTable.date} <= ${endDate}`);
    const incomes = await db.select().from(incomeTable).where(and(...conditions)).orderBy(sql`${incomeTable.date} DESC`);
    for (const i of incomes) {
      const note = (i.note ?? "").replace(/,/g, ";");
      rows.push(`Income,${i.date},${i.amount},${i.category},${note}`);
    }
  }

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="expense-tracker-${type}-${Date.now()}.csv"`);
  res.send(rows.join("\n"));
});

export default router;
