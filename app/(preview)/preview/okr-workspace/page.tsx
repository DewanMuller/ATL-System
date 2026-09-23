import { prisma } from "@/lib/prisma";
import { getSessionMembership } from "@/lib/business";
import { getAtlEntitlement, isModuleEntitled } from "@/lib/entitlements";
import { InactiveNotice } from "@/components/InactiveNotice";
import { canViewObjective, objectiveScore } from "@/lib/okr";
import { OkrWorkspaceGrid } from "@/components/preview/OkrWorkspaceGrid";
import type { OkrCardData } from "@/components/preview/OkrCard";
import { initialsFor, nameFor } from "@/lib/user";

const DUE_SOON_DAYS = 7;

export default async function OkrWorkspacePage() {
  const membership = await getSessionMembership();
  const business = membership
    ? await prisma.business.findUnique({
        where: { id: membership.businessId },
        include: {
          objectives: {
            include: {
              lead: { select: { id: true, name: true, email: true } },
              department: { select: { name: true } },
              alignedToObjective: { select: { title: true } },
              contributors: { select: { userId: true } },
              keyResults: {
                include: {
                  responsibleUser: { select: { id: true } },
                  initiatives: { select: { dueDate: true, outcomePercent: true, responsibleUserId: true } },
                },
                orderBy: { createdAt: "asc" },
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

  const now = new Date();
  const dueSoonCutoff = new Date(now.getTime() + DUE_SOON_DAYS * 24 * 60 * 60 * 1000);

  const okrs: OkrCardData[] = visibleObjectives.map((o) => {
    const initiatives = o.keyResults.flatMap((kr) => kr.initiatives);
    const overdueCount = initiatives.filter(
      (i) => i.dueDate < now && (i.outcomePercent == null || i.outcomePercent < 100)
    ).length;
    const dueSoonCount = initiatives.filter(
      (i) =>
        i.dueDate >= now &&
        i.dueDate <= dueSoonCutoff &&
        (i.outcomePercent == null || i.outcomePercent < 100)
    ).length;

    return {
      id: o.id,
      code: o.code,
      title: o.title,
      score: objectiveScore(o.keyResults),
      alignedTo: o.alignedToObjective?.title ?? null,
      department: o.department?.name ?? "No department",
      owner: { initials: initialsFor(o.lead), name: nameFor(o.lead) },
      initiativeCount: initiatives.length,
      overdueCount,
      dueSoonCount,
      keyResults: o.keyResults.map((kr) => ({
        id: kr.id,
        metric: kr.metric,
        target: kr.target,
        outcomePercent: kr.outcomePercent,
      })),
    };
  });

  return (
    <div className="flex flex-col gap-4 pb-12">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          OKR Workspace
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Use this page to review OKRs across the business. Click into an
          objective to see its full initiative planner.
        </p>
      </div>

      {!isOwner && (
        <p className="text-xs text-zinc-400">
          Showing objectives where you&apos;re the Lead, a Contributor, or
          Responsible for a Key Result or Initiative.
        </p>
      )}

      {okrs.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          No objectives yet — add some on the OKRs page.
        </p>
      ) : (
        <OkrWorkspaceGrid okrs={okrs} />
      )}
    </div>
  );
}
