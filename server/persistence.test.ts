import { describe, expect, it } from "vitest";
import { closeInvestigation, computeComponentAnalysis, createInvestigation, ensureDemoDataset, getAuditLogs, getComponents, getDecisions, getInvestigations } from "./db";

describe("persisted demonstration flow", () => {
  it("retains investigation, QA decision, audit, and analytical artifacts", async () => {
    if (!process.env.DATABASE_URL) return;
    await ensureDemoDataset();

    // Always drive one full investigation -> QA decision cycle in this run, so
    // the assertions do not depend on pre-existing audit history (which the
    // 30-row audit window would otherwise push a stale decision out of).
    const component = (await getComponents())[0];
    expect(component).toBeTruthy();
    if (!component) return;
    const computed = await computeComponentAnalysis(component.id);
    const opened = await createInvestigation(component.id, computed.result.suggestedAction, undefined);
    expect(opened).toBeTruthy();
    if (!opened) return;
    await closeInvestigation(opened.id, "Hold", "Persistence verification", undefined);

    const decisions = await getDecisions(opened.id);
    expect(decisions.length).toBeGreaterThan(0);
    expect(decisions[0]?.decision).toBe("Hold");

    const closed = (await getInvestigations()).find(i => i.id === opened.id);
    expect(closed?.status).toBe("CLOSED");

    const audit = await getAuditLogs(100);
    expect(audit.some(entry => entry.action === "QA_DECISION_RECORDED" && entry.targetId === String(opened.id))).toBe(true);
  });
});
