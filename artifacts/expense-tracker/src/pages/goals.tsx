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
import { useCurrency } from "@/hooks/use-currency";

function daysLeft(deadline: string | null | undefined) {
  if (!deadline) return null;
  const diff = new Date(deadline).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

type Goal = { id: number; userId: number; title: string; targetAmount: number; currentAmount: number; deadline: string | null; createdAt: string };

export default function GoalsPage() {
  const queryClient = useQueryClient();
  const { format } = useCurrency();
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<Goal | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState({ title: "", targetAmount: "", currentAmount: "0", deadline: "" });

  const { data: goals, isLoading } = useGetGoals();
  const createMutation = useCreateGoal({ mutation: { onSuccess: () => { toast.success("Goal created"); invalidate(); closeModal(); }, onError: () => toast.error("Failed to create goal") } });
  const updateMutation = useUpdateGoal({ mutation: { onSuccess: () => { toast.success("Goal updated"); invalidate(); closeModal(); }, onError: () => toast.error("Failed to update goal") } });
  const deleteMutation = useDeleteGoal({ mutation: { onSuccess: () => { toast.success("Goal deleted"); invalidate(); setDeleteId(null); }, onError: () => toast.error("Failed to delete goal") } });

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

  const totalTarget = goals?.reduce((s, g) => s + g.targetAmount, 0) ?? 0;
  const totalSaved = goals?.reduce((s, g) => s + g.currentAmount, 0) ?? 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Financial Goals</h1>
          <p className="text-sm text-muted-foreground">Track your savings milestones</p>
        </div>
        <Button size="sm" onClick={() => setShowModal(true)}><Plus className="h-4 w-4 mr-1.5" />New Goal</Button>
      </div>

      {goals && goals.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground mb-1">Total Target</p><p className="text-lg font-bold text-foreground">{format(totalTarget)}</p></CardContent></Card>
          <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground mb-1">Total Saved</p><p className="text-lg font-bold text-primary">{format(totalSaved)}</p></CardContent></Card>
          <Card className="col-span-2 sm:col-span-1"><CardContent className="pt-4"><p className="text-xs text-muted-foreground mb-1">Still Needed</p><p className="text-lg font-bold text-muted-foreground">{format(Math.max(0, totalTarget - totalSaved))}</p></CardContent></Card>
        </div>
      )}

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">{[...Array(4)].map((_, i) => <Card key={i}><CardContent className="pt-5"><Skeleton className="h-32 w-full" /></CardContent></Card>)}</div>
      ) : !goals?.length ? (
        <Card>
          <CardContent className="py-14 text-center">
            <Target className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-3">No goals yet. Set one to start tracking your progress.</p>
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
              <Card key={g.id} className={cn(achieved && "border-primary/50 bg-primary/[0.02]")}>
                <CardContent className="pt-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2 min-w-0">
                      {achieved
                        ? <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                        : <Target className="h-5 w-5 text-muted-foreground shrink-0" />}
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground truncate">{g.title}</p>
                        {g.deadline && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <span className={cn("text-xs", days !== null && days < 30 && days > 0 ? "text-amber-500" : days !== null && days <= 0 ? "text-destructive" : "text-muted-foreground")}>
                              {days !== null && days <= 0 ? "Deadline passed" : days !== null ? `${days} days left` : g.deadline}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0 ml-2">
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEdit(g as Goal)}><Pencil className="h-3 w-3" /></Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => setDeleteId(g.id)}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  </div>
                  <Progress value={pct} className={cn("h-2.5 mb-2", achieved && "[&>div]:bg-primary")} />
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-foreground">{format(g.currentAmount)}</span>
                    <span className="text-muted-foreground">of {format(g.targetAmount)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {achieved ? "Goal achieved!" : `${format(g.targetAmount - g.currentAmount)} to go (${pct.toFixed(0)}%)`}
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
            <div className="space-y-1.5"><Label>Goal name</Label><Input placeholder="e.g. Emergency Fund, Vacation..." value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required autoFocus /></div>
            <div className="space-y-1.5"><Label>Target amount</Label><Input type="number" step="0.01" min="0" placeholder="0.00" value={form.targetAmount} onChange={e => setForm(f => ({ ...f, targetAmount: e.target.value }))} required /></div>
            <div className="space-y-1.5"><Label>Already saved</Label><Input type="number" step="0.01" min="0" placeholder="0.00" value={form.currentAmount} onChange={e => setForm(f => ({ ...f, currentAmount: e.target.value }))} /></div>
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
          <AlertDialogHeader><AlertDialogTitle>Delete goal?</AlertDialogTitle><AlertDialogDescription>This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId !== null && deleteMutation.mutate({ id: deleteId })} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
