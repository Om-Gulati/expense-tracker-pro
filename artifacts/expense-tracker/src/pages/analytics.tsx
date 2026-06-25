import { useGetMonthlyAnalytics, useGetCategoryBreakdown, useGetSpendingTrends } from "@workspace/api-client-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Calendar, Award } from "lucide-react";
import { cn } from "@/lib/utils";

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#6366f1"];

function formatCurrency(v: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);
}

function formatCurrencyFull(v: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);
}

export default function AnalyticsPage() {
  const { data: monthly, isLoading: loadingMonthly } = useGetMonthlyAnalytics({ months: 6 });
  const { data: categories, isLoading: loadingCat } = useGetCategoryBreakdown();
  const { data: trends, isLoading: loadingTrends } = useGetSpendingTrends();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
        <p className="text-sm text-muted-foreground">Visual overview of your financial patterns</p>
      </div>

      {/* Trend stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loadingTrends ? (
          [...Array(4)].map((_, i) => <Card key={i}><CardContent className="pt-4"><Skeleton className="h-16 w-full" /></CardContent></Card>)
        ) : (
          <>
            <StatTile label="Daily Avg Spend" value={formatCurrencyFull(trends?.dailyAverage ?? 0)} icon={TrendingDown} iconClass="text-destructive" />
            <StatTile label="Weekly Avg Spend" value={formatCurrencyFull(trends?.weeklyAverage ?? 0)} icon={Calendar} iconClass="text-amber-500" />
            <StatTile label="Savings Rate" value={`${trends?.savingsRate ?? 0}%`} icon={TrendingUp} iconClass="text-primary" />
            <StatTile label="Top Category" value={trends?.topCategory ?? "—"} icon={Award} iconClass="text-blue-500" />
          </>
        )}
      </div>

      {/* Monthly bar chart */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm font-medium">Income vs Expenses — Last 6 Months</CardTitle></CardHeader>
        <CardContent>
          {loadingMonthly ? <Skeleton className="h-64 w-full" /> : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={monthly} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} width={45} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="income" name="Income" fill="#10b981" radius={[3, 3, 0, 0]} />
                <Bar dataKey="expenses" name="Expenses" fill="#ef4444" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Savings line chart */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm font-medium">Savings Trend</CardTitle></CardHeader>
        <CardContent>
          {loadingMonthly ? <Skeleton className="h-52 w-full" /> : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={monthly} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} width={45} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12 }} />
                <Line type="monotone" dataKey="savings" name="Savings" stroke="#10b981" strokeWidth={2} dot={{ fill: "#10b981", r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Category breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm font-medium">Spending by Category</CardTitle></CardHeader>
          <CardContent>
            {loadingCat ? <Skeleton className="h-52 w-full" /> : !categories?.length ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No expense data yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={categories} dataKey="amount" nameKey="category" cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={2}>
                    {categories.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm font-medium">Category Breakdown</CardTitle></CardHeader>
          <CardContent>
            {loadingCat ? (
              <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
            ) : !categories?.length ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No expense data yet.</p>
            ) : (
              <div className="space-y-2.5">
                {categories.slice(0, 8).map((c, i) => (
                  <div key={c.category}>
                    <div className="flex justify-between text-xs mb-1">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                        <span className="font-medium text-foreground">{c.category}</span>
                        <span className="text-muted-foreground">({c.count})</span>
                      </div>
                      <span className="font-semibold text-foreground">{formatCurrencyFull(c.amount)} <span className="text-muted-foreground font-normal">({c.percentage}%)</span></span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${c.percentage}%`, background: COLORS[i % COLORS.length] }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatTile({ label, value, icon: Icon, iconClass }: { label: string; value: string; icon: React.ComponentType<{ className?: string }>; iconClass: string }) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center gap-2 mb-1">
          <Icon className={cn("h-4 w-4 shrink-0", iconClass)} />
          <p className="text-xs text-muted-foreground font-medium truncate">{label}</p>
        </div>
        <p className="text-lg font-bold text-foreground truncate">{value}</p>
      </CardContent>
    </Card>
  );
}
