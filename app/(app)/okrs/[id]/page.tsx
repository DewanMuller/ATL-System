import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getSessionMembership } from "@/lib/business";
import { isBusinessEntitled } from "@/lib/entitlements";
import { InactiveNotice } from "@/components/InactiveNotice";
import { canViewObjective, canEditOutcome, objectiveScore } from "@/lib/okr";
import { RealInitiativeTable, type RealKeyResultGroup } from "@/components/preview/RealInitiativeTable";
import { ragForPercent, ragHex, ragBadgeClasses, ragLabel, type Rag } from "@/components/preview/colors";
import { deleteObjective, deleteKeyResult, deleteInitiative } from "@/app/actions/okr";
import { ObjectiveForm } from "@/components/okr/ObjectiveForm";
import { KeyResultForm } from "@/components/okr/KeyResultForm";
import { InitiativeForm } from "@/components/okr/InitiativeForm";
import { ObjectiveOverviewTab } from "@/components/okr/ObjectiveOverviewTab";
import { initialsFor, nameFor } from "@/lib/user";
import { toDateInputValue } from "@/lib/forms";

export default async function OkrDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab: tabParam } = await searchParams;
  const [membership, session] = await Promise.all([getSessionMembership(), auth()]);
  const currentUserName = session?.user?.name || session?.user?.email || "";
  const isOwner = membership?.role === "OWNER";

  const objective = membership
    ? await prisma.objective.findFirst({
        where: { id, businessId: membership.businessId },
        include: {
          lead: { select: { id: true, name: true, email: true } },
          department: { select: { id: true, code: true, name: true } },
          alignedToObjective: { select: { title: true } },
          contributors: { select: { userId: true } },
          keyResults: {
            include: {
              responsibleUser: { select: { id: true, name: true, email: true } },
              initiatives: {
                include: { responsibleUser: { select: { id: true, name: true, email: true } } },
                orderBy: { dueDate: "asc" },
              },
            },
            orderBy: { createdAt: "asc" },
          },
        },
      })
    : null;

  if (!membership || !objective) notFound();
  if (membership.role !== "OWNER" && !canViewObjective(membership, objective)) notFound();

  if (!(await isBusinessEntitled(membership.businessId, "okrs"))) {
    return <InactiveNotice />;
  }

  const [business] = isOwner
    ? await Promise.all([
        prisma.business.findUnique({
          where: { id: membership.businessId },
          include: {
            departments: { orderBy: { order: "asc" } },
            objectives: { select: { id: true, title: true } },
            members: {
              include: { user: { select: { id: true, name: true, email: true } } },
              orderBy: { createdAt: "asc" },
            },
          },
        }),
      ])
    : [null];

  const TABS = [
    { key: "overview", label: "Overview" },
    ...(isOwner ? [{ key: "planning", label: "Planning" } as const] : []),
    { key: "planner", label: "Planner" },
  ] as const;

  const tab = TABS.some((t) => t.key === tabParam) ? tabParam! : "planner";
  const score = objectiveScore(objective.keyResults);
  const status: Rag | "NOT_STARTED" = score == null ? "NOT_STARTED" : ragForPercent(score);

  const keyResultGroups: RealKeyResultGroup[] = objective.keyResults.map((kr) => ({
    id: kr.id,
    metric: kr.metric,
    target: kr.target,
    outcomePercent: kr.outcomePercent,
    comments: kr.comments,
    canEdit: canEditOutcome(membership, objective, kr.responsibleUserId),
    owner: { initials: initialsFor(kr.responsibleUser), name: nameFor(kr.responsibleUser) },
    initiatives: kr.initiatives.map((i) => ({
      id: i.id,
      name: i.name,
      dueDate: i.dueDate,
      outcomePercent: i.outcomePercent,
      owner: { initials: initialsFor(i.responsibleUser), name: nameFor(i.responsibleUser) },
      comments: i.comments,
      canEdit: canEditOutcome(membership, objective, i.responsibleUserId),
    })),
  }));

  return (
    <div className="flex flex-col gap-4 pb-12">
      <div>
        <Link
          href="/okrs"
          className="mb-2 inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          <ArrowLeft size={12} /> Back to OKRs
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          {objective.code && (
            <span className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">{objective.code}</span>
          )}
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${ragBadgeClasses(status)}`}>
            {ragLabel(status)}
          </span>
          <span className="text-xl font-bold" style={{ color: status === "NOT_STARTED" ? "#898781" : ragHex(status) }}>
            {score != null ? `${Math.round(score)}%` : "—"}
          </span>
          {objective.isTopCompanyOkr && (
            <span className="rounded-full bg-zinc-900 px-2 py-0.5 text-[10px] font-medium text-white dark:bg-zinc-50 dark:text-zinc-900">
              ★ Top 3 Company
            </span>
          )}
          {objective.isTopDepartmentOkr && (
            <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-[10px] font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
              ★ Top 3 Dept
            </span>
          )}
        </div>
        <h1 className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-50">{objective.title}</h1>
        {objective.alignedToObjective && (
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            ↳ Aligned to: {objective.alignedToObjective.title}
          </p>
        )}
      </div>

      <div className="flex gap-1 overflow-x-auto rounded-lg border border-black/10 p-1 dark:border-white/10">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/okrs/${objective.id}?tab=${t.key}`}
            className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === t.key
                ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
                : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {tab === "planner" && (
        <>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Every initiative linked to this objective&apos;s key results.
            Initiatives contribute to a Key Result but don&apos;t
            automatically determine its score — that&apos;s entered directly
            by whoever&apos;s responsible for it.
          </p>
          <RealInitiativeTable keyResults={keyResultGroups} currentUserName={currentUserName} />
        </>
      )}

      {tab === "overview" && (
        <ObjectiveOverviewTab
          department={objective.department?.name ?? "No department"}
          lead={objective.lead}
          keyResultGroups={keyResultGroups}
        />
      )}

      {tab === "planning" && isOwner && business && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between rounded-xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-zinc-950">
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Delete this objective
            </p>
            <form action={deleteObjective.bind(null, objective.id)}>
              <button
                type="submit"
                className="rounded-md border border-black/10 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 dark:border-white/10 dark:hover:bg-red-950/30"
              >
                Delete objective
              </button>
            </form>
          </div>

          <details className="rounded-xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-zinc-950" open>
            <summary className="cursor-pointer text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Edit objective
            </summary>
            <div className="mt-3">
              <ObjectiveForm
                mode="edit"
                objectiveId={objective.id}
                defaultValues={{
                  code: objective.code,
                  title: objective.title,
                  leadUserId: objective.leadUserId,
                  contributorIds: objective.contributors.map((c) => c.userId),
                  weightingPercent: objective.weighting * 100,
                  periodType: objective.periodType,
                  periodValue: objective.periodValue,
                  dueDate: objective.dueDate ? toDateInputValue(objective.dueDate) : "",
                  alignedToObjectiveId: objective.alignedToObjectiveId,
                  departmentId: objective.departmentId,
                  isTopCompanyOkr: objective.isTopCompanyOkr,
                  isTopDepartmentOkr: objective.isTopDepartmentOkr,
                }}
                members={business.members}
                departments={business.departments}
                alignmentOptions={business.objectives.filter((o) => o.id !== objective.id)}
              />
            </div>
          </details>

          <div className="rounded-xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-zinc-950">
            <p className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Key results &amp; initiatives
            </p>
            <div className="flex flex-col gap-4">
              {objective.keyResults.map((kr) => (
                <div key={kr.id} className="rounded-lg border border-black/10 p-3 dark:border-white/10">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{kr.metric}</p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        Target: {kr.target} · Responsible: {nameFor(kr.responsibleUser)}
                      </p>
                    </div>
                    <form action={deleteKeyResult.bind(null, kr.id)}>
                      <button type="submit" className="text-xs text-zinc-400 hover:text-red-600">
                        Delete
                      </button>
                    </form>
                  </div>

                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200">
                      Edit
                    </summary>
                    <div className="mt-2">
                      <KeyResultForm
                        mode="edit"
                        keyResultId={kr.id}
                        defaultValues={{
                          metric: kr.metric,
                          target: kr.target,
                          responsibleUserId: kr.responsibleUserId,
                        }}
                        members={business.members}
                      />
                    </div>
                  </details>

                  <div className="mt-3 flex flex-col gap-2 border-t border-black/5 pt-2 dark:border-white/5">
                    {kr.initiatives.map((initiative) => (
                      <div key={initiative.id} className="pl-3">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                              {initiative.name}
                            </p>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                              Due {toDateInputValue(initiative.dueDate)} · {nameFor(initiative.responsibleUser)}
                            </p>
                          </div>
                          <form action={deleteInitiative.bind(null, initiative.id)}>
                            <button type="submit" className="text-xs text-zinc-400 hover:text-red-600">
                              Delete
                            </button>
                          </form>
                        </div>
                        <details className="mt-1">
                          <summary className="cursor-pointer text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200">
                            Edit
                          </summary>
                          <div className="mt-2">
                            <InitiativeForm
                              mode="edit"
                              initiativeId={initiative.id}
                              defaultValues={{
                                name: initiative.name,
                                dueDate: toDateInputValue(initiative.dueDate),
                                responsibleUserId: initiative.responsibleUserId,
                              }}
                              members={business.members}
                            />
                          </div>
                        </details>
                      </div>
                    ))}

                    {kr.initiatives.length === 0 && (
                      <p className="pl-3 text-xs text-zinc-400">No initiatives yet.</p>
                    )}

                    <details className="pl-3">
                      <summary className="cursor-pointer text-xs font-medium text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200">
                        Add initiative
                      </summary>
                      <div className="mt-2">
                        <InitiativeForm mode="create" keyResultId={kr.id} members={business.members} />
                      </div>
                    </details>
                  </div>
                </div>
              ))}

              {objective.keyResults.length === 0 && (
                <p className="text-xs text-zinc-400">No key results yet.</p>
              )}

              <details>
                <summary className="cursor-pointer text-xs font-medium text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200">
                  Add key result
                </summary>
                <div className="mt-2">
                  <KeyResultForm mode="create" objectiveId={objective.id} members={business.members} />
                </div>
              </details>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
