import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSessionMembership } from "@/lib/business";
import { getAtlEntitlement, isModuleEntitled } from "@/lib/entitlements";
import { InactiveNotice } from "@/components/InactiveNotice";
import { buildDepartmentRollups } from "@/lib/departmentRollup";
import { ragForPercent, ragHex, ragBadgeClasses, type Rag } from "@/components/preview/colors";

export default async function PreviewPillarMrapPage() {
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

  const rollups = buildDepartmentRollups(business.departments);

  return (
    <div className="flex flex-col gap-4 pb-12">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Pillar MRAP
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          A live OKR-average rollup per department, computed from current
          objective and key result data. There&apos;s no separate
          per-department MRAP submission yet — this is a computed snapshot,
          not a submitted record.
        </p>
      </div>

      {rollups.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          No departments set up yet — add some on the{" "}
          <Link href="/okrs" className="underline">
            OKRs
          </Link>{" "}
          page.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rollups.map((d) => {
            const status: Rag | "NOT_STARTED" = d.averageScore == null ? "NOT_STARTED" : ragForPercent(d.averageScore);
            return (
              <div
                key={d.id}
                className="rounded-xl border border-black/10 border-l-4 bg-white p-5 dark:border-white/10 dark:bg-zinc-950"
                style={{ borderLeftColor: status === "NOT_STARTED" ? "#898781" : ragHex(status) }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                    {d.code}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${ragBadgeClasses(status)}`}>
                    {status === "NOT_STARTED" ? "Not Started" : status === "GREEN" ? "Green" : status === "AMBER" ? "Amber" : "Red"}
                  </span>
                </div>
                <p className="mt-2 text-base font-semibold text-zinc-900 dark:text-zinc-50">{d.name}</p>
                <p
                  className="mt-1 text-2xl font-bold"
                  style={{ color: status === "NOT_STARTED" ? "#898781" : ragHex(status) }}
                >
                  {d.averageScore != null ? `${Math.round(d.averageScore)}%` : "—"}
                </p>
                <p className="mt-1 text-xs text-zinc-400">
                  {d.objectiveCount} objective{d.objectiveCount === 1 ? "" : "s"}
                </p>
                <div className="mt-3 flex gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                  <span>{d.green} Green</span>
                  <span>{d.amber} Amber</span>
                  <span>{d.red} Red</span>
                  {d.notStarted > 0 && <span>{d.notStarted} Not Started</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
