import { CheckCircle2, Circle, Cpu, Database, FlaskConical, ShieldCheck, Upload } from "lucide-react";

export type PipelineStep = { label: string; done: boolean; onClick: () => void };

const ICONS = [Upload, CheckCircle2, Database, Cpu, FlaskConical, ShieldCheck];

/**
 * Clickable workflow breadcrumb. Each step's "done" state and click handler
 * are supplied by the caller from real app state — this component only
 * renders them, it does not fabricate progress.
 */
export default function PipelineStrip({ steps, className = "" }: { steps: PipelineStep[]; className?: string }) {
  return (
    <div className={`blueprint-panel flex flex-wrap items-center gap-x-1 gap-y-2 overflow-x-auto p-3 text-[11px] ${className}`}>
      {steps.map((step, i) => {
        const Icon = ICONS[i] ?? Circle;
        return (
          <div key={step.label} className="flex items-center gap-1">
            <button
              type="button"
              onClick={step.onClick}
              title={step.done ? `${step.label} — done. Click to jump there.` : `${step.label} — not yet. Click to do it now.`}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded px-2 py-1 transition-colors hover:bg-accent ${step.done ? "text-foreground" : "text-muted-foreground"}`}
            >
              {step.done ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> : <Icon className="h-3.5 w-3.5 text-primary" />}
              {step.label}
            </button>
            {i < steps.length - 1 && <span className="text-border">→</span>}
          </div>
        );
      })}
    </div>
  );
}
