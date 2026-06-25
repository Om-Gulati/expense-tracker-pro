import { Router } from "express";
import { db, incomeTable } from "@workspace/db";
import { eq, and, gte, lte, count, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { CreateIncomeBody, UpdateIncomeBody, GetIncomeListQueryParams, UpdateIncomeParams, DeleteIncomeParams } from "@workspace/api-zod";

const router = Router();
router.use(requireAuth);

function formatIncome(i: typeof incomeTable.$inferSelect) {
  return {
    id: i.id,
    userId: i.userId,
    amount: parseFloat(i.amount),
    category: i.category,
    source: i.source ?? null,
    note: i.note ?? null,
    date: i.date,
    createdAt: i.createdAt.toISOString(),
  };
}

router.get("/income", async (req, res) => {
  const params = GetIncomeListQueryParams.safeParse(req.query);
  const userId = req.user!.userId;
  const { category, startDate, endDate, page = 1, limit = 20 } = params.success ? params.data : { category: undefined, startDate: undefined, endDate: undefined, page: 1, limit: 20 };

  const conditions = [eq(incomeTable.userId, userId)];
  if (category) conditions.push(eq(incomeTable.category, category));
  if (startDate) conditions.push(gte(incomeTable.date, startDate));
  if (endDate) conditions.push(lte(incomeTable.date, endDate));

  const where = and(...conditions);
  const offset = ((page as number) - 1) * (limit as number);

  const [data, totalResult] = await Promise.all([
    db.select().from(incomeTable).where(where).orderBy(sql`${incomeTable.date} DESC, ${incomeTable.createdAt} DESC`).limit(limit as number).offset(offset),
    db.select({ count: count() }).from(incomeTable).where(where),
  ]);

  const total = totalResult[0]?.count ?? 0;
  res.json({
    data: data.map(formatIncome),
    total,
    page: page as number,
    limit: limit as number,
    totalPages: Math.ceil(total / (limit as number)),
  });
});

router.post("/income", async (req, res) => {
  const parsed = CreateIncomeBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { amount, category, source, note, date } = parsed.data;
  const [income] = await db.insert(incomeTable).values({ userId: req.user!.userId, amount: amount.toString(), category, source, note, date }).returning();
  res.status(201).json(formatIncome(income));
});

router.put("/income/:id", async (req, res) => {
  const idParsed = UpdateIncomeParams.safeParse({ id: parseInt(req.params.id) });
  if (!idParsed.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const bodyParsed = UpdateIncomeBody.safeParse(req.body);
  if (!bodyParsed.success) { res.status(400).json({ error: bodyParsed.error.message }); return; }

  const updates: Record<string, unknown> = {};
  const { amount, category, source, note, date } = bodyParsed.data;
  if (amount !== undefined) updates.amount = amount.toString();
  if (category !== undefined) updates.category = category;
  if (source !== undefined) updates.source = source;
  if (note !== undefined) updates.note = note;
  if (date !== undefined) updates.date = date;

  const [income] = await db.update(incomeTable).set(updates).where(and(eq(incomeTable.id, idParsed.data.id), eq(incomeTable.userId, req.user!.userId))).returning();
  if (!income) { res.status(404).json({ error: "Not found" }); return; }
  res.json(formatIncome(income));
});

router.delete("/income/:id", async (req, res) => {
  const idParsed = DeleteIncomeParams.safeParse({ id: parseInt(req.params.id) });
  if (!idParsed.success) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(incomeTable).where(and(eq(incomeTable.id, idParsed.data.id), eq(incomeTable.userId, req.user!.userId)));
  res.json({ message: "Deleted" });
});

export default router;
