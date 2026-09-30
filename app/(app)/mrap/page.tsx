import Link from "next/link";
import { TrendingUp, Smile, Target } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSessionBusinessId } from "@/lib/business";
import { isBusinessEntitled } from "@/lib/entitlements";
import { InactiveNotice } from "@/components/InactiveNotice";
import { currentOkrAverage } from "@/lib/okr";
import { saveMonthlyReview, deleteMonthlyReview } from "@/app/actions/mrap";
import { currentMonthString, formatMonthLabel, monthlyPulse } from "@/lib/mrap";
import { wellbeingLabel } from "@/lib/wellbeing";
import { buildDepartmentRollups } from "@/lib/departmentRollup";
import { StatCard } from "@/components/preview/StatCard";
import { ragForPercent, ragHex, ragBadgeClasses, type Rag } from "@/components/preview/colors";

const TABS = [
  { key: "submit", label: "Submit" },
  { key: "company", label: "Company History" },
  { key: "pillar", label: "By Pillar" },
] as const;

export default async function MrapPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; tab?: string }>;
}) {
  const { month: monthParam, tab: tabParam } = await searchParams;
  const tab = TABS.some((t) => t.key === tabParam) ? tabParam! : "submit";

  const businessId = await getSessionBusinessId();
  const business = businessId
    ? await prisma.business.findUnique({ where: { id: businessId } })
    : null;

  if (!business) {
    return (
      <div className="p-8 text-sm text-zinc-500">
        No business found for this account.
      </div>
    );
  }

  if (!(await isBusinessEntitled(business.id, "mrap"))) {
    return <InactiveNotice />;
  }

  const selectedMonth =
    monthParam && /^\d{4}-\d{2}$/.test(monthParam)
      ? monthParam
      : currentMonthString();

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
        Connect the month&apos;s OKR progress and team pulse to a plan for
        next month.
      </p>
    </div>
  );

  if (tab === "pillar") {
    const businessWithDepartments = await prisma.business.findUnique({
      where: { id: business.id },
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

  const [liveOkrAverage, pulse, existingReview, allReviews] = await Promise.all([
    currentOkrAverage(business.id),
    monthlyPulse(business.id, selectedMonth),
    prisma.monthlyReview.findUnique({
      where: { businessId_month: { businessId: business.id, month: selectedMonth } },
    }),
    prisma.monthlyReview.findMany({
      where: { businessId: business.id },
      orderBy: { month: "desc" },
    }),
  ]);

  if (tab === "company") {
    const historyWithPulse = await Promise.all(
      allReviews.map(async (review) => ({
        review,
        pulse: await monthlyPulse(business.id, review.month),
      }))
    );

    return (
      <div className="flex flex-col gap-6">
        {header}
        {tabNav}

        <div className="flex flex-col gap-3 pb-12">
          {historyWithPulse.map(({ review, pulse: p }) => (
            <div
              key={review.id}
              className="rounded-xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-zinc-950"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="font-semibold text-zinc-900 dark:text-zinc-50">
                    {formatMonthLabel(review.month)}
                  </h4>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    OKR {review.okrAveragePct != null ? `${Math.round(review.okrAveragePct)}%` : "—"} ·
                    {" "}Wellbeing{" "}
                    {p.avgWellbeing != null
                      ? wellbeingLabel(Math.round(p.avgWellbeing))
                      : "—"}{" "}
                    · Goals{" "}
                    {p.avgGoalCompletion != null
                      ? `${Math.round(p.avgGoalCompletion)}%`
                      : "—"}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Link
                    href={`/mrap?tab=submit&month=${review.month}`}
                    className="text-xs font-medium text-zinc-600 underline dark:text-zinc-300"
                  >
                    Edit
                  </Link>
                  <form action={deleteMonthlyReview.bind(null, review.id)}>
                    <button
                      type="submit"
                      className="text-xs text-zinc-400 hover:text-red-600"
                    >
                      Delete
                    </button>
                  </form>
                </div>
              </div>

              {(review.highlights || review.blockers || review.priorities) && (
                <dl className="mt-3 flex flex-col gap-1 text-sm">
                  {review.highlights && (
                    <div>
                      <dt className="inline font-medium text-zinc-600 dark:text-zinc-300">
                        Highlights:{" "}
                      </dt>
                      <dd className="inline text-zinc-600 dark:text-zinc-400">
                        {review.highlights}
                      </dd>
                    </div>
                  )}
                  {review.blockers && (
                    <div>
                      <dt className="inline font-medium text-zinc-600 dark:text-zinc-300">
                        Blockers:{" "}
                      </dt>
                      <dd className="inline text-zinc-600 dark:text-zinc-400">
                        {review.blockers}
                      </dd>
                    </div>
                  )}
                  {review.priorities && (
                    <div>
                      <dt className="inline font-medium text-zinc-600 dark:text-zinc-300">
                        Priorities:{" "}
                      </dt>
                      <dd className="inline text-zinc-600 dark:text-zinc-400">
                        {review.priorities}
                      </dd>
                    </div>
                  )}
                </dl>
              )}
            </div>
          ))}

          {historyWithPulse.length === 0 && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              No monthly reviews saved yet.
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
          <span className="font-medium text-zinc-700 dark:text-zinc-300">
            Month
          </span>
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

      <div className="rounded-xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-zinc-950">
        <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
          {formatMonthLabel(selectedMonth)}
        </h3>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            label="OKR average"
            value={liveOkrAverage != null ? `${Math.round(liveOkrAverage)}%` : "—"}
            icon={TrendingUp}
            iconClassName="bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400"
          />
          <StatCard
            label="Team wellbeing"
            value={
              pulse.avgWellbeing != null
                ? wellbeingLabel(Math.round(pulse.avgWellbeing))
                : "—"
            }
            icon={Smile}
            iconClassName="bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400"
          />
          <StatCard
            label="Goal completion"
            value={
              pulse.avgGoalCompletion != null
                ? `${Math.round(pulse.avgGoalCompletion)}%`
                : "—"
            }
            icon={Target}
            iconClassName="bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400"
          />
        </div>
        <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
          OKR average reflects current live progress at the time you save
          this review. Wellbeing and goal completion are averaged from{" "}
          {pulse.checkInCount} weekly check-in
          {pulse.checkInCount === 1 ? "" : "s"} logged for this month.
        </p>

        <form
          action={saveMonthlyReview}
          className="mt-5 flex flex-col gap-3 border-t border-black/10 pt-5 dark:border-white/10"
        >
          <input type="hidden" name="month" value={selectedMonth} />
          <TextArea
            label="Highlights"
            name="highlights"
            defaultValue={existingReview?.highlights ?? undefined}
          />
          <TextArea
            label="Systemic blockers"
            name="blockers"
            defaultValue={existingReview?.blockers ?? undefined}
            placeholder="1-3 cross-functional constraints, not individual issues"
          />
          <TextArea
            label="Priorities for next month"
            name="priorities"
            defaultValue={existingReview?.priorities ?? undefined}
          />
          <button
            type="submit"
            className="self-start rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {existingReview ? "Update review" : "Save review"}
          </button>
        </form>
      </div>
    </div>
  );
}

function TextArea({
  label,
  name,
  defaultValue,
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium text-zinc-700 dark:text-zinc-300">
        {label}
      </span>
      <textarea
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        rows={2}
        className="rounded-md border border-black/10 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-400 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-50"
      />
    </label>
  );
}
