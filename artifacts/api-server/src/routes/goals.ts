import { Router } from "express";
import { db, goalsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { CreateGoalBody, UpdateGoalBody, UpdateGoalParams, DeleteGoalParams } from "@workspace/api-zod";

const router = Router();
router.use(requireAuth);

function formatGoal(g: typeof goalsTable.$inferSelect) {
  return {
    id: g.id,
    userId: g.userId,
    title: g.title,
    targetAmount: parseFloat(g.targetAmount),
    currentAmount: parseFloat(g.currentAmount),
    deadline: g.deadline ?? null,
    createdAt: g.createdAt.toISOString(),
  };
}

router.get("/goals", async (req, res) => {
  const goals = await db.select().from(goalsTable).where(eq(goalsTable.userId, req.user!.userId));
  res.json(goals.map(formatGoal));
});

router.post("/goals", async (req, res) => {
  const parsed = CreateGoalBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { title, targetAmount, currentAmount = 0, deadline } = parsed.data;
  const [goal] = await db.insert(goalsTable).values({
    userId: req.user!.userId,
    title,
    targetAmount: targetAmount.toString(),
    currentAmount: currentAmount.toString(),
    deadline,
  }).returning();
  res.status(201).json(formatGoal(goal));
});

router.put("/goals/:id", async (req, res) => {
  const idParsed = UpdateGoalParams.safeParse({ id: parseInt(req.params.id) });
  if (!idParsed.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const bodyParsed = UpdateGoalBody.safeParse(req.body);
  if (!bodyParsed.success) { res.status(400).json({ error: bodyParsed.error.message }); return; }

  const updates: Record<string, unknown> = {};
  const { title, targetAmount, currentAmount, deadline } = bodyParsed.data;
  if (title !== undefined) updates.title = title;
  if (targetAmount !== undefined) updates.targetAmount = targetAmount.toString();
  if (currentAmount !== undefined) updates.currentAmount = currentAmount.toString();
  if (deadline !== undefined) updates.deadline = deadline;

  const [goal] = await db.update(goalsTable).set(updates).where(and(eq(goalsTable.id, idParsed.data.id), eq(goalsTable.userId, req.user!.userId))).returning();
  if (!goal) { res.status(404).json({ error: "Not found" }); return; }
  res.json(formatGoal(goal));
});

router.delete("/goals/:id", async (req, res) => {
  const idParsed = DeleteGoalParams.safeParse({ id: parseInt(req.params.id) });
  if (!idParsed.success) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(goalsTable).where(and(eq(goalsTable.id, idParsed.data.id), eq(goalsTable.userId, req.user!.userId)));
  res.json({ message: "Deleted" });
});

export default router;
