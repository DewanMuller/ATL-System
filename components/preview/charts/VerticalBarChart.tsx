"use client";

import { useState } from "react";

const HEIGHT = 200;

function niceMax(rawMax: number) {
  if (rawMax <= 0) return 1;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawMax)));
  const normalized = rawMax / magnitude;
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
}

export function VerticalBarChart({
  items,
}: {
  items: { label: string; value: number; color: string }[];
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const max = niceMax(Math.max(...items.map((i) => i.value), 1));
  // Quarter-fraction ticks round to duplicate values when max is small
  // (e.g. max=1 -> [0,0,1,1,1]) — real businesses with only a handful of
  // initiatives hit this immediately, so fall back to plain integer ticks
  // whenever the range is too small for quarters to stay distinct.
  const ticks = max <= 4 ? Array.from({ length: max + 1 }, (_, i) => i) : [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(max * f));

  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-2">
        <div
          className="flex w-9 shrink-0 flex-col justify-between py-0.5 text-right text-[10px] text-zinc-400"
          style={{ height: HEIGHT }}
        >
          {[...ticks].reverse().map((t) => (
            // Plain digits, no toLocaleString(): its thousands-separator
            // depends on the runtime's default locale, which can differ
            // between the server and the browser and cause a hydration
            // mismatch (e.g. "2,000" vs "2 000").
            <span key={t}>{t}</span>
          ))}
        </div>

        <div className="relative flex-1" style={{ height: HEIGHT }}>
          {ticks.map((t) => (
            <div
              key={t}
              className="absolute left-0 right-0 border-t border-zinc-100 dark:border-zinc-900"
              style={{ top: `${HEIGHT - (t / max) * HEIGHT}px` }}
            />
          ))}

          <div className="relative flex h-full items-end justify-around gap-4 px-2">
            {items.map((item) => {
              const barHeight = Math.max(2, (item.value / max) * HEIGHT);
              return (
                <div
                  key={item.label}
                  className="relative flex h-full flex-1 items-end justify-center"
                  onMouseEnter={() => setHovered(item.label)}
                  onMouseLeave={() => setHovered(null)}
                  onFocus={() => setHovered(item.label)}
                  onBlur={() => setHovered(null)}
                  tabIndex={0}
                >
                  {hovered === item.label && (
                    <div className="pointer-events-none absolute -top-2 z-10 -translate-y-full whitespace-nowrap rounded-md bg-zinc-900 px-2 py-1 text-xs text-white shadow-lg dark:bg-zinc-100 dark:text-zinc-900">
                      <span className="font-semibold">{item.value}</span> {item.label}
                    </div>
                  )}
                  <div
                    className="w-8 rounded-t-[4px]"
                    style={{ height: `${barHeight}px`, backgroundColor: item.color }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <div className="w-9 shrink-0" />
        <div className="flex flex-1 justify-around gap-4 px-2">
          {items.map((item) => (
            <span
              key={item.label}
              className="flex-1 text-center text-[10px] leading-tight text-zinc-500 dark:text-zinc-400"
            >
              {item.label}
            </span>
          ))}
        </div>
      </div>

      <details className="mt-1">
        <summary className="cursor-pointer text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">
          View as table
        </summary>
        <table className="mt-2 w-full text-left text-xs">
          <tbody>
            {items.map((item) => (
              <tr key={item.label} className="border-t border-black/5 dark:border-white/5">
                <td className="py-1 pr-4 text-zinc-700 dark:text-zinc-300">{item.label}</td>
                <td className="py-1 text-zinc-700 dark:text-zinc-300">{item.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
