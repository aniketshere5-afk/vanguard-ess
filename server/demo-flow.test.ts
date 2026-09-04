import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { getUserByOpenId } from "./db";
import { ENV } from "./_core/env";
import type { TrpcContext } from "./_core/context";

describe("authenticated demonstration flow", () => {
  it("runs analysis, opens an investigation, closes it with QA, and retains audit evidence", async () => {
    if (!process.env.DATABASE_URL) return;
    const user = await getUserByOpenId(ENV.ownerOpenId);
    if (!user) return;
    const ctx: TrpcContext = {
      user,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: { clearCookie: () => undefined } as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    const analysis = await caller.analysis.run({ componentId: 19 });
    expect(analysis.result.modelVersion).toBe("PRRS-LINEAR-1.0");
    const investigation = await caller.investigations.create({ componentId: 19 });
    expect(investigation?.status).toBe("OPEN");
    const closed = await caller.investigations.decide({ investigationId: investigation!.id, decision: "Hold", comment: "Integration-test review" });
    expect(closed?.status).toBe("CLOSED");
    const history = await caller.investigations.get({ id: investigation!.id });
    expect(history.decisions.some(d => d.decision === "Hold")).toBe(true);
    const audit = await caller.audit.list();
    expect(audit.map(e => e.action)).toEqual(expect.arrayContaining(["ANALYSIS_EXECUTED", "RECOMMENDATION_GENERATED", "INVESTIGATION_CREATED", "QA_DECISION_RECORDED"]));
  }, 30000);
});
