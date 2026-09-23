import { Avatar } from "@/components/preview/Avatar";
import { ragForPercent, ragBadgeClasses, ragLabel, type Rag } from "@/components/preview/colors";
import type { RealKeyResultGroup } from "@/components/preview/RealInitiativeTable";
import { initialsFor, nameFor } from "@/lib/user";

export function ObjectiveOverviewTab({
  department,
  lead,
  keyResultGroups,
}: {
  department: string;
  lead: { name: string | null; email: string };
  keyResultGroups: RealKeyResultGroup[];
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-zinc-950">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
            {department}
          </span>
          <Avatar initials={initialsFor(lead)} name={nameFor(lead)} />
          <span className="text-zinc-400">
            {keyResultGroups.reduce((sum, kr) => sum + kr.initiatives.length, 0)} initiatives
          </span>
        </div>
      </div>
      <div className="overflow-hidden rounded-xl border border-black/10 dark:border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 text-xs uppercase text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
            <tr>
              <th className="px-4 py-2">Key Result</th>
              <th className="px-4 py-2">Progress</th>
              <th className="px-4 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {keyResultGroups.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-4 text-center text-xs text-zinc-400">
                  No key results yet.
                </td>
              </tr>
            ) : (
              keyResultGroups.map((kr) => {
                const krStatus: Rag | "NOT_STARTED" =
                  kr.outcomePercent == null ? "NOT_STARTED" : ragForPercent(kr.outcomePercent);
                return (
                  <tr key={kr.id} className="border-t border-black/10 dark:border-white/10">
                    <td className="px-4 py-2 text-zinc-800 dark:text-zinc-200">{kr.metric}</td>
                    <td className="px-4 py-2 text-zinc-500 dark:text-zinc-400">
                      {kr.outcomePercent != null ? `${Math.round(kr.outcomePercent)}%` : "—"}
                    </td>
                    <td className="px-4 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${ragBadgeClasses(krStatus)}`}>
                        {ragLabel(krStatus)}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
