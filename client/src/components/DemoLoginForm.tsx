import { useState } from "react";
import { AlertCircle, KeyRound, ShieldCheck, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";

const QUICK_ACCOUNTS = [
  { role: "admin" as const, label: "Admin", id: "DEMO-ADMIN", password: "demo-admin" },
  { role: "scientist" as const, label: "Scientist", id: "DEMO-SCIENTIST", password: "demo-scientist" },
  { role: "qa" as const, label: "QA Engineer", id: "DEMO-QA", password: "demo-qa" },
];

/**
 * Sign-in: three one-click demo accounts (documented in the README) so SIH
 * judges reach every role dashboard instantly, plus a real employee-ID
 * login/registration flow backed by a persisted, password-hashed account.
 * These are two separate credential spaces — demo IDs are reserved and
 * cannot be registered as real accounts.
 */
export default function DemoLoginForm({ onSuccess }: { onSuccess: () => void }) {
  const [mode, setMode] = useState<"login" | "register">("login");

  // Real employee login
  const [employeeId, setEmployeeId] = useState("");
  const [password, setPassword] = useState("");
  const login = trpc.auth.login.useMutation({ onSuccess: () => onSuccess() });

  // Real employee registration
  const [regId, setRegId] = useState("");
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const register = trpc.auth.register.useMutation({ onSuccess: () => onSuccess() });

  // Demo quick access
  const demoLogin = trpc.auth.demoLogin.useMutation({ onSuccess: () => onSuccess() });

  return (
    <div>
      <div className="grid grid-cols-3 gap-2">
        {QUICK_ACCOUNTS.map(acc => (
          <button
            key={acc.role}
            type="button"
            disabled={demoLogin.isPending}
            onClick={() => demoLogin.mutate({ employeeId: acc.id, password: acc.password })}
            className="flex flex-col items-center gap-1 border border-border bg-card px-2 py-3 text-center text-xs font-medium transition-colors hover:border-primary hover:bg-accent disabled:opacity-50"
          >
            <ShieldCheck className="h-4 w-4 text-primary" />
            {acc.label}
          </button>
        ))}
      </div>
      <p className="mt-2 text-center text-[11px] text-muted-foreground">One click — instantly signed in as that role (judges: use this).</p>

      <div className="my-4 flex items-center gap-3 text-[10px] uppercase tracking-wider text-muted-foreground">
        <span className="h-px flex-1 bg-border" />employee account<span className="h-px flex-1 bg-border" />
      </div>

      <div className="mb-3 grid grid-cols-2 gap-1 border border-border p-1 text-xs font-medium">
        <button type="button" onClick={() => setMode("login")} className={`py-1.5 transition-colors ${mode === "login" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"}`}>Sign in</button>
        <button type="button" onClick={() => setMode("register")} className={`py-1.5 transition-colors ${mode === "register" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"}`}>Create account</button>
      </div>

      {mode === "login" ? (
        <form
          className="space-y-3"
          onSubmit={e => { e.preventDefault(); login.mutate({ employeeId, password }); }}
        >
          <label className="block">
            <span className="blueprint-label">Employee ID</span>
            <Input className="mt-1" value={employeeId} onChange={e => setEmployeeId(e.target.value)} placeholder="e.g. EMP-1042" autoComplete="username" />
          </label>
          <label className="block">
            <span className="blueprint-label">Password</span>
            <Input className="mt-1" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" />
          </label>
          {login.error && (
            <div className="flex items-start gap-2 border border-destructive/30 bg-destructive/5 p-2.5 text-xs text-destructive">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />{login.error.message}
            </div>
          )}
          <Button type="submit" className="w-full" disabled={login.isPending || !employeeId || !password}>
            <KeyRound className="mr-2 h-4 w-4" />{login.isPending ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      ) : (
        <form
          className="space-y-3"
          onSubmit={e => { e.preventDefault(); register.mutate({ employeeId: regId, name: regName, email: regEmail, password: regPassword }); }}
        >
          <label className="block">
            <span className="blueprint-label">Full name</span>
            <Input className="mt-1" value={regName} onChange={e => setRegName(e.target.value)} placeholder="Your name" autoComplete="name" />
          </label>
          <label className="block">
            <span className="blueprint-label">Choose an Employee ID</span>
            <Input className="mt-1" value={regId} onChange={e => setRegId(e.target.value)} placeholder="e.g. EMP-1042" autoComplete="username" />
          </label>
          <label className="block">
            <span className="blueprint-label">Email (optional)</span>
            <Input className="mt-1" type="email" value={regEmail} onChange={e => setRegEmail(e.target.value)} placeholder="you@organisation.in" autoComplete="email" />
          </label>
          <label className="block">
            <span className="blueprint-label">Password (min 8 characters)</span>
            <Input className="mt-1" type="password" value={regPassword} onChange={e => setRegPassword(e.target.value)} placeholder="••••••••" autoComplete="new-password" />
          </label>
          {register.error && (
            <div className="flex items-start gap-2 border border-destructive/30 bg-destructive/5 p-2.5 text-xs text-destructive">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />{register.error.message}
            </div>
          )}
          <Button type="submit" className="w-full" disabled={register.isPending || !regId || !regName || regPassword.length < 8}>
            <UserPlus className="mr-2 h-4 w-4" />{register.isPending ? "Creating account…" : "Create account"}
          </Button>
          <p className="text-[10px] text-muted-foreground">New accounts default to the Scientist / Reliability Engineer role. An admin can change this later from User management.</p>
        </form>
      )}
    </div>
  );
}
