import { setDemoRole, type DemoRole } from "@/const";

const OPTIONS: { key: DemoRole; label: string }[] = [
  { key: "admin", label: "Admin" },
  { key: "scientist", label: "Reliability Engineer" },
  { key: "qa", label: "QA Engineer" },
];

/**
 * Read-only preview affordance: lets an unauthenticated visitor page through
 * the role-specific dashboards. It only rewrites a sessionStorage hint and
 * reloads — every mutation is still blocked server-side.
 */
export default function DemoRoleSwitch({ role }: { role: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-dashed border-border bg-muted/30 px-3 py-2">
      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Read-only preview · view as</span>
      {OPTIONS.map(o => (
        <button
          key={o.key}
          onClick={() => { setDemoRole(o.key); window.location.reload(); }}
          className={`rounded border px-2.5 py-1 text-xs font-medium transition-colors ${role === o.key ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-accent hover:text-foreground"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
