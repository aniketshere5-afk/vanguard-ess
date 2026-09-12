import DashboardLayout from "@/components/DashboardLayout";
import OrbitalLoader from "@/components/OrbitalLoader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { AlertTriangle, CheckCircle2, ClipboardCheck, ClipboardList, FileWarning, ShieldAlert } from "lucide-react";
import { useMemo } from "react";
import { useLocation } from "wouter";

type ValidationMeta = { valid?: boolean; rowCount?: number; errorCount?: number; format?: string; componentsCreated?: number; measurementsInserted?: number };

export default function QADashboard() {
  const { user } = useAuth();
  const role = user?.role ?? "user";
  const [, navigate] = useLocation();
  const canRead = Boolean(user);

  const investigations = trpc.investigations.list.useQuery(undefined, { enabled: canRead, retry: 1 });
  const components = trpc.components.list.useQuery(undefined, { enabled: canRead, retry: 1 });
  const summary = trpc.dashboard.summary.useQuery(undefined, { enabled: canRead, retry: 1 });
  const audit = trpc.audit.list.useQuery(undefined, { enabled: canRead, retry: 1 });
  const models = trpc.models.list.useQuery(undefined, { enabled: canRead, retry: 1 });

  const codeById = useMemo(() => new Map((components.data ?? []).map(c => [c.id, c.componentCode])), [components.data]);
  const open = (investigations.data ?? []).filter(i => i.status === "OPEN");
  const closed = (investigations.data ?? []).filter(i => i.status === "CLOSED");
  const qaDecisions = (audit.data ?? []).filter(l => l.action === "QA_DECISION_RECORDED").slice(0, 8);
  const validationEvents = (audit.data ?? []).filter(l => l.action === "DATASET_VALIDATED" || l.action === "DATASET_IMPORTED");
  const failedValidations = validationEvents.filter(l => (l.metadataJson as ValidationMeta)?.valid === false || ((l.metadataJson as ValidationMeta)?.errorCount ?? 0) > 0).length;
  const model = models.data?.[0];

  const tiles = [
    { label: "Awaiting your decision", value: open.length, icon: ClipboardList, accent: "accent-strip-saffron" },
    { label: "Decisions recorded", value: closed.length, icon: CheckCircle2, accent: "accent-strip-green" },
    { label: "High-risk components", value: summary.data?.highRisk, icon: ShieldAlert, accent: "accent-strip-saffron" },
    { label: "Datasets with warnings", value: failedValidations, icon: FileWarning, accent: "border-l-[3px] border-l-destructive" },
  ];

  if (investigations.isLoading || components.isLoading) {
    return <DashboardLayout><OrbitalLoader label="Loading validation queue…" /></DashboardLayout>;
  }

  if (role !== "qa" && role !== "admin") return <DashboardLayout><div className="blueprint-panel m-4 max-w-md p-8">
    <ShieldAlert className="mb-3 text-amber-600" />
    <h1 className="text-lg font-semibold">QA Engineer access required</h1>
    <p className="mt-2 text-sm text-muted-foreground">This dashboard is limited to the QA Engineer and Admin roles.</p>
    <Button className="mt-4" onClick={() => navigate("/reliability")}>Go to the workbench</Button>
  </div></DashboardLayout>;

  return <DashboardLayout>
    <div className="container space-y-5 pb-12">
      <header>
        <p className="blueprint-label text-primary">QA ENGINEER · DECISION &amp; DATA QUALITY REVIEW</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">QA dashboard</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Review flagged components, verify dataset quality, and record the final screening decision.</p>
      </header>

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {tiles.map(t => (
          <Card key={t.label} className={`blueprint-panel ${t.accent}`}><CardContent className="p-4">
            <div className="flex items-center justify-between text-muted-foreground"><span className="blueprint-label">{t.label}</span><t.icon className="h-4 w-4" /></div>
            <div className="metric-value mt-2 text-2xl font-semibold">{t.value ?? "—"}</div>
          </CardContent></Card>
        ))}
      </section>

      <Card className="blueprint-panel">
        <CardHeader className="pb-3"><CardTitle className="text-sm">Awaiting your decision</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {open.length ? open.map(inv => (
            <div key={inv.id} className="flex flex-wrap items-center justify-between gap-3 rounded border border-border p-3 text-sm">
              <div>
                <span className="font-mono text-xs">INV-{String(inv.id).padStart(4, "0")}</span>
                <span className="ml-2 text-muted-foreground">{codeById.get(inv.componentId) ?? `Component ${inv.componentId}`}</span>
                <p className="mt-1 text-xs text-muted-foreground">Suggested: <span className="text-foreground">{inv.suggestedAction}</span> · opened {inv.createdAt ? new Date(inv.createdAt).toLocaleDateString() : "—"}</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => navigate(`/reliability?component=${inv.componentId}`)}>Review &amp; decide</Button>
            </div>
          )) : <p className="text-xs text-muted-foreground">No open investigations. Reliability Engineers open these from the workbench.</p>}
        </CardContent>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="blueprint-panel">
          <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-sm"><ClipboardCheck className="h-4 w-4 text-primary" />Dataset validation activity</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {validationEvents.length ? validationEvents.slice(0, 8).map(log => {
              const meta = log.metadataJson as ValidationMeta;
              const failed = meta?.valid === false || (meta?.errorCount ?? 0) > 0;
              return (
                <div key={log.id} className="flex items-start justify-between gap-3 border-b border-border pb-2 text-xs last:border-0">
                  <div>
                    <p className="font-medium">{log.action.replaceAll("_", " ")} · <span className={failed ? "text-amber-600" : "text-emerald-700"}>{failed ? "warnings" : "clean"}</span></p>
                    <p className="text-muted-foreground">{log.targetId} {meta?.rowCount != null ? `· ${meta.rowCount} rows` : ""} {meta?.errorCount ? `· ${meta.errorCount} error(s)` : ""}</p>
                  </div>
                  <span className="shrink-0 font-mono text-[10px] text-muted-foreground">{log.createdAt ? new Date(log.createdAt).toLocaleTimeString() : "—"}</span>
                </div>
              );
            }) : <p className="text-xs text-muted-foreground">No CSV validations or imports yet.</p>}
          </CardContent>
        </Card>

        <Card className="blueprint-panel">
          <CardHeader className="pb-3"><CardTitle className="text-sm">Model validation</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-xs">
            {model ? <>
              <div className="flex justify-between"><span className="text-muted-foreground">Registered model</span><span className="font-mono">{model.version}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Validation method</span><span>{(model.metricsJson as { validation?: string })?.validation ?? "—"}</span></div>
            </> : <p className="text-muted-foreground">No model registered yet.</p>}
            <p className="pt-1 text-[11px] text-muted-foreground">Backend + database connectivity checks live on the Admin dashboard.</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="blueprint-panel">
          <CardHeader className="pb-3"><CardTitle className="text-sm">Recent QA decisions</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {qaDecisions.length ? qaDecisions.map(log => (
              <div key={log.id} className="flex items-start justify-between gap-3 border-b border-border pb-2 text-xs last:border-0">
                <div><p className="font-medium">{(log.metadataJson as { decision?: string })?.decision ?? "Decision"}</p><p className="text-muted-foreground">investigation · {log.targetId}</p></div>
                <span className="shrink-0 font-mono text-[10px] text-muted-foreground">{log.createdAt ? new Date(log.createdAt).toLocaleString() : "—"}</span>
              </div>
            )) : <p className="text-xs text-muted-foreground">No decisions recorded yet.</p>}
          </CardContent>
        </Card>

        <Card className="blueprint-panel">
          <CardHeader className="pb-3"><CardTitle className="text-sm">Lot health</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {(summary.data?.lotHealth ?? []).map(lot => (
              <div key={lot.id} className="flex items-center justify-between rounded border border-border p-3 text-xs">
                <span className="font-mono">{lot.lotCode}</span>
                <span className="flex gap-3 font-mono"><span>avg {lot.avgRisk}</span><Badge variant="outline" className={lot.anomalyCount ? "border-amber-500/40 text-amber-600" : "border-border"}>{lot.anomalyCount} anom</Badge></span>
              </div>
            ))}
            {!summary.data?.lotHealth?.length && <p className="text-xs text-muted-foreground">No lots yet.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  </DashboardLayout>;
}
