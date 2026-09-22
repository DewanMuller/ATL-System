"use client";

import { useState } from "react";

export type DonutSegment = { label: string; value: number; color: string };

const SIZE = 180;
const CENTER = SIZE / 2;
const OUTER_R = 78;
const INNER_R = 48;
const GAP_DEG = 2.5;

// Rounded to a fixed precision so the SSR and client renders always emit
// byte-identical path strings — Math.sin/cos can differ in their last bit
// between server (Node/V8) and client (browser) engines, which otherwise
// shows up as a React hydration mismatch on the raw path text.
function round(n: number) {
  return Math.round(n * 100) / 100;
}

function polar(angleDeg: number, r: number) {
  const rad = (angleDeg - 90) * (Math.PI / 180);
  return [round(CENTER + r * Math.cos(rad)), round(CENTER + r * Math.sin(rad))];
}

function wedgePath(startDeg: number, endDeg: number) {
  const largeArc = endDeg - startDeg > 180 ? 1 : 0;
  const [ox0, oy0] = polar(startDeg, OUTER_R);
  const [ox1, oy1] = polar(endDeg, OUTER_R);
  const [ix1, iy1] = polar(endDeg, INNER_R);
  const [ix0, iy0] = polar(startDeg, INNER_R);
  return [
    `M ${ox0} ${oy0}`,
    `A ${OUTER_R} ${OUTER_R} 0 ${largeArc} 1 ${ox1} ${oy1}`,
    `L ${ix1} ${iy1}`,
    `A ${INNER_R} ${INNER_R} 0 ${largeArc} 0 ${ix0} ${iy0}`,
    "Z",
  ].join(" ");
}

export function DonutChart({
  segments,
  centerCallout,
}: {
  segments: DonutSegment[];
  centerCallout?: { label: string; value: string };
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const total = segments.reduce((sum, s) => sum + s.value, 0);

  if (total === 0) {
    return <p className="text-sm text-zinc-500 dark:text-zinc-400">No data yet.</p>;
  }

  const wedges = segments.map((s, i) => {
    const priorValue = segments.slice(0, i).reduce((sum, seg) => sum + seg.value, 0);
    const cursor = (priorValue / total) * 360;
    const sweep = (s.value / total) * 360;
    const start = cursor + (sweep > 0 ? GAP_DEG / 2 : 0);
    const end = cursor + sweep - (sweep > 0 ? GAP_DEG / 2 : 0);
    return { ...s, index: i, path: wedgePath(Math.min(start, end), Math.max(start, end)) };
  });

  return (
    <div>
      <div className="relative mx-auto" style={{ width: SIZE, height: SIZE }}>
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="h-full w-full">
          {wedges.map((w) => (
            <path
              key={w.label}
              d={w.path}
              fill={w.color}
              opacity={hovered === null || hovered === w.index ? 1 : 0.35}
              onMouseEnter={() => setHovered(w.index)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered(w.index)}
              onBlur={() => setHovered(null)}
              tabIndex={0}
              className="cursor-pointer outline-none"
            />
          ))}
        </svg>

        {centerCallout && (
          <div className="pointer-events-none absolute left-1/2 top-1/2 w-max -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-lg border border-black/10 bg-white px-3 py-1.5 text-center shadow-sm dark:border-white/10 dark:bg-zinc-900">
            <p className="text-[10px] text-zinc-500 dark:text-zinc-400">{centerCallout.label}</p>
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              {centerCallout.value}
            </p>
          </div>
        )}

        {hovered !== null && (
          <div className="pointer-events-none absolute -top-2 left-1/2 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md bg-zinc-900 px-2 py-1 text-xs text-white shadow-lg dark:bg-zinc-100 dark:text-zinc-900">
            <span className="font-semibold">{wedges[hovered].value}</span>{" "}
            {wedges[hovered].label}
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-xs text-zinc-500 dark:text-zinc-400">
        {segments.map((s) => (
          <span key={s.label} className="flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: s.color }}
            />
            {s.label}
          </span>
        ))}
      </div>

      <details className="mt-2 text-center">
        <summary className="cursor-pointer text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">
          View as table
        </summary>
        <table className="mx-auto mt-2 text-left text-xs">
          <tbody>
            {segments.map((s) => (
              <tr key={s.label} className="border-t border-black/5 dark:border-white/5">
                <td className="py-1 pr-4 text-zinc-700 dark:text-zinc-300">{s.label}</td>
                <td className="py-1 text-zinc-700 dark:text-zinc-300">{s.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
