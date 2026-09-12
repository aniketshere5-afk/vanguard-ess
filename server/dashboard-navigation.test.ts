import { describe, expect, it } from "vitest";
import { menuItemKey, menuItems, visibleMenuItems } from "../client/src/components/dashboardNavigation";

describe("dashboard navigation", () => {
  it("keeps shared-route menu items uniquely keyed", () => {
    const keys = menuItems.map(menuItemKey);
    expect(new Set(keys).size).toBe(menuItems.length);
    expect(keys).toEqual([
      "/reliability:Reliability workbench",
      "/investigations:Investigation queue",
      "/comparison:Lot comparison",
      "/admin:Admin dashboard",
      "/qa:QA dashboard",
      "/configuration:Configuration",
      "/admin/users:User management",
      "/settings:Account settings",
    ]);
  });

  it("shows role-gated items only to the roles that own them", () => {
    const paths = (role: string | undefined) => visibleMenuItems(role).map(i => i.path);
    expect(paths("scientist")).toEqual(["/reliability", "/investigations", "/comparison", "/settings"]);
    expect(paths("qa")).toEqual(["/reliability", "/investigations", "/comparison", "/qa", "/settings"]);
    expect(paths("admin")).toEqual(["/reliability", "/investigations", "/comparison", "/admin", "/qa", "/configuration", "/admin/users", "/settings"]);
    expect(paths(undefined)).toEqual(["/reliability", "/investigations", "/comparison", "/settings"]);
  });
});
