import { LearnMoreButton } from "@/components/LearnMoreButton";
import { SUITE_LENSES } from "@/lib/suite-data";

const HUB_X = [150, 450, 750];
const HUB_Y = 80;
const HUB_R = 55;

export default function SuitePage() {
  return (
    <div className="flex flex-col gap-10">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          The BGC System
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-zinc-500 dark:text-zinc-400">
          Every rhythm, workshop, and assessment BGC runs sits under one of
          three lenses. Strategy sets the direction, Execution delivers it,
          and Culture sustains it — then the cycle resets every year. Pieces
          marked{" "}
          <span className="whitespace-nowrap">📊 In Above The Line</span> are
          tracked live in this tool.
        </p>
      </div>

      <svg
        viewBox="0 0 900 220"
        className="mx-auto h-auto w-full max-w-2xl text-zinc-300 dark:text-zinc-700"
        aria-hidden="true"
      >
        <defs>
          <marker
            id="suite-arrow"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M0,0 L10,5 L0,10 z" fill="currentColor" />
          </marker>
        </defs>

        <line
          x1={HUB_X[0] + HUB_R}
          y1={HUB_Y}
          x2={HUB_X[1] - HUB_R}
          y2={HUB_Y}
          stroke="currentColor"
          strokeWidth={2}
          markerEnd="url(#suite-arrow)"
        />
        <line
          x1={HUB_X[1] + HUB_R}
          y1={HUB_Y}
          x2={HUB_X[2] - HUB_R}
          y2={HUB_Y}
          stroke="currentColor"
          strokeWidth={2}
          markerEnd="url(#suite-arrow)"
        />
        <path
          d={`M ${HUB_X[2] - 20} ${HUB_Y + HUB_R - 10} Q ${HUB_X[1]} 210 ${
            HUB_X[0] + 20
          } ${HUB_Y + HUB_R - 10}`}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeDasharray="6 5"
          markerEnd="url(#suite-arrow)"
        />

        {SUITE_LENSES.map((lens, i) => (
          <a key={lens.id} href={`#${lens.id}`}>
            <circle cx={HUB_X[i]} cy={HUB_Y} r={HUB_R} fill={lens.color} />
            <text
              x={HUB_X[i]}
              y={HUB_Y + 6}
              textAnchor="middle"
              fill="white"
              fontSize="18"
              fontWeight="600"
            >
              {lens.name}
            </text>
          </a>
        ))}
      </svg>

      <div className="grid grid-cols-1 gap-8 pb-16 md:grid-cols-3">
        {SUITE_LENSES.map((lens) => (
          <section key={lens.id} id={lens.id} className="flex flex-col gap-4">
            <div
              className="rounded-xl p-4 text-white"
              style={{ backgroundColor: lens.color }}
            >
              <h2 className="text-base font-semibold">{lens.name}</h2>
              <p className="mt-0.5 text-xs opacity-90">{lens.tagline}</p>
            </div>

            <div className="flex flex-col gap-4">
              {lens.items.map((item) => (
                <div
                  key={item.id}
                  className="relative border-l-2 pl-4"
                  style={{ borderColor: lens.color }}
                >
                  <span
                    className="absolute top-1.5 -left-[5px] h-2 w-2 rounded-full"
                    style={{ backgroundColor: lens.color }}
                  />
                  <div className="rounded-lg border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-zinc-950">
                    <span
                      className="inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
                      style={{ backgroundColor: lens.color }}
                    >
                      {item.rhythm}
                    </span>
                    <h3 className="mt-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                      {item.name}
                    </h3>
                    <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                      {item.summary}
                    </p>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      {item.atlLink ? (
                        <span className="text-[10px] text-zinc-400">
                          📊 In Above The Line
                        </span>
                      ) : (
                        <span />
                      )}
                      <LearnMoreButton
                        name={item.name}
                        rhythm={item.rhythm}
                        description={item.description}
                        atlLink={item.atlLink}
                        accentColor={lens.color}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
