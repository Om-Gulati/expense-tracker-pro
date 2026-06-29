import { useState } from "react";
import { useGetDashboard, useCreateExpense, useCreateIncome, getGetDashboardQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { DollarSign, TrendingUp, TrendingDown, PiggyBank, Activity, Plus, ArrowUpRight, ArrowDownRight, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useCurrency } from "@/hooks/use-currency";

const EXPENSE_CATEGORIES = ["Food", "Transport", "Shopping", "Bills", "Entertainment", "Health", "Education", "Travel", "Miscellaneous"];
const INCOME_CATEGORIES = ["Salary", "Freelancing", "Business", "Investments", "Gifts", "Other"];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { format } = useCurrency();
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useGetDashboard();
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [form, setForm] = useState({ amount: "", category: "", note: "", date: new Date().toISOString().split("T")[0] });

  const createExpense = useCreateExpense({
    mutation: {
      onSuccess: () => {
        toast.success("Expense added");
        queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
        setShowExpenseModal(false);
        setForm({ amount: "", category: "", note: "", date: new Date().toISOString().split("T")[0] });
      },
      onError: () => toast.error("Failed to add expense"),
    }
  });

  const createIncome = useCreateIncome({
    mutation: {
      onSuccess: () => {
        toast.success("Income added");
        queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
        setShowIncomeModal(false);
        setForm({ amount: "", category: "", note: "", date: new Date().toISOString().split("T")[0] });
      },
      onError: () => toast.error("Failed to add income"),
    }
  });

  const handleExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.category) { toast.error("Please select a category"); return; }
    createExpense.mutate({ data: { amount: parseFloat(form.amount), category: form.category, note: form.note || undefined, date: form.date } });
  };

  const handleIncomeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.category) { toast.error("Please select a category"); return; }
    createIncome.mutate({ data: { amount: parseFloat(form.amount), category: form.category, note: form.note || undefined, date: form.date } });
  };

  if (isLoading) return <DashboardSkeleton />;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <p className="text-destructive font-medium">Failed to load dashboard</p>
        <Button size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() })}>Retry</Button>
      </div>
    );
  }

  const stats = data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Good {getGreeting()}, {user?.name?.split(" ")[0]}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Here's your financial overview</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => { setForm({ amount: "", category: "", note: "", date: new Date().toISOString().split("T")[0] }); setShowIncomeModal(true); }}>
            <Plus className="h-4 w-4 mr-1" /> Income
          </Button>
          <Button size="sm" onClick={() => { setForm({ amount: "", category: "", note: "", date: new Date().toISOString().split("T")[0] }); setShowExpenseModal(true); }}>
            <Plus className="h-4 w-4 mr-1" /> Expense
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Balance" value={format(stats?.totalBalance ?? 0)} icon={DollarSign} subtitle="All time net" color="primary" />
        <StatCard title="Monthly Income" value={format(stats?.monthlyIncome ?? 0)} icon={TrendingUp} subtitle="This month" color="green" />
        <StatCard title="Monthly Expenses" value={format(stats?.monthlyExpenses ?? 0)} icon={TrendingDown} subtitle="This month" color="red" />
        <StatCard title="Monthly Savings" value={format(stats?.monthlySavings ?? 0)} icon={PiggyBank} subtitle="Income minus expenses" color={(stats?.monthlySavings ?? 0) >= 0 ? "blue" : "red"} />
      </div>

      {/* Health + budget alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" /> Financial Health Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2 mb-3">
              <span className="text-4xl font-bold text-foreground">{stats?.healthScore ?? 50}</span>
              <span className="text-lg text-muted-foreground mb-1">/100</span>
            </div>
            <Progress value={stats?.healthScore ?? 50} className="h-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {(stats?.healthScore ?? 0) >= 70 ? "Excellent financial health" : (stats?.healthScore ?? 0) >= 50 ? "Good — room to improve" : "Consider reducing expenses"}
            </p>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" /> Budget Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!stats?.budgetAlerts?.length ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                <span className="h-2 w-2 rounded-full bg-primary" />
                All budgets on track — no alerts this month.
              </div>
            ) : (
              <div className="space-y-3">
                {stats.budgetAlerts.map(b => (
                  <div key={b.category}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-foreground">{b.category}</span>
                      <span className={cn("font-semibold", b.percentage >= 100 ? "text-destructive" : "text-amber-500")}>
                        {format(b.spent)} / {format(b.limitAmount)} ({b.percentage.toFixed(0)}%)
                      </span>
                    </div>
                    <Progress value={Math.min(b.percentage, 100)} className={cn("h-1.5", b.percentage >= 100 ? "[&>div]:bg-destructive" : "[&>div]:bg-amber-500")} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent transactions */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Recent Transactions</CardTitle>
            {stats?.recentTransactions?.length ? (
              <Badge variant="secondary" className="text-xs">{stats.recentTransactions.length} records</Badge>
            ) : null}
          </div>
        </CardHeader>
        <CardContent>
          {!stats?.recentTransactions?.length ? (
            <div className="py-10 text-center">
              <p className="text-sm text-muted-foreground mb-2">No transactions yet.</p>
              <p className="text-xs text-muted-foreground">Add an expense or income above to get started.</p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {stats.recentTransactions.map((t, idx) => (
                <div key={`${t.type}-${t.id}-${idx}`} className="flex items-center gap-3 py-2.5 border-b border-border/40 last:border-0">
                  <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full", t.type === "income" ? "bg-primary/10" : "bg-destructive/10")}>
                    {t.type === "income"
                      ? <ArrowUpRight className="h-4 w-4 text-primary" />
                      : <ArrowDownRight className="h-4 w-4 text-destructive" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{t.category}</p>
                    <p className="text-xs text-muted-foreground truncate">{t.note ? t.note : t.date}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={cn("text-sm font-semibold", t.type === "income" ? "text-primary" : "text-destructive")}>
                      {t.type === "income" ? "+" : "-"}{format(t.amount)}
                    </p>
                    <p className="text-xs text-muted-foreground">{t.date}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Expense Modal */}
      <Dialog open={showExpenseModal} onOpenChange={setShowExpenseModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Expense</DialogTitle></DialogHeader>
          <form onSubmit={handleExpenseSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Amount</Label>
              <Input type="number" step="0.01" min="0.01" placeholder="0.00" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>{EXPENSE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
            </div>
            <div className="space-y-1.5">
              <Label>Note (optional)</Label>
              <Input placeholder="What was this for?" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setShowExpenseModal(false)}>Cancel</Button>
              <Button type="submit" className="flex-1" disabled={createExpense.isPending}>{createExpense.isPending ? "Adding..." : "Add Expense"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Income Modal */}
      <Dialog open={showIncomeModal} onOpenChange={setShowIncomeModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Income</DialogTitle></DialogHeader>
          <form onSubmit={handleIncomeSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Amount</Label>
              <Input type="number" step="0.01" min="0.01" placeholder="0.00" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>{INCOME_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
            </div>
            <div className="space-y-1.5">
              <Label>Note (optional)</Label>
              <Input placeholder="Source or description" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setShowIncomeModal(false)}>Cancel</Button>
              <Button type="submit" className="flex-1" disabled={createIncome.isPending}>{createIncome.isPending ? "Adding..." : "Add Income"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, subtitle, color }: {
  title: string; value: string; icon: React.ComponentType<{ className?: string }>;
  subtitle: string; color: string;
}) {
  const colorMap: Record<string, string> = {
    primary: "text-primary bg-primary/10",
    green: "text-emerald-500 bg-emerald-500/10",
    red: "text-destructive bg-destructive/10",
    blue: "text-blue-500 bg-blue-500/10",
  };
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
          <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", colorMap[color] ?? colorMap.primary)}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
      </CardContent>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <div className="flex gap-2"><Skeleton className="h-9 w-24" /><Skeleton className="h-9 w-24" /></div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <Card key={i}><CardContent className="pt-5"><Skeleton className="h-20 w-full" /></CardContent></Card>)}
      </div>
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
