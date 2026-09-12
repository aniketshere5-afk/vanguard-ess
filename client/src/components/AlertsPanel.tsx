import { Bell } from "lucide-react";
import { useLocation } from "wouter";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { trpc } from "@/lib/trpc";

/**
 * Live alert feed: components currently at HIGH RISK or CRITICAL. Polls
 * every 30s so it reads as active monitoring rather than a static count.
 */
export default function AlertsPanel() {
  const alerts = trpc.alerts.list.useQuery(undefined, { refetchInterval: 30_000, retry: 1 });
  const [, navigate] = useLocation();
  const count = alerts.data?.length ?? 0;
  const criticalCount = alerts.data?.filter(a => a.riskBand === "CRITICAL").length ?? 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="relative flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-accent/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`${count} active risk alert${count === 1 ? "" : "s"}`}
        >
          <Bell className="h-4 w-4 text-muted-foreground" />
          {count > 0 && (
            <span className={`absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold text-white ${criticalCount > 0 ? "bg-destructive" : ""}`} style={criticalCount === 0 ? { background: "var(--gov-saffron)" } : undefined}>
              {count > 9 ? "9+" : count}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-80">
        <div className="border-b border-border px-3 py-2.5">
          <p className="text-xs font-semibold">Risk alerts</p>
          <p className="text-[11px] text-muted-foreground">Components at HIGH RISK or CRITICAL right now.</p>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {alerts.isLoading ? (
            <p className="px-3 py-4 text-center text-xs text-muted-foreground">Checking…</p>
          ) : count === 0 ? (
            <p className="px-3 py-4 text-center text-xs text-muted-foreground">No components currently flagged. All clear.</p>
          ) : (
            alerts.data?.map(a => (
              <DropdownMenuItem
                key={a.componentId}
                onClick={() => navigate(`/reliability?component=${a.componentId}`)}
                className="cursor-pointer flex-col items-start gap-0.5 px-3 py-2"
              >
                <div className="flex w-full items-center justify-between">
                  <span className="font-mono text-xs font-medium">{a.componentCode}</span>
                  <span className={`text-[10px] font-semibold ${a.riskBand === "CRITICAL" ? "status-text-critical" : "status-text-watch"}`}>{a.riskScore?.toFixed(0)} · {a.riskBand}</span>
                </div>
                <span className="text-[10px] text-muted-foreground">{a.lotCode} · Suggested: {a.suggestedAction}</span>
              </DropdownMenuItem>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
