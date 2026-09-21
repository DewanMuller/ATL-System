import { prisma } from "@/lib/prisma";
import { getSessionBusinessId } from "@/lib/business";
import { getAtlEntitlement, isModuleEntitled } from "@/lib/entitlements";
import { InactiveNotice } from "@/components/InactiveNotice";
import { ProgressBar } from "@/components/ProgressBar";
import { currentOkrAverage } from "@/lib/okr";
import { WELLBEING_LABELS, currentMonthString, formatMonthLabel, monthlyPulse } from "@/lib/mrap";

export default async function PreviewMrapReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: monthParam } = await searchParams;
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

  const entitlement = await getAtlEntitlement(business.id);
  if (!isModuleEntitled(entitlement, "mrap")) {
    return <InactiveNotice />;
  }

  const selectedMonth =
    monthParam && /^\d{4}-\d{2}$/.test(monthParam) ? monthParam : currentMonthString();

  const [liveOkrAverage, pulse, selectedReview, allReviews] = await Promise.all([
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

  const historyWithPulse = await Promise.all(
    allReviews.map(async (review) => ({
      review,
      pulse: await monthlyPulse(business.id, review.month),
    }))
  );

  return (
    <div className="flex flex-col gap-6 pb-12">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          MRAP Review
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Read-only view of a month&apos;s Review, Assess &amp; Plan — pick a
          month to see what was recorded, or browse the full history below.
        </p>
      </div>

      <form method="GET" className="flex items-end gap-3">
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

      <div className="rounded-xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-zinc-950">
        <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
          {formatMonthLabel(selectedMonth)}
        </h3>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            label="OKR average"
            value={liveOkrAverage != null ? `${Math.round(liveOkrAverage)}%` : "—"}
            progress={liveOkrAverage}
          />
          <StatCard
            label="Team wellbeing"
            value={
              pulse.avgWellbeing != null ? WELLBEING_LABELS[Math.round(pulse.avgWellbeing)] : "—"
            }
            progress={pulse.avgWellbeing != null ? (pulse.avgWellbeing / 5) * 100 : null}
          />
          <StatCard
            label="Goal completion"
            value={pulse.avgGoalCompletion != null ? `${Math.round(pulse.avgGoalCompletion)}%` : "—"}
            progress={pulse.avgGoalCompletion}
          />
        </div>

        {selectedReview ? (
          <dl className="mt-5 flex flex-col gap-2 border-t border-black/10 pt-5 text-sm dark:border-white/10">
            {selectedReview.highlights && (
              <div>
                <dt className="inline font-medium text-zinc-600 dark:text-zinc-300">Highlights: </dt>
                <dd className="inline text-zinc-600 dark:text-zinc-400">{selectedReview.highlights}</dd>
              </div>
            )}
            {selectedReview.blockers && (
              <div>
                <dt className="inline font-medium text-zinc-600 dark:text-zinc-300">Blockers: </dt>
                <dd className="inline text-zinc-600 dark:text-zinc-400">{selectedReview.blockers}</dd>
              </div>
            )}
            {selectedReview.priorities && (
              <div>
                <dt className="inline font-medium text-zinc-600 dark:text-zinc-300">Priorities: </dt>
                <dd className="inline text-zinc-600 dark:text-zinc-400">{selectedReview.priorities}</dd>
              </div>
            )}
          </dl>
        ) : (
          <p className="mt-5 border-t border-black/10 pt-5 text-sm text-zinc-500 dark:border-white/10 dark:text-zinc-400">
            No review submitted for this month yet.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-3 pb-12">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Full history
        </h3>
        {historyWithPulse.map(({ review, pulse: p }) => (
          <div
            key={review.id}
            className="rounded-xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-zinc-950"
          >
            <h4 className="font-semibold text-zinc-900 dark:text-zinc-50">
              {formatMonthLabel(review.month)}
            </h4>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              OKR {review.okrAveragePct != null ? `${Math.round(review.okrAveragePct)}%` : "—"} · Wellbeing{" "}
              {p.avgWellbeing != null ? WELLBEING_LABELS[Math.round(p.avgWellbeing)] : "—"} · Goals{" "}
              {p.avgGoalCompletion != null ? `${Math.round(p.avgGoalCompletion)}%` : "—"}
            </span>

            {(review.highlights || review.blockers || review.priorities) && (
              <dl className="mt-3 flex flex-col gap-1 text-sm">
                {review.highlights && (
                  <div>
                    <dt className="inline font-medium text-zinc-600 dark:text-zinc-300">Highlights: </dt>
                    <dd className="inline text-zinc-600 dark:text-zinc-400">{review.highlights}</dd>
                  </div>
                )}
                {review.blockers && (
                  <div>
                    <dt className="inline font-medium text-zinc-600 dark:text-zinc-300">Blockers: </dt>
                    <dd className="inline text-zinc-600 dark:text-zinc-400">{review.blockers}</dd>
                  </div>
                )}
                {review.priorities && (
                  <div>
                    <dt className="inline font-medium text-zinc-600 dark:text-zinc-300">Priorities: </dt>
                    <dd className="inline text-zinc-600 dark:text-zinc-400">{review.priorities}</dd>
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

function StatCard({
  label,
  value,
  progress,
}: {
  label: string;
  value: string;
  progress: number | null;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-zinc-500 dark:text-zinc-400">{label}</span>
      <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{value}</span>
      <ProgressBar value={progress ?? 0} />
    </div>
  );
}
