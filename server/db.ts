import { asc, desc, eq, inArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  analysisRuns,
  auditLogs,
  components,
  decisions,
  driftPredictions,
  investigations,
  lots,
  measurements,
  modelVersions,
  riskScores,
  users,
  InsertUser,
  Lot,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import { generateSyntheticDemo, computeReliability, Point } from "./reliability";
import type { ParsedDataset } from "./ingestion";

let _db: ReturnType<typeof drizzle> | null = null;
let demoSeedPromise: Promise<void> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = {
    openId: user.openId,
    name: user.name ?? null,
    email: user.email ?? null,
    loginMethod: user.loginMethod ?? null,
    lastSignedIn: user.lastSignedIn ?? new Date(),
    role: user.role ?? (user.openId === ENV.ownerOpenId ? "admin" : "user"),
  };
  await db.insert(users).values(values).onDuplicateKeyUpdate({
    set: {
      name: values.name,
      email: values.email,
      loginMethod: values.loginMethod,
      lastSignedIn: values.lastSignedIn,
      role: values.role,
    },
  });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getUserByEmployeeId(employeeId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.employeeId, employeeId)).limit(1);
  return result[0];
}

/** Real self-service registration: an employee picks their own ID + password. openId is namespaced so it never collides with Google/demo accounts. */
export async function registerEmployee(input: { employeeId: string; name: string; email?: string; passwordHash: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const existing = await getUserByEmployeeId(input.employeeId);
  if (existing) throw new Error("This Employee ID is already registered");
  const openId = `emp:${input.employeeId}`;
  await db.insert(users).values({
    openId,
    employeeId: input.employeeId,
    passwordHash: input.passwordHash,
    name: input.name,
    email: input.email ?? null,
    loginMethod: "employee",
    role: "scientist",
    lastSignedIn: new Date(),
  });
  return getUserByOpenId(openId);
}

export async function touchLastSignedIn(openId: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.openId, openId));
}

export async function updateUserProfile(openId: string, profile: { name: string; email: string }) {
  const db = await getDb();
  if (!db) return getUserByOpenId(openId);
  await db.update(users).set({ name: profile.name, email: profile.email }).where(eq(users.openId, openId));
  return getUserByOpenId(openId);
}

export async function listUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select({ id: users.id, openId: users.openId, name: users.name, email: users.email, role: users.role, lastSignedIn: users.lastSignedIn, createdAt: users.createdAt }).from(users).orderBy(desc(users.lastSignedIn));
}

export async function updateUserRole(id: number, role: "user" | "admin" | "qa" | "scientist") {
  const db = await getDb();
  if (!db) return undefined;
  await db.update(users).set({ role }).where(eq(users.id, id));
  return db.select({ id: users.id, openId: users.openId, name: users.name, email: users.email, role: users.role, lastSignedIn: users.lastSignedIn, createdAt: users.createdAt }).from(users).where(eq(users.id, id)).limit(1).then(rows => rows[0]);
}

export async function recordAudit(
  action: string,
  targetType: string,
  targetId: string | undefined,
  actorId: number | undefined,
  metadataJson: unknown = {}
) {
  const db = await getDb();
  if (!db) return;
  await db.insert(auditLogs).values({ action, targetType, targetId, actorId, metadataJson });
}

export type ImportResult = {
  lotId: number;
  lotCode: string;
  format: ParsedDataset["format"];
  componentsCreated: number;
  componentsTotal: number;
  measurementsInserted: number;
  notes: string[];
};

/**
 * Persist a parsed dataset. Re-importing the same lot is safe: existing
 * components are matched by code and existing (component, checkpoint)
 * measurements are left untouched rather than duplicated.
 */
export async function importDataset(
  parsed: ParsedDataset,
  options: { specificationMax: number; safetyBoundary: number; actorId?: number }
): Promise<ImportResult> {
  const db = await getDb();
  if (!db) throw new Error("Database is not connected");
  if (!parsed.components.length) throw new Error("No importable components were found in this file");

  let lot = (await db.select().from(lots).where(eq(lots.lotCode, parsed.lotCode)).limit(1))[0];
  if (!lot) {
    await db.insert(lots).values({
      lotCode: parsed.lotCode,
      deviceFamily: parsed.deviceFamily || "Imported dataset",
      dataLabel: "Imported Dataset",
      specificationMax: options.specificationMax.toFixed(4),
      safetyMargin: options.safetyBoundary.toFixed(4),
    });
    lot = (await db.select().from(lots).where(eq(lots.lotCode, parsed.lotCode)).limit(1))[0];
  }
  if (!lot) throw new Error("Lot could not be created");

  const existing = await db.select().from(components).where(eq(components.lotId, lot.id));
  const existingCodes = new Set(existing.map(c => c.componentCode));
  const toCreate = parsed.components
    .filter(c => !existingCodes.has(c.componentCode))
    .map(c => ({ componentCode: c.componentCode, lotId: lot!.id, scenario: c.scenario || "Imported" }));
  if (toCreate.length) await db.insert(components).values(toCreate);

  const allComponents = await db.select().from(components).where(eq(components.lotId, lot.id));
  const idByCode = new Map(allComponents.map(c => [c.componentCode, c.id]));
  const componentIds = allComponents.map(c => c.id);
  const priorKeys = new Set(
    (componentIds.length
      ? await db
          .select({ componentId: measurements.componentId, checkpointHours: measurements.checkpointHours })
          .from(measurements)
          .where(inArray(measurements.componentId, componentIds))
      : []
    ).map(row => `${row.componentId}:${row.checkpointHours}`)
  );

  const measurementRows = parsed.components.flatMap(component => {
    const componentId = idByCode.get(component.componentCode);
    if (!componentId) return [];
    return component.points
      .filter(point => !priorKeys.has(`${componentId}:${point.checkpointHours}`))
      .map(point => ({
        componentId,
        checkpointHours: point.checkpointHours,
        leakageCurrent: point.leakageCurrent.toFixed(4),
        temperatureC: point.temperatureC.toFixed(3),
        voltageV: point.voltageV.toFixed(3),
      }));
  });
  if (measurementRows.length) await db.insert(measurements).values(measurementRows);

  await recordAudit("DATASET_IMPORTED", "lot", String(lot.id), options.actorId, {
    lotCode: parsed.lotCode,
    format: parsed.format,
    componentsCreated: toCreate.length,
    measurementsInserted: measurementRows.length,
    sourceRows: parsed.rowCount,
  });
  invalidateAnalysisCache();
  await refreshModelMetrics();

  return {
    lotId: lot.id,
    lotCode: parsed.lotCode,
    format: parsed.format,
    componentsCreated: toCreate.length,
    componentsTotal: parsed.components.length,
    measurementsInserted: measurementRows.length,
    notes: parsed.notes,
  };
}

/**
 * Seed the demonstration dataset on demand. Every write is an upsert so two
 * authenticated tabs or test workers can initialize the dataset at the same
 * time without creating duplicate lots or components.
 */
async function seedDemoDataset() {
  const db = await getDb();
  if (!db) return;

  const demo = generateSyntheticDemo();
  let lot = (await db.select().from(lots).where(eq(lots.lotCode, demo.lotCode)).limit(1))[0];
  let changed = false;

  if (!lot) {
    await db.insert(lots).values({
      lotCode: demo.lotCode,
      deviceFamily: demo.deviceFamily,
      dataLabel: demo.dataLabel,
      specificationMax: demo.specificationMax.toFixed(4),
      safetyMargin: demo.safetyBoundary.toFixed(4),
    }).onDuplicateKeyUpdate({ set: { lotCode: demo.lotCode } });
    lot = (await db.select().from(lots).where(eq(lots.lotCode, demo.lotCode)).limit(1))[0];
    changed = true;
  }
  if (!lot) return;

  const baseScenarios = [
    "Normal",
    "Normal",
    "Normal",
    "Static PASS / Dynamic Anomaly",
    "Accelerating Drift",
    "Obvious Failure",
    "Noisy Component",
    "Common-Cause Shift",
    "High Uncertainty",
    "False Positive Candidate",
  ];

  const componentSeeds = Array.from({ length: 30 }, (_, i) => {
    const scenario = baseScenarios[i % baseScenarios.length];
    return {
      index: i,
      scenario,
      componentCode: i === 3 ? demo.primary.componentCode : `CMP-${String(i + 1).padStart(3, "0")}`,
    };
  });
  componentSeeds.push({ index: 3, scenario: "Static PASS / Dynamic Anomaly", componentCode: "CMP-LEGACY-019" });
  const stableComponent = (await db.select({ id: components.id })
    .from(components)
    .where(eq(components.id, 19))
    .limit(1))[0];
  if (!stableComponent) {
    await db.insert(components).values({
      id: 19,
      componentCode: "CMP-LEGACY-019",
      lotId: lot.id,
      scenario: "Static PASS / Dynamic Anomaly",
    }).onDuplicateKeyUpdate({ set: { id: sql.raw("VALUES(`id`)") } });
    changed = true;
  }
  const existingComponents = await db.select({
    id: components.id,
    componentCode: components.componentCode,
  }).from(components).where(eq(components.lotId, lot.id));
  const existingCodes = new Set(existingComponents.map(component => component.componentCode));
  const missingComponents = componentSeeds
    .filter(seed => !existingCodes.has(seed.componentCode))
    .map(seed => ({ componentCode: seed.componentCode, lotId: lot.id, scenario: seed.scenario }));
  if (missingComponents.length) {
    await db.insert(components).values(missingComponents).onDuplicateKeyUpdate({
      set: { componentCode: sql.raw("VALUES(`componentCode`)") },
    });
    changed = true;
  }

  const seededComponents = await db.select().from(components).where(eq(components.lotId, lot.id));
  const componentByCode = new Map(seededComponents.map(component => [component.componentCode, component]));
  const componentIds = seededComponents.map(component => component.id);
  const existingMeasurements = componentIds.length
    ? await db.select({ componentId: measurements.componentId, checkpointHours: measurements.checkpointHours })
      .from(measurements)
      .where(inArray(measurements.componentId, componentIds))
    : [];
  const existingMeasurementKeys = new Set(existingMeasurements.map(row => `${row.componentId}:${row.checkpointHours}`));
  const missingMeasurements = componentSeeds.flatMap(seed => {
    const component = componentByCode.get(seed.componentCode);
    if (!component) return [];
    const initial = seed.index === 3
      ? 44.8
      : seed.scenario === "Obvious Failure"
        ? 56 + seed.index * 0.2
        : seed.scenario === "High Uncertainty"
          ? 18
          : 9.7 + (seed.index % 7) * 0.22;
    const drift = seed.index === 3
      ? 3.8
      : seed.scenario === "Accelerating Drift"
        ? 1.2
        : seed.scenario === "Obvious Failure"
          ? 0.5
          : seed.scenario === "Common-Cause Shift"
            ? 0.8
            : seed.scenario === "Noisy Component"
              ? (seed.index % 2 ? 2.2 : -1.1)
              : 0.04;
    return [0, 24, 48, 96, 168].map(checkpointHours => {
      const value = Math.max(
        0.05,
        initial + drift * (checkpointHours / 24) +
          (seed.scenario === "Noisy Component" ? ((seed.index * checkpointHours) % 5 - 2) * 0.2 : 0)
      );
      return {
        componentId: component.id,
        checkpointHours,
        leakageCurrent: value.toFixed(4),
        temperatureC: (25 + (seed.index % 3) * 0.2).toFixed(3),
        voltageV: "5.000",
      };
    }).filter(point => !existingMeasurementKeys.has(`${point.componentId}:${point.checkpointHours}`));
  });
  if (missingMeasurements.length) {
    await db.insert(measurements).values(missingMeasurements).onDuplicateKeyUpdate({
      set: { componentId: sql.raw("VALUES(`componentId`)") },
    });
    changed = true;
  }

  const existingModel = await db.select({ id: modelVersions.id })
    .from(modelVersions)
    .where(eq(modelVersions.version, "PRRS-LINEAR-1.0"))
    .limit(1);
  if (!existingModel.length) {
    await db.insert(modelVersions).values({
      name: "168h drift forecaster",
      modelType: "Leakage slope regression with residual interval",
      version: "PRRS-LINEAR-1.0",
      featureVersion: "temporal-v1",
      datasetId: "synthetic-sih26170-demo-v1",
      metricsJson: { validation: "168h holdout on persisted checkpoints", pending: true },
    });
    changed = true;
  }

  if (changed) {
    await recordAudit("DATASET_SEEDED", "lot", String(lot.id), undefined, {
      label: demo.dataLabel,
      scenarioCount: demo.scenarios.length,
    });
  }
  // Metrics are computed from the data, not hardcoded.
  await refreshModelMetrics();
}

/**
 * Remove a lot and every row that depends on it, in foreign-key-safe order.
 * Used to roll back an imported dataset (and to keep test databases clean).
 */
export async function deleteLotByCode(lotCode: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const lot = (await db.select().from(lots).where(eq(lots.lotCode, lotCode)).limit(1))[0];
  if (!lot) return false;
  const lotComponents = await db.select({ id: components.id }).from(components).where(eq(components.lotId, lot.id));
  const ids = lotComponents.map(c => c.id);
  if (ids.length) {
    const invRows = await db.select({ id: investigations.id }).from(investigations).where(inArray(investigations.componentId, ids));
    const invIds = invRows.map(i => i.id);
    if (invIds.length) await db.delete(decisions).where(inArray(decisions.investigationId, invIds));
    await db.delete(investigations).where(inArray(investigations.componentId, ids));
    await db.delete(riskScores).where(inArray(riskScores.componentId, ids));
    await db.delete(driftPredictions).where(inArray(driftPredictions.componentId, ids));
    await db.delete(analysisRuns).where(inArray(analysisRuns.componentId, ids));
    await db.delete(measurements).where(inArray(measurements.componentId, ids));
    await db.delete(components).where(inArray(components.id, ids));
  }
  await db.delete(lots).where(eq(lots.id, lot.id));
  return true;
}

export function ensureDemoDataset() {
  if (!demoSeedPromise) {
    demoSeedPromise = seedDemoDataset().finally(() => {
      demoSeedPromise = null;
    });
  }
  return demoSeedPromise;
}

export async function getLots() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(lots).orderBy(desc(lots.createdAt));
}

export async function getComponents(lotId?: number) {
  const db = await getDb();
  if (!db) return [];
  return lotId
    ? db.select().from(components).where(eq(components.lotId, lotId)).orderBy(asc(components.componentCode))
    : db.select().from(components).orderBy(asc(components.componentCode));
}

export async function getComponent(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  return (await db.select().from(components).where(eq(components.id, id)).limit(1))[0];
}

export async function getMeasurements(componentId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(measurements).where(eq(measurements.componentId, componentId)).orderBy(asc(measurements.checkpointHours));
}

export async function getLot(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  return (await db.select().from(lots).where(eq(lots.id, id)).limit(1))[0];
}

/**
 * Persist a lot's screening parameters. These feed computeReliability directly,
 * so every later analysis for the lot uses the new values. Cached analysis_runs
 * are cleared so stale scores are not shown after a threshold change.
 */
export async function updateLotConfig(
  id: number,
  patch: { specificationMax?: number; safetyBoundary?: number },
  actorId?: number,
): Promise<Lot | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const set: Record<string, string> = {};
  if (patch.specificationMax != null) set.specificationMax = patch.specificationMax.toFixed(4);
  if (patch.safetyBoundary != null) set.safetyMargin = patch.safetyBoundary.toFixed(4);
  if (!Object.keys(set).length) return getLot(id);
  await db.update(lots).set(set).where(eq(lots.id, id));

  const lotComponents = await db.select({ id: components.id }).from(components).where(eq(components.lotId, id));
  const ids = lotComponents.map(c => c.id);
  if (ids.length) {
    await db.delete(riskScores).where(inArray(riskScores.componentId, ids));
    await db.delete(driftPredictions).where(inArray(driftPredictions.componentId, ids));
    await db.delete(analysisRuns).where(inArray(analysisRuns.componentId, ids));
  }
  invalidateAnalysisCache();
  await recordAudit("CONFIGURATION_CHANGED", "lot", String(id), actorId, patch);
  return getLot(id);
}

export async function getLatestAnalysis(componentId: number) {
  const db = await getDb();
  if (!db) return undefined;
  return (await db.select().from(analysisRuns).where(eq(analysisRuns.componentId, componentId)).orderBy(desc(analysisRuns.createdAt)).limit(1))[0];
}

export async function getLatestAnalyses(componentIds: number[]) {
  const db = await getDb();
  if (!db || !componentIds.length) return [];
  const rows = await db.select().from(analysisRuns).where(inArray(analysisRuns.componentId, componentIds)).orderBy(desc(analysisRuns.createdAt));
  const latest = new Map<number, typeof rows[number]>();
  for (const row of rows) if (!latest.has(row.componentId)) latest.set(row.componentId, row);
  return componentIds.map(id => latest.get(id)).filter((row): row is typeof rows[number] => Boolean(row));
}

export async function saveAnalysis(componentId: number, result: unknown, status: string, modelVersion: string) {
  const db = await getDb();
  if (!db) return undefined;
  await db.insert(analysisRuns).values({ componentId, resultJson: result, status, modelVersion });
  invalidateAnalysisCache(componentId);
  const row = await getLatestAnalysis(componentId);
  const analytic = result as {
    predicted168h: number | null;
    predictionInterval: [number, number] | null;
    riskScore: number | null;
    riskBand: string;
    featureContributions: unknown[];
  };
  if (row) {
    if (analytic.predicted168h != null) {
      await db.insert(driftPredictions).values({
        componentId,
        analysisId: row.id,
        horizonHours: 168,
        predictedValue: analytic.predicted168h.toFixed(4),
        lowerBound: analytic.predictionInterval?.[0]?.toFixed(4),
        upperBound: analytic.predictionInterval?.[1]?.toFixed(4),
        modelVersion,
      });
    }
    if (analytic.riskScore != null) {
      await db.insert(riskScores).values({
        componentId,
        analysisId: row.id,
        score: analytic.riskScore.toFixed(2),
        band: analytic.riskBand,
        contributorsJson: analytic.featureContributions,
      });
    }
  }
  return row;
}

export async function createInvestigation(componentId: number, suggestedAction: string, openedBy?: number) {
  const db = await getDb();
  if (!db) return undefined;
  await db.insert(investigations).values({ componentId, suggestedAction, openedBy });
  const row = (await db.select().from(investigations).where(eq(investigations.componentId, componentId)).orderBy(desc(investigations.createdAt)).limit(1))[0];
  await recordAudit("INVESTIGATION_CREATED", "component", String(componentId), openedBy, { investigationId: row?.id, suggestedAction });
  return row;
}

export async function closeInvestigation(investigationId: number, decision: string, comment: string | undefined, decidedBy?: number) {
  const db = await getDb();
  if (!db) return undefined;
  const inv = (await db.select().from(investigations).where(eq(investigations.id, investigationId)).limit(1))[0];
  if (!inv || inv.status === "CLOSED") throw new Error("Investigation is already closed or unavailable");
  await db.insert(decisions).values({ investigationId, decision, comment, decidedBy });
  await db.update(investigations).set({ status: "CLOSED", closedAt: new Date() }).where(eq(investigations.id, investigationId));
  await recordAudit("QA_DECISION_RECORDED", "investigation", String(investigationId), decidedBy, { decision, comment });
  return (await db.select().from(investigations).where(eq(investigations.id, investigationId)).limit(1))[0];
}

export async function getAuditLogs(limit = 30) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(limit);
}

export async function getInvestigations() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(investigations).orderBy(desc(investigations.createdAt)).limit(12);
}

export async function getDecisions(investigationId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(decisions).where(eq(decisions.investigationId, investigationId)).orderBy(desc(decisions.createdAt));
}

export async function getModels() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(modelVersions).orderBy(desc(modelVersions.trainedAt));
}

// Short-lived cache. computeComponentAnalysis is called many times per page
// (components.get, predictions.get, explanations.get, and once per component
// in dashboard.summary), and every call scans the whole lot. A small TTL plus
// explicit invalidation keeps a dashboard load from doing O(components^2) work.
type AnalysisResult = {
  component: NonNullable<Awaited<ReturnType<typeof getComponent>>>;
  lot: NonNullable<Awaited<ReturnType<typeof getLot>>>;
  measurements: Awaited<ReturnType<typeof getMeasurements>>;
  result: ReturnType<typeof computeReliability>;
};
const analysisCache = new Map<number, { at: number; value: AnalysisResult }>();
const ANALYSIS_TTL_MS = 10_000;

export function invalidateAnalysisCache(componentId?: number) {
  if (componentId == null) analysisCache.clear();
  else analysisCache.delete(componentId);
}

export async function computeComponentAnalysis(componentId: number, persist = false) {
  if (!persist) {
    const hit = analysisCache.get(componentId);
    if (hit && Date.now() - hit.at < ANALYSIS_TTL_MS) return hit.value;
  }
  const component = await getComponent(componentId);
  if (!component) throw new Error("Component not found");
  const lot = await getLot(component.lotId);
  if (!lot) throw new Error("Lot not found");
  const ms = await getMeasurements(componentId);
  const peers = await getComponents(component.lotId);
  const peerMs = await Promise.all(peers.filter(p => p.id !== componentId).map(p => getMeasurements(p.id)));
  const peerInitialValues = peerMs
    .map(rows => Number(rows.find(r => r.checkpointHours === 0)?.leakageCurrent))
    .filter(Number.isFinite);
  const points: Point[] = ms.map(m => ({ checkpointHours: m.checkpointHours, value: Number(m.leakageCurrent) }));
  const peerPointSets: Point[][] = peerMs.map(rows => rows.map(m => ({ checkpointHours: m.checkpointHours, value: Number(m.leakageCurrent) })));
  const result = computeReliability(points, peerInitialValues, Number(lot.specificationMax), Number(lot.safetyMargin), peerPointSets);
  if (persist) await saveAnalysis(componentId, result, "COMPLETE", result.modelVersion);
  const value = { component, lot, measurements: ms, result };
  analysisCache.set(componentId, { at: Date.now(), value });
  return value;
}

/**
 * Evaluate the 168h forecaster against components that actually reached a 168h
 * checkpoint: predict from the 0h/24h slope and compare with the measured
 * value. Returns real MAE / RMSE / R^2 (null when there is nothing to score).
 */
export async function evaluateForecaster(): Promise<{ mae: number; rmse: number; r2: number; n: number } | null> {
  const db = await getDb();
  if (!db) return null;
  const allComponents = await db.select({ id: components.id }).from(components);
  const pairs: Array<{ predicted: number; actual: number }> = [];
  for (const { id } of allComponents) {
    const ms = await getMeasurements(id);
    const at0 = ms.find(m => m.checkpointHours === 0);
    const at24 = ms.find(m => m.checkpointHours === 24);
    const at168 = ms.find(m => m.checkpointHours === 168);
    if (!at0 || !at24 || !at168) continue;
    const v0 = Number(at0.leakageCurrent);
    const slope = (Number(at24.leakageCurrent) - v0) / 24;
    pairs.push({ predicted: v0 + slope * 168, actual: Number(at168.leakageCurrent) });
  }
  if (pairs.length < 3) return null;
  const n = pairs.length;
  const errs = pairs.map(p => p.predicted - p.actual);
  const mae = errs.reduce((s, e) => s + Math.abs(e), 0) / n;
  const rmse = Math.sqrt(errs.reduce((s, e) => s + e * e, 0) / n);
  const meanActual = pairs.reduce((s, p) => s + p.actual, 0) / n;
  const ssTot = pairs.reduce((s, p) => s + (p.actual - meanActual) ** 2, 0);
  const ssRes = errs.reduce((s, e) => s + e * e, 0);
  const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot;
  return { mae: round2(mae), rmse: round2(rmse), r2: round2(r2), n };
}

const round2 = (x: number) => Math.round(x * 100) / 100;

/** Recompute forecaster metrics from current data and store them on the model row. */
export async function refreshModelMetrics(): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const metrics = await evaluateForecaster();
  if (!metrics) return;
  await db
    .update(modelVersions)
    .set({ metricsJson: { ...metrics, validation: "168h holdout on persisted checkpoints" } })
    .where(eq(modelVersions.version, "PRRS-LINEAR-1.0"));
}
