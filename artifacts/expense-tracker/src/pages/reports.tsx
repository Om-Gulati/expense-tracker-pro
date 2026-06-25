import { useState } from "react";
import { useGetMonthlyReport, getGetMonthlyReportQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, Download, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#6366f1"];

function formatCurrency(v: number) {
  const abs = Math.abs(v);
  return (v < 0 ? "-" : "") + new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(abs);
}

export default function ReportsPage() {
  const now = new Date();
  const [year, setYear] = useState(String(now.getFullYear()));
  const [month, setMonth] = useState(String(now.getMonth() + 1));

  const { data, isLoading } = useGetMonthlyReport({ year: parseInt(year), month: parseInt(month) });

  const handleExport = async () => {
    const token = localStorage.getItem("auth_token");
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endDate = `${year}-${String(month).padStart(2, "0")}-31`;
    const q = new URLSearchParams({ type: "all", startDate, endDate });
    const resp = await fetch(`/api/export/csv?${q}`, { headers: { Authorization: `Bearer ${token}` } });
    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `report-${year}-${month}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const years = Array.from({ length: 5 }, (_, i) => String(now.getFullYear() - i));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Monthly Reports</h1>
          <p className="text-sm text-muted-foreground">Detailed financial summary by period</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport}><Download className="h-4 w-4 mr-1.5" />Export CSV</Button>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="flex gap-3">
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>{MONTHS.map((m, i) => <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
              <SelectContent>{years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}</div>
      ) : !data ? null : (
        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <ReportStat label="Total Income" value={formatCurrency(data.totalIncome)} positive={true} />
            <ReportStat label="Total Expenses" value={formatCurrency(data.totalExpenses)} positive={false} isExpense />
            <ReportStat label="Net Savings" value={formatCurrency(data.savings)} positive={data.savings >= 0} />
            <ReportStat label="Savings Rate" value={`${data.savingsRate}%`} positive={data.savingsRate >= 0} />
          </div>

          {/* Month-over-month comparison */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Month-over-Month Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <ComparisonItem label="Income Change" value={data.previousMonthComparison.incomeChange} />
                <ComparisonItem label="Expense Change" value={data.previousMonthComparison.expenseChange} invertColors />
                <ComparisonItem label="Savings Change" value={data.previousMonthComparison.savingsChange} />
              </div>
            </CardContent>
          </Card>

          {/* Category breakdown */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">
                Expense Breakdown — Highest: <span className="text-primary">{data.highestExpenseCategory}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!data.categoryBreakdown.length ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No expenses recorded this month.</p>
              ) : (
                <div className="space-y-3">
                  {data.categoryBreakdown.map((c, i) => (
                    <div key={c.category}>
                      <div className="flex justify-between text-xs mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                          <span className="font-medium text-foreground">{c.category}</span>
                          <Badge variant="secondary" className="text-xs h-4 px-1">{c.count} transactions</Badge>
                        </div>
                        <span className="font-semibold text-foreground">{formatCurrency(c.amount)} <span className="text-muted-foreground font-normal">({c.percentage}%)</span></span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${c.percentage}%`, background: COLORS[i % COLORS.length] }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Insights */}
          {data.insights.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-amber-500" /> Financial Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {data.insights.map((ins, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                      <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                      {ins}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

function ReportStat({ label, value, positive, isExpense }: { label: string; value: string; positive: boolean; isExpense?: boolean }) {
  return (
    <Card>
      <CardContent className="pt-4">
        <p className="text-xs text-muted-foreground font-medium mb-1">{label}</p>
        <p className={cn("text-xl font-bold", isExpense ? "text-destructive" : positive ? "text-primary" : "text-destructive")}>{value}</p>
      </CardContent>
    </Card>
  );
}

function ComparisonItem({ label, value, invertColors }: { label: string; value: number; invertColors?: boolean }) {
  const isPositive = invertColors ? value <= 0 : value >= 0;
  const icon = value === 0 ? <Minus className="h-4 w-4" /> : value > 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />;
  return (
    <div className="text-center">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <div className={cn("flex items-center justify-center gap-1 font-semibold", isPositive ? "text-primary" : "text-destructive")}>
        {icon}
        <span className="text-sm">{formatCurrency(value)}</span>
      </div>
    </div>
  );
}
