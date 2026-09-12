import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { sdk } from "./_core/sdk";
import { hashPassword, verifyPassword } from "./_core/password";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { validateCsv } from "./reliability";
import { parseDataset } from "./ingestion";
import { ensureDemoDataset, getLots, getLot, getComponents, getComponent, getMeasurements, getLatestAnalysis, getLatestAnalyses, computeComponentAnalysis, getAllComponentAnalyses, createInvestigation, closeInvestigation, getAuditLogs, getInvestigations, getDecisions, getModels, recordAudit, updateUserProfile, listUsers, updateUserRole, importDataset, updateLotConfig, upsertUser, registerEmployee, getUserByEmployeeId, touchLastSignedIn } from "./db";

/**
 * Fixed, publicly-documented demo accounts for hackathon/judge access.
 * These are intentionally not secret — see README "Demo accounts" section.
 * Never used as a stand-in for real authentication in a security-sensitive
 * deployment; this is a prototype convenience only.
 */
const DEMO_ACCOUNTS: Record<string, { password: string; role: "admin" | "scientist" | "qa"; name: string }> = {
  "DEMO-ADMIN": { password: "demo-admin", role: "admin", name: "Demo Admin" },
  "DEMO-SCIENTIST": { password: "demo-scientist", role: "scientist", name: "Demo Scientist" },
  "DEMO-QA": { password: "demo-qa", role: "qa", name: "Demo QA Engineer" },
};

const decisionSchema = z.enum(["Accept", "Hold", "Re-test", "Extend Burn-In", "Reject", "Investigate Further"]);
export const roleGuard = (role: string) => role === "admin" || role === "qa";
const scientistGuard = (role: string) => role === "admin" || role === "scientist" || role === "user";
export const adminGuard = (role: string) => role === "admin";
const scientistProcedure = protectedProcedure.use(({ ctx, next }) => scientistGuard(ctx.user.role) ? next() : Promise.reject(new TRPCError({ code: "FORBIDDEN", message: "Scientist / Reliability Engineer role required" })));
const qaProcedure = protectedProcedure.use(({ ctx, next }) => roleGuard(ctx.user.role) ? next() : Promise.reject(new TRPCError({ code: "FORBIDDEN", message: "QA Engineer role required" })));
const adminProcedure = protectedProcedure.use(({ ctx, next }) => adminGuard(ctx.user.role) ? next() : Promise.reject(new TRPCError({ code: "FORBIDDEN", message: "Admin role required" })));
const readProcedure = publicProcedure.use(({ ctx, next }) => ctx.user ? next() : Promise.reject(new TRPCError({ code: "UNAUTHORIZED", message: "Authentication required" })));

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(async opts => { if (opts.ctx.user) await recordAudit("LOGIN_SESSION_OBSERVED", "user", String(opts.ctx.user.id), opts.ctx.user.id); return opts.ctx.user; }),
    updateProfile: protectedProcedure.input(z.object({ name: z.string().trim().min(2).max(120), email: z.string().trim().email().max(320) })).mutation(async ({ input, ctx }) => { const user = await updateUserProfile(ctx.user.openId, input); if (!user) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Profile could not be saved" }); await recordAudit("PROFILE_UPDATED", "user", String(ctx.user.id), ctx.user.id, { fields: ["name", "email"] }); return user; }),
    logout: publicProcedure.mutation(({ ctx }) => { const cookieOptions = getSessionCookieOptions(ctx.req); ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 }); return { success: true } as const; }),
    /** Prototype-only sign-in with the fixed demo accounts documented in the README. */
    demoLogin: publicProcedure
      .input(z.object({ employeeId: z.string().trim().min(1).max(40), password: z.string().min(1).max(100) }))
      .mutation(async ({ input, ctx }) => {
        const key = input.employeeId.toUpperCase();
        const account = DEMO_ACCOUNTS[key];
        if (!account || account.password !== input.password) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid ID or password" });
        }
        const openId = `demo:${key}`;
        await upsertUser({ openId, name: account.name, email: `${key.toLowerCase()}@demo.local`, loginMethod: "demo", role: account.role, lastSignedIn: new Date() });
        const token = await sdk.createSessionToken(openId, { name: account.name, expiresInMs: ONE_YEAR_MS });
        ctx.res.cookie(COOKIE_NAME, token, { ...getSessionCookieOptions(ctx.req), maxAge: ONE_YEAR_MS });
        await recordAudit("LOGIN_SESSION_OBSERVED", "user", openId, undefined, { method: "demo", role: account.role });
        return { success: true, role: account.role } as const;
      }),
    /** Real self-service registration: any employee creates an account with their own chosen ID + password. */
    register: publicProcedure
      .input(z.object({
        employeeId: z.string().trim().min(3).max(40).regex(/^[A-Za-z0-9\-_.]+$/, "Use letters, numbers, - _ . only"),
        name: z.string().trim().min(2).max(120),
        email: z.string().trim().email().max(320).optional().or(z.literal("")),
        password: z.string().min(8).max(100),
      }))
      .mutation(async ({ input, ctx }) => {
        if (DEMO_ACCOUNTS[input.employeeId.toUpperCase()]) throw new TRPCError({ code: "BAD_REQUEST", message: "This ID is reserved for the demo accounts. Choose a different Employee ID." });
        let user;
        try {
          user = await registerEmployee({ employeeId: input.employeeId, name: input.name, email: input.email || undefined, passwordHash: hashPassword(input.password) });
        } catch (err) {
          throw new TRPCError({ code: "CONFLICT", message: err instanceof Error ? err.message : "Registration failed" });
        }
        if (!user) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Registration failed" });
        const token = await sdk.createSessionToken(user.openId, { name: user.name ?? input.name, expiresInMs: ONE_YEAR_MS });
        ctx.res.cookie(COOKIE_NAME, token, { ...getSessionCookieOptions(ctx.req), maxAge: ONE_YEAR_MS });
        await recordAudit("ACCOUNT_REGISTERED", "user", String(user.id), user.id, { employeeId: input.employeeId });
        return { success: true, role: user.role } as const;
      }),
    /** Real login for employee-registered accounts (separate from the demo accounts and from Google). */
    login: publicProcedure
      .input(z.object({ employeeId: z.string().trim().min(1).max(40), password: z.string().min(1).max(100) }))
      .mutation(async ({ input, ctx }) => {
        const user = await getUserByEmployeeId(input.employeeId);
        if (!user || !verifyPassword(input.password, user.passwordHash)) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid Employee ID or password" });
        }
        await touchLastSignedIn(user.openId);
        const token = await sdk.createSessionToken(user.openId, { name: user.name ?? input.employeeId, expiresInMs: ONE_YEAR_MS });
        ctx.res.cookie(COOKIE_NAME, token, { ...getSessionCookieOptions(ctx.req), maxAge: ONE_YEAR_MS });
        await recordAudit("LOGIN_SESSION_OBSERVED", "user", String(user.id), user.id, { method: "employee" });
        return { success: true, role: user.role } as const;
      }),
  }),
  admin: router({ users: adminProcedure.query(() => listUsers()), updateUserRole: adminProcedure.input(z.object({ id: z.number().int().positive(), role: z.enum(["user", "admin", "qa", "scientist"]) })).mutation(async ({ input, ctx }) => { const updated = await updateUserRole(input.id, input.role); if (!updated) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" }); await recordAudit("USER_ROLE_UPDATED", "user", String(input.id), ctx.user.id, { role: input.role }); return updated; }) }),
  ingestion: router({
    validate: scientistProcedure.input(z.object({ csv: z.string().min(1).max(50000000), filename: z.string().max(200).optional() })).mutation(async ({ input, ctx }) => { const report = validateCsv(input.csv); await recordAudit("DATASET_VALIDATED", "dataset", input.filename ?? "inline-csv", ctx.user.id, { valid: report.valid, rowCount: report.rowCount, errorCount: report.errors.length }); return report; }),
    import: scientistProcedure.input(z.object({ csv: z.string().min(1).max(50000000), filename: z.string().max(200).optional(), specificationMax: z.number().positive().max(100000).default(50), safetyBoundary: z.number().positive().max(100000).default(42) })).mutation(async ({ input, ctx }) => {
      const report = validateCsv(input.csv);
      if (!report.valid) throw new TRPCError({ code: "BAD_REQUEST", message: `CSV failed validation: ${report.errors.length} issue(s). Fix the file and retry.` });
      const parsed = parseDataset(input.csv);
      const result = await importDataset(parsed, { specificationMax: input.specificationMax, safetyBoundary: input.safetyBoundary, actorId: ctx.user.id });
      return { ...result, validation: report };
    }),
  }),
    dashboard: router({
    summary: readProcedure.query(async () => {
      await ensureDemoDataset();
      const { lots, components: comps, analyses: valid } = await getAllComponentAnalyses();
      const highRisk = valid.filter(a => (a.result.riskScore ?? 0) >= 61).length;
      const critical = valid.filter(a => (a.result.riskScore ?? 0) >= 81).length;
      const anomalies = valid.filter(a => a.result.dynamicResult === "ANOMALOUS").length;
      return {
        totalComponents: comps.length,
        totalLots: lots.length,
        highRisk,
        critical,
        anomalyRate: comps.length ? Math.round(anomalies / comps.length * 100) : 0,
        lotHealth: lots.map(lot => {
          const inLot = valid.filter(a => a.component.lotId === lot.id);
          const avgRisk = inLot.length ? inLot.reduce((sum, a) => sum + (a.result.riskScore ?? 0), 0) / inLot.length : 0;
          return { ...lot, avgRisk: Math.round(avgRisk * 10) / 10, componentCount: inLot.length, anomalyCount: inLot.filter(a => a.result.dynamicResult === "ANOMALOUS").length };
        }),
        recentInvestigations: await getInvestigations(),
        syntheticLabel: "Demonstration Data",
      };
    }),
  }),
  alerts: router({
    /** Components currently flagged HIGH RISK or CRITICAL, newest/highest first — for the live alert feed. */
    list: readProcedure.query(async () => {
      await ensureDemoDataset();
      const { analyses } = await getAllComponentAnalyses();
      return analyses
        .filter(a => (a.result.riskScore ?? 0) >= 61)
        .sort((a, b) => (b.result.riskScore ?? 0) - (a.result.riskScore ?? 0))
        .map(a => ({
          componentId: a.component.id,
          componentCode: a.component.componentCode,
          lotCode: a.lot.lotCode,
          riskScore: a.result.riskScore,
          riskBand: a.result.riskBand,
          suggestedAction: a.result.suggestedAction,
          dynamicResult: a.result.dynamicResult,
        }));
    }),
  }),
  lots: router({ list: readProcedure.query(async () => { await ensureDemoDataset(); return getLots(); }), get: readProcedure.input(z.object({ id: z.number().int() })).query(async ({ input }) => { await ensureDemoDataset(); const lot = await getLot(input.id); if (!lot) throw new TRPCError({ code: "NOT_FOUND", message: "Lot not found" }); const components = await getComponents(input.id); return { lot, components }; }) }),
  components: router({ list: readProcedure.input(z.object({ lotId: z.number().int().optional() }).optional()).query(async ({ input }) => { await ensureDemoDataset(); return getComponents(input?.lotId); }), get: readProcedure.input(z.object({ id: z.number().int() })).query(async ({ input }) => { await ensureDemoDataset(); const result = await computeComponentAnalysis(input.id); const investigations = (await getInvestigations()).filter(i => i.componentId === input.id); const investigationHistory = await Promise.all(investigations.map(async i => ({ ...i, decisions: await getDecisions(i.id) }))); return { ...result, investigations: investigationHistory }; }) }),
  analysis: router({ run: scientistProcedure.input(z.object({ componentId: z.number().int() })).mutation(async ({ input, ctx }) => { await ensureDemoDataset(); const result = await computeComponentAnalysis(input.componentId, true); await recordAudit("ANALYSIS_EXECUTED", "component", String(input.componentId), ctx.user.id, { modelVersion: result.result.modelVersion, riskScore: result.result.riskScore }); await recordAudit("RECOMMENDATION_GENERATED", "component", String(input.componentId), ctx.user.id, { suggestedAction: result.result.suggestedAction }); return result; }), get: readProcedure.input(z.object({ componentId: z.number().int() })).query(async ({ input }) => getLatestAnalysis(input.componentId)) }),
  predictions: router({ get: readProcedure.input(z.object({ componentId: z.number().int() })).query(async ({ input }) => (await computeComponentAnalysis(input.componentId)).result) }),
  explanations: router({ get: readProcedure.input(z.object({ componentId: z.number().int() })).query(async ({ input }) => { const result = await computeComponentAnalysis(input.componentId); return { evidence: result.result.evidence, featureContributions: result.result.featureContributions, caveat: "Feature contribution indicates model influence, not proven physical causation." }; }) }),
  investigations: router({ list: readProcedure.query(() => getInvestigations()), create: scientistProcedure.input(z.object({ componentId: z.number().int() })).mutation(async ({ input, ctx }) => { await ensureDemoDataset(); const analysis = await computeComponentAnalysis(input.componentId); return createInvestigation(input.componentId, analysis.result.suggestedAction, ctx.user.id); }), get: readProcedure.input(z.object({ id: z.number().int() })).query(async ({ input }) => ({ id: input.id, decisions: await getDecisions(input.id) })), decide: qaProcedure.input(z.object({ investigationId: z.number().int(), decision: decisionSchema, comment: z.string().max(1000).optional() })).mutation(async ({ input, ctx }) => { if (!roleGuard(ctx.user.role)) throw new TRPCError({ code: "FORBIDDEN", message: "QA role required" }); return closeInvestigation(input.investigationId, input.decision, input.comment, ctx.user.id); }) }),
  audit: router({ list: readProcedure.query(() => getAuditLogs()) }),
  configuration: router({
    updateLot: adminProcedure
      .input(z.object({
        lotId: z.number().int(),
        specificationMax: z.number().positive().max(100000).optional(),
        safetyBoundary: z.number().positive().max(100000).optional(),
      }).refine(v => v.specificationMax != null || v.safetyBoundary != null, "Provide at least one value to change"))
      .mutation(async ({ input, ctx }) => {
        const updated = await updateLotConfig(input.lotId, { specificationMax: input.specificationMax, safetyBoundary: input.safetyBoundary }, ctx.user.id);
        if (!updated) throw new TRPCError({ code: "NOT_FOUND", message: "Lot not found" });
        return updated;
      }),
  }),
  models: router({ list: readProcedure.query(async ({ ctx }) => { await ensureDemoDataset(); const models = await getModels(); if (ctx.user) await recordAudit("MODEL_METADATA_REVIEWED", "model", models[0]?.version, ctx.user.id, { count: models.length }); return models; }) }),
});
export type AppRouter = typeof appRouter;
