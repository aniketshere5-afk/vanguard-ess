import DashboardLayout from "@/components/DashboardLayout";
import OrbitalLoader from "@/components/OrbitalLoader";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Scale } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const barColor = (avgRisk: number) => (avgRisk >= 61 ? "var(--destructive)" : avgRisk >= 41 ? "var(--gov-saffron)" : "var(--gov-green)");

export default function LotComparison() {
  const { user } = useAuth();
  const canRead = Boolean(user);
  const summary = trpc.dashboard.summary.useQuery(undefined, { enabled: canRead, retry: 1 });

  const lots = summary.data?.lotHealth ?? [];
  const chartData = lots.map(l => ({ name: l.lotCode, avgRisk: l.avgRisk, anomalyRate: l.componentCount ? Math.round((l.anomalyCount / l.componentCount) * 100) : 0 }));

  if (summary.isLoading) return <DashboardLayout><OrbitalLoader label="Comparing lots…" /></DashboardLayout>;

  return <DashboardLayout>
    <div className="container space-y-5 pb-12">
      <header>
        <p className="blueprint-label text-primary">CROSS-LOT INTELLIGENCE</p>
        <h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold tracking-tight md:text-3xl"><Scale className="h-6 w-6 text-primary" />Lot comparison</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Average risk and anomaly rate across every lot, so a problem specific to one batch — not the whole line — is obvious at a glance.</p>
      </header>

      {lots.length < 2 && (
        <Card className="blueprint-panel"><CardContent className="p-4 text-xs text-muted-foreground">
          Only {lots.length} lot{lots.length === 1 ? "" : "s"} in the system right now — comparison becomes useful once you import a second dataset from the Reliability workbench.
        </CardContent></Card>
      )}

      <Card className="blueprint-panel">
        <CardHeader className="pb-0"><CardTitle className="text-sm">Average risk score by lot</CardTitle></CardHeader>
        <CardContent>
          <div className="h-[260px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%" minHeight={200}>
              <BarChart data={chartData} margin={{ left: 0, right: 12, top: 15, bottom: 0 }}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} domain={[0, 100]} />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", color: "var(--popover-foreground)" }} />
                <Bar dataKey="avgRisk" name="Avg risk score" radius={[3, 3, 0, 0]}>
                  {chartData.map(d => <Cell key={d.name} fill={barColor(d.avgRisk)} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="blueprint-panel">
        <CardHeader className="pb-3"><CardTitle className="text-sm">Lot-by-lot detail</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-muted-foreground"><tr>
              <th className="px-3 py-2 font-medium">Lot</th>
              <th className="px-3 py-2 font-medium">Device family</th>
              <th className="px-3 py-2 font-medium">Data label</th>
              <th className="px-3 py-2 font-medium">Components</th>
              <th className="px-3 py-2 font-medium">Avg risk</th>
              <th className="px-3 py-2 font-medium">Anomalies</th>
              <th className="px-3 py-2 font-medium">Spec max</th>
              <th className="px-3 py-2 font-medium">Safety boundary</th>
            </tr></thead>
            <tbody>
              {lots.map(lot => (
                <tr key={lot.id} className="border-t border-border">
                  <td className="px-3 py-2 font-mono">{lot.lotCode}</td>
                  <td className="px-3 py-2 text-muted-foreground">{lot.deviceFamily}</td>
                  <td className="px-3 py-2"><Badge variant="outline" className="border-border">{lot.dataLabel}</Badge></td>
                  <td className="px-3 py-2 font-mono">{lot.componentCount}</td>
                  <td className="px-3 py-2 font-mono" style={{ color: barColor(lot.avgRisk) }}>{lot.avgRisk}</td>
                  <td className="px-3 py-2 font-mono">{lot.anomalyCount}</td>
                  <td className="px-3 py-2 font-mono">{Number(lot.specificationMax).toFixed(2)} µA</td>
                  <td className="px-3 py-2 font-mono">{Number(lot.safetyMargin).toFixed(2)} µA</td>
                </tr>
              ))}
              {!lots.length && <tr><td colSpan={8} className="px-3 py-4 text-center text-muted-foreground">No lots yet.</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  </DashboardLayout>;
}
