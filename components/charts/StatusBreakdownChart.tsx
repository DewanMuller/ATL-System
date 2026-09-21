"use client";

import { useState } from "react";

const STATUS_ORDER = ["green", "amber", "red"] as const;
type StatusKey = (typeof STATUS_ORDER)[number];

const STATUS_META: Record<StatusKey, { label: string; color: string }> = {
  green: { label: "Green", color: "var(--status-good)" },
  amber: { label: "Amber", color: "var(--status-warning)" },
  red: { label: "Red", color: "var(--status-critical)" },
};

export function StatusBreakdownChart({
  title,
  counts,
}: {
  title: string;
  counts: { green: number; amber: number; red: number };
}) {
  const [hovered, setHovered] = useState<StatusKey | null>(null);
  const total = counts.green + counts.amber + counts.red;

  return (
    <div className="flex flex-col gap-2 [--status-critical:#d03b3b] [--status-good:#0ca30c] [--status-warning:#fab219]">
      <p className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
        {title}
      </p>
      {total === 0 ? (
        <p className="text-xs text-zinc-400">Nothing tracked yet.</p>
      ) : (
        <>
          <div className="flex h-6 w-full gap-0.5">
            {STATUS_ORDER.map((key) => {
              const count = counts[key];
              if (count === 0) return null;
              const pct = (count / total) * 100;
              const meta = STATUS_META[key];
              const showInline = pct >= 12;
              return (
                <div
                  key={key}
                  className="relative h-6 first:rounded-l-[4px] last:rounded-r-[4px]"
                  style={{ width: `${pct}%`, backgroundColor: meta.color }}
                  onMouseEnter={() => setHovered(key)}
                  onMouseLeave={() => setHovered(null)}
                  onFocus={() => setHovered(key)}
                  onBlur={() => setHovered(null)}
                  tabIndex={0}
                >
                  {showInline && (
                    <span className="flex h-full items-center justify-center text-xs font-medium text-white">
                      {count}
                    </span>
                  )}
                  {hovered === key && (
                    <div className="pointer-events-none absolute -top-8 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-md bg-zinc-900 px-2 py-1 text-xs text-white shadow-lg dark:bg-zinc-100 dark:text-zinc-900">
                      <span className="font-semibold">{count}</span>{" "}
                      {meta.label} ({Math.round(pct)}%)
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
            {STATUS_ORDER.map((key) => (
              <span key={key} className="flex items-center gap-1">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: STATUS_META[key].color }}
                />
                {STATUS_META[key].label} ({counts[key]})
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
