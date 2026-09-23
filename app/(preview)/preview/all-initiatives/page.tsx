import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getSessionMembership } from "@/lib/business";
import { getAtlEntitlement, isModuleEntitled } from "@/lib/entitlements";
import { InactiveNotice } from "@/components/InactiveNotice";
import { canViewObjective, canEditOutcome } from "@/lib/okr";
import { AllInitiativesTable, type FlatInitiative } from "@/components/preview/AllInitiativesTable";
import { initialsFor, nameFor } from "@/lib/user";

export default async function AllInitiativesPage() {
  const [membership, session] = await Promise.all([getSessionMembership(), auth()]);
  const currentUserName = session?.user?.name || session?.user?.email || "";

  const business = membership
    ? await prisma.business.findUnique({
        where: { id: membership.businessId },
        include: {
          objectives: {
            include: {
              department: { select: { name: true } },
              contributors: { select: { userId: true } },
              keyResults: {
                include: {
                  responsibleUser: { select: { id: true } },
                  initiatives: {
                    include: { responsibleUser: { select: { id: true, name: true, email: true } } },
                    orderBy: { dueDate: "asc" },
                  },
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

  const initiatives: FlatInitiative[] = visibleObjectives.flatMap((o) =>
    o.keyResults.flatMap((kr) =>
      kr.initiatives.map((i) => ({
        id: i.id,
        name: i.name,
        dueDate: i.dueDate,
        outcomePercent: i.outcomePercent,
        owner: { initials: initialsFor(i.responsibleUser), name: nameFor(i.responsibleUser) },
        comments: i.comments,
        objective: { id: o.id, code: o.code, title: o.title },
        keyResultMetric: kr.metric,
        department: o.department?.name ?? "No department",
        canEdit: canEditOutcome(membership, o, i.responsibleUserId),
      }))
    )
  );

  return (
    <div className="flex flex-col gap-4 pb-12">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          All Initiatives
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Every initiative across every objective, in one table. Click an
          objective to open its full planner.
        </p>
      </div>

      {!isOwner && (
        <p className="text-xs text-zinc-400">
          Showing initiatives on objectives where you&apos;re the Lead, a
          Contributor, or Responsible for a Key Result or Initiative.
        </p>
      )}

      {initiatives.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          No initiatives yet — add some from the OKR Workspace.
        </p>
      ) : (
        <AllInitiativesTable initiatives={initiatives} currentUserName={currentUserName} />
      )}
    </div>
  );
}
