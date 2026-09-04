import { describe, expect, it } from "vitest";
import { adminGuard, roleGuard } from "./routers";

describe("role guards", () => {
  it("allows QA and Admin to record QA decisions but not a Reliability Engineer", () => {
    expect(roleGuard("qa")).toBe(true);
    expect(roleGuard("admin")).toBe(true);
    expect(roleGuard("user")).toBe(false);
  });

  it("allows only Admin to change controlled configuration", () => {
    expect(adminGuard("admin")).toBe(true);
    expect(adminGuard("qa")).toBe(false);
    expect(adminGuard("user")).toBe(false);
  });
});
