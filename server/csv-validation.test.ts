import { describe, expect, it } from "vitest";
import { validateCsv } from "./reliability";

const header = "component_id,lot_code,checkpoint_hours,leakage_current,unit";

describe("CSV quality gate", () => {
  it("reports malformed, missing, duplicate, inconsistent, unexpected, and missing-checkpoint data", () => {
    const csv = [
      `${header},extra_field`,
      "CMP-001,LOT-1,0,10,µA,unexpected",
      "CMP-001,LOT-1,0,10,µA,unexpected",
      "CMP-002,LOT-1,24,,mA,unexpected",
      "CMP-003,LOT-1,999,12,µA,unexpected",
      "CMP-004,LOT-1,24,14,µA",
      "CMP-005,LOT-1,0,15",
    ].join("\n");
    const report = validateCsv(csv);
    const codes = new Set(report.errors.map(error => error.code));
    expect(report.valid).toBe(false);
    expect(codes.size).toBeGreaterThan(0);
    for (const code of ["UNEXPECTED_COLUMN", "DUPLICATE", "MISSING_VALUE", "INCONSISTENT_UNIT", "INVALID_CHECKPOINT", "MALFORMED_ROW", "MISSING_CHECKPOINT"]) {
      expect(codes.has(code)).toBe(true);
    }
  });

  it("accepts a complete measurement set and warns when the peer lot is small", () => {
    const report = validateCsv([
      header,
      "CMP-001,LOT-1,0,10,µA",
      "CMP-001,LOT-1,24,11,µA",
      "CMP-002,LOT-1,0,10.2,uA",
      "CMP-002,LOT-1,24,10.8,µA",
    ].join("\n"));
    expect(report.valid).toBe(true);
    expect(report.errors).toHaveLength(0);
    expect(report.warnings[0]).toContain("Insufficient lot size");
  });
});
