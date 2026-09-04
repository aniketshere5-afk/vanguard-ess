import { describe, expect, it } from "vitest";
import { menuItemKey, menuItems } from "./dashboardNavigation";

describe("dashboard navigation keys", () => {
  it("keeps shared-route menu items uniquely keyed", () => {
    const keys = menuItems.map(menuItemKey);
    expect(new Set(keys).size).toBe(menuItems.length);
    expect(keys).toEqual([
      "/:Reliability control",
      "/:Investigation queue",
      "/:Analysis pipeline",
      "/:Configuration",
    ]);
  });
});
