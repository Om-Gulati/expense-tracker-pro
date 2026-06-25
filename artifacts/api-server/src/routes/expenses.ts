import { Router } from "express";
import { db, expensesTable } from "@workspace/db";
import { eq, and, gte, lte, ilike, count, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { CreateExpenseBody, UpdateExpenseBody, GetExpensesQueryParams, GetExpenseParams, UpdateExpenseParams, DeleteExpenseParams } from "@workspace/api-zod";

const router = Router();
router.use(requireAuth);

function formatExpense(e: typeof expensesTable.$inferSelect) {
  return {
    id: e.id,
    userId: e.userId,
    amount: parseFloat(e.amount),
    category: e.category,
    note: e.note ?? null,
    date: e.date,
    createdAt: e.createdAt.toISOString(),
  };
}

router.get("/expenses", async (req, res) => {
  const params = GetExpensesQueryParams.safeParse(req.query);
  const userId = req.user!.userId;
  const { category, startDate, endDate, search, page = 1, limit = 20 } = params.success ? params.data : { category: undefined, startDate: undefined, endDate: undefined, search: undefined, page: 1, limit: 20 };

  const conditions = [eq(expensesTable.userId, userId)];
  if (category) conditions.push(eq(expensesTable.category, category));
  if (startDate) conditions.push(gte(expensesTable.date, startDate));
  if (endDate) conditions.push(lte(expensesTable.date, endDate));
  if (search) conditions.push(ilike(expensesTable.note, `%${search}%`));

  const where = and(...conditions);
  const offset = ((page as number) - 1) * (limit as number);

  const [data, totalResult] = await Promise.all([
    db.select().from(expensesTable).where(where).orderBy(sql`${expensesTable.date} DESC, ${expensesTable.createdAt} DESC`).limit(limit as number).offset(offset),
    db.select({ count: count() }).from(expensesTable).where(where),
  ]);

  const total = totalResult[0]?.count ?? 0;
  res.json({
    data: data.map(formatExpense),
    total,
    page: page as number,
    limit: limit as number,
    totalPages: Math.ceil(total / (limit as number)),
  });
});

router.post("/expenses", async (req, res) => {
  const parsed = CreateExpenseBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { amount, category, note, date } = parsed.data;
  const [expense] = await db.insert(expensesTable).values({
    userId: req.user!.userId,
    amount: amount.toString(),
    category,
    note,
    date,
  }).returning();
  res.status(201).json(formatExpense(expense));
});

router.get("/expenses/:id", async (req, res) => {
  const parsed = GetExpenseParams.safeParse({ id: parseInt(req.params.id) });
  if (!parsed.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const [expense] = await db.select().from(expensesTable).where(and(eq(expensesTable.id, parsed.data.id), eq(expensesTable.userId, req.user!.userId))).limit(1);
  if (!expense) { res.status(404).json({ error: "Not found" }); return; }
  res.json(formatExpense(expense));
});

router.put("/expenses/:id", async (req, res) => {
  const idParsed = UpdateExpenseParams.safeParse({ id: parseInt(req.params.id) });
  if (!idParsed.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const bodyParsed = UpdateExpenseBody.safeParse(req.body);
  if (!bodyParsed.success) { res.status(400).json({ error: bodyParsed.error.message }); return; }

  const updates: Record<string, unknown> = {};
  const { amount, category, note, date } = bodyParsed.data;
  if (amount !== undefined) updates.amount = amount.toString();
  if (category !== undefined) updates.category = category;
  if (note !== undefined) updates.note = note;
  if (date !== undefined) updates.date = date;

  const [expense] = await db.update(expensesTable).set(updates).where(and(eq(expensesTable.id, idParsed.data.id), eq(expensesTable.userId, req.user!.userId))).returning();
  if (!expense) { res.status(404).json({ error: "Not found" }); return; }
  res.json(formatExpense(expense));
});

router.delete("/expenses/:id", async (req, res) => {
  const idParsed = DeleteExpenseParams.safeParse({ id: parseInt(req.params.id) });
  if (!idParsed.success) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(expensesTable).where(and(eq(expensesTable.id, idParsed.data.id), eq(expensesTable.userId, req.user!.userId)));
  res.json({ message: "Deleted" });
});

export default router;
