import type { MeasureType } from "@prisma/client";

// How an Initiative's or Key Result's outcomePercent is derived from its
// structured measurement fields. MANUAL has no computed value — the caller
// keeps using the hand-typed outcomePercent exactly as before.
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
  if (measureType === "MANUAL") return null;

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
  return "—";
}

function formatNumber(n: number) {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}
