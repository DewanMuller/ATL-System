// BGC's real Level-1 MRAP template scale (see the "Emotional Wellbeing
// Check-in" section) — 0–10 with 6 bands, not an invented 1–5 scale. "In
// Crisis" at 0 is a real, distinct alarm state that a narrower scale would
// hide. Single source of truth: WRAP, MRAP, QRAP, the dashboard, and the
// Rolling Performance Report all read from this instead of each keeping
// their own copy (they previously drifted — three separate 1–5 labels).
export const WELLBEING_MIN = 0;
export const WELLBEING_MAX = 10;

type WellbeingBand = {
  min: number;
  max: number;
  label: string;
  pillClass: string;
};

export const WELLBEING_BANDS: readonly WellbeingBand[] = [
  { min: 9, max: 10, label: "Excelling", pillClass: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300" },
  { min: 7, max: 8, label: "Thriving", pillClass: "bg-lime-100 text-lime-800 dark:bg-lime-900/40 dark:text-lime-300" },
  { min: 5, max: 6, label: "Coping", pillClass: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300" },
  { min: 3, max: 4, label: "Unsettled", pillClass: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300" },
  { min: 1, max: 2, label: "Struggling", pillClass: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300" },
  { min: 0, max: 0, label: "In Crisis", pillClass: "bg-red-200 text-red-900 dark:bg-red-950/60 dark:text-red-200" },
];

function bandFor(score: number): WellbeingBand {
  return WELLBEING_BANDS.find((b) => score >= b.min && score <= b.max) ?? WELLBEING_BANDS[WELLBEING_BANDS.length - 1];
}

export function wellbeingLabel(score: number): string {
  return bandFor(score).label;
}

export function wellbeingPillClass(score: number): string {
  return bandFor(score).pillClass;
}

// For RAG bars and charts built around a 0–100 scale.
export function wellbeingAsPercent(score: number): number {
  return (score / WELLBEING_MAX) * 100;
}
