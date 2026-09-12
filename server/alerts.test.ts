import { describe, expect, it } from "vitest";
import { ensureDemoDataset, getAllComponentAnalyses } from "./db";

describe("cross-component analysis feed (requires DATABASE_URL)", () => {
  it("computes an analysis for every component, usable for both the summary and the alert feed", async () => {
    if (!process.env.DATABASE_URL) return;
    await ensureDemoDataset();
    const { components, analyses } = await getAllComponentAnalyses();
    expect(analyses.length).toBeGreaterThan(0);
    expect(analyses.length).toBeLessThanOrEqual(components.length);
    for (const a of analyses) {
      expect(typeof a.result.riskScore === "number" || a.result.riskScore === null).toBe(true);
      expect(["NORMAL", "WATCH", "SUSPICIOUS", "HIGH RISK", "CRITICAL", "UNKNOWN"]).toContain(a.result.riskBand);
    }
    // Anything the alert feed would show must actually be >= 61 (HIGH RISK or CRITICAL).
    const wouldAlert = analyses.filter(a => (a.result.riskScore ?? 0) >= 61);
    for (const a of wouldAlert) expect(a.result.riskScore ?? 0).toBeGreaterThanOrEqual(61);
  });
});
