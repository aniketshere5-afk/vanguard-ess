import DashboardLayout from "@/components/DashboardLayout";
import OrbitalLoader from "@/components/OrbitalLoader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Activity, AlertTriangle, Cpu, Database, ListChecks, Server, Settings2, ShieldAlert, Upload, Users } from "lucide-react";
import { useMemo } from "react";
import { useLocation } from "wouter";

export default function AdminDashboard() {
  const { user } = useAuth();
  const role = user?.role ?? "user";
  const isRealAdmin = role === "admin";
  const [, navigate] = useLocation();

  const canRead = Boolean(user);
  const summary = trpc.dashboard.summary.useQuery(undefined, { enabled: canRead, retry: 1 });
  const audit = trpc.audit.list.useQuery(undefined, { enabled: canRead, retry: 1 });
  const users = trpc.admin.users.useQuery(undefined, { enabled: isRealAdmin, retry: 0 });
  const models = trpc.models.list.useQuery(undefined, { enabled: canRead, retry: 1 });
  // Stable input: an inline Date.now() would change the query key every
  // render and loop the query forever. refetchInterval still re-pings on the
  // same key every 30s, which is all a liveness check needs.
  const healthInput = useMemo(() => ({ timestamp: Date.now() }), []);
  const health = trpc.system.health.useQuery(healthInput, { enabled: canRead, retry: 0, refetchInterval: 30_000 });

  const s = summary.data;
  const roleCounts = (users.data ?? []).reduce<Record<string, number>>((acc, u) => { acc[u.role] = (acc[u.role] ?? 0) + 1; return acc; }, {});
  const model = models.data?.[0];
  const metrics = model?.metricsJson as { mae?: number; rmse?: number; r2?: number } | undefined;
  const ingestionEvents = (audit.data ?? []).filter(l => l.action === "DATASET_IMPORTED" || l.action === "DATASET_VALIDATED");

  const tiles = [
    { label: "Components", value: s?.totalComponents, icon: Activity, accent: "accent-strip-navy" },
    { label: "Lots", value: s?.totalLots, icon: Database, accent: "accent-strip-navy" },
    { label: "High-risk", value: s?.highRisk, icon: ShieldAlert, accent: "accent-strip-saffron" },
    { label: "Critical", value: s?.critical, icon: AlertTriangle, accent: "border-l-[3px] border-l-destructive" },
    { label: "Anomaly rate", value: s ? `${s.anomalyRate}%` : undefined, icon: Activity, accent: "accent-strip-saffron" },
    { label: "Open investigations", value: s?.recentInvestigations?.filter(i => i.status === "OPEN").length, icon: ListChecks, accent: "accent-strip-green" },
  ];

  if (summary.isLoading) return <DashboardLayout><OrbitalLoader label="Loading system status…" /></DashboardLayout>;

  if (role !== "admin") return <DashboardLayout><div className="blueprint-panel m-4 max-w-md p-8">
    <ShieldAlert className="mb-3 text-amber-600" />
    <h1 className="text-lg font-semibold">Administrator access required</h1>
    <p className="mt-2 text-sm text-muted-foreground">This dashboard is limited to the Admin role. Controlled actions remain enforced server-side regardless.</p>
    <Button className="mt-4" onClick={() => navigate("/reliability")}>Go to the workbench</Button>
  </div></DashboardLayout>;

  return <DashboardLayout>
    <div className="container space-y-5 pb-12">
      <header>
        <p className="blueprint-label text-primary">ADMIN · MISSION OPERATIONS</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">Administrator dashboard</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">System health, model status, controlled configuration, user access and the audit trail.</p>
      </header>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {tiles.map(t => (
          <Card key={t.label} className={`blueprint-panel ${t.accent}`}><CardContent className="p-4">
            <div className="flex items-center justify-between text-muted-foreground"><span className="blueprint-label">{t.label}</span><t.icon className="h-4 w-4" /></div>
            <div className="metric-value mt-2 text-2xl font-semibold">{t.value ?? "—"}</div>
          </CardContent></Card>
        ))}
      </section>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="blueprint-panel">
          <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-sm"><Server className="h-4 w-4 text-primary" />System &amp; API health</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div className="flex items-center justify-between"><span className="text-muted-foreground">API</span><Badge variant="outline" className={health.data?.ok ? "border-emerald-500/40 text-emerald-700" : "border-destructive/40 text-destructive"}>{health.isLoading ? "checking…" : health.data?.ok ? "Online" : "Unreachable"}</Badge></div>
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Database</span><Badge variant="outline" className={summary.isError ? "border-destructive/40 text-destructive" : "border-emerald-500/40 text-emerald-700"}>{summary.isError ? "Error" : "Connected"}</Badge></div>
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Dataset ingestion (recent)</span><span className="font-mono">{ingestionEvents.length}</span></div>
          </CardContent>
        </Card>

        <Card className="blueprint-panel">
          <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-sm"><Cpu className="h-4 w-4 text-primary" />Model status</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-xs">
            {model ? <>
              <div className="flex items-center justify-between"><span className="text-muted-foreground">Version</span><span className="font-mono">{model.version}</span></div>
              <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                <div><p className="text-muted-foreground">MAE</p><p className="font-mono">{metrics?.mae ?? "—"}</p></div>
                <div><p className="text-muted-foreground">RMSE</p><p className="font-mono">{metrics?.rmse ?? "—"}</p></div>
                <div><p className="text-muted-foreground">R²</p><p className="font-mono">{metrics?.r2 ?? "—"}</p></div>
              </div>
            </> : <p className="text-muted-foreground">No model registered yet.</p>}
          </CardContent>
        </Card>

        <Card className="blueprint-panel">
          <CardHeader className="pb-3"><CardTitle className="text-sm">Controls</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start" onClick={() => navigate("/configuration")}><Settings2 className="mr-2 h-4 w-4" />Configuration</Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => navigate("/admin/users")}><Users className="mr-2 h-4 w-4" />User management</Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => navigate("/reliability")}><Activity className="mr-2 h-4 w-4" />Reliability workbench</Button>
          </CardContent>
        </Card>
      </div>

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
                  <span className={lot.anomalyCount ? "text-amber-600" : ""}>{lot.anomalyCount} anomalies</span>
                </div>
              </div>
            ))}
            {!s?.lotHealth?.length && <p className="text-xs text-muted-foreground">No lots yet.</p>}
          </CardContent>
        </Card>

        <Card className="blueprint-panel">
          <CardHeader className="pb-3"><CardTitle className="text-sm">Users by role</CardTitle></CardHeader>
          <CardContent>
            {isRealAdmin
              ? <div className="flex flex-wrap gap-1.5">{Object.entries(roleCounts).map(([r, n]) => <Badge key={r} variant="outline" className="border-border capitalize">{r}: {n}</Badge>)}{!users.data?.length && <span className="text-xs text-muted-foreground">none</span>}</div>
              : <p className="text-xs text-muted-foreground">Sign in as an administrator to load user accounts.</p>}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="blueprint-panel">
          <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-sm"><Upload className="h-4 w-4 text-primary" />Recent dataset activity</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {ingestionEvents.length ? ingestionEvents.slice(0, 8).map(log => (
              <div key={log.id} className="flex items-start justify-between gap-3 border-b border-border pb-2 text-xs last:border-0">
                <div><p className="font-medium">{log.action.replaceAll("_", " ")}</p><p className="text-muted-foreground">{log.targetType}{log.targetId ? ` · ${log.targetId}` : ""}</p></div>
                <span className="shrink-0 font-mono text-[10px] text-muted-foreground">{log.createdAt ? new Date(log.createdAt).toLocaleTimeString() : "—"}</span>
              </div>
            )) : <p className="text-xs text-muted-foreground">No CSV imports or validations yet.</p>}
          </CardContent>
        </Card>

        <Card className="blueprint-panel">
          <CardHeader className="pb-3"><CardTitle className="text-sm">Audit trail — most recent</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {audit.data?.length ? audit.data.slice(0, 8).map(log => (
              <div key={log.id} className="flex items-start justify-between gap-3 border-b border-border pb-2 text-xs last:border-0">
                <div><p className="font-medium">{log.action.replaceAll("_", " ")}</p><p className="text-muted-foreground">{log.targetType}{log.targetId ? ` · ${log.targetId}` : ""}{log.actorId ? ` · actor ${log.actorId}` : ""}</p></div>
                <span className="shrink-0 font-mono text-[10px] text-muted-foreground">{log.createdAt ? new Date(log.createdAt).toLocaleString() : "—"}</span>
              </div>
            )) : <p className="text-xs text-muted-foreground">No audit events yet.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  </DashboardLayout>;
}
