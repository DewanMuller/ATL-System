import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getSessionMembership } from "@/lib/business";
import { canViewObjective, canEditOutcome, objectiveScore } from "@/lib/okr";
import { RealInitiativeTable, type RealKeyResultGroup } from "@/components/preview/RealInitiativeTable";
import { Avatar } from "@/components/preview/Avatar";
import { ragForPercent, ragHex, ragBadgeClasses, type Rag } from "@/components/preview/colors";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "planner", label: "Planner" },
  { key: "focus-planning", label: "Focus Planning" },
  { key: "collaborators", label: "Collaborators" },
  { key: "body-of-evidence", label: "Body of Evidence" },
] as const;

function initialsFor(user: { name: string | null; email: string }) {
  if (user.name) {
    const parts = user.name.trim().split(/\s+/);
    return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
  }
  return user.email.slice(0, 2).toUpperCase();
}

function nameFor(user: { name: string | null; email: string }) {
  return user.name || user.email;
}

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
            {status === "NOT_STARTED" ? "Not Started" : status === "GREEN" ? "Green" : status === "AMBER" ? "Amber" : "Red"}
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
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-zinc-950">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                {objective.department?.name ?? "No department"}
              </span>
              <Avatar initials={initialsFor(objective.lead)} name={nameFor(objective.lead)} />
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
                    const krStatus: Rag | "NOT_STARTED" = kr.outcomePercent == null ? "NOT_STARTED" : ragForPercent(kr.outcomePercent);
                    return (
                      <tr key={kr.id} className="border-t border-black/10 dark:border-white/10">
                        <td className="px-4 py-2 text-zinc-800 dark:text-zinc-200">{kr.metric}</td>
                        <td className="px-4 py-2 text-zinc-500 dark:text-zinc-400">
                          {kr.outcomePercent != null ? `${Math.round(kr.outcomePercent)}%` : "—"}
                        </td>
                        <td className="px-4 py-2">
                          <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${ragBadgeClasses(krStatus)}`}>
                            {krStatus === "NOT_STARTED" ? "Not Started" : krStatus === "GREEN" ? "Green" : krStatus === "AMBER" ? "Amber" : "Red"}
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
      )}

      {(tab === "focus-planning" || tab === "collaborators" || tab === "body-of-evidence") && (
        <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-black/15 text-sm text-zinc-400 dark:border-white/15">
          Coming in a later phase of the redesign.
        </div>
      )}
    </div>
  );
}
