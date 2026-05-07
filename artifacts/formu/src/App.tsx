import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ComponentType } from "react";
import { useEffect } from "react";
import { useLocation } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LangProvider } from "@/contexts/LangContext";
import { authClient } from "@/lib/auth-client";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import Dashboard from "@/pages/Dashboard";
import FormBuilder from "@/pages/FormBuilder";
import FormResponses from "@/pages/FormResponses";
import FormStats from "@/pages/FormStats";
import FormSettings from "@/pages/FormSettings";
import FormPreview from "@/pages/FormPreview";
import PublicForm from "@/pages/PublicForm";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

function SessionLoading() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="h-6 w-6 rounded-full border-2 border-muted border-t-primary animate-spin" />
    </div>
  );
}

function ProtectedRoute({ component: Component }: { component: ComponentType }) {
  const session = authClient.useSession();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!session.isPending && !session.data) {
      setLocation("/login");
    }
  }, [session.data, session.isPending, setLocation]);

  if (session.isPending) return <SessionLoading />;
  if (!session.data) return null;

  return <Component />;
}

function GuestRoute({ component: Component }: { component: ComponentType }) {
  const session = authClient.useSession();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!session.isPending && session.data) {
      setLocation("/dashboard");
    }
  }, [session.data, session.isPending, setLocation]);

  if (session.isPending) return <SessionLoading />;
  if (session.data) return null;

  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login">{() => <GuestRoute component={Login} />}</Route>
      <Route path="/signup">{() => <GuestRoute component={Signup} />}</Route>
      <Route path="/forgot-password">{() => <GuestRoute component={ForgotPassword} />}</Route>
      <Route path="/reset-password">{() => <GuestRoute component={ResetPassword} />}</Route>
      <Route path="/dashboard">{() => <ProtectedRoute component={Dashboard} />}</Route>
      <Route path="/forms/:id/build">{() => <ProtectedRoute component={FormBuilder} />}</Route>
      <Route path="/forms/:id/responses">{() => <ProtectedRoute component={FormResponses} />}</Route>
      <Route path="/forms/:id/stats">{() => <ProtectedRoute component={FormStats} />}</Route>
      <Route path="/forms/:id/settings">{() => <ProtectedRoute component={FormSettings} />}</Route>
      <Route path="/forms/:id/preview">{() => <ProtectedRoute component={FormPreview} />}</Route>
      <Route path="/f/:id" component={PublicForm} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LangProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </LangProvider>
    </QueryClientProvider>
  );
}

export default App;
