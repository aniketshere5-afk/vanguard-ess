import DashboardLayout from "@/components/DashboardLayout";
import OrbitalLoader from "@/components/OrbitalLoader";
import PipelineStrip from "@/components/PipelineStrip";
import PrintReportHeader from "@/components/PrintReportHeader";
import PassFailExplanation from "@/components/PassFailExplanation";
import FailureModeCard from "@/components/FailureModeCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { AlertTriangle, CheckCircle2, Database, FileWarning, GaugeCircle, LineChart, Printer, RefreshCw, ScanSearch, Upload } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { validateCsv } from "../../../server/reliability";

const SCENARIO_CHIPS = ["Static PASS / Dynamic Anomaly", "Accelerating Drift", "Obvious Failure", "Common-Cause Shift", "High Uncertainty", "False Positive Candidate"];
const DECISIONS = ["Accept", "Hold", "Re-test", "Extend Burn-In", "Reject", "Investigate Further"] as const;

const bandTone = (band?: string) =>
  band === "CRITICAL" || band === "HIGH RISK" ? "status-critical"
  : band === "SUSPICIOUS" ? "status-caution"
  : band === "WATCH" ? "status-watch"
  : "status-good";

function Section({ n, title, blurb, icon: Icon, children }: { n: number; title: string; blurb: string; icon: typeof ScanSearch; children: React.ReactNode }) {
  return (
    <Card className="blueprint-panel">
      <CardHeader className="border-b border-border pb-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-md border border-border text-xs font-semibold text-muted-foreground">{n}</div>
          <div>
            <CardTitle className="flex items-center gap-2 text-base"><Icon className="h-4 w-4 text-primary" />{title}</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">{blurb}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4">{children}</CardContent>
    </Card>
  );
}

export default function ReliabilityWorkbench() {
  const { user } = useAuth();
  const role = user?.role ?? "user";
  const canRead = Boolean(user);
  const canDecide = role === "qa" || role === "admin";
  const utils = trpc.useUtils();

  const lots = trpc.lots.list.useQuery(undefined, { enabled: canRead, retry: 1 });
  const components = trpc.components.list.useQuery(undefined, { enabled: canRead, retry: 1 });
  const audit = trpc.audit.list.useQuery(undefined, { enabled: canRead, retry: 1 });

  const [lotId, setLotId] = useState<number | undefined>();
  const [selectedId, setSelectedId] = useState<number | undefined>();
  const [decision, setDecision] = useState<(typeof DECISIONS)[number]>("Hold");
  const [comment, setComment] = useState("");

  // Deep link: /reliability?component=<id>
  useEffect(() => {
    const fromUrl = Number(new URLSearchParams(window.location.search).get("component"));
    if (fromUrl) setSelectedId(fromUrl);
  }, []);

  const lotComponents = useMemo(
    () => (components.data ?? []).filter(c => lotId == null || c.lotId === lotId),
    [components.data, lotId],
  );

  // Sensible default: the latent-anomaly demo component, else the first one.
  useEffect(() => {
    if (selectedId || !components.data?.length) return;
    const latent = components.data.find(c => c.scenario === "Static PASS / Dynamic Anomaly");
    setSelectedId(latent?.id ?? components.data[0].id);
  }, [components.data, selectedId]);

  // Keep the lot selector in sync with the chosen component.
  useEffect(() => {
    const c = components.data?.find(x => x.id === selectedId);
    if (c && lotId == null) setLotId(c.lotId);
  }, [components.data, selectedId, lotId]);

  const detail = trpc.components.get.useQuery({ id: selectedId! }, { enabled: canRead && !!selectedId, retry: 1 });
  const analysis = detail.data?.result;
  const openInv = detail.data?.investigations?.find(i => i.status === "OPEN");

  const runAnalysis = trpc.analysis.run.useMutation({
    onSuccess: () => { detail.refetch(); audit.refetch(); toast.success("Analysis recomputed · audit entry recorded"); },
    onError: e => toast.error(e.message),
  });
  const openInvestigation = trpc.investigations.create.useMutation({
    onSuccess: () => { detail.refetch(); toast.success("Investigation opened"); },
    onError: e => toast.error(e.message),
  });
  const decide = trpc.investigations.decide.useMutation({
    onSuccess: async () => {
      setComment("");
      await Promise.all([detail.refetch(), audit.refetch(), utils.components.get.invalidate({ id: selectedId! })]);
      toast.success("QA decision recorded in the immutable audit trail");
    },
    onError: e => toast.error(e.message),
  });

  // --- CSV import ---
  const validateMut = trpc.ingestion.validate.useMutation({ onError: e => toast.error(e.message) });
  const importMut = trpc.ingestion.import.useMutation({
    onSuccess: async r => {
      toast.success(`Imported ${r.lotCode}: ${r.componentsCreated} new component(s), ${r.measurementsInserted} measurement(s)`);
      setPendingCsv(null); setLocalReport(null);
      await Promise.all([components.refetch(), lots.refetch(), audit.refetch()]);
    },
    onError: e => toast.error(e.message),
  });
  const [localReport, setLocalReport] = useState<ReturnType<typeof validateCsv> | null>(null);
  const [pendingCsv, setPendingCsv] = useState<{ text: string; filename: string } | null>(null);
  const [specMax, setSpecMax] = useState(50);
  const [boundary, setBoundary] = useState(42);
  const report = localReport ?? validateMut.data;
  const onPickCsv = async (file: File) => {
    try {
      const text = await file.text();
      const big = file.size > 4 * 1024 * 1024;
      setPendingCsv(file.size <= 8 * 1024 * 1024 ? { text, filename: file.name } : null);
      if (big) { setLocalReport(validateCsv(text)); }
      else { setLocalReport(null); validateMut.mutate({ csv: text, filename: file.name }); }
    } catch { toast.error("Unable to read this CSV file"); }
  };

  const chartData = (detail.data?.measurements ?? []).map(m => ({ time: `${m.checkpointHours}h`, value: Number(m.leakageCurrent) }));

  if (lots.isLoading || components.isLoading) {
    return <DashboardLayout><OrbitalLoader label="Processing telemetry…" /></DashboardLayout>;
  }
  if (lots.error || components.error) {
    return <DashboardLayout><div className="blueprint-panel m-4 max-w-xl p-8">
      <FileWarning className="mb-3 text-amber-600 dark:text-amber-300" />
      <h1 className="text-xl font-semibold">Screening data unavailable</h1>
      <p className="mt-2 text-sm text-muted-foreground">The workbench could not load persisted data. No result has been fabricated.</p>
      <Button className="mt-5" onClick={() => { lots.refetch(); components.refetch(); }}>Retry</Button>
    </div></DashboardLayout>;
  }

  return <DashboardLayout>
    <div className="container space-y-5 pb-12">
      <PrintReportHeader componentCode={detail.data?.component.componentCode} lotCode={detail.data?.lot.lotCode} preparedBy={user?.name ?? undefined} />
      <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between print:hidden">
        <div>
          <p className="blueprint-label text-primary">RELIABILITY WORKBENCH</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">Screen one component, end to end</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Anomaly, drift, risk and the pass/fail reasoning for a single unit — in that order.</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-border bg-muted text-foreground"><Database className="mr-1.5 h-3.5 w-3.5" />Demonstration Data</Badge>
          <Button variant="outline" size="sm" disabled={!selectedId || runAnalysis.isPending} onClick={() => runAnalysis.mutate({ componentId: selectedId! })}>
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${runAnalysis.isPending ? "animate-spin" : ""}`} />Re-run analysis
          </Button>
          <Button variant="outline" size="sm" disabled={!analysis} onClick={() => window.print()}>
            <Printer className="mr-1.5 h-3.5 w-3.5" />Download PDF report
          </Button>
        </div>
      </header>

      <PipelineStrip className="print:hidden" />

      {/* Picker */}
      <Card className="blueprint-panel print:hidden">
        <CardContent className="flex flex-col gap-3 p-4 lg:flex-row lg:items-end">
          <label className="flex-1">
            <span className="blueprint-label">Lot</span>
            <Select value={lotId ? String(lotId) : ""} onValueChange={v => { setLotId(Number(v)); const first = (components.data ?? []).find(c => c.lotId === Number(v)); if (first) setSelectedId(first.id); }}>
              <SelectTrigger className="mt-1 bg-background"><SelectValue placeholder="Select lot" /></SelectTrigger>
              <SelectContent>{lots.data?.map(l => <SelectItem key={l.id} value={String(l.id)}>{l.lotCode} · {l.deviceFamily}</SelectItem>)}</SelectContent>
            </Select>
          </label>
          <label className="flex-1">
            <span className="blueprint-label">Component</span>
            <Select value={selectedId ? String(selectedId) : ""} onValueChange={v => setSelectedId(Number(v))}>
              <SelectTrigger className="mt-1 bg-background"><SelectValue placeholder="Select component" /></SelectTrigger>
              <SelectContent>{lotComponents.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.componentCode} — {c.scenario}</SelectItem>)}</SelectContent>
            </Select>
          </label>
        </CardContent>
        <div className="flex flex-wrap gap-1.5 border-t border-border px-4 py-2.5">
          <span className="self-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Jump to scenario</span>
          {SCENARIO_CHIPS.map(sc => {
            const match = (components.data ?? []).find(c => c.scenario === sc);
            return <button key={sc} disabled={!match} onClick={() => { if (match) { setSelectedId(match.id); setLotId(match.lotId); } }}
              className="rounded border border-border px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-40">{sc}</button>;
          })}
        </div>
      </Card>

      {!analysis || detail.isLoading ? (
        <Card className="blueprint-panel grid min-h-[320px] place-items-center"><OrbitalLoader label="Running reliability model…" compact /></Card>
      ) : (
        <>
          {/* Headline */}
          <Card className="blueprint-panel">
            <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
              <div>
                <p className="blueprint-label">Component</p>
                <h2 className="mt-1 font-mono text-2xl font-semibold">{detail.data?.component.componentCode}</h2>
                <p className="mt-0.5 text-sm text-muted-foreground">{detail.data?.lot.lotCode} · {detail.data?.lot.deviceFamily}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className={`rounded-md border px-3 py-1.5 text-xs font-semibold ${analysis.staticResult === "PASS" ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-600 dark:text-emerald-300" : "border-red-500/30 bg-red-500/5 text-red-600 dark:text-red-300"}`}>Static {analysis.staticResult}</span>
                <span className={`rounded-md border px-3 py-1.5 text-xs font-semibold ${analysis.dynamicResult === "ANOMALOUS" ? "border-amber-500/30 bg-amber-500/5 text-amber-600 dark:text-amber-300" : "border-border bg-muted text-muted-foreground"}`}>Anomaly {analysis.dynamicResult.replace("_", " ")}</span>
                <span className={`rounded-md border px-3 py-1.5 text-xs font-semibold ${bandTone(analysis.riskBand)}`}>Risk {analysis.riskScore?.toFixed(1)} · {analysis.riskBand}</span>
              </div>
            </CardContent>
          </Card>

          {/* 1. Anomaly detection */}
          <Section n={1} title="Anomaly detection" icon={ScanSearch} blurb="Is this unit an outlier compared with its peers in the same lot?">
            <div className="grid gap-4 sm:grid-cols-3">
              <div><p className="blueprint-label">Verdict</p><p className={`mt-1 font-semibold ${analysis.dynamicResult === "ANOMALOUS" ? "text-amber-600 dark:text-amber-300" : ""}`}>{analysis.dynamicResult.replace("_", " ")}</p></div>
              <div><p className="blueprint-label">Robust z-score</p><p className="mt-1 font-mono">{analysis.robustZ == null ? "n/a" : analysis.robustZ.toFixed(2)}</p></div>
              <div><p className="blueprint-label">Anomaly score</p><p className="mt-1 font-mono">{analysis.anomalyScore == null ? "n/a" : `${analysis.anomalyScore.toFixed(1)} / 100`}</p></div>
            </div>
            <div className="mt-3 grid gap-2 border-t border-border pt-3 text-xs text-muted-foreground sm:grid-cols-2">
              <p>Lot peer median: <span className="font-mono text-foreground">{analysis.lotBaseline == null ? "—" : `${analysis.lotBaseline.toFixed(2)} µA`}</span></p>
              <p>Spread (MAD / IQR): <span className="font-mono text-foreground">{analysis.lotMad?.toFixed(2) ?? "—"} / {analysis.lotIqr?.toFixed(2) ?? "—"}</span></p>
            </div>
            <p className="mt-2 text-xs leading-relaxed">
              {analysis.dynamicResult === "INSUFFICIENT_DATA"
                ? "Not enough comparable peers in this lot (need at least 5 with varied readings) to judge this unit against the group."
                : analysis.dynamicResult === "ANOMALOUS"
                  ? "This unit's initial reading sits far enough from the lot's robust centre that it stands out from its peers."
                  : "This unit's initial reading is well within the normal spread of its lot peers."}
            </p>
          </Section>

          {/* 2. Drift prediction */}
          <Section n={2} title="Drift prediction" icon={LineChart} blurb="How is leakage trending, and where is it heading by 168 h?">
            <div className="h-[260px] w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%" minHeight={200}>
                <AreaChart data={chartData} margin={{ left: 0, right: 12, top: 10, bottom: 0 }}>
                  <defs><linearGradient id="wbArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--gov-saffron)" stopOpacity={0.35} /><stop offset="100%" stopColor="var(--gov-saffron)" stopOpacity={0} /></linearGradient></defs>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="time" stroke="var(--muted-foreground)" fontSize={11} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={11} unit=" µA" />
                  <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", color: "var(--popover-foreground)" }} />
                  <Area type="monotone" dataKey="value" name="Leakage" stroke="var(--gov-saffron)" fill="url(#wbArea)" strokeWidth={2} />
                  <ReferenceLine y={analysis.safetyBoundary} stroke="var(--gov-green)" strokeDasharray="5 5" label={{ value: "Safety boundary", fill: "var(--gov-green)", fontSize: 11 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 border-t border-border pt-3 text-xs sm:grid-cols-4">
              <div><p className="text-muted-foreground">Early drift (0→24h)</p><p className="mt-1 font-mono">{analysis.driftPercent?.toFixed(1) ?? "—"}%</p></div>
              <div><p className="text-muted-foreground">168h forecast</p><p className="mt-1 font-mono">{analysis.predicted168h?.toFixed(2) ?? "—"} µA</p></div>
              <div><p className="text-muted-foreground">Prediction interval</p><p className="mt-1 font-mono">{analysis.predictionInterval ? `${analysis.predictionInterval[0].toFixed(1)}–${analysis.predictionInterval[1].toFixed(1)}` : "—"}</p></div>
              <div><p className="text-muted-foreground">Uncertainty</p><p className="mt-1 font-semibold">{analysis.uncertaintyLevel}</p></div>
            </div>
            <p className="mt-2 text-xs leading-relaxed">
              Boundary margin: <span className="font-mono">{analysis.boundaryMargin?.toFixed(2) ?? "—"} µA</span> — {analysis.boundaryStatus === "CROSSES" ? "the forecast crosses the safety boundary before 168 h." : analysis.boundaryStatus === "WATCH" ? "the forecast approaches the safety boundary." : analysis.boundaryStatus === "CLEAR" ? "the forecast stays clear of the safety boundary." : "not enough data to compare against the boundary."}
            </p>
          </Section>

          {/* 3. Risk management */}
          <Section n={3} title="Risk management" icon={GaugeCircle} blurb="One combined score, the suggested screening action, and the human decision.">
            <div className="flex flex-wrap items-center gap-6">
              <div>
                <p className="blueprint-label">Predictive Reliability Risk Score</p>
                <p className="mt-1 text-4xl font-semibold tabular-nums">{analysis.riskScore?.toFixed(1)}<span className="text-lg text-muted-foreground"> / 100</span></p>
                <span className={`mt-1 inline-block rounded border px-2 py-0.5 text-[11px] font-semibold ${bandTone(analysis.riskBand)}`}>{analysis.riskBand}</span>
              </div>
              <div className="flex-1 rounded-md border border-border bg-muted/30 p-3">
                <p className="blueprint-label">Suggested screening action</p>
                <p className="mt-1 font-semibold">{analysis.suggestedAction}</p>
                <p className="mt-1 text-xs text-muted-foreground">A computed recommendation. The QA Engineer's decision below is the record of authority.</p>
              </div>
            </div>

            {analysis.failureMode && (
              <div className="mt-4 border-t border-border pt-4">
                <p className="blueprint-label mb-3">Failure mode signature</p>
                <FailureModeCard failureMode={analysis.failureMode} />
              </div>
            )}

            <div className="mt-4 grid gap-4 border-t border-border pt-4 lg:grid-cols-2">
              <div>
                <p className="text-xs font-medium">Investigation</p>
                {openInv
                  ? <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-300">Open · INV-{String(openInv.id).padStart(4, "0")}</p>
                  : <p className="mt-1 text-xs text-muted-foreground">None open for this component.</p>}
                <Button className="mt-2" size="sm" disabled={openInvestigation.isPending || !!openInv}
                  onClick={() => openInvestigation.mutate({ componentId: selectedId! })}>
                  {openInvestigation.isPending ? "Opening…" : openInv ? "Investigation open" : "Open investigation"}
                </Button>
              </div>
              <div>
                <p className="text-xs font-medium">QA decision {canDecide ? "" : <span className="text-muted-foreground">(QA / Admin only)</span>}</p>
                <div className="mt-1 grid gap-2 sm:grid-cols-[150px_1fr]">
                  <Select value={decision} onValueChange={v => setDecision(v as (typeof DECISIONS)[number])}>
                    <SelectTrigger className="bg-background" disabled={!canDecide}><SelectValue /></SelectTrigger>
                    <SelectContent>{DECISIONS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                  </Select>
                  <Textarea value={comment} onChange={e => setComment(e.target.value)} disabled={!canDecide} placeholder="Rationale (optional)" className="min-h-9 bg-background" />
                </div>
                <Button className="mt-2" size="sm" disabled={!canDecide || decide.isPending}
                  onClick={() => { if (!openInv) { toast.error("Open an investigation first"); return; } decide.mutate({ investigationId: openInv.id, decision, comment: comment || undefined }); }}>
                  {decide.isPending ? "Saving…" : "Record decision"}
                </Button>
              </div>
            </div>

            {!!detail.data?.investigations?.length && (
              <div className="mt-4 space-y-2 border-t border-border pt-3">
                <p className="blueprint-label">Recorded outcomes</p>
                {detail.data.investigations.map(inv => (
                  <div key={inv.id} className="rounded border border-border p-2 text-xs">
                    <div className="flex justify-between"><span>INV-{String(inv.id).padStart(4, "0")}</span><Badge variant="outline" className="border-border">{inv.status}</Badge></div>
                    {inv.decisions?.length
                      ? inv.decisions.map(d => <p key={d.id} className="mt-1 text-muted-foreground"><span className="text-foreground">{d.decision}</span> — {d.comment || "no comment"}</p>)
                      : <p className="mt-1 text-muted-foreground">Awaiting QA decision.</p>}
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* 4. Pass/fail explanation */}
          <Section n={4} title="Pass / fail explanation" icon={CheckCircle2} blurb="Why the static verdict came out this way, and what drives the risk score (SHAP).">
            <PassFailExplanation analysis={analysis} />
          </Section>
        </>
      )}

      {/* Secondary: import + activity */}
      <div className="grid gap-5 lg:grid-cols-2 print:hidden">
        <Card className="blueprint-panel">
          <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-sm"><Upload className="h-4 w-4 text-muted-foreground" />Import measurement data</CardTitle></CardHeader>
          <CardContent>
            <p className="text-xs leading-relaxed text-muted-foreground">Upload a CSV to validate and import as a new lot. The native checkpoint format and the ESS telemetry export are both accepted; problematic rows are reported, never silently imported.</p>
            <label className={`mt-3 flex items-center justify-center gap-2 rounded border border-dashed border-border bg-background px-3 py-3 text-xs hover:bg-accent ${validateMut.isPending ? "pointer-events-none opacity-60" : ""}`}>
              <Upload className="h-4 w-4" />{validateMut.isPending ? "Validating…" : "Choose CSV"}
              <input className="sr-only" type="file" accept=".csv,text/csv" disabled={validateMut.isPending} onChange={e => { const f = e.target.files?.[0]; if (f) void onPickCsv(f); }} />
            </label>
            {report && <div className="mt-3 space-y-2 text-[11px]">
              <p className={report.valid ? "text-emerald-600 dark:text-emerald-300" : "text-amber-600 dark:text-amber-300"}>{report.valid ? `Valid · ${report.rowCount.toLocaleString()} rows` : "Validation issues found"}</p>
              <div className="max-h-20 space-y-1 overflow-auto text-muted-foreground">{report.errors.length ? report.errors.slice(0, 5).map(e => <p key={`${e.row}-${e.code}`}>Row {e.row || "—"}: {e.message}</p>) : <p>No errors.</p>}</div>
              {report.warnings.map(w => <p key={w} className="text-yellow-600 dark:text-yellow-200">Warning: {w}</p>)}
            </div>}
            {report?.valid && pendingCsv && <div className="mt-3 space-y-2 border-t border-border pt-3">
              <div className="grid grid-cols-2 gap-2">
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Spec max (µA)<Input type="number" min="0.01" step="0.01" value={specMax} onChange={e => setSpecMax(Number(e.target.value))} className="mt-1 h-8 bg-background" /></label>
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Safety boundary (µA)<Input type="number" min="0.01" step="0.01" value={boundary} onChange={e => setBoundary(Number(e.target.value))} className="mt-1 h-8 bg-background" /></label>
              </div>
              <Button size="sm" className="w-full" disabled={importMut.isPending}
                onClick={() => importMut.mutate({ csv: pendingCsv.text, filename: pendingCsv.filename, specificationMax: specMax, safetyBoundary: boundary })}>
                {importMut.isPending ? "Importing…" : "Import dataset"}
              </Button>
            </div>}
            {importMut.data && <p className="mt-3 rounded border border-emerald-500/30 bg-emerald-500/5 p-2 text-[11px] text-emerald-600 dark:text-emerald-300">Imported {importMut.data.lotCode} ({importMut.data.format}) · {importMut.data.componentsCreated} new component(s) · {importMut.data.measurementsInserted} measurement(s).</p>}
          </CardContent>
        </Card>

        <Card className="blueprint-panel">
          <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-sm"><AlertTriangle className="h-4 w-4 text-muted-foreground" />Recent activity</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {audit.data?.length ? audit.data.slice(0, 8).map(log => (
              <div key={log.id} className="flex items-start justify-between gap-3 border-b border-border pb-2 text-xs last:border-0">
                <div><p className="font-medium">{log.action.replaceAll("_", " ")}</p><p className="text-muted-foreground">{log.targetType}{log.targetId ? ` · ${log.targetId}` : ""}</p></div>
                <span className="shrink-0 font-mono text-[10px] text-muted-foreground">{log.createdAt ? new Date(log.createdAt).toLocaleTimeString() : "—"}</span>
              </div>
            )) : <p className="text-xs text-muted-foreground">No audit events yet.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  </DashboardLayout>;
}
