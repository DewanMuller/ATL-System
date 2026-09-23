// Palette values straight from the dataviz skill's reference instance
// (references/palette.md) — categorical slots stay in the validated
// adjacent-pairlist order; status colors are the fixed, never-themed set.
export const CATEGORICAL = [
  { light: "#2a78d6", dark: "#3987e5" }, // 1 blue
  { light: "#eb6834", dark: "#d95926" }, // 2 orange
  { light: "#1baf7a", dark: "#199e70" }, // 3 aqua
  { light: "#eda100", dark: "#c98500" }, // 4 yellow
  { light: "#e87ba4", dark: "#d55181" }, // 5 magenta
  { light: "#008300", dark: "#008300" }, // 6 green
  { light: "#4a3aa7", dark: "#9085e9" }, // 7 violet
  { light: "#e34948", dark: "#e66767" }, // 8 red
] as const;

export const STATUS = {
  good: { light: "#0ca30c", dark: "#0ca30c" },
  warning: { light: "#fab219", dark: "#fab219" },
  serious: { light: "#ec835a", dark: "#ec835a" },
  critical: { light: "#d03b3b", dark: "#d03b3b" },
} as const;

export const INK = {
  primary: { light: "#0b0b0b", dark: "#ffffff" },
  secondary: { light: "#52514e", dark: "#c3c2b7" },
  muted: { light: "#898781", dark: "#898781" },
  gridline: { light: "#e1e0d9", dark: "#2c2c2a" },
  baseline: { light: "#c3c2b7", dark: "#383835" },
  surface: { light: "#fcfcfb", dark: "#1a1a19" },
} as const;

// Thresholds match the reference dashboard: a bare progress percentage is
// colored by how close it is to done, so a lone number still reads as
// "healthy / at risk / behind" without a separate RAG field. Named to match
// the real ATL RagStatus enum (RED/AMBER/GREEN) rather than introducing a
// second good/warning/critical vocabulary — one status naming scheme across
// every preview component, so nothing needs translating between them.
export type Rag = "GREEN" | "AMBER" | "RED";

export function ragForPercent(pct: number): Rag {
  if (pct >= 70) return "GREEN";
  if (pct >= 40) return "AMBER";
  return "RED";
}

const RAG_HEX: Record<Rag, string> = {
  GREEN: STATUS.good.light,
  AMBER: STATUS.warning.light,
  RED: STATUS.critical.light,
};

export function ragHex(status: Rag) {
  return RAG_HEX[status];
}

export function ragLabel(status: Rag | "NOT_STARTED"): string {
  const map = {
    GREEN: "Green",
    AMBER: "Amber",
    RED: "Red",
    NOT_STARTED: "Not Started",
  };
  return map[status];
}

export function ragBadgeClasses(status: Rag | "NOT_STARTED") {
  const map = {
    GREEN: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
    AMBER: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
    RED: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
    NOT_STARTED: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
  };
  return map[status];
}

// Tailwind's JIT scanner only picks up arbitrary-value classes that appear
// as literal, static text in source — it can't see values built by string
// interpolation at runtime. Since CATEGORICAL is a fixed, known-length
// palette (not arbitrary per-render data), each slot's light/dark pair is
// written out here literally so Tailwind compiles both. Wrap any container
// that uses CAT_VAR() in this className once; every descendant chart can
// then reference the slot by var() without redoing the dark-mode dance.
export const CATEGORICAL_SCOPE_CLASS =
  "[--cat-1:#2a78d6] dark:[--cat-1:#3987e5] " +
  "[--cat-2:#eb6834] dark:[--cat-2:#d95926] " +
  "[--cat-3:#1baf7a] dark:[--cat-3:#199e70] " +
  "[--cat-4:#eda100] dark:[--cat-4:#c98500] " +
  "[--cat-5:#e87ba4] dark:[--cat-5:#d55181] " +
  "[--cat-6:#008300] " +
  "[--cat-7:#4a3aa7] dark:[--cat-7:#9085e9] " +
  "[--cat-8:#e34948] dark:[--cat-8:#e66767]";

export function catVar(slot: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8) {
  return `var(--cat-${slot})`;
}
