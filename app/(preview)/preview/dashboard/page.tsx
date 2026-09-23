import { Bell, Users, TrendingUp, AlertTriangle, Clock, CheckCircle2, FileText, ListChecks, Target, Trophy } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSessionMembership } from "@/lib/business";
import { getAtlEntitlement, isModuleEntitled } from "@/lib/entitlements";
import { InactiveNotice } from "@/components/InactiveNotice";
import { canViewObjective, objectiveScore } from "@/lib/okr";
import { metricProgress } from "@/lib/bhag";
import { StatCard } from "@/components/preview/StatCard";
import { RagBar } from "@/components/preview/RagBar";
import { Avatar } from "@/components/preview/Avatar";
import { DonutChart } from "@/components/preview/charts/DonutChart";
import { HorizontalBarChart } from "@/components/preview/charts/HorizontalBarChart";
import { VerticalBarChart } from "@/components/preview/charts/VerticalBarChart";
import {
  STATUS,
  INK,
  ragForPercent,
  ragHex,
  ragBadgeClasses,
  CATEGORICAL_SCOPE_CLASS,
  catVar,
  type Rag,
} from "@/components/preview/colors";
import { initialsFor, nameFor } from "@/lib/user";

// The real 1–5 scale and labels already established on the WRAP page
// (app/(app)/wrap/page.tsx) — reused here rather than inventing a separate
// banding scheme, since this is the one ATL already asks people to submit.
const WELLBEING_LABELS: Record<number, string> = {
  1: "Struggling",
  2: "Coping",
  3: "Steady",
  4: "Good",
  5: "Thriving",
};
const WELLBEING_PILL_CLASS: Record<number, string> = {
  1: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  2: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  3: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  4: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  5: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
};

// A 5-bucket RAG for the OKR Status Breakdown donut — distinct from the
// plain 3-band ragForPercent(), since "Completed" (100%) and "Not started"
// (never scored) are both real, meaningfully different states the simple
// Green/Amber/Red bands don't capture.
function okrBucket(score: number | null): "COMPLETED" | Rag | "NOT_STARTED" {
  if (score == null) return "NOT_STARTED";
  if (score >= 100) return "COMPLETED";
  return ragForPercent(score);
}

export default async function DashboardPage() {
  const membership = await getSessionMembership();
  const business = membership
    ? await prisma.business.findUnique({
        where: { id: membership.businessId },
        include: {
          bhag: true,
          bhagMetrics: {
            orderBy: { order: "asc" },
            include: { targets: { include: { period: true }, orderBy: { period: { order: "desc" } }, take: 1 } },
          },
          departments: { orderBy: { order: "asc" } },
          objectives: {
            include: {
              lead: { select: { id: true, name: true, email: true } },
              department: { select: { id: true, name: true, order: true } },
              contributors: { select: { userId: true } },
              keyResults: {
                include: {
                  responsibleUser: { select: { id: true } },
                  initiatives: {
                    select: { dueDate: true, outcomePercent: true, responsibleUserId: true },
                  },
                },
              },
            },
            orderBy: { createdAt: "asc" },
          },
          nextSteps: { select: { status: true } },
          winningMoves: { select: { status: true, assigneeId: true } },
          weeklyCheckIns: { orderBy: { weekOf: "desc" }, select: { weekOf: true, personName: true, wellbeingScore: true } },
          members: { select: { id: true } },
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
  const objectives = isOwner
    ? business.objectives
    : business.objectives.filter((o) => canViewObjective(membership, o));
  const winningMoves = isOwner
    ? business.winningMoves
    : business.winningMoves.filter((w) => w.assigneeId === membership.userId);

  const now = new Date();

  // ---------- Team Check-In Completion (real WeeklyCheckIn data) ----------
  const latestWeek = business.weeklyCheckIns[0]?.weekOf ?? null;
  const thisWeekCheckIns = latestWeek
    ? business.weeklyCheckIns.filter((c) => c.weekOf.getTime() === latestWeek.getTime())
    : [];
  const totalMembers = business.members.length;
  const checkInPct = totalMembers > 0 ? Math.round((thisWeekCheckIns.length / totalMembers) * 100) : 0;

  // ---------- OKR stats ----------
  const scored = objectives.map((o) => ({ o, score: objectiveScore(o.keyResults) }));
  const okrBuckets = { COMPLETED: 0, GREEN: 0, AMBER: 0, RED: 0, NOT_STARTED: 0 };
  for (const { score } of scored) okrBuckets[okrBucket(score)]++;
  const totalKeyResults = objectives.reduce((sum, o) => sum + o.keyResults.length, 0);
  const completedKeyResults = objectives.reduce(
    (sum, o) => sum + o.keyResults.filter((kr) => kr.outcomePercent != null && kr.outcomePercent >= 100).length,
    0
  );

  const allInitiatives = objectives.flatMap((o) => o.keyResults.flatMap((kr) => kr.initiatives));
  const overdueInitiatives = allInitiatives.filter(
    (i) => i.dueDate < now && (i.outcomePercent == null || i.outcomePercent < 100)
  );
  const dueThisMonthInitiatives = allInitiatives.filter(
    (i) =>
      i.dueDate.getFullYear() === now.getFullYear() &&
      i.dueDate.getMonth() === now.getMonth() &&
      (i.outcomePercent == null || i.outcomePercent < 100)
  );
  const completedInitiatives = allInitiatives.filter((i) => i.outcomePercent != null && i.outcomePercent >= 100);
  const notStartedInitiatives = allInitiatives.filter((i) => i.outcomePercent == null && i.dueDate >= now);
  const inProgressInitiatives =
    allInitiatives.length - overdueInitiatives.length - completedInitiatives.length - notStartedInitiatives.length;

  // ---------- BHAG ----------
  const bhagMetricRows = business.bhagMetrics.map((m) => ({
    label: m.name,
    value: metricProgress(m.currentValue, m.targets[0]?.value ?? null),
  }));

  // ---------- Top 3 Company OKRs ----------
  const topCompanyOkrs = objectives.filter((o) => o.isTopCompanyOkr);

  // ---------- Pillar progress ----------
  const pillarProgress = business.departments.map((d, i) => {
    const deptObjectives = objectives.filter((o) => o.department?.id === d.id);
    const scores = deptObjectives
      .map((o) => objectiveScore(o.keyResults))
      .filter((s): s is number => s != null);
    const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    return { label: d.name, value: Math.round(avg), color: catVar(((i % 8) + 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8) };
  });

  // ---------- Wellbeing Scorecard (real WeeklyCheckIn.wellbeingScore, 1–5) ----------
  const wellbeingAvg =
    thisWeekCheckIns.length > 0
      ? thisWeekCheckIns.reduce((sum, c) => sum + c.wellbeingScore, 0) / thisWeekCheckIns.length
      : null;
  const wellbeingCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const c of thisWeekCheckIns) wellbeingCounts[c.wellbeingScore] = (wellbeingCounts[c.wellbeingScore] ?? 0) + 1;

  // ---------- Next Steps status (real substitute for "MRAP Submission Status") ----------
  const nextStepCounts = { GREEN: 0, AMBER: 0, RED: 0 };
  for (const n of business.nextSteps) nextStepCounts[n.status as "GREEN" | "AMBER" | "RED"]++;

  // ---------- Winning Moves status ----------
  const winningMoveCounts = { GREEN: 0, AMBER: 0, RED: 0 };
  for (const w of winningMoves) winningMoveCounts[w.status as "GREEN" | "AMBER" | "RED"]++;

  return (
    <div className={`flex flex-col gap-6 pb-12 ${CATEGORICAL_SCOPE_CLASS}`}>
      <div>
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Dashboard
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Overall OKR and reporting health at a glance.
        </p>
      </div>

      {/* Team Check-In Completion — real data from WeeklyCheckIn */}
      <div className="flex flex-col gap-3 rounded-xl border border-black/10 bg-indigo-50/60 p-4 dark:border-white/10 dark:bg-indigo-950/20 sm:flex-row sm:items-center">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-300">
          <Users size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">
              Team Check-In Completion
            </p>
            {latestWeek && (
              <span className="text-sm font-bold" style={{ color: ragHex(ragForPercent(checkInPct)) }}>
                {checkInPct}%
              </span>
            )}
          </div>
          {latestWeek ? (
            <>
              <div className="mt-1.5">
                <RagBar value={checkInPct} trackClassName="bg-white dark:bg-zinc-900" />
              </div>
              <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                {thisWeekCheckIns.length} of {totalMembers} team members completed ·{" "}
                {totalMembers - thisWeekCheckIns.length} outstanding (week of{" "}
                {latestWeek.toLocaleDateString("en-ZA", { day: "2-digit", month: "short" })})
              </p>
            </>
          ) : (
            <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
              No weekly check-ins recorded yet.
            </p>
          )}
        </div>
        <button className="flex shrink-0 items-center gap-1.5 self-start rounded-md border border-indigo-200 bg-white px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:bg-zinc-900 dark:text-indigo-300 dark:hover:bg-zinc-800 sm:self-center">
          <Bell size={13} />
          Send Reminders
        </button>
      </div>

      {/* Company BHAG — real data from Bhag/BhagMetric */}
      <div className="rounded-xl border border-green-200 bg-green-50/60 p-5 dark:border-green-900/40 dark:bg-green-950/10">
        <div className="mb-2 flex items-center gap-2">
          <Target size={14} className="text-green-700 dark:text-green-400" />
          <p className="text-xs font-semibold uppercase tracking-wide text-green-700 dark:text-green-400">
            Company BHAG
          </p>
        </div>
        {business.bhag ? (
          <>
            <p className="text-sm font-medium leading-relaxed text-zinc-800 dark:text-zinc-200">
              {business.bhag.title}
            </p>
            {bhagMetricRows.length > 0 ? (
              <div className="mt-4 grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
                {bhagMetricRows.map((m) => (
                  <div key={m.label}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-600 dark:text-zinc-300">{m.label}</span>
                      <span
                        className="font-semibold"
                        style={{ color: m.value != null ? ragHex(ragForPercent(m.value)) : INK.muted.light }}
                      >
                        {m.value != null ? `${Math.round(m.value)}%` : "—"}
                      </span>
                    </div>
                    <div className="mt-1">
                      <RagBar value={m.value ?? 0} trackClassName="bg-green-100 dark:bg-green-900/30" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                No BHAG metrics set up yet — add some on the BHAG page.
              </p>
            )}
          </>
        ) : (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">No BHAG set yet.</p>
        )}
      </div>

      {/* Stat row 1 — real objective/initiative counts */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total OKRs" value={String(objectives.length)} caption={`${totalKeyResults} key results`} icon={Target} />
        <StatCard
          label="Green"
          value={String(okrBuckets.GREEN + okrBuckets.COMPLETED)}
          caption={objectives.length > 0 ? `${Math.round(((okrBuckets.GREEN + okrBuckets.COMPLETED) / objectives.length) * 100)}% of OKRs` : "—"}
          icon={TrendingUp}
          iconClassName="bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400"
        />
        <StatCard
          label="Amber / Red"
          value={String(okrBuckets.AMBER + okrBuckets.RED)}
          caption={`${okrBuckets.AMBER} amber · ${okrBuckets.RED} red`}
          icon={AlertTriangle}
          iconClassName="bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400"
        />
        <StatCard
          label="Overdue Initiatives"
          value={String(overdueInitiatives.length)}
          caption={`${dueThisMonthInitiatives.length} due this month`}
          icon={Clock}
          iconClassName="bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400"
        />
      </div>

      {/* Wellbeing Scorecard — real WeeklyCheckIn data */}
      <div className="rounded-xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-zinc-950">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
              Organisational Wellbeing Scorecard
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {thisWeekCheckIns.length > 0
                ? `Based on ${thisWeekCheckIns.length} weekly check-in${thisWeekCheckIns.length === 1 ? "" : "s"}`
                : "No weekly check-ins submitted yet"}
            </p>
          </div>
          {wellbeingAvg != null && (
            <span
              className="text-2xl font-bold"
              style={{ color: ragHex(wellbeingAvg >= 4 ? "GREEN" : wellbeingAvg >= 2.5 ? "AMBER" : "RED") }}
            >
              {wellbeingAvg.toFixed(1)}
              <span className="text-sm font-medium text-zinc-400">/5</span>
            </span>
          )}
        </div>
        {thisWeekCheckIns.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5]
              .filter((score) => wellbeingCounts[score] > 0)
              .map((score) => (
                <span key={score} className={`rounded-full px-2.5 py-1 text-xs font-medium ${WELLBEING_PILL_CLASS[score]}`}>
                  {WELLBEING_LABELS[score]}: {wellbeingCounts[score]}
                </span>
              ))}
          </div>
        )}
      </div>

      {/* Top 3 Company OKRs — real data, isTopCompanyOkr flag */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <span className="text-lg">🏆</span>
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Top 3 Company OKRs
          </h2>
        </div>
        {topCompanyOkrs.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No objectives marked Top 3 Company OKR yet — set that on the OKRs page.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {topCompanyOkrs.map((okr, i) => {
              const score = objectiveScore(okr.keyResults);
              const status: Rag = score == null ? "AMBER" : ragForPercent(score);
              return (
                <div
                  key={okr.id}
                  className="relative rounded-xl border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-900/40 dark:bg-amber-950/10"
                >
                  <div className="flex items-start justify-between">
                    <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                      {okr.code ?? "—"}
                    </span>
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-[10px] font-semibold text-amber-800 dark:bg-amber-900/50 dark:text-amber-300">
                      {i + 1}
                    </span>
                  </div>
                  <p className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-50">{okr.title}</p>
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{okr.department?.name ?? "No department"}</p>
                  <div className="mt-3 flex items-center justify-between text-xs">
                    <span className="text-zinc-500 dark:text-zinc-400">Progress</span>
                    <span className="font-medium text-zinc-700 dark:text-zinc-300">
                      {score != null ? `${Math.round(score)}%` : "Not scored"}
                    </span>
                  </div>
                  <div className="mt-1">
                    <RagBar value={score ?? 0} status={score != null ? status : undefined} trackClassName="bg-amber-100 dark:bg-amber-900/30" />
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${ragBadgeClasses(score != null ? status : "NOT_STARTED")}`}>
                      {score == null ? "Not Started" : status === "GREEN" ? "Green" : status === "AMBER" ? "Amber" : "Red"}
                    </span>
                    <Avatar initials={initialsFor(okr.lead)} name={nameFor(okr.lead)} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Additional Metrics */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Additional Metrics
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
          <StatCard
            label="KRs Achieved"
            value={String(completedKeyResults)}
            caption={`of ${totalKeyResults}`}
            icon={CheckCircle2}
            iconClassName="bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400"
          />
          <StatCard
            label="Due This Month"
            value={String(dueThisMonthInitiatives.length)}
            caption="initiatives"
            icon={AlertTriangle}
            iconClassName="bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400"
          />
          <StatCard
            label="Total Initiatives"
            value={String(allInitiatives.length)}
            caption={`${completedInitiatives.length} completed`}
            icon={FileText}
            iconClassName="bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400"
          />
          <StatCard
            label="Completed OKRs"
            value={String(okrBuckets.COMPLETED)}
            caption={`of ${objectives.length}`}
            icon={ListChecks}
            iconClassName="bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-400"
          />
          <StatCard
            label="Winning Moves"
            value={String(winningMoves.length)}
            caption={`${winningMoveCounts.GREEN} on track`}
            icon={Trophy}
            iconClassName="bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400"
          />
        </div>
      </div>

      {/* Charts — all real data */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-zinc-950">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            OKR Status Breakdown
          </h3>
          <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">
            Distribution of objectives by RAG status
          </p>
          <DonutChart
            segments={[
              { label: "On Track", value: okrBuckets.GREEN, color: STATUS.good.light },
              { label: "At Risk", value: okrBuckets.AMBER, color: STATUS.warning.light },
              { label: "Off Track", value: okrBuckets.RED, color: STATUS.critical.light },
              { label: "Completed", value: okrBuckets.COMPLETED, color: catVar(7) },
              { label: "Not Started", value: okrBuckets.NOT_STARTED, color: INK.muted.light },
            ].filter((s) => s.value > 0)}
          />
        </div>

        <div className="rounded-xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-zinc-950">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Progress by Strategic Pillar
          </h3>
          <p className="mb-4 text-xs text-zinc-500 dark:text-zinc-400">
            Average objective progress % per pillar (departments)
          </p>
          {pillarProgress.length > 0 ? (
            <HorizontalBarChart items={pillarProgress} />
          ) : (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              No departments set up yet — add some on the OKRs page.
            </p>
          )}
        </div>

        <div className="rounded-xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-zinc-950">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Initiative Execution Status
          </h3>
          <p className="mb-4 text-xs text-zinc-500 dark:text-zinc-400">
            Count of initiatives by current status
          </p>
          {allInitiatives.length > 0 ? (
            <VerticalBarChart
              items={[
                { label: "Not Started", value: notStartedInitiatives.length, color: INK.muted.light },
                { label: "In Progress", value: Math.max(0, inProgressInitiatives), color: catVar(1) },
                { label: "Overdue", value: overdueInitiatives.length, color: STATUS.critical.light },
                { label: "Completed", value: completedInitiatives.length, color: STATUS.good.light },
              ]}
            />
          ) : (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">No initiatives yet.</p>
          )}
        </div>

        <div className="rounded-xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-zinc-950">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Next Steps Status
          </h3>
          <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">
            RAG breakdown of every Next Step
          </p>
          {business.nextSteps.length > 0 ? (
            <DonutChart
              segments={[
                { label: "Green", value: nextStepCounts.GREEN, color: STATUS.good.light },
                { label: "Amber", value: nextStepCounts.AMBER, color: STATUS.warning.light },
                { label: "Red", value: nextStepCounts.RED, color: STATUS.critical.light },
              ].filter((s) => s.value > 0)}
            />
          ) : (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">No next steps yet.</p>
          )}
        </div>

        <div className="rounded-xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-zinc-950">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Winning Moves Status
          </h3>
          <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">
            RAG breakdown of every Winning Move
          </p>
          {winningMoves.length > 0 ? (
            <DonutChart
              segments={[
                { label: "Green", value: winningMoveCounts.GREEN, color: STATUS.good.light },
                { label: "Amber", value: winningMoveCounts.AMBER, color: STATUS.warning.light },
                { label: "Red", value: winningMoveCounts.RED, color: STATUS.critical.light },
              ].filter((s) => s.value > 0)}
            />
          ) : (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">No winning moves yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
