import { useState } from "react";
import { CheckCircle2, LockKeyhole, Settings2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { isDemoPreview } from "@/const";

export default function Configuration() {
  const { user } = useAuth();
  const canRead = Boolean(user) || isDemoPreview();
  const lots = trpc.lots.list.useQuery(undefined, { enabled: canRead, retry: 1 });
  const models = trpc.models.list.useQuery(undefined, { enabled: canRead, retry: 1 });
  const [selectedLotId, setSelectedLotId] = useState<number>();
  const [boundary, setBoundary] = useState(42);
  const updateBoundary = trpc.configuration.updateBoundary.useMutation({ onSuccess: () => toast.success("Safety boundary configuration recorded in audit history"), onError: error => toast.error(error.message) });
  const isAdmin = user?.role === "admin";
  const isQa = user?.role === "qa";

  return <DashboardLayout><div className="container space-y-6 pb-12">
    <header className="border-b border-border pb-5"><p className="blueprint-label text-indigo-300">CONFIGURATION / CONTROL PLANE</p><div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h1 className="text-3xl font-semibold tracking-tight">Configuration</h1><p className="mt-2 max-w-2xl text-sm text-muted-foreground">Role-aware configuration surface for reliability thresholds, model metadata, and controlled engineering changes.</p></div><Badge variant="outline" className="w-fit border-indigo-400/40 text-indigo-200"><ShieldCheck className="mr-2 h-3.5 w-3.5" />{user?.role === "admin" ? "Admin" : user?.role === "qa" ? "QA Engineer" : "Reliability Engineer"}</Badge></div></header>
    <section className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]"><Card className="blueprint-panel"><CardHeader><CardTitle className="flex items-center gap-2 text-sm"><Settings2 className="h-4 w-4 text-indigo-300" />Safety boundary</CardTitle></CardHeader><CardContent className="space-y-4"><p className="text-sm leading-relaxed text-muted-foreground">Boundary changes are configuration events, not analytical results. The active model will compare future predictions against the configured boundary.</p>{isAdmin ? <><label className="text-xs font-semibold uppercase tracking-[.12em] text-muted-foreground">Lot</label><select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={selectedLotId ?? ""} onChange={event => setSelectedLotId(Number(event.target.value))}><option value="">Select a lot</option>{lots.data?.map(lot => <option key={lot.id} value={lot.id}>{lot.lotCode}</option>)}</select><label className="text-xs font-semibold uppercase tracking-[.12em] text-muted-foreground">Safety boundary (µA)</label><Input type="number" min="0.01" step="0.01" value={boundary} onChange={event => setBoundary(Number(event.target.value))} /><Button onClick={() => selectedLotId && updateBoundary.mutate({ lotId: selectedLotId, safetyBoundary: boundary })} disabled={!selectedLotId || updateBoundary.isPending}>{updateBoundary.isPending ? "Recording…" : "Record boundary change"}</Button></> : <div className="rounded-lg border border-amber-400/30 bg-amber-400/5 p-4 text-sm text-amber-100"><LockKeyhole className="mb-2 h-4 w-4" />Admin role required to change safety-boundary configuration. Current role: {user?.role === "admin" ? "Admin" : user?.role === "qa" ? "QA Engineer" : "Reliability Engineer"}.</div>}</CardContent></Card>
      <Card className="blueprint-panel"><CardHeader><CardTitle className="flex items-center gap-2 text-sm"><CheckCircle2 className="h-4 w-4 text-indigo-300" />Role responsibilities</CardTitle></CardHeader><CardContent className="space-y-3 text-sm"><div className="rounded-lg border border-border p-3"><p className="font-medium">Scientist / Reliability Engineer</p><p className="mt-1 text-xs text-muted-foreground">Inspect lots and components, run analyses, review evidence, and open investigations.</p></div><div className="rounded-lg border border-border p-3"><p className="font-medium">QA Engineer</p><p className="mt-1 text-xs text-muted-foreground">Review evidence, add rationale, record the final screening decision, and close investigations.</p></div><div className="rounded-lg border border-border p-3"><p className="font-medium">Admin</p><p className="mt-1 text-xs text-muted-foreground">Manage controlled configuration changes, roles, device families, and audit oversight.</p></div></CardContent></Card></section>
    <Card className="blueprint-panel"><CardHeader><CardTitle className="text-sm">Registered model metadata</CardTitle></CardHeader><CardContent className="space-y-3">{models.data?.map(model => <div key={model.id} className="flex flex-col gap-2 rounded-lg border border-border p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium">{model.name}</p><p className="mt-1 text-xs text-muted-foreground">{model.modelType} · {model.version} · {model.datasetId}</p></div><div className="font-mono text-xs text-muted-foreground">{JSON.stringify(model.metricsJson)}</div></div>)}{!models.data?.length && <p className="text-sm text-muted-foreground">No model metadata is available yet.</p>}</CardContent></Card>
  </div></DashboardLayout>;
}
