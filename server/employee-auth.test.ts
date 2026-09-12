import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./_core/password";
import { registerEmployee, getUserByEmployeeId } from "./db";

describe("password hashing", () => {
  it("verifies a correct password and rejects an incorrect one", () => {
    const hash = hashPassword("correct-horse-battery-staple");
    expect(verifyPassword("correct-horse-battery-staple", hash)).toBe(true);
    expect(verifyPassword("wrong-password", hash)).toBe(false);
  });

  it("produces a different hash (different salt) for the same password each time", () => {
    const a = hashPassword("same-password");
    const b = hashPassword("same-password");
    expect(a).not.toBe(b);
    expect(verifyPassword("same-password", a)).toBe(true);
    expect(verifyPassword("same-password", b)).toBe(true);
  });

  it("rejects a null/empty stored hash safely", () => {
    expect(verifyPassword("anything", null)).toBe(false);
    expect(verifyPassword("anything", undefined)).toBe(false);
    expect(verifyPassword("anything", "")).toBe(false);
  });
});

describe("employee registration (requires DATABASE_URL)", () => {
  it("registers a new employee, rejects a duplicate ID, and the stored hash verifies", async () => {
    if (!process.env.DATABASE_URL) return;
    const employeeId = `TEST-EMP-${Date.now()}`;
    const user = await registerEmployee({ employeeId, name: "Test Employee", passwordHash: hashPassword("hunter2000") });
    expect(user?.employeeId).toBe(employeeId);
    expect(user?.role).toBe("scientist");
    expect(verifyPassword("hunter2000", user?.passwordHash)).toBe(true);

    await expect(registerEmployee({ employeeId, name: "Duplicate", passwordHash: hashPassword("x") })).rejects.toThrow(/already registered/i);

    const fetched = await getUserByEmployeeId(employeeId);
    expect(fetched?.id).toBe(user?.id);
  });
});
