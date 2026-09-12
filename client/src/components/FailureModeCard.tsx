import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, Lightbulb, TrendingDown, Zap } from "lucide-react";
import type { FailureModeAnalysis } from "../../../server/failureModes";

type FailureMode = FailureModeAnalysis["detectedMode"];

const modeIcons: Record<FailureMode, typeof Zap> = {
  WEAR_OUT: TrendingDown,
  INFANT_MORTALITY: AlertTriangle,
  PARAMETRIC_DRIFT: TrendingDown,
  THERMAL_RUNAWAY: AlertTriangle,
  ELECTROMIGRATION: Zap,
  RANDOM_CATASTROPHIC: AlertTriangle,
  UNKNOWN: Lightbulb,
};

const modeColors: Record<FailureMode, string> = {
  WEAR_OUT: "border-blue-500/30 bg-blue-500/5 text-blue-600 dark:text-blue-300",
  INFANT_MORTALITY: "border-amber-500/30 bg-amber-500/5 text-amber-600 dark:text-amber-300",
  PARAMETRIC_DRIFT: "border-orange-500/30 bg-orange-500/5 text-orange-600 dark:text-orange-300",
  THERMAL_RUNAWAY: "border-red-500/30 bg-red-500/5 text-red-600 dark:text-red-300",
  ELECTROMIGRATION: "border-purple-500/30 bg-purple-500/5 text-purple-600 dark:text-purple-300",
  RANDOM_CATASTROPHIC: "border-red-500/30 bg-red-500/5 text-red-600 dark:text-red-300",
  UNKNOWN: "border-border bg-muted text-muted-foreground",
};

const modeTitles: Record<FailureMode, string> = {
  WEAR_OUT: "Wear-Out Degradation",
  INFANT_MORTALITY: "Infant Mortality",
  PARAMETRIC_DRIFT: "Parametric Drift",
  THERMAL_RUNAWAY: "Thermal Runaway",
  ELECTROMIGRATION: "Electromigration",
  RANDOM_CATASTROPHIC: "Catastrophic Failure",
  UNKNOWN: "Unknown Failure Mode",
};

export default function FailureModeCard({ failureMode }: { failureMode: FailureModeAnalysis | undefined }) {
  if (!failureMode) return null;

  const Icon = modeIcons[failureMode.detectedMode];
  const colorClass = modeColors[failureMode.detectedMode];
  const title = modeTitles[failureMode.detectedMode];
  const confidencePct = `${Math.round(failureMode.confidence)}%`;

  return (
    <Card className="blueprint-panel border-l-4" style={{ borderLeftColor: failureMode.detectedMode === "UNKNOWN" ? "var(--border)" : "currentColor" }}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className={`rounded-md border px-3 py-1.5 text-xs font-semibold ${colorClass} shrink-0`}>
            <Icon className="mb-0.5 inline h-3.5 w-3.5 mr-1" />
            {title}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2 mb-1">
              <p className="blueprint-label text-xs">Detected signature</p>
              <span className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded">{confidencePct} confidence</span>
            </div>
            <p className="text-sm leading-relaxed mb-2">{failureMode.description}</p>
            <p className="text-xs text-muted-foreground leading-relaxed font-mono bg-muted/30 px-2.5 py-2 rounded border border-border">
              {failureMode.predictedBehavior}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
