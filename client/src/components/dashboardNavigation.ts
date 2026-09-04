import { Activity, FileSearch, LayoutDashboard, Settings2, UserRoundCog, UsersRound } from "lucide-react";

export const menuItems = [
  { icon: LayoutDashboard, label: "Reliability control", path: "/reliability" },
  { icon: FileSearch, label: "Investigation queue", path: "/investigations" },
  { icon: Activity, label: "Analysis pipeline", path: "/analysis" },
  { icon: Settings2, label: "Configuration", path: "/configuration" },
  { icon: UserRoundCog, label: "Account settings", path: "/settings" },
  { icon: UsersRound, label: "User management", path: "/admin/users" },
] as const;

export const menuItemKey = (item: (typeof menuItems)[number]) => `${item.path}:${item.label}`;
