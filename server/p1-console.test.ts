import { describe, expect, it } from "vitest";
import { ensureDemoDataset, getComponents, getModels } from "./db";

describe("P1 judge console data", () => {
  it("exposes all five live challenge scenarios and a registered model", async () => {
    if (!process.env.DATABASE_URL) return;
    await ensureDemoDataset();
    const components = await getComponents();
    const scenarios = new Set(components.map(component => component.scenario));
    for (const required of ["Static PASS / Dynamic Anomaly", "Accelerating Drift", "Common-Cause Shift", "High Uncertainty", "False Positive Candidate"]) {
      expect(scenarios.has(required)).toBe(true);
    }
    expect((await getModels()).length).toBeGreaterThan(0);
  });
});
