import { useState } from "react";
import { AlertCircle, KeyRound, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";

const QUICK_ACCOUNTS = [
  { role: "admin" as const, label: "Admin", id: "DEMO-ADMIN", password: "demo-admin" },
  { role: "scientist" as const, label: "Scientist", id: "DEMO-SCIENTIST", password: "demo-scientist" },
  { role: "qa" as const, label: "QA Engineer", id: "DEMO-QA", password: "demo-qa" },
];

/**
 * Prototype sign-in: fixed demo accounts (documented in the README) so SIH
 * judges reach every role dashboard without a real account. This is not a
 * security boundary — it's a hackathon convenience, and every credential
 * here is intentionally public.
 */
export default function DemoLoginForm({ onSuccess }: { onSuccess: () => void }) {
  const [employeeId, setEmployeeId] = useState("");
  const [password, setPassword] = useState("");
  const login = trpc.auth.demoLogin.useMutation({ onSuccess: () => onSuccess() });

  const submit = (id: string, pass: string) => {
    setEmployeeId(id);
    setPassword(pass);
    login.mutate({ employeeId: id, password: pass });
  };

  return (
    <div>
      <div className="grid grid-cols-3 gap-2">
        {QUICK_ACCOUNTS.map(acc => (
          <button
            key={acc.role}
            type="button"
            disabled={login.isPending}
            onClick={() => submit(acc.id, acc.password)}
            className="flex flex-col items-center gap-1 border border-border bg-card px-2 py-3 text-center text-xs font-medium transition-colors hover:border-primary hover:bg-accent disabled:opacity-50"
          >
            <ShieldCheck className="h-4 w-4 text-primary" />
            {acc.label}
          </button>
        ))}
      </div>
      <p className="mt-2 text-center text-[11px] text-muted-foreground">One click — instantly signed in as that role.</p>

      <div className="my-4 flex items-center gap-3 text-[10px] uppercase tracking-wider text-muted-foreground">
        <span className="h-px flex-1 bg-border" />or enter credentials manually<span className="h-px flex-1 bg-border" />
      </div>

      <form
        className="space-y-3"
        onSubmit={e => {
          e.preventDefault();
          login.mutate({ employeeId, password });
        }}
      >
        <label className="block">
          <span className="blueprint-label">Scientist / Employee ID</span>
          <Input className="mt-1" value={employeeId} onChange={e => setEmployeeId(e.target.value)} placeholder="DEMO-SCIENTIST" autoComplete="username" />
        </label>
        <label className="block">
          <span className="blueprint-label">Password</span>
          <Input className="mt-1" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" />
        </label>
        {login.error && (
          <div className="flex items-start gap-2 border border-destructive/30 bg-destructive/5 p-2.5 text-xs text-destructive">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {login.error.message}
          </div>
        )}
        <Button type="submit" className="w-full" disabled={login.isPending || !employeeId || !password}>
          <KeyRound className="mr-2 h-4 w-4" />
          {login.isPending ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </div>
  );
}
