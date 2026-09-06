import { CheckCircle2, HelpCircle, MinusCircle, TrendingDown, TrendingUp, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ReliabilityResult } from "../../../server/reliability";

/**
 * Explains the two decisions a reviewer actually cares about:
 *   1. the deterministic static PASS / FAIL against the spec limit, and
 *   2. the predictive risk score, decomposed with exact linear SHAP against
 *      the lot's peer mean.
 */
export default function PassFailExplanation({ analysis }: { analysis: ReliabilityResult }) {
  const s = analysis.staticExplanation;
  const shap = analysis.shap;
  const verdictTone =
    s.verdict === "PASS" ? "text-emerald-700 dark:text-emerald-300 border-emerald-500/30 bg-emerald-500/5"
    : s.verdict === "FAIL" ? "text-red-700 dark:text-red-300 border-red-500/30 bg-red-500/5"
    : "text-muted-foreground border-border bg-muted/30";
  const VerdictIcon = s.verdict === "PASS" ? CheckCircle2 : s.verdict === "FAIL" ? XCircle : HelpCircle;

  const maxAbs = Math.max(1, ...(shap?.features ?? []).map(f => Math.abs(f.contribution)));
  const fillPct = (v: number) => `${(Math.abs(v) / maxAbs) * 50}%`;

  return (
    <Card className="blueprint-panel">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Why this result</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* 1. Static specification decision */}
        <div className={`rounded-md border p-3 ${verdictTone}`}>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <VerdictIcon className="h-4 w-4" />
            Static specification: {s.verdict}
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{s.reason}</p>
          {s.measured != null && (
            <div className="mt-3">
              <div className="relative h-2 rounded-full bg-muted">
                <div
                  className={`absolute inset-y-0 left-0 rounded-full ${s.verdict === "FAIL" ? "bg-red-500" : "bg-emerald-500"}`}
                  style={{ width: `${Math.min(100, (s.measured / Math.max(s.limit, s.measured)) * 100)}%` }}
                />
                <div className="absolute inset-y-[-3px] w-0.5 bg-foreground" style={{ left: `${Math.min(100, (s.limit / Math.max(s.limit, s.measured)) * 100)}%` }} />
              </div>
              <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                <span>measured {s.measured.toFixed(2)} µA</span>
                <span>limit {s.limit.toFixed(2)} µA</span>
              </div>
            </div>
          )}
        </div>

        {/* 2. Predictive risk — SHAP */}
        <div>
          <div className="flex items-baseline justify-between">
            <p className="blueprint-label">Predictive risk · SHAP contributions</p>
            {analysis.riskScore != null && <span className="font-mono text-xs">{analysis.riskScore.toFixed(1)} / 100 · {analysis.riskBand}</span>}
          </div>

          {!shap ? (
            <p className="mt-2 text-xs text-muted-foreground">
              A SHAP baseline needs at least 3 peer components in the lot. Import or seed more peers to see the per-feature decomposition.
            </p>
          ) : (
            <>
              <p className="mt-2 text-xs leading-relaxed">{shap.summary}</p>
              <div className="mt-3 space-y-2.5">
                {shap.features.map(f => {
                  const Icon = f.direction === "increases" ? TrendingUp : f.direction === "decreases" ? TrendingDown : MinusCircle;
                  const tone = f.direction === "increases" ? "text-red-600 dark:text-red-400" : f.direction === "decreases" ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground";
                  return (
                    <div key={f.key}>
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 text-muted-foreground"><Icon className={`h-3.5 w-3.5 ${tone}`} />{f.label}</span>
                        <span className={`font-mono ${tone}`}>{f.contribution >= 0 ? "+" : ""}{f.contribution.toFixed(1)}</span>
                      </div>
                      {/* diverging bar: centre = no effect, right = raises risk, left = lowers risk */}
                      <div className="relative mt-1 h-1.5 bg-muted">
                        <div className="absolute inset-y-0 left-1/2 w-px bg-border" />
                        <div
                          className={`absolute inset-y-0 ${f.direction === "decreases" ? "right-1/2 bg-emerald-500" : "left-1/2 bg-red-500"}`}
                          style={{ width: fillPct(f.contribution) }}
                        />
                      </div>
                      <p className="mt-0.5 text-[10px] text-muted-foreground">this unit {f.value.toFixed(0)} · lot peers avg {f.baseline.toFixed(0)}</p>
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-border pt-2 text-[10px] text-muted-foreground">
                <span>base value <span className="font-mono text-foreground">{shap.baseValue.toFixed(1)}</span> (avg peer) → prediction <span className="font-mono text-foreground">{shap.prediction.toFixed(1)}</span></span>
                <span>{shap.method} · {shap.peerCount} peers</span>
              </div>
              <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">{shap.caveat}</p>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
