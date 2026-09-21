"use client";

import { useState } from "react";

// Fixed categorical order, assigned by Lead — never re-cycled when the row
// set changes, so the same person keeps the same color across reloads.
const PALETTE = [
  "#4269d0",
  "#efb118",
  "#ff725c",
  "#6cc5b0",
  "#3ca951",
  "#ff8ab7",
  "#a463f2",
  "#97bbf5",
  "#9c6b4e",
  "#9498a0",
];

export type TimelineMonth = { key: string; label: string; widthPct: number };

export type TimelineInitiative = {
  id: string;
  name: string;
  leftPct: number;
  responsibleLabel: string;
  dueDateLabel: string;
  afterObjectiveEnd: boolean;
};

export type TimelineRow = {
  id: string;
  code: string | null;
  title: string;
  leadLabel: string;
  colorIndex: number;
  leftPct: number;
  widthPct: number;
  periodLabel: string;
  scoreLabel: string;
  initiatives: TimelineInitiative[];
};

export type TimelineLegendEntry = { label: string; colorIndex: number };

export function Timeline({
  months,
  rows,
  legend,
  todayLeftPct,
}: {
  months: TimelineMonth[];
  rows: TimelineRow[];
  legend: TimelineLegendEntry[];
  todayLeftPct: number | null;
}) {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-zinc-500 dark:text-zinc-400">
        {legend.map((entry) => (
          <span key={entry.label} className="flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: PALETTE[entry.colorIndex % PALETTE.length] }}
            />
            {entry.label}
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rotate-45 bg-zinc-500" />
          Initiative due date
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rotate-45 bg-red-500" />
          Due after objective&apos;s period ends
        </span>
        {todayLeftPct != null && (
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-0.5 bg-red-400" />
            Today
          </span>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-black/10 dark:border-white/10">
        <div style={{ minWidth: `${Math.max(months.length * 90, 640)}px` }}>
          <div className="flex border-b border-black/10 bg-zinc-50 dark:border-white/10 dark:bg-zinc-900">
            <div className="sticky left-0 z-10 w-56 shrink-0 border-r border-black/10 bg-zinc-50 px-3 py-2 text-xs font-medium text-zinc-500 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-400">
              Objective
            </div>
            <div className="relative flex flex-1">
              {months.map((m) => (
                <div
                  key={m.key}
                  style={{ width: `${m.widthPct}%` }}
                  className="shrink-0 border-l border-black/5 px-2 py-2 text-xs text-zinc-500 first:border-l-0 dark:border-white/5 dark:text-zinc-400"
                >
                  {m.label}
                </div>
              ))}
            </div>
          </div>

          {rows.map((row) => {
            const rowMinHeight = 44 + row.initiatives.length * 18;
            const color = PALETTE[row.colorIndex % PALETTE.length];
            return (
              <div
                key={row.id}
                className="flex border-b border-black/10 last:border-b-0 dark:border-white/10"
              >
                <div
                  className="sticky left-0 z-10 w-56 shrink-0 border-r border-black/10 bg-white px-3 py-2 dark:border-white/10 dark:bg-zinc-950"
                  style={{ minHeight: `${rowMinHeight}px` }}
                >
                  <p className="text-xs font-medium text-zinc-800 dark:text-zinc-200">
                    {row.code && (
                      <span className="mr-1.5 rounded bg-zinc-100 px-1 py-0.5 font-mono text-[10px] font-medium text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
                        {row.code}
                      </span>
                    )}
                    {row.title}
                  </p>
                  <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                    {row.leadLabel} · {row.periodLabel}
                    {row.scoreLabel && ` · ${row.scoreLabel}`}
                  </p>
                </div>
                <div
                  className="relative flex-1"
                  style={{ minHeight: `${rowMinHeight}px` }}
                >
                  <div className="absolute inset-0 flex">
                    {months.map((m) => (
                      <div
                        key={m.key}
                        style={{ width: `${m.widthPct}%` }}
                        className="shrink-0 border-l border-dashed border-black/5 first:border-l-0 dark:border-white/5"
                      />
                    ))}
                  </div>

                  {todayLeftPct != null && (
                    <div
                      className="absolute top-0 bottom-0 w-px bg-red-400"
                      style={{ left: `${todayLeftPct}%` }}
                    />
                  )}

                  <div
                    onMouseEnter={() => setHovered(row.id)}
                    onMouseLeave={() => setHovered(null)}
                    onFocus={() => setHovered(row.id)}
                    onBlur={() => setHovered(null)}
                    tabIndex={0}
                    className="absolute top-2.5 h-3 min-w-[6px] rounded-full"
                    style={{
                      left: `${row.leftPct}%`,
                      width: `${Math.max(row.widthPct, 1)}%`,
                      backgroundColor: color,
                    }}
                  />
                  {hovered === row.id && (
                    <div
                      className="pointer-events-none absolute -top-8 z-20 max-w-xs whitespace-nowrap rounded-md bg-zinc-900 px-2 py-1 text-xs text-white shadow-lg dark:bg-zinc-100 dark:text-zinc-900"
                      style={{ left: `${row.leftPct}%` }}
                    >
                      {row.title} — {row.periodLabel}
                    </div>
                  )}

                  {row.initiatives.map((init, i) => (
                    <div
                      key={init.id}
                      onMouseEnter={() => setHovered(init.id)}
                      onMouseLeave={() => setHovered(null)}
                      onFocus={() => setHovered(init.id)}
                      onBlur={() => setHovered(null)}
                      tabIndex={0}
                      className="absolute"
                      style={{ left: `${init.leftPct}%`, top: `${26 + i * 18}px` }}
                    >
                      <div
                        className={`h-2 w-2 -translate-x-1/2 rotate-45 ${
                          init.afterObjectiveEnd ? "bg-red-500" : "bg-zinc-500"
                        }`}
                      />
                      {hovered === init.id && (
                        <div className="pointer-events-none absolute -top-8 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-md bg-zinc-900 px-2 py-1 text-xs text-white shadow-lg dark:bg-zinc-100 dark:text-zinc-900">
                          {init.name} — due {init.dueDateLabel}
                          {init.afterObjectiveEnd && " ⚠ after objective ends"}
                          <br />
                          {init.responsibleLabel}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
