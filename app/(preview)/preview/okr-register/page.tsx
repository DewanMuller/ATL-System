import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSessionMembership } from "@/lib/business";
import { getAtlEntitlement, isModuleEntitled } from "@/lib/entitlements";
import { InactiveNotice } from "@/components/InactiveNotice";
import { canViewObjective, objectiveScore } from "@/lib/okr";
import { ragForPercent, ragBadgeClasses, type Rag } from "@/components/preview/colors";

function userLabel(u: { name: string | null; email: string }) {
  return u.name || u.email;
}

function periodLabel(periodType: string, periodValue: string) {
  return `${periodValue} (${periodType === "YEAR" ? "Year" : "Quarter"})`;
}

// Newest-first: plain string sort works because periodValue always leads
// with a 4-digit year in real data, and quarters ("2026-Q3") sort correctly
// alongside years ("2026") lexicographically for the same year.
function periodSortKey(periodType: string, periodValue: string) {
  return `${periodValue}|${periodType}`;
}

export default async function PreviewOkrRegisterPage() {
  const membership = await getSessionMembership();
  const business = membership
    ? await prisma.business.findUnique({
        where: { id: membership.businessId },
        include: {
          objectives: {
            include: {
              lead: { select: { id: true, name: true, email: true } },
              department: { select: { name: true } },
              contributors: { select: { userId: true } },
              keyResults: {
                select: {
                  outcomePercent: true,
                  responsibleUserId: true,
                  initiatives: { select: { responsibleUserId: true } },
                },
              },
            },
            orderBy: { createdAt: "asc" },
          },
        },
      })
    : null;

  if (!business || !membership) {
    return (
      <div className="p-8 text-sm text-zinc-500">
        No business found for this account.
      </div>
    );
  }

  const entitlement = await getAtlEntitlement(business.id);
  if (!isModuleEntitled(entitlement, "okrs")) {
    return <InactiveNotice />;
  }

  const isOwner = membership.role === "OWNER";
  const visibleObjectives = isOwner
    ? business.objectives
    : business.objectives.filter((o) => canViewObjective(membership, o));

  const groups = new Map<string, { periodType: string; periodValue: string; objectives: typeof visibleObjectives }>();
  for (const o of visibleObjectives) {
    const key = periodSortKey(o.periodType, o.periodValue);
    const group = groups.get(key);
    if (group) group.objectives.push(o);
    else groups.set(key, { periodType: o.periodType, periodValue: o.periodValue, objectives: [o] });
  }
  const sortedGroups = [...groups.values()].sort((a, b) =>
    periodSortKey(b.periodType, b.periodValue).localeCompare(periodSortKey(a.periodType, a.periodValue))
  );

  return (
    <div className="flex flex-col gap-6 pb-12">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          OKR Register
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          The full list of objectives across every period, most recent
          first.
        </p>
      </div>

      {!isOwner && (
        <p className="text-xs text-zinc-400">
          Showing objectives where you&apos;re the Lead, a Contributor, or
          Responsible for a Key Result or Initiative.
        </p>
      )}

      {sortedGroups.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          No objectives yet — add some on the OKRs page.
        </p>
      ) : (
        sortedGroups.map((group) => (
          <section key={periodSortKey(group.periodType, group.periodValue)} className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              {periodLabel(group.periodType, group.periodValue)}
            </h2>
            <div className="overflow-x-auto rounded-xl border border-black/10 dark:border-white/10">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-zinc-50 text-xs uppercase text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
                  <tr>
                    <th className="px-4 py-2">Code</th>
                    <th className="px-4 py-2">Objective</th>
                    <th className="px-4 py-2">Pillar</th>
                    <th className="px-4 py-2">Lead</th>
                    <th className="px-4 py-2">Weighting</th>
                    <th className="px-4 py-2">Score</th>
                    <th className="px-4 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {group.objectives.map((o) => {
                    const score = objectiveScore(o.keyResults);
                    const status: Rag | "NOT_STARTED" = score == null ? "NOT_STARTED" : ragForPercent(score);
                    return (
                      <tr key={o.id} className="border-t border-black/10 bg-white dark:border-white/10 dark:bg-zinc-950">
                        <td className="px-4 py-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">{o.code ?? "—"}</td>
                        <td className="px-4 py-2 text-zinc-800 dark:text-zinc-200">
                          <Link href={`/preview/okr-workspace/${o.id}`} className="hover:underline">
                            {o.title}
                          </Link>
                        </td>
                        <td className="px-4 py-2 text-zinc-500 dark:text-zinc-400">{o.department?.name ?? "No department"}</td>
                        <td className="px-4 py-2 text-zinc-500 dark:text-zinc-400">{userLabel(o.lead)}</td>
                        <td className="px-4 py-2 text-zinc-500 dark:text-zinc-400">{Math.round(o.weighting * 100)}%</td>
                        <td className="px-4 py-2 font-medium text-zinc-800 dark:text-zinc-200">
                          {score != null ? `${Math.round(score)}%` : "—"}
                        </td>
                        <td className="px-4 py-2">
                          <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${ragBadgeClasses(status)}`}>
                            {status === "NOT_STARTED" ? "Not Started" : status === "GREEN" ? "Green" : status === "AMBER" ? "Amber" : "Red"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        ))
      )}
    </div>
  );
}
