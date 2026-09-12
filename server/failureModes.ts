import type { Point } from "./reliability";

export type FailureMode =
  | "WEAR_OUT"
  | "INFANT_MORTALITY"
  | "PARAMETRIC_DRIFT"
  | "THERMAL_RUNAWAY"
  | "ELECTROMIGRATION"
  | "RANDOM_CATASTROPHIC"
  | "UNKNOWN";

export type FailureModeAnalysis = {
  detectedMode: FailureMode;
  confidence: number;
  description: string;
  predictedBehavior: string;
};

/**
 * Detects failure mode signature from measurement trajectory.
 * Analyzes patterns in the time-series data to classify the type of failure.
 */
export function analyzeFailureMode(points: Point[], slope: number | null, anomalyScore: number | null, predicted168h: number | null, safetyBoundary: number, initial: number | null): FailureModeAnalysis {
  if (!points.length || initial === null || slope === null) {
    return {
      detectedMode: "UNKNOWN",
      confidence: 0,
      description: "Insufficient data for failure mode detection.",
      predictedBehavior: "Unable to classify."
    };
  }

  const ordered = [...points].sort((a, b) => a.checkpointHours - b.checkpointHours);
  const first = ordered[0]?.value ?? null;
  const at24 = ordered.find(p => p.checkpointHours === 24)?.value ?? null;
  const at48 = ordered.find(p => p.checkpointHours === 48)?.value ?? null;
  const at96 = ordered.find(p => p.checkpointHours === 96)?.value ?? null;
  const at168 = ordered.find(p => p.checkpointHours === 168)?.value ?? null;

  // Calculate statistics for pattern detection
  const earlyDrift = at24 != null && first != null ? at24 - first : 0;
  const earlyDriftPct = first != null ? (earlyDrift / Math.max(Math.abs(first), 0.0001)) * 100 : 0;

  // Estimate acceleration by looking at slope change
  const slopeEarly = at24 != null && first != null ? (at24 - first) / 24 : 0;
  const slopeMiddle = at96 != null && at24 != null ? (at96 - at24) / 72 : slopeEarly;
  const acceleration = Math.abs(slopeMiddle - slopeEarly);

  // Distance to boundary
  const distanceToBoundary = predicted168h != null ? safetyBoundary - predicted168h : null;
  const willCross = distanceToBoundary != null && distanceToBoundary < 0;
  const critical = distanceToBoundary != null && distanceToBoundary < safetyBoundary * 0.05;

  // Pattern detection scores
  const wearOutScore = detectWearOut(slopeEarly, slopeMiddle, acceleration, slope);
  const infantMortalityScore = detectInfantMortality(earlyDriftPct, slopeEarly, slopeMiddle);
  const parametricDriftScore = detectParametricDrift(slope, willCross, anomalyScore ?? 0);
  const thermalRunawayScore = detectThermalRunaway(acceleration, slope, slopeMiddle, critical);
  const electromigrationScore = detectElectromigration(slopeEarly, slopeMiddle, predicted168h, safetyBoundary);
  const randomCatastrophicScore = detectRandomCatastrophic(earlyDriftPct, anomalyScore ?? 0);

  // Find dominant pattern
  const scores = {
    WEAR_OUT: wearOutScore,
    INFANT_MORTALITY: infantMortalityScore,
    PARAMETRIC_DRIFT: parametricDriftScore,
    THERMAL_RUNAWAY: thermalRunawayScore,
    ELECTROMIGRATION: electromigrationScore,
    RANDOM_CATASTROPHIC: randomCatastrophicScore,
  };

  const [detectedMode, confidence] = Object.entries(scores)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 1)
    .map(([mode, conf]) => [mode as FailureMode, conf] as const)[0] ?? ["UNKNOWN", 0];

  if (confidence < 20) {
    return {
      detectedMode: "UNKNOWN",
      confidence,
      description: "No clear failure mode signature detected.",
      predictedBehavior: "Pattern is ambiguous or inconsistent with known signatures."
    };
  }

  const description = getFailureModeDescription(detectedMode);
  const predictedBehavior = getPredictedBehavior(detectedMode, slope, predicted168h, safetyBoundary, at168);

  return {
    detectedMode,
    confidence: Math.round(confidence * 10) / 10,
    description,
    predictedBehavior,
  };
}

function detectWearOut(slopeEarly: number, slopeMiddle: number, acceleration: number, slope: number): number {
  let score = 0;

  // Wear-out shows steady, monotonic increase with possible acceleration
  if (slope > 0.05) score += 25;
  if (slope > 0.2) score += 15;

  // Increasing slope over time (acceleration pattern)
  if (acceleration > 0.02) score += 30;
  if (slopeMiddle > slopeEarly * 1.2) score += 20;

  // Smooth, predictable pattern (low anomaly would help)
  return Math.min(100, score);
}

function detectInfantMortality(earlyDriftPct: number, slopeEarly: number, slopeMiddle: number): number {
  let score = 0;

  // Early spike in first 24h
  if (earlyDriftPct > 20) score += 35;
  if (earlyDriftPct > 40) score += 20;

  // Then stabilization (slope decreases significantly)
  if (slopeMiddle < slopeEarly * 0.3) score += 30;
  if (slopeMiddle < 0.05) score += 15;

  return Math.min(100, score);
}

function detectParametricDrift(slope: number, willCross: boolean, anomalyScore: number): number {
  let score = 0;

  // Steady linear drift
  if (slope > 0.05 && slope < 0.3) score += 30;

  // Heading toward boundary
  if (willCross) score += 35;

  // Consistent (low anomaly means stable pattern)
  if (anomalyScore < 40) score += 20;

  return Math.min(100, score);
}

function detectThermalRunaway(acceleration: number, slope: number, slopeMiddle: number, critical: boolean): number {
  let score = 0;

  // Exponential-like acceleration
  if (acceleration > 0.05) score += 40;
  if (slopeMiddle > slope * 1.5) score += 25;

  // Rapid increase
  if (slope > 0.3) score += 20;

  // Critical proximity
  if (critical) score += 15;

  return Math.min(100, score);
}

function detectElectromigration(slopeEarly: number, slopeMiddle: number, predicted168h: number | null, safetyBoundary: number): number {
  let score = 0;

  // Gradual, steady increase
  if (slopeEarly > 0.08 && slopeEarly < 0.25) score += 25;

  // Consistent slope (not accelerating wildly)
  if (Math.abs(slopeMiddle - slopeEarly) < slopeEarly * 0.4) score += 20;

  // Will eventually cross (characteristic of long-term degradation)
  if (predicted168h != null && predicted168h > safetyBoundary * 0.8) score += 30;

  return Math.min(100, score);
}

function detectRandomCatastrophic(earlyDriftPct: number, anomalyScore: number): number {
  let score = 0;

  // Sudden, large jump
  if (Math.abs(earlyDriftPct) > 50) score += 35;

  // Anomalous (doesn't match peers)
  if (anomalyScore > 60) score += 40;

  // Unpredictable pattern
  if (anomalyScore > 80) score += 15;

  return Math.min(100, score);
}

function getFailureModeDescription(mode: FailureMode): string {
  switch (mode) {
    case "WEAR_OUT":
      return "Characteristic wear-out failure pattern — gradual degradation with possible acceleration over time.";
    case "INFANT_MORTALITY":
      return "Infant mortality signature — early spike followed by stabilization.";
    case "PARAMETRIC_DRIFT":
      return "Parametric drift — steady creep toward specification limit.";
    case "THERMAL_RUNAWAY":
      return "Potential thermal runaway — accelerating degradation pattern indicating thermal feedback.";
    case "ELECTROMIGRATION":
      return "Electromigration pattern — gradual current increase consistent with atomic migration under stress.";
    case "RANDOM_CATASTROPHIC":
      return "Random catastrophic failure — sudden, unpredictable change inconsistent with peers.";
    case "UNKNOWN":
    default:
      return "Undefined failure mechanism.";
  }
}

function getPredictedBehavior(mode: FailureMode, slope: number | null, predicted168h: number | null, safetyBoundary: number, at168: number | null): string {
  if (slope === null) return "Unable to extrapolate without slope data.";

  const hoursToBoundary = predicted168h != null && slope > 0.001
    ? (safetyBoundary - (predicted168h - slope * 168)) / slope
    : null;

  switch (mode) {
    case "WEAR_OUT":
      return `If trend continues, expect continued gradual degradation${hoursToBoundary ? ` — boundary crossing predicted around hour ${Math.round(hoursToBoundary)}h` : ""}.`;
    case "INFANT_MORTALITY":
      return `Expects stabilization after initial burn-in period. If it has not stabilized, investigate for stuck-at or parametric defect.`;
    case "PARAMETRIC_DRIFT":
      return `Steady drift toward specification limit${hoursToBoundary ? ` — estimated boundary crossing at hour ${Math.round(hoursToBoundary)}h` : ""}.`;
    case "THERMAL_RUNAWAY":
      return `Accelerating behavior suggests thermal feedback loop. Risk of rapid failure if thermal conditions persist.`;
    case "ELECTROMIGRATION":
      return `Long-term degradation characteristic of atomic migration. Will eventually exceed boundary under continued stress.`;
    case "RANDOM_CATASTROPHIC":
      return `Sudden change suggests physical failure event (bond wire break, junction defect). Behavior is unpredictable without design change.`;
    case "UNKNOWN":
    default:
      return "Trajectory does not match known failure signatures.";
  }
}
