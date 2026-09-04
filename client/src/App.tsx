import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import InvestigationQueue from "./pages/InvestigationQueue";
import AnalysisPipeline from "./pages/AnalysisPipeline";
import Configuration from "@/pages/Configuration";
import AccountSettings from "@/pages/AccountSettings";
import AdminUsers from "@/pages/AdminUsers";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/reliability" component={Home} />
      <Route path="/investigations" component={InvestigationQueue} />
      <Route path="/analysis" component={AnalysisPipeline} />
      <Route path="/configuration" component={Configuration} />
      <Route path="/settings" component={AccountSettings} />
      <Route path="/admin/users" component={AdminUsers} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark" switchable>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
