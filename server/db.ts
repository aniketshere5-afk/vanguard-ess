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
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import { generateSyntheticDemo, computeReliability, Point } from "./reliability";

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
      metricsJson: { mae: 1.42, rmse: 2.18, r2: 0.91, validation: "lot-aware holdout" },
    });
    changed = true;
  }

  if (changed) {
    await recordAudit("DATASET_SEEDED", "lot", String(lot.id), undefined, {
      label: demo.dataLabel,
      scenarioCount: demo.scenarios.length,
    });
  }
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

export async function computeComponentAnalysis(componentId: number, persist = true) {
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
  const result = computeReliability(points, peerInitialValues, Number(lot.specificationMax), Number(lot.safetyMargin));
  if (persist) await saveAnalysis(componentId, result, "COMPLETE", result.modelVersion);
  return { component, lot, measurements: ms, result };
}
