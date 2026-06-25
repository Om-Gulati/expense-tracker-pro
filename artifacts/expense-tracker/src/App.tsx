import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import NotFound from "@/pages/not-found";
import Layout from "@/components/Layout";
import LoginPage from "@/pages/login";
import RegisterPage from "@/pages/register";
import DashboardPage from "@/pages/dashboard";
import ExpensesPage from "@/pages/expenses";
import IncomePage from "@/pages/income";
import BudgetsPage from "@/pages/budgets";
import GoalsPage from "@/pages/goals";
import AnalyticsPage from "@/pages/analytics";
import ReportsPage from "@/pages/reports";
import SettingsPage from "@/pages/settings";

setAuthTokenGetter(() => localStorage.getItem("auth_token"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30000,
    },
  },
});

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (!user) return <Redirect to="/login" />;
  return <Layout><Component /></Layout>;
}

function GuestRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (user) return <Redirect to="/" />;
  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={() => <GuestRoute component={LoginPage} />} />
      <Route path="/register" component={() => <GuestRoute component={RegisterPage} />} />
      <Route path="/" component={() => <ProtectedRoute component={DashboardPage} />} />
      <Route path="/expenses" component={() => <ProtectedRoute component={ExpensesPage} />} />
      <Route path="/income" component={() => <ProtectedRoute component={IncomePage} />} />
      <Route path="/budgets" component={() => <ProtectedRoute component={BudgetsPage} />} />
      <Route path="/goals" component={() => <ProtectedRoute component={GoalsPage} />} />
      <Route path="/analytics" component={() => <ProtectedRoute component={AnalyticsPage} />} />
      <Route path="/reports" component={() => <ProtectedRoute component={ReportsPage} />} />
      <Route path="/settings" component={() => <ProtectedRoute component={SettingsPage} />} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <Router />
          </AuthProvider>
        </WouterRouter>
        <Toaster richColors position="top-right" />
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
