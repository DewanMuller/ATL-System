"use client";

import { useState } from "react";
import { ChartDataTable } from "./ChartDataTable";

export function HorizontalBarChart({
  items,
  max = 100,
  valueSuffix = "%",
}: {
  items: { label: string; value: number; color: string }[];
  max?: number;
  valueSuffix?: string;
}) {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-3">
      {items.map((item) => {
        const pct = Math.max(0, Math.min(100, (item.value / max) * 100));
        return (
          <div
            key={item.label}
            className="flex items-center gap-3"
            onMouseEnter={() => setHovered(item.label)}
            onMouseLeave={() => setHovered(null)}
            onFocus={() => setHovered(item.label)}
            onBlur={() => setHovered(null)}
            tabIndex={0}
          >
            <span className="w-20 shrink-0 truncate text-xs text-zinc-600 dark:text-zinc-300">
              {item.label}
            </span>
            <div className="relative h-3 flex-1 rounded-full bg-zinc-100 dark:bg-zinc-900">
              <div
                className="h-3 rounded-full"
                style={{ width: `${pct}%`, backgroundColor: item.color }}
              />
              {hovered === item.label && (
                <div
                  className="pointer-events-none absolute -top-8 z-10 -translate-x-1/2 whitespace-nowrap rounded-md bg-zinc-900 px-2 py-1 text-xs text-white shadow-lg dark:bg-zinc-100 dark:text-zinc-900"
                  style={{ left: `${pct}%` }}
                >
                  {item.value}
                  {valueSuffix} — {item.label}
                </div>
              )}
            </div>
            <span className="w-10 shrink-0 text-right text-xs font-medium text-zinc-700 dark:text-zinc-300">
              {item.value}
              {valueSuffix}
            </span>
          </div>
        );
      })}

      <div className="mt-1 flex justify-between border-t border-zinc-100 pt-1 text-[10px] text-zinc-400 dark:border-zinc-900">
        <span>0{valueSuffix}</span>
        <span>{Math.round(max / 2)}{valueSuffix}</span>
        <span>{max}{valueSuffix}</span>
      </div>

      <ChartDataTable items={items.map((item) => ({ label: item.label, value: `${item.value}${valueSuffix}` }))} />
    </div>
  );
}
