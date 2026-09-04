import { useEffect, useState } from "react";
import { Bell, CheckCircle2, Monitor, Save, ShieldCheck, UserRound } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/_core/hooks/useAuth";
import { useTheme, type ThemePreference } from "@/contexts/ThemeContext";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const DENSITY_KEY = "vanguard-density";
const NOTIFICATIONS_KEY = "vanguard-email-notifications";

export default function AccountSettings() {
  const { user, refresh } = useAuth();
  const { theme, setTheme } = useTheme();
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [density, setDensity] = useState(() => localStorage.getItem(DENSITY_KEY) ?? "comfortable");
  const [notifications, setNotifications] = useState(() => localStorage.getItem(NOTIFICATIONS_KEY) !== "off");
  const updateProfile = trpc.auth.updateProfile.useMutation({
    onSuccess: async updated => {
      setName(updated?.name ?? name);
      setEmail(updated?.email ?? email);
      await refresh();
      toast.success("Profile details saved");
    },
    onError: error => toast.error(error.message),
  });

  useEffect(() => {
    if (user?.name) setName(user.name);
    if (user?.email) setEmail(user.email);
  }, [user?.name, user?.email]);

  const savePreferences = () => {
    localStorage.setItem(DENSITY_KEY, density);
    localStorage.setItem(NOTIFICATIONS_KEY, notifications ? "on" : "off");
    toast.success("Preferences saved for this browser");
  };

  return <DashboardLayout><div className="container space-y-6 pb-12">
    <header className="border-b border-border pb-5"><p className="blueprint-label text-indigo-300">ACCOUNT / PERSONAL SETTINGS</p><div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h1 className="text-3xl font-semibold tracking-tight">Account settings</h1><p className="mt-2 max-w-2xl text-sm text-muted-foreground">Manage your profile details, interface preferences, and notification choices for the VanGuard ESS workspace.</p></div><Badge variant="outline" className="w-fit border-emerald-400/30 text-emerald-600 dark:text-emerald-300"><ShieldCheck className="mr-2 h-3.5 w-3.5" />Protected account</Badge></div></header>
    <section className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
      <Card className="blueprint-panel"><CardHeader><CardTitle className="flex items-center gap-2 text-sm"><UserRound className="h-4 w-4 text-indigo-300" />Profile details</CardTitle></CardHeader><CardContent className="space-y-4"><div><label className="text-xs font-semibold uppercase tracking-[.12em] text-muted-foreground" htmlFor="profile-name">Display name</label><Input id="profile-name" className="mt-2" value={name} onChange={event => setName(event.target.value)} maxLength={120} placeholder="Your name" /></div><div><label className="text-xs font-semibold uppercase tracking-[.12em] text-muted-foreground" htmlFor="profile-email">Email address</label><Input id="profile-email" type="email" className="mt-2" value={email} onChange={event => setEmail(event.target.value)} maxLength={320} placeholder="you@example.com" /></div><div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-background/50 p-3"><div><p className="text-sm font-medium">Workspace role</p><p className="mt-1 text-xs text-muted-foreground">Role changes are managed by an administrator.</p></div><Badge variant="secondary">{user?.role ?? "user"}</Badge></div><Button onClick={() => updateProfile.mutate({ name, email })} disabled={updateProfile.isPending || name.trim().length < 2 || !email.includes("@")}><Save className="mr-2 h-4 w-4" />{updateProfile.isPending ? "Saving…" : "Save profile"}</Button></CardContent></Card>
      <Card className="blueprint-panel"><CardHeader><CardTitle className="flex items-center gap-2 text-sm"><Monitor className="h-4 w-4 text-indigo-300" />Interface preferences</CardTitle></CardHeader><CardContent className="space-y-5"><div><label className="text-xs font-semibold uppercase tracking-[.12em] text-muted-foreground">Appearance</label><Select value={theme} onValueChange={value => setTheme(value as ThemePreference)}><SelectTrigger className="mt-2"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="system">System default</SelectItem><SelectItem value="light">Light</SelectItem><SelectItem value="dark">Dark</SelectItem></SelectContent></Select></div><div><label className="text-xs font-semibold uppercase tracking-[.12em] text-muted-foreground">Dashboard density</label><Select value={density} onValueChange={setDensity}><SelectTrigger className="mt-2"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="comfortable">Comfortable</SelectItem><SelectItem value="compact">Compact</SelectItem></SelectContent></Select></div><div className="flex items-center justify-between gap-4 rounded-lg border border-border p-3"><div className="flex items-start gap-3"><Bell className="mt-0.5 h-4 w-4 text-indigo-300" /><div><p className="text-sm font-medium">Reliability notifications</p><p className="mt-1 text-xs text-muted-foreground">Receive browser-level alerts for review reminders.</p></div></div><Switch checked={notifications} onCheckedChange={setNotifications} aria-label="Reliability notifications" /></div><Button variant="outline" onClick={savePreferences}>Save preferences</Button></CardContent></Card>
    </section>
    <Card className="blueprint-panel"><CardContent className="flex flex-col gap-3 p-4 text-sm text-muted-foreground sm:flex-row sm:items-center"><CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" /><span>Profile changes are recorded in the audit trail. Browser-only preferences stay local to this device.</span></CardContent></Card>
  </div></DashboardLayout>;
}
