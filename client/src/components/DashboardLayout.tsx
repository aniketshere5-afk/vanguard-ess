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
import { startLogin } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import { AlertCircle, ArrowRight, CheckCircle2, ChevronDown, LogOut, PanelLeft, RefreshCw, ShieldCheck } from "lucide-react";
import { menuItemKey, menuItems, visibleMenuItems as filterMenuItems } from "./dashboardNavigation";
import DemoLoginForm from "./DemoLoginForm";
import { GovFooter, GovMasthead } from "./GovChrome";
import OrbitalLoader from "./OrbitalLoader";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "./ui/button";
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
  const [authLoadTimedOut, setAuthLoadTimedOut] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading) {
      setAuthLoadTimedOut(false);
      return;
    }
    const timeout = window.setTimeout(() => setAuthLoadTimedOut(true), 8000);
    return () => window.clearTimeout(timeout);
  }, [loading]);

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading && !authLoadTimedOut) {
    return (
      <div className="flex min-h-svh flex-col bg-background text-foreground">
        <GovMasthead />
        <main className="flex flex-1 items-center justify-center"><OrbitalLoader label="Establishing secure session…" /></main>
        <GovFooter />
      </div>
    );
  }

  if (!user) {
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
    return (
      <div className="flex min-h-svh flex-col bg-background text-foreground">
        <GovMasthead />
        <main className="orbit-field flex flex-1 items-center justify-center px-4 py-10">
          <div className="grid w-full max-w-5xl gap-8 lg:grid-cols-[1fr_420px] lg:items-center">
            <div className="max-w-xl">
              <p className="blueprint-label text-primary">Aerospace reliability engineering console</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Turn early signals into defensible reliability decisions.</h1>
              <p className="mt-4 max-w-lg text-sm leading-7 text-muted-foreground">Anomaly detection, drift prediction, risk scoring and human QA decisions in one traceable mission-control console.</p>
              <div className="mt-6 grid gap-2 sm:grid-cols-3">{["Evidence-first", "Role-aware", "Audit-ready"].map(label => <div key={label} className="border border-border bg-card px-3 py-2.5 text-xs text-muted-foreground"><CheckCircle2 className="mb-1.5 h-4 w-4 text-primary" />{label}</div>)}</div>
              <p className="mt-6 max-w-lg text-xs leading-relaxed text-muted-foreground">This is a Smart India Hackathon prototype built under the VanGuard ESS name. It is not affiliated with, endorsed by, or a system of ISRO or the Government of India.</p>
            </div>
            <div className="border border-border bg-card p-6 sm:p-7">
              <div className="flex items-start justify-between gap-4">
                <div><p className="blueprint-label">Access checkpoint</p><h2 className="mt-2 font-serif text-xl font-semibold">Scientist / Engineer sign-in</h2></div>
                <span className="border border-emerald-500/30 bg-emerald-500/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-600">Demo</span>
              </div>
              {(callbackError || loginError) && <div className="mt-4 flex gap-2 border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>{loginError ?? "Sign-in could not be completed. Start a fresh authorization attempt."}</span></div>}
              <div className="mt-4">
                <DemoLoginForm onSuccess={() => { void refresh(); }} />
              </div>
              <div className="my-4 flex items-center gap-3 text-[10px] uppercase tracking-wider text-muted-foreground"><span className="h-px flex-1 bg-border" />or<span className="h-px flex-1 bg-border" /></div>
              <Button variant="outline" onClick={handleSignIn} disabled={isLaunching} className="w-full justify-between">{isLaunching ? "Opening Google sign-in…" : "Continue with Google"}{isLaunching ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}</Button>
              <p className="mt-4 text-center text-[11px] text-muted-foreground">Judges: use the one-click demo roles above — no real account needed.</p>
            </div>
          </div>
        </main>
        <GovFooter />
      </div>
    );
  }

  return (
    <div className="flex min-h-svh flex-col">
      <GovMasthead />
      <SidebarProvider
        className="flex-1"
        style={
          {
            "--sidebar-width": `${sidebarWidth}px`,
          } as CSSProperties
        }
      >
        <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
          {children}
        </DashboardLayoutContent>
      </SidebarProvider>
      <GovFooter />
    </div>
  );
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
};

function DashboardLayoutContent({
  children,
  setSidebarWidth,
}: DashboardLayoutContentProps) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const activeMenuItem = menuItems.find(item => item.path === location);
  const visibleMenuItems = filterMenuItems(user?.role);
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
                    <p className="text-xs text-muted-foreground truncate mt-1.5 capitalize">
                      {user?.role || "-"}
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
                <DropdownMenuItem onClick={() => setLogoutOpen(true)} className="cursor-pointer text-destructive focus:text-destructive"><LogOut className="mr-2 h-4 w-4" /><span>Log out</span></DropdownMenuItem>
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
        <header style={{ top: "var(--gov-mast)" }} className="sticky z-30 flex h-14 items-center justify-between border-b border-border bg-background/95 px-3 backdrop-blur supports-[backdrop-filter]:backdrop-blur sm:px-5">
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
                  <span className="block truncate text-xs font-semibold">{user?.name || "-"}</span>
                  <span className="block truncate text-[10px] capitalize text-muted-foreground">{user?.role ? `${user.role} · Active session` : "Active session"}</span>
                </span>
                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={8} className="w-64">
              <div className="border-b border-border px-3 py-3">
                <p className="truncate text-sm font-semibold">{user?.name || "-"}</p>
                <p className="mt-1 truncate text-xs capitalize text-muted-foreground">{user?.role ?? "-"}</p>
                <div className="mt-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[.12em] text-emerald-600"><ShieldCheck className="h-3.5 w-3.5" />Authenticated</div>
              </div>
              <DropdownMenuItem onClick={() => setLogoutOpen(true)} className="cursor-pointer text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <AlertDialog open={logoutOpen} onOpenChange={setLogoutOpen}>
          <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Log out of VanGuard ESS?</AlertDialogTitle><AlertDialogDescription>Your active session will be ended on this device. You can sign in again at any time.</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter><AlertDialogCancel>Keep me signed in</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => void logout().catch(() => undefined)}>Log out</AlertDialogAction></AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <main className="flex-1 p-4">{children}</main>
      </SidebarInset>
    </>
  );
}
