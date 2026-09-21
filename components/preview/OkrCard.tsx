import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { Avatar } from "./Avatar";
import { ragForPercent, ragHex, ragBadgeClasses, type Rag } from "./colors";

export type OkrCardKeyResult = {
  id: string;
  metric: string;
  target: string;
  outcomePercent: number | null;
};

export type OkrCardData = {
  id: string;
  code: string | null;
  title: string;
  score: number | null;
  alignedTo: string | null;
  department: string;
  owner: { initials: string; name: string };
  initiativeCount: number;
  overdueCount: number;
  dueSoonCount: number;
  keyResults: OkrCardKeyResult[];
};

function ragLabel(status: Rag) {
  return status === "GREEN" ? "Green" : status === "AMBER" ? "Amber" : "Red";
}

export function OkrCard({ okr, basePath = "/preview/okr-workspace" }: { okr: OkrCardData; basePath?: string }) {
  const status: Rag | "NOT_STARTED" = okr.score == null ? "NOT_STARTED" : ragForPercent(okr.score);

  return (
    <div
      className="rounded-xl border border-black/10 border-l-4 bg-white p-5 dark:border-white/10 dark:bg-zinc-950"
      style={{ borderLeftColor: status === "NOT_STARTED" ? "#898781" : ragHex(status) }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          {okr.code && (
            <span className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">{okr.code}</span>
          )}
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${ragBadgeClasses(status)}`}>
            {status === "NOT_STARTED" ? "Not Started" : ragLabel(status)}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="text-xl font-bold"
            style={{ color: status === "NOT_STARTED" ? "#898781" : ragHex(status) }}
          >
            {okr.score != null ? `${Math.round(okr.score)}%` : "—"}
          </span>
          <RefreshCw size={13} className="text-zinc-300 dark:text-zinc-700" />
        </div>
      </div>

      <Link
        href={`${basePath}/${okr.id}`}
        className="mt-2 block text-base font-semibold text-zinc-900 hover:underline dark:text-zinc-50"
      >
        {okr.title}
      </Link>

      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
        {okr.alignedTo && (
          <span className="rounded-full bg-violet-100 px-2 py-0.5 font-medium text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
            ↳ Aligned to: {okr.alignedTo}
          </span>
        )}
        <span className="rounded-full bg-zinc-100 px-2 py-0.5 font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
          {okr.department}
        </span>
        <Avatar initials={okr.owner.initials} name={okr.owner.name} />
        <span className="text-zinc-400">{okr.initiativeCount} initiatives</span>
        {okr.overdueCount > 0 && (
          <span className="rounded-full bg-red-100 px-2 py-0.5 font-medium text-red-700 dark:bg-red-900/40 dark:text-red-300">
            {okr.overdueCount} overdue
          </span>
        )}
        {okr.dueSoonCount > 0 && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
            {okr.dueSoonCount} due soon
          </span>
        )}
      </div>

      <div className="mt-4 border-t border-black/5 pt-3 dark:border-white/5">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
          Key Results ({okr.keyResults.length})
        </p>
        {okr.keyResults.length === 0 ? (
          <p className="text-xs text-zinc-400">No key results yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {okr.keyResults.map((kr, i) => {
              const krStatus: Rag | "NOT_STARTED" = kr.outcomePercent == null ? "NOT_STARTED" : ragForPercent(kr.outcomePercent);
              return (
                <div key={kr.id} className="flex items-center gap-3 text-sm">
                  <span className="w-8 shrink-0 text-xs font-medium text-zinc-400">KR{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate text-zinc-700 dark:text-zinc-300">{kr.metric}</span>
                  <span className="shrink-0 text-xs text-zinc-400">Target: {kr.target}</span>
                  <span className="w-12 shrink-0 text-right text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    {kr.outcomePercent != null ? `${Math.round(kr.outcomePercent)}%` : "—"}
                  </span>
                  <span
                    className={`w-20 shrink-0 rounded-full px-2 py-0.5 text-center text-[11px] font-medium ${ragBadgeClasses(krStatus)}`}
                  >
                    {krStatus === "NOT_STARTED" ? "Not Started" : ragLabel(krStatus)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
