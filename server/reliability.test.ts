import { describe, expect, it } from "vitest";
import { computeReliability, validateCsv } from "./reliability";
import { roleGuard } from "./routers";

describe("CSV validation", () => {
  it("reports missing values, duplicates, units, and missing checkpoints", () => {
    const report = validateCsv("component_id,lot_code,checkpoint_hours,leakage_current,unit\nC1,L1,0,10,µA\nC1,L1,0,10,mA");
    expect(report.valid).toBe(false);
    expect(report.errors.map(e => e.code)).toEqual(expect.arrayContaining(["DUPLICATE", "INCONSISTENT_UNIT", "MISSING_CHECKPOINT"]));
  });
  it("rejects unexpected columns", () => {
    const report = validateCsv("component_id,lot_code,checkpoint_hours,leakage_current,unit,secret_flag\nC1,L1,0,10,µA,no");
    expect(report.errors.some(e => e.code === "UNEXPECTED_COLUMN")).toBe(true);
  });
  it("accepts a valid minimum observation set", () => {
    const report = validateCsv("component_id,lot_code,checkpoint_hours,leakage_current,unit\nC1,L1,0,10,µA\nC1,L1,24,12,µA\nC2,L1,0,10.2,µA\nC2,L1,24,10.4,µA\nC3,L1,0,9.9,µA\nC3,L1,24,10.1,µA\nC4,L1,0,10.1,µA\nC4,L1,24,10.2,µA\nC5,L1,0,10.4,µA\nC5,L1,24,10.3,µA");
    expect(report.valid).toBe(true); expect(report.rowCount).toBe(10); expect(report.errors).toHaveLength(0);
  });
});

describe("reliability computation", () => {
  it("separates static PASS from lot-relative anomaly and computes transparent risk", () => {
    const result = computeReliability([{ checkpointHours: 0, value: 44.8 }, { checkpointHours: 24, value: 48.6 }], [9.8, 10.1, 10.3, 10.4, 10.6, 10.7, 10.9, 10.2, 10.5, 10.0, 10.8, 10.3], 50, 42);
    expect(result.staticResult).toBe("PASS"); expect(result.dynamicResult).toBe("ANOMALOUS"); expect(result.predicted168h).toBeGreaterThan(42); expect(result.predictionInterval).toHaveLength(2); expect(result.riskScore).toBeGreaterThan(40); expect(result.evidence.length).toBeGreaterThan(3); expect(result.modelVersion).toBe("PRRS-LINEAR-1.0");
  });
  it("does not fabricate lot baselines for small lots", () => {
    const result = computeReliability([{ checkpointHours: 0, value: 12 }, { checkpointHours: 24, value: 12.2 }], [10, 11], 50, 42);
    expect(result.dynamicResult).toBe("INSUFFICIENT_DATA"); expect(result.lotBaseline).toBe(10.5); expect(result.anomalyScore).toBeNull(); expect(result.evidence[1]?.value).toContain("robust z");
  });

  it("explains the static verdict with the measured margin", () => {
    const pass = computeReliability([{ checkpointHours: 0, value: 44.8 }, { checkpointHours: 24, value: 45 }], [10, 10.2, 10.4], 50, 42);
    expect(pass.staticExplanation.verdict).toBe("PASS");
    expect(pass.staticExplanation.margin).toBeCloseTo(5.2, 1);
    const fail = computeReliability([{ checkpointHours: 0, value: 56 }, { checkpointHours: 24, value: 58 }], [10, 10.2, 10.4], 50, 42);
    expect(fail.staticExplanation.verdict).toBe("FAIL");
    expect(fail.staticExplanation.reason).toContain("exceeds");
  });

  it("produces an exact linear-SHAP decomposition that reconciles with the score", () => {
    const peerPoints = Array.from({ length: 8 }, (_, i) => [
      { checkpointHours: 0, value: 10 + i * 0.1 },
      { checkpointHours: 24, value: 10.2 + i * 0.1 },
      { checkpointHours: 168, value: 10.6 + i * 0.1 },
    ]);
    const peerInitials = peerPoints.map(p => p[0].value);
    const result = computeReliability(
      [{ checkpointHours: 0, value: 44.8 }, { checkpointHours: 24, value: 48.6 }, { checkpointHours: 168, value: 60 }],
      peerInitials, 50, 42, peerPoints,
    );
    expect(result.shap).not.toBeNull();
    const shap = result.shap!;
    expect(shap.features).toHaveLength(5);
    // baseValue + Σ contributions must equal the model prediction (exact for a linear model).
    const summed = shap.baseValue + shap.features.reduce((s, f) => s + f.contribution, 0);
    expect(summed).toBeCloseTo(shap.prediction, 1);
    // and the prediction tracks the reported (clamped, rounded) risk score.
    expect(Math.abs(shap.prediction - (result.riskScore ?? 0))).toBeLessThanOrEqual(1);
    // features are ordered by absolute contribution.
    for (let i = 1; i < shap.features.length; i++) {
      expect(Math.abs(shap.features[i - 1].contribution)).toBeGreaterThanOrEqual(Math.abs(shap.features[i].contribution));
    }
  });

  it("withholds SHAP when the peer set is too small for a baseline", () => {
    const result = computeReliability(
      [{ checkpointHours: 0, value: 12 }, { checkpointHours: 24, value: 12.2 }],
      [10, 11], 50, 42,
      [[{ checkpointHours: 0, value: 10 }, { checkpointHours: 24, value: 10.1 }]],
    );
    expect(result.shap).toBeNull();
  });
});

describe("authorization policy", () => {
  it("allows QA and admin decisions but not scientist sessions", () => {
    expect(roleGuard("qa")).toBe(true);
    expect(roleGuard("admin")).toBe(true);
    expect(roleGuard("scientist")).toBe(false);
    expect(roleGuard("user")).toBe(false);
  });
});
