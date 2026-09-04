import { useMemo } from "react";
import { AlertTriangle, ClipboardList, Printer, ShieldAlert, Users } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { isDemoPreview } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";

export default function InvestigationQueue() {
  const { user } = useAuth();
  const canRead = Boolean(user) || isDemoPreview();
  const investigations = trpc.investigations.list.useQuery(undefined, { enabled: canRead, retry: 1 });
  const components = trpc.components.list.useQuery(undefined, { enabled: canRead, retry: 1 });
  const summary = trpc.dashboard.summary.useQuery(undefined, { enabled: canRead, retry: 1 });
  const commonCauseSignals = useMemo(() => {
    const grouped = new Map<string, number>();
    for (const component of components.data ?? []) grouped.set(component.scenario, (grouped.get(component.scenario) ?? 0) + 1);
    return Array.from(grouped.entries()).filter(([scenario]) => scenario.includes("Common-Cause") || scenario.includes("Noisy")).map(([scenario, count]) => ({ scenario, count }));
  }, [components.data]);

  return <DashboardLayout><div className="container space-y-6 pb-12">
    <header className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="blueprint-label text-indigo-300">QUEUE / EVIDENCE REVIEW</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Investigation Queue</h1><p className="mt-2 max-w-2xl text-sm text-muted-foreground">Review computed flags, common-cause signals, and human QA decisions without conflating recommendations with final engineering decisions.</p></div>
      <Button variant="outline" className="w-full sm:w-auto" onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" />Print investigation report</Button>
    </header>
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {[{label:"Open investigations", value:(investigations.data ?? []).filter(i => i.status === "OPEN").length, icon:ClipboardList}, {label:"Closed decisions", value:(investigations.data ?? []).filter(i => i.status === "CLOSED").length, icon:ShieldAlert}, {label:"Common-cause signals", value:commonCauseSignals.length, icon:Users}, {label:"High-risk components", value:summary.data?.highRisk ?? "—", icon:AlertTriangle}].map(item => <Card key={item.label} className="blueprint-panel"><CardContent className="p-4"><div className="flex items-center justify-between text-muted-foreground"><span className="blueprint-label">{item.label}</span><item.icon className="h-4 w-4 text-indigo-300" /></div><div className="metric-value mt-3 text-3xl font-semibold">{item.value}</div></CardContent></Card>)}
    </section>
    <Card className="blueprint-panel"><CardHeader><CardTitle className="text-sm">Lot-level intelligence</CardTitle></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{(summary.data?.lotHealth ?? []).map(lot => <div key={lot.id} className="rounded-lg border border-border bg-background/60 p-4"><div className="flex items-center justify-between gap-3"><span className="font-mono text-sm">{lot.lotCode}</span><Badge variant="outline">{lot.dataLabel}</Badge></div><p className="mt-2 text-xs text-muted-foreground">{lot.deviceFamily}</p><div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs"><div><p className="text-muted-foreground">Components</p><p className="mt-1 font-mono">{lot.componentCount}</p></div><div><p className="text-muted-foreground">Avg risk</p><p className="mt-1 font-mono">{lot.avgRisk}</p></div><div><p className="text-muted-foreground">Anomalies</p><p className="mt-1 font-mono">{lot.anomalyCount}</p></div></div></div>)}</CardContent></Card>
    <section className="grid gap-5 xl:grid-cols-[1.35fr_.65fr]">
      <Card className="blueprint-panel"><CardHeader><CardTitle className="text-sm">Persisted investigations</CardTitle></CardHeader><CardContent className="space-y-3">{investigations.isLoading ? <p className="text-sm text-muted-foreground">Loading queue…</p> : investigations.error ? <p className="text-sm text-rose-300">Unable to load investigations.</p> : (investigations.data ?? []).length === 0 ? <p className="text-sm text-muted-foreground">No investigations have been opened yet. Open one from Reliability Control after reviewing a computed suggested action.</p> : (investigations.data ?? []).map(item => <div key={item.id} className="flex flex-col gap-3 rounded-lg border border-border bg-background/60 p-4 md:flex-row md:items-center md:justify-between"><div><div className="flex flex-wrap items-center gap-2"><span className="font-mono text-sm">INV-{String(item.id).padStart(4, "0")}</span><Badge variant="outline" className={item.status === "OPEN" ? "border-amber-400/40 text-amber-200" : "border-emerald-400/40 text-emerald-200"}>{item.status}</Badge></div><p className="mt-2 text-sm text-muted-foreground">Suggested Screening Action: <span className="text-foreground">{item.suggestedAction}</span></p><p className="mt-1 text-xs text-muted-foreground">Created {item.createdAt ? new Date(item.createdAt).toLocaleString() : "—"}</p></div><span className="text-xs text-muted-foreground">Component {item.componentId}</span></div>)}</CardContent></Card>
      <Card className="blueprint-panel"><CardHeader><CardTitle className="flex items-center gap-2 text-sm"><Users className="h-4 w-4 text-indigo-300" />Common-cause investigation signals</CardTitle></CardHeader><CardContent className="space-y-3">{commonCauseSignals.length ? commonCauseSignals.map(signal => <div key={signal.scenario} className="rounded-lg border border-amber-400/30 bg-amber-400/5 p-3"><div className="flex items-center gap-2 text-sm font-medium"><AlertTriangle className="h-4 w-4 text-amber-300" />Potential {signal.scenario}</div><p className="mt-2 text-xs leading-relaxed text-muted-foreground">{signal.count} components share this scenario pattern. This is an investigation signal, not proof that the test system is faulty.</p></div>) : <p className="text-sm text-muted-foreground">No common-cause or noisy scenario signal is present in the current lot.</p>}</CardContent></Card>
    </section>
  </div></DashboardLayout>;
}
