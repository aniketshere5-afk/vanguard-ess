/**
 * Dataset ingestion: turns an uploaded CSV into structured lot / component /
 * measurement records. Pure parsing only — no database access — so it can be
 * unit tested in isolation. Persistence lives in db.ts (importDataset).
 *
 * Two input schemas are supported:
 *   1. "measurement" — the native burn-in checkpoint format
 *      component_id, lot_code, checkpoint_hours, leakage_current, unit
 *   2. "ess" — the richer ESS telemetry export (hourly multi-sensor rows).
 *      Hourly rows are collapsed onto the standard 0/24/48/96/168h checkpoints
 *      by picking the observation closest to each checkpoint.
 */

export const CHECKPOINTS = [0, 24, 48, 96, 168] as const;

export type ParsedMeasurement = {
  checkpointHours: number;
  leakageCurrent: number;
  temperatureC: number;
  voltageV: number;
};

export type ParsedComponent = {
  componentCode: string;
  scenario: string;
  points: ParsedMeasurement[];
};

export type ParsedDataset = {
  format: "measurement" | "ess";
  lotCode: string;
  deviceFamily: string;
  components: ParsedComponent[];
  rowCount: number;
  notes: string[];
};

const MEASUREMENT_COLUMNS = ["component_id", "lot_code", "checkpoint_hours", "leakage_current", "unit"];
const ESS_KEY_COLUMNS = ["component_id", "lot_id", "timestamp", "current"];

function splitLines(csv: string): string[] {
  return csv.split(/\r?\n/).filter(line => line.trim().length > 0);
}

export function detectFormat(header: string[]): "measurement" | "ess" | "unknown" {
  if (MEASUREMENT_COLUMNS.every(name => header.includes(name))) return "measurement";
  if (ESS_KEY_COLUMNS.every(name => header.includes(name))) return "ess";
  return "unknown";
}

const num = (raw: string | undefined) => {
  const n = Number((raw ?? "").trim());
  return Number.isFinite(n) ? n : NaN;
};

function parseMeasurementFormat(lines: string[], header: string[]): ParsedDataset {
  const idx = new Map(header.map((name, i) => [name, i]));
  const at = (values: string[], name: string) => values[idx.get(name)!]?.trim() ?? "";
  const byComponent = new Map<string, ParsedComponent>();
  let lotCode = "";
  let rowCount = 0;

  for (const line of lines.slice(1)) {
    const values = line.split(",");
    if (values.length < header.length) continue;
    const code = at(values, "component_id");
    if (!code) continue;
    lotCode ||= at(values, "lot_code");
    const hours = num(at(values, "checkpoint_hours"));
    const leakage = num(at(values, "leakage_current"));
    if (!Number.isFinite(hours) || !Number.isFinite(leakage)) continue;
    rowCount++;
    let component = byComponent.get(code);
    if (!component) {
      component = { componentCode: code, scenario: "Imported", points: [] };
      byComponent.set(code, component);
    }
    if (!component.points.some(p => p.checkpointHours === hours)) {
      component.points.push({
        checkpointHours: hours,
        leakageCurrent: leakage,
        temperatureC: num(at(values, "temperature_c")) || 25,
        voltageV: num(at(values, "voltage_v")) || 5,
      });
    }
  }

  for (const component of Array.from(byComponent.values())) {
    component.points.sort((a: ParsedMeasurement, b: ParsedMeasurement) => a.checkpointHours - b.checkpointHours);
  }

  return {
    format: "measurement",
    lotCode: lotCode || "IMPORTED-LOT",
    deviceFamily: "Imported dataset",
    components: Array.from(byComponent.values()),
    rowCount,
    notes: [],
  };
}

function parseEssFormat(lines: string[], header: string[]): ParsedDataset {
  const idx = new Map(header.map((name, i) => [name, i]));
  const at = (values: string[], name: string) => (idx.has(name) ? values[idx.get(name)!]?.trim() ?? "" : "");
  const hasOperatingHours = idx.has("operating_hours");

  type Raw = { t: number; current: number; temp: number; volt: number; anomalyType: string; pattern: string };
  const rawByComponent = new Map<string, Raw[]>();
  let lotCode = "";
  let rowCount = 0;

  for (const line of lines.slice(1)) {
    const values = line.split(",");
    if (values.length < header.length) continue;
    const code = at(values, "component_id");
    if (!code) continue;
    lotCode ||= at(values, "lot_id");
    const current = num(at(values, "current"));
    if (!Number.isFinite(current)) continue;
    const t = hasOperatingHours
      ? num(at(values, "operating_hours"))
      : num(at(values, "day_index")) * 24 + num(at(values, "hour_of_day"));
    if (!Number.isFinite(t)) continue;
    rowCount++;
    const list = rawByComponent.get(code) ?? [];
    list.push({
      t,
      current,
      temp: num(at(values, "temperature")) || 25,
      volt: num(at(values, "voltage")) || 5,
      anomalyType: at(values, "anomaly_type"),
      pattern: at(values, "degradation_pattern"),
    });
    rawByComponent.set(code, list);
  }

  const components: ParsedComponent[] = [];
  for (const [code, rows] of Array.from(rawByComponent.entries())) {
    rows.sort((a: Raw, b: Raw) => a.t - b.t);
    const points: ParsedMeasurement[] = [];
    for (const checkpoint of CHECKPOINTS) {
      let best: Raw | null = null;
      let bestGap = Infinity;
      for (const row of rows) {
        const gap = Math.abs(row.t - checkpoint);
        if (gap < bestGap) {
          bestGap = gap;
          best = row;
        }
      }
      // Only accept a checkpoint if a reasonably close observation exists.
      if (best && bestGap <= 24) {
        points.push({
          checkpointHours: checkpoint,
          leakageCurrent: best.current,
          temperatureC: best.temp,
          voltageV: best.volt,
        });
      }
    }
    const scenario = rows.find((r: Raw) => r.pattern)?.pattern || rows.find((r: Raw) => r.anomalyType && r.anomalyType !== "none")?.anomalyType || "Imported";
    if (points.length >= 2) components.push({ componentCode: code, scenario, points });
  }

  return {
    format: "ess",
    lotCode: lotCode || "IMPORTED-ESS-LOT",
    deviceFamily: "ESS telemetry import",
    components,
    rowCount,
    notes: [
      "Hourly ESS telemetry was collapsed onto the standard 0/24/48/96/168h checkpoints (closest observation within 24h).",
      "The `current` column was mapped to leakage current; future health-label and per-hour anomaly columns are not yet stored.",
    ],
  };
}

export function parseDataset(csv: string): ParsedDataset {
  const lines = splitLines(csv);
  if (lines.length < 2) {
    return { format: "measurement", lotCode: "", deviceFamily: "", components: [], rowCount: 0, notes: ["CSV contained no data rows."] };
  }
  const header = lines[0].split(",").map(v => v.trim());
  const format = detectFormat(header);
  if (format === "ess") return parseEssFormat(lines, header);
  return parseMeasurementFormat(lines, header);
}
