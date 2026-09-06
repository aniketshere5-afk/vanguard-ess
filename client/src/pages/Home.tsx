import { useAuth } from "@/_core/hooks/useAuth";
import { getDemoRole, isDemoPreview } from "@/const";
import AdminDashboard from "@/pages/AdminDashboard";
import QADashboard from "@/pages/QADashboard";
import ReliabilityWorkbench from "@/pages/ReliabilityWorkbench";

/**
 * Landing route. Sends each role to the surface built for it:
 *   admin  -> workspace governance dashboard
 *   qa     -> decision-review dashboard
 *   others -> the single-component reliability workbench
 */
export default function Home() {
  const { user } = useAuth();
  const demoPreview = !user && isDemoPreview();
  const role = demoPreview ? getDemoRole() : (user?.role ?? "user");

  if (role === "admin") return <AdminDashboard />;
  if (role === "qa") return <QADashboard />;
  return <ReliabilityWorkbench />;
}
