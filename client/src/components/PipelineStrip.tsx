import { CheckCircle2, Cpu, Database, FlaskConical, ShieldCheck, Upload } from "lucide-react";

const STEPS = [
  { label: "Upload data", icon: Upload },
  { label: "Validate data", icon: CheckCircle2 },
  { label: "Process telemetry", icon: Database },
  { label: "Run ML model", icon: Cpu },
  { label: "Reliability analysis", icon: FlaskConical },
  { label: "Health / prediction results", icon: ShieldCheck },
];

/** Static explainer of the CSV -> ML -> reliability workflow. Purely presentational — it does not change how the pipeline itself runs. */
export default function PipelineStrip({ className = "" }: { className?: string }) {
  return (
    <div className={`blueprint-panel flex flex-wrap items-center gap-x-1 gap-y-2 overflow-x-auto p-3 text-[11px] ${className}`}>
      {STEPS.map((step, i) => (
        <div key={step.label} className="flex items-center gap-1">
          <div className="flex items-center gap-1.5 whitespace-nowrap px-2 py-1 text-muted-foreground">
            <step.icon className="h-3.5 w-3.5 text-primary" />
            {step.label}
          </div>
          {i < STEPS.length - 1 && <span className="text-border">→</span>}
        </div>
      ))}
    </div>
  );
}
