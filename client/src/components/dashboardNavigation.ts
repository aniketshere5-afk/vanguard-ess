import { Activity, ClipboardCheck, FileSearch, LayoutDashboard, Scale, Settings2, ShieldCheck, UserRoundCog, UsersRound } from "lucide-react";

export type MenuItem = {
  icon: typeof Activity;
  label: string;
  path: string;
  /** When set, the item is only shown to these roles (or in a matching demo preview). */
  roles?: readonly string[];
};

export const menuItems: readonly MenuItem[] = [
  { icon: LayoutDashboard, label: "Reliability workbench", path: "/reliability" },
  { icon: FileSearch, label: "Investigation queue", path: "/investigations" },
  { icon: Scale, label: "Lot comparison", path: "/comparison" },
  { icon: ShieldCheck, label: "Admin dashboard", path: "/admin", roles: ["admin"] },
  { icon: ClipboardCheck, label: "QA dashboard", path: "/qa", roles: ["qa", "admin"] },
  { icon: Settings2, label: "Configuration", path: "/configuration", roles: ["admin"] },
  { icon: UsersRound, label: "User management", path: "/admin/users", roles: ["admin"] },
  { icon: UserRoundCog, label: "Account settings", path: "/settings" },
];

export const menuItemKey = (item: MenuItem) => `${item.path}:${item.label}`;

export const visibleMenuItems = (role: string | undefined) =>
  menuItems.filter(item => !item.roles || (role != null && item.roles.includes(role)));
