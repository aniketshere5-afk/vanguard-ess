import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { isDemoPreview, startLogin } from "@/const";
import { ThemePreference, useTheme } from "@/contexts/ThemeContext";
import { useIsMobile } from "@/hooks/useMobile";
import { AlertCircle, ArrowRight, CheckCircle2, ChevronDown, LogOut, Monitor, Moon, PanelLeft, RefreshCw, ShieldCheck, Sun } from "lucide-react";
import { menuItemKey, menuItems } from "./dashboardNavigation";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./ui/alert-dialog";

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 280;
const MIN_WIDTH = 200;
const MAX_WIDTH = 480;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user, refresh } = useAuth();
  const [demoPreview, setDemoPreview] = useState(isDemoPreview);
  const [authLoadTimedOut, setAuthLoadTimedOut] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  useEffect(() => {
    if (!loading) {
      setAuthLoadTimedOut(false);
      if (user) {
        setDemoPreview(false);
        try { sessionStorage.removeItem("vanguard-demo-preview"); } catch { /* ignore stale preview state */ }
      }
      return;
    }
    const timeout = window.setTimeout(() => setAuthLoadTimedOut(true), 8000);
    return () => window.clearTimeout(timeout);
  }, [loading, user]);

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading && !authLoadTimedOut) {
    return <DashboardLayoutSkeleton />
  }

  const enterDemoPreview = () => {
    try { sessionStorage.setItem("vanguard-demo-preview", "1"); } catch { /* session storage is optional */ }
    setDemoPreview(true);
  };

  const effectiveDemoPreview = !user && demoPreview;

  if (!user && !effectiveDemoPreview) {
    const callbackError = new URLSearchParams(window.location.search).get("error");
    const handleSignIn = () => {
      setLoginError(null);
      const launched = startLogin();
      if (launched) {
        setIsLaunching(true);
      } else {
        setLoginError("Secure sign-in is unavailable. Check the OAuth application configuration and try again.");
      }
    };
    const handleRetry = async () => {
      setLastChecked(new Date());
      await refresh();
    };
    return (
      <div className="relative min-h-screen overflow-hidden bg-[#0F172A] text-slate-100">
        <div className="pointer-events-none absolute -left-24 top-[-12rem] h-[28rem] w-[28rem] rounded-full bg-indigo-500/15 blur-3xl" />
        <div className="pointer-events-none absolute bottom-[-16rem] right-[-6rem] h-[32rem] w-[32rem] rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="relative mx-auto flex min-h-screen max-w-6xl items-center px-5 py-10 sm:px-8 lg:px-12">
          <div className="grid w-full gap-10 lg:grid-cols-[1.05fr_.95fr] lg:items-center">
            <div className="max-w-xl">
              <div className="mb-8 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300"><span className="grid h-10 w-10 place-items-center rounded-xl border border-indigo-400/30 bg-indigo-400/10 text-lg">V</span><span>VanGuard ESS / Reliability Console</span></div>
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-slate-400">Secure engineering workspace</p>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl">Turn early signals into defensible reliability decisions.</h1>
              <p className="mt-5 max-w-lg text-base leading-7 text-slate-300">Sign in to inspect lot-relative evidence, 168h forecasts, uncertainty, safety boundaries, and human QA decisions in one traceable console.</p>
              <div className="mt-8 grid gap-3 sm:grid-cols-3">{["Evidence-first", "Role-aware", "Audit-ready"].map(label => <div key={label} className="rounded-xl border border-slate-700/80 bg-[#1E293B]/70 px-3 py-3 text-xs text-slate-300"><CheckCircle2 className="mb-2 h-4 w-4 text-indigo-300" />{label}</div>)}</div>
            </div>
            <div className="rounded-3xl border border-indigo-400/20 bg-[#1E293B]/90 p-6 shadow-2xl shadow-indigo-950/30 backdrop-blur sm:p-8">
              <div className="flex items-start justify-between gap-4"><div><p className="font-mono text-[10px] uppercase tracking-[0.18em] text-indigo-300">Access checkpoint</p><h2 className="mt-3 text-2xl font-semibold text-white">Sign in to continue</h2></div><div className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-200">Secure</div></div>
              {(callbackError || loginError) && <div className="mt-5 flex gap-3 rounded-xl border border-rose-400/30 bg-rose-400/10 p-3 text-sm text-rose-100"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>{loginError ?? "Sign-in could not be completed. Start a fresh authorization attempt."}</span></div>}
              <p className="mt-5 text-sm leading-6 text-slate-300">Authentication is required before accessing reliability data and controlled QA actions.</p>
              <Button onClick={handleSignIn} disabled={isLaunching} size="lg" className="mt-7 h-12 w-full justify-between bg-indigo-500 px-5 text-white shadow-lg shadow-indigo-950/30 hover:bg-indigo-400">{isLaunching ? "Opening Google sign-in…" : "Continue with Google"}{isLaunching ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}</Button>
              <Button variant="ghost" onClick={handleRetry} className="mt-3 w-full text-slate-300 hover:bg-slate-700/50 hover:text-white"><RefreshCw className="mr-2 h-4 w-4" />Check session again</Button>
              <Button variant="outline" onClick={enterDemoPreview} className="mt-2 w-full border-slate-700 bg-slate-900/40 text-slate-300 hover:bg-slate-800 hover:text-white">Preview synthetic dataset (read-only)</Button>
              <p className="mt-5 text-center text-[11px] text-slate-500">{lastChecked ? `Last checked ${lastChecked.toLocaleTimeString()}` : "Authentication is handled securely by Google."}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`,
        } as CSSProperties
      }
    >
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth} demoPreview={effectiveDemoPreview}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
  demoPreview: boolean;
};

function DashboardLayoutContent({
  children,
  setSidebarWidth,
  demoPreview,
}: DashboardLayoutContentProps) {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const activeMenuItem = menuItems.find(item => item.path === location);
  const visibleMenuItems = menuItems.filter(item => (item.path !== "/configuration" && item.path !== "/admin/users") || user?.role === "admin" || demoPreview);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isCollapsed) {
      setIsResizing(false);
    }
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar
          collapsible="icon"
          className="border-r-0"
          disableTransition={isResizing}
        >
          <SidebarHeader className="h-16 justify-center">
            <div className="flex items-center gap-3 px-2 transition-all w-full">
              <button
                onClick={toggleSidebar}
                className="h-8 w-8 flex items-center justify-center hover:bg-accent rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
                aria-label="Toggle navigation"
              >
                <PanelLeft className="h-4 w-4 text-muted-foreground" />
              </button>
              {!isCollapsed ? (
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-semibold tracking-tight truncate">
                    Navigation
                  </span>
                </div>
              ) : null}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0">
            <SidebarMenu className="px-2 py-1">
              {visibleMenuItems.map(item => {
                const isActive = location === item.path;
                return (
                  <SidebarMenuItem key={menuItemKey(item)}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => setLocation(item.path)}
                      tooltip={item.label}
                      className={`h-10 transition-all font-normal`}
                    >
                      <item.icon
                        className={`h-4 w-4 ${isActive ? "text-primary" : ""}`}
                      />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="p-3">
            <div className="mb-3 rounded-lg border border-sidebar-border bg-sidebar-accent/30 p-2 group-data-[collapsible=icon]:border-0 group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:p-0">
              <div className="mb-1 flex items-center gap-2 px-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground group-data-[collapsible=icon]:hidden">
                {theme === "dark" ? <Moon className="h-3.5 w-3.5" /> : theme === "light" ? <Sun className="h-3.5 w-3.5" /> : <Monitor className="h-3.5 w-3.5" />}
                Appearance
              </div>
              <Select value={theme} onValueChange={value => setTheme(value as ThemePreference)}>
                <SelectTrigger aria-label="Choose appearance" className="h-8 border-sidebar-border bg-transparent text-xs group-data-[collapsible=icon]:w-9 group-data-[collapsible=icon]:px-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="system">System default</SelectItem>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg px-1 py-1 hover:bg-accent/50 transition-colors w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar className="h-9 w-9 border shrink-0">
                    <AvatarFallback className="text-xs font-medium">
                      {user?.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="text-sm font-medium truncate leading-none">
                      {user?.name || "-"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-1.5">
                      {user?.email || "-"}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={() => setLocation("/settings")}
                  className="cursor-pointer"
                >
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  <span>Account settings</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLogoutOpen(true)} className="cursor-pointer text-destructive focus:text-destructive"><LogOut className="mr-2 h-4 w-4" /><span>{demoPreview ? "Exit demo preview" : "Log out"}</span></DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => {
            if (isCollapsed) return;
            setIsResizing(true);
          }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset>
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-background/95 px-3 backdrop-blur supports-[backdrop-filter]:backdrop-blur sm:px-5">
          <div className="flex min-w-0 items-center gap-2">
            {isMobile && <SidebarTrigger className="h-9 w-9 rounded-lg bg-background" />}
            <span className="truncate text-sm font-medium tracking-tight text-foreground">
              {activeMenuItem?.label ?? "VanGuard ESS"}
            </span>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex max-w-[min(18rem,60vw)] items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-accent/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Open user profile menu">
                <Avatar className="h-8 w-8 border border-border">
                  <AvatarFallback className="bg-primary/15 text-xs font-semibold text-primary">
                    {(user?.name ?? "D").slice(0, 1).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden min-w-0 sm:block">
                  <span className="block truncate text-xs font-semibold">{user?.name || "Demo preview"}</span>
                  <span className="block truncate text-[10px] text-muted-foreground">{demoPreview ? "Read-only session" : user?.role ? `${user.role} · Active session` : "Active session"}</span>
                </span>
                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={8} className="w-64">
              <div className="border-b border-border px-3 py-3">
                <p className="truncate text-sm font-semibold">{user?.name || "Demo preview"}</p>
                <p className="mt-1 truncate text-xs text-muted-foreground">{user?.email || "Synthetic / Demonstration Data"}</p>
                <div className="mt-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[.12em] text-emerald-600 dark:text-emerald-300"><ShieldCheck className="h-3.5 w-3.5" />{demoPreview ? "Read-only" : "Authenticated"}</div>
              </div>
              <DropdownMenuItem
                onClick={() => {
                  if (demoPreview) {
                    try { sessionStorage.removeItem("vanguard-demo-preview"); } catch { /* ignore */ }
                    window.location.reload();
                  } else {
                    void logout().catch(() => undefined);
                  }
                }}
                className="cursor-pointer text-destructive focus:text-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>{demoPreview ? "Exit demo preview" : "Log out"}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <AlertDialog open={logoutOpen} onOpenChange={setLogoutOpen}>
          <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>{demoPreview ? "Exit demo preview?" : "Log out of VanGuard ESS?"}</AlertDialogTitle><AlertDialogDescription>{demoPreview ? "You will return to the secure sign-in screen and the read-only preview session will be cleared." : "Your active session will be ended on this device. You can sign in again at any time."}</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter><AlertDialogCancel>Keep me signed in</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { if (demoPreview) { try { sessionStorage.removeItem("vanguard-demo-preview"); } catch { /* ignore */ } window.location.reload(); } else { void logout().catch(() => undefined); } }}>Log out</AlertDialogAction></AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <main className="flex-1 p-4">{children}</main>
      </SidebarInset>
    </>
  );
}
