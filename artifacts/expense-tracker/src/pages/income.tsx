import { useState } from "react";
import { useGetIncomeList, useCreateIncome, useUpdateIncome, useDeleteIncome, getGetIncomeListQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Filter, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrency } from "@/hooks/use-currency";

const CATEGORIES = ["All", "Salary", "Freelancing", "Business", "Investments", "Gifts", "Other"];

type Income = { id: number; amount: number; category: string; source: string | null; note: string | null; date: string; createdAt: string; userId: number };

export default function IncomePage() {
  const queryClient = useQueryClient();
  const { format } = useCurrency();
  const [category, setCategory] = useState("All");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<Income | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState({ amount: "", category: "", source: "", note: "", date: new Date().toISOString().split("T")[0] });

  const params = {
    ...(category !== "All" ? { category } : {}),
    ...(startDate ? { startDate } : {}),
    ...(endDate ? { endDate } : {}),
    page, limit: 15,
  };

  const { data, isLoading } = useGetIncomeList(params);

  const createMutation = useCreateIncome({ mutation: { onSuccess: () => { toast.success("Income added"); invalidate(); closeModal(); }, onError: () => toast.error("Failed") } });
  const updateMutation = useUpdateIncome({ mutation: { onSuccess: () => { toast.success("Income updated"); invalidate(); closeModal(); }, onError: () => toast.error("Failed") } });
  const deleteMutation = useDeleteIncome({ mutation: { onSuccess: () => { toast.success("Income deleted"); invalidate(); setDeleteId(null); }, onError: () => toast.error("Failed") } });

  function invalidate() { queryClient.invalidateQueries({ queryKey: getGetIncomeListQueryKey() }); }
  function closeModal() { setShowModal(false); setEditItem(null); setForm({ amount: "", category: "", source: "", note: "", date: new Date().toISOString().split("T")[0] }); }
  function openEdit(i: Income) { setEditItem(i); setForm({ amount: i.amount.toString(), category: i.category, source: i.source ?? "", note: i.note ?? "", date: i.date }); setShowModal(true); }

  const handleSubmit = (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!form.category) { toast.error("Please select a category"); return; }
    const payload = { amount: parseFloat(form.amount), category: form.category, source: form.source || undefined, note: form.note || undefined, date: form.date };
    if (editItem) updateMutation.mutate({ id: editItem.id, data: payload });
    else createMutation.mutate({ data: payload });
  };

  const handleExport = async () => {
    const token = localStorage.getItem("auth_token");
    const q = new URLSearchParams({ type: "income", ...(startDate ? { startDate } : {}), ...(endDate ? { endDate } : {}) });
    const resp = await fetch(`/api/export/csv?${q}`, { headers: { Authorization: `Bearer ${token}` } });
    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "income.csv"; a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported successfully");
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Income</h1>
          <p className="text-sm text-muted-foreground">Track all your income sources</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}><Download className="h-4 w-4 mr-1.5" />Export</Button>
          <Button size="sm" onClick={() => setShowModal(true)}><Plus className="h-4 w-4 mr-1.5" />Add Income</Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-3">
            <Select value={category} onValueChange={v => { setCategory(v); setPage(1); }}>
              <SelectTrigger className="w-44"><Filter className="h-4 w-4 mr-2" /><SelectValue /></SelectTrigger>
              <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
            <Input type="date" value={startDate} onChange={e => { setStartDate(e.target.value); setPage(1); }} className="w-36" />
            <Input type="date" value={endDate} onChange={e => { setEndDate(e.target.value); setPage(1); }} className="w-36" />
            {(category !== "All" || startDate || endDate) && (
              <Button variant="ghost" size="sm" onClick={() => { setCategory("All"); setStartDate(""); setEndDate(""); setPage(1); }}>Clear</Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">{data ? `${data.total} income record${data.total !== 1 ? "s" : ""}` : "Loading..."}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
          ) : !data?.data?.length ? (
            <div className="p-10 text-center">
              <p className="text-sm text-muted-foreground">No income records found.</p>
              <Button size="sm" className="mt-3" onClick={() => setShowModal(true)}><Plus className="h-4 w-4 mr-1.5" />Add your first income</Button>
            </div>
          ) : (
            <div>
              <div className="hidden sm:grid grid-cols-5 gap-4 px-4 py-2 text-xs font-medium text-muted-foreground border-b border-border bg-muted/30">
                <span>Date</span><span>Category</span><span>Source / Note</span><span className="text-right">Amount</span><span className="text-right">Actions</span>
              </div>
              {data.data.map((i) => (
                <div key={i.id} className="flex flex-col sm:grid sm:grid-cols-5 gap-2 sm:gap-4 px-4 py-3 border-b border-border/50 hover:bg-accent/30 transition-colors last:border-0">
                  <span className="text-sm text-muted-foreground">{i.date}</span>
                  <Badge variant="secondary" className="w-fit text-xs">{i.category}</Badge>
                  <span className="text-sm text-foreground truncate">{i.source ?? i.note ?? "—"}</span>
                  <span className="text-sm font-semibold text-primary sm:text-right">{format(i.amount)}</span>
                  <div className="flex gap-1 sm:justify-end">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(i as Income)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(i.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page <= 1}>Previous</Button>
            <span className="text-xs text-muted-foreground">Page {page} of {data.totalPages}</span>
            <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= data.totalPages}>Next</Button>
          </div>
        )}
      </Card>

      <Dialog open={showModal} onOpenChange={(o) => { if (!o) closeModal(); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editItem ? "Edit Income" : "Add Income"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5"><Label>Amount</Label><Input type="number" step="0.01" min="0.01" placeholder="0.00" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required autoFocus /></div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>{CATEGORIES.slice(1).map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Source (optional)</Label><Input placeholder="Employer, client..." value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Date</Label><Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required /></div>
            <div className="space-y-1.5"><Label>Note (optional)</Label><Input placeholder="Additional details" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} /></div>
            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={closeModal}>Cancel</Button>
              <Button type="submit" className="flex-1" disabled={createMutation.isPending || updateMutation.isPending}>
                {(createMutation.isPending || updateMutation.isPending) ? "Saving..." : editItem ? "Update" : "Add"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteId !== null} onOpenChange={(o) => { if (!o) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete income?</AlertDialogTitle><AlertDialogDescription>This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId !== null && deleteMutation.mutate({ id: deleteId })} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
