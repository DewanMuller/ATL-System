import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getSessionMembership } from "@/lib/business";
import { canViewObjective, canEditOutcome, objectiveScore } from "@/lib/okr";
import { RealInitiativeTable, type RealKeyResultGroup } from "@/components/preview/RealInitiativeTable";
import { ragForPercent, ragHex, ragBadgeClasses, ragLabel, type Rag } from "@/components/preview/colors";
import { ObjectiveOverviewTab } from "@/components/okr/ObjectiveOverviewTab";
import { initialsFor, nameFor } from "@/lib/user";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "planner", label: "Planner" },
  { key: "focus-planning", label: "Focus Planning" },
  { key: "collaborators", label: "Collaborators" },
  { key: "body-of-evidence", label: "Body of Evidence" },
] as const;

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

  const objective = membership
    ? await prisma.objective.findFirst({
        where: { id, businessId: membership.businessId },
        include: {
          lead: { select: { id: true, name: true, email: true } },
          department: { select: { name: true } },
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
          href="/preview/okr-workspace"
          className="mb-2 inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          <ArrowLeft size={12} /> Back to OKR Workspace
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
            href={`/preview/okr-workspace/${objective.id}?tab=${t.key}`}
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

      {(tab === "focus-planning" || tab === "collaborators" || tab === "body-of-evidence") && (
        <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-black/15 text-sm text-zinc-400 dark:border-white/15">
          Coming in a later phase of the redesign.
        </div>
      )}
    </div>
  );
}
