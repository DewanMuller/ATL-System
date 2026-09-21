import { ragForPercent, ragHex, type Rag } from "./colors";

// A thin, threshold-colored progress bar — used for the Team Training
// widget, BHAG sub-metrics, and Winning Move cards. `status` overrides the
// percentage-derived color when the value already carries an explicit RAG
// (e.g. a Winning Move's own status field), matching how ATL treats
// explicit status vs. derived score elsewhere.
export function RagBar({
  value,
  status,
  trackClassName = "bg-zinc-200 dark:bg-zinc-800",
}: {
  value: number;
  status?: Rag;
  trackClassName?: string;
}) {
  const pct = Math.max(0, Math.min(100, value));
  const resolved = status ?? ragForPercent(pct);

  return (
    <div
      className={`h-1.5 w-full overflow-hidden rounded-full ${trackClassName}`}
    >
      <div
        className="h-full rounded-full"
        style={{ width: `${pct}%`, backgroundColor: ragHex(resolved) }}
      />
    </div>
  );
}
