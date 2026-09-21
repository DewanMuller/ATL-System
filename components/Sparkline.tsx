const WIDTH = 100;
const HEIGHT = 28;

export function Sparkline({ values }: { values: number[] }) {
  if (values.length === 0) return null;

  const points =
    values.length === 1
      ? [
          [0, HEIGHT - (values[0] / 100) * HEIGHT],
          [WIDTH, HEIGHT - (values[0] / 100) * HEIGHT],
        ]
      : values.map((v, i) => [
          (i / (values.length - 1)) * WIDTH,
          HEIGHT - (Math.max(0, Math.min(100, v)) / 100) * HEIGHT,
        ]);

  const pointsAttr = points.map(([x, y]) => `${x},${y}`).join(" ");

  return (
    <svg
      width={WIDTH}
      height={HEIGHT}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="shrink-0 overflow-visible text-zinc-400 dark:text-zinc-500"
    >
      <polyline
        points={pointsAttr}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
