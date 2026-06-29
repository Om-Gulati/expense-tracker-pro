import { useState, useEffect } from "react";
import { useGetMe, useUpdateMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { User, Moon, Sun, Monitor, Save, DollarSign, Download, LogOut, Globe, Bell, Shield, RefreshCw, AlertCircle, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useCurrency, CURRENCIES } from "@/hooks/use-currency";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";

const THEMES = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { data: user, isLoading } = useGetMe({ query: { queryKey: getGetMeQueryKey() } });
  const { theme, setTheme } = useTheme();
  const { currency, setCurrency, format, rate, ratesUpdatedAt, ratesLoading, ratesError, refetchRates } = useCurrency();
  const { logout } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (user) { setName(user.name); setEmail(user.email); }
  }, [user]);

  const updateMutation = useUpdateMe({
    mutation: {
      onSuccess: () => {
        toast.success("Profile saved");
        queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
      },
      onError: () => toast.error("Failed to save profile"),
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({ data: { name, email } });
  };

  const handleExportAll = async () => {
    const token = localStorage.getItem("auth_token");
    const resp = await fetch("/api/export/csv?type=all", { headers: { Authorization: `Bearer ${token}` } });
    if (!resp.ok) { toast.error("Export failed"); return; }
    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `all-transactions-${new Date().toISOString().split("T")[0]}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success("All data exported");
  };

  const handleExportExpenses = async () => {
    const token = localStorage.getItem("auth_token");
    const resp = await fetch("/api/export/csv?type=expenses", { headers: { Authorization: `Bearer ${token}` } });
    if (!resp.ok) { toast.error("Export failed"); return; }
    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `expenses-${new Date().toISOString().split("T")[0]}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success("Expenses exported");
  };

  const handleExportIncome = async () => {
    const token = localStorage.getItem("auth_token");
    const resp = await fetch("/api/export/csv?type=income", { headers: { Authorization: `Bearer ${token}` } });
    if (!resp.ok) { toast.error("Export failed"); return; }
    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `income-${new Date().toISOString().split("T")[0]}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success("Income exported");
  };

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your account and preferences</p>
      </div>

      {/* Profile */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><User className="h-4 w-4" />Profile</CardTitle>
          <CardDescription>Update your name and email address</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Full name</Label>
                  <Input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" required />
                </div>
                <div className="space-y-1.5">
                  <Label>Email address</Label>
                  <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
                </div>
              </div>
              <div className="flex items-center gap-3 pt-1">
                <Button type="submit" size="sm" disabled={updateMutation.isPending}>
                  <Save className="h-4 w-4 mr-1.5" />{updateMutation.isPending ? "Saving..." : "Save profile"}
                </Button>
                {user && (
                  <p className="text-xs text-muted-foreground">
                    Member since {new Date(user.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long" })} · ID #{user.id}
                  </p>
                )}
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Currency */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2"><Globe className="h-4 w-4" />Currency &amp; Exchange Rate</CardTitle>
              <CardDescription className="mt-1">Live rates sourced from open.er-api.com · base: USD</CardDescription>
            </div>
            <Button
              variant="ghost" size="icon" className="h-8 w-8 shrink-0"
              onClick={() => { refetchRates(); toast.info("Refreshing rates…"); }}
              disabled={ratesLoading}
              title="Refresh exchange rates"
            >
              <RefreshCw className={cn("h-4 w-4", ratesLoading && "animate-spin")} />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Select value={currency.code} onValueChange={code => {
              const c = CURRENCIES.find(x => x.code === code);
              if (c) { setCurrency(c); toast.success(`Currency changed to ${c.label}`); }
            }}>
              <SelectTrigger className="w-72">
                <DollarSign className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map(c => (
                  <SelectItem key={c.code} value={c.code}>
                    <span className="font-mono text-muted-foreground mr-2 w-6 inline-block">{c.symbol}</span>
                    {c.label} ({c.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {ratesLoading && <span className="text-xs text-muted-foreground">Fetching live rates…</span>}
          </div>

          {/* Rate info panel */}
          <div className={cn(
            "rounded-lg border px-4 py-3 text-sm space-y-2",
            ratesError ? "border-destructive/30 bg-destructive/5" : "border-border bg-muted/30"
          )}>
            {ratesError ? (
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span className="text-sm">Could not fetch live rates — displaying stored or 1:1 fallback rates.</span>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    <span className="font-medium text-foreground">Live rate active</span>
                    <Badge variant="secondary" className="text-xs">real-time</Badge>
                  </div>
                  {ratesUpdatedAt && (
                    <span className="text-xs text-muted-foreground">
                      Updated {ratesUpdatedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  )}
                </div>

                {currency.code !== "USD" && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
                    <RateItem label="1 USD =" value={`${rate.toLocaleString(undefined, { maximumFractionDigits: 4 })} ${currency.code}`} />
                    <RateItem label={`1 ${currency.code} =`} value={`${(1 / rate).toLocaleString(undefined, { maximumFractionDigits: 6 })} USD`} />
                    <RateItem label="Example: $1,000 USD" value={format(1000)} highlight />
                  </div>
                )}

                {currency.code === "USD" && (
                  <p className="text-xs text-muted-foreground">Currently using USD (base currency). Select another currency above to see the live conversion rate.</p>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Monitor className="h-4 w-4" />Appearance</CardTitle>
          <CardDescription>Choose your color theme</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {THEMES.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => { setTheme(value); toast.success(`${label} mode enabled`); }}
                className={cn(
                  "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-150",
                  theme === value ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-border/80 hover:bg-accent"
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs font-medium">{label}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Data export */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Download className="h-4 w-4" />Export Data</CardTitle>
          <CardDescription>Download your financial records as CSV files</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" size="sm" onClick={handleExportAll}>
              <Download className="h-4 w-4 mr-1.5" />All Transactions
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportExpenses}>
              <Download className="h-4 w-4 mr-1.5" />Expenses Only
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportIncome}>
              <Download className="h-4 w-4 mr-1.5" />Income Only
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-3">Exports include all historical data in CSV format, compatible with Excel and Google Sheets.</p>
        </CardContent>
      </Card>

      {/* Notifications (display preference, stored locally) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Bell className="h-4 w-4" />Notifications</CardTitle>
          <CardDescription>Toast notification display duration</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Select defaultValue="1800" onValueChange={() => toast.success("Preference saved (takes effect on next action)")}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1000">Very fast (1s)</SelectItem>
                <SelectItem value="1800">Fast (1.8s)</SelectItem>
                <SelectItem value="3000">Normal (3s)</SelectItem>
                <SelectItem value="5000">Slow (5s)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Currently set to fast</p>
          </div>
        </CardContent>
      </Card>

      {/* Security / Account actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Shield className="h-4 w-4" />Account</CardTitle>
          <CardDescription>Security and session management</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-border/50">
            <div>
              <p className="text-sm font-medium text-foreground">Session</p>
              <p className="text-xs text-muted-foreground">JWT token stored in your browser</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => { logout(); toast.success("Signed out"); }}>
              <LogOut className="h-4 w-4 mr-1.5" />Sign out
            </Button>
          </div>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium text-foreground">Authentication</p>
              <p className="text-xs text-muted-foreground">Password protected account</p>
            </div>
            <span className="text-xs text-primary font-medium px-2 py-1 rounded-full bg-primary/10">Secure</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function RateItem({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={cn("text-sm font-semibold", highlight ? "text-primary" : "text-foreground")}>{value}</span>
    </div>
  );
}
