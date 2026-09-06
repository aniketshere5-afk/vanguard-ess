import DashboardLayout from "@/components/DashboardLayout";
import DemoRoleSwitch from "@/components/DemoRoleSwitch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/_core/hooks/useAuth";
import { getDemoRole, isDemoPreview } from "@/const";
import { trpc } from "@/lib/trpc";
import { Activity, AlertTriangle, Database, ListChecks, RefreshCw, Settings2, ShieldAlert, Users } from "lucide-react";
import { useLocation } from "wouter";

export default function AdminDashboard() {
  const { user } = useAuth();
  const demoPreview = !user && isDemoPreview();
  const role = demoPreview ? getDemoRole() : (user?.role ?? "user");
  const isRealAdmin = user?.role === "admin";
  const [, navigate] = useLocation();

  const canRead = Boolean(user) || demoPreview;
  const summary = trpc.dashboard.summary.useQuery(undefined, { enabled: canRead, retry: 1 });
  const audit = trpc.audit.list.useQuery(undefined, { enabled: canRead, retry: 1 });
  const users = trpc.admin.users.useQuery(undefined, { enabled: isRealAdmin, retry: 0 });

  const s = summary.data;
  const roleCounts = (users.data ?? []).reduce<Record<string, number>>((acc, u) => { acc[u.role] = (acc[u.role] ?? 0) + 1; return acc; }, {});

  const tiles = [
    { label: "Components", value: s?.totalComponents, icon: Activity },
    { label: "Lots", value: s?.totalLots, icon: Database },
    { label: "High-risk", value: s?.highRisk, icon: ShieldAlert },
    { label: "Critical", value: s?.critical, icon: AlertTriangle },
    { label: "Anomaly rate", value: s ? `${s.anomalyRate}%` : undefined, icon: Activity },
    { label: "Open investigations", value: s?.recentInvestigations?.filter(i => i.status === "OPEN").length, icon: ListChecks },
  ];

  if (summary.isLoading) return <DashboardLayout><div className="min-h-[60vh] grid place-items-center"><RefreshCw className="animate-spin text-muted-foreground" /></div></DashboardLayout>;

  if (role !== "admin") return <DashboardLayout><div className="blueprint-panel m-4 max-w-md p-8">
    <ShieldAlert className="mb-3 text-amber-600 dark:text-amber-300" />
    <h1 className="text-lg font-semibold">Administrator access required</h1>
    <p className="mt-2 text-sm text-muted-foreground">This dashboard is limited to the Admin role. Controlled actions remain enforced server-side regardless.</p>
    <Button className="mt-4" onClick={() => navigate("/reliability")}>Go to the workbench</Button>
  </div></DashboardLayout>;

  return <DashboardLayout>
    <div className="container space-y-5 pb-12">
      {demoPreview && <DemoRoleSwitch role={role} />}

      <header>
        <p className="blueprint-label text-primary">ADMIN · WORKSPACE GOVERNANCE</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">Administrator dashboard</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">System health, controlled configuration, user access and the audit trail.</p>
      </header>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {tiles.map(t => (
          <Card key={t.label} className="blueprint-panel"><CardContent className="p-4">
            <div className="flex items-center justify-between text-muted-foreground"><span className="blueprint-label">{t.label}</span><t.icon className="h-4 w-4" /></div>
            <div className="metric-value mt-2 text-2xl font-semibold">{t.value ?? "—"}</div>
          </CardContent></Card>
        ))}
      </section>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="blueprint-panel lg:col-span-2">
          <CardHeader className="pb-3"><CardTitle className="text-sm">Lot health</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {(s?.lotHealth ?? []).map(lot => (
              <div key={lot.id} className="flex flex-wrap items-center justify-between gap-2 rounded border border-border p-3 text-xs">
                <div><span className="font-mono">{lot.lotCode}</span> <span className="text-muted-foreground">· {lot.deviceFamily}</span></div>
                <div className="flex gap-4 font-mono">
                  <span>{lot.componentCount} comp</span>
                  <span>avg risk {lot.avgRisk}</span>
                  <span className={lot.anomalyCount ? "text-amber-600 dark:text-amber-300" : ""}>{lot.anomalyCount} anomalies</span>
                </div>
              </div>
            ))}
            {!s?.lotHealth?.length && <p className="text-xs text-muted-foreground">No lots yet.</p>}
          </CardContent>
        </Card>

        <Card className="blueprint-panel">
          <CardHeader className="pb-3"><CardTitle className="text-sm">Controls</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start" onClick={() => navigate("/configuration")}><Settings2 className="mr-2 h-4 w-4" />Configuration</Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => navigate("/admin/users")}><Users className="mr-2 h-4 w-4" />User management</Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => navigate("/reliability")}><Activity className="mr-2 h-4 w-4" />Reliability workbench</Button>
            <div className="rounded border border-border p-3 text-xs">
              <p className="blueprint-label">Users by role</p>
              {isRealAdmin
                ? <div className="mt-1 flex flex-wrap gap-1.5">{Object.entries(roleCounts).map(([r, n]) => <Badge key={r} variant="outline" className="border-border">{r}: {n}</Badge>)}{!users.data?.length && <span className="text-muted-foreground">none</span>}</div>
                : <p className="mt-1 text-muted-foreground">Sign in as an administrator to load user accounts.</p>}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="blueprint-panel">
        <CardHeader className="pb-3"><CardTitle className="text-sm">Audit trail — most recent</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {audit.data?.length ? audit.data.slice(0, 14).map(log => (
            <div key={log.id} className="flex items-start justify-between gap-3 border-b border-border pb-2 text-xs last:border-0">
              <div><p className="font-medium">{log.action.replaceAll("_", " ")}</p><p className="text-muted-foreground">{log.targetType}{log.targetId ? ` · ${log.targetId}` : ""}{log.actorId ? ` · actor ${log.actorId}` : ""}</p></div>
              <span className="shrink-0 font-mono text-[10px] text-muted-foreground">{log.createdAt ? new Date(log.createdAt).toLocaleString() : "—"}</span>
            </div>
          )) : <p className="text-xs text-muted-foreground">No audit events yet.</p>}
        </CardContent>
      </Card>
    </div>
  </DashboardLayout>;
}
