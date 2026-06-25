import { useState } from "react";
import { useGetGoals, useCreateGoal, useUpdateGoal, useDeleteGoal, getGetGoalsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Target, CheckCircle2, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

function formatCurrency(v: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);
}

function daysLeft(deadline: string | null | undefined) {
  if (!deadline) return null;
  const diff = new Date(deadline).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

type Goal = { id: number; userId: number; title: string; targetAmount: number; currentAmount: number; deadline: string | null; createdAt: string };

export default function GoalsPage() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<Goal | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState({ title: "", targetAmount: "", currentAmount: "0", deadline: "" });

  const { data: goals, isLoading } = useGetGoals();
  const createMutation = useCreateGoal({ mutation: { onSuccess: () => { toast.success("Goal created"); invalidate(); closeModal(); }, onError: () => toast.error("Failed") } });
  const updateMutation = useUpdateGoal({ mutation: { onSuccess: () => { toast.success("Goal updated"); invalidate(); closeModal(); }, onError: () => toast.error("Failed") } });
  const deleteMutation = useDeleteGoal({ mutation: { onSuccess: () => { toast.success("Goal deleted"); invalidate(); setDeleteId(null); }, onError: () => toast.error("Failed") } });

  function invalidate() { queryClient.invalidateQueries({ queryKey: getGetGoalsQueryKey() }); }
  function closeModal() { setShowModal(false); setEditItem(null); setForm({ title: "", targetAmount: "", currentAmount: "0", deadline: "" }); }
  function openEdit(g: Goal) { setEditItem(g); setForm({ title: g.title, targetAmount: g.targetAmount.toString(), currentAmount: g.currentAmount.toString(), deadline: g.deadline ?? "" }); setShowModal(true); }

  const handleSubmit = (ev: React.FormEvent) => {
    ev.preventDefault();
    const payload = {
      title: form.title,
      targetAmount: parseFloat(form.targetAmount),
      currentAmount: parseFloat(form.currentAmount || "0"),
      deadline: form.deadline || undefined,
    };
    if (editItem) updateMutation.mutate({ id: editItem.id, data: payload });
    else createMutation.mutate({ data: payload });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Financial Goals</h1>
          <p className="text-sm text-muted-foreground">Track your savings milestones</p>
        </div>
        <Button size="sm" onClick={() => setShowModal(true)}><Plus className="h-4 w-4 mr-1.5" />New Goal</Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">{[...Array(4)].map((_, i) => <Card key={i}><CardContent className="pt-5"><Skeleton className="h-32 w-full" /></CardContent></Card>)}</div>
      ) : !goals?.length ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Target className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-3">No financial goals yet. Set one to get started.</p>
            <Button size="sm" onClick={() => setShowModal(true)}><Plus className="h-4 w-4 mr-1.5" />Create your first goal</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {goals.map(g => {
            const pct = g.targetAmount > 0 ? Math.min((g.currentAmount / g.targetAmount) * 100, 100) : 0;
            const achieved = g.currentAmount >= g.targetAmount;
            const days = daysLeft(g.deadline);
            return (
              <Card key={g.id} className={cn(achieved && "border-primary/50")}>
                <CardContent className="pt-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2">
                      {achieved ? <CheckCircle2 className="h-5 w-5 text-primary shrink-0" /> : <Target className="h-5 w-5 text-muted-foreground shrink-0" />}
                      <div>
                        <p className="font-semibold text-foreground">{g.title}</p>
                        {g.deadline && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <span className={cn("text-xs", days !== null && days < 30 ? "text-amber-500" : "text-muted-foreground")}>
                              {days !== null && days < 0 ? "Deadline passed" : days !== null ? `${days} days left` : g.deadline}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEdit(g as Goal)}><Pencil className="h-3 w-3" /></Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => setDeleteId(g.id)}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  </div>
                  <Progress value={pct} className={cn("h-2.5 mb-2", achieved && "[&>div]:bg-primary")} />
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-foreground">{formatCurrency(g.currentAmount)}</span>
                    <span className="text-muted-foreground">{formatCurrency(g.targetAmount)} goal</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {achieved ? "Goal achieved!" : `${formatCurrency(g.targetAmount - g.currentAmount)} remaining (${pct.toFixed(0)}% complete)`}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={showModal} onOpenChange={(o) => { if (!o) closeModal(); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editItem ? "Edit Goal" : "New Financial Goal"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5"><Label>Goal name</Label><Input placeholder="e.g. Emergency Fund, Vacation..." value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required /></div>
            <div className="space-y-1.5"><Label>Target amount</Label><Input type="number" step="0.01" min="0" placeholder="0.00" value={form.targetAmount} onChange={e => setForm(f => ({ ...f, targetAmount: e.target.value }))} required /></div>
            <div className="space-y-1.5"><Label>Current saved amount</Label><Input type="number" step="0.01" min="0" placeholder="0.00" value={form.currentAmount} onChange={e => setForm(f => ({ ...f, currentAmount: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Deadline (optional)</Label><Input type="date" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} /></div>
            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={closeModal}>Cancel</Button>
              <Button type="submit" className="flex-1" disabled={createMutation.isPending || updateMutation.isPending}>
                {(createMutation.isPending || updateMutation.isPending) ? "Saving..." : editItem ? "Update" : "Create Goal"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteId !== null} onOpenChange={(o) => { if (!o) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete goal?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId !== null && deleteMutation.mutate({ id: deleteId })} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
