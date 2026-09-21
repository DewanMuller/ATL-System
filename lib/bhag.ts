// Progress of a metric's latest actual against a target value (e.g. its
// longest-horizon period, the "ultimate" BHAG number for that metric).
// Null — not zero — when either side is missing, so an unset metric
// doesn't silently read as 0% progress.
export function metricProgress(
  currentValue: number | null,
  targetValue: number | null
) {
  if (currentValue == null || targetValue == null || targetValue === 0) {
    return null;
  }
  return (currentValue / targetValue) * 100;
}

// The display text for a target cell: a note (e.g. "add 1 new = 3 in
// total") takes precedence when present, since it carries more context
// than the bare number; otherwise fall back to the plain value.
export function targetCellLabel(
  target: { value: number | null; note: string | null } | undefined,
  unit: string | null
) {
  if (!target) return null;
  if (target.note) return target.note;
  if (target.value == null) return null;
  return unit ? `${target.value} ${unit}` : String(target.value);
}
