import type { MeasureType } from "@prisma/client";

// How an Initiative's or Key Result's outcomePercent is derived from its
// structured measurement fields. For MANUAL, the reported value *is* the
// percent (clamped 0-100) — this only applies where the caller explicitly
// feeds a reported currentValue through it (WRAP); the OKR planner's
// OutcomeEditor still writes outcomePercent directly for MANUAL without
// going through here, since there's nothing to compute from a single typed
// percent.
export function computeOutcomePercent({
  measureType,
  startValue,
  targetValue,
  currentValue,
}: {
  measureType: MeasureType;
  startValue: number | null;
  targetValue: number | null;
  currentValue: number | null;
}): number | null {
  if (measureType === "MANUAL") {
    return currentValue == null ? null : Math.max(0, Math.min(100, currentValue));
  }

  if (measureType === "BINARY") {
    if (currentValue == null) return null;
    return currentValue >= 1 ? 100 : 0;
  }

  // NUMERIC
  if (currentValue == null || targetValue == null) return null;
  const start = startValue ?? 0;
  if (targetValue === start) return currentValue >= targetValue ? 100 : 0;
  const pct = ((currentValue - start) / (targetValue - start)) * 100;
  return Math.max(0, Math.min(100, pct));
}

// A short human-readable rendering of the current measurement, e.g.
// "17 / 100 tons", "Done", "Not done", or "—" when there's nothing to show.
export function formatMeasureValue({
  measureType,
  currentValue,
  targetValue,
  unit,
}: {
  measureType: MeasureType;
  currentValue: number | null;
  targetValue: number | null;
  unit: string | null;
}): string {
  if (measureType === "BINARY") {
    if (currentValue == null) return "Not started";
    return currentValue >= 1 ? "Done" : "Not done";
  }
  if (measureType === "NUMERIC") {
    if (currentValue == null && targetValue == null) return "—";
    const unitSuffix = unit ? ` ${unit}` : "";
    const current = currentValue != null ? formatNumber(currentValue) : "0";
    const target = targetValue != null ? ` / ${formatNumber(targetValue)}${unitSuffix}` : unitSuffix;
    return `${current}${target}`;
  }
  // MANUAL
  return currentValue != null ? `${formatNumber(currentValue)}%` : "—";
}

function formatNumber(n: number) {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}
