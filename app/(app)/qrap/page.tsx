import Link from "next/link";
import { TrendingUp, Smile, Target } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSessionBusinessId } from "@/lib/business";
import { isBusinessEntitled } from "@/lib/entitlements";
import { InactiveNotice } from "@/components/InactiveNotice";
import { StatCard } from "@/components/preview/StatCard";
import { currentOkrAverage } from "@/lib/okr";
import { saveQuarterlyReview, deleteQuarterlyReview } from "@/app/actions/qrap";
import {
  currentQuarterString,
  formatQuarterLabel,
  isValidQuarter,
  quarterMonths,
  quarterRange,
  shiftQuarter,
} from "@/lib/quarter";

const WELLBEING_LABELS: Record<number, string> = {
  1: "Struggling",
  2: "Coping",
  3: "Steady",
  4: "Good",
  5: "Thriving",
};

function average(values: number[]) {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function formatMonthLabel(month: string) {
  const [year, m] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("en-ZA", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, m - 1, 1));
}

async function quarterlyPulse(businessId: string, quarter: string) {
  const { start, end } = quarterRange(quarter);
  const checkIns = await prisma.weeklyCheckIn.findMany({
    where: { businessId, weekOf: { gte: start, lt: end } },
  });
  return {
    avgWellbeing: average(checkIns.map((c) => c.wellbeingScore)),
    avgGoalCompletion: average(checkIns.map((c) => c.goalCompletionPct)),
    checkInCount: checkIns.length,
  };
}

export default async function QrapPage({
  searchParams,
}: {
  searchParams: Promise<{ quarter?: string }>;
}) {
  const { quarter: quarterParam } = await searchParams;
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

  if (!(await isBusinessEntitled(business.id, "qrap"))) {
    return <InactiveNotice />;
  }

  const nowQuarter = currentQuarterString();
  const selectedQuarter =
    quarterParam && isValidQuarter(quarterParam) ? quarterParam : nowQuarter;
  const quarterOptions = Array.from({ length: 8 }, (_, i) =>
    shiftQuarter(nowQuarter, i - 5)
  );

  const [liveOkrAverage, pulse, monthlyReviews, existingReview, allReviews] =
    await Promise.all([
      currentOkrAverage(business.id),
      quarterlyPulse(business.id, selectedQuarter),
      prisma.monthlyReview.findMany({
        where: {
          businessId: business.id,
          month: { in: quarterMonths(selectedQuarter) },
        },
        orderBy: { month: "asc" },
      }),
      prisma.quarterlyReview.findUnique({
        where: {
          businessId_quarter: { businessId: business.id, quarter: selectedQuarter },
        },
      }),
      prisma.quarterlyReview.findMany({
        where: { businessId: business.id },
        orderBy: { quarter: "desc" },
      }),
    ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Quarterly Review, Adjust &amp; Plan (QRAP)
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          The 90-day reset — close out this quarter&apos;s OKRs, decide what
          to adjust, and set the next quarter&apos;s focus.
        </p>
      </div>

      <form method="GET" className="flex items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">
            Quarter
          </span>
          <select
            name="quarter"
            defaultValue={selectedQuarter}
            className="rounded-md border border-black/10 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-zinc-900"
          >
            {quarterOptions.map((q) => (
              <option key={q} value={q}>
                {formatQuarterLabel(q)}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="rounded-md border border-black/10 px-4 py-2 text-sm hover:bg-zinc-50 dark:border-white/10 dark:hover:bg-zinc-900"
        >
          View quarter
        </button>
      </form>

      <div className="rounded-xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-zinc-950">
        <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
          {formatQuarterLabel(selectedQuarter)}
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
                ? WELLBEING_LABELS[Math.round(pulse.avgWellbeing)]
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
          {pulse.checkInCount === 1 ? "" : "s"} across the quarter.
        </p>

        {monthlyReviews.length > 0 && (
          <div className="mt-5 border-t border-black/10 pt-4 dark:border-white/10">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              This quarter&apos;s monthly reviews
            </h4>
            <div className="mt-2 flex flex-col gap-2">
              {monthlyReviews.map((m) => (
                <div key={m.id} className="text-sm">
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">
                    {formatMonthLabel(m.month)}
                    {m.okrAveragePct != null &&
                      ` — OKR ${Math.round(m.okrAveragePct)}%`}
                    :{" "}
                  </span>
                  <span className="text-zinc-600 dark:text-zinc-400">
                    {m.blockers || m.highlights || "No notes recorded."}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <form
          action={saveQuarterlyReview}
          className="mt-5 flex flex-col gap-3 border-t border-black/10 pt-5 dark:border-white/10"
        >
          <input type="hidden" name="quarter" value={selectedQuarter} />
          <TextArea
            label="Business summary"
            name="businessSummary"
            defaultValue={existingReview?.businessSummary ?? undefined}
            placeholder="Actual performance vs. this quarter's targets, and how it feeds the BHAG"
          />
          <TextArea
            label="Adjustments"
            name="adjustments"
            defaultValue={existingReview?.adjustments ?? undefined}
            placeholder="What's changing — strategy, resourcing, or focus — based on this quarter's learning"
          />
          <TextArea
            label="Next quarter's focus"
            name="nextQuarterFocus"
            defaultValue={existingReview?.nextQuarterFocus ?? undefined}
          />
          <button
            type="submit"
            className="self-start rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {existingReview ? "Update review" : "Save review"}
          </button>
        </form>
      </div>

      <div className="flex flex-col gap-3 pb-12">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          History
        </h3>
        {allReviews.map((review) => (
          <div
            key={review.id}
            className="rounded-xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-zinc-950"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="font-semibold text-zinc-900 dark:text-zinc-50">
                  {formatQuarterLabel(review.quarter)}
                </h4>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  OKR{" "}
                  {review.okrAveragePct != null
                    ? `${Math.round(review.okrAveragePct)}%`
                    : "—"}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  href={`/qrap?quarter=${review.quarter}`}
                  className="text-xs font-medium text-zinc-600 underline dark:text-zinc-300"
                >
                  Edit
                </Link>
                <form action={deleteQuarterlyReview.bind(null, review.id)}>
                  <button
                    type="submit"
                    className="text-xs text-zinc-400 hover:text-red-600"
                  >
                    Delete
                  </button>
                </form>
              </div>
            </div>

            {(review.businessSummary ||
              review.adjustments ||
              review.nextQuarterFocus) && (
              <dl className="mt-3 flex flex-col gap-1 text-sm">
                {review.businessSummary && (
                  <div>
                    <dt className="inline font-medium text-zinc-600 dark:text-zinc-300">
                      Summary:{" "}
                    </dt>
                    <dd className="inline text-zinc-600 dark:text-zinc-400">
                      {review.businessSummary}
                    </dd>
                  </div>
                )}
                {review.adjustments && (
                  <div>
                    <dt className="inline font-medium text-zinc-600 dark:text-zinc-300">
                      Adjustments:{" "}
                    </dt>
                    <dd className="inline text-zinc-600 dark:text-zinc-400">
                      {review.adjustments}
                    </dd>
                  </div>
                )}
                {review.nextQuarterFocus && (
                  <div>
                    <dt className="inline font-medium text-zinc-600 dark:text-zinc-300">
                      Next quarter:{" "}
                    </dt>
                    <dd className="inline text-zinc-600 dark:text-zinc-400">
                      {review.nextQuarterFocus}
                    </dd>
                  </div>
                )}
              </dl>
            )}
          </div>
        ))}

        {allReviews.length === 0 && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No quarterly reviews saved yet.
          </p>
        )}
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
