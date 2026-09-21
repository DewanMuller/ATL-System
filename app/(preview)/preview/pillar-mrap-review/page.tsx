import { prisma } from "@/lib/prisma";
import { getSessionMembership } from "@/lib/business";
import { getAtlEntitlement, isModuleEntitled } from "@/lib/entitlements";
import { InactiveNotice } from "@/components/InactiveNotice";
import { buildDepartmentRollups } from "@/lib/departmentRollup";
import { ragForPercent, ragBadgeClasses, type Rag } from "@/components/preview/colors";

export default async function PreviewPillarMrapReviewPage() {
  const membership = await getSessionMembership();
  const business = membership
    ? await prisma.business.findUnique({
        where: { id: membership.businessId },
        include: {
          departments: {
            include: {
              objectives: {
                select: {
                  weighting: true,
                  keyResults: { select: { outcomePercent: true } },
                },
              },
            },
            orderBy: { order: "asc" },
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
  if (!isModuleEntitled(entitlement, "mrap")) {
    return <InactiveNotice />;
  }

  const rollups = buildDepartmentRollups(business.departments).sort(
    (a, b) => (b.averageScore ?? -1) - (a.averageScore ?? -1)
  );

  return (
    <div className="flex flex-col gap-4 pb-12">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Pillar MRAP Review
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          All departments side by side, ranked by OKR average, for a
          company-wide review at a glance. Computed live from current OKR
          data — not a submitted record.
        </p>
      </div>

      {rollups.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          No departments set up yet — add some on the{" "}
          <a href="/okrs" className="underline">
            OKRs
          </a>{" "}
          page.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-black/10 dark:border-white/10">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-zinc-50 text-xs uppercase text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-2">Pillar</th>
                <th className="px-4 py-2">OKR Average</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Objectives</th>
                <th className="px-4 py-2">Green</th>
                <th className="px-4 py-2">Amber</th>
                <th className="px-4 py-2">Red</th>
                <th className="px-4 py-2">Not Started</th>
              </tr>
            </thead>
            <tbody>
              {rollups.map((d) => {
                const status: Rag | "NOT_STARTED" = d.averageScore == null ? "NOT_STARTED" : ragForPercent(d.averageScore);
                return (
                  <tr key={d.id} className="border-t border-black/10 bg-white dark:border-white/10 dark:bg-zinc-950">
                    <td className="px-4 py-2 font-medium text-zinc-800 dark:text-zinc-200">
                      <span className="mr-1.5 rounded bg-zinc-100 px-1 py-0.5 font-mono text-[10px] font-medium text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
                        {d.code}
                      </span>
                      {d.name}
                    </td>
                    <td className="px-4 py-2 font-semibold text-zinc-800 dark:text-zinc-200">
                      {d.averageScore != null ? `${Math.round(d.averageScore)}%` : "—"}
                    </td>
                    <td className="px-4 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${ragBadgeClasses(status)}`}>
                        {status === "NOT_STARTED" ? "Not Started" : status === "GREEN" ? "Green" : status === "AMBER" ? "Amber" : "Red"}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{d.objectiveCount}</td>
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{d.green || ""}</td>
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{d.amber || ""}</td>
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{d.red || ""}</td>
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{d.notStarted || ""}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
