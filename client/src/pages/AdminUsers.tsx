import { ShieldCheck, Users, UserCog } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const roles = ["user", "scientist", "qa", "admin"] as const;

export default function AdminUsers() {
  const { user } = useAuth();
  const users = trpc.admin.users.useQuery(undefined, { enabled: user?.role === "admin", retry: 1 });
  const utils = trpc.useUtils();
  const updateRole = trpc.admin.updateUserRole.useMutation({ onSuccess: updated => { utils.admin.users.setData(undefined, current => current?.map(account => account.id === updated.id ? updated : account)); toast.success(`${updated.name || updated.email || "User"} is now assigned the ${updated.role} role`); }, onError: error => toast.error(error.message) });

  return <DashboardLayout><div className="container space-y-6 pb-12">
    <header className="border-b border-border pb-5"><p className="blueprint-label text-indigo-300">ADMIN / ACCESS CONTROL</p><div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h1 className="text-3xl font-semibold tracking-tight">User and role management</h1><p className="mt-2 max-w-2xl text-sm text-muted-foreground">Manage workspace roles for authenticated users. Role changes affect permissions immediately and are written to the audit history.</p></div><Badge variant="outline" className="w-fit border-amber-400/30 text-amber-600 dark:text-amber-200"><ShieldCheck className="mr-2 h-3.5 w-3.5" />Admin only</Badge></div></header>
    {user?.role !== "admin" ? <Card className="blueprint-panel"><CardContent className="p-8 text-center"><ShieldCheck className="mx-auto h-8 w-8 text-amber-300" /><p className="mt-3 font-medium">Administrator access required</p><p className="mt-2 text-sm text-muted-foreground">This surface is protected by the server-side admin role guard.</p></CardContent></Card> : <Card className="blueprint-panel"><CardHeader><CardTitle className="flex items-center gap-2 text-sm"><Users className="h-4 w-4 text-indigo-300" />Registered users</CardTitle></CardHeader><CardContent className="space-y-3">{users.isLoading ? <p className="text-sm text-muted-foreground">Loading users…</p> : users.error ? <p className="text-sm text-rose-300">Unable to load users.</p> : users.data?.length ? users.data.map(account => <div key={account.id} className="flex flex-col gap-4 rounded-lg border border-border bg-background/40 p-4 lg:flex-row lg:items-center lg:justify-between"><div className="flex min-w-0 items-center gap-3"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/15 text-primary"><UserCog className="h-4 w-4" /></div><div className="min-w-0"><p className="truncate text-sm font-medium">{account.name || "Unnamed user"}</p><p className="truncate text-xs text-muted-foreground">{account.email || account.openId}</p><p className="mt-1 text-[10px] uppercase tracking-[.12em] text-muted-foreground">Last active {account.lastSignedIn ? new Date(account.lastSignedIn).toLocaleString() : "—"}</p></div></div><div className="flex items-center gap-2"><Badge variant="outline">{account.role}</Badge><Select value={account.role} onValueChange={role => updateRole.mutate({ id: account.id, role: role as typeof roles[number] })} disabled={updateRole.isPending}><SelectTrigger className="w-[150px]" aria-label={`Change role for ${account.name || account.email || account.openId}`}><SelectValue /></SelectTrigger><SelectContent>{roles.map(role => <SelectItem key={role} value={role}>{role === "qa" ? "QA Engineer" : role === "scientist" ? "Scientist" : role === "admin" ? "Admin" : "User"}</SelectItem>)}</SelectContent></Select></div></div>) : <p className="text-sm text-muted-foreground">No registered users found.</p>}</CardContent></Card>}
    <Card className="blueprint-panel"><CardContent className="flex flex-col gap-2 p-4 text-xs text-muted-foreground sm:flex-row sm:items-center"><ShieldCheck className="h-4 w-4 shrink-0 text-indigo-300" /><span>Use the read-only workspace switcher on the Admin dashboard to preview role-specific layouts. It does not create or modify authentication accounts.</span><Button variant="link" className="h-auto p-0 text-xs sm:ml-auto" onClick={() => window.location.href = "/"}>Back to dashboard</Button></CardContent></Card>
  </div></DashboardLayout>;
}
