import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LangProvider } from "@/contexts/LangContext";
import NotFound from "@/pages/not-found";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
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

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Signup} />
      <Route path="/" component={Dashboard} />
      <Route path="/forms/:id/build" component={FormBuilder} />
      <Route path="/forms/:id/responses" component={FormResponses} />
      <Route path="/forms/:id/stats" component={FormStats} />
      <Route path="/forms/:id/settings" component={FormSettings} />
      <Route path="/forms/:id/preview" component={FormPreview} />
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
