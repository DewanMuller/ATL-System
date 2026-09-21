"use client";

import { useState } from "react";

export function ObjectiveProgressChart({
  items,
  emptyMessage = "No objectives yet.",
}: {
  items: { id: string; label: string; value: number | null }[];
  emptyMessage?: string;
}) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  if (items.length === 0) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="[--chart-blue-track:#e1e0d9] [--chart-blue:#2a78d6] dark:[--chart-blue-track:#2c2c2a] dark:[--chart-blue:#3987e5]">
      <div className="flex flex-col gap-3">
        {items.map((item) => {
          if (item.value == null) {
            return (
              <div key={item.id} className="relative">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="truncate text-xs text-zinc-600 dark:text-zinc-300">
                    {item.label}
                  </span>
                  <span className="text-xs text-zinc-400">Not scored yet</span>
                </div>
                <div className="h-6 w-full rounded-r-[4px] border border-dashed border-zinc-300 dark:border-zinc-700" />
              </div>
            );
          }

          const pct = Math.max(0, Math.min(100, item.value));
          const labelFits = pct >= 15;
          return (
            <div
              key={item.id}
              className="relative"
              onMouseEnter={() => setHoveredId(item.id)}
              onMouseLeave={() => setHoveredId(null)}
              onFocus={() => setHoveredId(item.id)}
              onBlur={() => setHoveredId(null)}
              tabIndex={0}
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="truncate text-xs text-zinc-600 dark:text-zinc-300">
                  {item.label}
                </span>
                {!labelFits && (
                  <span className="text-xs font-medium text-zinc-700 dark:text-zinc-200">
                    {Math.round(pct)}%
                  </span>
                )}
              </div>
              <div className="h-6 w-full bg-[var(--chart-blue-track)]">
                <div
                  className="flex h-6 items-center rounded-r-[4px] bg-[var(--chart-blue)] px-2"
                  style={{ width: `${pct}%` }}
                >
                  {labelFits && (
                    <span className="text-xs font-medium text-white">
                      {Math.round(pct)}%
                    </span>
                  )}
                </div>
              </div>
              {hoveredId === item.id && (
                <div className="pointer-events-none absolute -top-8 left-0 z-10 max-w-xs truncate rounded-md bg-zinc-900 px-2 py-1 text-xs text-white shadow-lg dark:bg-zinc-100 dark:text-zinc-900">
                  <span className="font-semibold">{Math.round(pct)}%</span>
                  {" — "}
                  {item.label}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <details className="mt-3">
        <summary className="cursor-pointer text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">
          View as table
        </summary>
        <table className="mt-2 w-full text-left text-xs">
          <thead>
            <tr className="text-zinc-500 dark:text-zinc-400">
              <th className="py-1 pr-2 font-medium">Objective</th>
              <th className="py-1 font-medium">Score</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr
                key={item.id}
                className="border-t border-black/5 dark:border-white/5"
              >
                <td className="py-1 pr-2 text-zinc-700 dark:text-zinc-300">
                  {item.label}
                </td>
                <td className="py-1 text-zinc-700 dark:text-zinc-300">
                  {item.value != null ? `${Math.round(item.value)}%` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
