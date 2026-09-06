import { useEffect, useState } from "react";
import { CheckCircle2, GitBranch, LockKeyhole, Settings2, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import DemoRoleSwitch from "@/components/DemoRoleSwitch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getDemoRole, isDemoPreview } from "@/const";

const RISK_BANDS = [
  { band: "NORMAL", range: "0 – 20", tone: "text-emerald-600 dark:text-emerald-300" },
  { band: "WATCH", range: "21 – 40", tone: "text-yellow-600 dark:text-yellow-200" },
  { band: "SUSPICIOUS", range: "41 – 60", tone: "text-amber-600 dark:text-amber-300" },
  { band: "HIGH RISK", range: "61 – 80", tone: "text-orange-600 dark:text-orange-300" },
  { band: "CRITICAL", range: "81 – 100", tone: "text-red-600 dark:text-red-300" },
];
const ACTIONS = [
  { action: "Standard Screening", range: "score < 41" },
  { action: "Re-test", range: "41 – 59" },
  { action: "Extended Burn-In", range: "60 – 79" },
  { action: "Hold for Review", range: "≥ 80" },
];

export default function Configuration() {
  const { user } = useAuth();
  const demoPreview = !user && isDemoPreview();
  const role = demoPreview ? getDemoRole() : (user?.role ?? "user");
  const isAdmin = role === "admin" && !demoPreview;
  const canRead = Boolean(user) || demoPreview;

  const lots = trpc.lots.list.useQuery(undefined, { enabled: canRead, retry: 1 });
  const models = trpc.models.list.useQuery(undefined, { enabled: canRead, retry: 1 });
  const utils = trpc.useUtils();

  const [lotId, setLotId] = useState<number | undefined>();
  const [specMax, setSpecMax] = useState("");
  const [boundary, setBoundary] = useState("");

  const selectedLot = lots.data?.find(l => l.id === lotId);
  useEffect(() => {
    if (!lotId && lots.data?.length) setLotId(lots.data[0].id);
  }, [lots.data, lotId]);
  useEffect(() => {
    if (selectedLot) {
      setSpecMax(Number(selectedLot.specificationMax).toString());
      setBoundary(Number(selectedLot.safetyMargin).toString());
    }
  }, [selectedLot]);

  const updateLot = trpc.configuration.updateLot.useMutation({
    onSuccess: async () => {
      await Promise.all([lots.refetch(), utils.dashboard.summary.invalidate(), utils.components.get.invalidate()]);
      toast.success("Lot parameters saved · cached analyses cleared · change audited");
    },
    onError: e => toast.error(e.message),
  });

  const dirty =
    selectedLot != null &&
    (Number(specMax) !== Number(selectedLot.specificationMax) || Number(boundary) !== Number(selectedLot.safetyMargin)) &&
    Number(specMax) > 0 && Number(boundary) > 0;

  return <DashboardLayout>
    <div className="container space-y-5 pb-12">
      {demoPreview && <DemoRoleSwitch role={role} />}

      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="blueprint-label text-primary">CONFIGURATION · CONTROL PLANE</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">Configuration</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Screening parameters that feed the analysis engine, the fixed risk model bands, and the registered model versions.</p>
        </div>
        <Badge variant="outline" className="w-fit border-border">{isAdmin ? "Admin — editable" : `${role} — read-only`}</Badge>
      </header>

      {/* Lot screening parameters */}
      <Card className="blueprint-panel">
        <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-sm"><SlidersHorizontal className="h-4 w-4 text-primary" />Lot screening parameters</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">Specification limit and safety boundary are stored per lot and used directly by every subsequent analysis. Saving a change clears that lot's cached scores so they recompute.</p>
          <div className="grid gap-3 sm:grid-cols-[1fr_160px_160px_auto] sm:items-end">
            <label><span className="blueprint-label">Lot</span>
              <Select value={lotId ? String(lotId) : ""} onValueChange={v => setLotId(Number(v))}>
                <SelectTrigger className="mt-1 bg-background"><SelectValue placeholder="Select lot" /></SelectTrigger>
                <SelectContent>{lots.data?.map(l => <SelectItem key={l.id} value={String(l.id)}>{l.lotCode}</SelectItem>)}</SelectContent>
              </Select>
            </label>
            <label><span className="blueprint-label">Spec max (µA)</span>
              <Input type="number" min="0.01" step="0.01" className="mt-1 bg-background" value={specMax} disabled={!isAdmin} onChange={e => setSpecMax(e.target.value)} />
            </label>
            <label><span className="blueprint-label">Safety boundary (µA)</span>
              <Input type="number" min="0.01" step="0.01" className="mt-1 bg-background" value={boundary} disabled={!isAdmin} onChange={e => setBoundary(e.target.value)} />
            </label>
            <Button disabled={!isAdmin || !dirty || updateLot.isPending}
              onClick={() => lotId && updateLot.mutate({ lotId, specificationMax: Number(specMax), safetyBoundary: Number(boundary) })}>
              {updateLot.isPending ? "Saving…" : "Save"}
            </Button>
          </div>
          {!isAdmin && <p className="flex items-center gap-2 text-xs text-muted-foreground"><LockKeyhole className="h-3.5 w-3.5" />Editing lot parameters requires the Admin role.</p>}

          <div className="overflow-x-auto rounded border border-border">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 text-muted-foreground"><tr>
                <th className="px-3 py-2 font-medium">Lot</th><th className="px-3 py-2 font-medium">Device family</th>
                <th className="px-3 py-2 font-medium">Spec max</th><th className="px-3 py-2 font-medium">Safety boundary</th><th className="px-3 py-2 font-medium">Data label</th>
              </tr></thead>
              <tbody>{lots.data?.map(l => (
                <tr key={l.id} className="border-t border-border">
                  <td className="px-3 py-2 font-mono">{l.lotCode}</td>
                  <td className="px-3 py-2 text-muted-foreground">{l.deviceFamily}</td>
                  <td className="px-3 py-2 font-mono">{Number(l.specificationMax).toFixed(2)} µA</td>
                  <td className="px-3 py-2 font-mono">{Number(l.safetyMargin).toFixed(2)} µA</td>
                  <td className="px-3 py-2"><Badge variant="outline" className="border-border">{l.dataLabel}</Badge></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Fixed risk model */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="blueprint-panel">
          <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-sm"><Settings2 className="h-4 w-4 text-primary" />Risk bands &amp; suggested actions</CardTitle></CardHeader>
          <CardContent className="space-y-4 text-xs">
            <p className="text-muted-foreground">These thresholds are part of model <span className="font-mono">PRRS-LINEAR-1.0</span>. Changing them is a model revision, not a runtime setting.</p>
            <div>
              <p className="blueprint-label mb-1">Score → band</p>
              {RISK_BANDS.map(b => <div key={b.band} className="flex justify-between border-b border-border py-1 last:border-0"><span className={b.tone}>{b.band}</span><span className="font-mono text-muted-foreground">{b.range}</span></div>)}
            </div>
            <div>
              <p className="blueprint-label mb-1">Score → suggested action</p>
              {ACTIONS.map(a => <div key={a.action} className="flex justify-between border-b border-border py-1 last:border-0"><span>{a.action}</span><span className="font-mono text-muted-foreground">{a.range}</span></div>)}
            </div>
          </CardContent>
        </Card>

        <Card className="blueprint-panel">
          <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-sm"><GitBranch className="h-4 w-4 text-primary" />Registered models</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-xs">
            {models.data?.map(m => (
              <div key={m.id} className="rounded border border-border p-3">
                <div className="flex items-center justify-between"><span className="font-medium">{m.name}</span><Badge variant="outline" className="border-border font-mono">{m.version}</Badge></div>
                <p className="mt-1 text-muted-foreground">{m.modelType}</p>
                <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                  {(["mae", "rmse", "r2"] as const).map(k => (
                    <div key={k}><p className="text-muted-foreground uppercase">{k}</p><p className="mt-0.5 font-mono">{(m.metricsJson as Record<string, number>)?.[k] ?? "—"}</p></div>
                  ))}
                </div>
                <p className="mt-2 text-[10px] text-muted-foreground">dataset {m.datasetId} · features {m.featureVersion}</p>
              </div>
            ))}
            {!models.data?.length && <p className="text-muted-foreground">No models registered yet.</p>}
          </CardContent>
        </Card>
      </div>

      <Card className="blueprint-panel">
        <CardContent className="flex items-center gap-3 p-4 text-xs text-muted-foreground">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
          Every parameter change is written to the immutable audit trail as CONFIGURATION_CHANGED with the lot id and the new values.
        </CardContent>
      </Card>
    </div>
  </DashboardLayout>;
}
