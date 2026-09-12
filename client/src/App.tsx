import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Redirect, Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import AdminDashboard from "./pages/AdminDashboard";
import QADashboard from "./pages/QADashboard";
import ReliabilityWorkbench from "./pages/ReliabilityWorkbench";
import InvestigationQueue from "./pages/InvestigationQueue";
import LotComparison from "./pages/LotComparison";
import Configuration from "@/pages/Configuration";
import AccountSettings from "@/pages/AccountSettings";
import AdminUsers from "@/pages/AdminUsers";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/reliability" component={ReliabilityWorkbench} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/qa" component={QADashboard} />
      <Route path="/investigations" component={InvestigationQueue} />
      <Route path="/comparison" component={LotComparison} />
      <Route path="/analysis"><Redirect to="/reliability" /></Route>
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
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
