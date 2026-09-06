import { afterAll, describe, expect, it } from "vitest";
import { detectFormat, parseDataset } from "./ingestion";
import { importDataset, computeComponentAnalysis, getComponents, deleteLotByCode } from "./db";

const importedLotCodes: string[] = [];
afterAll(async () => {
  if (!process.env.DATABASE_URL) return;
  for (const code of importedLotCodes) await deleteLotByCode(code);
});

const measurementCsv = [
  "component_id,lot_code,checkpoint_hours,leakage_current,unit",
  "IMP-001,LOT-TEST-A,0,11.0,µA",
  "IMP-001,LOT-TEST-A,24,12.4,µA",
  "IMP-001,LOT-TEST-A,168,14.0,µA",
  "IMP-002,LOT-TEST-A,0,10.2,µA",
  "IMP-002,LOT-TEST-A,24,10.4,µA",
].join("\n");

// A unique lot code per run keeps the DB-backed idempotency assertions
// independent of previous test runs against the same database.
const uniqueImportCsv = (lotCode: string) =>
  [
    "component_id,lot_code,checkpoint_hours,leakage_current,unit",
    `${lotCode}-1,${lotCode},0,11.0,µA`,
    `${lotCode}-1,${lotCode},24,12.4,µA`,
    `${lotCode}-1,${lotCode},168,14.0,µA`,
    `${lotCode}-2,${lotCode},0,10.2,µA`,
    `${lotCode}-2,${lotCode},24,10.4,µA`,
  ].join("\n");

const essHeader = [
  "component_id", "lot_id", "timestamp", "hour_of_day", "day_index",
  "temperature", "pressure", "voltage", "current", "vibration", "humidity",
  "stress", "cycle_count", "operating_hours", "health", "health_24h",
  "health_48h", "health_96h", "health_168h", "anomaly_label", "anomaly_type",
  "degradation_pattern", "split",
].join(",");

function essRow(component: string, operatingHours: number, current: number) {
  return [
    component, "LOT-ESS-1", "2026-01-01T00:00:00Z", operatingHours % 24, Math.floor(operatingHours / 24),
    30, 101, 5, current, 0.1, 40,
    0.2, 10, operatingHours, 0.9, 0.9,
    0.9, 0.85, 0.8, 0, "none",
    "linear", "train",
  ].join(",");
}

describe("dataset parsing", () => {
  it("detects both supported schemas", () => {
    expect(detectFormat("component_id,lot_code,checkpoint_hours,leakage_current,unit".split(","))).toBe("measurement");
    expect(detectFormat(essHeader.split(","))).toBe("ess");
    expect(detectFormat("a,b,c".split(","))).toBe("unknown");
  });

  it("parses the native measurement format into per-component checkpoints", () => {
    const parsed = parseDataset(measurementCsv);
    expect(parsed.format).toBe("measurement");
    expect(parsed.lotCode).toBe("LOT-TEST-A");
    expect(parsed.components).toHaveLength(2);
    const first = parsed.components.find(c => c.componentCode === "IMP-001")!;
    expect(first.points.map(p => p.checkpointHours)).toEqual([0, 24, 168]);
    expect(first.points[0].leakageCurrent).toBeCloseTo(11.0);
  });

  it("collapses hourly ESS telemetry onto standard checkpoints", () => {
    const rows = [essHeader];
    for (const component of ["ESS-A", "ESS-B"]) {
      for (const hour of [0, 12, 24, 48, 96, 168]) rows.push(essRow(component, hour, 8 + hour * 0.02));
    }
    const parsed = parseDataset(rows.join("\n"));
    expect(parsed.format).toBe("ess");
    expect(parsed.lotCode).toBe("LOT-ESS-1");
    const a = parsed.components.find(c => c.componentCode === "ESS-A")!;
    expect(a.points.map(p => p.checkpointHours)).toEqual([0, 24, 48, 96, 168]);
    expect(a.scenario).toBe("linear");
  });
});

describe("dataset import (requires DATABASE_URL)", () => {
  it("persists an imported lot and is idempotent on re-import", async () => {
    if (!process.env.DATABASE_URL) return;
    const lotCode = `LOT-IMPORT-${Date.now()}`;
    importedLotCodes.push(lotCode);
    const parsed = parseDataset(uniqueImportCsv(lotCode));

    const first = await importDataset(parsed, { specificationMax: 50, safetyBoundary: 42 });
    expect(first.lotCode).toBe(lotCode);
    expect(first.componentsTotal).toBe(2);
    expect(first.componentsCreated).toBe(2);
    expect(first.measurementsInserted).toBeGreaterThan(0);

    const again = await importDataset(parsed, { specificationMax: 50, safetyBoundary: 42 });
    expect(again.componentsCreated).toBe(0);
    expect(again.measurementsInserted).toBe(0);

    const imported = (await getComponents(first.lotId)).find(c => c.componentCode === `${lotCode}-1`);
    expect(imported).toBeTruthy();
    const analysis = await computeComponentAnalysis(imported!.id, false);
    expect(analysis.result.modelVersion).toBeTruthy();
    expect(analysis.measurements.length).toBeGreaterThanOrEqual(2);
  });
});
