import { describe, expect, it } from "vitest";
import { closeInvestigation, computeComponentAnalysis, createInvestigation, ensureDemoDataset, getAuditLogs, getComponents, getDecisions, getInvestigations } from "./db";

describe("persisted demonstration flow", () => {
  it("retains investigation, QA decision, audit, and analytical artifacts", async () => {
    if (!process.env.DATABASE_URL) return;
    await ensureDemoDataset();
    let investigations = await getInvestigations();
    if (!investigations.length) {
      const component = (await getComponents())[0];
      expect(component).toBeTruthy();
      if (!component) return;
      const computed = await computeComponentAnalysis(component.id);
      const opened = await createInvestigation(component.id, computed.result.suggestedAction, undefined);
      expect(opened).toBeTruthy();
      if (opened) await closeInvestigation(opened.id, "Hold", "Persistence verification", undefined);
      investigations = await getInvestigations();
    }
    expect(investigations.length).toBeGreaterThan(0);
    const openOrClosed = investigations[0];
    expect(["OPEN", "CLOSED"]).toContain(openOrClosed?.status);
    if (openOrClosed?.status === "CLOSED") expect((await getDecisions(openOrClosed.id)).length).toBeGreaterThan(0);
    const audit = await getAuditLogs(100);
    expect(audit.some(entry => entry.action === "QA_DECISION_RECORDED")).toBe(true);
  });
});
