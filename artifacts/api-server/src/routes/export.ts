import { Router } from "express";
import { db, expensesTable, incomeTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();
router.use(requireAuth);

function csvCell(value: string | number | null | undefined): string {
  const str = String(value ?? "");
  const sanitized = /^[=+\-@|%]/.test(str) ? `\t${str}` : str;
  return `"${sanitized.replace(/"/g, '""')}"`;
}

router.get("/export/csv", async (req, res) => {
  const userId = req.user!.userId;
  const { type = "all", startDate, endDate } = req.query as { type?: string; startDate?: string; endDate?: string };

  const rows: string[] = [];

  if (type === "expenses" || type === "all") {
    const conditions = [eq(expensesTable.userId, userId)];
    if (startDate) conditions.push(sql`${expensesTable.date} >= ${startDate}`);
    if (endDate) conditions.push(sql`${expensesTable.date} <= ${endDate}`);
    const expenses = await db.select().from(expensesTable).where(and(...conditions)).orderBy(sql`${expensesTable.date} DESC`);
    if (type === "all") rows.push(`"Type","Date","Amount","Category","Note"`);
    else rows.push(`"Date","Amount","Category","Note"`);
    for (const e of expenses) {
      if (type === "all") rows.push([csvCell("Expense"), csvCell(e.date), csvCell(e.amount), csvCell(e.category), csvCell(e.note)].join(","));
      else rows.push([csvCell(e.date), csvCell(e.amount), csvCell(e.category), csvCell(e.note)].join(","));
    }
  }

  if (type === "income") {
    const conditions = [eq(incomeTable.userId, userId)];
    if (startDate) conditions.push(sql`${incomeTable.date} >= ${startDate}`);
    if (endDate) conditions.push(sql`${incomeTable.date} <= ${endDate}`);
    const incomes = await db.select().from(incomeTable).where(and(...conditions)).orderBy(sql`${incomeTable.date} DESC`);
    rows.push(`"Date","Amount","Category","Source","Note"`);
    for (const i of incomes) {
      rows.push([csvCell(i.date), csvCell(i.amount), csvCell(i.category), csvCell(i.source), csvCell(i.note)].join(","));
    }
  }

  if (type === "all") {
    const conditions = [eq(incomeTable.userId, userId)];
    if (startDate) conditions.push(sql`${incomeTable.date} >= ${startDate}`);
    if (endDate) conditions.push(sql`${incomeTable.date} <= ${endDate}`);
    const incomes = await db.select().from(incomeTable).where(and(...conditions)).orderBy(sql`${incomeTable.date} DESC`);
    for (const i of incomes) {
      rows.push([csvCell("Income"), csvCell(i.date), csvCell(i.amount), csvCell(i.category), csvCell(i.note)].join(","));
    }
  }

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="expense-tracker-${type}-${Date.now()}.csv"`);
  res.send("\uFEFF" + rows.join("\r\n"));
});

export default router;
