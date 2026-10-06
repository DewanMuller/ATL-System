import Link from "next/link";
import { TrendingUp, Smile, Users } from "lucide-react";
import type { RagStatus, MeasureType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionMembership } from "@/lib/business";
import { isBusinessEntitled } from "@/lib/entitlements";
import { InactiveNotice } from "@/components/InactiveNotice";
import { currentOkrAverage } from "@/lib/okr";
import { createMonthlyCheckIn, deleteMonthlyCheckIn } from "@/app/actions/mrap";
import { currentMonthString, formatMonthLabel } from "@/lib/mrap";
import { WELLBEING_MIN, WELLBEING_MAX, wellbeingLabel, wellbeingPillClass, wellbeingAsPercent } from "@/lib/wellbeing";
import { formatMeasureValue } from "@/lib/measure";
import { buildDepartmentRollups } from "@/lib/departmentRollup";
import { StatCard } from "@/components/preview/StatCard";
import { RagBar } from "@/components/preview/RagBar";
import { ragForPercent, ragHex, ragBadgeClasses, ragLabel, type Rag } from "@/components/preview/colors";
import { nameFor } from "@/lib/user";

const TABS = [
  { key: "submit", label: "Submit" },
  { key: "history", label: "History" },
  { key: "pillar", label: "By Pillar" },
] as const;

function average(values: number[]) {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function objectiveLabel(objective: { code: string | null; title: string }) {
  return objective.code ? `${objective.code} — ${objective.title}` : objective.title;
}

function RagTrend({ history }: { history: { status: RagStatus }[] }) {
  if (history.length === 0) {
    return <span className="text-xs text-zinc-400">No history yet</span>;
  }
  return (
    <div className="flex items-center gap-1">
      {[...history].reverse().map((h, i) => (
        <span
          key={i}
          title={ragLabel(h.status)}
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: ragHex(h.status) }}
        />
      ))}
    </div>
  );
}

type MyKeyResultRow = {
  keyResult: {
    id: string;
    metric: string;
    measureType: MeasureType;
    targetValue: number | null;
    startValue: number | null;
    currentValue: number | null;
    unit: string | null;
    objective: { id: string; code: string | null; title: string };
  };
  thisMonthEntry: { status: RagStatus; reportedValue: number | null; notes: string | null } | null;
  priorEntry: { status: RagStatus; reportedValue: number | null; notes: string | null } | null;
  history: { status: RagStatus }[];
};

// Groups the submitter's own key results under their Objective, same idea
// as WRAP's grouping of initiatives — just one level shallower since Key
// Results are the leaf being reported on here, not Initiatives nested under
// them.
function groupByObjective(rows: MyKeyResultRow[]) {
  const objectives = new Map<string, { id: string; code: string | null; title: string; rows: MyKeyResultRow[] }>();
  for (const row of rows) {
    const obj = row.keyResult.objective;
    if (!objectives.has(obj.id)) objectives.set(obj.id, { id: obj.id, code: obj.code, title: obj.title, rows: [] });
    objectives.get(obj.id)!.rows.push(row);
  }
  return [...objectives.values()];
}

type KeyResultCheckInSummary = {
  id: string;
  keyResult: {
    id: string;
    metric: string;
    measureType: MeasureType;
    targetValue: number | null;
    unit: string | null;
    objective: { code: string | null; title: string };
  };
  status: RagStatus;
  reportedValue: number | null;
  notes: string | null;
};

type MonthlyCheckInSummary = {
  id: string;
  userId: string;
  user: { name: string | null; email: string };
  month: string;
  wellbeingScore: number;
  highlights: string | null;
  blockers: string | null;
  helpNeeded: string | null;
  dibrFollowUp: string | null;
  priorities: string | null;
  keyResultCheckIns: KeyResultCheckInSummary[];
};

function MonthlyCheckInCard({ c, canDelete }: { c: MonthlyCheckInSummary; canDelete: boolean }) {
  return (
    <div className="rounded-xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-zinc-950">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
            {nameFor(c.user)}
          </h3>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            {formatMonthLabel(c.month)}
          </span>
        </div>
        {canDelete && (
          <form action={deleteMonthlyCheckIn.bind(null, c.id)}>
            <button type="submit" className="text-xs text-zinc-400 hover:text-red-600">
              Delete
            </button>
          </form>
        )}
      </div>

      <div className="mt-3 flex flex-col gap-1.5">
        <span className={`self-start rounded-full px-2.5 py-0.5 text-xs font-medium ${wellbeingPillClass(c.wellbeingScore)}`}>
          Wellbeing: {wellbeingLabel(c.wellbeingScore)} ({c.wellbeingScore}/10)
        </span>
        <RagBar value={wellbeingAsPercent(c.wellbeingScore)} />
      </div>

      {(c.highlights || c.blockers || c.helpNeeded || c.dibrFollowUp || c.priorities) && (
        <dl className="mt-3 flex flex-col gap-1 text-sm">
          {c.highlights && (
            <div>
              <dt className="inline font-medium text-zinc-600 dark:text-zinc-300">Highlights: </dt>
              <dd className="inline text-zinc-600 dark:text-zinc-400">{c.highlights}</dd>
            </div>
          )}
          {c.blockers && (
            <div>
              <dt className="inline font-medium text-zinc-600 dark:text-zinc-300">Blockers: </dt>
              <dd className="inline text-zinc-600 dark:text-zinc-400">{c.blockers}</dd>
            </div>
          )}
          {c.helpNeeded && (
            <div>
              <dt className="inline font-medium text-zinc-600 dark:text-zinc-300">Help needed: </dt>
              <dd className="inline text-zinc-600 dark:text-zinc-400">{c.helpNeeded}</dd>
            </div>
          )}
          {c.dibrFollowUp && (
            <div>
              <dt className="inline font-medium text-zinc-600 dark:text-zinc-300">DIBR follow-up: </dt>
              <dd className="inline text-zinc-600 dark:text-zinc-400">{c.dibrFollowUp}</dd>
            </div>
          )}
          {c.priorities && (
            <div>
              <dt className="inline font-medium text-zinc-600 dark:text-zinc-300">Priorities for next month: </dt>
              <dd className="inline text-zinc-600 dark:text-zinc-400">{c.priorities}</dd>
            </div>
          )}
        </dl>
      )}

      {c.keyResultCheckIns.length > 0 && (
        <div className="mt-3 flex flex-col gap-2 border-t border-black/5 pt-3 dark:border-white/5">
          {c.keyResultCheckIns.map((kc) => (
            <div key={kc.id} className="flex flex-col gap-1 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ragBadgeClasses(kc.status)}`}>
                  {ragLabel(kc.status)}
                </span>
                <span className="font-medium text-zinc-800 dark:text-zinc-200">{kc.keyResult.metric}</span>
                {kc.reportedValue != null && (
                  <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    {formatMeasureValue({
                      measureType: kc.keyResult.measureType,
                      currentValue: kc.reportedValue,
                      targetValue: kc.keyResult.targetValue,
                      unit: kc.keyResult.unit,
                    })}
                  </span>
                )}
                <span className="text-xs text-zinc-400">{objectiveLabel(kc.keyResult.objective)}</span>
              </div>
              {kc.notes && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Notes: {kc.notes}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default async function MrapPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; tab?: string }>;
}) {
  const { month: monthParam, tab: tabParam } = await searchParams;
  const tab = TABS.some((t) => t.key === tabParam) ? tabParam! : "submit";

  const membership = await getSessionMembership();
  if (!membership) {
    return (
      <div className="p-8 text-sm text-zinc-500">
        No business found for this account.
      </div>
    );
  }

  if (!(await isBusinessEntitled(membership.businessId, "mrap"))) {
    return <InactiveNotice />;
  }

  const selectedMonth =
    monthParam && /^\d{4}-\d{2}$/.test(monthParam) ? monthParam : currentMonthString();

  const tabNav = (
    <div className="flex gap-1 overflow-x-auto rounded-lg border border-black/10 p-1 dark:border-white/10">
      {TABS.map((t) => (
        <Link
          key={t.key}
          href={`/mrap?tab=${t.key}`}
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
  );

  const header = (
    <div>
      <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        Monthly Review, Assess &amp; Plan (MRAP)
      </h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Each pillar head&apos;s own monthly reflection — wellbeing, wins,
        blockers, and progress on the Key Results they own. Feeds the
        quarterly QRAP.
      </p>
    </div>
  );

  if (tab === "pillar") {
    const businessWithDepartments = await prisma.business.findUnique({
      where: { id: membership.businessId },
      select: {
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
    });
    const rollups = buildDepartmentRollups(businessWithDepartments?.departments ?? []).sort(
      (a, b) => (b.averageScore ?? -1) - (a.averageScore ?? -1)
    );

    return (
      <div className="flex flex-col gap-6">
        {header}
        {tabNav}

        <div className="flex flex-col gap-4 pb-12">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            A live OKR-average rollup per department, computed from current
            objective and key result data. There&apos;s no separate
            per-department MRAP submission — this is a computed snapshot,
            not a stored review.
          </p>

          {rollups.length === 0 ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              No departments set up yet — add some on the{" "}
              <Link href="/okrs" className="underline">
                OKRs
              </Link>{" "}
              page.
            </p>
          ) : (
            <>
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
            </>
          )}
        </div>
      </div>
    );
  }

  const [liveOkrAverage, checkIns, members, myKeyResults] = await Promise.all([
    currentOkrAverage(membership.businessId),
    prisma.monthlyCheckIn.findMany({
      where: { businessId: membership.businessId },
      include: {
        user: { select: { name: true, email: true } },
        keyResultCheckIns: {
          include: {
            keyResult: {
              select: {
                id: true,
                metric: true,
                measureType: true,
                targetValue: true,
                unit: true,
                objective: { select: { code: true, title: true } },
              },
            },
          },
        },
      },
      orderBy: [{ month: "desc" }, { createdAt: "desc" }],
    }),
    prisma.membership.findMany({
      where: { businessId: membership.businessId },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.keyResult.findMany({
      where: { responsibleUserId: membership.userId, objective: { businessId: membership.businessId } },
      select: {
        id: true,
        metric: true,
        measureType: true,
        targetValue: true,
        startValue: true,
        currentValue: true,
        unit: true,
        objective: { select: { id: true, code: true, title: true } },
        monthlyCheckIns: {
          select: { status: true, reportedValue: true, notes: true, monthlyCheckIn: { select: { month: true } } },
          orderBy: { monthlyCheckIn: { month: "desc" } },
          take: 6,
        },
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const thisMonthCheckIns = checkIns.filter((c) => c.month === selectedMonth);
  const thisMonthUserIds = new Set(thisMonthCheckIns.map((c) => c.userId));
  const outstandingMembers = members.filter((m) => !thisMonthUserIds.has(m.userId));
  const avgWellbeing = average(thisMonthCheckIns.map((c) => c.wellbeingScore));

  const myCheckInThisMonth = thisMonthCheckIns.find((c) => c.userId === membership.userId) ?? null;

  const myKeyResultRows: MyKeyResultRow[] = myKeyResults.map((kr) => {
    const thisMonthEntry = kr.monthlyCheckIns.find((h) => h.monthlyCheckIn.month === selectedMonth) ?? null;
    const priorEntry = kr.monthlyCheckIns.find((h) => h.monthlyCheckIn.month !== selectedMonth) ?? null;
    return { keyResult: kr, thisMonthEntry, priorEntry, history: kr.monthlyCheckIns };
  });
  const myKeyResultsByObjective = groupByObjective(myKeyResultRows);

  if (tab === "history") {
    return (
      <div className="flex flex-col gap-6">
        {header}
        {tabNav}

        <div className="flex flex-col gap-3 pb-12">
          {checkIns.map((c) => (
            <MonthlyCheckInCard key={c.id} c={c} canDelete={c.userId === membership.userId || membership.role === "OWNER"} />
          ))}

          {checkIns.length === 0 && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              No MRAP submissions yet. Add this month&apos;s on the
              &quot;Submit&quot; tab.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {header}
      {tabNav}

      <form method="GET" className="flex items-end gap-3">
        <input type="hidden" name="tab" value="submit" />
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">Month</span>
          <input
            type="month"
            name="month"
            defaultValue={selectedMonth}
            className="rounded-md border border-black/10 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-zinc-900"
          />
        </label>
        <button
          type="submit"
          className="rounded-md border border-black/10 px-4 py-2 text-sm hover:bg-zinc-50 dark:border-white/10 dark:hover:bg-zinc-900"
        >
          View month
        </button>
      </form>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          label="OKR average"
          value={liveOkrAverage != null ? `${Math.round(liveOkrAverage)}%` : "—"}
          icon={TrendingUp}
          iconClassName="bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400"
        />
        <StatCard
          label="Team wellbeing"
          value={avgWellbeing != null ? wellbeingLabel(Math.round(avgWellbeing)) : "—"}
          caption={avgWellbeing != null ? `${avgWellbeing.toFixed(1)}/10` : undefined}
          icon={Smile}
          iconClassName="bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400"
        />
        <StatCard
          label="Submitted"
          value={`${thisMonthCheckIns.length} / ${members.length}`}
          icon={Users}
          iconClassName="bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400"
        />
      </div>

      <div className="rounded-xl border border-dashed border-black/15 p-5 dark:border-white/15">
        <p className="mb-3 text-sm font-medium text-zinc-600 dark:text-zinc-300">
          {myCheckInThisMonth ? "Update your MRAP" : "Add your MRAP"} — {formatMonthLabel(selectedMonth)}
        </p>
        <form
          key={`${myCheckInThisMonth?.id ?? "new"}-${myCheckInThisMonth?.wellbeingScore}-${myCheckInThisMonth?.highlights}-${myCheckInThisMonth?.blockers}-${myCheckInThisMonth?.helpNeeded}-${myCheckInThisMonth?.dibrFollowUp}-${myCheckInThisMonth?.priorities}`}
          action={createMonthlyCheckIn}
          className="flex flex-col gap-5"
        >
          <input type="hidden" name="month" value={selectedMonth} />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-zinc-700 dark:text-zinc-300">
                Wellbeing (0 = In Crisis, 10 = Excelling)
              </span>
              <select
                name="wellbeingScore"
                defaultValue={myCheckInThisMonth?.wellbeingScore ?? 5}
                className="rounded-md border border-black/10 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-zinc-900"
              >
                {Array.from({ length: WELLBEING_MAX - WELLBEING_MIN + 1 }, (_, i) => WELLBEING_MAX - i).map((v) => (
                  <option key={v} value={v}>
                    {v} – {wellbeingLabel(v)}
                  </option>
                ))}
              </select>
            </label>
            <Field label="Highlights / wins" name="highlights" defaultValue={myCheckInThisMonth?.highlights ?? undefined} />
            <Field label="Blockers" name="blockers" defaultValue={myCheckInThisMonth?.blockers ?? undefined} />
            <Field label="Help needed" name="helpNeeded" defaultValue={myCheckInThisMonth?.helpNeeded ?? undefined} />
            <Field
              label="DIBR follow-up (prior escalated issues)"
              name="dibrFollowUp"
              defaultValue={myCheckInThisMonth?.dibrFollowUp ?? undefined}
            />
            <Field label="Priorities for next month" name="priorities" defaultValue={myCheckInThisMonth?.priorities ?? undefined} />
          </div>

          {myKeyResultsByObjective.length > 0 && (
            <div className="flex flex-col gap-5">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Your Key Results this month
              </h2>
              {myKeyResultsByObjective.map((objective) => (
                <div key={objective.id} className="flex flex-col gap-3">
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    {objectiveLabel(objective)}
                  </p>
                  {objective.rows.map(({ keyResult, thisMonthEntry, priorEntry, history }) => (
                    <div
                      key={`${keyResult.id}-${thisMonthEntry?.status}-${thisMonthEntry?.reportedValue}-${thisMonthEntry?.notes}`}
                      className="rounded-lg border border-black/10 p-4 dark:border-white/10"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-medium text-zinc-800 dark:text-zinc-200">{keyResult.metric}</p>
                        <RagTrend history={history} />
                      </div>

                      {priorEntry?.notes && (
                        <p className="mt-2 rounded-md bg-zinc-50 px-3 py-2 text-xs text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
                          Last month: <span className="font-medium">{priorEntry.notes}</span>
                        </p>
                      )}

                      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {keyResult.measureType === "MANUAL" ? (
                          <label className="flex flex-col gap-1 text-sm">
                            <span className="font-medium text-zinc-700 dark:text-zinc-300">Progress (%)</span>
                            <input
                              name={`value-${keyResult.id}`}
                              type="number"
                              min={0}
                              max={100}
                              step="any"
                              defaultValue={thisMonthEntry?.reportedValue ?? keyResult.currentValue ?? undefined}
                              className="rounded-md border border-black/10 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-400 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-50"
                            />
                          </label>
                        ) : keyResult.measureType === "BINARY" ? (
                          <label className="flex flex-col gap-1 text-sm">
                            <span className="font-medium text-zinc-700 dark:text-zinc-300">Done this month?</span>
                            <select
                              name={`value-${keyResult.id}`}
                              defaultValue={
                                (thisMonthEntry?.reportedValue ?? keyResult.currentValue ?? 0) >= 1 ? "1" : "0"
                              }
                              className="rounded-md border border-black/10 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-zinc-900"
                            >
                              <option value="0">Not done</option>
                              <option value="1">Done</option>
                            </select>
                          </label>
                        ) : (
                          <label className="flex flex-col gap-1 text-sm">
                            <span className="font-medium text-zinc-700 dark:text-zinc-300">
                              Current value {keyResult.unit ? `(${keyResult.unit})` : ""}
                            </span>
                            <span className="flex items-center gap-1">
                              <input
                                name={`value-${keyResult.id}`}
                                type="number"
                                step="any"
                                defaultValue={thisMonthEntry?.reportedValue ?? keyResult.currentValue ?? keyResult.startValue ?? undefined}
                                className="w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-400 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-50"
                              />
                              <span className="shrink-0 text-xs text-zinc-400">/ {keyResult.targetValue ?? "—"}</span>
                            </span>
                          </label>
                        )}
                        <label className="flex flex-col gap-1 text-sm">
                          <span className="font-medium text-zinc-700 dark:text-zinc-300">Notes</span>
                          <input
                            name={`notes-${keyResult.id}`}
                            type="text"
                            defaultValue={thisMonthEntry?.notes ?? undefined}
                            className="rounded-md border border-black/10 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-400 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-50"
                          />
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          <button
            type="submit"
            className="self-end rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {myCheckInThisMonth ? "Update check-in" : "Add check-in"}
          </button>
        </form>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          This month ({thisMonthCheckIns.length} of {members.length} submitted)
        </h2>
        {outstandingMembers.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {outstandingMembers.map((m) => (
              <span
                key={m.id}
                className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
              >
                {nameFor(m.user)} — outstanding
              </span>
            ))}
          </div>
        )}
        {thisMonthCheckIns.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No MRAP submissions for this month yet — add yours above.
          </p>
        ) : (
          thisMonthCheckIns.map((c) => (
            <MonthlyCheckInCard key={c.id} c={c} canDelete={c.userId === membership.userId || membership.role === "OWNER"} />
          ))
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue,
}: {
  label: string;
  name: string;
  defaultValue?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium text-zinc-700 dark:text-zinc-300">{label}</span>
      <input
        name={name}
        type="text"
        defaultValue={defaultValue}
        className="rounded-md border border-black/10 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-400 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-50"
      />
    </label>
  );
}
