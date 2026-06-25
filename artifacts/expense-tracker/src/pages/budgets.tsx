import { useState } from "react";
import { useGetBudgets, useCreateBudget, useUpdateBudget, useDeleteBudget, getGetBudgetsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const CATEGORIES = ["Food", "Transport", "Shopping", "Bills", "Entertainment", "Health", "Education", "Travel", "Miscellaneous"];

function formatCurrency(v: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);
}

type BudgetWithSpending = { id: number; userId: number; category: string; limitAmount: number; month: number; year: number; spent: number; remaining: number; percentage: number; createdAt: string };

export default function BudgetsPage() {
  const queryClient = useQueryClient();
  const now = new Date();
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<BudgetWithSpending | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState({ category: "", limitAmount: "", month: String(now.getMonth() + 1), year: String(now.getFullYear()) });

  const { data: budgets, isLoading } = useGetBudgets();
  const createMutation = useCreateBudget({ mutation: { onSuccess: () => { toast.success("Budget created"); invalidate(); closeModal(); }, onError: () => toast.error("Failed") } });
  const updateMutation = useUpdateBudget({ mutation: { onSuccess: () => { toast.success("Budget updated"); invalidate(); closeModal(); }, onError: () => toast.error("Failed") } });
  const deleteMutation = useDeleteBudget({ mutation: { onSuccess: () => { toast.success("Budget deleted"); invalidate(); setDeleteId(null); }, onError: () => toast.error("Failed") } });

  function invalidate() { queryClient.invalidateQueries({ queryKey: getGetBudgetsQueryKey() }); }
  function closeModal() { setShowModal(false); setEditItem(null); setForm({ category: "", limitAmount: "", month: String(now.getMonth() + 1), year: String(now.getFullYear()) }); }
  function openEdit(b: BudgetWithSpending) { setEditItem(b); setForm({ category: b.category, limitAmount: b.limitAmount.toString(), month: String(b.month), year: String(b.year) }); setShowModal(true); }

  const handleSubmit = (ev: React.FormEvent) => {
    ev.preventDefault();
    const payload = { category: form.category, limitAmount: parseFloat(form.limitAmount), month: parseInt(form.month), year: parseInt(form.year) };
    if (editItem) updateMutation.mutate({ id: editItem.id, data: { limitAmount: payload.limitAmount } });
    else createMutation.mutate({ data: payload });
  };

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Budgets</h1>
          <p className="text-sm text-muted-foreground">Set spending limits by category for {monthNames[now.getMonth()]} {now.getFullYear()}</p>
        </div>
        <Button size="sm" onClick={() => setShowModal(true)}><Plus className="h-4 w-4 mr-1.5" />Set Budget</Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[...Array(6)].map((_, i) => <Card key={i}><CardContent className="pt-5"><Skeleton className="h-24 w-full" /></CardContent></Card>)}</div>
      ) : !budgets?.length ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-muted-foreground mb-3">No budgets set for this month.</p>
            <Button size="sm" onClick={() => setShowModal(true)}><Plus className="h-4 w-4 mr-1.5" />Set your first budget</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {budgets.map(b => {
            const pct = Math.min(b.percentage, 100);
            const over = b.percentage >= 100;
            const warning = b.percentage >= 80 && !over;
            return (
              <Card key={b.id} className={cn("relative", over && "border-destructive/50", warning && "border-amber-500/50")}>
                <CardContent className="pt-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold text-foreground">{b.category}</p>
                      <p className="text-xs text-muted-foreground">{monthNames[b.month - 1]} {b.year}</p>
                    </div>
                    <div className="flex gap-1">
                      {over ? <AlertTriangle className="h-4 w-4 text-destructive" /> : warning ? <AlertTriangle className="h-4 w-4 text-amber-500" /> : <CheckCircle2 className="h-4 w-4 text-primary" />}
                      <Button variant="ghost" size="icon" className="h-6 w-6 -mr-1" onClick={() => openEdit(b as BudgetWithSpending)}><Pencil className="h-3 w-3" /></Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6 -mr-1 text-destructive" onClick={() => setDeleteId(b.id)}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  </div>
                  <Progress
                    value={pct}
                    className={cn("h-2 mb-2", over && "[&>div]:bg-destructive", warning && "[&>div]:bg-amber-500")}
                  />
                  <div className="flex justify-between text-xs">
                    <span className={cn("font-medium", over ? "text-destructive" : warning ? "text-amber-500" : "text-foreground")}>
                      {formatCurrency(b.spent)} spent
                    </span>
                    <span className="text-muted-foreground">{formatCurrency(b.limitAmount)} limit</span>
                  </div>
                  <p className={cn("text-xs mt-1", b.remaining >= 0 ? "text-muted-foreground" : "text-destructive")}>
                    {b.remaining >= 0 ? `${formatCurrency(b.remaining)} remaining` : `${formatCurrency(Math.abs(b.remaining))} over budget`}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={showModal} onOpenChange={(o) => { if (!o) closeModal(); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editItem ? "Edit Budget" : "Set Budget"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!editItem && (
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5"><Label>Monthly Limit</Label><Input type="number" step="0.01" min="0" placeholder="0.00" value={form.limitAmount} onChange={e => setForm(f => ({ ...f, limitAmount: e.target.value }))} required /></div>
            {!editItem && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Month</Label>
                  <Select value={form.month} onValueChange={v => setForm(f => ({ ...f, month: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{monthNames.map((m, i) => <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label>Year</Label><Input type="number" value={form.year} onChange={e => setForm(f => ({ ...f, year: e.target.value }))} required /></div>
              </div>
            )}
            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={closeModal}>Cancel</Button>
              <Button type="submit" className="flex-1" disabled={createMutation.isPending || updateMutation.isPending}>
                {(createMutation.isPending || updateMutation.isPending) ? "Saving..." : editItem ? "Update" : "Create"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteId !== null} onOpenChange={(o) => { if (!o) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete budget?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId !== null && deleteMutation.mutate({ id: deleteId })} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
