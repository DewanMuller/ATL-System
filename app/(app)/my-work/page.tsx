import Link from "next/link";
import { Target, CheckCircle2, FileText, Trophy, ListTodo } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getSessionMembership } from "@/lib/business";
import { objectiveScore } from "@/lib/okr";
import { AllInitiativesTable, type FlatInitiative } from "@/components/preview/AllInitiativesTable";
import { StatCard } from "@/components/preview/StatCard";
import { RagBar } from "@/components/preview/RagBar";
import { Avatar } from "@/components/preview/Avatar";
import { ragForPercent, ragHex, ragBadgeClasses, type Rag } from "@/components/preview/colors";

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

function formatDate(d: Date | null) {
  if (!d) return null;
  return new Intl.DateTimeFormat("en-ZA", { day: "2-digit", month: "short", year: "numeric" }).format(d);
}

export default async function MyWorkPage() {
  const [membership, session] = await Promise.all([getSessionMembership(), auth()]);
  const currentUserName = session?.user?.name || session?.user?.email || "";

  const business = membership
    ? await prisma.business.findUnique({
        where: { id: membership.businessId },
        include: {
          objectives: {
            include: {
              lead: { select: { id: true, name: true, email: true } },
              department: { select: { name: true } },
              keyResults: {
                include: {
                  responsibleUser: { select: { id: true, name: true, email: true } },
                  initiatives: {
                    include: { responsibleUser: { select: { id: true, name: true, email: true } } },
                    orderBy: { dueDate: "asc" },
                  },
                },
              },
            },
            orderBy: { createdAt: "asc" },
          },
          winningMoves: {
            where: { assigneeId: membership.userId },
            orderBy: { createdAt: "asc" },
          },
          nextSteps: {
            where: { assigneeId: membership.userId },
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

  const ledObjectives = business.objectives.filter((o) => o.leadUserId === membership.userId);

  const responsibleKeyResults = business.objectives.flatMap((o) =>
    o.keyResults
      .filter((kr) => kr.responsibleUserId === membership.userId)
      .map((kr) => ({ objectiveTitle: o.title, kr }))
  );

  const initiatives: FlatInitiative[] = business.objectives.flatMap((o) =>
    o.keyResults.flatMap((kr) =>
      kr.initiatives
        .filter((i) => i.responsibleUserId === membership.userId)
        .map((i) => ({
          id: i.id,
          name: i.name,
          dueDate: i.dueDate,
          outcomePercent: i.outcomePercent,
          owner: { initials: initialsFor(i.responsibleUser), name: nameFor(i.responsibleUser) },
          comments: i.comments,
          objective: { id: o.id, code: o.code, title: o.title },
          keyResultMetric: kr.metric,
          department: o.department?.name ?? "No department",
          canEdit: true,
        }))
    )
  );

  return (
    <div className="flex flex-col gap-6 pb-12">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          My Work
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Everything assigned to you, in one place.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <StatCard label="Objectives led" value={String(ledObjectives.length)} icon={Target} />
        <StatCard
          label="Key Results"
          value={String(responsibleKeyResults.length)}
          icon={CheckCircle2}
          iconClassName="bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400"
        />
        <StatCard
          label="Initiatives"
          value={String(initiatives.length)}
          icon={FileText}
          iconClassName="bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400"
        />
        <StatCard
          label="Winning Moves"
          value={String(business.winningMoves.length)}
          icon={Trophy}
          iconClassName="bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400"
        />
        <StatCard
          label="Next Steps"
          value={String(business.nextSteps.length)}
          icon={ListTodo}
          iconClassName="bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-400"
        />
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Objectives you lead
        </h2>
        {ledObjectives.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">You&apos;re not leading any objectives.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {ledObjectives.map((o) => {
              const score = objectiveScore(o.keyResults);
              const status: Rag | "NOT_STARTED" = score == null ? "NOT_STARTED" : ragForPercent(score);
              return (
                <Link
                  key={o.id}
                  href={`/okrs/${o.id}`}
                  className="relative rounded-xl border border-amber-200 bg-amber-50/60 p-4 hover:bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/10 dark:hover:bg-amber-950/20"
                >
                  <div className="flex items-start justify-between">
                    <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                      {o.code ?? "—"}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${ragBadgeClasses(status)}`}>
                      {status === "NOT_STARTED" ? "Not Started" : status === "GREEN" ? "Green" : status === "AMBER" ? "Amber" : "Red"}
                    </span>
                  </div>
                  <p className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-50">{o.title}</p>
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{o.department?.name ?? "No department"}</p>
                  <div className="mt-3 flex items-center justify-between text-xs">
                    <span className="text-zinc-500 dark:text-zinc-400">Progress</span>
                    <span className="font-medium text-zinc-700 dark:text-zinc-300">
                      {score != null ? `${Math.round(score)}%` : "Not scored"}
                    </span>
                  </div>
                  <div className="mt-1">
                    <RagBar value={score ?? 0} status={status !== "NOT_STARTED" ? status : undefined} trackClassName="bg-amber-100 dark:bg-amber-900/30" />
                  </div>
                  <div className="mt-3">
                    <Avatar initials={initialsFor(o.lead)} name={nameFor(o.lead)} />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Key Results you&apos;re responsible for
        </h2>
        {responsibleKeyResults.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">No key results assigned to you.</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-black/10 dark:border-white/10">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 text-xs uppercase text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
                <tr>
                  <th className="px-4 py-2">Objective</th>
                  <th className="px-4 py-2">Key Result</th>
                  <th className="px-4 py-2">Progress</th>
                </tr>
              </thead>
              <tbody>
                {responsibleKeyResults.map(({ objectiveTitle, kr }) => {
                  const krStatus: Rag | "NOT_STARTED" = kr.outcomePercent == null ? "NOT_STARTED" : ragForPercent(kr.outcomePercent);
                  return (
                    <tr key={kr.id} className="border-t border-black/10 bg-white dark:border-white/10 dark:bg-zinc-950">
                      <td className="px-4 py-2 text-zinc-500 dark:text-zinc-400">{objectiveTitle}</td>
                      <td className="px-4 py-2 text-zinc-800 dark:text-zinc-200">{kr.metric}</td>
                      <td className="px-4 py-2">
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${ragBadgeClasses(krStatus)}`}>
                          {kr.outcomePercent != null ? `${Math.round(kr.outcomePercent)}%` : "Not Started"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Initiatives you&apos;re responsible for
        </h2>
        {initiatives.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">No initiatives assigned to you.</p>
        ) : (
          <AllInitiativesTable initiatives={initiatives} currentUserName={currentUserName} />
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Your Winning Moves
        </h2>
        {business.winningMoves.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">No winning moves assigned to you.</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-black/10 dark:border-white/10">
            <table className="w-full text-left text-sm">
              <tbody>
                {business.winningMoves.map((m) => (
                  <tr key={m.id} className="border-t border-black/10 bg-white first:border-t-0 dark:border-white/10 dark:bg-zinc-950">
                    <td className="px-4 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          m.status === "GREEN"
                            ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
                            : m.status === "AMBER"
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                              : "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300"
                        }`}
                      >
                        {m.status === "GREEN" ? "Green" : m.status === "AMBER" ? "Amber" : "Red"}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-zinc-800 dark:text-zinc-200">{m.title}</td>
                    <td className="px-4 py-2 text-right text-xs text-zinc-500 dark:text-zinc-400">
                      {formatDate(m.dueDate) ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3 pb-12">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Your Next Steps
        </h2>
        {business.nextSteps.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">No next steps assigned to you.</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-black/10 dark:border-white/10">
            <table className="w-full text-left text-sm">
              <tbody>
                {business.nextSteps.map((s) => (
                  <tr key={s.id} className="border-t border-black/10 bg-white first:border-t-0 dark:border-white/10 dark:bg-zinc-950">
                    <td className="px-4 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          s.status === "GREEN"
                            ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
                            : s.status === "AMBER"
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                              : "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300"
                        }`}
                      >
                        {s.status === "GREEN" ? "Green" : s.status === "AMBER" ? "Amber" : "Red"}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-zinc-800 dark:text-zinc-200">{s.title}</td>
                    <td className="px-4 py-2 text-right text-xs text-zinc-500 dark:text-zinc-400">
                      {formatDate(s.dueDate) ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
