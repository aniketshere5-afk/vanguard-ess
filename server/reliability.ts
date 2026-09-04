export type Point = { checkpointHours: number; value: number };
export type ReliabilityResult = {
  staticResult: "PASS" | "FAIL";
  lotBaseline: number | null;
  lotMad: number | null;
  lotIqr: number | null;
  robustZ: number | null;
  dynamicResult: "NORMAL" | "ANOMALOUS" | "INSUFFICIENT_DATA";
  anomalyScore: number | null;
  driftSlope: number | null;
  driftPercent: number | null;
  predicted168h: number | null;
  predictionInterval: [number, number] | null;
  safetyBoundary: number;
  boundaryMargin: number | null;
  boundaryStatus: "CLEAR" | "WATCH" | "CROSSES" | "UNKNOWN";
  riskScore: number | null;
  riskBand: "NORMAL" | "WATCH" | "SUSPICIOUS" | "HIGH RISK" | "CRITICAL" | "UNKNOWN";
  suggestedAction: string;
  evidence: Array<{ label: string; value: string; severity: "positive" | "warning" | "critical" | "neutral" }>;
  featureContributions: Array<{ label: string; contribution: number }>;
  uncertaintyLevel: "LOW" | "MODERATE" | "HIGH" | "UNKNOWN";
  modelVersion: string;
};

const median = (xs: number[]) => { const a = [...xs].sort((x, y) => x - y); if (!a.length) return null; const m = Math.floor(a.length / 2); return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2; };
const quantile = (xs: number[], q: number) => { const a = [...xs].sort((x, y) => x - y); if (!a.length) return null; const p = (a.length - 1) * q; const b = Math.floor(p); const r = p - b; return a[b + 1] === undefined ? a[b] : a[b] + r * (a[b + 1] - a[b]); };
const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));
const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));

export function computeReliability(points: Point[], peerInitialValues: number[], specificationMax: number, configuredSafetyBoundary: number): ReliabilityResult {
  const ordered = [...points].sort((a, b) => a.checkpointHours - b.checkpointHours);
  const initial = ordered.find(p => p.checkpointHours === 0)?.value ?? ordered[0]?.value ?? null;
  const at24 = ordered.find(p => p.checkpointHours === 24)?.value ?? null;
  const peerMedian = median(peerInitialValues);
  const deviations = peerMedian == null ? [] : peerInitialValues.map(v => Math.abs(v - peerMedian));
  const mad = median(deviations);
  const q1 = quantile(peerInitialValues, .25);
  const q3 = quantile(peerInitialValues, .75);
  const iqr = q1 != null && q3 != null ? q3 - q1 : null;
  const robustZ = initial != null && peerMedian != null && mad != null && mad > 0 ? 0.6745 * (initial - peerMedian) / mad : null;
  const enoughPeers = peerInitialValues.length >= 5;
  const robustEvidence = robustZ == null ? 0 : clamp(Math.abs(robustZ) / 6 * 100);
  const percentileDistance = initial != null && peerInitialValues.length ? clamp(Math.abs((peerInitialValues.filter(v => v <= initial!).length / peerInitialValues.length) - .5) * 200) : 0;
  const thresholdEvidence = initial != null && peerMedian != null && mad != null && initial > (peerMedian + 3 * (mad || 1)) ? 100 : percentileDistance;
  const anomalyScore = enoughPeers && robustZ != null ? Math.round(clamp(.7 * robustEvidence + .3 * thresholdEvidence) * 10) / 10 : null;
  const dynamicResult = !enoughPeers || robustZ == null ? "INSUFFICIENT_DATA" : (anomalyScore! >= 60 ? "ANOMALOUS" : "NORMAL");
  const first = ordered[0]; const lastKnown = ordered.find(p => p.checkpointHours === 24) ?? ordered[ordered.length - 1];
  const slope = first && lastKnown && lastKnown.checkpointHours > first.checkpointHours ? (lastKnown.value - first.value) / (lastKnown.checkpointHours - first.checkpointHours) : null;
  const driftPercent = first && lastKnown ? (lastKnown.value - first.value) / Math.max(Math.abs(first.value), .0001) * 100 : null;
  const predicted = slope != null && first ? first.value + slope * 168 : null;
  const residualScale = peerInitialValues.length >= 2 ? Math.max(0.25, (quantile(peerInitialValues, .75)! - quantile(peerInitialValues, .25)!) * 1.25) : null;
  const interval = predicted != null && residualScale != null ? [Math.max(0, predicted - residualScale), predicted + residualScale] as [number, number] : null;
  const margin = predicted != null ? configuredSafetyBoundary - predicted : null;
  const boundaryStatus = margin == null ? "UNKNOWN" : margin < 0 ? "CROSSES" : margin < configuredSafetyBoundary * .1 ? "WATCH" : "CLEAR";
  const uncertaintyLevel = residualScale == null ? "UNKNOWN" : residualScale > configuredSafetyBoundary * .15 ? "HIGH" : residualScale > configuredSafetyBoundary * .08 ? "MODERATE" : "LOW";
  const staticResult = initial != null && initial <= specificationMax ? "PASS" : "FAIL";
  const staticRisk = staticResult === "FAIL" ? 100 : 0;
  const dynamicRisk = anomalyScore ?? 35;
  const driftRisk = slope == null ? 35 : clamp(sigmoid((slope * 168 - configuredSafetyBoundary * .05) / Math.max(configuredSafetyBoundary * .08, .01)) * 100);
  const boundaryRisk = margin == null ? 35 : clamp((1 - margin / configuredSafetyBoundary) * 100);
  const uncertaintyRisk = uncertaintyLevel === "HIGH" ? 75 : uncertaintyLevel === "MODERATE" ? 45 : uncertaintyLevel === "LOW" ? 15 : 40;
  const riskScore = Math.round(clamp(.08 * staticRisk + .28 * dynamicRisk + .24 * driftRisk + .25 * boundaryRisk + .15 * uncertaintyRisk) * 10) / 10;
  const riskBand = riskScore <= 20 ? "NORMAL" : riskScore <= 40 ? "WATCH" : riskScore <= 60 ? "SUSPICIOUS" : riskScore <= 80 ? "HIGH RISK" : "CRITICAL";
  const suggestedAction = riskScore >= 80 ? "Hold for Review" : riskScore >= 60 ? "Extended Burn-In" : riskScore >= 41 ? "Re-test" : "Standard Screening";
  const evidence = [
    { label: "Static specification", value: initial == null ? "No initial measurement" : `${initial.toFixed(2)} µA ≤ ${specificationMax.toFixed(2)} µA · ${staticResult}`, severity: staticResult === "PASS" ? "positive" : "critical" },
    { label: "Lot-relative baseline", value: peerMedian == null ? "Insufficient peer data" : `${initial!.toFixed(2)} µA vs median ${peerMedian.toFixed(2)} µA · robust z ${robustZ!.toFixed(2)}`, severity: dynamicResult === "ANOMALOUS" ? "warning" : "neutral" },
    { label: "Hybrid anomaly evidence", value: enoughPeers ? `Robust deviation ${robustEvidence.toFixed(1)} + normalized distribution evidence ${thresholdEvidence.toFixed(1)}` : "Insufficient peer data for hybrid evidence", severity: dynamicResult === "ANOMALOUS" ? "warning" : "neutral" },
    { label: "Early drift", value: driftPercent == null ? "Insufficient temporal data" : `${driftPercent >= 0 ? "+" : ""}${driftPercent.toFixed(1)}% from 0h to 24h`, severity: driftPercent != null && driftPercent > 15 ? "warning" : "neutral" },
    { label: "168h forecast", value: predicted == null ? "Unable to generate a reliable prediction" : `${predicted.toFixed(2)} µA · interval ${interval![0].toFixed(2)}–${interval![1].toFixed(2)} µA`, severity: boundaryStatus === "CROSSES" ? "critical" : "neutral" },
    { label: "Safety boundary", value: margin == null ? "Unknown" : `${configuredSafetyBoundary.toFixed(2)} µA · margin ${margin.toFixed(2)} µA`, severity: boundaryStatus === "CROSSES" ? "critical" : boundaryStatus === "WATCH" ? "warning" : "positive" },
  ] as ReliabilityResult["evidence"];
  const featureContributions = [
    { label: "Lot deviation", contribution: Math.round(.28 * dynamicRisk * 10) / 10 }, { label: "Boundary proximity", contribution: Math.round(.25 * boundaryRisk * 10) / 10 }, { label: "Early drift", contribution: Math.round(.24 * driftRisk * 10) / 10 }, { label: "Prediction uncertainty", contribution: Math.round(.15 * uncertaintyRisk * 10) / 10 }, { label: "Static compliance", contribution: Math.round(.08 * staticRisk * 10) / 10 },
  ];
  return { staticResult, lotBaseline: peerMedian, lotMad: mad, lotIqr: iqr, robustZ, dynamicResult, anomalyScore, driftSlope: slope, driftPercent, predicted168h: predicted, predictionInterval: interval, safetyBoundary: configuredSafetyBoundary, boundaryMargin: margin, boundaryStatus, riskScore, riskBand, suggestedAction, evidence, featureContributions, uncertaintyLevel, modelVersion: "PRRS-LINEAR-1.0" };
}

export function generateSyntheticDemo() {
  const scenarios = ["Normal", "Static PASS / Dynamic Anomaly", "Accelerating Drift", "Obvious Failure", "Noisy Component", "Common-Cause Shift", "High Uncertainty", "False Positive Candidate"];
  const peer = [9.8, 10.1, 10.3, 10.4, 10.6, 10.7, 10.9, 10.2, 10.5, 10.0, 10.8, 10.3];
  return { lotCode: "LOT-2026-041", deviceFamily: "VGA-18 / Power Regulation", dataLabel: "Synthetic / Demonstration Data", specificationMax: 50, safetyBoundary: 42, peer, scenarios, primary: { componentCode: "CMP-LATENT-017", scenario: "Static PASS / Dynamic Anomaly", points: [{ checkpointHours: 0, value: 44.8 }, { checkpointHours: 24, value: 48.6 }] as Point[] } };
}

export function validateCsv(csv: string) {
  const errors: Array<{ row: number; code: string; message: string }> = [];
  const warnings: string[] = [];
  const firstNewline = csv.search(/\r?\n/);
  const headerLine = firstNewline === -1 ? csv : csv.slice(0, firstNewline);
  if (!headerLine.trim()) return { valid: false, rowCount: 0, errors: [{ row: 0, code: "EMPTY", message: "CSV contains no rows." }], warnings };

  const header = headerLine.split(",").map(v => v.trim());

  // The original measurement format is kept for backwards compatibility.
  const measurementRequired = ["component_id", "lot_code", "checkpoint_hours", "leakage_current", "unit"];
  const isMeasurementFormat = measurementRequired.every(name => header.includes(name));

  // The supplied ESS telemetry dataset is a different, richer schema. It is
  // intentionally accepted by the quality gate rather than being forced into
  // the older leakage-current schema.
  const essRequired = [
    "component_id", "lot_id", "timestamp", "hour_of_day", "day_index",
    "temperature", "pressure", "voltage", "current", "vibration", "humidity",
    "stress", "cycle_count", "operating_hours", "health", "health_24h",
    "health_48h", "health_96h", "health_168h", "anomaly_label", "anomaly_type",
    "degradation_pattern", "split",
  ];
  const isEssFormat = essRequired.every(name => header.includes(name));

  if (!isMeasurementFormat && !isEssFormat) {
    const required = measurementRequired;
    const missing = required.filter(name => !header.includes(name));
    missing.forEach(name => errors.push({ row: 1, code: "MISSING_COLUMN", message: `Required column missing: ${name}` }));
    const rowCount = csv.split(/\r?\n/).filter(line => line.trim().length > 0).length - 1;
    return { valid: false, rowCount: Math.max(0, rowCount), errors, warnings };
  }

  if (isEssFormat) {
    const unexpected = header.filter(name => !essRequired.includes(name));
    unexpected.forEach(name => errors.push({ row: 1, code: "UNEXPECTED_COLUMN", message: `Unexpected column: ${name}` }));

    const index = new Map(header.map((name, i) => [name, i]));
    const numericFields = [
      "hour_of_day", "day_index", "temperature", "pressure", "voltage", "current",
      "vibration", "humidity", "stress", "cycle_count", "operating_hours", "health",
      "health_24h", "health_48h", "health_96h", "health_168h", "anomaly_label",
    ];
    const seen = new Set<string>();
    const components = new Set<string>();
    let missingSensorValues = 0;
    let missingFutureLabels = 0;
    let rowCount = 0;
    let lineStart = firstNewline === -1 ? csv.length : firstNewline + 1;
    while (lineStart < csv.length) {
      const nextNewline = csv.indexOf("\n", lineStart);
      const rawLine = nextNewline === -1 ? csv.slice(lineStart) : csv.slice(lineStart, nextNewline);
      const line = rawLine.endsWith("\r") ? rawLine.slice(0, -1) : rawLine;
      lineStart = nextNewline === -1 ? csv.length : nextNewline + 1;
      if (!line.trim()) continue;
      rowCount++;
      const row = rowCount + 1;
      const values = line.split(",");
      if (values.length !== header.length) {
        errors.push({ row, code: "MALFORMED_ROW", message: "Column count does not match the header." });
        continue;
      }
      const value = (name: string) => values[index.get(name)!]?.trim() ?? "";
      const component = value("component_id");
      const timestamp = value("timestamp");
      const key = `${component}|${timestamp}`;
      if (!component || !timestamp) {
        errors.push({ row, code: "MISSING_VALUE", message: "component_id and timestamp are required." });
      }
      if (seen.has(key)) errors.push({ row, code: "DUPLICATE", message: `Duplicate component/timestamp pair: ${key}` });
      seen.add(key);
      if (component) components.add(component);

      const hour = Number(value("hour_of_day"));
      const anomaly = Number(value("anomaly_label"));
      if (!Number.isFinite(hour) || hour < 0 || hour > 23) errors.push({ row, code: "INVALID_HOUR", message: "hour_of_day must be between 0 and 23." });
      if (!Number.isFinite(anomaly) || ![0, 1].includes(anomaly)) errors.push({ row, code: "INVALID_ANOMALY_LABEL", message: "anomaly_label must be 0 or 1." });

      for (const field of numericFields) {
        const raw = value(field);
        if (!raw) {
          if (["temperature", "pressure", "voltage", "current", "vibration", "humidity"].includes(field)) missingSensorValues++;
          if (["health_24h", "health_48h", "health_96h", "health_168h"].includes(field)) missingFutureLabels++;
          continue;
        }
        if (!Number.isFinite(Number(raw))) {
          errors.push({ row, code: "INVALID_NUMBER", message: `${field} must be numeric when provided.` });
        }
      }

      const split = value("split");
      if (!["train", "validation", "test"].includes(split)) errors.push({ row, code: "INVALID_SPLIT", message: "split must be train, validation, or test." });
      const anomalyType = value("anomaly_type");
      if (!anomalyType) errors.push({ row, code: "MISSING_VALUE", message: "anomaly_type is required." });
      if (!value("degradation_pattern")) errors.push({ row, code: "MISSING_VALUE", message: "degradation_pattern is required." });
    }

    if (missingSensorValues > 0) warnings.push(`${missingSensorValues.toLocaleString()} optional sensor values are blank; these rows remain valid for ingestion.`);
    if (missingFutureLabels > 0) warnings.push(`${missingFutureLabels.toLocaleString()} future health labels are blank; this is expected near the end of each component's time series.`);
    if (components.size < 5) warnings.push("Insufficient component count for confident lot-relative analysis.");
    warnings.push(`ESS telemetry schema detected: ${components.size.toLocaleString()} components, ${rowCount.toLocaleString()} observations.`);
    return { valid: errors.length === 0, rowCount, errors, warnings };
  }

  const lines = csv.split(/\r?\n/).filter(line => line.trim().length > 0);
  const required = measurementRequired;
  const missing = required.filter(name => !header.includes(name));
  const unexpected = header.filter(name => !required.includes(name));
  missing.forEach(name => errors.push({ row: 1, code: "MISSING_COLUMN", message: `Required column missing: ${name}` }));
  unexpected.forEach(name => errors.push({ row: 1, code: "UNEXPECTED_COLUMN", message: `Unexpected column: ${name}` }));
  const seen = new Set<string>(); const checkpoints = new Map<string, Set<number>>();
  lines.slice(1).forEach((line, index) => {
    const row = index + 2; const values = line.split(",");
    if (values.length !== header.length) { errors.push({ row, code: "MALFORMED_ROW", message: "Column count does not match the header." }); return; }
    const record = Object.fromEntries(header.map((h, i) => [h, values[i]?.trim() ?? ""])); const key = `${record.component_id}|${record.checkpoint_hours}`;
    if (Object.values(record).some(v => !v)) errors.push({ row, code: "MISSING_VALUE", message: "Row contains a missing value." });
    if (seen.has(key)) errors.push({ row, code: "DUPLICATE", message: `Duplicate component/checkpoint pair: ${key}` }); seen.add(key);
    const hours = Number(record.checkpoint_hours); const value = Number(record.leakage_current);
    if (!Number.isFinite(hours) || hours < 0 || hours > 168) errors.push({ row, code: "INVALID_CHECKPOINT", message: "Checkpoint must be a finite value between 0h and 168h." });
    if (!Number.isFinite(value) || value < 0) errors.push({ row, code: "IMPOSSIBLE_MEASUREMENT", message: "Leakage current must be a non-negative number." });
    if (record.unit !== "µA" && record.unit !== "uA") errors.push({ row, code: "INCONSISTENT_UNIT", message: "Expected leakage-current unit µA/uA." });
    if (!checkpoints.has(record.component_id)) checkpoints.set(record.component_id, new Set()); checkpoints.get(record.component_id)!.add(hours);
  });
  checkpoints.forEach((points, component) => { if (!points.has(0) || !points.has(24)) errors.push({ row: 0, code: "MISSING_CHECKPOINT", message: `${component} is missing required 0h or 24h checkpoint.` }); });
  if (checkpoints.size < 5) warnings.push("Insufficient lot size for confident lot-relative analysis.");
  return { valid: errors.length === 0, rowCount: Math.max(0, lines.length - 1), errors, warnings };
}
