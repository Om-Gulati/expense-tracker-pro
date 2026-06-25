import { useState } from "react";
import { Link } from "wouter";
import { useLogin } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { DollarSign, Eye, EyeOff, ArrowRight, TrendingUp, Shield, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const loginMutation = useLogin({
    mutation: {
      onSuccess: (data) => {
        login(data.token, data.user);
        toast.success(`Welcome back, ${data.user.name}!`);
      },
      onError: (e: unknown) => {
        const msg = (e as { data?: { error?: string } })?.data?.error ?? "Invalid credentials";
        toast.error(msg);
      },
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate({ data: { email, password, rememberMe } });
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-secondary p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-secondary via-secondary to-primary/20" />
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
              <DollarSign className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <p className="text-base font-bold text-secondary-foreground">Expense Tracker Pro</p>
              <p className="text-xs text-primary">Your financial command center</p>
            </div>
          </div>
        </div>
        <div className="relative z-10 space-y-8">
          <div>
            <h2 className="text-3xl font-bold text-secondary-foreground leading-tight">
              Take control of your finances
            </h2>
            <p className="mt-3 text-secondary-foreground/60 text-base">
              Track every dollar. Understand your habits. Build the future you want.
            </p>
          </div>
          <div className="space-y-4">
            {[
              { icon: TrendingUp, title: "Real-time tracking", desc: "Monitor income and expenses as they happen" },
              { icon: BarChart3, title: "Visual analytics", desc: "Charts that turn data into clear insights" },
              { icon: Shield, title: "Budget protection", desc: "Set limits and get alerted before overspending" },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/20">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-secondary-foreground">{title}</p>
                  <p className="text-xs text-secondary-foreground/50">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="relative z-10 text-xs text-secondary-foreground/30">
          Expense Tracker Pro &copy; {new Date().getFullYear()}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
              <DollarSign className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-foreground">Expense Tracker Pro</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Sign in to your account</h1>
            <p className="mt-1 text-sm text-muted-foreground">Enter your credentials to continue</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="rememberMe" checked={rememberMe} onCheckedChange={v => setRememberMe(!!v)} />
              <Label htmlFor="rememberMe" className="font-normal text-muted-foreground cursor-pointer">Remember me for 30 days</Label>
            </div>
            <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
              {loginMutation.isPending ? "Signing in..." : (
                <span className="flex items-center gap-2">Sign in <ArrowRight className="h-4 w-4" /></span>
              )}
            </Button>
          </form>
          <p className="text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link href="/register" className="font-medium text-primary hover:underline">Create one free</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
