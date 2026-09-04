import { describe, expect, it } from "vitest";
import { menuItemKey, menuItems } from "../client/src/components/dashboardNavigation";

describe("dashboard navigation keys", () => {
  it("keeps shared-route menu items uniquely keyed", () => {
    const keys = menuItems.map(menuItemKey);
    expect(new Set(keys).size).toBe(menuItems.length);
    expect(keys).toEqual([
      "/reliability:Reliability control",
      "/investigations:Investigation queue",
      "/analysis:Analysis pipeline",
      "/configuration:Configuration",
      "/settings:Account settings",
      "/admin/users:User management",
    ]);
  });
});
