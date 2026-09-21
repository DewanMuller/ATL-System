// Objectives store their period as a free-typed periodType + periodValue pair
// (see schema comment on Objective) rather than explicit start/end dates —
// this turns that pair into a concrete date range for the timeline view.
// Tolerant of the formats already in real data ("2026", "Q4 2026") as well
// as the form's own placeholder format ("2026-Q1"), since the value is
// free text and different businesses have typed it differently.
export type DateRange = { start: Date; end: Date };

export function parsePeriod(
  periodType: string,
  periodValue: string
): DateRange | null {
  const yearMatch = periodValue.match(/(\d{4})/);
  if (!yearMatch) return null;
  const year = Number(yearMatch[1]);

  if (periodType === "YEAR") {
    return {
      start: new Date(year, 0, 1),
      end: new Date(year, 11, 31, 23, 59, 59),
    };
  }

  if (periodType === "QUARTER") {
    const quarterMatch = periodValue.match(/Q\s*([1-4])/i);
    if (!quarterMatch) return null;
    const quarter = Number(quarterMatch[1]);
    const startMonth = (quarter - 1) * 3;
    return {
      start: new Date(year, startMonth, 1),
      end: new Date(year, startMonth + 3, 0, 23, 59, 59),
    };
  }

  return null;
}
